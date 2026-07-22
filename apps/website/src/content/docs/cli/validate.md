---
title: validate
description: Check .feature well-formedness with a gating exit code.
---

`validate <files…>` reports whether each `.feature` is well-formed Gherkin and gates on the
result: exit `0` when every file parses, exit `1` when any fails. Each failure carries a line
number, message, and stable code. This is the CI/gate verb, distinct from
[`parse`](/gherkin-cli/cli/parse/) (which tolerates malformed files as error entries and still
exits `0`).

```bash
gherkin-cli validate features/login.feature
```

## Flags

| Flag             | Description                                 |
| ---------------- | -------------------------------------------- |
| `--format <fmt>` | Output format: `toon` (default) or `json`.   |

## Behavior

- Per file: `ok` plus an `errors` list of `{line, message, code}`.
- Aggregate `summary {files, errors}`.
- Exit `0` iff all files are valid; `1` otherwise.
- An empty result states itself explicitly (`0 syntax errors across N file(s)`) rather than
  emitting a blank success.

## See also

- [parse](/gherkin-cli/cli/parse/) — project a suite into a compact digest.
- [diff](/gherkin-cli/cli/diff/) — classify scenario changes against a git ref.
- [validate](/gherkin-cli/api/validate/) — the same check as an imported function.
- [AXI output contract](/gherkin-cli/concepts/axi/) — the shared conventions behind this output.
