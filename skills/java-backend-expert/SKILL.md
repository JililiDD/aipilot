---
name: java-backend-expert
description: Load as a domain overlay whenever another stage's work touches Java backend — Spring Boot, REST APIs, service/repository layering, DTOs, validation, exception mapping, transactions, persistence, Maven/Gradle builds, JUnit tests, or backend security boundaries.
---

# Java Backend Expert

## What this is

This skill is a **domain overlay**, not a workflow stage. Like `dev-builder`'s Diagnosis Mode, it is worn on top of whatever stage is running. A stage puts it on when the stage's material touches Java backend, and takes it off afterward. The overlay has these limits:

- No skill routes to it.
- It is never in the stage order.
- It has no handoff of its own.

The calling stage (`dev-plan-builder`, `dev-builder`, `code-reviewer`) keeps ownership of these:

- the flow
- the documents that it already read
- the final judgment

This overlay only sharpens the Java and Spring decisions inside that work.

The caller has already read the product, design, and plan documents and the target work-item. So do not re-read them. Read the **Java material**:

- the relevant source and test files
- the build files (`pom.xml`, `build.gradle`, `settings.gradle`, `gradle.properties`)
- the API contracts, OpenAPI, DTOs, migrations, and error models, when present
- the project's existing package layout, naming, test conventions, dependency choices, and framework versions

Apply `references/backend-checks.md`. It holds the rules and the checklist for every caller, including the Spring, JUnit, Maven, and Gradle specifics.

This overlay can surface a durable Java decision or a discovered constraint. The **calling stage** records each one:

- A choice goes into `memory/decisions.md` (for example "service-layer transaction boundary").
- A pit goes into `memory/lessons.md` (for example "repository X N+1 under lazy serialization").

This overlay names them. The caller writes them.

## Emphasis by caller

The body of Java knowledge is the same for every caller. The facet depends on which stage loaded the overlay:

- **In planning** (`dev-plan-builder`): focus on these points:
  - the boundaries of backend phases and tasks
  - API contracts defined before parallel work
  - the DTO, validation, status, and error shapes named
  - the transaction and persistence strategy decided
  - speculative framework additions deferred
- **In building** (`dev-builder` Build Mode): focus on these points:
  - the smallest correct change that preserves existing patterns
  - thin controllers
  - business rules in services
  - explicit mapping
- **In review** (`code-reviewer`): check backend diffs for correctness, API contract, transaction, validation, persistence, security, and test risk. Each finding must attach to a requirement, an AC, or a concrete named risk. Each finding must use the reviewer's P0–P3 severities. Style preference is not a finding.
- **In diagnosis** (`dev-builder` Diagnosis Mode): trace Maven, Gradle, compiler, JUnit, Spring context, migration, or runtime failures from the evidence. Reproduce the failure and find its root cause before you fix it.

The overlay contributes its findings and recommendations in the calling stage's own output format. It does not emit a separate report of its own.
