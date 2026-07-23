---
title: AXI output contract
description: The agent-facing output contract every gherkin-cli command follows.
---

`gherkin-cli` is consumed almost entirely by AI agents, so its output is agent-first by default —
never human-prose-first. It adopts [AXI](https://github.com/kunchenguid/axi) (Agent Experience
Interface), a design framework that treats the agent's token budget as a first-class constraint.

`gherkin-cli` adopts AXI principles **#1–#6 and #8–#10**. Principle **#7** (ambient context: a
session hook and an installable Agent Skill) is out of scope — `gherkin-cli` is a leaf CLI with no
session-context surface.

## The contract surface

1. **Token-efficient output** — every command emits [TOON](/gherkin-cli/concepts/toon/) by
   default; `--format json` is the explicit escape. Free-form prose is never the default for a
   structured result.
2. **Minimal default schema** — a scenario row carries `name, keyword, tags` (three fields), not
   full step detail. Detail is reached with `--full`.
3. **Truncation + `--full`** — a large rendered result is truncated with a size hint
   (`… +N lines — rerun with --full`) unless `--full` is passed; `--format json` is never
   truncated.
4. **Pre-computed aggregates** — every result carries a `summary` of counts inside the payload:
   [`parse`](/gherkin-cli/cli/parse/) → files/scenarios, [`validate`](/gherkin-cli/cli/validate/)
   → files/errors, [`diff`](/gherkin-cli/cli/diff/) → added/modified/removed/unchanged +
   `addOnly`. No follow-up round trip is needed to get a count.
5. **Definitive empty states** — an empty result states so explicitly (`0 scenarios across 0
   files`, `0 errors`, `0 changes (all unchanged)`) with exit `0`; never blank output.
6. **Structured errors, exit codes, no prompts, fail-loud** — errors are structured (a stable
   `code` plus message, honoring `--format`); exit `0` means success, `1` means failure; commands
   never prompt; an unknown flag fails loud (exit `2`, naming the valid flags).
7. *(#7, ambient context — out of scope; leaf CLI.)*
8. **Content-first** — bare `gherkin-cli` is not a usage manual: it prints the live `.feature`
   inventory of the current directory.
9. **Next-step suggestions** — every command ends with a next-step line naming the natural
   follow-up (e.g. `parse` suggests `diff --base <ref>` on the same files).
10. **Consistent help** — every subcommand answers `--help` with a synopsis, its flags, and one
    example.

## Stream discipline

Every command writes its full output — the result payload, structured errors, and next-step
hints — to **stdout**. **stderr** carries only low-level diagnostics that are never load-bearing;
discarding it entirely loses no part of the answer. A command either succeeds and writes its
payload, or fails and writes its structured error — never both — so a caller branches on the exit
code before parsing.

## See also

- [TOON format](/gherkin-cli/concepts/toon/) — the compact default output encoding.
- [CLI Reference](/gherkin-cli/cli/parse/) — the concrete commands this contract governs.
