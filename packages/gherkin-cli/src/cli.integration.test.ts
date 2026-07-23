import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { home, main } from './cli.js'
import { writeStderr } from './output.js'

// The command surface, driven in-process: stdout/stderr are captured by spying on
// the real streams, and process.exit is trapped so an error path records its code
// instead of tearing down the test runner. One test = one frozen cli/* scenario.

/** Thrown by the process.exit spy so a `fail(...)`/`exit(1)` path unwinds cleanly. */
class ExitError extends Error {
	constructor(public code: number) {
		super(`exit ${code}`)
	}
}

interface RunResult {
	out: string
	err: string
	/** The exit code an error path passed to process.exit; undefined on a clean run. */
	exitCode: number | undefined
}

async function run(argv: string[]): Promise<RunResult> {
	let out = ''
	let err = ''
	let exitCode: number | undefined
	const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
		out += String(chunk)
		return true
	})
	const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
		err += String(chunk)
		return true
	})
	const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
		exitCode = code ?? 0
		throw new ExitError(exitCode)
	}) as never)
	try {
		await main(argv)
	} catch (e) {
		if (!(e instanceof ExitError)) throw e
	} finally {
		outSpy.mockRestore()
		errSpy.mockRestore()
		exitSpy.mockRestore()
	}
	return { out, err, exitCode }
}

const TWO_SCENARIOS = `@auth
Feature: Login
  Scenario: Successful login
    Given a registered user
    When they submit valid credentials
    Then they reach the dashboard
  Scenario: Failed login
    Given a registered user
    Then they see an error
`
const EMPTY_SUITE = 'Feature: Empty\n'
const MALFORMED = 'Feature: f\n  Scenario: s\n    Given x\n  Then y\n  @tag\nGarbage:::\n'

// A scenario with real steps plus a Scenario Outline, so `--full` has stepCount and
// step text to render (TWO_SCENARIOS-style flat suites do not exercise that path).
const WITH_STEPS = `Feature: Login variants
  Scenario Outline: Login as <role>
    Given a <role> user
    When they submit credentials
    Then they reach the dashboard
    Examples:
      | role  |
      | admin |
      | guest |
`
// One @smoke scenario and one untagged, to prove --tag filters the rendered output.
const TAGGED = `Feature: Login
  @smoke
  Scenario: Successful login
    Given a registered user
    Then they reach the dashboard
  Scenario: Failed login
    Given a registered user
    Then they see an error
`
// A committed base of two scenarios; the working tree adds one and modifies another.
const DIFF_BASE = `Feature: f
  Scenario: keep
    Given x
  Scenario: change me
    Given y
`
const DIFF_HEAD = `Feature: f
  Scenario: keep
    Given x
  Scenario: change me
    Given y CHANGED
  Scenario: brand new
    Given w
`

function tmp(name: string, body: string): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'gk-int-'))
	const file = path.join(dir, name)
	writeFileSync(file, body)
	return file
}

afterEach(() => {
	vi.restoreAllMocks()
})

