---
name: java-backend-expert
description: Load as a domain overlay whenever another stage's work touches Java backend — Spring Boot, REST APIs, service/repository layering, DTOs, validation, exception mapping, transactions, persistence, Maven/Gradle builds, JUnit tests, or backend security boundaries.
---

# Java Backend Expert

## What this is

A **domain overlay**, not a workflow stage. Like `dev-builder`'s Diagnosis Mode, it is worn on top of whatever stage is running when that stage's material touches Java backend, then taken off — it is never routed to, never in the stage order, has no handoff of its own. The calling stage (`dev-plan-builder`, `dev-builder`, `code-reviewer`) keeps ownership of the flow, the documents it already read, and the final judgment; this overlay only sharpens the Java/Spring decisions inside that work.

Because the caller has already read the product/design/plan documents and the target work-item, this overlay does not re-read them. It reads the **Java material**: relevant source and test files; build files (`pom.xml`, `build.gradle`, `settings.gradle`, `gradle.properties`); API contracts, OpenAPI, DTOs, migrations, and error models when present; and the project's existing package layout, naming, test conventions, dependency choices, and framework versions. For Spring/JUnit/Maven/Gradle specifics, consult `references/backend-checks.md`.

Any durable Java decision or discovered constraint surfaced here is recorded by the **calling stage** into `memory/decisions.md` (a choice, e.g. "service-layer transaction boundary") or `memory/lessons.md` (a pit, e.g. "repository X N+1 under lazy serialization") — this overlay names them; the caller writes them.

## Emphasis by caller

Same body of Java knowledge, different facet depending on who loaded it:

- **In planning** (`dev-plan-builder`): backend phase/task boundaries, API contracts defined before parallel work, DTO/validation/status/error shapes named, transaction and persistence strategy decided, speculative framework additions deferred.
- **In building** (`dev-builder` Build Mode): the smallest correct change that preserves existing patterns; controllers thin, business rules in services, explicit mapping.
- **In review** (`code-reviewer`): backend diffs for correctness, API contract, transaction, validation, persistence, security, and test risk. Findings must attach to a requirement, AC, or concrete named risk and use the reviewer's P0–P3 severities — style preference is not a finding.
- **In diagnosis** (`dev-builder` Diagnosis Mode): Maven, Gradle, compiler, JUnit, Spring context, migration, or runtime failures traced from evidence — reproduce and root-cause before fixing.

## Rules

- Project code and project docs override generic Java or Spring advice.
- YAGNI: no generic base services, base repositories, factories, registries, adapters, async layers, event buses, provider abstractions, or new dependencies unless current requirements prove the need.
- Controllers thin (request parsing, authorization boundary, validation handoff, response mapping); business rules in services or domain code, not controllers/repositories/mappers.
- Repositories stay persistence-focused; don't hide business decisions in queries unless the project already does.
- DTOs at API boundaries; don't expose persistence entities directly unless the project deliberately accepts that tradeoff.
- Validate external input at the boundary; enforce domain invariants inside the service/domain layer.
- Transaction boundaries are design decisions — prefer service-layer transactions for multi-step state changes; no slow external IO inside DB transactions unless required and the risk is accepted.
- Error behavior explicit: status codes, error body shape, exception mapping, logging, client-visible messages — never leak stack traces, internal exception names, or secrets.
- Prefer existing test style; add the smallest test that proves the changed behavior or failure mode.

## Backend Checklist

- **API contract**: route, method, status codes, DTO shape, nullability, pagination, sorting, error model.
- **Validation**: Bean Validation, custom validation, domain invariant enforcement, error reporting.
- **Layering**: controller/service/repository/domain boundaries and dependency direction.
- **Transactions**: propagation, rollback, lazy loading, external IO, idempotency, race conditions.
- **Persistence**: query correctness, N+1 risk, indexes/constraints, migration impact, locking, data safety.
- **Security**: authentication, authorization, object-level access, secret handling, CORS/CSRF when relevant, unsafe deserialization.
- **Testing**: unit, slice, integration, migration, contract coverage appropriate to the risk.
- **Build**: Maven/Gradle dependency changes, plugin config, Java version compatibility, generated sources.

The overlay contributes its findings and recommendations in the calling stage's own output format — it does not emit a separate report of its own.
