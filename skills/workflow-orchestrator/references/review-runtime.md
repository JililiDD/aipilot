# Review Runtime (ezreview)

This file is the shared regimen for opening browser review sessions. In a session, the user annotates rendered content. The feedback flows back as structured data, anchored to page elements.

**This file is the single call point**: skills that use the review runtime reference this regimen. They never inline these commands themselves. If the tool changes, or another tool replaces it, only this file changes.

## Scope

- **Visual review** (`design-spec-builder`): the review of a visual direction or an HTML prototype. The original HTML is the deliverable. Open a disposable review copy, never the deliverable itself. Apply feedback to the original and refresh the copy while the review remains active.
- **Document review** (orchestrator stage confirmations): the review of a spec, work-item, or plan document. A script renders the document to a one-off review HTML (see Document Review).

## Commands

`<this-skill>` in every command below is the `workflow-orchestrator` skill directory, whichever skill calls this file. That directory is the parent of this `references/` folder. The version is pinned. Upgrade deliberately, in this order:
1. Test the new standalone build against this regimen.
2. Replace the vendored file, license, and version record together.

`ezreview` requires Node.js 20 or newer.

```
node <this-skill>/vendor/ezreview/ezreview.mjs <file.html>                                  # open the file in a review session
node <this-skill>/vendor/ezreview/ezreview.mjs wait <file.html>                              # wait for the next feedback batch
node <this-skill>/vendor/ezreview/ezreview.mjs reply <file.html> --to <annotation-id> "<message>"  # reply to a question
```

The CLI is the plugin-vendored `ezreview` 1.0.1 standalone file. It contains the complete runtime and the embedded browser assets. Run it directly with Node. Do not substitute `npm`, `npx`, a global `ezreview` command, or any runtime download. The adjacent `LICENSE` and `VERSION` files travel with it.

Place every reviewed HTML file in the session scratchpad, not in the project tree. Document-review HTML is a disposable projection of Markdown. Visual-review mocks are deliverables under `design-assets/`; review a separate scratchpad copy. Disapprove deletes the exact HTML file opened with ezreview and its feedback history. It must never delete Markdown, the original visual mock, or adjacent assets.

## Execution Attachment

`wait` must remain **attached to the current agent execution** so its result returns to the agent that opened the review. Do not launch it through ordinary shell detachment such as `&`, `nohup`, or `disown`.

Run `wait` as the current blocking tool call. If the host runtime yields a managed task/session identifier and can reliably resume that same agent execution, retain and poll that identifier. The `wait` is then still attached, even though the process may run in the background. Without such a managed continuation mechanism, keep `wait` directly blocking in the current tool call. “Attached” is the invariant. The foreground or background status of the process in the operating system is not.

For Codex command execution, follow this handle lifecycle exactly:

1. Start one `ezreview wait` with the command tool.
2. If the tool yields before the process exits, and the tool returns a `session_id`, preserve the complete tool result. Then continue that exact process with `write_stdin` using the same `session_id`. A yield or an empty poll is not process completion.
3. Do not start a second `ezreview wait` while that managed process handle is still alive.
4. When the handle reports process exit and returns a feedback batch, the handle is finished. Process the batch: apply or reply to every item. Then start a new attached `ezreview wait` for the next batch, only if the reviewed HTML still exists.
5. A zero exit code is not approval. Read the complete `wait` output: Approve and Disapprove both exit with code 0 in v1.0.1. A submitted annotation batch is neither decision.

The managed command `session_id` belongs to the current `wait` process. It is not the identity of the ezreview server/session. Do not reuse it after that process exits.

## Review Lifetime and Recovery

The review is a gate that the user controls. It may run for a long time. Keep the ezreview server/open-session process and the current attached `wait` available for the entire gate. **Never interrupt, terminate, kill, or close either process solely because no feedback has arrived. Also never do so solely for one of these reasons:**
- time has elapsed;
- polls are empty;
- the command tool yielded;
- an agent wants to avoid leaving a background process running.

There is no agent-imposed idle timeout for human review.

For a managed Codex process, poll the same live handle with host-safe bounded polling calls for as long as necessary. A poll boundary exists only so the host can return control; it is not a review deadline.

If the host runtime or the agent execution is interrupted before the review ends:

