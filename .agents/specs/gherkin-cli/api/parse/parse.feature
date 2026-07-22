@frozen
Feature: parse — the projection engine

  # ── default projection ──────────────────────────────────────────
  Scenario: default projection lists scenarios with name, keyword, and tags
    Given a .feature file with two scenarios and a feature-level tag
    When parseFeatures runs on it with default options
    Then the result lists each scenario's name, keyword, and tags
    And the file entry reports the feature tags and the scenario count
    And no step text is included

  Scenario: default projection omits step detail
    Given a .feature file whose scenarios have steps
    When parseFeatures runs on it with default options
    Then the scenarios carry no stepCount, exampleRows, or steps fields

  # ── full ────────────────────────────────────────────────────────
  Scenario: full adds step and example detail
    Given a .feature file with a Scenario Outline carrying an Examples table
    When parseFeatures runs on it with full true
    Then each scenario includes stepCount and the ordered step text
    And the outline scenario includes its example row count

  # ── tag ─────────────────────────────────────────────────────────
  Scenario: tag keeps only scenarios carrying the tag
    Given a .feature file with one @frozen scenario and one untagged scenario
    When parseFeatures runs on it with tag @frozen
    Then only the @frozen scenario appears in the result

  Scenario: tag matching ignores a leading @ on the filter
    Given a .feature file with one @frozen scenario and one untagged scenario
    When parseFeatures runs on it with tag frozen
    Then only the @frozen scenario appears in the result

  # ── ast ─────────────────────────────────────────────────────────
  Scenario: parseFeaturesAst returns the raw GherkinDocument
    Given a well-formed .feature file
    When parseFeaturesAst runs on it
    Then the result carries the raw cucumber GherkinDocument for that file

  # ── aggregates and empty state ──────────────────────────────────
  Scenario: the result carries a pre-computed summary
    Given three .feature files
    When parseFeatures runs on all three
    Then the summary reports the total file count and total scenario count

  Scenario: an empty suite states zero scenarios explicitly
    Given a .feature file with a Feature line and no scenarios
    When parseFeatures runs on it
    Then the result states zero scenarios explicitly

  # ── errors ──────────────────────────────────────────────────────
  Scenario: a malformed file yields an error entry without aborting the batch
    Given one malformed .feature file and one well-formed .feature file
    When parseFeatures runs on both
    Then the malformed file entry carries an error with a code, line, and message
    And the well-formed file is projected normally
    And no exception is thrown

  Scenario: a missing file yields an ENOENT error entry
    Given a path to a file that does not exist
    When parseFeatures runs on it
    Then that file entry carries an error with code ENOENT
    And no exception is thrown
    And the engine does not exit the process
