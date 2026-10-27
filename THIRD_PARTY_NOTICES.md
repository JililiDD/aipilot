# Third-Party Notices

AIPilot 2.5.0 includes the following vendored open-source components so its
document-review workflow can run without downloading packages at runtime.

## ezreview 1.0.1

- Source: https://github.com/JililiDD/ezreview/releases/tag/v1.0.1 (commit `73cf7f23962a6f13ed15c78aedf7070ba2aa0fa2`)
- Published package: https://www.npmjs.com/package/ezreview/v/1.0.1
- Standalone `dist/ezreview.mjs` is not included in the npm tarball. The vendored file was built from the tagged source using `npm ci --ignore-scripts` and `npm run build:standalone`; its SHA-256 is checked in the test suite.
- Files: `skills/workflow-orchestrator/vendor/ezreview/`
- License: MIT
- License text: `skills/workflow-orchestrator/vendor/ezreview/LICENSE`

## marked 18.0.6

- Source: https://github.com/markedjs/marked
- Files: `skills/workflow-orchestrator/vendor/marked/`
- License: MIT
- License text: `skills/workflow-orchestrator/vendor/marked/LICENSE`

## mermaid 12.2.0

- Source: https://github.com/mermaid-js/mermaid
- Published package: https://www.npmjs.com/package/mermaid/v/12.2.0 (`dist/mermaid.min.js`)
- Files: `skills/workflow-orchestrator/vendor/mermaid/`
- License: MIT
- License text: `skills/workflow-orchestrator/vendor/mermaid/LICENSE`
- The bundle includes `elkjs` 0.9.3 for ELK layout, under EPL-2.0.
  The `elkjs` 0.9.3 source code is available under EPL-2.0 at
  https://github.com/kieler/elkjs and
  https://www.npmjs.com/package/elkjs/v/0.9.3.
  License text: `skills/workflow-orchestrator/vendor/mermaid/ELKJS-LICENSE.md`.
- Other bundled Mermaid dependencies retain their own licenses: MIT for most,
  ISC for `d3`, BSD-3-Clause for `d3-sankey`, and MPL-2.0 or Apache-2.0
  for `dompurify`, whose notice stays in the bundle.

The corresponding version files and license texts are distributed with the
plugin. AIPilot's test suite also verifies the expected ezreview payload and
checksums.
