---
name: gherkin-cli
status: active
todos:
  - content: "Scaffold monorepo (pnpm+turbo+biome+changesets), package gherkin-cli, tsdown build"
    status: completed
  - content: "Author SDD spec: parse/validate/diff behavioral nodes + axi reference node + .feature suites; ADR 0001-adopt-axi"
    status: completed
  - content: "Implement src/: output.ts (AXI) + parse/validate/diff engines + cli.ts + index.ts + vitest tests"
    status: in_progress
  - content: "Build + verify (run CLI on real .feature), reconcile tests vs .feature, commit"
    status: completed
---

# gherkin-cli — build mission

New cyberuni repo: an agent-first Gherkin CLI (parse/validate/diff) wrapping `@cucumber/gherkin` v41, AXI-conformant output. Consumed by SDD's suite engines (the cyberplace `suite-token-opt` CR repoints to it via pinned npx). Contract: `gherkin-cli.design.md` (sibling).

## DONE (commit 37abb4c, branch main, not pushed)
v1 built + verified: 3 commands, 22 tests, `pnpm verify` green, biome clean, driven end-to-end on a real .feature + real git diff. SDD spec authored (parse/validate/diff behavioral nodes + axi reference + ADR-0001).

## NEXT (follow-ups, not started)
- Publish to npm (`gherkin-cli` name is free) so consumers can `npx gherkin-cli@<ver>`.
- Back in cyberplace: the `suite-token-opt` CR (CR-B) repoints SDD's suite engines to this CLI via pinned npx + adds the compose/additive/manifest consumption.
- v2: `pickles` (outline expansion), optional MCP surface.
