---
description: The planner lists real candidates, each with a source and a "Choose this if" condition, and finds the existing project practice.
tags: [planning, approach]
max_turns: 50
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill]
---

Use the AIPilot `dev-plan-builder` skill in Breakdown Mode for the work-item below. Goal mode is chosen for this session, so ask nothing and record each unknown as an assumption. This project has no files on disk, so you cannot write the Plan to a file. Reply with only the `### Approach Decisions` subsection of the Plan. The work-item and all of the relevant code are in this message.

## Work-item `2026-11-12-1105-drop-duplicate-price-events.md`

```markdown
---
created: 2026-11-12 11:05
scope: Existing Change
status: active
---

## Quick Overview

> **Summary:** The price consumer drops a price event that it already handled.

## Requirement

### Existing Context
The broker can deliver a price event more than once. `PriceEventConsumer` handles each delivery. A duplicate delivery arrives within one hour of the first one. The service runs as one instance.

### Scope
#### In scope
- `PriceEventConsumer`.

#### Out of scope
- Changes to the broker configuration.

### Proposed Behavior
1. The consumer receives a price event.
2. If the consumer already handled an event with the same event ID, it drops the event.
3. Otherwise, it handles the event.

### Acceptance Criteria
- **AC-1 (Drop duplicate):** If a price event has the event ID of an event handled in the last hour, then the system shall drop it.
- **AC-2 (Handle new):** When a price event has a new event ID, the system shall handle it.

### Deferred Choices
- `[plan]` How the consumer remembers the handled event IDs. Constraints: the memory covers at least one hour, and it does not grow without limit.
```

## `PriceEventConsumer.java` (the class to change)

```java
package com.example.prices;

public class PriceEventConsumer {

  private final PriceUpdater priceUpdater;

  public PriceEventConsumer(PriceUpdater priceUpdater) {
    this.priceUpdater = priceUpdater;
  }

  public void consume(PriceEvent priceEvent) {
    priceUpdater.updatePrice(priceEvent);
  }
}
```

## `ExpiringKeyCache.java` (existing, in the shared `com.example.common` package)

```java
package com.example.common;

import java.time.Duration;

/** Remembers keys for a fixed time. Drops each key after that time. */
public class ExpiringKeyCache {

  public ExpiringKeyCache(Duration timeToLive, int maximumSize) {
    // ...
  }

  /** Returns true if the key was absent, and remembers it. */
  public boolean putIfAbsent(String key) {
    // ...
  }
}
```

## `TradeEventConsumer.java` (existing, unchanged)

```java
package com.example.trades;

import com.example.common.ExpiringKeyCache;
import java.time.Duration;

public class TradeEventConsumer {

  private final ExpiringKeyCache expiringKeyCache = new ExpiringKeyCache(Duration.ofHours(2), 500_000);
  private final TradeRecorder tradeRecorder;

  public TradeEventConsumer(TradeRecorder tradeRecorder) {
    this.tradeRecorder = tradeRecorder;
  }

  public void consume(TradeEvent tradeEvent) {
    if (!expiringKeyCache.putIfAbsent(tradeEvent.getTradeId())) {
      return;
    }
    tradeRecorder.recordTrade(tradeEvent);
  }
}
```
