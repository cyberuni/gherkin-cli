# gherkin-cli

An **agent-first Gherkin CLI** — parse, validate, and diff `.feature` files with token-efficient, [AXI](https://github.com/kunchenguid/axi)-conformant output. Wraps the canonical [`@cucumber/gherkin`](https://github.com/cucumber/gherkin) parser.

Built for AI agents that read and reason over Gherkin suites: compact [TOON](https://toonformat.dev/) output by default, minimal default schemas, pre-computed aggregates, structured errors, and clean stream discipline (result on stdout, affordances on stderr).

## Install / run

```bash
npx gherkin-cli parse features/**/*.feature
```

## Commands

| Command    | Purpose                                                                      |
| ---------- | --------------------------------------------------------------------------- |
| `parse`    | Project a `.feature` into a compact digest (scenarios, tags, counts)         |
| `validate` | Check `.feature` well-formedness; exit 1 + structured errors on invalid      |
| `diff`     | Classify scenario changes vs a git ref (`added`/`modified`/`removed`)        |

### `parse <files…>`
Emits a TOON manifest — per file: feature tags, scenario count, section-comment count, and per scenario `name, keyword, tags`. `--full` adds step text, step/example counts. `--tag <name>` filters. `--format json` for the structured escape. `--ast` dumps the raw cucumber `GherkinDocument`.

### `validate <files…>`
Reports Gherkin syntax validity. Exit `0` when all files parse, `1` when any fails, with structured `file:line: code message` errors honoring `--format`.

### `diff <files…> --base <gitref>`
Classifies each scenario as `added` / `modified` / `removed` / `unchanged` against `--base`. Carries an `addOnly` aggregate — `true` means the change is purely additive.

## Development

```bash
pnpm install
pnpm verify   # build + typecheck + test across the workspace
```

Monorepo: pnpm + turbo + biome + changesets. The CLI lives in `packages/gherkin-cli`.
