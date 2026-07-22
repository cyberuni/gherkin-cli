import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseFeatures, parseFeaturesAst } from './parse.js'

const dir = mkdtempSync(path.join(tmpdir(), 'gherkin-parse-'))

function fixture(name: string, body: string): string {
	const file = path.join(dir, name)
	writeFileSync(file, body)
	return file
}

const valid = fixture(
	'valid.feature',
	`# ═══════════ section ═══════════
@auth
Feature: Login

  @smoke
  Scenario: Successful login
    Given a registered user
    When they submit valid credentials
    Then they reach the dashboard

  Scenario: Failed login
    Given a registered user
    When they submit a wrong password
    Then they see an error
`,
)

const malformed = fixture('bad.feature', 'Feature: f\n  Scenario: s\n    Given x\n  Then y\n  @tag\nGarbage:::\n')

const outline = fixture(
	'outline.feature',
	`Feature: Login variants

  Scenario Outline: Login as <role>
    Given a <role> user
    When they submit credentials
    Then they reach the dashboard

    Examples:
      | role  |
      | admin |
      | guest |
      | staff |
`,
)

describe('parseFeatures', () => {
	it('projects the default shape (no step detail)', () => {
		const result = parseFeatures([valid])
		expect(result.summary).toEqual({ files: 1, scenarios: 2, errors: 0 })
		const file = result.files[0]!
		expect(file.featureTags).toEqual(['@auth'])
		expect(file.scenarioCount).toBe(2)
		expect(file.sectionComments).toBe(1)
		const first = file.scenarios[0]!
		expect(first).toEqual({ name: 'Successful login', keyword: 'Scenario', tags: ['@smoke'] })
		expect(first.steps).toBeUndefined()
		expect(first.stepCount).toBeUndefined()
	})

	it('--full adds stepCount, exampleRows, and steps', () => {
		const file = parseFeatures([valid], { full: true }).files[0]!
		const first = file.scenarios[0]!
		expect(first.stepCount).toBe(3)
		expect(first.exampleRows).toBe(0)
		expect(first.steps).toEqual([
			{ keyword: 'Given', text: 'a registered user' },
			{ keyword: 'When', text: 'they submit valid credentials' },
			{ keyword: 'Then', text: 'they reach the dashboard' },
		])
	})

	it('--tag keeps only scenarios carrying the tag', () => {
		const file = parseFeatures([valid], { tag: '@smoke' }).files[0]!
		expect(file.scenarioCount).toBe(1)
		expect(file.scenarios.map((s) => s.name)).toEqual(['Successful login'])
	})

	// api/parse "tag matching ignores a leading @ on the filter": `smoke` (no @) must
	// match the @smoke scenario exactly as `@smoke` does — normalizeTag strips the @.
	it('--tag matching ignores a leading @ on the filter', () => {
		const file = parseFeatures([valid], { tag: 'smoke' }).files[0]!
		expect(file.scenarioCount).toBe(1)
		expect(file.scenarios.map((s) => s.name)).toEqual(['Successful login'])
	})

	// api/parse "--full counts a Scenario Outline's Examples rows": exampleRows is the
	// summed table-body row count across the scenario's Examples blocks. The default
	// suite only ever has flat scenarios, so exampleRows is asserted as 0 everywhere
	// else — this pins the actual row-counting path against a 3-row Examples table.
	it("--full counts a Scenario Outline's Examples rows alongside stepCount and steps", () => {
		const file = parseFeatures([outline], { full: true }).files[0]!
		const first = file.scenarios[0]!
		expect(first.keyword).toBe('Scenario Outline')
		expect(first.exampleRows).toBe(3)
		expect(first.stepCount).toBe(3)
		expect(first.steps).toEqual([
			{ keyword: 'Given', text: 'a <role> user' },
			{ keyword: 'When', text: 'they submit credentials' },
			{ keyword: 'Then', text: 'they reach the dashboard' },
		])
	})

	// api/parse "the summary aggregates across every file": files is the input count
	// and scenarios is the sum over all files. Every other call passes one file, so
	// multi-file aggregation is otherwise unexercised.
	it('aggregates files and scenarios across a multi-file batch', () => {
		const result = parseFeatures([valid, outline, valid])
		expect(result.summary.files).toBe(3)
		// valid has 2 scenarios, outline has 1 — 2 + 1 + 2 = 5 across the three files.
		expect(result.summary.scenarios).toBe(5)
		expect(result.summary.scenarios).toBe(result.files.reduce((n, f) => n + f.scenarioCount, 0))
	})

	it('records a malformed file as an EPARSE error without throwing (best-effort, exit 0)', () => {
		expect(() => parseFeatures([malformed])).not.toThrow()
		const result = parseFeatures([malformed])
		expect(result.summary.errors).toBe(1)
		const file = result.files[0]!
		expect(file.error?.code).toBe('EPARSE')
		expect(file.error?.line).toBeGreaterThan(0)
		expect(file.scenarios).toEqual([])
	})

	it('records a missing file as an ENOENT error', () => {
		const result = parseFeatures([path.join(dir, 'nope.feature')])
		expect(result.summary.errors).toBe(1)
		expect(result.files[0]!.error?.code).toBe('ENOENT')
	})
})

describe('parseFeaturesAst', () => {
	it('dumps the raw GherkinDocument', () => {
		const [entry] = parseFeaturesAst([valid])
		expect(entry!.error).toBeUndefined()
		expect((entry!.ast as any).feature.name).toBe('Login')
	})

	it('surfaces ENOENT for a missing file', () => {
		const [entry] = parseFeaturesAst([path.join(dir, 'nope.feature')])
		expect(entry!.error?.code).toBe('ENOENT')
	})
})

describe('injectable reader', () => {
	it('projects text from an injected reader without touching the filesystem', () => {
		let touched = false
		const reader = (p: string) => {
			touched = true
			expect(p).toBe('in-memory.feature')
			return 'Feature: F\n  Scenario: S\n    Given a\n    Then b\n'
		}
		const result = parseFeatures(['in-memory.feature'], { reader })
		expect(touched).toBe(true)
		expect(result.files[0]!.scenarios.map((s) => s.name)).toEqual(['S'])
		expect(result.files[0]!.error).toBeUndefined()
	})

	it('surfaces ENOENT when an injected reader throws, without propagating', () => {
		const reader = () => {
			throw new Error('nope')
		}
		const result = parseFeatures(['ghost.feature'], { reader })
		expect(result.files[0]!.error?.code).toBe('ENOENT')
	})

	it('parseFeaturesAst also reads through an injected reader', () => {
		const reader = () => 'Feature: F\n  Scenario: S\n    Given a\n    Then b\n'
		const ast = parseFeaturesAst(['in-memory.feature'], { reader })
		expect(ast[0]!.ast).toBeDefined()
		expect(ast[0]!.error).toBeUndefined()
	})
})
