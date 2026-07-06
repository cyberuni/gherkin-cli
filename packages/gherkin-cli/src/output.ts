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

/** Write a human affordance (next-step, warning) to STDERR. */
export function writeStderr(text: string, err: Writable = process.stderr): void {
	writeLine(err, text)
}

/** Print a structured error to STDERR honoring the format, then exit 1. */
export function fail(
	code: ErrorCode,
	message: string,
	format: Format = 'toon',
	opts: { err?: Writable; exit?: (code: number) => void } = {},
): void {
	const body =
		format === 'json'
			? JSON.stringify({ error: { code, message } }, null, 2)
			: `error: true\ncode: ${code}\nmessage: ${formatScalar(message)}`
	writeStderr(body, opts.err)
	;(opts.exit ?? process.exit)(1)
}
