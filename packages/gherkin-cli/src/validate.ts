import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin'
import { IdGenerator } from '@cucumber/messages'
import { type FileReader, nodeFileReader } from './reader.js'

export interface ValidateError {
	line: number
	message: string
	code: 'EPARSE' | 'ENOENT'
}

export interface ValidateFile {
	file: string
	ok: boolean
	errors: ValidateError[]
}

export interface ValidateResult {
	summary: { files: number; errors: number }
	files: ValidateFile[]
}

export interface ValidateOptions {
	/** Injectable filesystem seam (default {@link nodeFileReader}) — pass a fake to test without disk. */
	reader?: FileReader
}

function newParser(): Parser<unknown> {
	return new Parser(new AstBuilder(IdGenerator.incrementing()), new GherkinClassicTokenMatcher())
}

function validateOne(path: string, read: FileReader): ValidateFile {
	let text: string
	try {
		text = read(path)
	} catch (err) {
		return { file: path, ok: false, errors: [{ line: 0, message: (err as Error).message, code: 'ENOENT' }] }
	}
	try {
		newParser().parse(text)
		return { file: path, ok: true, errors: [] }
	} catch (err) {
		const composite = err as {
			errors?: { location?: { line: number }; message: string }[]
			message: string
			location?: { line: number }
		}
		const raw = composite.errors ?? [composite]
		const errors: ValidateError[] = raw.map((e) => ({
			line: e.location?.line ?? 0,
			message: e.message.split('\n')[0] ?? e.message,
			code: 'EPARSE',
		}))
		return { file: path, ok: false, errors }
	}
}

/** Parse each file and collect syntax errors. The CLI exits 1 if any file is invalid. */
export function validateFeatures(paths: string[], opts: ValidateOptions = {}): ValidateResult {
	const read = opts.reader ?? nodeFileReader
	const files = paths.map((path) => validateOne(path, read))
	return {
		summary: { files: files.length, errors: files.reduce((sum, f) => sum + f.errors.length, 0) },
		files,
	}
}
