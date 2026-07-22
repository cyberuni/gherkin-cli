/**
 * The programmatic API surface for gherkin-cli.
 *
 * This barrel is the `.` export — the library entrypoint a programmatic
 * consumer imports (`import { parseFeatures } from 'gherkin-cli'`). It
 * re-exports ONLY the pure engines and their types: each function reads
 * `.feature` source, returns a structured result (with a pre-computed
 * `summary`), and throws a typed error on failure. Nothing here writes to a
 * stream or calls `process.exit`.
 *
 * It deliberately re-exports NONE of the CLI-only modules (`output.ts`,
 * `cli.ts`) — those own the render/format layer and call `writeResult` /
 * `process.exit`. Keeping them out of this entry is what makes the CLI surface
 * structurally unreachable from the library: importing `gherkin-cli` never
 * runs the CLI, writes to stdout, or exits the process.
 */
export type { ChangeKind, DiffFile, DiffFileError, DiffOptions, DiffReader, DiffResult, DiffScenario } from './diff.js'
export { diffFeatures, GitError } from './diff.js'
export type {
	ParseAstFile,
	ParseFile,
	ParseFileError,
	ParseOptions,
	ParseResult,
	ParseScenario,
	ParseStep,
} from './parse.js'
export { parseFeatures, parseFeaturesAst } from './parse.js'
export type { ValidateError, ValidateFile, ValidateOptions, ValidateResult } from './validate.js'
export { validateFeatures } from './validate.js'
