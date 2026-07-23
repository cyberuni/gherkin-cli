@frozen
Feature: home — the bare-invocation inventory view

  Scenario: bare invocation lists the discoverable .feature files
    Given a directory containing .feature files
    When I run `gherkin-cli` with no arguments
    Then each discoverable .feature file is listed on stdout with its scenario count and tags
    And the exit code is 0

  Scenario: a directory with no .feature files states so explicitly
    Given a directory containing no .feature files
    When I run `gherkin-cli` with no arguments
    Then an explicit `0 .feature files found` state is written to stdout
    And the output is not blank
    And the exit code is 0

  Scenario: the listing caps and points at the glob for the rest
    Given a directory containing more than 20 .feature files
    When I run `gherkin-cli` with no arguments
    Then at most 20 files are listed
    And a next-step hint suggests the glob to see all of them

  Scenario: the bin path collapses the home directory to a tilde
    Given the bin resides under the home directory
    When I run `gherkin-cli` with no arguments
    Then the bin path line shows the home directory as `~`

  Scenario: the view ends with next-step help
    Given a directory containing .feature files
    When I run `gherkin-cli` with no arguments
    Then next-step help lines suggest parse, validate, and diff
