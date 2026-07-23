# gherkin-cli

## 0.2.0

### Minor Changes

- 5445c7c: Formalize the programmatic API. The `.` entrypoint (`import { … } from 'gherkin-cli'`) is now a documented library surface exposing the pure engines — `parse`, `parseAst` (newly exported), `validate`, `diff`, `GitError` — and their types. The render/stream layer stays CLI-only, so importing gherkin-cli runs no CLI side effect. The CLI now consumes this same API barrel.

  Add a dependency-injection seam for easy testing, passed as a separate 3rd `deps` argument — a narrow role interface (ISP), not an option. `parse`, `parseAst`, and `validate` take a `ReadsFile` (default `nodeReadsFile`); `diff` takes a `ReadsGitDiff` (default `gitReadsDiff`). Each engine receives only the seam it uses, so they can be driven from in-memory fixtures with no filesystem or git access. The `ReadsFile` and `ReadsGitDiff` role interfaces and both node defaults (`nodeReadsFile`, `gitReadsDiff`) are exported. No CLI behavior or output routing changes.

- 28b08ea: `diff` now omits `unchanged` scenarios by default; `--full` includes them.

  The `--full` flag was documented as "include unchanged scenarios in full detail" but was never wired to `diff()` — `diff` always returned every scenario, and the flag only bypassed output truncation. The flag now does what its help says.

  **Breaking (0.x minor):** the default `files[].scenarios` list is now changed-only. A consumer that reads the `unchanged` entries must pass `--full` (CLI) or `{ full: true }` (`diff`). Consumers that read `summary` (including `summary.unchanged`), `addOnly`, or only the `added` / `modified` / `removed` entries need no change — the classification still covers the whole file and every aggregate is computed before the projection.

### Patch Changes

- f342888: Collapse the file list in next-step help blocks to a `<files...>` placeholder for batch runs. `parse`, `validate`, and `diff` echoed every input path — twice — so a 26-file run spent ~6.2KB of stdout on the affordance meant to save tokens (AXI #9). A single-file run still names the real path.

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
