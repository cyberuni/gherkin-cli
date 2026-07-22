// AXI output layer: a hand-rolled deterministic TOON encoder, a JSON escape
// hatch, truncation, structured errors, and stream-discipline helpers.

export type Format = 'toon' | 'json'

export type ErrorCode = 'ENOENT' | 'EPARSE' | 'EGIT' | 'EBADFLAG'

/** Line threshold above which a rendered TOON result is truncated (never JSON). */
export const TRUNCATE_THRESHOLD = 50

const INDENT = '  '

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isScalar(value: unknown): boolean {
	return value === null || value === undefined || typeof value !== 'object'
}

function isScalarArray(value: unknown): value is unknown[] {
	return Array.isArray(value) && value.every(isScalar)
}

function isObjectArray(value: unknown): value is Record<string, unknown>[] {
	return Array.isArray(value) && value.length > 0 && value.every(isPlainObject)
}

/** A tabular object array has only scalar or scalar-array fields — no nesting. */
function isSimpleObjectArray(value: unknown): value is Record<string, unknown>[] {
	return (
		isObjectArray(value) &&
		value.every((item) => Object.values(item).every((field) => isScalar(field) || isScalarArray(field)))
	)
}

function needsQuote(text: string): boolean {
	return text === '' || /[,:\s[\]{}"]/.test(text)
}

/** Render a single scalar, quoting strings that carry commas/spaces/structure. */
export function formatScalar(value: unknown): string {
	if (value === null || value === undefined) return 'null'
	if (typeof value === 'boolean' || typeof value === 'number') return String(value)
	const text = String(value)
	return needsQuote(text) ? `"${text.replace(/"/g, '\\"')}"` : text
}

function formatInlineArray(items: unknown[]): string {
	return `[${items.map(formatScalar).join(',')}]`
}

function columnUnion(items: Record<string, unknown>[]): string[] {
	const cols: string[] = []
	for (const item of items) {
		for (const key of Object.keys(item)) {
			if (!cols.includes(key)) cols.push(key)
		}
	}
	return cols
}

function formatCell(value: unknown): string {
	if (isScalarArray(value)) return formatInlineArray(value)
	if (value === undefined) return ''
	return formatScalar(value)
}

function encodeObject(obj: Record<string, unknown>, indent: number, lines: string[]): void {
	const pad = INDENT.repeat(indent)
	for (const [key, value] of Object.entries(obj)) {
		if (Array.isArray(value)) {
			if (isSimpleObjectArray(value)) {
				const cols = columnUnion(value)
				lines.push(`${pad}${key}[${value.length}]{${cols.join(',')}}:`)
				const rowPad = INDENT.repeat(indent + 1)
				for (const item of value) {
					lines.push(rowPad + cols.map((col) => formatCell(item[col])).join(','))
				}
			} else if (isObjectArray(value)) {
				lines.push(`${pad}${key}[${value.length}]:`)
				for (const item of value) encodeListItem(item, indent + 1, lines)
			} else {
				lines.push(`${pad}${key}: ${formatInlineArray(value)}`)
			}
		} else if (isPlainObject(value)) {
			lines.push(`${pad}${key}:`)
			encodeObject(value, indent + 1, lines)
		} else {
			lines.push(`${pad}${key}: ${formatScalar(value)}`)
		}
	}
}

function encodeListItem(item: Record<string, unknown>, indent: number, lines: string[]): void {
	const start = lines.length
	encodeObject(item, indent, lines)
	const firstPad = INDENT.repeat(indent)
	const markerPad = INDENT.repeat(indent - 1) + '- '
	const first = lines[start]
	if (first !== undefined) lines[start] = markerPad + first.slice(firstPad.length)
}

/** Encode a plain data object as deterministic TOON. */
export function encodeToon(data: unknown): string {
	const lines: string[] = []
	if (isPlainObject(data)) encodeObject(data, 0, lines)
	else lines.push(formatScalar(data))
	return lines.join('\n')
}

/** Render a result in the requested machine format. */
export function render(data: unknown, format: Format): string {
	return format === 'json' ? JSON.stringify(data, null, 2) : encodeToon(data)
}

/** Truncate an over-long TOON result with a size hint; JSON is never truncated. */
export function truncate(text: string, opts: { full?: boolean; format: Format }): string {
	if (opts.format === 'json' || opts.full) return text
	const lines = text.split('\n')
	if (lines.length <= TRUNCATE_THRESHOLD) return text
	const kept = lines.slice(0, TRUNCATE_THRESHOLD)
	const remaining = lines.length - TRUNCATE_THRESHOLD
	kept.push(`… +${remaining} lines — rerun with --full`)
	return kept.join('\n')
}

interface Writable {
	write(chunk: string): unknown
}

function writeLine(stream: Writable, text: string): void {
	stream.write(text.endsWith('\n') ? text : text + '\n')
}

/** Write the machine result to STDOUT (the only thing that goes there). */
export function writeResult(text: string, out: Writable = process.stdout): void {
	writeLine(out, text)
}

/**
 * Write to STDERR — reserved for the top-level uncaught-exception fallback only.
 * The agent-consumed output (result, structured errors, next-step hints, empty
 * states) all go to stdout via writeResult; stderr stays empty on any normal run.
 */
export function writeStderr(text: string, err: Writable = process.stderr): void {
	writeLine(err, text)
}

/**
 * Print a structured error to STDOUT honoring the format, then exit.
 *
 * Errors are output the agent must act on, so they share the stdout channel
 * with normal results (AXI #6). `help` carries the command that fixes the
 * problem; `exitCode` is 2 for usage errors and 1 for everything else.
 */
export function fail(
	code: ErrorCode,
	message: string,
	format: Format = 'toon',
	opts: { help?: string[]; exitCode?: number; out?: Writable; exit?: (code: number) => void } = {},
): void {
	const help = opts.help ?? []
	const body =
		format === 'json'
			? JSON.stringify({ error: { code, message }, help }, null, 2)
			: [`error: true`, `code: ${code}`, `message: ${formatScalar(message)}`, ...formatHelp(help)].join('\n')
	writeResult(body, opts.out)
	;(opts.exit ?? process.exit)(opts.exitCode ?? 1)
}

/** Render next-step suggestions as a TOON `help[n]` block (omitted when empty). */
export function formatHelp(lines: string[]): string[] {
	if (lines.length === 0) return []
	return [`help[${lines.length}]:`, ...lines.map((line) => `${INDENT}${formatScalar(line)}`)]
}

/** Write next-step suggestions to STDOUT beneath a result (AXI #9). */
export function writeHelp(lines: string[], out?: Writable): void {
	if (lines.length > 0) writeResult(formatHelp(lines).join('\n'), out)
}
