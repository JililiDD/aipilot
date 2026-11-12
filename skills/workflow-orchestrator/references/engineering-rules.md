# Engineering Rules

This plugin reference holds the rules for the code that AIPilot plans, writes, and reviews. It is part of the constitution (`document-system-spec.md` §7). It lives only in the plugin, and a change to it is a plugin-source change. `dev-plan-builder`, `dev-builder`, and `code-reviewer` read it.

## Code naming

These rules cover value names, method names, type names, and test method names in code. They decide the words in a name. The language and the project decide the form of a name, such as its case and its prefix. Apply these rules to every name that you add or rename, whatever the surrounding code does. A new name that a Plan proposes follows them too. Do not rename an existing name only to follow them. Only a naming convention in `memory/agent-guideline.md` overrides them.

If an external contract or a framework fixes a name, keep that name. Examples are a JSON field, a database column, and a query method that Spring Data derives.

A **value name** is the name of a variable, field, parameter, or constant. Name each value by its role, not by a general type such as a string or a list. The **head word** is the word that the other words modify. Choose the head word by what the value holds:
- a boolean: an adjective or a predicate, such as `enabled`, `isActive`, or `hasStops`;
- one object, string, or number: a singular noun, such as `exchange` or `closePrice`;
- a collection: a plural noun for its elements, such as `enabledExchanges`;
- a map: a plural noun for its values, then `By` and the key, such as `eventsByInstrumentId`. Do not use the `keyToValue` form.

Also apply these rules to value names:
- If the type of the value is a class that names what the value is, use the full class name as the head word. Write `instrumentReader` for an `InstrumentReader`, not `reader`. A collection takes the plural, such as `instrumentReaders`.
- If two values of one class need different names, put the role before the class name, such as `sourceInstrumentReader`.
- A general type, such as a string, a number, or a date, does not name a value. Name such a value by its role, such as `closePrice`.
- An adjective can modify the head noun. It never stands alone as the name of a non-boolean value.
- Do not put the container type in a value name. Write `exchanges`, not `exchangeList`.
- Write a boolean name in the affirmative form. Write `enabled`, not `notDisabled`.

For example, `List<ExchangeConfiguration> enabled` breaks these rules, because an adjective names a list. Write `enabledExchangeConfigurations` instead.

Name each method with a verb or a verb phrase, such as `sendMessage` or `findEnabledExchanges`. If a method returns a boolean and changes no state, name it as an assertion, such as `isEmpty` or `containsKey`. A test method takes the test method rules below instead.

A **type name** is the name of a class, an interface, or an enum. Name each type with a noun or a noun phrase. Its head word says what the type is, such as `InstrumentReader`. Do not name a type with a verb phrase, such as `ReadInstrument`. Also apply these rules to type names:
- Take the head word from the role words that the project already uses, such as `Reader` or `Repository`. Do not add a second word for the same role, such as `Loader` beside `Reader`.
- Do not use a head word that fits any class, such as `Manager`, `Helper`, `Util`, `Data`, or `Info`. The exception is a word that the project already uses for that role.
- A modifier says how the type differs from similar types, such as `CachedInstrumentReader`.
- An interface takes a noun for a role, such as `InstrumentReader`, or an adjective for a capability, such as `Closeable`.
- If an interface has one implementation, the implementation may take the `Impl` suffix. If it has several, name each one by its difference, such as `JdbcInstrumentReader`.
- An enum type takes a singular noun, such as `OrderStatus`. Each constant is a noun or an adjective for one value. A constant does not repeat the type name. Write `OrderStatus.ACTIVE`, not `OrderStatus.STATUS_ACTIVE`.

A **test method name** states the condition and the expected result of one behavior. The project's test-name pattern decides the form, such as the word order, the prefix, and the suffix. Also apply these rules to test names:
- Do not tell tests apart by a number, such as `testFindEnabledExchanges2`.
- One name states one behavior. If a name joins two results with "And", split the test by Test design, below.
- The test class of one class takes the name of that class and the project's suffix, such as `InstrumentReaderTest`.

