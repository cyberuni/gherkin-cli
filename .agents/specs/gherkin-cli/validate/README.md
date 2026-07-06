---
spec-type: behavioral
concept: [validation]
---

# validate — check .feature well-formedness

`validate <files…>` reports whether each `.feature` is well-formed Gherkin and gates on the result: exit `0` when every file parses, exit `1` when any fails. Each failure carries a line number, message, and stable code. This is the CI/gate verb, distinct from `parse` (which tolerates malformed files as error entries).

## Use Cases

- CI wants to reject a malformed suite → `validate` exits 1 on any syntax error.
- An author wants the exact location of a Gherkin error → per-error `line` + message.
- A batch of valid files should pass cleanly → exit 0 with an explicit `0 errors` summary.

## Contract

- Per file: `ok` plus an `errors` list of `{line, message, code}`.
- Aggregate `summary {files, errors}`.
- Exit `0` iff all files are valid; `1` otherwise.
- Honors `--format toon|json`; result on stdout, structured errors respect the format.
