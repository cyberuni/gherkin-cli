---
spec-type: behavioral
concept: [validation]
---

# validate — the well-formedness engine

`validateFeatures(paths)` parses each `.feature` file and returns a `ValidateResult` reporting whether each is well-formed Gherkin. Per file it carries `ok` plus an `errors` list of `{line, message, code}`; the result carries a `summary {files, errors}`. It is pure: it returns a value and never exits — the exit-code gate (`1` on any error) is a CLI concern layered on top.

## Use Cases

- A consumer wants a machine-checkable well-formedness report over a suite → `validateFeatures`.
- A consumer wants the exact location of a Gherkin error → per-error `line` + message.
- A batch of valid files should report a clean, explicit zero-error summary → `summary.errors === 0`.

## Contract

- Per file: `ok` plus an `errors` list of `{line, message, code}` (`code` is `EPARSE` for a syntax error, `ENOENT` for a missing file).
- The result carries a pre-computed `summary {files, errors}`.
- A clean run reports every file `ok` and `summary.errors === 0` — a return value, not an exit code.
- The engine never exits or throws; the CLI maps any error to exit 1.
