---
status: draft
project-path: packages/gherkin-cli
---

# gherkin-cli — project spec

An agent-first Gherkin CLI: parse, validate, and diff `.feature` files with token-efficient, AXI-conformant output. Wraps the canonical `@cucumber/gherkin` parser and exposes a small, deterministic command surface built for AI-agent consumption.

## Charter

`gherkin-cli` provides three commands over Gherkin `.feature` files:

- **`parse`** — project a `.feature` into a compact scenario/tag/count digest.
- **`validate`** — report Gherkin well-formedness with a gating exit code.
- **`diff`** — classify scenario-level changes against a git ref (`added`/`modified`/`removed`/`unchanged`), with an `addOnly` aggregate.

Every command emits the **AXI output contract** (`axi/`): TOON by default, minimal default schema, pre-computed aggregates, definitive empty states, structured errors, and clean stream discipline (result on stdout, affordances on stderr).

## Nodes

- [`parse/`](parse/README.md) — behavioral: the projection command.
- [`validate/`](validate/README.md) — behavioral: the well-formedness command.
- [`diff/`](diff/README.md) — behavioral: the scenario change-classification command.
- [`axi/`](axi/README.md) — reference: the shared output contract every command follows.

## Invariants

- The parser is `@cucumber/gherkin` (the canonical implementation); the CLI never hand-rolls Gherkin tokenization.
- Output is deterministic: stable id generation, files in input order, scenarios in document order.
- Scenario identity for `diff` is the scenario **name** within its feature; a rename reads as add + remove.
- SDD doctrine lints (adverb/rubric-noun bans, `@frozen`/`@rubric` semantics) are **not** this tool's concern — consumers apply those over the emitted manifest.
