# Third-Party Notices

AIPilot 2.1.0 includes the following vendored open-source components so its
document-review workflow can run without downloading packages at runtime.

## ezreview 1.0.0

- Source: https://github.com/JililiDD/ezreview
- Published package: https://www.npmjs.com/package/ezreview/v/1.0.0 (`dist/ezreview.mjs`)
- Files: `skills/workflow-orchestrator/vendor/ezreview/`
- License: MIT
- License text: `skills/workflow-orchestrator/vendor/ezreview/LICENSE`

## marked 18.0.6

- Source: https://github.com/markedjs/marked
- Files: `skills/workflow-orchestrator/vendor/marked/`
- License: MIT
- License text: `skills/workflow-orchestrator/vendor/marked/LICENSE`

## mermaid 11.17.2

- Source: https://github.com/mermaid-js/mermaid
- Published package: https://www.npmjs.com/package/mermaid/v/11.17.2 (`dist/mermaid.min.js`)
- Files: `skills/workflow-orchestrator/vendor/mermaid/`
- License: MIT
- License text: `skills/workflow-orchestrator/vendor/mermaid/LICENSE`
- The bundle also contains Mermaid's npm dependencies, under their own licenses:
  MIT for most, ISC for `d3`, BSD-3-Clause for `d3-sankey`, and
  MPL-2.0 or Apache-2.0 for `dompurify`, whose notice stays in the bundle.

The corresponding version files and license texts are distributed with the
plugin. AIPilot's test suite also verifies the expected ezreview payload and
checksums.
