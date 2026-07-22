---
title: diff
description: Classify scenario changes against a git base, throwing GitError on an unresolvable ref.
---

`diff(paths: string[], opts: DiffOptions, deps?: ReadsGitDiff): DiffResult` compares each `.feature` file's
working-tree text against its text at `opts.base` and classifies every scenario as `added`,
`modified`, `removed`, or `unchanged`. Each file carries an `addOnly` flag and the result carries
a `summary {added, modified, removed, unchanged, files, addOnly}` — `addOnly` is `true` when only
new scenarios were introduced and no existing one was touched. A genuine git/ref failure throws
`GitError`; the engine itself never prints or exits.

```ts
import { diff, GitError } from 'gherkin-cli'

try {
	const result = diff(['features/login.feature'], { base: 'HEAD~1' })
	if (result.summary.addOnly) {
		console.log('purely additive change')
	}
	for (const file of result.files) {
		for (const scenario of file.scenarios) {
			console.log(scenario.change, scenario.name)
		}
	}
} catch (err) {
	if (err instanceof GitError) {
		console.error(`could not resolve base ref: ${err.message}`)
	} else {
		throw err
	}
}
```

## Parameters

| Param            | Type           | Description                                                          |
| ---------------- | -------------- | -------------------------------------------------------------------- |
| `paths`          | `string[]`     | The `.feature` files to classify.                                    |
| `opts.base`      | `string`       | Base git ref to compare against (required).                          |
| `opts.full`      | `boolean`      | Include `unchanged` scenarios in each file's `scenarios` list.       |
| `deps.readDiff`  | `ReadsGitDiff` | Injected reader for working-tree and base text (separate 3rd arg, default reads git).|

## Behavior

- Scenario identity is the scenario **name** within its feature — a rename reads as add + remove.
- `modified` means same name, but steps, tags, or examples differ.
- A file absent at base is entirely additive: every scenario is `added`, and `addOnly` is `true`.
- The default projection lists only the *changed* scenarios; `{ full: true }` restores the
  `unchanged` rows. The classification itself is over the whole file, so `summary.unchanged` and
  both `addOnly` flags are computed before the projection.
- An unresolvable base ref **throws** `GitError` — the engine does not print or exit; the caller
  (or the CLI) catches it.
- The git seam is a separate 3rd `deps` argument — a `ReadsGitDiff` role interface with a
  `readDiff(file, base) => { head?, base? }` method — so the engine is testable without touching
  git. The default `gitReadsDiff` reads working-tree text from the filesystem and base text from
  `git show <ref>:<path>`.

## See also

- [diff](/gherkin-cli/cli/diff/) — the same classification as a command you run.
- [parse](/gherkin-cli/api/parse/) — project a suite into a compact digest.
- [validate](/gherkin-cli/api/validate/) — check well-formedness.
