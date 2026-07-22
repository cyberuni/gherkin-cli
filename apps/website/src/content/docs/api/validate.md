---
title: validateFeatures
description: Check .feature well-formedness as a return value, not an exit code.
---

`validateFeatures(paths: string[], opts?: ValidateOptions): ValidateResult` parses each `.feature` file and returns a
result reporting whether each is well-formed Gherkin. Per file it carries `ok` plus an `errors`
list of `{line, message, code}`; the result carries a `summary {files, errors}`. It is pure: it
returns a value and never exits. The exit-code gate (`1` on any error) is a CLI concern layered on
top — the engine does not gate.

```ts
import { validateFeatures } from 'gherkin-cli'

const result = validateFeatures(['features/login.feature', 'features/checkout.feature'])
if (result.summary.errors > 0) {
	for (const file of result.files.filter((f) => !f.ok)) {
		for (const err of file.errors) {
			console.error(`${file.file}:${err.line} ${err.code} ${err.message}`)
		}
	}
}
```

## Parameters

| Param         | Type            | Description                                                    |
| ------------- | --------------- | -------------------------------------------------------------- |
| `paths`       | `string[]`      | The `.feature` files to validate.                              |
| `opts.reader` | `FileReader`    | Injectable filesystem seam (default `nodeFileReader`) — pass a fake to test without disk. |

## Behavior

- Per file: `ok` plus an `errors` list of `{line, message, code}` — `code` is `EPARSE` for a
  syntax error, `ENOENT` for a missing file.
- A missing file is reported as not `ok` with an `ENOENT` error entry — the engine does not throw.
- A clean run reports every file `ok` and `summary.errors === 0` — a return value, not an exit
  code.
- The engine never exits or gates; the CLI maps any error to exit `1`.
- The result carries a pre-computed `summary {files, errors}`.
- `{ reader }` injects the filesystem seam (a `FileReader`, default `nodeFileReader`), so you can
  validate in-memory text with no disk access. See
  [Testing without disk or git](/gherkin-cli/api/overview/#testing-without-disk-or-git).

## See also

- [validate](/gherkin-cli/cli/validate/) — the same check as a command with a gating exit code.
- [parseFeatures](/gherkin-cli/api/parse/) — project a suite into a compact digest.
- [diffFeatures](/gherkin-cli/api/diff/) — classify scenario changes against a git base.
