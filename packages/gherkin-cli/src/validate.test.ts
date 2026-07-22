import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateFeatures } from './validate.js'

const dir = mkdtempSync(path.join(tmpdir(), 'gherkin-validate-'))

function fixture(name: string, body: string): string {
	const file = path.join(dir, name)
	writeFileSync(file, body)
	return file
}

const valid = fixture('ok.feature', 'Feature: f\n  Scenario: s\n    Given x\n    Then y\n')
const invalid = fixture('bad.feature', 'Feature: f\n  Scenario: s\n    Given x\n  @tag\nGarbage:::\n')

describe('validateFeatures', () => {
	it('reports a valid file as ok (exit 0 at the CLI)', () => {
		const result = validateFeatures([valid])
		expect(result.summary).toEqual({ files: 1, errors: 0 })
		expect(result.files[0]!.ok).toBe(true)
		expect(result.files[0]!.errors).toEqual([])
	})

	it('reports an invalid file with the correct error line (CLI exits 1)', () => {
		const result = validateFeatures([invalid])
		expect(result.summary.errors).toBeGreaterThan(0)
		const file = result.files[0]!
		expect(file.ok).toBe(false)
		expect(file.errors[0]!.code).toBe('EPARSE')
		expect(file.errors[0]!.line).toBe(5)
	})

	// api/validate "a mixed batch marks each file independently": in a single call the
	// valid file stays ok and the invalid one is not, and summary.errors counts only the
	// invalid one — the valid file does not contaminate its neighbour's verdict.
	it('marks each file independently in a mixed batch and counts only the failures', () => {
		const result = validateFeatures([valid, invalid])
		expect(result.files[0]!.ok).toBe(true)
		expect(result.files[0]!.errors).toEqual([])
		expect(result.files[1]!.ok).toBe(false)
		expect(result.files[1]!.errors[0]!.code).toBe('EPARSE')
		// summary.errors sums error entries and reflects only the invalid file — the valid
		// one contributes zero, so the total equals the invalid file's own error count.
		expect(result.files[0]!.errors).toHaveLength(0)
		expect(result.summary.files).toBe(2)
		expect(result.summary.errors).toBe(result.files[1]!.errors.length)
		expect(result.summary.errors).toBeGreaterThan(0)
	})

	it('reports a missing file as not ok', () => {
		const result = validateFeatures([path.join(dir, 'missing.feature')])
		expect(result.files[0]!.ok).toBe(false)
		expect(result.files[0]!.errors[0]!.code).toBe('ENOENT')
	})
})
