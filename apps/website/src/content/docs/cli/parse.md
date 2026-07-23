---
title: parse
description: Project .feature files into a compact scenario/tag/count digest.
---

`parse <files…>` reads one or more `.feature` files and emits a compact manifest an agent can
reason over cheaply: per file the feature tags, scenario count, and section-comment count; per
scenario the name, keyword, and tags. Detail (step text, step/example counts) is opt-in via
`--full`.

```bash
gherkin-cli parse features/login.feature --tag @smoke
```

## Flags

| Flag             | Description                                                 |
| ---------------- | ------------------------------------------------------------ |
| `--full`         | Include `stepCount`, `exampleRows`, and `steps` per scenario. |
| `--tag <name>`   | Keep only scenarios carrying this tag.                        |
| `--ast`          | Dump the raw cucumber `GherkinDocument` JSON (ignores projection). |
| `--format <fmt>` | Output format: `toon` (default) or `json`.                    |

## Behavior

- Default projection carries `name, keyword, tags` per scenario — a minimal schema so an agent
  spends few tokens on a suite it only needs to enumerate.
- A file that fails to parse yields an `error {code, line, message}` entry and does **not** fail
  the run — the batch still succeeds (exit `0`). A missing file fails loud (`ENOENT`, exit `1`).
- The result carries a `summary` aggregate (files, scenarios) so no follow-up call is needed to
  count.

## See also

- [validate](/gherkin-cli/cli/validate/) — check well-formedness with a gating exit code.
- [diff](/gherkin-cli/cli/diff/) — classify scenario changes against a git ref.
- [parse](/gherkin-cli/api/parse/) — the same projection as an imported function.
- [AXI output contract](/gherkin-cli/concepts/axi/) — the shared conventions behind this output.
