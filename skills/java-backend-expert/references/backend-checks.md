# Java Backend Checks

Use this reference only when the active task touches Java backend behavior or backend verification.

## Source Priority

Sources rank in this order, highest first:

1. Current product and development documents
2. Existing project code and tests
3. Existing build and framework versions
4. Official Java, Spring, JUnit, Maven, and Gradle documentation
5. Generic conventions such as Google Java Style

## Planning Checks

- Before you plan backend work, identify the Java version, Spring Boot version, build tool, package layout, and test conventions.
- Split backend phases by independently verifiable behavior: API endpoint, service behavior, persistence change, security boundary, migration, or build repair.
- Define API contracts before parallel frontend and backend work starts.
- Name the route and HTTP method, DTOs, validation rules, status codes, error body shape, pagination and sorting, and nullability assumptions.
- Decide the transaction boundary and the persistence strategy before implementation.
- Mark speculative framework or architecture additions as deferred.

## Implementation Checks

- Match existing package conventions. Name values and methods by constitution §7 Code naming.
- Keep controllers thin. A controller does only request parsing, the authorization boundary, passing input to validation, and response mapping. Business rules live in services or domain code, not in controllers, repositories, or mappers. Dependencies point one way: controllers → services → repositories.
- Keep repositories focused on persistence. Do not hide business decisions in queries. The exception is a project that already does so.
- Avoid these constructs:
  - global exception handlers
  - generic response wrappers
  - base services, base repositories, or base classes
  - factories
  - registries
  - adapters
  - async layers
  - event buses
  - provider abstractions

  The exception is a construct that the project already uses, or one that current requirements prove necessary.
- Use DTOs at API boundaries. Do not expose persistence entities directly. The exception is a project that deliberately accepts that trade-off. Keep the mapping explicit enough that the differences between DTO and entity are visible.
- If the project uses constructor injection, prefer it.
- Keep configuration changes scoped. Add profiles, properties, or auto-configuration only when they are required.
- Avoid adding broad dependencies for one local behavior.

## Transaction And Persistence Checks

- Put `@Transactional` where the project expects transaction boundaries. These are usually the state changes in the service layer.
- Check rollback behavior for checked exceptions, async execution, nested calls, and self-invocation.
- Avoid external HTTP calls, file IO, message publishing, or slow computation inside transactions unless required and the risk is accepted.
- When code returns DTOs or serializes relations, check lazy loading and N+1 behavior.
- For changed persistence rules, check uniqueness, foreign keys, indexes, and migrations.
- When current requirements expose a risk from concurrent writes, consider optimistic locking or idempotency.

## API And Validation Checks

- Validate request bodies, path variables, query parameters, and uploaded data at the boundary.
- Enforce domain invariants inside domain or service code, not only in controller annotations.
- Do not expose stack traces, internal exception names, database errors, or secret values to clients.
- Make error behavior explicit. Error behavior covers status codes, error body shape, exception mapping, logging, and client-visible messages. Keep it consistent with the existing `ControllerAdvice`, exception handlers, or error response conventions.
- Keep these parts of the frontend contract in sync:
  - route and HTTP method
  - field names
  - required/optional status
  - enum values
  - date/time format
  - pagination and sorting
  - error shape

## Security Checks

- Verify authentication and authorization at the route level and the object level.
- Check that user-controlled identifiers cannot access another user's records.
- Treat CORS, CSRF, session, token, password, secret handling, and deserialization of untrusted input as security-sensitive.
- Log enough for diagnosis without logging secrets, tokens, personal data beyond policy, or raw credentials.

## Testing Checks

- Use the project's existing test style first.
- Prefer focused tests for changed behavior:
  - unit tests for pure domain/service logic
  - MVC slice tests for controller mapping and validation
  - repository tests for query behavior
  - integration tests for transaction, migration, security, or cross-layer behavior
  - contract tests when an API contract changes
- Use Testcontainers only if the project already has it, or if existing test infrastructure cannot prove the behavior.
- Run the smallest relevant Maven or Gradle command first. When the risk warrants it, run broader checks next.

## Build Failure Checks

- For compiler failures, identify the first real error before you fix the cascaded errors.
- For Spring context failures, inspect missing beans, profile/config mismatches, circular dependencies, and conditional configuration.
- For test failures, distinguish a mismatch in product behavior from a brittle test setup.
- For dependency failures, prefer aligning with the existing dependency management over adding explicit versions locally.
- For dependency or plugin changes, check Java version compatibility and generated sources.
