---
'gherkin-cli': minor
---

Route agent-facing output through stdout per AXI.

Errors, next-step hints, and empty-state lines previously went to stderr, where
agents do not read them — an agent hitting a missing file or a bad flag saw an
empty stdout and could read it as success. All three now go to stdout: errors as
a structured `error:`/`code:`/`message:` block, suggestions as a TOON `help[n]:`
block, and empty results as a definitive line stating the zero with context.

- Usage errors (unknown flag, missing required flag) now exit `2` instead of `1`;
  genuine failures still exit `1`.
- Unknown-flag errors strip commander's own prefix and inline the command's valid
  flags, so the correction takes one turn instead of a follow-up `--help`.
- A bare `gherkin-cli` invocation now prints the `.feature` inventory for the
  current directory — bin path, description, count, and per-file scenario counts
  — instead of writing a usage manual to stderr.
