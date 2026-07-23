# 0001 — Adopt the AXI output contract

- Status: accepted
- Date: 2026-07-05

## Context

`gherkin-cli` is consumed almost entirely by AI agents (parsing suites in a reasoning loop, diffing scenarios in a review flow). A human-prose-first CLI with `--format json` as an afterthought is the inverse of what an agent wants: it spends tokens on prose, dumps every field, and blurs the machine result with human chatter on one stream.

[AXI](https://github.com/kunchenguid/axi) (Agent Experience Interface) is a design framework that treats the agent's token budget as a first-class constraint. `cyberplace` (its `axi` node) and `universal-plugin` (its ADR-0003) already adopted it, so agents moving between these cyberuni tools see one interface.

## Decision

Adopt AXI principles **#1–#6 and #8–#10** as the output contract for every `gherkin-cli` command:

- TOON by default, `--format json` escape (#1); minimal default schema with `--full` for detail (#2); truncation with a size hint (#3); pre-computed `summary` aggregates in the payload (#4); explicit empty states (#5); structured errors + `0`/`1`/`2` exit codes + no prompts + fail-loud unknown flags (#6); a bare-command live inventory view rather than a usage manual (#8); next-step lines (#9); consistent `--help` (#10).
- **Stream discipline:** stdout carries everything the agent consumes — the machine result, the structured errors, the next-step hints, and the definitive empty-state lines; stderr carries only the top-level uncaught-exception fallback. (Errors, hints, and empty states were moved off stderr onto stdout because agents read stdout, not stderr.)

Principle **#7** (ambient context — session hooks + an installable Agent Skill) is **out of scope**: `gherkin-cli` is a leaf CLI with no session-context surface.

## Consequences

- The contract lives once in `src/output.ts` (+ `cli.ts` wiring); each command routes its result through it. The `axi/` spec node states the surface; the three behavioral nodes carry the conformance scenarios.
- A consumer (e.g. SDD's suite engines) can parse stdout as TOON or `--format json` without stripping human chatter, and branch on exit codes and stable error `code`s.
- The tool stays agent-first by default while remaining usable by humans (help, next-step hints, readable TOON).
