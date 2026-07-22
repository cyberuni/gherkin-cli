---
"gherkin-cli": minor
---

Formalize the programmatic API. The `.` entrypoint (`import { … } from 'gherkin-cli'`) is now a documented, firewalled library surface exposing the pure engines — `parseFeatures`, `parseFeaturesAst` (newly exported), `validateFeatures`, `diffFeatures`, `GitError` — and their types. The render/stream layer stays CLI-only and is structurally unreachable from the library: importing gherkin-cli runs no CLI side effect. The CLI now consumes this same API barrel. No CLI behavior or output routing changes.
