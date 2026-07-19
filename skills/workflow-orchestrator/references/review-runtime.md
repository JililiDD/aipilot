# Review Runtime (ezreview)

Shared regimen for opening browser-based review sessions where the user annotates rendered content and feedback flows back as structured, element-anchored data. **This file is the single call point**: skills that use the review runtime reference this regimen and never inline these commands themselves — when the tool changes or is replaced, only this file changes.

## Scope

- **Visual review** (`design-spec-builder`): visual direction / HTML prototype review. The HTML under review IS the deliverable; feedback edits it directly.
- **Document review** (orchestrator stage confirmations): spec / work-item / plan documents rendered to a one-off review HTML. The markdown stays the source of truth; the HTML is a disposable projection (see Document Review section).

## Commands

Version is pinned. Upgrades are deliberate: test the new standalone build against this regimen, then replace the vendored file, license, and version record together. `ezreview` requires Node.js 20 or newer.

```
node <this-skill>/vendor/ezreview/ezreview.mjs <file.html>                                  # open the file in a review session
node <this-skill>/vendor/ezreview/ezreview.mjs wait <file.html>                              # wait for the next feedback batch
node <this-skill>/vendor/ezreview/ezreview.mjs reply <file.html> --to <annotation-id> "<message>"  # reply to a question
```

The CLI is the plugin-vendored `ezreview` 0.2.1 standalone file. It contains the complete runtime and embedded browser assets and is executed directly with Node. Do not substitute `npm`, `npx`, a global `ezreview` command, or any runtime download. The adjacent `LICENSE` and `VERSION` files travel with it.

Place review HTML files in the session scratchpad, not the project tree.

## Execution Attachment

`wait` must remain **attached to the current agent execution** so its result returns to the agent that opened the review. Do not launch it through ordinary shell detachment such as `&`, `nohup`, or `disown`.

Run `wait` as the current blocking tool call. If the host runtime yields a managed task/session identifier and can reliably resume that same agent execution, retain and poll that identifier; this is still attached even though the process may run in the background. Without such a managed continuation mechanism, keep `wait` directly blocking in the current tool call. “Attached” is the invariant; operating-system foreground/background status is not.

For Codex command execution, follow this handle lifecycle exactly:

1. Start one `ezreview wait` with the command tool.
2. If the tool yields before the process exits and returns a `session_id`, preserve the complete tool result and continue that exact process with `write_stdin` using the same `session_id`. A yield or an empty poll is not process completion.
3. Do not start a second `ezreview wait` while that managed process handle is still alive.
4. When the handle reports process exit and returns a feedback batch, the handle is finished. Process the batch, apply or reply to every item, then start a new attached `ezreview wait` for the next batch.

The managed command `session_id` belongs to the current `wait` process; it is not the ezreview server/session identity and must not be reused after that process exits.

## Review Lifetime and Recovery

The review is a user-controlled, potentially long-running gate. Keep the ezreview server/open-session process and the current attached `wait` available for the entire gate. **Never interrupt, terminate, kill, or close either process solely because no feedback has arrived, time has elapsed, polls are empty, the command tool yielded, or an agent wants to avoid leaving a background process running.** There is no agent-imposed idle timeout for human review.

For a managed Codex process, poll the same live handle with host-safe bounded polling calls for as long as necessary. A poll boundary exists only so the host can return control; it is not a review deadline and does not authorize ending the agent turn. Do not replace a live handle with a new `wait`.

If the host runtime or agent execution is interrupted before the review ends:

1. Preserve the exact review HTML and its source document. Do not run review cleanup and do not report the review as complete.
2. On the next execution, continue the existing managed `wait` handle when it is still recoverable. Otherwise, if the ezreview server/session is still available, start exactly one new attached `wait` for the **same HTML file**.
3. If the ezreview server is no longer running, reopen the **same HTML file**, then start exactly one attached `wait`. Queued feedback is durable; interruption is a recovery event, not approval or cancellation.

The attached ezreview loop may exit only when one of these events occurs:

- ezreview reports **Approve**, or the user explicitly confirms the reviewed document in chat;
- the user explicitly cancels the review or tells the agent to stop/close it — cancellation leaves the workflow gate unconfirmed and must never advance the next stage;
- an unrecoverable tool failure requires the degradation path below. This exits only the ezreview loop: degradation changes the feedback channel and the review gate remains active.

After approval or explicit cancellation, stop any live `wait` and server/open-session process as needed. On unrecoverable tool failure, stop only unusable processes and preserve the HTML/source for the fallback review. Never shut down a usable review process before approval or explicit cancellation.

