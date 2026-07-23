@frozen
Feature: diff — the change-classification command

  # ── options ─────────────────────────────────────────────────────
  Scenario: --base is required
    Given a .feature file
    When I run `gherkin-cli diff` on it without --base
    Then a structured usage error is written to stdout
    And the exit code is 2

  Scenario: --full also lists unchanged scenarios
    Given a .feature identical to its base ref
    When I run `gherkin-cli diff` on it against the base ref with --full
    Then the unchanged scenarios appear in the rendered result

  # ── rendering and empty state ───────────────────────────────────
  Scenario: the result renders to stdout
    Given a working tree with one added and one modified scenario
    When I run `gherkin-cli diff` on it against the base ref
    Then the classified result and its summary are written to stdout

  Scenario: a zero-change run states so explicitly
    Given a .feature identical to its base ref
    When I run `gherkin-cli diff` on it against the base ref
    Then an explicit `changes: 0` line is written to stdout
    And a next-step hint suggests `gherkin-cli parse`
    And the exit code is 0

  # ── errors ──────────────────────────────────────────────────────
  Scenario: an unresolvable base ref fails loud on stdout
    Given a base ref that does not resolve
    When I run `gherkin-cli diff` against it
    Then a structured EGIT error is written to stdout
    And the exit code is 1

  # ── next-step help ──────────────────────────────────────────────
  Scenario: a changed run ends with next-step help on stdout
    Given a working tree with one added scenario
    When I run `gherkin-cli diff` on it against the base ref without --full
    Then next-step help lines are written to stdout
    And one suggests `gherkin-cli parse <file> --full`
    And one suggests rerunning diff with --full
