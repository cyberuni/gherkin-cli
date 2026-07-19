import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { type DiffReader, diffFeatures } from './diff.js'

const BASE = `Feature: f
  Scenario: keep
    Given x
  Scenario: change me
    Given y
  Scenario: drop me
    Given z
`

const HEAD = `Feature: f
  Scenario: keep
    Given x
  Scenario: change me
    Given y CHANGED
  Scenario: brand new
    Given w
`

function changesByName(file: string, reader: DiffReader) {
	// `full` so the classification itself is under test, not the default changed-only projection.
	const result = diffFeatures([file], { base: 'HEAD', full: true, reader })
	const map = new Map(result.files[0]!.scenarios.map((s) => [s.name, s.change]))
	return { result, map }
}

describe('diffFeatures (injected reader)', () => {
	it('classifies added / modified / removed / unchanged', () => {
		const reader: DiffReader = () => ({ head: HEAD, base: BASE })
		const { result, map } = changesByName('f.feature', reader)
		expect(map.get('keep')).toBe('unchanged')
		expect(map.get('change me')).toBe('modified')
		expect(map.get('brand new')).toBe('added')
		expect(map.get('drop me')).toBe('removed')
		expect(result.summary).toMatchObject({ added: 1, modified: 1, removed: 1, unchanged: 1, addOnly: false })
	})

	it('marks a brand-new file (no base) as addOnly with everything added', () => {
		const reader: DiffReader = () => ({ head: HEAD, base: undefined })
		const { result, map } = changesByName('new.feature', reader)
		expect([...map.values()].every((c) => c === 'added')).toBe(true)
		expect(result.summary.addOnly).toBe(true)
		expect(result.files[0]!.addOnly).toBe(true)
	})
})

describe('diffFeatures (real git integration)', () => {
	it('diffs a working copy against a committed base', () => {
		const dir = mkdtempSync(path.join(tmpdir(), 'gherkin-diff-git-'))
		const file = path.join(dir, 'f.feature')
		const git = (...args: string[]) => execFileSync('git', ['-C', dir, ...args], { stdio: 'ignore' })
		git('init', '-q')
		git('config', 'user.email', 'test@example.com')
		git('config', 'user.name', 'Test')
		writeFileSync(file, BASE)
		git('add', 'f.feature')
		git('commit', '-qm', 'base')
		writeFileSync(file, HEAD)

		const result = diffFeatures([file], { base: 'HEAD', full: true })
		const map = new Map(result.files[0]!.scenarios.map((s) => [s.name, s.change]))
		expect(map.get('keep')).toBe('unchanged')
		expect(map.get('change me')).toBe('modified')
		expect(map.get('brand new')).toBe('added')
		expect(map.get('drop me')).toBe('removed')
	})
})

