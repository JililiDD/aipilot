---
description: The code reviewer reports a private method that a new class puts between two public methods.
tags: [review, layout]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill]
---

Use the AIPilot `code-reviewer` skill to run this code review. This project has no repository and no files on disk. Everything that you need is in this message. Do not ask for more input. Reply with the review.

Review request:

- Target work-item: `2026-11-12-1100-trade-report-lines.md`
- Review scope: final
- Review anchor: an explicit file list, because the project has no repository. `TradeReportBuilder.java` is new. `TradeReportBuilderTest.java` is new.

The project has no `product-spec.md`, `design-spec.md`, `architecture.md`, or `memory/` files. The project has no other class that builds a report.

## Work-item `2026-11-12-1100-trade-report-lines.md`

```markdown
---
created: 2026-11-12 11:00
scope: New Feature
status: active
---

## Quick Overview

> **Summary:** The trade report has one line for each trade and one summary line.

## Requirement

### Existing Context
`TradeFormatter.format(Trade)` returns the text of one trade. `Trade` is an existing class.

### Scope
#### In scope
- The text of the trade report.

#### Out of scope
- Changes to `TradeFormatter`.

### Proposed Behavior
1. The report writes one line for each trade.
2. The report writes one summary line with the number of trades.

### Acceptance Criteria
- **AC-1 (Trade lines):** When the report receives trades, the system shall write one formatted line for each trade.
- **AC-2 (Summary line):** When the report receives trades, the system shall write a summary line with the number of trades.

## Plan

Execution granularity: whole work-item
Commit policy: manual
Test tiers: fast `gradle test --tests TradeReportBuilderTest` · full `gradle :reports:build` touched modules: reports

- [x] Task 1: Add `TradeReportBuilder` with `buildTradeLines` and `buildSummaryLine`. — Verify: `gradle test --tests TradeReportBuilderTest`
- [x] Task 2: Add the tests of AC-1 and AC-2. — Verify: `gradle test --tests TradeReportBuilderTest`

### Exit Criteria (work-item convergence)
- The full test tier passes in a fresh run: `gradle :reports:build`
- AC-1 and AC-2 are demonstrable by `TradeReportBuilderTest`.

### Stop Conditions (inherited by every level)
Stop and ask the user when:
- a required decision is missing.
- verification cannot run.
- the change would exceed Non-Goals.
- a destructive or irreversible action is required.

## Execution Record

Start: no repository. Starting file state: `TradeReportBuilder.java` and `TradeReportBuilderTest.java` do not exist. Commit policy: manual.

### Whole work-item — 2026-11-12
- **Changes**: Task 1 added `TradeReportBuilder`. Task 2 added `TradeReportBuilderTest`.
- **Tests**: `TradeReportBuilderTest` is new. It covers AC-1 and AC-2, and no test of the report existed.
- **Evidence**: `gradle test --tests TradeReportBuilderTest` printed `BUILD SUCCESSFUL`, 2 tests passed. `gradle :reports:build` printed `BUILD SUCCESSFUL`.

### Completion — 2026-11-12
- **Exit Criteria evidence**: `gradle :reports:build` printed `BUILD SUCCESSFUL` in a fresh run. `TradeReportBuilderTest` demonstrates AC-1 and AC-2.
- **Remaining Risks**: none.
```

## `TradeReportBuilder.java` (new file)

```java
package com.example.reports;

import java.util.List;

public class TradeReportBuilder {

  private static final String LINE_END = "\n";

  private final TradeFormatter tradeFormatter;

  public TradeReportBuilder(TradeFormatter tradeFormatter) {
    this.tradeFormatter = tradeFormatter;
  }

  public String buildTradeLines(List<Trade> trades) {
    StringBuilder tradeLines = new StringBuilder();
    for (Trade trade : trades) {
      tradeLines.append(formatTradeLine(trade));
    }
    return tradeLines.toString();
  }

  private String formatTradeLine(Trade trade) {
    return tradeFormatter.format(trade) + LINE_END;
  }

  public String buildSummaryLine(List<Trade> trades) {
    return "Trades: " + trades.size() + LINE_END;
  }
}
```

## `TradeReportBuilderTest.java` (new file)

```java
package com.example.reports;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;

class TradeReportBuilderTest {

  private final TradeFormatter tradeFormatter = mock(TradeFormatter.class);
  private final TradeReportBuilder tradeReportBuilder = new TradeReportBuilder(tradeFormatter);

  @Test
  void buildTradeLinesGivenTwoTradesShouldWriteOneLineForEachTradeTest() {
    Trade buyTrade = new Trade("T-1");
    Trade sellTrade = new Trade("T-2");
    when(tradeFormatter.format(buyTrade)).thenReturn("T-1 BUY");
    when(tradeFormatter.format(sellTrade)).thenReturn("T-2 SELL");

    String tradeLines = tradeReportBuilder.buildTradeLines(List.of(buyTrade, sellTrade));

    assertEquals("T-1 BUY\nT-2 SELL\n", tradeLines);
  }

  @Test
  void buildSummaryLineGivenTwoTradesShouldWriteTradeCountTest() {
    Trade buyTrade = new Trade("T-1");
    Trade sellTrade = new Trade("T-2");

    String summaryLine = tradeReportBuilder.buildSummaryLine(List.of(buyTrade, sellTrade));

    assertEquals("Trades: 2\n", summaryLine);
  }
}
```
