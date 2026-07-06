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
