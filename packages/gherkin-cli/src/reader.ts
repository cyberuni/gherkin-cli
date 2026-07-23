import { readFileSync } from 'node:fs'

/**
 * Reads a file's text. The injectable filesystem seam for the parse and
 * validate engines — pass your own `ReadsFile` as the `deps` argument to drive
 * them from in-memory fixtures with no disk access (the same role
 * `ReadsGitDiff` plays for `diff`, and `Exec`/`nodeExec` play in cyber-mux). A
 * reader throws on a missing file; the engines catch that and surface an
 * `ENOENT` entry rather than propagating.
 */
export interface ReadsFile {
	readFile(path: string): string
}

/** The default reader: real filesystem via `readFileSync(path, 'utf8')`. */
export const nodeReadsFile: ReadsFile = { readFile: (path) => readFileSync(path, 'utf8') }
