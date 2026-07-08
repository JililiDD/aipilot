// AI Pilot JL hook context — POINTERS, not rule copies. The authoritative rules
// live in the documents root (document-system-spec.md) and the
// aipilot-jl-workflow-orchestrator skill. Keep these short so they never drift.

// Correction capture and session-review both hand judgment to the model, which
// sees the full message and conversation — no pattern list, no language bias.

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
<ai-pilot-note>
If this message corrects workflow behavior or states a durable preference, route it per the constitution (workflow-rule defect → one line in evolution/signals.jsonl; project pit → lessons.md; product fact → spec/work-item). If the user is wrapping up the session, additionally run aipilot-jl-workflow-evolver Signal Capture Mode as a session review — append a signal only if it would improve future behavior. Briefly say if you recorded one. Otherwise ignore this note.
</ai-pilot-note>
`;

module.exports = {
  correctionCaptureContext,
  sessionStartContext,
};
