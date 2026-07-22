---
spec-type: behavioral
concept: [diff-command]
---

# diff — the change-classification command

`gherkin-cli diff <files…> --base <ref>` wires the `diff` engine to the command surface: `--base` is a required option, `--full` also lists the unchanged scenarios (the default projection shows only what moved), the result plus its `summary` render to stdout, and a zero-change run states so explicitly. When the engine throws `GitError` for an unresolvable ref, the command catches it and renders a structured `EGIT` error on stdout, exit 1.

## Use Cases

- A consumer must know whether a suite change is purely additive → the rendered `addOnly` aggregate.
- A reviewer wants the per-scenario change set → the classified list on stdout; `--full` to include unchanged.
- An unresolvable base ref must fail loud → structured `EGIT` on stdout, exit 1.

## Contract

- `--base <ref>` is required; `--full` also lists unchanged scenarios.
- The result plus its `summary` render to **stdout** in the requested format.
- A zero-change run prints an explicit `changes: 0 …` line, a `gherkin-cli parse <file>` next-step hint, and exits 0.
- An unresolvable base ref — the engine's thrown `GitError` — is caught and rendered as a structured `EGIT` error on **stdout** (not stderr), exit 1.
- A changed run ends with next-step help on stdout (`gherkin-cli parse <file> --full`, and `gherkin-cli diff --base <ref> <file> --full` when not already full).
