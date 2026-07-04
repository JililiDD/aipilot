# Java Backend Checks

Use this reference only when the active task touches Java backend behavior or backend verification.

## Source Priority

1. Current product and development documents
2. Existing project code and tests
3. Existing build and framework versions
4. Official Java, Spring, JUnit, Maven, and Gradle documentation
5. Generic conventions such as Google Java Style

## Official References

- Java API: https://docs.oracle.com/en/java/javase/21/docs/api/index.html
- Spring Framework transactions: https://docs.spring.io/spring-framework/reference/data-access/transaction.html
- Spring Web MVC: https://docs.spring.io/spring-framework/reference/web/webmvc.html
- Spring Bean Validation: https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html
- Spring Boot testing: https://docs.spring.io/spring-boot/reference/testing/index.html
- Spring Security servlet apps: https://docs.spring.io/spring-security/reference/servlet/index.html
- JUnit user guide: https://docs.junit.org/6.1.0/overview.html
- Maven guides: https://maven.apache.org/guides/index.html
- Gradle user manual: https://docs.gradle.org/current/userguide/userguide.html
- Google Java Style: https://google.github.io/styleguide/javaguide.html

## Planning Checks

- Identify Java version, Spring Boot version, build tool, package layout, and test conventions before planning backend work.
- Split backend phases by independently verifiable behavior: API endpoint, service behavior, persistence change, security boundary, migration, or build repair.
- Define API contracts before frontend/backend parallel work starts.
- Name DTOs, validation rules, status codes, error body shape, and nullability assumptions.
- Decide transaction boundary and persistence strategy before implementation.
- Mark speculative framework or architecture additions as deferred.

## Implementation Checks

- Match existing package and naming conventions.
- Keep controllers thin and services cohesive.
- Avoid adding global exception handlers, generic response wrappers, or shared base classes unless the project already uses them or current requirements prove the need.
- Keep mapping explicit enough that DTO/entity differences are visible.
- Prefer constructor injection if the project uses it.
- Keep configuration changes scoped. Do not add profiles, properties, or auto-configuration unless required.
- Avoid broad dependency additions for one local behavior.

## Transaction And Persistence Checks

- Put `@Transactional` where the project expects transaction boundaries, usually service-layer state changes.
- Check rollback behavior for checked exceptions, async execution, nested calls, and self-invocation.
- Avoid external HTTP calls, file IO, message publishing, or slow computation inside transactions unless required.
- Check lazy loading and N+1 behavior when returning DTOs or serializing relations.
- Check uniqueness, foreign keys, indexes, and migrations for changed persistence rules.
- Consider optimistic locking or idempotency for concurrent writes when current requirements expose that risk.

## API And Validation Checks

- Validate request bodies, path variables, query parameters, and uploaded data at the boundary.
- Keep domain invariants enforced inside domain/service code, not only in controller annotations.
- Do not expose stack traces, internal exception names, database errors, or secret values to clients.
- Keep error mapping consistent with existing `ControllerAdvice`, exception handlers, or error response conventions.
- Keep frontend contract in sync: field names, required/optional status, enum values, date/time format, pagination, and error shape.

## Security Checks

- Verify authentication and authorization at route and object levels.
- Check that user-controlled identifiers cannot access another user's records.
- Treat CORS, CSRF, session, token, password, and secret handling as security-sensitive.
- Log enough for diagnosis without logging secrets, tokens, personal data beyond policy, or raw credentials.

## Testing Checks

- Use the project's existing test style first.
- Prefer focused tests for changed behavior:
  - unit tests for pure domain/service logic
  - MVC slice tests for controller mapping and validation
  - repository tests for query behavior
  - integration tests for transaction, migration, security, or cross-layer behavior
- Use Testcontainers only if already present or if the behavior cannot be proven with existing test infrastructure.
- Run the smallest relevant Maven/Gradle command first, then broader checks when risk warrants it.

## Build Failure Checks

- For compiler failures, identify the first real error before fixing cascaded errors.
- For Spring context failures, inspect missing beans, profile/config mismatches, circular dependencies, and conditional configuration.
- For test failures, distinguish product behavior mismatch from brittle test setup.
- For dependency failures, prefer aligning with existing dependency management over adding explicit versions locally.
