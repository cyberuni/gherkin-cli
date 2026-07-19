---
'gherkin-cli': patch
---

Collapse the file list in next-step help blocks to a `<files...>` placeholder for batch runs. `parse`, `validate`, and `diff` echoed every input path — twice — so a 26-file run spent ~6.2KB of stdout on the affordance meant to save tokens (AXI #9). A single-file run still names the real path.
