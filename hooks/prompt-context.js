#!/usr/bin/env node
// UserPromptSubmit hook for AI Pilot. Fail-safe: any error emits empty output.
// Always injects the correction-capture note (the model judges relevance);
// adds the session-review note when the prompt signals wrap-up.

try {
  const { correctionCaptureContext, sessionReviewContext, endIntentPatterns } = require('./workflow-config');
  const { writeHookOutput, readPrompt } = require('./workflow-runtime');

  readPrompt(prompt => {
    const wrappingUp = endIntentPatterns.some(p => p.test(prompt));
    writeHookOutput(correctionCaptureContext + (wrappingUp ? sessionReviewContext : ''));
  });
} catch (_e) {
  process.stdout.write('{}');
}
