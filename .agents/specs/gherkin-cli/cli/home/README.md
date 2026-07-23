---
spec-type: behavioral
concept: [home-view]
---

# home — the bare-invocation inventory view

Bare `gherkin-cli` (no args) is not a usage manual — it is a live inventory the agent can act on in one call (AXI #8). It lists the `.feature` files discoverable under the current directory with their scenario counts and feature tags, caps the listing, and ends with next-step help. It reuses the `parse` engine to compute the per-file counts.

## Use Cases

- An agent lands in a repo and asks "what's here?" → bare `gherkin-cli` shows the `.feature` inventory.
- A directory with no `.feature` files should still answer definitively → an explicit `0 .feature files found` state.
- A large suite should not flood the view → the listing caps at `HOME_LIMIT` and points at the glob for the rest.

## Contract

- Lists the discoverable `.feature` files (excluding `node_modules`) with per-file scenario count and feature tags, on **stdout**.
- Zero files → an explicit `0 .feature files found in this directory` state, exit 0; never blank.
- Caps the listing at `HOME_LIMIT` (20); when more exist, a next-step hint suggests the glob to see all of them.
- Ends with next-step help lines (parse / validate / diff).
- Collapses the home directory to `~` in the bin path line.