## Feedback Loop

1. Open the file, then start `wait` using the attached execution rule above. It blocks until the user submits feedback; queued feedback is durable, so rerun `wait` if it is interrupted.
2. `wait` intentionally returns one structured batch and exits. Each item includes an id and an element selector/HTML snippet or selected-text context plus the user's comment.
3. Handle every annotation in the batch. Apply requested changes to the source/deliverable and re-render or reload the review HTML when required.
4. **Reply to every submitted annotation ID after handling it.** Use `reply --to <annotation-id> "<outcome>"` even when the requested edit is already visible after HTML reload. For an edit, send a brief confirmation such as “Fixed” or “Already added explanation.”; for a question, answer it; for a rejected or no-op request, explain why or state that the content already satisfies it. Never treat a source edit or HTML reload as an implicit reply.
5. Give each annotation its own reply, including when one edit addresses multiple comments. Before starting the next `wait`, verify that every annotation ID in the returned batch has received an outcome reply; do not silently leave any item pending.
6. Keep the current review turn open across every batch. A yielded command, an empty poll, a completed feedback batch, elapsed time, or an arbitrary number of review rounds is not a reason to finish the turn or report that the review session ended.
7. End the ezreview loop only under the exit-event rules above. The approve action makes `wait` exit successfully with a document-confirmation message; it does not itself authorize the next workflow stage. Cancellation ends the review without confirming the document. Tool failure transfers the still-active gate to the degradation path.

## Review Controls

`ezreview` provides the review controls in its browser shell. Reviewers use **Submit review** in the comment rail to send annotations and **Approve** in the toolbar to confirm the document. Do not add action buttons that depend on an injected browser global to the reviewed HTML.

## Degradation Path

The review runtime is an enhancement, never a gate-blocker. If the vendored CLI fails, no browser is available, or the session is headless: fall back to the pre-runtime behavior — open/attach the HTML directly (or show a screenshot) and collect feedback as chat text. The workflow remains at the same confirmation gate until the user confirms or cancels; tool failure and fallback are never implicit approval. State the fallback in the stage summary.

## Non-Goals

- No use of export/share features or any third-party hosted review service.
- No custom-built replacement runtime.
- No runtime package-manager install or download; both ezreview and marked execute from plugin-vendored files.
- No review-runtime state committed to the project tree.

## Document Review

Stage confirmations whose deliverable is a markdown document (product spec, design spec or Design section, work-item, plan, roadmap) may run through a browser review instead of chat-only confirmation.

Invariant: **edits land in the markdown source only; the review HTML is a disposable projection**, written to the scratchpad and deleted from local disk after the session — never committed, never edited by hand.

Procedure:

1. **Enter only after selection**: constitution §8 owns whether and when browser review is offered. Start this procedure only after the user selects browser review; this runtime does not create, waive, or reorder stage-confirmation gates.
2. **Render** with the deterministic converter (never model-rewrite the document into HTML):

   ```
   node <this-skill>/scripts/render-review.js <doc.md> <scratchpad>/review-<slug>.html --title "<Stage>: <doc name>"
   ```

   The script loads the bundled `vendor/marked/marked.esm.mjs` from `marked@18.0.6`; Markdown rendering does not call `npx`, install packages, or require network access. Always use this renderer for Markdown review artifacts instead of calling marked directly or hand-writing a converter. It wraps the rendered document in a minimal review template. The markdown source path is stored only in the non-visual `data-source-md` attribute; do not add a document banner or duplicate review instructions above the content. Review controls are provided by ezreview's browser shell.
3. **Open and wait** per the Commands section above.
4. **Back-map annotations**: each feedback row carries the annotated element's text. Locate that text in the markdown source (headings anchor sections; fall back to unique-substring search) and edit the **markdown**. If the text matches more than one place, ask instead of guessing.
5. **Re-render and reply**: after each markdown edit, re-render to the same HTML path so the browser refreshes, then send the required outcome reply to every annotation ID from that batch. Run `wait` again only after all replies are visible to the review channel.
6. **Close**: an ezreview confirmation from **Approve** (or explicit document confirmation in chat) ends the review successfully. An explicit user cancellation also ends it, but leaves the stage unconfirmed. In either case, close the live review processes as needed. Delete the exact scratchpad HTML created for this review from local disk before returning to constitution §8; use `rm -f -- <exact-review-html-path>` and do not retain or merely ignore it. Document approval alone does not authorize the next stage, and cancellation never authorizes it.
