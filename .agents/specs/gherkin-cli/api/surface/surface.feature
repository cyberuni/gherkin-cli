@frozen
Feature: surface — the export contract and CLI-layer firewall

  # ── exported engines ────────────────────────────────────────────
  Scenario: the barrel exports the pure engines and GitError
    Given the gherkin-cli package barrel
    When its exports are inspected
    Then it exports parse, parseAst, validate, and diff
    And it exports the GitError class
    And it exports the types each engine returns and accepts

  # ── the firewall ────────────────────────────────────────────────
  Scenario: the barrel withholds the render and stream helpers
    Given the gherkin-cli package barrel
    When its exports are inspected
    Then it does not export render, encodeToon, or writeResult
    And it does not export fail or writeHelp

  Scenario: importing the library runs no CLI side effect
    Given nothing has imported the barrel yet
    When the barrel is imported
    Then nothing is written to stdout
    And process.exit is not called
    And no argv parsing occurs

  # ── injectable readers ──────────────────────────────────────────
  Scenario: the barrel exposes the injectable readers and their node defaults
    Given the gherkin-cli package barrel
    When its exports are inspected
    Then it exports the ReadsFile and ReadsGitDiff seam types
    And it exports nodeReadsFile and gitReadsDiff as the node defaults
