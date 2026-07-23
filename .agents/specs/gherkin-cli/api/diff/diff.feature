@frozen
Feature: diff — the change-classification engine

  # ── classification ──────────────────────────────────────────────
  Scenario: a new scenario is classified added
    Given a .feature committed at the base ref
    And the working tree adds one new scenario and changes nothing else
    When diff runs against the base ref
    Then the new scenario is classified added
    And the existing scenarios are classified unchanged

  Scenario: a purely additive change reports addOnly true
    Given a .feature whose working tree only appends new scenarios
    When diff runs against the base ref
    Then addOnly is true

  Scenario: editing an existing scenario is classified modified and clears addOnly
    Given a .feature committed at the base ref
    And the working tree changes a step in an existing scenario
    When diff runs against the base ref
    Then that scenario is classified modified
    And addOnly is false

  Scenario: deleting a scenario is classified removed and clears addOnly
    Given a .feature committed at the base ref
    And the working tree deletes an existing scenario
    When diff runs against the base ref
    Then that scenario is classified removed
    And addOnly is false

  Scenario: an unchanged file reports all scenarios unchanged
    Given a .feature identical to its base ref
    When diff runs against the base ref
    Then every scenario is classified unchanged
    And addOnly is true

  Scenario: a file absent at the base is entirely additive
    Given a .feature that does not exist at the base ref
    When diff runs against the base ref
    Then every scenario is classified added
    And addOnly is true

  # ── identity is the scenario name ───────────────────────────────
  Scenario: renaming a scenario reads as add plus remove
    Given a .feature committed at the base ref
    And the working tree renames one scenario and changes nothing else
    When diff runs against the base ref
    Then the old name is classified removed
    And the new name is classified added
    And addOnly is false

  # ── aggregates ──────────────────────────────────────────────────
  Scenario: the result carries change aggregates
    Given a working tree with one added and one modified scenario
    When diff runs against the base ref
    Then the summary reports the added, modified, removed, and unchanged counts

  # ── injectable reader ───────────────────────────────────────────
  Scenario: the base text is read through the injected reader
    Given a ReadsGitDiff that returns head and base text without touching git
    When diff runs with that reader injected
    Then the classification uses the text the reader returned
    And no git command is invoked

  # ── errors ──────────────────────────────────────────────────────
  Scenario: an unresolvable base ref throws GitError
    Given a base ref that does not resolve
    When diff runs against it
    Then it throws a GitError
    And it neither prints nor exits the process
