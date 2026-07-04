// AI Pilot JL hook context — POINTERS, not rule copies. The authoritative rules
// live in the documents root (document-system-spec.md) and the
// aipilot-jl-workflow-orchestrator skill. Keep these short so they never drift.

// Only session-review still inspects the prompt: its value is being time-bound
// to wrap-up moments. Correction capture is unconditional (the model, which sees
// the full message, decides) so it needs no pattern list.
const endIntentPatterns = [
  /wrap\s*up/i,
  /stop\s*here/i,
  /done\s*for\s*now/i,
  /finish\s*(this\s*)?session/i,
  /session[-\s]?review/i,
  /that'?s (it|enough) for (today|now)/i,
];

const sessionStartContext = `
<ai-pilot-session-start>
This project may use AI Pilot JL, a document-driven development workflow. This note only registers that it exists — it does not require using it.

If (and only if) the user wants to build, plan, spec, review, or release something:
1. Read the project-root \`AGENTS.md\` for a \`Documents root:\` line under an \`## AI Pilot JL\` heading; absent, default to \`docs/aipilot/\` (an explicit file read; do not search \`CLAUDE.md\`).
2. If that root exists, read \`document-system-spec.md\` there and follow the \`aipilot-jl-workflow-orchestrator\` skill — it, not this note, governs startup, routing, and gates.
3. If it does not exist, \`/aipilot\` handles cold start.

For anything else — a quick question, a typo fix, casual chat — just help normally; do not route it through the workflow.
</ai-pilot-session-start>
`;

const correctionCaptureContext = `
<ai-pilot-correction-capture>
If this message corrects the workflow's behavior, rejects an assumption, or states a durable preference, route it to its home (see the constitution for exact files): a product fact → \`product-spec.md\` or the work-item; a discovered project constraint → \`lessons.md\`; an implementation fact → \`CHANGELOG.md\` via the normal flow; a reusable workflow-rule defect → one concise JSONL line in \`evolution/signals.jsonl\` (\`aipilot-jl-workflow-evolver\` analyzes later; no proposal unless the user asks). If it's none of these, ignore this note. Say briefly whether you recorded a signal.
</ai-pilot-correction-capture>
`;

const sessionReviewContext = `
<ai-pilot-session-review>
The user seems to be wrapping up. Before the final response, run \`aipilot-jl-workflow-evolver\` Signal Capture Mode if available: review the session for workflow-rule defects, recurring failures, or durable preferences; append a concise signal to \`evolution/signals.jsonl\` only if it would improve future behavior (project pits go to \`lessons.md\`); no proposal unless asked; report whether a signal was added or skipped.
</ai-pilot-session-review>
`;

module.exports = {
  correctionCaptureContext,
  endIntentPatterns,
  sessionReviewContext,
  sessionStartContext,
};