1. Preserve the source document and the exact review HTML if it still exists. Do not run review cleanup or report approval.
2. If the reviewed HTML has disappeared, stop without reopening or recreating it. A Disapprove between two `wait` calls may have deleted it and the session before the next call can receive an event. Without an explicit Disapprove result, report only that the preview is missing; never assert rejection or approval from absence alone. Ask the user what to do next.
3. Otherwise, on the next execution, continue the existing managed `wait` handle if recoverable. If the ezreview server/session is still available, start exactly one new attached `wait` for the **same HTML file**.
4. If the server is no longer running while the HTML exists, reopen the **same HTML file**. Then start exactly one attached `wait`. Queued feedback is durable. An interruption is a recovery event, not approval or cancellation.

The attached ezreview loop may exit only when one of these events occurs:

- ezreview reports **Approve**, or the user explicitly confirms the reviewed document in chat. On **Approve**, `wait` exits successfully with a document-confirmation message. Document approval alone never confirms the next workflow stage.
- ezreview reports **Disapprove**. Its successful `wait` result begins `Review disapproved — the submitted HTML was deleted.` Stop this review. Do not confirm the document or advance the workflow. Do not recreate the HTML, automatically revise or roll back the Markdown, or start another review. Tell the user that this version was rejected, that the source remains, and ask what to do next. Wait for their reply.
- The user explicitly cancels the review or tells the agent to end or close it. A cancellation leaves the workflow gate unconfirmed. Never advance to the next stage because of a cancellation.
- An unrecoverable tool failure requires the degradation path below. This event exits only the ezreview loop. Degradation changes the feedback channel, but the review gate remains active.

After approval, disapproval, or explicit cancellation, shut down any remaining review processes as needed. Disapprove already deletes the reviewed HTML and feedback history; leave source documents and deliverables intact. On an unrecoverable tool failure, shut down only unusable processes and preserve any remaining HTML/source for fallback review. Never shut down a usable review process before approval, disapproval, or explicit cancellation.

## Feedback Loop

1. Open the file. Then start `wait` as the Execution Attachment section above requires. `wait` blocks until the user submits feedback.
2. `wait` intentionally returns one structured batch and exits. Each item includes:
   - an id;
   - an element selector/HTML snippet, or the selected-text context;
   - the user's comment.
3. Handle every annotation in the batch. Apply the requested changes to the source/deliverable. When required, re-render or reload the review HTML.
4. **Reply to every submitted annotation ID after handling it.** Use `reply --to <annotation-id> "<outcome>"`, even when the edit is already visible after reload. The outcome is one of these:
   - a brief confirmation for an edit (“Fixed”);
   - an answer for a question;
   - the reason for a rejected or no-op request.

   Never treat a source edit or HTML reload as an implicit reply.
5. Give each annotation its own reply, including when one edit addresses multiple comments. Before starting the next `wait`, verify that every annotation ID in the returned batch has received an outcome reply. Do not silently leave any item pending. Before each re-render, copy refresh, or reply, check that the reviewed HTML still exists. If it disappeared or a reply fails because the session ended, do not keep editing, recreate the preview, or retry the reply. Stop and ask for instructions; without an explicit Disapprove result, do not claim to know why the session ended.
6. Keep the current review turn open across every batch. None of these is a reason to finish the turn or to report that the review session ended:
   - a yielded command;
   - an empty poll;
   - a completed feedback batch;
   - elapsed time;
   - an arbitrary number of review rounds.

   End the ezreview loop only under the exit-event rules above.

## Review Controls

`ezreview` provides the review controls in its browser shell. Reviewers use **Submit review** in the comment rail to send annotations. **Approve** accepts the review; **Disapprove** rejects this version and deletes its submitted HTML after a confirmation dialog. Both buttons require the unsent comment queue to be empty. In the reviewed HTML, do not add action buttons that depend on an injected browser global.

## Degradation Path

The review runtime is an enhancement, never a gate-blocker. Fall back to the pre-runtime behavior when one of these conditions is true:
- the vendored CLI fails;
- no browser is available;
- the session is headless.

If the reviewed HTML still exists, open or attach it directly, or show a screenshot. Collect feedback as chat text. The workflow remains at the same confirmation gate until the user confirms or cancels. If the reviewed HTML is missing, do not reconstruct it automatically. Ask what the user wants next. A missing file or a tool failure is never an implicit confirmation or a proven Disapprove. State the fallback in the stage report.

