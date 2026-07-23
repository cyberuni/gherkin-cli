# api — the programmatic library surface

The `.` barrel (`src/index.ts`) is the entrypoint a programmatic consumer imports:

```ts
import { parse, parseAst, validate, diff, GitError } from 'gherkin-cli'
```

It exposes only the **pure engines** and their types. Each engine reads `.feature` source, returns a structured result carrying a pre-computed `summary`, and — where failure is not per-file recoverable — throws a typed error. The library is a value-returning, exception-throwing surface: it writes to **no** stream and never calls `process.exit`. Importing it runs no CLI side effect (no stdout write, no argv parse, no exit).

The render/format/stream layer (`src/output.ts`) and the command program (`src/cli.ts`) are deliberately **not** re-exported. Keeping them out of this barrel is what makes the CLI surface structurally unreachable from the library — the firewall the [`surface/`](surface/README.md) node pins down.

## Determinism invariants

- Files are returned in input order; scenarios in document order.
- Ids come from a deterministic incrementing generator, so repeat runs over the same input return byte-identical structures.
- No engine mutates its inputs or reaches for ambient state beyond the filesystem and git — both behind injectable seams passed as a separate 3rd `deps` argument (a narrow role interface, not an option): a `ReadsFile` (default `nodeReadsFile`) on `parse` / `parseAst` / `validate`, and a `ReadsGitDiff` (default `gitReadsDiff`) on `diff`, so every engine can be driven from fixtures with no disk or git.

## Nodes

- [`surface/`](surface/README.md) — the export contract: what the barrel exports, what it withholds, and the no-side-effect-on-import guarantee.
- [`parse/`](parse/README.md) — `parse(paths, {full?, tag?})` and `parseAst(paths)`: the projection engine.
- [`validate/`](validate/README.md) — `validate(paths)`: the well-formedness engine.
- [`diff/`](diff/README.md) — `diff(paths, {base, full?}, deps?)`: the change-classification engine (throws `GitError`).
