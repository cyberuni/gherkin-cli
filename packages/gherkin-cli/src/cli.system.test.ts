import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The built bin. Skipped when dist is absent (e.g. test run before build in
// parallel turbo tasks); `pnpm verify` builds first, so it runs in CI.
const dist = fileURLToPath(new URL('../dist/cli.js', import.meta.url))

describe.skipIf(!existsSync(dist))('published bin entry', () => {
	// Regression: the entry guard must fire when the bin is invoked by name
	// (npx / pnpm point argv[1] at a .bin symlink, not cli.js), not only on a
	// direct `node dist/cli.js` run.
	it('runs when invoked by a bin name that is not cli.js', () => {
		const dir = mkdtempSync(path.join(tmpdir(), 'gk-bin-'))
		const feature = path.join(dir, 't.feature')
		writeFileSync(feature, '@frozen\nFeature: d\n  Scenario: a\n    Given x\n    Then y\n')
		const shim = path.join(dir, 'gherkin-cli')
		symlinkSync(dist, shim)

		const out = execFileSync(process.execPath, [shim, 'parse', feature], { encoding: 'utf8' })
		expect(out).toContain('scenarios')
		expect(out.trim().length).toBeGreaterThan(0)
	})
})
