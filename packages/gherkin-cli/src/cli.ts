#!/usr/bin/env node
import { globSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command, CommanderError } from 'commander'
import { diffFeatures, GitError } from './diff.js'
import { type Format, fail, render, truncate, writeHelp, writeResult, writeStderr } from './output.js'
import { parseFeatures, parseFeaturesAst } from './parse.js'
import { validateFeatures } from './validate.js'

/** Valid flags per subcommand, inlined into unknown-flag errors (AXI #6). */
const FLAGS: Record<string, string[]> = {
	parse: ['--full', '--tag <name>', '--ast', '--format <fmt>'],
	validate: ['--format <fmt>'],
	diff: ['--base <ref>', '--full', '--format <fmt>'],
}

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

/** A missing input file — point at the discovery command, not just the failure. */
function notFound(file: string, format: Format): void {
	fail('ENOENT', `file not found: ${file}`, format, {
		help: ['gherkin-cli — list the .feature files discoverable here'],
	})
}

/** Collapse the home directory to `~` for the home view's bin line (AXI #10). */
function displayPath(file: string): string {
	const home = homedir()
	return file.startsWith(home) ? file.replace(home, '~') : file
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
				if (missing) return notFound(missing.file, format)
				return writeResult(render(ast, 'json'))
			}

			const result = parseFeatures(files, { full, tag: opts.tag })
			const missing = result.files.find((f) => f.error?.code === 'ENOENT')
			if (missing) return notFound(missing.file, format)

			emit(result, format, full)
			if (result.summary.scenarios === 0) {
				writeResult(`scenarios: 0 scenarios found across ${result.summary.files} file(s)`)
			}
			writeHelp([
				`gherkin-cli diff --base <ref> ${files.join(' ')}`,
				...(full ? [] : [`gherkin-cli parse ${files.join(' ')} --full`]),
			])
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
				writeResult(`errors: 0 syntax errors across ${result.summary.files} file(s)`)
				writeHelp([`gherkin-cli parse ${files.join(' ')}`])
				return
			}
			writeHelp([`gherkin-cli parse <file> --ast to inspect the failing document`])
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
				writeResult(`changes: 0 scenario changes against ${opts.base} (all unchanged)`)
				writeHelp([`gherkin-cli parse ${files.join(' ')}`])
				return
			}
			writeHelp([
				`gherkin-cli parse ${files.join(' ')} --full`,
				...(full ? [] : [`gherkin-cli diff --base ${opts.base} ${files.join(' ')} --full`]),
			])
		})

	return program
}

/** The subcommand in an argv, used to scope an unknown-flag error's flag list. */
function preScanCommand(argv: string[]): string | undefined {
	return argv.find((arg) => arg in FLAGS)
}

/**
 * Translate a commander parse failure into a structured usage error: strip
 * commander's own `error:` prefix, and inline the valid flags so the agent
 * self-corrects without a follow-up `--help` call (AXI #6).
 */
function usageError(err: CommanderError, argv: string[]): void {
	const command = preScanCommand(argv)
	const flags = command ? FLAGS[command] : undefined
	fail('EBADFLAG', err.message.replace(/^error:\s*/, ''), preScanFormat(argv), {
		exitCode: 2,
		help: flags
			? [`valid flags for \`${command}\`: ${flags.join(', ')}`, `gherkin-cli ${command} --help`]
			: [`valid commands: ${Object.keys(FLAGS).join(', ')}`],
	})
}

const HOME_LIMIT = 20

/**
 * The no-args home view: what this tool is, then the .feature files in the
 * current directory with their scenario counts (AXI #8, #10).
 */
export function home(cwd: string = process.cwd()): void {
	const found = globSync('**/*.feature', { cwd, exclude: (name) => name === 'node_modules' })
		.map((file) => relative('.', file))
		.sort()
	const shown = found.slice(0, HOME_LIMIT)
	const result = parseFeatures(
		shown.map((file) => `${cwd}/${file}`),
		{},
	)

	writeResult(
		render(
			{
				bin: displayPath(fileURLToPath(import.meta.url)),
				description: 'Parse, validate, and diff Gherkin .feature files as token-efficient agent output',
				count: `${shown.length} of ${found.length} total`,
				// The zero case states itself below rather than emitting an empty
				// array, so the agent never sees two `features:` keys disagreeing.
				...(found.length === 0
					? { features: '0 .feature files found in this directory' }
					: {
							features: shown.map((file, i) => ({
								file,
								scenarios: result.files[i]?.scenarioCount ?? 0,
								tags: result.files[i]?.featureTags ?? [],
							})),
						}),
			},
			'toon',
		),
	)
	writeHelp([
		...(found.length > HOME_LIMIT ? [`gherkin-cli parse '**/*.feature' for all ${found.length} files`] : []),
		'gherkin-cli parse <file> to summarize scenarios',
		'gherkin-cli validate <file> to check syntax',
		'gherkin-cli diff --base <ref> <file> to classify changes',
	])
}

export async function main(argv: string[]): Promise<void> {
	const program = buildProgram()
	// Suppress commander's own error output; we emit a structured error instead.
	const silence = { writeErr: () => {} }
	program.exitOverride().configureOutput(silence)
	for (const cmd of program.commands) cmd.exitOverride().configureOutput(silence)

	// Bare invocation → the live .feature inventory for this directory, not a
	// usage manual (AXI #8): the agent can act on what it sees in one call.
	if (argv.length === 0) {
		home()
		return
	}

	try {
		await program.parseAsync(argv, { from: 'user' })
	} catch (err) {
		if (err instanceof CommanderError) {
			if (err.code === 'commander.helpDisplayed' || err.code === 'commander.help' || err.code === 'commander.version') {
				return
			}
			return usageError(err, argv)
		}
		throw err
	}
}

/* c8 ignore start */
// True when this file is the process entry — robust across a direct `node cli.js`
// run and a bin invoked by name (npx / pnpm resolve argv[1] to a .bin symlink, so
// compare real paths, not the basename).
function isMainModule(): boolean {
	const entry = process.argv[1]
	if (entry === undefined) return false
	try {
		return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))
	} catch {
		return false
	}
}

if (isMainModule()) {
	main(process.argv.slice(2)).catch((err: Error) => {
		writeStderr(`error: ${err.message}`)
		process.exit(1)
	})
}
/* c8 ignore stop */
