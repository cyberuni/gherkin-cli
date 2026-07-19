# gherkin-cli

## 0.1.0

### Minor Changes

- 96f46f0: Route agent-facing output through stdout per AXI.

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

## 0.0.2

### Patch Changes

- a329341: Hash step arguments (DocString, DataTable) into a scenario's diff signature.

  `diff` hashed step keyword + text only, so a step's DocString or DataTable could be rewritten while
  the scenario still reported `unchanged` / `addOnly: true`. A Gherkin `@rubric` lives wholly inside a
  DocString, so a frozen rubric could be renamed and its `threshold: 3` moved to `threshold: 0` — every
  subject then passing — with the diff reporting no change at all.

  Only argument _content_ is hashed. Locations are excluded (moving a scenario down the file is not a
  change), as is the DocString delimiter. The parser strips a DocString's common indentation, so
  re-indenting a block is not a change either.