Check each added or renamed name against these rules, one name at a time. `dev-builder` checks names during self-review. `code-reviewer` checks names during code review. In a code review, a break of these rules is **P3**.

## Code text

These rules cover the text that you write with code: comments, documentation comments such as Javadoc and docstrings, and commit messages. Write this text by rules 1 to 8 of constitution §7 Writing. Apply the rules to each comment and commit message that you add or change. Do not rewrite an existing comment only to follow them. Only a convention in `memory/agent-guideline.md` overrides them.

Each format keeps its standard form:
- The summary sentence of a documentation comment may start with its verb, such as `Returns the close price.`
- A tag description, such as the text of `@param` or `@return`, may be a phrase.
- The subject line of a commit message is a short command. The project's commit format decides its prefix and its length.

These rules do not cover text that the program outputs, such as a log message, an exception message, or UI text. In a code review, a break of these rules is **P3**.

## Code layout

These rules decide the order of class members. No Java standard fixes method order, so this plugin uses this convention. For another language, use its standard order or the project's order.

Put class members in these groups, from top to bottom:
1. constants, which are `static final` fields;
2. static fields;
3. instance fields;
4. constructors;
5. `public static` methods;
6. `public` instance methods;
7. `protected` methods;
8. package-private methods, which have no access modifier;
9. `private static` methods;
10. `private` instance methods;
11. nested types, such as an inner class, an enum, an interface, or a record.

Also apply these rules:
- Do not mix groups. For example, a `private` method never stands between two `public` methods.
- Inside groups 1 to 4, order members by access: `public`, `protected`, package-private, then `private`.
- Inside groups 7 and 8, put static methods before instance methods.
- Inside one group, keep overloads together. Put a method below a method of the same group that calls it.
- Write modifiers in the language's customary order. In Java, write `private static final`, not `static private final`.

Apply these rules to each new class and each member added to an existing class. If the class or project already follows another consistent order, follow it. If an existing class mixes groups, put the new member after the last member of its group. Do not move an existing member only to follow these rules. Only a convention in `memory/agent-guideline.md` overrides them.

Check the place of each added member against these rules. `dev-builder` checks during self-review, and `code-reviewer` checks during code review. In a code review, a break of these rules is **P3**.

## Code design

These rules apply to the code that you add or change, when the described risk exists. If the surrounding code consistently does the same thing, follow the project, and do not report it. This exception covers structure, not correctness or safety. Do not refactor existing code only to follow these rules. Fix a problem with the means that the project already uses, such as its injection style.
- **Mixed responsibilities**: one class, module, or function mixes work that changes for different reasons, such as business rules, storage access, and output formatting. Signs are a test that must fake several unrelated things, and a change for one reason that edits code for another. Keep new work of each kind in its own class, module, or function. When this separates a real business rule, pass required values into independently testable calculations and keep external effects in the calling code. Preserve transaction, consistency, and authorization boundaries when separating calculation from effects. Do not add layers merely to make a function pure.
- **Broken substitution**: a subclass or an implementation breaks the contract of its parent type, so callers of the parent fail. Examples are an unsupported-operation error, a method that does nothing where the contract expects an effect, and the rejection of input that the parent accepts. Do not inherit or implement a type whose contract the class cannot keep.
- **Hard-wired boundary**: business logic creates an external boundary itself, or reaches it through a static call, so no test can run the logic without it. Examples of a boundary are a database, an HTTP client, the clock, the file system, and a random source. Inject the boundary instead. Add an interface only when the language cannot fake the concrete class.
- **Domain invariants**: when fields or states constrain each other, make those constraints explicit. Derive invalid states from the requirements, not from a preferred type shape. Use the language's types, controlled construction, or validated transitions to prevent those states. Keep runtime checks for constraints that types cannot express. Do not remove states that the requirements permit, such as cached data during a refresh when the product allows it. Avoid wrappers that enforce no domain constraint.
- **Closed value sets**: code compares or branches on a string or number literal from a fixed set. Examples include `equals("ACTIVE")`, `==`, and `switch`. Fixed sets include states, categories, modes, and action types. A typing error in such a literal fails without an error. First look for an existing enum of that set, and use it. If the set is new, add an enum, or the nearest form in the language, such as a union type. Parse an external string into the enum once, at the trust boundary. If the project already compares the values of that set as literals, follow the project. This rule does not cover display text, log text, or a one-off label that drives no branching and no storage. It does not cover an open set, such as values that end users define.
- **Parsing and validation**: Parse and validate external data at each trust boundary. Inside that boundary, reuse explicit validated values instead of repeatedly guessing their shape or supplying speculative defaults. Enforce domain invariants in domain operations, including calls from background jobs or other entry points. Recheck constraints that depend on mutable state when performing the operation. Use transactions, conditional writes, or equivalent mechanisms when correctness requires an atomic check and update. Keep authorization checks at the operations that require them.
- **Shared mutable state**: when concurrent writers can interfere, first check whether they need the same mutable resource. Prefer task-local state, immutable values, and separate resources before adding synchronization. When sharing is necessary, define who may write and enforce that ownership through structure or a concurrency mechanism. A process-local lock does not protect writes from other processes. Verify the mechanism against the actual competing writers, including replicas when applicable.
- **Repeated execution**: When writes can be retried, redelivered, or resumed after interruption, define their repeated-execution behavior. Where the contract requires one effect, prevent duplicates across retries and partial failures. An idempotency key alone does not make the effect and its completion record atomic. Verify duplicate calls and interruption between those steps, plus concurrent delivery when applicable. If safe retry is unavailable, state the restriction and recovery path instead of adding automatic retries. Do not require idempotency for operations whose contract does not need it.
- **Compiler and type checks**: fix the cause of a compiler or type error instead of bypassing the check. Do not use unchecked casts, broad types, or disabled checks merely to hide a defect. If an interop or tool limitation requires an exception, keep it local and record the reason and safety evidence. A type assertion is not runtime validation.

