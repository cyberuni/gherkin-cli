import { readFileSync } from 'node:fs'
import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin'
import { IdGenerator } from '@cucumber/messages'

export interface ParseStep {
	keyword: string
	text: string
}

export interface ParseScenario {
	name: string
	keyword: string
	tags: string[]
	stepCount?: number
	exampleRows?: number
	steps?: ParseStep[]
}

export interface ParseFileError {
	code: 'EPARSE' | 'ENOENT'
	line: number
	message: string
}

export interface ParseFile {
	file: string
	featureTags: string[]
	scenarioCount: number
	sectionComments: number
	scenarios: ParseScenario[]
	error?: ParseFileError
}

export interface ParseResult {
	summary: { files: number; scenarios: number; errors: number }
	files: ParseFile[]
}

export interface ParseOptions {
	full?: boolean
	tag?: string
}

/** Build a fresh parser with a deterministic (incrementing) id generator. */
function newParser(): Parser<unknown> {
	return new Parser(new AstBuilder(IdGenerator.incrementing()), new GherkinClassicTokenMatcher())
}

/** A comment counts as a "section" rule if it draws a box-drawing rule or a 3+ run of -/=. */
function isSectionComment(text: string): boolean {
	const body = text.replace(/^\s*#/, '')
	return /[─-╿]/.test(body) || /([-=])\1{2,}/.test(body)
}

function normalizeTag(tag: string): string {
	return tag.replace(/^@/, '')
}

function firstErrorLine(err: { location?: { line: number } }): number {
	return err.location?.line ?? 0
}

function errorMessage(err: { message: string }): string {
	return err.message.split('\n')[0] ?? err.message
}

function projectDoc(
	doc: any,
	opts: ParseOptions,
): { featureTags: string[]; scenarios: ParseScenario[]; sectionComments: number } {
	const feature = doc.feature
	const featureTags: string[] = (feature?.tags ?? []).map((t: { name: string }) => t.name)
	const sectionComments = (doc.comments ?? []).filter((c: { text: string }) => isSectionComment(c.text)).length

	const scenarios: ParseScenario[] = []
	for (const child of feature?.children ?? []) {
		const scenario = child.scenario
		if (!scenario) continue
		const tags: string[] = (scenario.tags ?? []).map((t: { name: string }) => t.name)
		if (opts.tag !== undefined) {
			const wanted = normalizeTag(opts.tag)
			if (!tags.some((t) => normalizeTag(t) === wanted)) continue
		}
		const steps: ParseStep[] = (scenario.steps ?? []).map((s: { keyword: string; text: string }) => ({
			keyword: s.keyword.trim(),
			text: s.text,
		}))
		const exampleRows: number = (scenario.examples ?? []).reduce(
			(sum: number, ex: { tableBody?: unknown[] }) => sum + (ex.tableBody?.length ?? 0),
			0,
		)
		const projected: ParseScenario = {
			name: scenario.name,
			keyword: scenario.keyword,
			tags,
		}
		if (opts.full) {
			projected.stepCount = steps.length
			projected.exampleRows = exampleRows
			projected.steps = steps
		}
		scenarios.push(projected)
	}
	return { featureTags, scenarios, sectionComments }
}

function parseOne(path: string, opts: ParseOptions): ParseFile {
	let text: string
	try {
		text = readFileSync(path, 'utf8')
	} catch (err) {
		return {
			file: path,
			featureTags: [],
			scenarioCount: 0,
			sectionComments: 0,
			scenarios: [],
			error: { code: 'ENOENT', line: 0, message: (err as Error).message },
		}
	}
	try {
		const doc = newParser().parse(text)
		const { featureTags, scenarios, sectionComments } = projectDoc(doc, opts)
		return { file: path, featureTags, scenarioCount: scenarios.length, sectionComments, scenarios }
	} catch (err) {
		const composite = err as {
			errors?: { location?: { line: number }; message: string }[]
			message: string
			location?: { line: number }
		}
		const first = composite.errors?.[0] ?? composite
		return {
			file: path,
			featureTags: [],
			scenarioCount: 0,
			sectionComments: 0,
			scenarios: [],
			error: { code: 'EPARSE', line: firstErrorLine(first), message: errorMessage(first) },
		}
	}
}

/**
 * Project each `.feature` file to the `parse` data shape. Pure: a missing or
 * malformed file becomes an `error` entry rather than throwing — the CLI layer
 * decides the exit code (ENOENT is a hard fail; EPARSE is best-effort, exit 0).
 */
export function parseFeatures(paths: string[], opts: ParseOptions = {}): ParseResult {
	const files = paths.map((path) => parseOne(path, opts))
	return {
		summary: {
			files: files.length,
			scenarios: files.reduce((sum, f) => sum + f.scenarioCount, 0),
			errors: files.filter((f) => f.error).length,
		},
		files,
	}
}

export interface ParseAstFile {
	file: string
	ast?: unknown
	error?: ParseFileError
}

/** Dump the raw GherkinDocument for each file (backs `parse --ast`). */
export function parseFeaturesAst(paths: string[]): ParseAstFile[] {
	return paths.map((path) => {
		let text: string
		try {
			text = readFileSync(path, 'utf8')
		} catch (err) {
			return { file: path, error: { code: 'ENOENT', line: 0, message: (err as Error).message } }
		}
		try {
			return { file: path, ast: newParser().parse(text) }
		} catch (err) {
			const composite = err as {
				errors?: { location?: { line: number }; message: string }[]
				message: string
				location?: { line: number }
			}
			const first = composite.errors?.[0] ?? composite
			return { file: path, error: { code: 'EPARSE', line: firstErrorLine(first), message: errorMessage(first) } }
		}
	})
}
