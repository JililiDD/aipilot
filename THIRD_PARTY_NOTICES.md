# Third-Party Notices

AIPilot 1.1.1 includes the following vendored open-source components so its
document-review workflow can run without downloading packages at runtime.

## ezreview 0.2.2

- Source: https://github.com/JililiDD/ezreview
- Published package: https://www.npmjs.com/package/ezreview/v/0.2.2 (`dist/ezreview.mjs`)
- Files: `skills/workflow-orchestrator/vendor/ezreview/`
- License: MIT
- License text: `skills/workflow-orchestrator/vendor/ezreview/LICENSE`

## marked 18.0.6

- Source: https://github.com/markedjs/marked
- Files: `skills/workflow-orchestrator/vendor/marked/`
- License: MIT
- License text: `skills/workflow-orchestrator/vendor/marked/LICENSE`

The corresponding version files and license texts are distributed with the
plugin. AIPilot's test suite also verifies the expected ezreview payload and
checksums.
