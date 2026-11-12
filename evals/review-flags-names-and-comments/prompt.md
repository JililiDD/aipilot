---
description: The code reviewer reports breaks of Code naming and Code text as findings, not as style preferences.
tags: [review, naming]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill]
---

Use the AIPilot `code-reviewer` skill to run this code review. This project has no repository and no files on disk. Everything that you need is in this message. Do not ask for more input. Reply with the review.

Review request:

- Target work-item: `2026-11-10-0915-list-enabled-instruments.md`
- Review scope: final
- Review anchor: an explicit file list, because the project has no repository. The changed files are `InstrumentService.java` and `InstrumentServiceTest.java`. Both files are new.

The project has no `product-spec.md`, `design-spec.md`, `architecture.md`, or `memory/` files.

## Work-item `2026-11-10-0915-list-enabled-instruments.md`

```markdown
---
created: 2026-11-10 09:15
scope: New Feature
status: active
---

## Quick Overview

> **Summary:** The service lists the instruments of every enabled exchange.

## Requirement

### Existing Context
`InstrumentReader` reads the instruments of one exchange. `ExchangeConfiguration` holds the code of an exchange and its enabled flag.

### Scope
#### In scope
- A service method that lists the instruments of every enabled exchange.

#### Out of scope
- Changes to `InstrumentReader`.

### Proposed Behavior
1. The caller passes the exchange configurations.
2. The service reads the instruments of each enabled exchange.
3. The service returns all of these instruments in one list.

### Acceptance Criteria
- **AC-1 (Enabled only):** When the caller requests the instruments, the system shall return the instruments of each enabled exchange.
- **AC-2 (Disabled skipped):** If an exchange is disabled, then the system shall return no instrument of that exchange.

## Plan

Execution granularity: whole work-item
Commit policy: manual
Test tiers: fast `gradle test --tests InstrumentServiceTest` · full `gradle :core:build` touched modules: core

- [x] Task 1: Add `InstrumentService` with the list method. — Verify: `gradle test --tests InstrumentServiceTest`
- [x] Task 2: Add the tests of AC-1 and AC-2. — Verify: `gradle test --tests InstrumentServiceTest`

### Exit Criteria (work-item convergence)
- The full test tier passes in a fresh run: `gradle :core:build`
- AC-1 and AC-2 are demonstrable by `InstrumentServiceTest`.

### Stop Conditions (inherited by every level)
Stop and ask the user when:
- a required decision is missing.
- verification cannot run.
- the change would exceed Non-Goals.
- a destructive or irreversible action is required.

## Execution Record

Start: no repository. Starting file state: `InstrumentService.java` and `InstrumentServiceTest.java` do not exist. Commit policy: manual.

### Whole work-item — 2026-11-10
- **Changes**: Task 1 added `InstrumentService`. Task 2 added `InstrumentServiceTest`.
- **Tests**: `InstrumentServiceTest` is new. It covers AC-1 and AC-2, and no test of this behavior existed.
- **Evidence**: `gradle test --tests InstrumentServiceTest` printed `BUILD SUCCESSFUL`, 2 tests passed. `gradle :core:build` printed `BUILD SUCCESSFUL`.

### Completion — 2026-11-10
- **Exit Criteria evidence**: `gradle :core:build` printed `BUILD SUCCESSFUL` in a fresh run. `InstrumentServiceTest` demonstrates AC-1 and AC-2.
- **Remaining Risks**: none.
```

## `InstrumentService.java` (new file)

```java
package com.example.core;

import java.util.ArrayList;
import java.util.List;

public class InstrumentService {

  private final InstrumentReader reader;

  public InstrumentService(InstrumentReader reader) {
    this.reader = reader;
  }

  /**
   * This method goes through every exchange configuration that the caller passes in and, for each one of them that is currently enabled, it asks the reader for the instruments and then puts all of them together into one single list that it finally hands back to the caller.
   */
  public List<Instrument> findInstrumentsOfEnabledExchanges(List<ExchangeConfiguration> configurationList) {
    List<ExchangeConfiguration> enabled = new ArrayList<>();
    for (ExchangeConfiguration exchangeConfiguration : configurationList) {
      if (exchangeConfiguration.isEnabled()) {
        enabled.add(exchangeConfiguration);
      }
    }
    List<Instrument> instruments = new ArrayList<>();
    for (ExchangeConfiguration exchangeConfiguration : enabled) {
      instruments.addAll(reader.readInstruments(exchangeConfiguration.getExchangeCode()));
    }
    return instruments;
  }
}
```

## `InstrumentServiceTest.java` (new file)

```java
package com.example.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;

class InstrumentServiceTest {

  private final InstrumentReader instrumentReader = mock(InstrumentReader.class);
  private final InstrumentService instrumentService = new InstrumentService(instrumentReader);

  @Test
  void findInstrumentsOfEnabledExchangesGivenEnabledExchangeShouldReturnItsInstrumentsTest() {
    Instrument instrument = new Instrument("AAPL");
    when(instrumentReader.readInstruments("XNAS")).thenReturn(List.of(instrument));

    List<Instrument> instruments =
        instrumentService.findInstrumentsOfEnabledExchanges(List.of(new ExchangeConfiguration("XNAS", true)));

    assertEquals(List.of(instrument), instruments);
  }

  @Test
  void findInstrumentsOfEnabledExchangesGivenDisabledExchangeShouldReturnNoInstrumentTest() {
    List<Instrument> instruments =
        instrumentService.findInstrumentsOfEnabledExchanges(List.of(new ExchangeConfiguration("XLON", false)));

    assertEquals(List.of(), instruments);
  }
}
```