## Non-Goals

- No use of export/share features or any third-party hosted review service.
- No custom-built replacement runtime.

## Visual Review

The original HTML mock is a deliverable. Never pass its path to ezreview 1.0.1: Disapprove would delete it. Make a separate HTML copy in the session scratchpad. For a self-contained mock, use this command with two **different** paths:

```
node -e "const fs=require('fs'),p=require('path');const a=p.resolve(process.argv[1]),b=p.resolve(process.argv[2]);if(a===b)throw Error('review copy must differ from deliverable');fs.copyFileSync(a,b,fs.constants.COPYFILE_EXCL)" <deliverable.html> <scratchpad>/review-<slug>.html
```

If the mock uses relative local assets, copy the assets into the scratchpad with the same relative paths and verify the preview before opening it. If a safe copy cannot be made, use the Degradation Path rather than risk deleting the deliverable. Open ezreview on the scratchpad HTML. Apply annotations to the original deliverable, then refresh the scratchpad copy only while the review remains active. After Approve or explicit cancellation, clean up the copy and its scratchpad assets. After Disapprove, ezreview deletes the copy; clean up only its scratchpad assets, preserve the original, and wait for new instructions. Never automatically delete a rejected original or make a replacement.

## Document Review

Invariant: **edits land in the markdown source only. The review HTML is a disposable projection.** Write it to the scratchpad. Delete it from local disk after the session. Never commit it or edit it by hand.

Procedure:

1. **Enter only after selection**: constitution §8 owns whether and when browser review is offered. Start this procedure only after the user selects browser review. This runtime does not create, waive, or reorder stage-confirmation gates.
2. **Render** with the deterministic converter. Never rewrite the document into HTML yourself. Use this command:

   ```
   node <this-skill>/scripts/render-review.js <doc.md> <scratchpad>/review-<slug>.html --title "<Stage>: <doc name>"
   ```

   The script loads bundled `marked@18.0.6`. For Mermaid blocks, it inlines bundled `mermaid@12.2.0`, including its local ELK layout engine. The browser draws each flowchart with ELK without changing the Mermaid source. If ELK rendering fails, the browser retries with Dagre. If both layouts fail, it opens the original Mermaid source. The diagram SVG stays inside the reviewed document, not a separate viewer iframe. ezreview can annotate nodes and edge labels there. Edge labels receive stable IDs containing their Mermaid endpoints, so a comment can name the right relation. Every rendered diagram offers Full screen, Fit width, Fit all, and zoom controls. The viewer keeps the same SVG and defaults to Fit width. Escape or Exit full screen returns to the review. Browser fullscreen hides ezreview's comment composer, so exit fullscreen before annotating a node or relation. If fullscreen is unavailable, the diagram expands inside the review page instead. Typed architecture nodes retain their group colors, legend, rounded boxes, and dashed system boundary. Each diagram keeps its natural size, and a wide one scrolls sideways. Above a diagram, the page warns about labels that overlap or touch, and about a group with no free color. Markdown rendering does not call `npx`, install packages, or require network access. Always use this renderer for Markdown review artifacts. Do not call marked directly or hand-write a converter.

   The script wraps the rendered document in the review template. It stores the markdown source path only in the non-visual `data-source-md` attribute. Above the content, do not add a document banner or a copy of the review instructions.
3. **Open and wait** per the Commands section above.
4. **Back-map annotations**: each feedback row carries the annotated element's text. Locate that text in the markdown source. Use the headings as section anchors. If they do not locate the text, fall back to a unique-substring search. Then edit the **markdown**. If the text matches more than one place, ask instead of guessing.
5. **Re-render and reply**: while the review is active and the scratchpad HTML still exists, re-render to the same HTML path after each Markdown edit. Then reply per the Feedback Loop. Start another `wait` only if the HTML still exists and every reply is visible. If it has disappeared, follow Review Lifetime and Recovery instead.
6. **Close**: after approval or explicit cancellation, delete the exact scratchpad HTML. After Disapprove, ezreview has already deleted it. This idempotent command works in every shell: `node -e "require('fs').rmSync(process.argv[1], { force: true })" <exact-review-html-path>`. Never delete the Markdown source. Do not retain or merely ignore a remaining scratchpad HTML file. Document approval alone does not authorize the next stage. Disapproval and cancellation never authorize it.