// ── cli/parse ──────────────────────────────────────────────────────────────
describe('cli parse', () => {
	it('renders the projection and summary to stdout as TOON, exit 0', async () => {
		const file = tmp('login.feature', TWO_SCENARIOS)
		const { out, exitCode } = await run(['parse', file])
		expect(out).toContain('summary:')
		expect(out).toContain('scenarios: 2')
		expect(out).toContain('"Successful login"')
		expect(exitCode).toBeUndefined() // never calls exit → exit 0
	})

	it('prints an explicit `scenarios: 0` line for an empty suite, exit 0', async () => {
		const file = tmp('empty.feature', EMPTY_SUITE)
		const { out, exitCode } = await run(['parse', file])
		expect(out).toContain('scenarios: 0')
		expect(exitCode).toBeUndefined()
	})

	it('writes a structured ENOENT error to stdout with a discovery hint, exit 1', async () => {
		const missing = path.join(tmpdir(), 'does-not-exist.feature')
		const { out, err, exitCode } = await run(['parse', missing])
		expect(out).toContain('code: ENOENT')
		expect(out).toContain('gherkin-cli — list the .feature files discoverable here')
		expect(exitCode).toBe(1)
		expect(err).toBe('') // the error goes to stdout, not stderr
	})

	it('renders a malformed-but-present file as an error entry and still exits 0', async () => {
		const bad = tmp('bad.feature', MALFORMED)
		const good = tmp('good.feature', TWO_SCENARIOS)
		const { out, exitCode } = await run(['parse', bad, good])
		expect(out).toContain('EPARSE') // malformed file → error entry
		expect(out).toContain('"Successful login"') // well-formed file → rendered normally
		expect(exitCode).toBeUndefined()
	})

	// cli/parse "--full renders step detail to stdout": the CLI wires opts.full through to
	// the engine and the rendered TOON carries stepCount and each step's text. The existing
	// --full CLI call uses flat step-less scenarios, so this pins the step-detail render.
	it('--full renders stepCount and step text to stdout', async () => {
		const file = tmp('outline.feature', WITH_STEPS)
		const { out, exitCode } = await run(['parse', file, '--full'])
		expect(out).toContain('stepCount: 3')
		expect(out).toContain('they submit credentials')
		expect(exitCode).toBeUndefined()
	})

	// cli/parse "--tag filters the rendered scenarios": the cli.ts → opts.tag wiring keeps
	// only the @smoke scenario in stdout, dropping the untagged one entirely.
	it('--tag keeps only the tagged scenario in stdout', async () => {
		const file = tmp('tagged.feature', TAGGED)
		const { out, exitCode } = await run(['parse', file, '--tag', '@smoke'])
		expect(out).toContain('"Successful login"')
		expect(out).not.toContain('"Failed login"')
		expect(exitCode).toBeUndefined()
	})

	// cli/parse "--ast dumps the raw GherkinDocument as JSON": stdout is parseable JSON
	// whose feature name matches the source. No other CLI test invokes --ast.
	it('--ast emits the raw GherkinDocument as parseable JSON', async () => {
		const file = tmp('login.feature', TWO_SCENARIOS)
		const { out, exitCode } = await run(['parse', file, '--ast'])
		const parsed = JSON.parse(out)
		expect(parsed[0].ast.feature.name).toBe('Login')
		expect(exitCode).toBeUndefined()
	})
})

// ── cli/validate ───────────────────────────────────────────────────────────
describe('cli validate', () => {
	it('renders `errors: 0` and a parse hint on a clean run, exit 0', async () => {
		const a = tmp('a.feature', TWO_SCENARIOS)
		const b = tmp('b.feature', EMPTY_SUITE)
		const { out, exitCode } = await run(['validate', a, b])
		expect(out).toContain('errors: 0')
		expect(out.slice(out.lastIndexOf('help['))).toContain('gherkin-cli parse')
		expect(exitCode).toBeUndefined()
	})

	it('renders syntax errors on stdout with line and message, exit 1', async () => {
		const bad = tmp('bad.feature', MALFORMED)
		const { out, exitCode } = await run(['validate', bad])
		expect(out).toContain('EPARSE')
		expect(out).toContain('ok: false')
		expect(out).toContain('gherkin-cli parse <file> --ast')
		expect(exitCode).toBe(1)
	})

	// cli/validate "a mixed batch renders each verdict and fails the run": the valid file
	// renders ok, the invalid one not ok, and the presence of any failure exits 1.
	it('renders both verdicts for a mixed batch and exits 1', async () => {
		const good = tmp('good.feature', TWO_SCENARIOS)
		const bad = tmp('bad.feature', MALFORMED)
		const { out, exitCode } = await run(['validate', good, bad])
		expect(out).toContain('ok: true')
		expect(out).toContain('ok: false')
		expect(out).toContain('EPARSE')
		expect(exitCode).toBe(1)
	})
})

// ── cli/diff ───────────────────────────────────────────────────────────────
/** Init a temp git repo, commit `body` as f.feature, and return its path. */
function gitRepoWithCommittedFeature(body: string): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'gk-int-git-'))
	const file = path.join(dir, 'f.feature')
	const git = (...args: string[]) => execFileSync('git', ['-C', dir, ...args], { stdio: 'ignore' })
	git('init', '-q')
	git('config', 'user.email', 'test@example.com')
	git('config', 'user.name', 'Test')
	writeFileSync(file, body)
	git('add', 'f.feature')
	git('commit', '-qm', 'base')
	return file
}

