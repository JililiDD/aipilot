# AIPilot Release Checklist

## Repository

- [ ] Merge the release candidate into `main`.
- [ ] Confirm `git status --short` is empty.
- [ ] Run `node scripts/release-check.js`.
- [ ] Run `node scripts/validate-plugin-layout.js`.
- [ ] Run `node --test tests/plugin-layout.test.js`.
- [ ] Run current Claude, Codex, and Grok plugin validators.
- [ ] Confirm all public URLs resolve from the `main` branch.
- [ ] Confirm `THIRD_PARTY_NOTICES.md` matches the vendored versions and licenses.

## Release

- [ ] Create signed or annotated tag `v1.0.0`.
- [ ] Run `scripts/package-release.sh 1.0.0`.
- [ ] Verify the ZIP and SHA-256 file from a clean temporary directory.
- [ ] Publish the GitHub release using the `CHANGELOG.md` entry.

## Marketplace submissions

- [ ] Complete verified publisher identity requirements.
- [ ] Review the production logo in light and dark marketplace previews.
- [ ] Add marketplace screenshots if the target submission surface requests them.
- [ ] Submit the Claude plugin using `release/CLAUDE_SUBMISSION.md`.
- [ ] Submit the Codex skills-only plugin using
      `release/OPENAI_SUBMISSION.md`.
- [ ] Verify Grok installation through the Claude-compatible marketplace.
