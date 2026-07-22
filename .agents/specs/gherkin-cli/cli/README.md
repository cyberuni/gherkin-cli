# cli — the command surface

`src/cli.ts` is the `gherkin-cli` bin: a commander program that is a **client** of the API barrel (`import { parse, ... } from './index.js'`). The engines do the reasoning; the CLI adds everything the library omits — flag→option wiring, output rendering, stdout routing, exit codes, next-step help, and the bare-invocation home view.

Every command routes its output through the **AXI output contract** ([`axi/`](../axi/README.md)): TOON by default (`--format json` the escape), a pre-computed `summary` in the payload, definitive empty-state lines, structured errors with stable codes, next-step hints, and consistent `--help`. The stream discipline is the load-bearing rule: the machine result, its errors, its hints, and its empty states **all** go to stdout; stderr carries only the top-level uncaught-exception fallback.

## Nodes

- [`parse/`](parse/README.md) — the `parse` command: `--full`, `--tag`, `--ast`, `--format`; renders the projection, routes ENOENT to stdout, ends with next-step help.
- [`validate/`](validate/README.md) — the `validate` command: renders the report and applies the exit-1 gate on any syntax error.
- [`diff/`](diff/README.md) — the `diff` command: required `--base`, catches `GitError` into a structured `EGIT` error on stdout.
- [`home/`](home/README.md) — the bare-invocation `.feature` inventory view for the current directory.
- [`usage/`](usage/README.md) — cross-command routing: stdout discipline, exit codes, and the unknown-flag `EBADFLAG` error.
