Feature: validate — check .feature well-formedness

  Scenario: a well-formed suite validates and exits 0
    Given two well-formed .feature files
    When I run validate on both
    Then each file is reported ok
    And the summary reports zero errors
    And the exit code is 0

  Scenario: a malformed file reports its error and exits 1
    Given a .feature file with a Gherkin syntax error on a known line
    When I run validate on it
    Then the file is reported not ok
    And an error carries that line number and a message
    And the exit code is 1

  Scenario: a mixed batch exits 1 when any file is invalid
    Given one valid and one invalid .feature file
    When I run validate on both
    Then the valid file is ok and the invalid file is not ok
    And the exit code is 1

  Scenario: the empty-error summary is explicit
    Given a well-formed .feature file
    When I run validate on it
    Then the summary states zero errors explicitly
