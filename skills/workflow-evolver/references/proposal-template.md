# Evolution Proposal Template

Save proposals under `docs/aipilot/evolution/proposals/YYYY-MM-DD-short-title.md`.

```markdown
# Evolution Proposal: <title>

## Source Signals

- <signal timestamp or summary>

## Pattern Observed

<What recurring failure, correction, or stale rule was observed?>

## Proposed Rule Change

<Exact rule text or edit summary.>

## Target File and Tier

- `<path>` — project tier (`agent-guideline.md`, project docs, hooks: Apply Mode edits directly) | plugin tier (skill files: Apply Mode produces a patch recommendation; the user applies it to the plugin)

## Why This Prevents Recurrence

<Explain how the rule would have changed agent behavior.>

## Risk of Overfitting

<What could become too rigid or wrong?>

## Recommendation

Apply | Revise | Discard | Watch

## Apply Checklist

- [ ] User approved proposal.
- [ ] Target file updated.
- [ ] `CHANGELOG.md at the documents root` updated if workflow behavior changed.
- [ ] Signal status updated if practical.
```
