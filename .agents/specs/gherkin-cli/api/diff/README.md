---
spec-type: behavioral
concept: [diffing]
---

# diff — the change-classification engine

`diff(paths, {base, full?}, deps?)` compares each `.feature` file's working-tree text against its text at `base` and classifies every scenario as `added`, `modified`, `removed`, or `unchanged`. Each file carries an `addOnly` flag and the result carries a `summary {added, modified, removed, unchanged, files, addOnly}` — `addOnly` is `true` when only new scenarios were introduced and no existing one was touched. This is the primitive an additive-only detector needs. A genuine git/ref failure throws `GitError`; the engine itself never prints or exits.

## Use Cases

- A consumer must know whether a suite change is purely additive → the `addOnly` aggregate.
- A reviewer wants the per-scenario change set → the classified scenario list.
- A brand-new file (absent at base) is entirely additive → all `added`, `addOnly: true`.
- A test wants to classify without touching git → inject a `ReadsGitDiff`.

## Contract

- Scenario identity is the scenario **name** within its feature; a rename reads as add + remove.
- `modified` = same name, but steps, tags, or examples differ.
- Base text is read through an injectable `ReadsGitDiff` — a separate 3rd `deps` argument (default `gitReadsDiff`, which reads working-tree text from fs and base text from `git show <ref>:<path>`), not an option. Pass a fake `deps` (`{ readDiff }`) to classify with no git.
- The result carries a pre-computed `summary {added, modified, removed, unchanged, files, addOnly}`; per file an `addOnly` flag.
- A file absent at base → every scenario `added`, `addOnly: true`.
- An unresolvable base ref throws `GitError`; the engine does not print or exit — the CLI catches it.
