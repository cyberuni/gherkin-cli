@frozen
Feature: validate — the well-formedness engine

  Scenario: a well-formed suite reports every file ok
    Given two well-formed .feature files
    When validateFeatures runs on both
    Then each file is reported ok
    And the summary reports zero errors

  Scenario: a malformed file reports its error with a line and code
    Given a .feature file with a Gherkin syntax error on a known line
    When validateFeatures runs on it
    Then the file is reported not ok
    And an error carries that line number, a message, and a code

  Scenario: a mixed batch marks each file independently
    Given one valid and one invalid .feature file
    When validateFeatures runs on both
    Then the valid file is ok and the invalid file is not ok

  Scenario: the clean-run summary states zero errors explicitly
    Given a well-formed .feature file
    When validateFeatures runs on it
    Then the summary states zero errors explicitly

  Scenario: a missing file is reported not ok with an ENOENT error
    Given a path to a file that does not exist
    When validateFeatures runs on it
    Then the file is reported not ok
    And an error carries the code ENOENT

  Scenario: the file text is read through an injected reader
    Given a FileReader that returns feature text without touching the filesystem
    When validateFeatures runs with that reader injected
    Then the verdict uses the text the reader returned
    And no file is read from disk
