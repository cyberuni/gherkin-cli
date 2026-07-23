---
spec-type: behavioral
concept: [cli-routing]
---

# usage — cross-command CLI routing and stream discipline

The rules that hold across every subcommand rather than inside one: how unknown flags fail, which stream carries what, and how truncation behaves. This is the observable realization of the AXI output contract ([`axi/`](../axi/README.md)) at the command boundary — the shared discipline `parse`, `validate`, and `diff` all inherit.

## Use Cases

- An agent passes a flag that does not exist → the command fails loud, names the valid flags, and exits with a usage code the agent can branch on.
- An agent parses stdout as TOON or pipes `--format json | jq` → stdout carries the result and nothing that would corrupt a parse.
- An agent needs the complete result → `--format json` is never truncated; a large TOON result is truncated with a hint unless `--full`.

## Contract

- An unknown flag fails loud: a structured `EBADFLAG` error on **stdout** naming the valid flags for that subcommand, exit **2**.
- Exit codes: `0` success, `1` operation failure, `2` usage error (unknown/missing flag).
- Stream discipline: the machine result, structured errors, next-step hints, and empty-state lines **all** go to **stdout**; stderr carries only the top-level uncaught-exception fallback (non-actionable debug).
- `--format json` output is never truncated; a large TOON result is truncated with a `… +N lines — rerun with --full` hint unless `--full`.
