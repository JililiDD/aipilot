---
description: The arbiter's approach pre-check finds a premise that the code contradicts, and does not rule Keep.
tags: [planning, approach]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill]
---

Use the AIPilot `dev-plan-builder` skill in Arbitration Mode. Run an approach pre-check on the approach choice in the work-item below. No Approach Challenge exists. This project has no files on disk. The work-item and the code are in this message. Do not ask for more input. Reply with your ruling.

## Work-item `2026-11-11-1410-cancel-running-jobs.md`

```markdown
---
created: 2026-11-11 14:10
scope: New Feature
status: active
---

## Quick Overview

> **Summary:** An operator can cancel a running job. The job stops within five seconds.

## Requirement

### Existing Context
`JobRunner` runs every job. A job is a list of steps, or one export.

### Scope
#### In scope
- Cancellation of every kind of running job.

#### Out of scope
- Cancellation of a queued job.

### Proposed Behavior
1. The operator cancels a running job.
2. The job stops within five seconds.

### Acceptance Criteria
- **AC-1 (Cancel):** When the operator cancels a running job, the system shall stop the job within five seconds.

## Plan

Execution granularity: whole work-item
Commit policy: manual
Test tiers: fast `gradle test` · full `gradle :jobs:build` touched modules: jobs

### Approach Decisions

#### How the job stops (AC-1)

| Candidate | How it works | Strengths | Weaknesses | Result |
|---|---|---|---|---|
| Cancel flag in the step loop | The loop in `JobRunner` reads a cancel flag before each step. | reuse, blast radius | none | **Chosen** |
| Interrupt the worker thread | The scheduler interrupts the thread that runs the job. | covers a blocking call | blast radius | Dropped: blast radius |

Premises:
- (P1) Every running job passes through the step loop in `JobRunner`. [verified: read `JobRunner.java`]
- (P2) No step runs longer than five seconds. [unverified: Task 1.1 checks it]

### User Story 1: Cancel a running job   (AC: AC-1)
Tests: full
- [ ] Task 1.1: Measure the longest step on the sample jobs. — Verify: Run the timing test and read the maximum.
- [ ] Task 1.2: Add the cancel flag, and read it before each step. — Verify: `gradle test --tests JobRunnerTest`
Done when: All task verifies pass. AC-1 is demonstrable by `JobRunnerTest`.
```

## `JobRunner.java` (existing code)

```java
package com.example.jobs;

public class JobRunner {

  private final ExportClient exportClient;

  public JobRunner(ExportClient exportClient) {
    this.exportClient = exportClient;
  }

  public void run(Job job) {
    if (job.isExport()) {
      // One blocking call. A full export takes several minutes.
      exportClient.exportAll(job);
      return;
    }
    for (JobStep jobStep : job.getJobSteps()) {
      jobStep.execute();
    }
  }
}
```