// A step's DocString / DataTable is part of the step. Hashing step text alone let a frozen `@rubric`
// — which lives wholly inside a DocString — be gutted while still reporting `unchanged`, so the
// narrowing self-cleared and Clearance never fired.
describe('diffFeatures (step arguments are part of the signature)', () => {
	const withDocString = (dimension: string, threshold: string) => `Feature: f
  @rubric
  Scenario: graded
    Then the voice is graded
      """
      dimension: ${dimension}
      threshold: ${threshold}
      """
`
	const withDataTable = (dimension: string, threshold: string) => `Feature: f
  Scenario: tabled
    Given the bar is set
      | dimension   | threshold   |
      | ${dimension} | ${threshold} |
`
	const changeOf = (base: string, head: string) =>
		diffFeatures(['f.feature'], { base: 'HEAD', full: true, reader: () => ({ head, base }) }).files[0]!.scenarios[0]!
			.change

	it('reports a gutted DocString rubric as modified, not unchanged', () => {
		expect(changeOf(withDocString('warmth', '3'), withDocString('vibes', '0'))).toBe('modified')
	})

	it('reports a gutted DataTable as modified, not unchanged', () => {
		expect(changeOf(withDataTable('warmth', '3'), withDataTable('vibes', '0'))).toBe('modified')
	})

	// The tags must match on both sides, or a tag delta marks the scenario modified on its own and
	// the assertion passes without the DocString being read at all.
	it('reports an added DocString as modified', () => {
		const bare = 'Feature: f\n  @rubric\n  Scenario: graded\n    Then the voice is graded\n'
		expect(changeOf(bare, withDocString('warmth', '3'))).toBe('modified')
	})

	// A DocString's media type is part of what the argument says, not how it is written.
	it('reports a rewritten DocString mediaType as modified', () => {
		const media = (type: string) =>
			`Feature: f\n  Scenario: graded\n    Then graded\n      \`\`\`${type}\n      threshold: 3\n      \`\`\`\n`
		expect(changeOf(media('json'), media('yaml'))).toBe('modified')
	})

	// Controls — these MUST stay `unchanged`, or the stricter signature over-fires on cosmetics.
	it('leaves an identical DocString unchanged', () => {
		expect(changeOf(withDocString('warmth', '3'), withDocString('warmth', '3'))).toBe('unchanged')
	})

	// The delimiter is how the argument is written, not what it says. Excluding it is an independent
	// choice, so it gets its own control rather than riding on "only content counts".
	it('leaves a DocString delimiter swap unchanged', () => {
		const delimited = (d: string) =>
			`Feature: f\n  Scenario: graded\n    Then graded\n      ${d}\n      threshold: 3\n      ${d}\n`
		expect(changeOf(delimited('"""'), delimited('```'))).toBe('unchanged')
	})

	// A DataTable's padding is how it is written, not what it says. Reducing rows to cell VALUES is
	// what drops it — a naive hash of the raw rows keeps both the padding and each cell's location —
	// so the exclusion is an independent choice and carries its own control.
	it('leaves a realigned DataTable unchanged', () => {
		const tight =
			'Feature: f\n  Scenario: tabled\n    Given the bar is set\n      | dimension | threshold |\n      | warmth | 3 |\n'
		const padded =
			'Feature: f\n  Scenario: tabled\n    Given the bar is set\n      | dimension   |   threshold |\n      | warmth      |   3         |\n'
		expect(changeOf(tight, padded)).toBe('unchanged')
	})

	// Source locations are excluded throughout. A signature over `location.line` would re-classify
	// every scenario below a mid-file insertion as modified — firing Clearance on ordinary additive
	// edits, the exact over-fire the argument hashing exists to avoid.
	it('leaves a scenario pushed down the file by an insertion above it unchanged', () => {
		const graded = `  @rubric
  Scenario: graded
    Then the voice is graded
      """
      dimension: warmth
      threshold: 3
      """
`
		const inserted = '  Scenario: inserted above\n    Given a wholly new precondition\n'
		const map = (text: string) =>
			new Map(
				diffFeatures(['f.feature'], {
					base: 'HEAD',
					full: true,
					reader: () => ({ head: text, base: `Feature: f\n${graded}` }),
				}).files[0]!.scenarios.map((s) => [s.name, s.change]),
			)
		const moved = map(`Feature: f\n${inserted}\n${graded}`)
		expect(moved.get('graded')).toBe('unchanged')
		expect(moved.get('inserted above')).toBe('added')
	})

	it('leaves a re-indented DocString unchanged (the parser strips common indentation)', () => {
		const head = `Feature: f
  @rubric
  Scenario: graded
    Then the voice is graded
        """
        dimension: warmth
        threshold: 3
        """
`
		expect(changeOf(withDocString('warmth', '3'), head)).toBe('unchanged')
	})
})

// `--full` used to be pure documentation: the help promised "include unchanged scenarios" while
// diff always returned every scenario. The flag now selects the projection, and the invariant that
// makes that safe is that only the ROWS change — every aggregate is computed before the filter.
describe('diffFeatures (the --full projection)', () => {
	const reader: DiffReader = () => ({ head: HEAD, base: BASE })
	const kinds = (full?: boolean) =>
		diffFeatures(['f.feature'], { base: 'HEAD', full, reader }).files[0]!.scenarios.map((s) => s.change)

	it('omits unchanged scenarios by default', () => {
		expect(kinds()).toEqual(['modified', 'added', 'removed'])
	})

	it('includes unchanged scenarios with full', () => {
		expect(kinds(true)).toEqual(['unchanged', 'modified', 'added', 'removed'])
	})

	// The aggregate is the whole point of the projection being safe to slim: a consumer that reads
	// `summary.unchanged` still learns how many were unchanged without paying for the rows.
	it('counts unchanged in the summary either way', () => {
		for (const full of [undefined, true]) {
			expect(diffFeatures(['f.feature'], { base: 'HEAD', full, reader }).summary).toMatchObject({
				added: 1,
				modified: 1,
				removed: 1,
				unchanged: 1,
			})
		}
	})

	// `addOnly` is derived from the classification, not from the emitted rows — filtering unchanged
	// rows must not perturb it in either direction.
	it('reports the same addOnly flags either way', () => {
		const additive: DiffReader = () => ({ head: HEAD, base: undefined })
		for (const [read, expected] of [
			[reader, false],
			[additive, true],
		] as const) {
			for (const full of [undefined, true]) {
				const result = diffFeatures(['f.feature'], { base: 'HEAD', full, reader: read })
				expect(result.summary.addOnly).toBe(expected)
				expect(result.files[0]!.addOnly).toBe(expected)
			}
		}
	})

	// An all-unchanged file must still be listed — an empty `scenarios` list is the answer ("nothing
	// moved here"), not a reason to drop the file from the result.
	it('keeps a file whose scenarios are all unchanged, with an empty scenario list', () => {
		const same: DiffReader = () => ({ head: BASE, base: BASE })
		const result = diffFeatures(['f.feature'], { base: 'HEAD', reader: same })
		expect(result.files).toHaveLength(1)
		expect(result.files[0]!.scenarios).toEqual([])
		expect(result.summary).toMatchObject({ files: 1, unchanged: 3, addOnly: true })
	})
})
