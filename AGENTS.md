# AGENTS.md

`gherkin-cli` — an agent-first Gherkin CLI. Parse / validate / diff `.feature` files with AXI-conformant, token-efficient output.

## Scripts

- `pnpm verify` — build + typecheck + test across the workspace (run before committing)
- `pnpm --filter gherkin-cli test` — unit tests for the CLI
- `pnpm --filter gherkin-cli dev -- <args>` — run the CLI from source via tsx

## Layout

- `packages/gherkin-cli/` — the CLI package (bin `gherkin-cli` → `dist/cli.js`, built by tsdown)
  - `src/parse.ts` `src/validate.ts` `src/diff.ts` — the three command engines (pure functions over source text)
  - `src/output.ts` — the shared AXI output layer (TOON rendering, truncation, aggregates, structured errors, next-step lines, stream discipline)
  - `src/cli.ts` — commander wiring (bin entry, shebang)
  - `src/index.ts` — library exports
- `.agents/specs/gherkin-cli/` — the SDD project spec (behavioral nodes + `.feature` suites)
- `.agents/plans/` — mission plan briefs

## Output contract (AXI)

Every command follows the AXI output contract (see `.agents/specs/gherkin-cli/design/decisions/0001-adopt-axi.md`):

- **stdout** carries the machine result only — TOON by default (`--format json` escape), including its aggregate summary.
- **stderr** carries human affordances — the next-step line, warnings, and structured errors.
- Minimal default schema (3–4 fields); full detail behind `--full`. Large output truncates with a size hint unless `--full`. Empty states are explicit. Unknown flags fail loud (exit 1). Never prompt.

## Commit discipline

- One complete, reviewed, coherent, independently revertable change per commit. Conventional Commits.
- Run `pnpm verify` before committing changes to `src/`.

## Language

en-US spelling.
