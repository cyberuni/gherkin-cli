/**
 * The programmatic API surface for gherkin-cli.
 *
 * This barrel is the `.` export — the library entrypoint a programmatic
 * consumer imports (`import { parse } from 'gherkin-cli'`). It re-exports ONLY
 * the pure engines and their types: each function reads `.feature` source,
 * returns a structured result (with a pre-computed `summary`), and throws a
 * typed error on failure. Nothing here writes to a stream or calls
 * `process.exit`.
 *
 * Each engine takes its injected I/O as a separate 3rd `deps` argument — a
 * narrow role interface (ISP), not an option. `parse` / `parseAst` / `validate`
 * take a `ReadsFile` (default {@link nodeReadsFile}); `diff` takes a
 * `ReadsGitDiff` (default {@link gitReadsDiff}). Pass a fake to drive the
 * engines from in-memory fixtures with no disk or git access.
 *
 * It deliberately re-exports NONE of the CLI-only modules (`output.ts`,
 * `cli.ts`) — those own the render/format layer and call `writeResult` /
 * `process.exit`. Keeping them out of this entry is what makes the CLI surface
 * structurally unreachable from the library: importing `gherkin-cli` never
 * runs the CLI, writes to stdout, or exits the process.
 */
export type {
	ChangeKind,
	DiffFile,
	DiffFileError,
	DiffOptions,
	DiffResult,
	DiffScenario,
	ReadsGitDiff,
} from './diff.js'
export { diff, GitError, gitReadsDiff } from './diff.js'
export type {
	ParseAstFile,
	ParseFile,
	ParseFileError,
	ParseOptions,
	ParseResult,
	ParseScenario,
	ParseStep,
} from './parse.js'
export { parse, parseAst } from './parse.js'
// The injectable filesystem seam and its node default — pass a ReadsFile as the
// `deps` argument to parse / parseAst / validate to drive them from fixtures
// with no disk access (the counterpart to ReadsGitDiff / gitReadsDiff for diff).
export { nodeReadsFile, type ReadsFile } from './reader.js'
export type { ValidateError, ValidateFile, ValidateOptions, ValidateResult } from './validate.js'
export { validate } from './validate.js'
