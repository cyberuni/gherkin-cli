#!/usr/bin/env node
import { Command, CommanderError } from 'commander'
import { diffFeatures, GitError } from './diff.js'
import { type Format, fail, render, truncate, writeResult, writeStderr } from './output.js'
import { parseFeatures, parseFeaturesAst } from './parse.js'
import { validateFeatures } from './validate.js'

function resolveFormat(raw: unknown): Format {
	return raw === 'json' ? 'json' : 'toon'
}

/** Best-effort format read for the error path, before commander has parsed. */
function preScanFormat(argv: string[]): Format {
	const i = argv.indexOf('--format')
	return i >= 0 && argv[i + 1] === 'json' ? 'json' : 'toon'
}

function emit(data: unknown, format: Format, full: boolean): void {
	writeResult(truncate(render(data, format), { full, format }))
}

function addFormat(cmd: Command): Command {
	return cmd.option('--format <fmt>', 'output format: toon | json', 'toon')
}

function buildProgram(): Command {
	const program = new Command()
	program
		.name('gherkin-cli')
		.description('Agent-first Gherkin CLI — parse, validate, and diff .feature files.')
		.option('--format <fmt>', 'output format: toon | json', 'toon')

	addFormat(
		program
			.command('parse')
			.description('Project .feature files to a token-efficient summary')
			.argument('<files...>', '.feature files to parse')
			.option('--full', 'include stepCount, exampleRows, and steps')
			.option('--tag <name>', 'keep only scenarios carrying this tag')
			.option('--ast', 'dump the raw GherkinDocument JSON (ignores projection)'),
	)
		.addHelpText('after', '\nExample:\n  $ gherkin-cli parse features/login.feature --tag @smoke')
		.action((files: string[], opts, command: Command) => {
			const format = resolveFormat(command.optsWithGlobals().format)
			const full = Boolean(opts.full)

			if (opts.ast) {
				const ast = parseFeaturesAst(files)
				const missing = ast.find((f) => f.error?.code === 'ENOENT')
				if (missing) return fail('ENOENT', `file not found: ${missing.file}`, format)
				return writeResult(render(ast, 'json'))
			}

			const result = parseFeatures(files, { full, tag: opts.tag })
			const missing = result.files.find((f) => f.error?.code === 'ENOENT')
			if (missing) return fail('ENOENT', `file not found: ${missing.file}`, format)

			emit(result, format, full)
			if (result.summary.files === 0 || result.summary.scenarios === 0) {
				writeStderr(`0 scenarios across ${result.summary.files} files`)
			}
			writeStderr(`→ gherkin-cli diff --base <ref> ${files.join(' ')}`)
		})

	addFormat(
		program
			.command('validate')
			.description('Validate .feature syntax (the CI/gate verb)')
			.argument('<files...>', '.feature files to validate'),
	)
		.addHelpText('after', '\nExample:\n  $ gherkin-cli validate features/login.feature')
		.action((files: string[], _opts, command: Command) => {
			const format = resolveFormat(command.optsWithGlobals().format)
			const result = validateFeatures(files)
			emit(result, format, false)

			if (result.summary.errors === 0) {
				writeStderr('0 errors')
				writeStderr(`→ gherkin-cli parse ${files.join(' ')}`)
				return
			}
			writeStderr(`→ ${result.summary.errors} error(s) across ${result.summary.files} file(s)`)
			process.exit(1)
		})

	addFormat(
		program
			.command('diff')
			.description('Classify scenario changes against a base git ref')
			.argument('<files...>', '.feature files to diff')
			.requiredOption('--base <ref>', 'base git ref to compare against')
			.option('--full', 'include unchanged scenarios in full detail'),
	)
		.addHelpText('after', '\nExample:\n  $ gherkin-cli diff features/login.feature --base HEAD~1')
		.action((files: string[], opts, command: Command) => {
			const format = resolveFormat(command.optsWithGlobals().format)
			const full = Boolean(opts.full)
			let result: ReturnType<typeof diffFeatures>
			try {
				result = diffFeatures(files, { base: opts.base })
			} catch (err) {
				if (err instanceof GitError) return fail('EGIT', err.message, format)
				throw err
			}

			emit(result, format, full)
			const { added, modified, removed } = result.summary
			if (added + modified + removed === 0) {
				writeStderr('0 changes (all unchanged)')
				writeStderr(`→ gherkin-cli parse ${files.join(' ')}`)
				return
			}
			writeStderr(`→ review ${added} added / ${modified} modified / ${removed} removed scenario(s)`)
		})

	return program
}

export async function main(argv: string[]): Promise<void> {
	const program = buildProgram()
	// Suppress commander's own error output; we emit a structured error instead.
	const silence = { writeErr: () => {} }
	program.exitOverride().configureOutput(silence)
	for (const cmd of program.commands) cmd.exitOverride().configureOutput(silence)

	// Bare invocation (no subcommand) → help, exit 0 (pure dispatcher, AXI #8).
	if (argv.length === 0) {
		writeStderr(program.helpInformation())
		return
	}

	try {
		await program.parseAsync(argv, { from: 'user' })
	} catch (err) {
		if (err instanceof CommanderError) {
			if (err.code === 'commander.helpDisplayed' || err.code === 'commander.help' || err.code === 'commander.version') {
				return
			}
			return fail('EBADFLAG', err.message, preScanFormat(argv))
		}
		throw err
	}
}

/* c8 ignore start */
if (process.argv[1]?.endsWith('cli.js') || process.argv[1]?.endsWith('cli.ts')) {
	main(process.argv.slice(2)).catch((err: Error) => {
		writeStderr(`error: ${err.message}`)
		process.exit(1)
	})
}
/* c8 ignore stop */
