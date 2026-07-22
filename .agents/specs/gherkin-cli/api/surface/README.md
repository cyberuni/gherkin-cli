---
spec-type: behavioral
concept: [export-contract]
---

# surface — the export contract and CLI-layer firewall

The `.` barrel is the formal boundary between the library and the CLI. This node pins down what `import ... from 'gherkin-cli'` gives you, what it deliberately withholds, and the guarantee that importing the library runs no CLI side effect. Formalizing this surface is the point of splitting the spec: the API is now a supported contract, not an incidental re-export.

## Use Cases

- A programmatic consumer imports the engines and their types and relies on them being present → the barrel exports `parseFeatures`, `parseFeaturesAst`, `validateFeatures`, `diffFeatures`, and `GitError`.
- A consumer must never accidentally reach the render/stream layer → the barrel withholds `render`, `encodeToon`, `writeResult`, `fail`, and `writeHelp`.
- A consumer imports the library inside a larger process and must not have its stdout or exit code touched → importing runs no CLI side effect.

## Contract

- The barrel exports the values `parseFeatures`, `parseFeaturesAst`, `validateFeatures`, `diffFeatures`, and `GitError`, plus every type each engine returns or accepts.
- The barrel exports none of the CLI-only render/stream helpers (`render`, `encodeToon`, `writeResult`, `fail`, `writeHelp`) — they stay in `src/output.ts`, reachable only from `src/cli.ts`.
- Importing the barrel performs no stdout write, no `process.exit`, and no argv parsing.
- The firewall is structural: the CLI is unreachable from the library, so no library consumer can trigger a stream write or an exit.
