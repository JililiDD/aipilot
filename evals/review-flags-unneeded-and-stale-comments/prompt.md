---
description: The code reviewer reports a comment that repeats the code, describes the change, repeats a signature, or went stale. It does not report a comment that states a reason.
tags: [review, comments]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill]
---

Use the AIPilot `code-reviewer` skill to run this code review. This project has no repository and no files on disk. Everything that you need is in this message. Do not ask for more input. Reply with the review.

Review request:

- Target work-item: `2026-11-16-1000-raise-quote-age-limit.md`
- Review scope: final
- Review anchor: an explicit file list, because the project has no repository. The changed files are `QuoteFilter.java` and `QuoteFilterTest.java`. This message shows `QuoteFilter.java` before the change and after the change.

The project has no `product-spec.md`, `design-spec.md`, `architecture.md`, or `memory/` files.

## Work-item `2026-11-16-1000-raise-quote-age-limit.md`

```markdown
---
created: 2026-11-16 10:00
scope: Existing Change
status: active
---

## Quick Overview

> **Summary:** The quote filter keeps quotes of up to 60 seconds and drops heartbeat quotes.

## Requirement

### Existing Context
`QuoteFilter.findFreshQuotes` keeps the quotes that are at most 30 seconds old. `Quote.getQuoteTime()` returns an `Instant`. `Quote.getPrice()` returns a `BigDecimal`. The feed sends a quote with a price of zero as a heartbeat. Only classes of the `quotes` module call `QuoteFilter`.

### Scope
#### In scope
- The age limit of `QuoteFilter`.
- The heartbeat quotes in `QuoteFilter`.

#### Out of scope
- Changes to `Quote`.

### Proposed Behavior
1. The filter keeps each quote that is at most 60 seconds old.
2. The filter drops each quote with a price of zero.

### Acceptance Criteria
- **AC-1 (Age limit):** When a quote is at most 60 seconds old, the system shall keep it.
- **AC-2 (Old quote):** If a quote is older than 60 seconds, then the system shall drop it.
- **AC-3 (Heartbeat):** If a quote has a price of zero, then the system shall drop it.

## Plan

Execution granularity: whole work-item
Commit policy: manual
Test tiers: fast `gradle test --tests QuoteFilterTest` · full `gradle :quotes:build` touched modules: quotes

- [x] Task 1: Raise `MAX_QUOTE_AGE` to 60 seconds. — Verify: `gradle test --tests QuoteFilterTest`
- [x] Task 2: Add `isHeartbeat`, and drop each heartbeat quote in `findFreshQuotes`. — Verify: `gradle test --tests QuoteFilterTest`
- [x] Task 3: Change the age tests to 60 seconds, and add the test of AC-3. — Verify: `gradle test --tests QuoteFilterTest`

### Exit Criteria (work-item convergence)
- The full test tier passes in a fresh run: `gradle :quotes:build`
- AC-1, AC-2, and AC-3 are demonstrable by `QuoteFilterTest`.

### Stop Conditions (inherited by every level)
Stop and ask the user when:
- a required decision is missing.
- verification cannot run.
- the change would exceed Non-Goals.
- a destructive or irreversible action is required.

## Execution Record

Start: no repository. Starting file state: `QuoteFilter.java` and `QuoteFilterTest.java` exist. Commit policy: manual.

### Whole work-item — 2026-11-16
- **Changes**: Task 1 raised `MAX_QUOTE_AGE` to 60 seconds. Task 2 added `isHeartbeat` and the heartbeat check. Task 3 changed `QuoteFilterTest`.
- **Tests**: The requirement changed the age limit, so the two age tests now use 60 and 61 seconds. `findFreshQuotesGivenZeroPriceShouldDropQuoteTest` is new. It covers AC-3, and no test of a zero price existed.
- **Evidence**: `gradle test --tests QuoteFilterTest` printed `BUILD SUCCESSFUL`, 3 tests passed. `gradle :quotes:build` printed `BUILD SUCCESSFUL`.

### Completion — 2026-11-16
- **Exit Criteria evidence**: `gradle :quotes:build` printed `BUILD SUCCESSFUL` in a fresh run. `QuoteFilterTest` demonstrates AC-1, AC-2, and AC-3.
- **Remaining Risks**: none.
```

## `QuoteFilter.java` before the change

```java
package com.example.quotes;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class QuoteFilter {

  private static final Duration MAX_QUOTE_AGE = Duration.ofSeconds(30);

  private final Clock clock;

  public QuoteFilter(Clock clock) {
    this.clock = clock;
  }

  /**
   * Returns the quotes that are at most 30 seconds old.
   */
  public List<Quote> findFreshQuotes(List<Quote> quotes) {
    Instant now = clock.instant();
    List<Quote> freshQuotes = new ArrayList<>();
    for (Quote quote : quotes) {
      if (Duration.between(quote.getQuoteTime(), now).compareTo(MAX_QUOTE_AGE) <= 0) {
        freshQuotes.add(quote);
      }
    }
    return freshQuotes;
  }
}
```

## `QuoteFilter.java` after the change

```java
package com.example.quotes;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class QuoteFilter {

  // Raised from 30 seconds to 60 seconds.
  private static final Duration MAX_QUOTE_AGE = Duration.ofSeconds(60);

  private final Clock clock;

  public QuoteFilter(Clock clock) {
    this.clock = clock;
  }

  /**
   * Returns the quotes that are at most 30 seconds old.
   */
  public List<Quote> findFreshQuotes(List<Quote> quotes) {
    Instant now = clock.instant();
    List<Quote> freshQuotes = new ArrayList<>();
    for (Quote quote : quotes) {
      // Skip the quote if it is a heartbeat.
      if (isHeartbeat(quote)) {
        continue;
      }
      if (Duration.between(quote.getQuoteTime(), now).compareTo(MAX_QUOTE_AGE) <= 0) {
        freshQuotes.add(quote);
      }
    }
    return freshQuotes;
  }

  /**
   * Checks if the quote is a heartbeat.
   *
   * @param quote the quote
   * @return true if the quote is a heartbeat
   */
  private boolean isHeartbeat(Quote quote) {
    // The feed sends a price of zero as a heartbeat, not as a trade price.
    return quote.getPrice().signum() == 0;
  }
}
```

## `QuoteFilterTest.java` after the change

The two age tests are changed. `findFreshQuotesGivenZeroPriceShouldDropQuoteTest` is new.

```java
package com.example.quotes;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class QuoteFilterTest {

  private static final Instant NOW = Instant.parse("2026-11-16T10:00:00Z");

  private final QuoteFilter quoteFilter = new QuoteFilter(Clock.fixed(NOW, ZoneOffset.UTC));

  @Test
  void findFreshQuotesGivenQuoteOfSixtySecondsShouldKeepQuoteTest() {
    Quote quote = new Quote("AAPL", new BigDecimal("101.50"), NOW.minusSeconds(60));

    assertEquals(List.of(quote), quoteFilter.findFreshQuotes(List.of(quote)));
  }

  @Test
  void findFreshQuotesGivenQuoteOfSixtyOneSecondsShouldDropQuoteTest() {
    Quote quote = new Quote("AAPL", new BigDecimal("101.50"), NOW.minusSeconds(61));

    assertEquals(List.of(), quoteFilter.findFreshQuotes(List.of(quote)));
  }

  @Test
  void findFreshQuotesGivenZeroPriceShouldDropQuoteTest() {
    Quote quote = new Quote("AAPL", BigDecimal.ZERO, NOW.minusSeconds(1));

    assertEquals(List.of(), quoteFilter.findFreshQuotes(List.of(quote)));
  }
}
```
