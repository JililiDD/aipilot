# Review Runtime (lavish-axi)

Shared regimen for opening browser-based review sessions where the user annotates rendered content and feedback flows back as structured, element-anchored data. **This file is the single call point**: skills that use the review runtime reference this regimen and never inline these commands themselves — when the tool changes or is replaced, only this file changes.

## Scope

- **Visual review** (`aipilot-jl-design-spec-builder`): visual direction / HTML prototype review. The HTML under review IS the deliverable; feedback edits it directly.
- **Document review** (orchestrator stage confirmations): spec / work-item / plan documents rendered to a one-off review HTML. The markdown stays the source of truth; the HTML is a disposable projection (see Document Review section).

## Commands

Version is pinned. Upgrades are deliberate: test the new version against this regimen, then update the pin here.

```
npx -y lavish-axi@0.1.40 <file.html>                     # open the file in a review session
npx -y lavish-axi@0.1.40 poll <file.html>                 # long-poll for user feedback (run as background task)
npx -y lavish-axi@0.1.40 poll <file.html> --agent-reply "<message>"   # reply to the user, then keep polling
```

Place review HTML files in the session scratchpad, not the project tree.

## Feedback Loop

1. Open the file, then start `poll` as a **background task** (it blocks silently until the user acts; never kill it — queued feedback is never lost, re-run `poll` if it dies).
2. Poll returns YAML: `dom_snapshot` plus `prompts[]` rows of `{uid, prompt, selector, tag, text}` — the user's comment anchored to the element they clicked, or a freeform message with empty selector.
3. Apply the requested change to the file, then run `poll --agent-reply "<what you did>"` to answer and resume waiting.
4. End the loop when the user confirms (an approve-tagged prompt or an explicit confirmation in chat) or ends the session.

## Embedded Action Buttons

Review HTML may include decision buttons wired to `window.lavish.queuePrompt(...)`.

**Known quirk (v0.1.40)**: `queuePrompt` must be passed a **plain string**, not an object — objects are stringified to `[object Object]` and the intent is lost. Use a `data-*` attribute or the button text for tagging instead:

```html
<button onclick="window.lavish && window.lavish.queuePrompt('approve-direction')">Approve this direction</button>
```

## Degradation Path

The review runtime is an enhancement, never a gate-blocker. If `npx` fails, no browser is available, or the session is headless: fall back to the pre-runtime behavior — open/attach the HTML directly (or show a screenshot), collect feedback as chat text, and proceed. State the fallback in the stage summary; do not stall a confirmation gate on tool failure.

## Non-Goals

- No use of lavish export/share features (third-party `ht-ml.app` coupling).
- No custom-built replacement runtime.
- No review-runtime state committed to the project tree.

## Document Review

Stage confirmations whose deliverable is a markdown document (product spec, design spec or Design section, work-item, plan, roadmap) may run through a browser review instead of chat-only confirmation.

Invariant: **edits land in the markdown source only; the review HTML is a disposable projection**, written to the scratchpad and discarded after the session — never committed, never edited by hand.

Procedure:

1. **Ask first, always skippable** (same policy as visual preview): offer the browser review before opening it; the user may prefer chat-only. A skipped review is not a skipped confirmation — the stage confirmation still happens in chat.
2. **Render** with the deterministic converter (never model-rewrite the document into HTML):

   ```
   node <this-skill>/scripts/render-review.js <doc.md> <scratchpad>/review-<slug>.html --title "<Stage>: <doc name>"
   ```

   The script pins `marked@18.0.6` internally and wraps the body in the review template (banner naming the markdown source, `data-source-md` attribute, Confirm document / Request changes buttons).
3. **Open and poll** per the Commands section above.
4. **Back-map annotations**: each feedback row carries the annotated element's text. Locate that text in the markdown source (headings anchor sections; fall back to unique-substring search) and edit the **markdown**. If the text matches more than one place, ask instead of guessing.
5. **Re-render** to the same HTML path after each markdown edit — the browser view refreshes from the file — then `poll --agent-reply` describing what changed.
6. **Close**: a `confirm-document` prompt (or explicit confirmation in chat) ends the review; treat it as the stage confirmation. Delete or ignore the scratchpad HTML.
