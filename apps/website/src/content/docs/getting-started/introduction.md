---
title: Introduction
description: What gherkin-cli is and why it exists.
---

`gherkin-cli` is an **agent-first Gherkin CLI**: parse, validate, and diff `.feature` files with
token-efficient, [AXI](https://github.com/kunchenguid/axi)-conformant output. It wraps the canonical
[`@cucumber/gherkin`](https://github.com/cucumber/gherkin) parser — the tool never hand-rolls Gherkin
tokenization — and projects the result through a compact, deterministic output layer built for AI
agents that read and reason over Gherkin suites.

It ships three commands:

- **`parse`** — project a `.feature` into a compact digest: scenario names, tags, and counts.
- **`validate`** — check `.feature` well-formedness, with a gating exit code for CI.
- **`diff`** — classify scenario changes against a git ref (`added` / `modified` / `removed` /
  `unchanged`), with an `addOnly` aggregate for purely-additive changes.

Bare invocation (`gherkin-cli` with no arguments) is not a usage manual — it prints the live
`.feature` inventory of the current directory, so an agent can act on what it sees in one call.

## Try it

```bash
# What .feature files are here, and how many scenarios does each have?
npx gherkin-cli

# Project a suite into a compact digest
npx gherkin-cli parse features/**/*.feature
```

## Where next

- [Installation](/gherkin-cli/getting-started/installation/) — running `gherkin-cli` via `npx` or
  installing it into a project.
- [CLI Reference](/gherkin-cli/cli/parse/) — `parse`, `validate`, and `diff` in full.
- [AXI output contract](/gherkin-cli/concepts/axi/) — the agent-facing output contract every
  command follows.
- [TOON format](/gherkin-cli/concepts/toon/) — the compact default output encoding.
