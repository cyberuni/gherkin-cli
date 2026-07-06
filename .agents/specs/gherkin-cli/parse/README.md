---
spec-type: behavioral
concept: [parsing]
---

# parse — project a .feature into a compact digest

`parse <files…>` reads one or more `.feature` files and emits a compact manifest an agent can reason over cheaply: per file the feature tags, scenario count, and section-comment count; per scenario the name, keyword, and tags. Detail (step text, step/example counts) is opt-in via `--full`.

## Use Cases

- An agent needs the scenario names + tags of a suite without spending tokens on full step text → `parse` default projection.
- An agent needs full step detail for a lint pass → `parse --full`.
- An agent wants only the frozen scenarios → `parse --tag @frozen`.
- A tool wants the raw AST → `parse --ast`.
- A malformed file among many must not abort the batch → the bad file yields an error entry; the run still succeeds.

## Contract

- Default projection carries `name, keyword, tags` per scenario (AXI minimal schema); `--full` adds `stepCount`, `exampleRows`, `steps`.
- `--tag <name>` keeps only scenarios carrying that tag.
- `--ast` dumps the raw cucumber `GherkinDocument`.
- `--format toon|json` (default `toon`); the result plus its `summary` aggregate go to stdout.
- A file that fails to parse yields an `error {code, line, message}` entry and does **not** fail the run (exit 0). A missing file fails loud (`ENOENT`, exit 1).
