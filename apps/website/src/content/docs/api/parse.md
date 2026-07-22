---
title: parseFeatures
description: Project .feature files into a compact scenario/tag/count result.
---

`parseFeatures(paths: string[], opts?: ParseOptions): ParseResult` reads one or more `.feature`
files and returns a compact result a consumer can reason over cheaply: per file the feature tags,
scenario count, and section-comment count; per scenario the name, keyword, and tags. Detail (step
text, step/example counts) is opt-in via `{ full: true }`. `parseFeaturesAst(paths: string[],
opts?: ParseOptions): ParseAstFile[]` returns the raw cucumber `GherkinDocument` per file.

```ts
import { parseFeatures } from 'gherkin-cli'

const result = parseFeatures(['features/login.feature'], { full: true })
console.log(result.summary) // { files: 1, scenarios: 3, errors: 0 }
for (const file of result.files) {
	for (const scenario of file.scenarios) {
		console.log(scenario.name, scenario.stepCount)
	}
}
```

## Parameters

| Param        | Type            | Description                                                    |
| ------------ | --------------- | -------------------------------------------------------------- |
| `paths`      | `string[]`      | The `.feature` files to project.                               |
| `opts.full`  | `boolean`       | Add `stepCount`, `exampleRows`, and `steps` per scenario.      |
| `opts.tag`   | `string`        | Keep only scenarios carrying this tag (leading `@` optional).  |
| `opts.reader`| `FileReader`    | Injectable filesystem seam (default `nodeFileReader`) — pass a fake to test without disk. |

## Behavior

- The default projection carries `name, keyword, tags` per scenario; the file entry carries
  `featureTags` and `scenarioCount` — a minimal schema for enumerating a suite cheaply.
- `{ full: true }` adds `stepCount`, `exampleRows`, and the ordered `steps` list per scenario.
- `{ tag }` filters to scenarios carrying that tag; the leading `@` is optional (`@smoke` and
  `smoke` match the same scenarios).
- A malformed file yields an `error {code: 'EPARSE', line, message}` on that file entry — the
  engine does **not** throw, so the rest of the batch still returns.
- A missing file yields an `error {code: 'ENOENT', line, message}` entry — again no throw and no
  exit. The engine returns it; the CLI decides what to do with it.
- The result carries a pre-computed `summary {files, scenarios, errors}`.
- `parseFeaturesAst` returns a `ParseAstFile[]` — each `{file, ast}` holds the raw cucumber
  `GherkinDocument`, or `{file, error}` for a malformed or missing file.
- `{ reader }` injects the filesystem seam (a `FileReader`, default `nodeFileReader`), so you can
  drive `parseFeatures` and `parseFeaturesAst` from in-memory text with no disk access. See
  [Testing without disk or git](/gherkin-cli/api/overview/#testing-without-disk-or-git).

## See also

- [parse](/gherkin-cli/cli/parse/) — the same projection as a command you run.
- [validateFeatures](/gherkin-cli/api/validate/) — check well-formedness.
- [diffFeatures](/gherkin-cli/api/diff/) — classify scenario changes against a git base.
