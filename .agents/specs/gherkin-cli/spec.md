---
status: implemented
project-path: packages/gherkin-cli
---

# gherkin-cli — project spec

An agent-first Gherkin toolkit with two entrypoints over the canonical `@cucumber/gherkin` parser: a **programmatic API** you `import` and a **CLI** you run. It parses, validates, and diffs `.feature` files as token-efficient, AXI-conformant output built for AI-agent consumption.

## Charter

`gherkin-cli` ships one package behind two symmetric surfaces:

- **The API** (`src/index.ts` barrel) — pure engines a programmatic consumer imports: `parse` / `parseAst`, `validate`, and `diff` (plus `GitError` and all their types). Each reads `.feature` source, returns a structured result carrying a pre-computed `summary`, and throws a typed error on failure. It writes to no stream and never calls `process.exit`.
- **The CLI** (`src/cli.ts` bin) — a commander program that is a *client* of the API barrel. It adds the command surface the library omits: flag→option wiring, output rendering, stdout routing, exit codes, next-step help, and the bare-invocation home view.

Both surfaces cover the same three capabilities — **parse** (project a `.feature` into a compact scenario/tag/count digest), **validate** (report Gherkin well-formedness, gated by exit code at the CLI), and **diff** (classify scenario-level changes against a git ref as `added`/`modified`/`removed`/`unchanged`, with an `addOnly` aggregate).

The CLI emits the **AXI output contract** (`axi/`): TOON by default, minimal default schema, pre-computed aggregates, definitive empty states, structured errors, and clean stream discipline (the result, its errors, its hints, and its empty states all on stdout; stderr carries only the top-level uncaught-exception fallback).

## Nodes

- [`api/`](api/README.md) — the programmatic library surface: the parse/validate/diff engines and the export/firewall contract.
  - [`api/surface/`](api/surface/README.md) — behavioral: the barrel's export contract and the CLI-layer firewall.
  - [`api/parse/`](api/parse/README.md) — behavioral: the `parse` / `parseAst` projection engine.
  - [`api/validate/`](api/validate/README.md) — behavioral: the `validate` well-formedness engine.
  - [`api/diff/`](api/diff/README.md) — behavioral: the `diff` change-classification engine.
- [`cli/`](cli/README.md) — the command surface that consumes the API barrel.
  - [`cli/parse/`](cli/parse/README.md) — behavioral: the `parse` command.
  - [`cli/validate/`](cli/validate/README.md) — behavioral: the `validate` command.
  - [`cli/diff/`](cli/diff/README.md) — behavioral: the `diff` command.
  - [`cli/home/`](cli/home/README.md) — behavioral: the bare-invocation inventory view.
  - [`cli/usage/`](cli/usage/README.md) — behavioral: cross-command routing (stdout discipline, exit codes, unknown-flag `EBADFLAG`).
- [`axi/`](axi/README.md) — reference: the shared output contract the CLI follows.

## Invariants

- The parser is `@cucumber/gherkin` (the canonical implementation); the tool never hand-rolls Gherkin tokenization.
- Output is deterministic: stable id generation, files in input order, scenarios in document order.
- Scenario identity for `diff` is the scenario **name** within its feature; a rename reads as add + remove.
- The library barrel (`src/index.ts`) exposes only pure engines — the render/stream layer is CLI-only and structurally unreachable from the library.
- SDD doctrine lints (adverb/rubric-noun bans, `@frozen`/`@rubric` semantics) are **not** this tool's concern — consumers apply those over the emitted manifest.
