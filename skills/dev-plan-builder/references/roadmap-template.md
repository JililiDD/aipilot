# Roadmap Template

Use this structure for `dev-phase-plan.md`. It is a map, not a plan of record. Story and task detail lives in each phase's work-item. The map holds only decisions that cannot be derived. The rest comes from other sources:

- Read the current state (next phase, active work-item) off the phase statuses and pointers. Never store it separately.
- Read parallelism off the Depends-on lines.
- Scan reuse again at breakdown time, into the Reuse Notes of each work-item. Never snapshot it here.

```markdown
# Development Phase Roadmap

## Source Documents
- product-spec.md <version/date>
- design-spec.md <version/date, if UI>

## Phases

### Phase 1: <name>  [planned | in-progress | merged]
- Goal: <one sentence>
- Verifiable outcome: <what can be inspected when done>
- Depends on: <phases or none>
- Enables: <what later phases can only build after this is verified>
- Work-item: <filename only, e.g. 2026-07-03-0910-phase-2-import.md — backfilled when derived; never a directory path. Locate it by status: merged → work-items/merged/, otherwise the work-items top level. Filenames never change, so this pointer is written once and stays valid.>

### Phase 2: <name>  [planned]
...

## Testing Strategy
<project-level: what classes of verification, what infrastructure>

## Review Strategy
<what reviewers focus on per phase category>

## Risks and Fallbacks
<risk → mitigation or fallback>
```
