---
"gherkin-cli": minor
---

Formalize the programmatic API. The `.` entrypoint (`import { … } from 'gherkin-cli'`) is now a documented library surface exposing the pure engines — `parse`, `parseAst` (newly exported), `validate`, `diff`, `GitError` — and their types. The render/stream layer stays CLI-only, so importing gherkin-cli runs no CLI side effect. The CLI now consumes this same API barrel.

Add a dependency-injection seam for easy testing, passed as a separate 3rd `deps` argument — a narrow role interface (ISP), not an option. `parse`, `parseAst`, and `validate` take a `ReadsFile` (default `nodeReadsFile`); `diff` takes a `ReadsGitDiff` (default `gitReadsDiff`). Each engine receives only the seam it uses, so they can be driven from in-memory fixtures with no filesystem or git access. The `ReadsFile` and `ReadsGitDiff` role interfaces and both node defaults (`nodeReadsFile`, `gitReadsDiff`) are exported. No CLI behavior or output routing changes.
