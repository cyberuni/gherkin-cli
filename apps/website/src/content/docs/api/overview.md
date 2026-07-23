---
title: Programmatic API
description: Import the pure parse/validate/diff engines directly, with no CLI side effect.
---

Import the engines and call them directly in your own code:

```ts
import { parse, validate, diff } from 'gherkin-cli'
```

Each reads `.feature` source and returns a plain structured result with a pre-computed `summary`
you can act on without a second pass. They write to no stream and never exit the process, so you
can call them anywhere — inside a build tool, a test, an editor plugin — without touching your
stdout or killing your process.

## Determinism

- Files are returned in **input order**; scenarios in **document order**.
- Ids come from a deterministic incrementing generator, so repeat runs over the same input return
  byte-identical structures.
- No engine mutates its inputs or reaches for ambient state beyond the filesystem (and git, for
  [`diff`](/gherkin-cli/api/diff/), through an injectable reader).

## The engines

- [`parse`](/gherkin-cli/api/parse/) — project a suite into a compact scenario/tag/count digest.
- [`validate`](/gherkin-cli/api/validate/) — check `.feature` well-formedness.
- [`diff`](/gherkin-cli/api/diff/) — classify scenario changes against a git base.

## See also

- [CLI Reference](/gherkin-cli/cli/parse/) — the same three capabilities as a command you run.
- [AXI output contract](/gherkin-cli/concepts/axi/) — the conventions the CLI layer renders these
  results through.
