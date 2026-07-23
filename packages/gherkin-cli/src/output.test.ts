import { describe, expect, it } from 'vitest'
import { encodeToon, fail, render, TRUNCATE_THRESHOLD, truncate, writeResult, writeStderr } from './output.js'

const sample = {
	summary: { files: 1, scenarios: 2, errors: 0 },
	files: [
		{
			file: 'a.feature',
			featureTags: ['@auth'],
			scenarioCount: 2,
			scenarios: [
				{ name: 'Successful login', keyword: 'Scenario', tags: ['@smoke'] },
				{ name: 'Failed login', keyword: 'Scenario', tags: [] },
			],
		},
	],
}

describe('encodeToon', () => {
	it('renders top-level scalars, object arrays, and inline string arrays', () => {
		const toon = encodeToon(sample)
		expect(toon).toContain('files: 1')
		expect(toon).toContain('scenarios: 2')
		// object array header with column list
		expect(toon).toContain('files[1]:')
		expect(toon).toContain('scenarios[2]{name,keyword,tags}:')
		// inline string array
		expect(toon).toContain('featureTags: [@auth]')
		// value carrying a space is quoted; empty string array is []
		expect(toon).toContain('"Successful login",Scenario,[@smoke]')
		expect(toon).toContain('"Failed login",Scenario,[]')
	})

	it('quotes values containing commas', () => {
		expect(encodeToon({ note: 'a, b' })).toBe('note: "a, b"')
	})
})

describe('render', () => {
	it('produces pretty JSON for --format json', () => {
		const json = render(sample, 'json')
		expect(JSON.parse(json)).toEqual(sample)
		expect(json).toContain('\n  ') // pretty-printed
	})
})

describe('truncate', () => {
	const big = Array.from({ length: TRUNCATE_THRESHOLD + 10 }, (_, i) => `line ${i}`).join('\n')

	it('truncates over-threshold TOON with a size hint', () => {
		const out = truncate(big, { format: 'toon' })
		expect(out).toContain('— rerun with --full')
		expect(out.split('\n').length).toBe(TRUNCATE_THRESHOLD + 1)
	})

	it('does not truncate under the threshold', () => {
		const small = 'a\nb\nc'
		expect(truncate(small, { format: 'toon' })).toBe(small)
	})

	it('never truncates JSON, and never with --full', () => {
		expect(truncate(big, { format: 'json' })).toBe(big)
		expect(truncate(big, { format: 'toon', full: true })).toBe(big)
	})
})

function fakeStream() {
	const chunks: string[] = []
	return { chunks, write: (s: string) => chunks.push(s) }
}

describe('stream discipline', () => {
	it('writes the machine result to stdout; stderr is only the uncaught-exception fallback', () => {
		const out = fakeStream()
		const err = fakeStream()
		writeResult('summary:\n  files: 1', out)
		writeStderr('uncaught: something went wrong', err)
		expect(out.chunks.join('')).toBe('summary:\n  files: 1\n')
		expect(err.chunks.join('')).toBe('uncaught: something went wrong\n')
	})
})

describe('fail', () => {
	// Errors are output the agent must act on, so they go to stdout with the
	// results — not stderr, which agents do not read.
	it('prints a structured error to stdout and exits 1', () => {
		const out = fakeStream()
		let code = -1
		fail('EPARSE', 'boom', 'toon', {
			out,
			exit: (c) => {
				code = c
			},
		})
		expect(code).toBe(1)
		expect(out.chunks.join('')).toContain('code: EPARSE')
		expect(out.chunks.join('')).toContain('message: boom')
	})

	it('exits 2 on a usage error and inlines the suggested fix', () => {
		const out = fakeStream()
		let code = -1
		fail('EBADFLAG', "unknown option '--stat'", 'toon', {
			exitCode: 2,
			help: ['valid flags for `list`: --state'],
			out,
			exit: (c) => {
				code = c
			},
		})
		expect(code).toBe(2)
		expect(out.chunks.join('')).toContain('help[1]:')
		expect(out.chunks.join('')).toContain('valid flags for `list`: --state')
	})

	it('honors --format json', () => {
		const out = fakeStream()
		fail('EGIT', 'bad ref', 'json', { out, exit: () => {} })
		expect(JSON.parse(out.chunks.join(''))).toEqual({ error: { code: 'EGIT', message: 'bad ref' }, help: [] })
	})
})
