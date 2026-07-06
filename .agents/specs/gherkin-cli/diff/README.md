---
spec-type: behavioral
concept: [diffing]
---

# diff — classify scenario changes against a git ref

`diff <files…> --base <gitref>` compares each `.feature` file's working-tree text against its text at `--base` and classifies every scenario as `added`, `modified`, `removed`, or `unchanged`. It carries an `addOnly` aggregate — `true` when the change introduces only new scenarios and touches no existing one. This is the primitive an additive-only detector needs: `addOnly: true` means a purely additive change; any `modified`/`removed` means an existing scenario was touched.

## Use Cases

- A consumer must know whether a suite change is purely additive → `addOnly`.
- A reviewer wants the per-scenario change set → the classified list.
- A brand-new file (absent at base) is entirely additive → all `added`, `addOnly: true`.

## Contract

- Scenario identity is the scenario **name** within its feature; a rename reads as add + remove.
- `modified` = same name, but steps, tags, or examples differ.
- Base text is read via git (`git show <ref>:<path>`); a git/ref failure fails loud (`EGIT`, exit 1).
- Aggregate `summary {added, modified, removed, unchanged, files, addOnly}`; per-file `addOnly`.
- Honors `--format toon|json`; result on stdout.
