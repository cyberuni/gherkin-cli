import { readFileSync } from 'node:fs'

/**
 * Reads a file's text. The injectable filesystem seam for the parse and
 * validate engines — pass your own to drive them from in-memory fixtures with
 * no disk access (the same role `DiffReader` plays for `diffFeatures`, and
 * `Exec`/`nodeExec` play in cyber-mux). A reader throws on a missing file; the
 * engines catch that and surface an `ENOENT` entry rather than propagating.
 */
export type FileReader = (path: string) => string

/** The default reader: real filesystem via `readFileSync(path, 'utf8')`. */
export const nodeFileReader: FileReader = (path) => readFileSync(path, 'utf8')
