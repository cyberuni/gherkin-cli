Feature: diff — classify scenario changes against a git ref

  Scenario: a new scenario is classified added
    Given a .feature committed at the base ref
    And the working tree adds one new scenario and changes nothing else
    When I run diff against the base ref
    Then the new scenario is classified added
    And the existing scenarios are classified unchanged

  Scenario: a purely additive change reports addOnly true
    Given a .feature whose working tree only appends new scenarios
    When I run diff against the base ref
    Then addOnly is true

  Scenario: editing an existing scenario is classified modified and clears addOnly
    Given a .feature committed at the base ref
    And the working tree changes a step in an existing scenario
    When I run diff against the base ref
    Then that scenario is classified modified
    And addOnly is false

  Scenario: deleting a scenario is classified removed and clears addOnly
    Given a .feature committed at the base ref
    And the working tree deletes an existing scenario
    When I run diff against the base ref
    Then that scenario is classified removed
    And addOnly is false

  Scenario: an unchanged file reports all scenarios unchanged
    Given a .feature identical to its base ref
    When I run diff against the base ref
    Then every scenario is classified unchanged
    And addOnly is true

  Scenario: a file absent at the base is entirely additive
    Given a .feature that does not exist at the base ref
    When I run diff against the base ref
    Then every scenario is classified added
    And addOnly is true

  Scenario: the result carries change aggregates
    Given a working tree with one added and one modified scenario
    When I run diff against the base ref
    Then the summary reports the added, modified, removed, and unchanged counts

  Scenario: a bad git ref fails loud
    Given a base ref that does not resolve
    When I run diff against it
    Then a structured EGIT error is written to stderr
    And the exit code is 1
