---
"gherkin-cli": minor
---

Formalize the programmatic API. The `.` entrypoint (`import { … } from 'gherkin-cli'`) is now a documented library surface exposing the pure engines — `parseFeatures`, `parseFeaturesAst` (newly exported), `validateFeatures`, `diffFeatures`, `GitError` — and their types. The render/stream layer stays CLI-only, so importing gherkin-cli runs no CLI side effect. The CLI now consumes this same API barrel.

Add a dependency-injection seam for easy testing: `parseFeatures` and `validateFeatures` (and `parseFeaturesAst`) now accept an optional `reader` — a `FileReader` (default `nodeFileReader`) — so they can be driven from in-memory fixtures with no filesystem access, the counterpart to the existing `DiffReader`/`gitReader` on `diffFeatures`. The `FileReader` type and both node defaults (`nodeFileReader`, `gitReader`) are exported. No CLI behavior or output routing changes.
