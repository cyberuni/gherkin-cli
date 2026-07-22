---
title: Programmatic API
description: Import the pure parse/validate/diff engines directly, with no CLI side effect.
---

The `.` barrel is the entrypoint a programmatic consumer imports. It exposes **only** the pure
engines and their types:

```ts
import { parse, parseAst, validate, diff } from 'gherkin-cli'
```

Each engine reads `.feature` source and returns a structured result carrying a pre-computed
`summary`; where failure is not per-file recoverable, it throws a typed error. The library is a
value-returning, exception-throwing surface: it writes to **no** stream and never calls
`process.exit`. Importing `gherkin-cli` runs no CLI side effect — no stdout write, no argv parse,
no exit.

## Testing without disk or git

Every engine takes an **injectable reader** as a separate 3rd `deps` argument (a narrow role
interface, not an option) so you can drive it from in-memory fixtures with no filesystem or git
access — the same dependency-injection seam that makes the engines easy to test:

```ts
import { parse, validate, diff } from 'gherkin-cli'

const files = { 'login.feature': 'Feature: Login\n  Scenario: ok\n    Given a\n    Then b\n' }

// parse / validate take a ReadsFile (default: nodeReadsFile) as the 3rd deps arg
parse(['login.feature'], {}, { readFile: (path) => files[path] })
validate(['login.feature'], {}, { readFile: (path) => files[path] })

// diff takes a ReadsGitDiff (default: gitReadsDiff) returning head + base text
diff(['login.feature'], { base: 'HEAD~1' }, {
	readDiff: () => ({ head: files['login.feature'], base: 'Feature: Login\n' }),
})
```

The node defaults — `nodeReadsFile` and `gitReadsDiff` — are exported too, so you can wrap rather
than replace them.

## Determinism

- Files are returned in **input order**; scenarios in **document order**.
- Ids come from a deterministic incrementing generator, so repeat runs over the same input return
  byte-identical structures.
- No engine mutates its inputs or reaches for ambient state beyond the filesystem (and git, for
  [`diff`](/gherkin-cli/api/diff/), through an injectable reader).

## The engines

- [`parse`](/gherkin-cli/api/parse/) — project a suite into a compact scenario/tag/count digest.
- [`parseAst`](/gherkin-cli/api/parse/#parseast) — the raw cucumber `GherkinDocument` per file, for
  when the projection isn't enough.
- [`validate`](/gherkin-cli/api/validate/) — check `.feature` well-formedness.
- [`diff`](/gherkin-cli/api/diff/) — classify scenario changes against a git base.

## See also

- [CLI Reference](/gherkin-cli/cli/parse/) — the same three capabilities as a command you run.
- [AXI output contract](/gherkin-cli/concepts/axi/) — the conventions the CLI layer renders these
  results through.
