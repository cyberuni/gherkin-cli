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

## Testing without disk or git

Every engine takes an **injectable reader** so you can drive it from in-memory fixtures with no
filesystem or git access — the same dependency-injection seam that makes the engines easy to test:

```ts
import { parseFeatures, validateFeatures, diffFeatures } from 'gherkin-cli'

const files = { 'login.feature': 'Feature: Login\n  Scenario: ok\n    Given a\n    Then b\n' }

// parseFeatures / validateFeatures take a FileReader (default: nodeFileReader)
parseFeatures(['login.feature'], { reader: (path) => files[path] })
validateFeatures(['login.feature'], { reader: (path) => files[path] })

// diffFeatures takes a DiffReader (default: gitReader) returning head + base text
diffFeatures(['login.feature'], {
	base: 'HEAD~1',
	reader: () => ({ head: files['login.feature'], base: 'Feature: Login\n' }),
})
```

The node defaults — `nodeFileReader` and `gitReader` — are exported too, so you can wrap rather
than replace them.

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
