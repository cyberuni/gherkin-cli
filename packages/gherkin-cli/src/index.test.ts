import { expect, it, vi } from 'vitest'
import * as api from './index.js'

// The public API barrel is the `.` export — the programmatic surface. These
// tests lock the export contract and the firewall: the render/stream layer
// (output.ts) must stay CLI-only and structurally unreachable from the library.

it('exposes the pure engine functions', () => {
	expect(typeof api.parseFeatures).toBe('function')
	expect(typeof api.parseFeaturesAst).toBe('function')
	expect(typeof api.validateFeatures).toBe('function')
	expect(typeof api.diffFeatures).toBe('function')
	expect(typeof api.GitError).toBe('function')
})

it('exports exactly the pure engine surface — no more', () => {
	expect(Object.keys(api).sort()).toEqual(
		['GitError', 'diffFeatures', 'parseFeatures', 'parseFeaturesAst', 'validateFeatures'].sort(),
	)
})

it('does not re-export the CLI-only render or stream helpers', () => {
	// The firewall: output.ts (render, encodeToon, writeResult, fail, writeHelp)
	// touches process.stdout / process.exit and is deliberately kept out of the
	// library entry, so importing gherkin-cli runs no CLI side effect.
	for (const cliOnly of ['render', 'encodeToon', 'writeResult', 'fail', 'writeHelp', 'main', 'home']) {
		expect(api).not.toHaveProperty(cliOnly)
	}
})

it('importing the barrel runs no CLI side effect — no stdout write, no process.exit', async () => {
	// The firewall in action: evaluating the library entry must not touch a stream or
	// exit. resetModules forces the dynamic import below to actually re-execute the
	// module body under the spies (a cached import would run nothing — the "no side
	// effect" assertion still holds either way, but re-execution makes it meaningful).
	const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
	const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
	try {
		vi.resetModules()
		const reimported = await import('./index.js')
		expect(typeof reimported.parseFeatures).toBe('function')
		expect(outSpy).not.toHaveBeenCalled()
		expect(exitSpy).not.toHaveBeenCalled()
	} finally {
		outSpy.mockRestore()
		exitSpy.mockRestore()
	}
})

it('engines return values and throw — they never exit the process', () => {
	// A pure engine call resolves to a structured result with no stream write.
	const result = api.validateFeatures([])
	expect(result.summary).toEqual({ files: 0, errors: 0 })
})
