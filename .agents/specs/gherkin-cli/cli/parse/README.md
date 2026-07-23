---
spec-type: behavioral
concept: [parse-command]
---

# parse — the projection command

`gherkin-cli parse <files…>` wires the `parse` / `parseAst` engine to the command surface: it maps `--full`, `--tag <name>`, and `--ast` onto the engine options, renders the result (plus its `summary`) to stdout in the requested format, decides the exit code, and ends with next-step help. `--ast` bypasses the projection and emits the raw `GherkinDocument` as JSON. Where the engine returns an `ENOENT` error entry, the command turns it into a fail-loud structured error and exit 1.

## Use Cases

- An agent wants the scenario names + tags of a suite → `parse` default projection on stdout.
- An agent wants full step detail → `parse --full`; only the frozen scenarios → `parse --tag @frozen`.
- A tool wants the raw AST → `parse --ast` (raw JSON).
- A missing file must fail loud with a pointer to the discovery command → structured `ENOENT` on stdout, exit 1.

## Contract

- `--full`, `--tag <name>`, and `--ast` map to the engine options; `--ast` emits the raw `GherkinDocument` as JSON.
- `--format toon|json` (default `toon`); the result plus its `summary` are rendered to **stdout**.
- An empty suite prints an explicit `scenarios: 0 …` line on stdout, exit 0.
- A missing file yields a structured `ENOENT` error on **stdout** (not stderr), exit 1, with a next-step hint pointing at the discovery/home command.
- A malformed-but-present file is rendered as an error entry and does not fail the run (exit 0).
- The command ends with next-step help lines on **stdout** (`gherkin-cli diff --base <ref> <file>`, and `gherkin-cli parse <file> --full` when not already full).
