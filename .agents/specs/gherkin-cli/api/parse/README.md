---
spec-type: behavioral
concept: [parsing]
---

# parse — the projection engine

`parseFeatures(paths, {full?, tag?})` reads one or more `.feature` files and returns a compact `ParseResult` a consumer can reason over cheaply: per file the feature tags, scenario count, and section-comment count; per scenario the name, keyword, and tags. Detail (step text, step/example counts) is opt-in via `{full: true}`. `parseFeaturesAst(paths)` returns the raw cucumber `GherkinDocument` per file. Both are pure — a missing or malformed file becomes an `error` entry rather than throwing, so the batch always returns.

## Use Cases

- A consumer needs scenario names + tags of a suite without full step text → the default projection.
- A consumer needs full step detail for a lint pass → `{full: true}`.
- A consumer wants only scenarios carrying one tag → `{tag}`.
- A tool wants the raw AST → `parseFeaturesAst`.
- A malformed or missing file among many must not abort the batch → the bad file yields an `error` entry; the others still return.

## Contract

- Default projection carries `name, keyword, tags` per scenario; the file entry carries `featureTags` and `scenarioCount`; no step detail.
- `{full: true}` adds `stepCount`, ordered `steps`, and `exampleRows`.
- `{tag}` keeps only scenarios carrying that tag (with or without the leading `@`).
- `parseFeaturesAst` returns the raw `GherkinDocument` per file.
- The result carries a pre-computed `summary {files, scenarios, errors}`.
- A malformed file yields an `error {code: 'EPARSE', line, message}` on that file entry; the engine does not throw.
- A missing file yields an `error {code: 'ENOENT', ...}` on that file entry; the engine does not throw or exit — the CLI decides what to do.
