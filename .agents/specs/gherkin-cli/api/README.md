# api — the programmatic library surface

The `.` barrel (`src/index.ts`) is the entrypoint a programmatic consumer imports:

```ts
import { parseFeatures, parseFeaturesAst, validateFeatures, diffFeatures, GitError } from 'gherkin-cli'
```

It exposes only the **pure engines** and their types. Each engine reads `.feature` source, returns a structured result carrying a pre-computed `summary`, and — where failure is not per-file recoverable — throws a typed error. The library is a value-returning, exception-throwing surface: it writes to **no** stream and never calls `process.exit`. Importing it runs no CLI side effect (no stdout write, no argv parse, no exit).

The render/format/stream layer (`src/output.ts`) and the command program (`src/cli.ts`) are deliberately **not** re-exported. Keeping them out of this barrel is what makes the CLI surface structurally unreachable from the library — the firewall the [`surface/`](surface/README.md) node pins down.

## Determinism invariants

- Files are returned in input order; scenarios in document order.
- Ids come from a deterministic incrementing generator, so repeat runs over the same input return byte-identical structures.
- No engine mutates its inputs or reaches for ambient state beyond the filesystem (and git, for `diff`, through an injectable reader).

## Nodes

- [`surface/`](surface/README.md) — the export contract: what the barrel exports, what it withholds, and the no-side-effect-on-import guarantee.
- [`parse/`](parse/README.md) — `parseFeatures(paths, {full?, tag?})` and `parseFeaturesAst(paths)`: the projection engine.
- [`validate/`](validate/README.md) — `validateFeatures(paths)`: the well-formedness engine.
- [`diff/`](diff/README.md) — `diffFeatures(paths, {base, full?, reader?})`: the change-classification engine (throws `GitError`).
