---
spec-type: behavioral
concept: [validate-command]
---

# validate — the well-formedness command

`gherkin-cli validate <files…>` renders the `validateFeatures` report to stdout and applies the gate the engine deliberately leaves off: exit `0` when every file is well-formed, exit `1` when any fails. This is the CI/gate verb, distinct from `parse` (which tolerates malformed files as error entries and stays at exit 0).

## Use Cases

- CI wants to reject a malformed suite → `validate` exits 1 on any syntax error.
- An author wants the exact location of a Gherkin error → per-error `line` + message rendered on stdout.
- A clean batch should pass with an explicit zero-error summary and a pointer to `parse` → exit 0.

## Contract

- Renders the `ValidateResult` (per-file `ok` + `errors`, plus `summary`) to **stdout** in the requested format.
- A clean run prints an explicit `errors: 0 …` line, a `gherkin-cli parse <file>` next-step hint, and exits 0.
- Any syntax error renders the errors on stdout, prints a `gherkin-cli parse <file> --ast` next-step hint, and exits **1** (the gate exit code — a CLI concern, not the engine's).
