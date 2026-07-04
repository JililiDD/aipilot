# Evolution Signal Schema

Use JSON Lines for `docs/aipilot/evolution/signals.jsonl`.

Each line is one JSON object.

## Required Fields

```json
{
  "timestamp": "2026-06-22T00:00:00-07:00",
  "source": "aipilot-jl-product-spec-builder",
  "event": "user_correction",
  "summary": "User corrected an agent assumption.",
  "candidate_rule_area": "question-bank",
  "status": "pending"
}
```

## Field Guide

- `timestamp`: ISO-like timestamp with timezone when possible.
- `source`: skill, file, or workflow stage where the signal appeared.
- `event`: `user_correction`, `review_failure`, `misroute`, `stale_rule`, `missing_gate`, or `other`.
- `summary`: short factual summary.
- `candidate_rule_area`: likely target such as `AGENTS.md`, `agent-guideline.md`, `aipilot-jl-product-spec-builder`, `aipilot-jl-design-spec-builder`, `aipilot-jl-dev-plan-builder`, or `hook`.
- `status`: `pending`, `proposed`, `applied`, `discarded`, or `watch`.

## Good Signals

```json
{"timestamp":"2026-06-22T14:00:00-07:00","source":"aipilot-jl-product-spec-builder","event":"user_correction","summary":"User rejected fixed 3-5 question batches and prefers asking the smallest useful number of questions.","candidate_rule_area":"aipilot-jl-product-spec-builder","status":"applied"}
```

## Bad Signals

Do not record product facts:

```json
{"summary":"The app should support 4K export."}
```

That belongs in `product-spec.md` and the work-item's own sections.