describe('cli diff', () => {
	it('writes a structured usage error to stdout and exits 2 when --base is omitted', async () => {
		const file = tmp('f.feature', TWO_SCENARIOS)
		const { out, err, exitCode } = await run(['diff', file])
		expect(out).toContain('code: EBADFLAG')
		expect(exitCode).toBe(2)
		expect(err).toBe('')
	})

	it('catches an unresolvable base ref and renders a structured EGIT error, exit 1', async () => {
		const file = gitRepoWithCommittedFeature(TWO_SCENARIOS)
		const { out, exitCode } = await run(['diff', file, '--base', 'no-such-ref'])
		expect(out).toContain('code: EGIT')
		expect(exitCode).toBe(1)
	})

	it('prints an explicit `changes: 0` line and a parse hint on a zero-change run, exit 0', async () => {
		const file = gitRepoWithCommittedFeature(TWO_SCENARIOS) // working tree == HEAD
		const { out, exitCode } = await run(['diff', file, '--base', 'HEAD'])
		expect(out).toContain('changes: 0')
		expect(out.slice(out.lastIndexOf('help['))).toContain('gherkin-cli parse')
		expect(exitCode).toBeUndefined()
	})

	// cli/diff "--full lists the unchanged scenarios in stdout": with the working tree
	// identical to the committed base, --full restores the unchanged rows so both
	// scenario names render with change: unchanged. No other CLI test passes --full to diff.
	it('--full renders unchanged scenarios to stdout on an unchanged working tree', async () => {
		const file = gitRepoWithCommittedFeature(TWO_SCENARIOS) // working tree == HEAD
		const { out, exitCode } = await run(['diff', file, '--base', 'HEAD', '--full'])
		expect(out).toContain('unchanged')
		expect(out).toContain('"Successful login"')
		expect(out).toContain('"Failed login"')
		expect(exitCode).toBeUndefined()
	})

	// cli/diff "a changed run renders the classification and summary to stdout": a working
	// tree that adds one scenario and modifies another renders the added/modified counts
	// and the affected scenario names.
	it('renders the classified changes and added/modified summary to stdout', async () => {
		const file = gitRepoWithCommittedFeature(DIFF_BASE)
		writeFileSync(file, DIFF_HEAD) // add `brand new`, modify `change me`
		const { out, exitCode } = await run(['diff', file, '--base', 'HEAD'])
		expect(out).toContain('added: 1')
		expect(out).toContain('modified: 1')
		expect(out).toContain('"brand new"')
		expect(out).toContain('"change me"')
		expect(exitCode).toBeUndefined()
	})

	// cli/diff "a changed run ends with next-step help": without --full the help block
	// suggests both a `parse <file> --full` and a `diff … --full` follow-up.
	it('ends a changed run with parse --full and diff --full next-step help', async () => {
		const file = gitRepoWithCommittedFeature(DIFF_BASE)
		writeFileSync(file, DIFF_HEAD)
		const { out } = await run(['diff', file, '--base', 'HEAD'])
		const help = out.slice(out.lastIndexOf('help['))
		expect(help).toContain(`gherkin-cli parse ${file} --full`)
		expect(help).toContain(`gherkin-cli diff --base HEAD ${file} --full`)
	})
})

