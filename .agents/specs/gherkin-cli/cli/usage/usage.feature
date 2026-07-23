@frozen
Feature: usage — cross-command CLI routing and stream discipline

  # ── unknown flags ───────────────────────────────────────────────
  Scenario: an unknown flag fails loud with the valid flags and exit 2
    Given a subcommand invoked with a flag it does not define
    When I run it
    Then a structured EBADFLAG error is written to stdout
    And the error names the valid flags for that subcommand
    And the exit code is 2

  # ── stream discipline ───────────────────────────────────────────
  Scenario: the result, errors, hints, and empty states all go to stdout
    Given any command that produces a result
    When I run it
    Then the machine result is written to stdout
    And any structured error, next-step hint, and empty-state line are written to stdout
    And nothing that would corrupt a parse of stdout is written to it

  Scenario: stderr carries only the uncaught-exception fallback
    Given a run that completes normally or fails with a structured error
    When I run it
    Then stderr is empty
    And only a top-level uncaught exception is ever written to stderr

  # ── truncation ──────────────────────────────────────────────────
  Scenario: JSON output is never truncated
    Given a result large enough to exceed the truncation threshold
    When I run the command with --format json
    Then the full result is written to stdout untruncated

  Scenario: a large TOON result is truncated with a size hint
    Given a result large enough to exceed the truncation threshold
    When I run the command as TOON without --full
    Then the result is truncated with a `… +N lines — rerun with --full` hint

  Scenario: --full disables TOON truncation
    Given a result large enough to exceed the truncation threshold
    When I run the command as TOON with --full
    Then the full result is written to stdout untruncated
