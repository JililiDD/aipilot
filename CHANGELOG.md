# Changelog

All notable changes to AIPilot are documented here. Releases follow Semantic
Versioning.

## [1.1.1] - 2026-07-23

### Changed

- Updated the vendored `ezreview` standalone runtime from `0.2.1` to `0.2.2`.
- Removed host-specific adapter documentation from the distributable plugin.

### Packaging

- Release preparation documents are kept locally and excluded from the Git
  package.

## [1.1.0] - 2026-07-21

### Added

- Task-scoped implementation self-review before verification.
- An implementation-only approach decision discipline for materially different
  implementation options, including Goal Wrap behavior and durable rationale.

### Changed

- Requirement and design acceptance criteria now use stable `R-n` and `D-n`
  identifiers that remain unchanged after downstream references exist.
- Plugin positioning now describes the workflow as document-driven and
  stage-gated, and obsolete workflow ownership references were removed.

## [1.0.0] - 2026-07-19

### Added

- First public release of the document-driven product development workflow.
- Product, design, planning, implementation, review, release, project-memory,
  workflow-orchestration, and Java backend skills.
- Claude Code, Codex, and Grok Build installation support.
- Deterministic browser-review rendering with vendored offline dependencies.

[1.1.1]: https://github.com/JililiDD/aipilot/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/JililiDD/aipilot/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/JililiDD/aipilot/releases/tag/v1.0.0

RELEASE 1.1.0 — 2026-07-21T23:08:19
