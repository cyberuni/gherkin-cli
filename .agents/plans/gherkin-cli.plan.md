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
    status: pending
---

# gherkin-cli — build mission

New cyberuni repo: an agent-first Gherkin CLI (parse/validate/diff) wrapping `@cucumber/gherkin` v41, AXI-conformant output. Consumed by SDD's suite engines (the cyberplace `suite-token-opt` CR repoints to it via pinned npx). Contract: `gherkin-cli.design.md` (sibling).

## NEXT
Spec + implementation delegated in parallel from the design contract. On both returning: reconcile the vitest tests against the frozen `.feature` scenarios, run `pnpm verify`, drive the built bin on a real `.feature`, then commit.
