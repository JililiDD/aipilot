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

// Minimal stdin reader — used only where a hook still inspects the prompt.
function readPrompt(callback) {
  let input = '';
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(input.replace(/^\uFEFF/, ''));
      callback(String(data && data.prompt ? data.prompt : ''));
    } catch (_e) {
      writeHookOutput('');
    }
  });
}

module.exports = { writeHookOutput, readPrompt };
