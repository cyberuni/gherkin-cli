---
'gherkin-cli': minor
---

`diff` now omits `unchanged` scenarios by default; `--full` includes them.

The `--full` flag was documented as "include unchanged scenarios in full detail" but was never wired to `diff()` — `diff` always returned every scenario, and the flag only bypassed output truncation. The flag now does what its help says.

**Breaking (0.x minor):** the default `files[].scenarios` list is now changed-only. A consumer that reads the `unchanged` entries must pass `--full` (CLI) or `{ full: true }` (`diff`). Consumers that read `summary` (including `summary.unchanged`), `addOnly`, or only the `added` / `modified` / `removed` entries need no change — the classification still covers the whole file and every aggregate is computed before the projection.
