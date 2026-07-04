#!/usr/bin/env node
// SessionStart hook for AI Pilot. Fail-safe: any error emits empty output and
// exits cleanly — a broken hook must never disrupt the host session.

try {
  const { sessionStartContext } = require('./workflow-config');
  const { writeHookOutput } = require('./workflow-runtime');
  writeHookOutput(sessionStartContext, 'SessionStart');
} catch (_e) {
  process.stdout.write('{}');
}
