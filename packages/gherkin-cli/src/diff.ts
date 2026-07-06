import { type ExecFileSyncOptionsWithStringEncoding, execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin'
import { IdGenerator } from '@cucumber/messages'

export type ChangeKind = 'added' | 'modified' | 'removed' | 'unchanged'

export interface DiffScenario {
	name: string
	change: ChangeKind
}

export interface DiffFileError {
	code: 'EGIT' | 'EPARSE' | 'ENOENT'
	message: string
}

export interface DiffFile {
	file: string
	addOnly: boolean
	scenarios: DiffScenario[]
	error?: DiffFileError
}

export interface DiffResult {
	summary: { added: number; modified: number; removed: number; unchanged: number; files: number; addOnly: boolean }
	files: DiffFile[]
}

/** Reads a file's working-tree and base-ref text. Injectable so tests can skip git. */
export type DiffReader = (file: string, base: string) => { head?: string; base?: string }

export interface DiffOptions {
	base: string
	reader?: DiffReader
}

/** Thrown for genuine git/ref failures so the CLI can map it to `fail('EGIT', …)`. */
export class GitError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'GitError'
	}
}

function newParser(): Parser<unknown> {
	return new Parser(new AstBuilder(IdGenerator.incrementing()), new GherkinClassicTokenMatcher())
}

/** Default reader: working-tree text from fs, base text from `git show <ref>:<relpath>`. */
export function gitReader(file: string, base: string): { head?: string; base?: string } {
	const abs = path.resolve(file)
	const dir = path.dirname(abs)

	let head: string | undefined
	try {
		head = readFileSync(abs, 'utf8')
	} catch {
		head = undefined
	}

	// Resolve the repo-relative path so `git show <ref>:<path>` addresses the right blob.
	// stdio ignores git's own stderr so a `fatal:` line never leaks onto our clean stderr.
	const gitIo: ExecFileSyncOptionsWithStringEncoding = {
		cwd: dir,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
	}
	let rel: string
	try {
		rel = execFileSync('git', ['ls-files', '--full-name', '--', abs], gitIo).trim()
	} catch (err) {
		throw new GitError(`git ls-files failed for ${file}: ${(err as Error).message}`)
	}
	if (rel === '') {
		const top = execFileSync('git', ['rev-parse', '--show-toplevel'], gitIo).trim()
		rel = path.relative(top, abs).split(path.sep).join('/')
	}

	let baseText: string | undefined
	try {
		baseText = execFileSync('git', ['show', `${base}:${rel}`], gitIo)
	} catch {
		// Distinguish "path absent at base" (new file, ok) from a bad ref (hard fail).
		try {
			execFileSync('git', ['rev-parse', '--verify', '--quiet', `${base}^{commit}`], { cwd: dir, stdio: 'ignore' })
			baseText = undefined
		} catch {
			throw new GitError(`git could not resolve base ref '${base}'`)
		}
	}

	return { head, base: baseText }
}

/** Canonical signature of a scenario: name + steps + tags + examples. */
function signature(scenario: any): string {
	const steps = (scenario.steps ?? []).map((s: { keyword: string; text: string }) => `${s.keyword.trim()} ${s.text}`)
	const tags = (scenario.tags ?? []).map((t: { name: string }) => t.name)
	const examples = (scenario.examples ?? []).map(
		(ex: { tableHeader?: { cells: { value: string }[] }; tableBody?: { cells: { value: string }[] }[] }) => ({
			header: ex.tableHeader?.cells.map((c) => c.value) ?? [],
			body: (ex.tableBody ?? []).map((r) => r.cells.map((c) => c.value)),
		}),
	)
	return JSON.stringify({ steps, tags, examples })
}

/** Map scenario name → signature, in document order. Returns null on parse failure. */
function scenarioMap(text: string | undefined): Map<string, string> | null {
	if (text === undefined) return new Map()
	let doc: any
	try {
		doc = newParser().parse(text)
	} catch {
		return null
	}
	const map = new Map<string, string>()
	for (const child of doc.feature?.children ?? []) {
		if (child.scenario) map.set(child.scenario.name, signature(child.scenario))
	}
	return map
}

function classifyFile(file: string, head: string | undefined, base: string | undefined): DiffFile {
	const headMap = scenarioMap(head)
	const baseMap = scenarioMap(base)
	if (headMap === null || baseMap === null) {
		return { file, addOnly: false, scenarios: [], error: { code: 'EPARSE', message: 'failed to parse feature' } }
	}

	const scenarios: DiffScenario[] = []
	// Head order first (added / modified / unchanged), then removed in base order.
	for (const [name, headSig] of headMap) {
		if (!baseMap.has(name)) scenarios.push({ name, change: 'added' })
		else if (baseMap.get(name) !== headSig) scenarios.push({ name, change: 'modified' })
		else scenarios.push({ name, change: 'unchanged' })
	}
	for (const name of baseMap.keys()) {
		if (!headMap.has(name)) scenarios.push({ name, change: 'removed' })
	}

	const addOnly = !scenarios.some((s) => s.change === 'modified' || s.change === 'removed')
	return { file, addOnly, scenarios }
}

/**
 * Classify each file's scenarios against its `--base` version. Git/ref failures
 * surface as a thrown `GitError` for the CLI to convert into `fail('EGIT', …)`;
 * parse failures surface as a per-file `error` field (no throw).
 */
export function diffFeatures(paths: string[], opts: DiffOptions): DiffResult {
	const reader = opts.reader ?? gitReader
	const files = paths.map((file) => {
		const { head, base } = reader(file, opts.base)
		return classifyFile(file, head, base)
	})

	const summary = { added: 0, modified: 0, removed: 0, unchanged: 0, files: files.length, addOnly: true }
	for (const f of files) {
		for (const s of f.scenarios) summary[s.change] += 1
	}
	summary.addOnly = summary.modified === 0 && summary.removed === 0
	return { summary, files }
}
