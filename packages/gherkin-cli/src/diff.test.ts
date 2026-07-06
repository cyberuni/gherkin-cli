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
	const result = diffFeatures([file], { base: 'HEAD', reader })
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

		const result = diffFeatures([file], { base: 'HEAD' })
		const map = new Map(result.files[0]!.scenarios.map((s) => [s.name, s.change]))
		expect(map.get('keep')).toBe('unchanged')
		expect(map.get('change me')).toBe('modified')
		expect(map.get('brand new')).toBe('added')
		expect(map.get('drop me')).toBe('removed')
	})
})