Use Test design, below, to select or extend the smallest check that proves each applicable constraint. For state constraints, check both permitted and rejected states or transitions. For input boundaries, check invalid external data and alternate entry points where relevant. Do not add duplicate tests or new tooling solely for this checklist. Record necessary exceptions and their evidence in the Execution Record.

Attach each finding to a requirement or a concrete risk, not a preference for purity or abstraction. Use P0 or P1 when the code-reviewer severity rules require it. Otherwise, a design problem that causes a defect is **P2**. Examples are code that no test can cover and a broken contract. Any other design problem is **P3**.

## Test design

These rules stop duplicate tests. They apply to each test that you add or extend. If the project's test conventions decide how to split tests or at which level to test, follow them. Do not combine, move, or delete an existing test only to follow these rules.
- **Search first**: before you add a test, find the tests that already cover the behavior. Look in the tests of the code that you change and of its direct callers. If a test covers the behavior completely, add nothing, and cite that test. If it covers the behavior in part, add a case or an assertion to it. To add a case, you may turn it into a parameterized test, if every old case stays. A test that passed before your change does not prove a new or changed behavior.
- **Split by behavior**: write a test per behavior or rule, not per method or per branch. If several inputs of one behavior take the same setup and the same form of assertion, write one parameterized test. Examples are JUnit `@ParameterizedTest`, pytest `parametrize`, and Jest `test.each`. Use this form only when the project's test framework supports it. An outcome with another form of assertion, such as an error, gets its own test.
- **Lowest level**: assert each behavior once, at the lowest level that can prove it. A level that fakes the part where the risk lies cannot prove it. Use a higher-level test only for what a lower level cannot prove, such as wiring, transactions, serialization, and a user flow through the UI.
- **Nothing to prove**: test only what the project's own code or configuration decides. Do not test a framework or a library itself, plain getters and setters, or generated code.

Give each new test a one-line reason in the Execution Record. The reason names the behavior that the test covers, and why no existing test covers it. The new tests of one new class or module may share one line. A case or an assertion that you add to an existing test needs no reason. If you find existing tests that duplicate each other, report them as a cleanup candidate for `BACKLOG.md`. Do not change them. In a code review, a break of these rules is **P3**.
