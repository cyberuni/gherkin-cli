---
title: diff
description: Classify scenario changes against a git ref.
---

`diff <files…> --base <gitref>` compares each `.feature` file's working-tree text against its text
at `--base` and classifies every scenario as `added`, `modified`, `removed`, or `unchanged`. It
carries an `addOnly` aggregate — `true` when the change introduces only new scenarios and touches
no existing one. This is the primitive an additive-only detector needs: `addOnly: true` means a
purely additive change; any `modified`/`removed` means an existing scenario was touched.

```bash
gherkin-cli diff features/login.feature --base HEAD~1
```

## Flags

| Flag             | Description                                          |
| ---------------- | ----------------------------------------------------- |
| `--base <ref>`   | Base git ref to compare against (required).            |
| `--full`         | Include unchanged scenarios in full detail.            |
| `--format <fmt>` | Output format: `toon` (default) or `json`.             |

## Behavior

- Scenario identity is the scenario **name** within its feature — a rename reads as add + remove.
- `modified` means same name, but steps, tags, or examples differ.
- Base text is read via git (`git show <ref>:<path>`); a git/ref failure fails loud (`EGIT`,
  exit `1`).
- A brand-new file (absent at base) is entirely additive: every scenario is `added`, and
  `addOnly` is `true`.
- Aggregate `summary {added, modified, removed, unchanged, files, addOnly}`; each file also
  carries its own `addOnly`.

## See also

- [parse](/gherkin-cli/cli/parse/) — project a suite into a compact digest.
- [validate](/gherkin-cli/cli/validate/) — check well-formedness with a gating exit code.
- [AXI output contract](/gherkin-cli/concepts/axi/) — the shared conventions behind this output.
