@frozen
Feature: validate — the well-formedness command

  Scenario: a clean run renders the report and exits 0
    Given two well-formed .feature files
    When I run `gherkin-cli validate` on both
    Then the report is written to stdout
    And an explicit `errors: 0` line is written to stdout
    And a next-step hint suggests `gherkin-cli parse`
    And the exit code is 0

  Scenario: any syntax error renders on stdout and gates exit 1
    Given a .feature file with a Gherkin syntax error on a known line
    When I run `gherkin-cli validate` on it
    Then the errors are written to stdout with the line and message
    And a next-step hint suggests `gherkin-cli parse <file> --ast`
    And the exit code is 1

  Scenario: a mixed batch gates exit 1
    Given one valid and one invalid .feature file
    When I run `gherkin-cli validate` on both
    Then the valid file is reported ok and the invalid file not ok on stdout
    And the exit code is 1
