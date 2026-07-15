# gherkin-cli

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
