---
title: Programmatic API
description: Import the pure parse/validate/diff engines directly, with no CLI side effect.
---

The `.` barrel is the entrypoint a programmatic consumer imports. It exposes **only** the pure
engines and their types:

```ts
import { parseFeatures, parseFeaturesAst, validateFeatures, diffFeatures, GitError } from 'gherkin-cli'
```

Each engine reads `.feature` source and returns a structured result carrying a pre-computed
`summary`; where failure is not per-file recoverable, it throws a typed error. The library is a
value-returning, exception-throwing surface: it writes to **no** stream and never calls
`process.exit`. Importing `gherkin-cli` runs no CLI side effect — no stdout write, no argv parse,
no exit.

## The firewall

The render/format/stream layer (`output.ts`) and the command program (`cli.ts`) are deliberately
**not** re-exported. Keeping them out of this barrel is what makes the CLI surface structurally
unreachable from the library: no library consumer can trigger a stream write or an exit. The API
is a supported contract, not an incidental re-export.

## Determinism

- Files are returned in **input order**; scenarios in **document order**.
- Ids come from a deterministic incrementing generator, so repeat runs over the same input return
  byte-identical structures.
- No engine mutates its inputs or reaches for ambient state beyond the filesystem (and git, for
  [`diffFeatures`](/gherkin-cli/api/diff/), through an injectable reader).

## The engines

- [`parseFeatures`](/gherkin-cli/api/parse/) — project a suite into a compact digest (plus
  `parseFeaturesAst` for the raw AST).
- [`validateFeatures`](/gherkin-cli/api/validate/) — check `.feature` well-formedness.
- [`diffFeatures`](/gherkin-cli/api/diff/) — classify scenario changes against a git base.

## See also

- [CLI Reference](/gherkin-cli/cli/parse/) — the same three capabilities as a command you run.
- [AXI output contract](/gherkin-cli/concepts/axi/) — the conventions the CLI layer renders these
  results through.
