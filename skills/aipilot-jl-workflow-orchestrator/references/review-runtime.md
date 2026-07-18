# Review Runtime (ezreview)

Shared regimen for opening browser-based review sessions where the user annotates rendered content and feedback flows back as structured, element-anchored data. **This file is the single call point**: skills that use the review runtime reference this regimen and never inline these commands themselves — when the tool changes or is replaced, only this file changes.

## Scope

- **Visual review** (`aipilot-jl-design-spec-builder`): visual direction / HTML prototype review. The HTML under review IS the deliverable; feedback edits it directly.
- **Document review** (orchestrator stage confirmations): spec / work-item / plan documents rendered to a one-off review HTML. The markdown stays the source of truth; the HTML is a disposable projection (see Document Review section).

## Commands

Version is pinned. Upgrades are deliberate: test the new version against this regimen, then update the pin here. `ezreview` requires Node.js 20 or newer.

```
npx -y ezreview@0.1.2 <file.html>                                  # open the file in a review session
npx -y ezreview@0.1.2 wait <file.html>                              # wait for the next feedback batch
npx -y ezreview@0.1.2 reply <file.html> --to <annotation-id> "<message>"  # reply to a question
```

Place review HTML files in the session scratchpad, not the project tree.

## Execution Attachment

`wait` must remain **attached to the current agent execution** so its result returns to the agent that opened the review. Do not launch it through ordinary shell detachment such as `&`, `nohup`, or `disown`.

Run `wait` as the current blocking tool call. If the host runtime yields a managed task/session identifier and can reliably resume that same agent execution, retain and poll that identifier; this is still attached even though the process may run in the background. Without such a managed continuation mechanism, keep `wait` directly blocking in the current tool call. “Attached” is the invariant; operating-system foreground/background status is not.

## Feedback Loop

1. Open the file, then start `wait` using the attached execution rule above. It blocks until the user submits feedback; queued feedback is durable, so rerun `wait` if it is interrupted.
2. `wait` returns one structured batch of annotations. Each item includes an id and an element selector/HTML snippet or selected-text context plus the user's comment.
3. Apply requested changes to the file. For question-type annotations, use `reply --to <annotation-id> "<answer>"`; then run `wait` again for the next batch.
4. End the loop when the user clicks ezreview's **Approve** toolbar action or explicitly confirms the document in chat. The approve action makes `wait` exit successfully with a document-confirmation message; it does not itself authorize the next workflow stage.

## Review Controls

`ezreview` provides the review controls in its browser shell. Reviewers use **Submit review** in the comment rail to send annotations and **Approve** in the toolbar to confirm the document. Do not add action buttons that depend on an injected browser global to the reviewed HTML.

## Degradation Path

The review runtime is an enhancement, never a gate-blocker. If `npx` fails, no browser is available, or the session is headless: fall back to the pre-runtime behavior — open/attach the HTML directly (or show a screenshot), collect feedback as chat text, and proceed. State the fallback in the stage summary; do not stall a confirmation gate on tool failure.

## Non-Goals

- No use of export/share features or any third-party hosted review service.
- No custom-built replacement runtime.
- No review-runtime state committed to the project tree.

## Document Review

Stage confirmations whose deliverable is a markdown document (product spec, design spec or Design section, work-item, plan, roadmap) may run through a browser review instead of chat-only confirmation.

Invariant: **edits land in the markdown source only; the review HTML is a disposable projection**, written to the scratchpad and discarded after the session — never committed, never edited by hand.

Procedure:

1. **Enter only after selection**: constitution §8 owns whether and when browser review is offered. Start this procedure only after the user selects browser review; this runtime does not create, waive, or reorder stage-confirmation gates.
2. **Render** with the deterministic converter (never model-rewrite the document into HTML):

   ```
   node <this-skill>/scripts/render-review.js <doc.md> <scratchpad>/review-<slug>.html --title "<Stage>: <doc name>"
   ```

   The script pins `marked@18.0.6` internally and wraps the body in the review template (banner naming the markdown source and a `data-source-md` attribute). Review controls are provided by ezreview's browser shell.
3. **Open and wait** per the Commands section above.
4. **Back-map annotations**: each feedback row carries the annotated element's text. Locate that text in the markdown source (headings anchor sections; fall back to unique-substring search) and edit the **markdown**. If the text matches more than one place, ask instead of guessing.
5. **Re-render** to the same HTML path after each markdown edit — the browser view refreshes from the file — then run `wait` again for the next batch.
6. **Close**: an ezreview confirmation from **Approve** (or explicit document confirmation in chat) ends the review. Return to constitution §8 for the separate next-stage confirmation; document approval alone does not authorize the next stage. Delete or ignore the scratchpad HTML.
