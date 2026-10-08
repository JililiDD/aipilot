# Review Runtime (ezreview)

This file is the shared regimen for opening browser review sessions. In a session, the user annotates rendered content. The feedback flows back as structured data, anchored to page elements.

**This file is the single call point**: skills that use the review runtime reference this regimen. They never inline these commands themselves. If the tool changes, or another tool replaces it, only this file changes.

## Scope

- **Visual review** (`design-spec-builder`): the review of a visual direction or an HTML prototype. The HTML under review IS the deliverable. Apply the feedback to it directly.
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

The CLI is the plugin-vendored `ezreview` 1.0.0 standalone file. It contains the complete runtime and the embedded browser assets. Run it directly with Node. Do not substitute `npm`, `npx`, a global `ezreview` command, or any runtime download. The adjacent `LICENSE` and `VERSION` files travel with it.

Place document-review HTML in the session scratchpad, not in the project tree. This HTML is the disposable projection that Document Review describes. Visual-review mocks are deliverables. They live where `design-spec-builder` stores them (`design-assets/`).

## Execution Attachment

`wait` must remain **attached to the current agent execution** so its result returns to the agent that opened the review. Do not launch it through ordinary shell detachment such as `&`, `nohup`, or `disown`.

Run `wait` as the current blocking tool call. If the host runtime yields a managed task/session identifier and can reliably resume that same agent execution, retain and poll that identifier. The `wait` is then still attached, even though the process may run in the background. Without such a managed continuation mechanism, keep `wait` directly blocking in the current tool call. “Attached” is the invariant. The foreground or background status of the process in the operating system is not.

For Codex command execution, follow this handle lifecycle exactly:

1. Start one `ezreview wait` with the command tool.
2. If the tool yields before the process exits, and the tool returns a `session_id`, preserve the complete tool result. Then continue that exact process with `write_stdin` using the same `session_id`. A yield or an empty poll is not process completion.
3. Do not start a second `ezreview wait` while that managed process handle is still alive.
4. When the handle reports process exit and returns a feedback batch, the handle is finished. Process the batch: apply or reply to every item. Then start a new attached `ezreview wait` for the next batch.

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

1. Preserve the exact review HTML and its source document. Do not run the review cleanup. Do not report the review as complete.
2. On the next execution, if the existing managed `wait` handle is still recoverable, continue it. Otherwise, if the ezreview server/session is still available, start exactly one new attached `wait` for the **same HTML file**.
3. If the ezreview server is no longer running, reopen the **same HTML file**. Then start exactly one attached `wait`. Queued feedback is durable. An interruption is a recovery event, not approval or cancellation.

The attached ezreview loop may exit only when one of these events occurs:

- ezreview reports **Approve**, or the user explicitly confirms the reviewed document in chat. On **Approve**, `wait` exits successfully with a document-confirmation message.
- The user explicitly cancels the review or tells the agent to end or close it. A cancellation leaves the workflow gate unconfirmed. Never advance to the next stage because of a cancellation.
- An unrecoverable tool failure requires the degradation path below. This event exits only the ezreview loop. Degradation changes the feedback channel, but the review gate remains active.

After approval or explicit cancellation, shut down any live `wait` process and server/open-session process as needed. On an unrecoverable tool failure, shut down only unusable processes and preserve the HTML/source for the fallback review. Never shut down a usable review process before approval or explicit cancellation.

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
5. Give each annotation its own reply, including when one edit addresses multiple comments. Before starting the next `wait`, verify that every annotation ID in the returned batch has received an outcome reply. Do not silently leave any item pending.
6. Keep the current review turn open across every batch. None of these is a reason to finish the turn or to report that the review session ended:
   - a yielded command;
   - an empty poll;
   - a completed feedback batch;
   - elapsed time;
   - an arbitrary number of review rounds.

   End the ezreview loop only under the exit-event rules above.

## Review Controls

`ezreview` provides the review controls in its browser shell. Reviewers use **Submit review** in the comment rail to send annotations. They use **Approve** in the toolbar to approve the document. In the reviewed HTML, do not add action buttons that depend on an injected browser global.

## Degradation Path

The review runtime is an enhancement, never a gate-blocker. Fall back to the pre-runtime behavior when one of these conditions is true:
- the vendored CLI fails;
- no browser is available;
- the session is headless.

For the fallback, open or attach the HTML directly, or show a screenshot. Collect the feedback as chat text. The workflow remains at the same confirmation gate until the user confirms or cancels. The tool failure and fallback are never an implicit confirmation. State the fallback in the stage report.

## Non-Goals

- No use of export/share features or any third-party hosted review service.
- No custom-built replacement runtime.

## Document Review

Invariant: **edits land in the markdown source only. The review HTML is a disposable projection.** Write it to the scratchpad. Delete it from local disk after the session. Never commit it or edit it by hand.

Procedure:

1. **Enter only after selection**: constitution §8 owns whether and when browser review is offered. Start this procedure only after the user selects browser review. This runtime does not create, waive, or reorder stage-confirmation gates.
2. **Render** with the deterministic converter. Never rewrite the document into HTML yourself. Use this command:

   ```
   node <this-skill>/scripts/render-review.js <doc.md> <scratchpad>/review-<slug>.html --title "<Stage>: <doc name>"
   ```

   The script loads the bundled `vendor/marked/marked.esm.mjs` from `marked@18.0.6`. When the document has a Mermaid block, the script inlines the bundled `vendor/mermaid/mermaid.min.js` from `mermaid@11.17.2`. The browser then draws each diagram. Markdown rendering does not call `npx`, install packages, or require network access. Always use this renderer for Markdown review artifacts. Do not call marked directly or hand-write a converter.

   The script wraps the rendered document in the review template. It stores the markdown source path only in the non-visual `data-source-md` attribute. Above the content, do not add a document banner or a copy of the review instructions.
3. **Open and wait** per the Commands section above.
4. **Back-map annotations**: each feedback row carries the annotated element's text. Locate that text in the markdown source. Use the headings as section anchors. If they do not locate the text, fall back to a unique-substring search. Then edit the **markdown**. If the text matches more than one place, ask instead of guessing.
5. **Re-render and reply**: after each markdown edit, re-render to the same HTML path so the browser refreshes. Then reply per the Feedback Loop. Run `wait` again only after all replies are visible to the review channel.
6. **Close**: do this step after approval or explicit cancellation, per the exit events above. Delete the exact scratchpad HTML created for this review from local disk before returning to constitution §8. Use this command, which works in every shell: `node -e "require('fs').rmSync(process.argv[1], { force: true })" <exact-review-html-path>`. Do not retain it or merely ignore it. Document approval alone does not authorize the next stage. A cancellation never authorizes it.