// ── cli/usage ──────────────────────────────────────────────────────────────
describe('cli usage', () => {
	it('reports an unknown flag as EBADFLAG naming the valid flags, exit 2', async () => {
		const file = tmp('f.feature', TWO_SCENARIOS)
		const { out, exitCode } = await run(['parse', file, '--bogus'])
		expect(out).toContain('code: EBADFLAG')
		expect(out).toContain('valid flags for `parse`')
		expect(out).toContain('--full')
		expect(exitCode).toBe(2)
	})

	// cli/usage "the uncaught-error fallback writes to stderr": main() rethrows a
	// non-CommanderError from parseAsync, and the only writeStderr call is inside the
	// `/* c8 ignore */` isMainModule() catch — reachable only by running the bin as the
	// process entry, which an in-process test cannot drive. So instead we pin the
	// fallback CHANNEL directly: writeStderr(msg) lands on process.stderr, not stdout —
	// verifying the error-fallback path targets the right stream.
	it('routes the uncaught-error fallback to stderr, not stdout', async () => {
		let out = ''
		let err = ''
		const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
			out += String(chunk)
			return true
		})
		const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
			err += String(chunk)
			return true
		})
		try {
			writeStderr('error: something broke')
		} finally {
			outSpy.mockRestore()
			errSpy.mockRestore()
		}
		expect(err).toBe('error: something broke\n')
		expect(out).toBe('')
	})

	it('writes nothing to stderr on a normal run', async () => {
		const file = tmp('f.feature', TWO_SCENARIOS)
		const { err } = await run(['parse', file])
		expect(err).toBe('')
	})

	it('writes nothing to stderr on a structured-error run', async () => {
		const { err } = await run(['diff', tmp('f.feature', TWO_SCENARIOS)])
		expect(err).toBe('')
	})

	// A result over the line threshold truncates as TOON with the size hint, unless
	// --full; --format json is never truncated. (Render-layer covered in output.test.ts;
	// this asserts the CLI's emit path wires it through.)
	const many = `Feature: Big\n${Array.from({ length: 60 }, (_, i) => `  Scenario: S${i}\n    Given x\n`).join('')}`

	it('truncates a large TOON result with a `rerun with --full` hint', async () => {
		const { out } = await run(['parse', tmp('big.feature', many)])
		expect(out).toContain('— rerun with --full')
	})

	it('does not truncate the TOON result with --full', async () => {
		const { out } = await run(['parse', tmp('big.feature', many), '--full'])
		expect(out).not.toContain('— rerun with --full')
	})

	it('never truncates --format json', async () => {
		const { out } = await run(['parse', tmp('big.feature', many), '--format', 'json'])
		expect(out).not.toContain('— rerun with --full')
	})
})

// ── cli/home ───────────────────────────────────────────────────────────────
/** A temp dir seeded with `count` .feature files, each with one scenario. */
function homeDir(count: number): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'gk-int-home-'))
	for (let i = 0; i < count; i++) {
		writeFileSync(path.join(dir, `f${i}.feature`), `Feature: F${i}\n  Scenario: S${i}\n    Given x\n`)
	}
	return dir
}

/** Drive `home(cwd)` and capture stdout — home never exits, so exit code is 0. */
function runHome(cwd: string): string {
	let out = ''
	const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
		out += String(chunk)
		return true
	})
	try {
		home(cwd)
	} finally {
		spy.mockRestore()
	}
	return out
}

describe('cli home', () => {
	it('lists each discoverable .feature file with its scenario count', async () => {
		const out = runHome(homeDir(2))
		expect(out).toContain('features[2]')
		expect(out).toContain('f0.feature')
		expect(out).toContain('f1.feature')
		expect(out).toContain('2 of 2 total')
	})

	it('states `0 .feature files found` explicitly, not blank, for an empty dir', async () => {
		const out = runHome(homeDir(0))
		expect(out).toContain('0 .feature files found')
		expect(out.trim()).not.toBe('')
	})

	it('caps the listing at 20 and points at the glob for the rest', async () => {
		const out = runHome(homeDir(21))
		expect(out).toContain('features[20]') // at most 20 listed
		expect(out).toContain('20 of 21 total')
		expect(out).toContain("gherkin-cli parse '**/*.feature' for all 21 files")
	})

	it('collapses the home directory in the bin path to `~`', async () => {
		const out = runHome(homeDir(1))
		expect(out).toContain('bin: ~')
	})

	it('ends with next-step help suggesting parse, validate, and diff', async () => {
		const out = runHome(homeDir(1))
		const help = out.slice(out.lastIndexOf('help['))
		expect(help).toContain('gherkin-cli parse <file>')
		expect(help).toContain('gherkin-cli validate <file>')
		expect(help).toContain('gherkin-cli diff --base <ref> <file>')
	})
})
