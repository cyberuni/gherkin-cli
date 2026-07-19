---
title: TOON format
description: The compact, tabular output encoding gherkin-cli emits by default.
---

[TOON](https://toonformat.dev/) is a compact, whitespace-structured text encoding — the default
output format for every `gherkin-cli` command, per the [AXI output
contract](/gherkin-cli/concepts/axi/). It renders the same data as JSON in far fewer tokens by
collapsing arrays of uniform objects into a tabular block instead of repeating each key per row.

## Encoding rules

- **Scalars** render as `key: value`. Strings carrying a comma, colon, whitespace, or bracket are
  quoted; `null`/`undefined` render as `null`.
- **Inline scalar arrays** render as `key: [a,b,c]` on one line.
- **Uniform object arrays** (every item has only scalar or scalar-array fields) render as a
  tabular block: a header naming the length and the column union, then one comma-joined row per
  item — no repeated keys.
- **Nested object arrays** (an item field is itself an object) render as a `key[N]:` list of
  indented, `- `-prefixed blocks instead of a table, since the shape isn't uniform enough to
  tabulate.
- **Nested plain objects** render as `key:` followed by an indented block.

## Example

Given this data (the shape [`parse`](/gherkin-cli/cli/parse/) emits):

```json
{
  "summary": { "files": 1, "scenarios": 2, "errors": 0 },
  "files": [
    {
      "file": "a.feature",
      "featureTags": ["@auth"],
      "scenarioCount": 2,
      "scenarios": [
        { "name": "Successful login", "keyword": "Scenario", "tags": ["@smoke"] },
        { "name": "Failed login", "keyword": "Scenario", "tags": [] }
      ]
    }
  ]
}
```

`gherkin-cli` renders it as:

```
summary:
  files: 1
  scenarios: 2
  errors: 0
files[1]:
  - file: a.feature
    featureTags: [@auth]
    scenarioCount: 2
    scenarios[2]{name,keyword,tags}:
      "Successful login",Scenario,[@smoke]
      "Failed login",Scenario,[]
```

Every `scenarios` row is uniform (`name, keyword, tags`), so it tabulates into one header plus two
comma-joined rows — no repeated field names, unlike the equivalent JSON.

## Truncation

A rendered TOON result longer than 50 lines is truncated with a size hint
(`… +N lines — rerun with --full`) unless `--full` is passed. `--format json` output is never
truncated — it is the explicit escape hatch for a caller that wants the whole payload regardless
of size.

## See also

- [AXI output contract](/gherkin-cli/concepts/axi/) — the full set of conventions TOON output
  follows.
- [CLI Reference](/gherkin-cli/cli/parse/) — the commands that emit this format.
