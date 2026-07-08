// AI Pilot JL hook runtime — output adapter only. Emits injected context in the
// shape each host runtime expects (Cursor / Claude / Antigravity / others).

const { detectHost } = require('./plugin-root');

function writeHookOutput(context, hookEventName = 'UserPromptSubmit') {
  if (!context) {
    process.stdout.write('{}');
    return;
  }

  const host = detectHost();

  if (host === 'cursor') {
    process.stdout.write(JSON.stringify({ additional_context: context }));
    return;
  }

  if (host === 'claude' || host === 'antigravity') {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName, additionalContext: context },
    }));
    return;
  }

  process.stdout.write(JSON.stringify({ additionalContext: context }));
}

module.exports = { writeHookOutput };
