#!/usr/bin/env node
// UserPromptSubmit hook for AI Pilot JL. Fail-safe: any error emits empty output.
// Static injection — the model judges relevance for both correction capture and
// session-review from the full message, so no prompt inspection is needed here.

try {
  const { correctionCaptureContext } = require('./workflow-config');
  const { writeHookOutput } = require('./workflow-runtime');

  writeHookOutput(correctionCaptureContext);
} catch (_e) {
  process.stdout.write('{}');
}
