---
cr-ref: api-cli-split
project: gherkin-cli
project-path: packages/gherkin-cli
status: approved
todos:
  - content: "explore: split spec into api/ + cli/ symmetric groups; draft READMEs + feature files"
    status: completed
  - content: "explore: formalize index.ts API barrel (export parseFeaturesAst, firewall doc); rework cli.ts to consume it"
    status: completed
  - content: "spec gate: judge api/ + cli/ suites, freeze, record ledger, set approved"
    status: completed
  - content: "deliver: apply code + add per-frozen-scenario verification tests; verify build/tests"
    status: in_progress
  - content: "impl gate: verify per frozen scenario; set implemented"
    status: pending
  - content: "handoff: PR, changeset, combat log"
    status: pending
---

# CR: split gherkin-cli into a documented programmatic API + CLI surface

Source: bare prompt (no issue). Mirror cyber-mux's "one package, two entrypoints,
firewalled barrel" design.

## Design (settled)

- **API surface** = `src/index.ts` barrel: pure engines + types only
  (`parseFeatures`, `parseFeaturesAst`, `validateFeatures`, `diffFeatures`,
  `GitError`, all their types). Firewall `output.ts` (render/encodeToon/writeResult/fail)
  OUT — CLI-only, structurally unreachable from the library. Add the firewall doc comment.
- **CLI surface** = `src/cli.ts` (bin) — reworked to import engines from `./index.js`
  (the public API) instead of the individual engine modules; keeps `./output.js` direct.
- **Spec split** (symmetric — CLI splits per-command like the API):
  - `.agents/specs/gherkin-cli/api/` — README (export contract) + `parse/ validate/ diff/`
    engine-behavior features (pure results, summaries, error entries; NO stdout/exit codes).
  - `.agents/specs/gherkin-cli/cli/` — README + `parse/ validate/ diff/ home/` command-surface
    features (flag parsing, output routing to stdout, exit codes, help/next-steps, home view).
  - `axi/` reference node stays (shared output contract). Fix stale "affordances on stderr"
    wording → stdout (matches shipped 96f46f0 routing; constraint: errors/hints/empty-states → stdout).
  - Existing flat `parse/ validate/ diff/` nodes are re-homed into `api/` + `cli/` (nothing frozen — free to move).

## Constraints

- Preserve CLI behavior + output routing (stdout for errors/hints/empty-states — commits 283bd6f / 96f46f0).
- Monorepo; changeset required (new public export `parseFeaturesAst` + formalized API ⇒ minor).

## NEXT

Authoring the spec restructure (api/ + cli/ trees) and the index.ts/cli.ts formalization,
then the spec gate.
