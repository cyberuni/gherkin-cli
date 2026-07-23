@frozen
Feature: parse — the projection command

  # ── flags map to engine options ─────────────────────────────────
  Scenario: --full includes step and example detail in the rendered result
    Given a .feature file with a Scenario Outline carrying an Examples table
    When I run `gherkin-cli parse` on it with --full
    Then the rendered result includes each scenario's stepCount and step text

  Scenario: --tag renders only scenarios carrying the tag
    Given a .feature file with one @frozen scenario and one untagged scenario
    When I run `gherkin-cli parse` on it with --tag @frozen
    Then only the @frozen scenario appears in the rendered result

  Scenario: --ast emits the raw GherkinDocument as JSON
    Given a well-formed .feature file
    When I run `gherkin-cli parse` on it with --ast
    Then the raw GherkinDocument is written to stdout as JSON

  # ── format and rendering ────────────────────────────────────────
  Scenario: the result and summary render to stdout as TOON by default
    Given a .feature file with two scenarios
    When I run `gherkin-cli parse` on it
    Then the result and its summary are written to stdout as TOON
    And the exit code is 0

  # ── empty state ─────────────────────────────────────────────────
  Scenario: an empty suite prints an explicit zero-scenarios line
    Given a .feature file with a Feature line and no scenarios
    When I run `gherkin-cli parse` on it
    Then an explicit `scenarios: 0` line is written to stdout
    And the exit code is 0

  # ── errors ──────────────────────────────────────────────────────
  Scenario: a missing file fails loud on stdout
    Given a path to a file that does not exist
    When I run `gherkin-cli parse` on it
    Then a structured ENOENT error is written to stdout
    And a next-step hint points at the discovery command
    And the exit code is 1

  Scenario: a malformed-but-present file does not fail the run
    Given one malformed .feature file and one well-formed .feature file
    When I run `gherkin-cli parse` on both
    Then the malformed file is rendered as an error entry
    And the well-formed file is rendered normally
    And the exit code is 0

  # ── next-step help ──────────────────────────────────────────────
  Scenario: the command ends with next-step help on stdout
    Given a well-formed .feature file
    When I run `gherkin-cli parse` on it without --full
    Then next-step help lines are written to stdout
    And one suggests `gherkin-cli diff --base <ref>` for that file
    And one suggests rerunning with --full
