---
spec-type: reference
concept: [axi]
---

# axi — the Agent Experience Interface output contract

A **reference artifact**: the shared output contract every `gherkin-cli` command follows so an AI agent spends the fewest tokens per interaction. It adopts [AXI](https://github.com/kunchenguid/axi) (Agent Experience Interface) — a design framework that treats the agent's token budget as a first-class constraint. `gherkin-cli` is consumed almost entirely by AI agents, so its output is agent-first by default (TOON), never human-prose-first.

> This is the **same** contract `cyberplace` and `universal-plugin` adopted, so an agent moving between these tools sees one interface. See `design/decisions/0001-adopt-axi.md`.

## Subject

- **Artifact** — the AXI output contract, realized as shared conventions in the `gherkin-cli` bin (`packages/gherkin-cli/src/output.ts` + `cli.ts`). Not a separate shipped file.
- **Scope of adoption** — AXI principles **#1–#6 and #8–#10**. Principle **#7** (ambient context: session-hook setup + an installable Agent Skill) is **out of scope**; `gherkin-cli` is a leaf CLI with no session-context surface.
- **Conformance** — verified by the consumer suites of the three behavioral nodes ([`parse/`](../parse/README.md), [`validate/`](../validate/README.md), [`diff/`](../diff/README.md)), which reference this contract and carry the scenarios that exercise it.

### The contract surface

1. **Token-efficient output (#1)** — every command emits [TOON](https://toonformat.dev/) by default; `--format json` is the explicit escape. Free-form prose is never the default for a structured result.
2. **Minimal default schema (#2)** — a scenario row carries `name, keyword, tags` (3 fields), not full step detail. Detail is reached with `--full`.
3. **Truncation + `--full` (#3)** — a large rendered result is truncated with a size hint (`… +N lines — rerun with --full`) unless `--full`; `--format json` is never truncated.
4. **Pre-computed aggregates (#4)** — every result carries a `summary` of counts inside the payload (`parse` → files/scenarios; `validate` → files/errors; `diff` → added/modified/removed/unchanged + `addOnly`), so no follow-up round trip is needed.
5. **Definitive empty states (#5)** — an empty result states so explicitly (`0 scenarios across 0 files`, `0 errors`, `0 changes (all unchanged)`) with exit 0; never blank output.
6. **Structured errors, exit codes, no prompts, fail-loud (#6)** — errors are structured (stable `code` + message, honoring `--format`); exit `0` = success, `1` = failure; commands never prompt; an unknown flag fails loud (exit 1, naming the flag).
7. *(#7 ambient context — out of scope; leaf CLI.)*
8. **Content-first (#8)** — bare `gherkin-cli` is a pure dispatcher and shows help (no single live view to surface).
9. **Next-step suggestions (#9)** — every command ends with a next-step line on stderr naming the natural follow-up.
10. **Consistent help (#10)** — every subcommand answers `--help` with a synopsis, its flags, and one example.

### Stream discipline

- **stdout** carries the machine result only — the TOON (or `--format json`) payload including its aggregate `summary`. So `--format json | jq` and TOON parsing stay clean.
- **stderr** carries the human affordances — the next-step line (#9), warnings, and structured errors (#6). Discarding stderr never corrupts the parsed result.
