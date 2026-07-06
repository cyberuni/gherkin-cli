# gherkin-cli — command surface contract

Agent-first Gherkin CLI wrapping `@cucumber/gherkin` v41. Three commands. AXI-conformant output. This doc is the **contract** the implementation and the SDD `.feature` suite both build to.

## Parser (shared)
```ts
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin'
import { IdGenerator } from '@cucumber/messages'
const parser = new Parser(new AstBuilder(IdGenerator.incrementing()), new GherkinClassicTokenMatcher())
const doc = parser.parse(sourceText) // GherkinDocument; throws on syntax error
```
- `doc.feature.tags[] -> {name}` · `doc.feature.children[].scenario -> { name, keyword: "Scenario"|"Scenario Outline", tags[], steps[]{keyword,text}, examples[]{tableHeader,tableBody} }`
- `doc.comments[] -> {location, text}` — count "section" comments (a comment line whose text contains a box-drawing/`--`/`==` rule) for `sectionComments`.
- A syntax error throws (`@cucumber/gherkin` `CompositeParserException` with `.errors[]`, each carrying `location.line` + message). Catch → structured error.

## Canonical data shapes (JSON is the source of truth; TOON renders it)

`parse`:
```
{ summary: { files, scenarios, errors },
  files: [ { file, featureTags: string[], scenarioCount, sectionComments,
             scenarios: [ { name, keyword, tags: string[],
                            stepCount?, exampleRows?, steps?: [{keyword,text}] } ],  // '?' = --full only
             error?: { code, line, message } } ] }
```
`validate`:
```
{ summary: { files, errors }, files: [ { file, ok: boolean, errors: [{ line, message, code }] } ] }
```
`diff`:
```
{ summary: { added, modified, removed, unchanged, files, addOnly: boolean },
  files: [ { file, addOnly: boolean, scenarios: [ { name, change: "added"|"modified"|"removed"|"unchanged" } ] } ] }
```

## Commands

### `parse <files…>`
- Flags: `--full` (add `stepCount`, `exampleRows`, `steps`), `--tag <name>` (keep only scenarios carrying it), `--format toon|json` (default `toon`), `--ast` (dump raw GherkinDocument JSON, ignores projection).
- Default TOON omits step detail (AXI #2: 3–4 fields → `name, keyword, tags`).
- A file that fails to parse gets an `error` entry; `parse` still exits **0** (best-effort projector; the error count is in `summary.errors`). File-not-found is a hard fail (exit 1, fail loud).
- Exit 0 normally.

### `validate <files…>`
- Flags: `--format toon|json`.
- Reports `ok` + per-error `line, message, code` per file. Exit **0** if all ok, **1** if any invalid. This is the CI/gate verb.

### `diff <files…> --base <gitref>`
- Reads each file's working-tree text and its text at `--base` via `git -C <fileDir> show <ref>:<relpathFromRepoRoot>`. If the base version is absent (new file) → every scenario `added`, `addOnly: true`.
- Classify by scenario **name** within the feature: in-head-not-base → `added`; in-base-not-head → `removed`; both but steps/tags/examples differ → `modified`; identical → `unchanged`. (Rename = add+remove — documented limit.)
- `addOnly` = no `modified` and no `removed`. Exit **0** normally; **1** on git/ref errors.

## AXI output layer (`output.ts`)
- **stdout** = machine result only (TOON default, or `--format json`), including the aggregate `summary`.
- **stderr** = next-step line (`→ gherkin-cli …`), warnings, structured errors.
- **TOON encoder** (hand-rolled, matches the ecosystem style): top-level scalars as `key: value`; arrays of objects as `name[N]{col1,col2}:` header + one indented CSV-ish row per item; nested arrays (e.g. `steps`) rendered inline `[…]` or a sub-block. Keep it deterministic and parseable.
- **Truncation (#3)**: a rendered result exceeding a line threshold (default ~50) is cut with `… +N lines — rerun with --full` unless `--full`; `--format json` is never truncated.
- **Empty states (#5)**: `0 scenarios across 0 files`, `0 changes (all unchanged)`, `0 errors` — explicit, exit 0.
- **Errors (#6)**: `fail(code, message)` → structured to stderr honoring `--format`, exit 1. Stable `code` strings (e.g. `ENOENT`, `EPARSE`, `EGIT`, `EBADFLAG`).
- **Fail-loud flags (#6)**: unknown flag → exit 1 naming the flag (configure commander to error, not ignore).
- **No prompts** — non-interactive by construction.
- **Next-step (#9)**: `parse` → `→ gherkin-cli diff --base <ref> <file>`; `validate` ok → `→ gherkin-cli parse <file>`; `diff` → hint by result.
- **Help (#10)**: every subcommand `--help` = synopsis + flags + one example. Bare `gherkin-cli` (no subcommand) = help (pure dispatcher, AXI #8).

## Files
- `src/parse.ts` `src/validate.ts` `src/diff.ts` — pure engines over text (+ a tiny git reader for diff).
- `src/output.ts` — TOON encoder, truncation, aggregates, structured errors, stream helpers.
- `src/cli.ts` — commander wiring + shebang `#!/usr/bin/env node`.
- `src/index.ts` — library exports (`parseFeatures`, `validateFeatures`, `diffFeatures`, types).
- Colocated `*.test.ts` (vitest) mirroring the SDD `.feature` scenarios.

## Out of scope (v1)
- SDD doctrine lints (adverb/rubric-noun bans, `@frozen`/`@rubric` semantics) — consumers apply these on the manifest.
- `pickles` (outline expansion) — v2.
- MCP server — later (structure leaves room: add `src/mcp.ts` + export).
