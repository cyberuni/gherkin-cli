import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fileArg, main } from './cli.js'

function fixture(count: number): string[] {
	const dir = mkdtempSync(path.join(tmpdir(), 'gk-help-'))
	return Array.from({ length: count }, (_, i) => {
		const file = path.join(dir, `f${i}.feature`)
		writeFileSync(file, `Feature: F${i}\n  Scenario: S${i}\n    Given x\n    Then y\n`)
		return file
	})
}

/** Run the CLI and return everything it wrote to STDOUT. */
async function run(argv: string[]): Promise<string> {
	let out = ''
	const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
		out += String(chunk)
		return true
	})
	try {
		await main(argv)
	} finally {
		spy.mockRestore()
	}
	return out
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('fileArg', () => {
	it('names the file when exactly one was given', () => {
		expect(fileArg(['features/login.feature'])).toBe('features/login.feature')
	})

	it('collapses a batch to the <files...> placeholder', () => {
		expect(fileArg(['a.feature', 'b.feature'])).toBe('<files...>')
	})

	it('falls back to the placeholder when no file was given', () => {
		expect(fileArg([])).toBe('<files...>')
	})
})

describe('next-step help block', () => {
	it('repeats no path list for a batch parse (AXI #9)', async () => {
		const files = fixture(26)
		const out = await run(['parse', ...files])

		const help = out.slice(out.lastIndexOf('help['))
		expect(help).toContain('gherkin-cli diff --base <ref> <files...>')
		expect(help).toContain('gherkin-cli parse <files...> --full')
		for (const file of files) expect(help).not.toContain(file)
	})

	it('names the real path for a single-file parse', async () => {
		const [file] = fixture(1) as [string]
		const out = await run(['parse', file])

		const help = out.slice(out.lastIndexOf('help['))
		expect(help).toContain(`gherkin-cli diff --base <ref> ${file}`)
		expect(help).toContain(`gherkin-cli parse ${file} --full`)
	})

	it('collapses the batch path list for validate', async () => {
		const files = fixture(3)
		const out = await run(['validate', ...files])

		const help = out.slice(out.lastIndexOf('help['))
		expect(help).toContain('gherkin-cli parse <files...>')
		for (const file of files) expect(help).not.toContain(file)
	})

	it('names the real path for a single-file validate', async () => {
		const [file] = fixture(1) as [string]
		const out = await run(['validate', file])

		expect(out.slice(out.lastIndexOf('help['))).toContain(`gherkin-cli parse ${file}`)
	})
})
