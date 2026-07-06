Feature: parse — project a .feature into a compact digest

  # ── default projection ──────────────────────────────────────────
  Scenario: default projection lists scenarios with name, keyword, and tags
    Given a .feature file with two scenarios and a feature-level tag
    When I run parse on it with default options
    Then the result lists each scenario's name, keyword, and tags
    And the file entry reports the feature tags and the scenario count
    And no step text is included

  Scenario: default output omits step detail
    Given a .feature file whose scenarios have steps
    When I run parse with default options
    Then the scenarios carry no stepCount, exampleRows, or steps fields

  # ── --full ──────────────────────────────────────────────────────
  Scenario: --full adds step and example detail
    Given a .feature file with a Scenario Outline carrying an Examples table
    When I run parse with --full
    Then each scenario includes stepCount and the ordered step text
    And the outline scenario includes its example row count

  # ── --tag ───────────────────────────────────────────────────────
  Scenario: --tag keeps only scenarios carrying the tag
    Given a .feature file with one @frozen scenario and one untagged scenario
    When I run parse with --tag @frozen
    Then only the @frozen scenario appears in the result

  # ── --ast ───────────────────────────────────────────────────────
  Scenario: --ast dumps the raw GherkinDocument
    Given a well-formed .feature file
    When I run parse with --ast
    Then the output is the raw cucumber GherkinDocument for that file

  # ── aggregates and empty state ──────────────────────────────────
  Scenario: the result carries a pre-computed summary
    Given three .feature files
    When I run parse on all three
    Then the summary reports the total file count and total scenario count

  Scenario: an empty suite states so explicitly
    Given a .feature file with a Feature line and no scenarios
    When I run parse on it
    Then the result states zero scenarios explicitly
    And the exit code is 0

  # ── errors ──────────────────────────────────────────────────────
  Scenario: a malformed file yields an error entry without aborting the batch
    Given one malformed .feature file and one well-formed .feature file
    When I run parse on both
    Then the malformed file has an error entry with a line number
    And the well-formed file is projected normally
    And the exit code is 0

  Scenario: a missing file fails loud
    Given a path to a file that does not exist
    When I run parse on it
    Then a structured ENOENT error is written to stderr
    And the exit code is 1
