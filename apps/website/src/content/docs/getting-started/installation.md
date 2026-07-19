---
title: Installation
description: Running gherkin-cli via npx or installing it into a project.
---

The fastest way to run `gherkin-cli` is `npx`, with no install step:

```bash
npx gherkin-cli parse features/**/*.feature
```

## Install into a project

```bash
npm install --save-dev gherkin-cli
# or
pnpm add -D gherkin-cli
```

Once installed, run it via your package manager's bin resolution:

```bash
npx gherkin-cli validate features/**/*.feature
```

## Requirements

`gherkin-cli` requires Node.js 22 or later.

## Next

- [Introduction](/gherkin-cli/getting-started/introduction/) — what `gherkin-cli` is and why it
  exists.
- [CLI Reference](/gherkin-cli/cli/parse/) — the full command surface.
