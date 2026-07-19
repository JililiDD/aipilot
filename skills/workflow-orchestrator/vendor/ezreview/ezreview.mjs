#!/usr/bin/env node

// src/cli.ts
import { parseArgs } from "node:util";
import { existsSync as existsSync3, statSync, realpathSync } from "node:fs";
import { extname, resolve as resolve3 } from "node:path";
import { fileURLToPath } from "node:url";

// src/browser.ts
import { spawn } from "node:child_process";
function buildOpenCommand(platform, url) {
  if (platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", url] };
  }
  if (platform === "darwin") {
    return { command: "open", args: [url] };
  }
  return { command: "xdg-open", args: [url] };
}
function openInBrowser(url, platform = process.platform, spawnFn = (command, args) => spawn(command, args, { stdio: "ignore", detached: true })) {
  const { command, args } = buildOpenCommand(platform, url);
  try {
    const child = spawnFn(command, args);
    child.on("error", () => {
      process.stderr.write(`Could not open a browser automatically. Open this URL manually: ${url}
`);
    });
    child.unref();
  } catch {
    process.stderr.write(`Could not open a browser automatically. Open this URL manually: ${url}
`);
  }
}

// src/server.ts
import { createServer as createHttpServer } from "node:http";
import { readFileSync as readFileSync3 } from "node:fs";
import { basename, resolve as resolve2 } from "node:path";

// src/shell-client.ts
function renderClientScript() {
  return `
(function () {
  var dot = document.getElementById("status-dot");
  var statusText = document.getElementById("status-text");
  var frame = document.getElementById("artifact-frame");
  var reviewSwitch = document.getElementById("review-mode-switch");
  var commentRail = document.getElementById("comment-rail");
  var railScroll = document.getElementById("rail-scroll");
  var railGrip = document.getElementById("rail-grip");
  var railCollapseBtn = document.getElementById("rail-collapse");
  var railCollapseAllBtn = document.getElementById("rail-collapse-all");
  var railFooter = document.getElementById("rail-footer");
  var approveButton = document.getElementById("approve");
  var confirmModalBackdrop = document.getElementById("confirm-modal-backdrop");
  var confirmModalOk = document.getElementById("confirm-modal-ok");
  var confirmModalCancel = document.getElementById("confirm-modal-cancel");
  var agentStatusLabel = document.getElementById("agent-status");
  var themeToggleButton = document.getElementById("theme-toggle");
  var documentReadOnly = false;
  var documentConfirmed = false;

  // ---- Theme toggle (light/dark) ----

  var THEME_STORAGE_KEY = "ezreview-theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggleButton.textContent = theme === "dark" ? "\u2600\uFE0E" : "\u263E";
  }

  (function initTheme() {
    var stored = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch (e) {
      // localStorage may be unavailable (privacy mode, sandboxed iframe) \u2014
      // fall back to the server-rendered default theme silently.
    }
    if (stored === "light" || stored === "dark") applyTheme(stored);
  })();

  themeToggleButton.addEventListener("click", function () {
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var next = isDark ? "light" : "dark";
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (e) {
      // Best-effort persistence only \u2014 a failed write just means the choice
      // won't survive a reload, which is no worse than not persisting at all.
    }
  });

  var STALE_DISCONNECT_MS = 15000;
  var staleDisconnectTimer = null;

  function setConnected() {
    if (staleDisconnectTimer) {
      window.clearTimeout(staleDisconnectTimer);
      staleDisconnectTimer = null;
    }
    dot.classList.remove("disconnected");
    statusText.textContent = "";
    agentStatusLabel.textContent = "Agent connected";
  }

  function setDisconnected() {
    dot.classList.add("disconnected");
    if (documentConfirmed) {
      agentStatusLabel.textContent = "Agent disconnected";
      statusText.textContent = "";
      return;
    }
    agentStatusLabel.textContent = "Agent connected";
    statusText.textContent = "Disconnected \xB7 retrying\u2026";
    // The browser's own EventSource keeps retrying on its own \u2014 this is just
    // upgrading the message once a retry storm has gone on long enough that
    // it's more likely the server process itself exited (e.g. idle auto-exit)
    // than a transient network blip, since a manual "reconnect" button
    // couldn't do anything a still-alive server's own retry wouldn't already.
    if (!staleDisconnectTimer) {
      staleDisconnectTimer = window.setTimeout(function () {
        staleDisconnectTimer = null;
        if (dot.classList.contains("disconnected") && !documentConfirmed) {
          statusText.textContent = "Server may have stopped \u2014 ask the agent to reopen";
        }
      }, STALE_DISCONNECT_MS);
    }
  }

  var source = new EventSource("/events");
  source.onopen = setConnected;
  source.onerror = setDisconnected;
  source.addEventListener("confirmed", function () {
    documentConfirmed = true;
  });
  source.addEventListener("reload", function () {
    currentHoverTarget = null;
    hideHighlight();
    markTextAnnotationsLost();
    if (draftBubble) {
      closeDraftBubble();
      statusText.textContent = "Selection cleared \u2014 please reselect";
      window.setTimeout(function () {
        if (dot.classList.contains("disconnected")) return;
        statusText.textContent = "";
      }, 3000);
    }
    frame.src = "/artifact?t=" + Date.now();
  });

  source.addEventListener("reply", function (e) {
    var data = JSON.parse(e.data);
    var rootId = threadRootById[data.id] || data.id;
    delete pendingReplyIds[rootId];
    updateReplySpinner();
    var node = findAnnotationNodeById(rootId);
    if (!node) return;
    renderAnswer(node, data.text);
  });

  // ---- Selector generator (self-authored, D-001) ----

  function cssEscape(value) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\\\$&");
  }

  function buildSegment(node) {
    var tag = node.tagName.toLowerCase();
    var parent = node.parentElement;
    if (!parent) return tag;
    var siblings = [];
    for (var i = 0; i < parent.children.length; i++) {
      if (parent.children[i].tagName === node.tagName) siblings.push(parent.children[i]);
    }
    var index = siblings.indexOf(node) + 1;
    return tag + ":nth-of-type(" + index + ")";
  }

  function buildPathWithinRoot(el, root) {
    var segments = [];
    var node = el;
    while (node && node.nodeType === 1) {
      if (node.id) {
        segments.unshift("#" + cssEscape(node.id));
        break;
      }
      segments.unshift(buildSegment(node));
      if (node === root) break;
      node = node.parentElement;
      if (!node) break;
    }
    for (var i = segments.length - 1; i >= 0; i--) {
      var candidate = segments.slice(i).join(" > ");
      var matches = root.querySelectorAll(candidate);
      if (matches.length === 1 && matches[0] === el) {
        return candidate;
      }
    }
    return segments.join(" > ");
  }

  function generateSelector(el) {
    // Note: an id-bearing element does NOT short-circuit here \u2014 buildPathWithinRoot
    // already returns "#id" as its first candidate, but only checking el.id up
    // front (before the shadow-root check below) would wrongly report
    // shadowHost: null for an id-bearing element that's actually inside a
    // shadow root, making it unresolvable via plain document.querySelector.
    var rootNode = el.getRootNode();
    // duck-typed, not "instanceof ShadowRoot": rootNode may come from the
    // iframe's own realm, whose ShadowRoot constructor differs from this
    // window's, so a cross-realm instanceof check silently fails here.
    var isShadow = rootNode.nodeType === 11 && !!rootNode.host;
    if (!isShadow) {
      return { selector: buildPathWithinRoot(el, el.ownerDocument), shadowHost: null };
    }
    var hostResult = generateSelector(rootNode.host);
    return {
      selector: buildPathWithinRoot(el, rootNode),
      shadowHost: hostResult.selector,
    };
  }

  window.__generateSelector = generateSelector;

  // ---- Review overlay: hover highlight ----

  var reviewOn = reviewSwitch.getAttribute("data-on") === "true";
  var currentHoverTarget = null;

  var highlightBox = document.createElement("div");
  highlightBox.id = "element-highlight";
  highlightBox.style.position = "fixed";
  highlightBox.style.border = "2px solid var(--accent)";
  highlightBox.style.background = "var(--accent-soft)";
  highlightBox.style.pointerEvents = "none";
  highlightBox.style.zIndex = "1000";
  highlightBox.style.display = "none";
  highlightBox.style.boxSizing = "border-box";
  document.body.appendChild(highlightBox);

  function getIframeDoc() {
    try {
      return frame.contentDocument;
    } catch (e) {
      return null;
    }
  }

  function positionHighlight(target) {
    if (!target || target === getIframeDoc()) {
      hideHighlight();
      return;
    }
    var rect = target.getBoundingClientRect();
    var frameRect = frame.getBoundingClientRect();
    var left = frameRect.left + rect.left;
    var top = frameRect.top + rect.top;
    highlightBox.style.left = left + "px";
    highlightBox.style.top = top + "px";
    highlightBox.style.width = rect.width + "px";
    highlightBox.style.height = rect.height + "px";
    highlightBox.style.display = "block";
  }

  function hideHighlight() {
    highlightBox.style.display = "none";
  }

  function refreshHighlightPosition() {
    if (reviewOn && currentHoverTarget) {
      positionHighlight(currentHoverTarget);
    }
  }

  var mouseMoveFramePending = false;

  function onIframeMouseMove(e) {
    if (!reviewOn) return;
    currentHoverTarget = e.target;
    if (mouseMoveFramePending) return;
    mouseMoveFramePending = true;
    window.requestAnimationFrame(function () {
      mouseMoveFramePending = false;
      if (reviewOn) positionHighlight(currentHoverTarget);
    });
  }

  function onIframeMouseLeave() {
    currentHoverTarget = null;
    hideHighlight();
  }

  // ---- Text-selection annotation (always active, independent of Review toggle) ----

  function getIframeWindow() {
    try {
      return frame.contentWindow;
    } catch (e) {
      return null;
    }
  }

  var HIGHLIGHT_NAME = "ai-review-text";
  var HIGHLIGHT_HOVER_NAME = "ai-review-text-hover";
  var textHighlightSet = null;
  var textHighlightHoverSet = null;

  // Tracks which iframe *document* the registry was last built for \u2014 a real
  // frame reload gets a brand-new document (needs a fresh registry), but a
  // Review-toggle re-attach on the same still-loaded document must not
  // recreate it: that would replace textHighlightSet/textHighlightHoverSet
  // with new, empty Highlight() instances, silently dropping every range
  // already added for queued/sent text annotations.
  var textHighlightRegistryDoc = null;

  function setupTextHighlightRegistry() {
    var win = getIframeWindow();
    var doc = getIframeDoc();
    if (!win || !doc || !win.Highlight || !win.CSS || !win.CSS.highlights) return;
    if (doc === textHighlightRegistryDoc) return;
    textHighlightRegistryDoc = doc;

    var style = doc.createElement("style");
    style.textContent =
      // At rest: a neutral gray wash \u2014 just enough to mark "this text has an
      // annotation" without fighting for attention. On hover: the warmer
      // yellow, so the color itself changes (not just its opacity), giving
      // a clearer "you're now pointing at this one" signal than deepening
      // the same hue would.
      "::highlight(" + HIGHLIGHT_NAME + ") { background-color: rgba(60,64,72,.12); }" +
      "::highlight(" + HIGHLIGHT_HOVER_NAME + ") { background-color: rgba(255,204,0,.8); }";
    doc.head.appendChild(style);

    textHighlightSet = new win.Highlight();
    textHighlightHoverSet = new win.Highlight();
    win.CSS.highlights.set(HIGHLIGHT_NAME, textHighlightSet);
    win.CSS.highlights.set(HIGHLIGHT_HOVER_NAME, textHighlightHoverSet);
  }

  function onIframeMouseUp() {
    if (!reviewOn) return;
    var doc = getIframeDoc();
    var sel = doc && doc.getSelection ? doc.getSelection() : null;
    if (sel && sel.toString().length > 0 && sel.rangeCount > 0) {
      openTextDraftBubble(sel.getRangeAt(0).cloneRange());
    }
  }

  // setupTextHighlightRegistry() runs unconditionally on every frame load \u2014
  // it only prepares the CSS Custom Highlight API registry that already-
  // queued/sent text annotations render into (and reanchorLostTextAnnotations,
  // called right after, needs it ready regardless of the Review toggle).
  // Only the mouseup listener that STARTS a new draft is Review-gated, mirroring
  // onIframeClick's element-annotation equivalent (listener attach/detach here,
  // plus the internal reviewOn guard above as defense in depth).
  function attachSelectionListeners() {
    var doc = getIframeDoc();
    if (!doc) return;
    doc.addEventListener("mouseup", onIframeMouseUp);
    setupTextHighlightRegistry();
  }

  function detachSelectionListeners() {
    var doc = getIframeDoc();
    if (doc) doc.removeEventListener("mouseup", onIframeMouseUp);
  }

  // ---- Comment rail: resize + collapse ----
  // Bubbles are real DOM children of #rail-scroll in normal document flow
  // (not position: fixed) \u2014 #rail-scroll is a plain overflow-y: auto box, so
  // the browser's native scrollbar handles the "too many comments to fit"
  // case for free, and horizontal placement is pure CSS (left/right on
  // .bubble) that adapts to any rail width with zero JS involvement.

  var RAIL_MIN_WIDTH = 180;
  var RAIL_MAX_WIDTH = 480;
  var RAIL_COLLAPSED_WIDTH = 28;
  var railWidth = 280;
  var railCollapsed = false;

  function applyRailWidth() {
    commentRail.style.width = (railCollapsed ? RAIL_COLLAPSED_WIDTH : railWidth) + "px";
    commentRail.classList.toggle("collapsed", railCollapsed);
    railCollapseBtn.textContent = railCollapsed ? "\u203A" : "\u2039";
    railScroll.style.display = railCollapsed ? "none" : "block";
    railFooter.style.display = railCollapsed ? "none" : "flex";
    // The collapsed rail is too narrow (28px) to fit both this and
    // #rail-collapse without overlapping, and there is nothing to collapse
    // when every bubble is already hidden anyway.
    railCollapseAllBtn.style.display = railCollapsed ? "none" : "block";
  }

  railCollapseBtn.addEventListener("click", function () {
    railCollapsed = !railCollapsed;
    applyRailWidth();
  });

  // Toggles based on current majority state \u2014 if any bubble is expanded,
  // the next click collapses everything; only once all are already
  // collapsed does it switch to expanding everything.
  railCollapseAllBtn.addEventListener("click", function () {
    var anyExpanded = false;
    for (var i = 0; i < sentItems.length; i++) {
      if (!sentItems[i].node.classList.contains("bubble-collapsed")) {
        anyExpanded = true;
        break;
      }
    }
    for (var j = 0; j < sentItems.length; j++) {
      setBubbleCollapsed(sentItems[j].node, anyExpanded);
    }
  });

  var railResizing = false;

  // Pointer capture (not a plain document mousemove listener) \u2014 dragging the
  // grip toward the iframe pane moves the real cursor over the iframe's own
  // document, which dispatches its own events and never bubbles them to the
  // shell page's top-level document. setPointerCapture routes every
  // subsequent pointer event to the grip itself regardless of what's
  // visually underneath, so the drag keeps working across that boundary.
  railGrip.addEventListener("pointerdown", function (e) {
    if (railCollapsed) return;
    railResizing = true;
    railGrip.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  railGrip.addEventListener("pointermove", function (e) {
    if (!railResizing) return;
    var newWidth = window.innerWidth - e.clientX;
    var maxWidth = Math.max(RAIL_MAX_WIDTH, window.innerWidth / 2);
    railWidth = Math.max(RAIL_MIN_WIDTH, Math.min(maxWidth, newWidth));
    applyRailWidth();
  });
  railGrip.addEventListener("pointerup", function (e) {
    railResizing = false;
    railGrip.releasePointerCapture(e.pointerId);
  });

  // ---- Bubble queue (draft -> queue -> delete; Submit review is a placeholder) ----

  var submitReviewButton = document.getElementById("submit-review");
  var replySpinner = document.getElementById("reply-spinner");
  var queue = [];
  window.__annotationQueue = queue;
  var draftBubble = null;
  var sentItems = [];
  window.__sentAnnotations = sentItems;
  // Defensive client-side child -> root lookup. Fixed servers always emit
  // root ids, but retaining this mapping prevents a child-id reply event
  // from becoming invisible if it comes from an older or malformed server.
  var threadRootById = {};
  // Root ids (never a follow-up's own id \u2014 replies always target the
  // thread root) still awaiting at least one reply from the most recent
  // Submit review batch. The spinner shows while this is non-empty.
  var pendingReplyIds = {};
  var annotationPageId = window.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  var nextAnnotationNumber = 1;

  function newAnnotationId() {
    // Annotation ids outlive this page: the server persists thread mappings
    // across reloads and idle restarts. Namespace the readable counter with
    // a random per-page token so a reload cannot reuse the previous page's
    // ids and make a new root inherit an old follow-up's thread mapping.
    return "a-" + annotationPageId + "-" + nextAnnotationNumber++;
  }

  function bubbleClickTargetsControl(event) {
    var target = event.target;
    return !!(target && target.closest && target.closest("button, textarea, input, select, a"));
  }

  function updateReplySpinner() {
    replySpinner.classList.toggle("visible", Object.keys(pendingReplyIds).length > 0);
  }

  function updateSubmitReviewLabel() {
    submitReviewButton.textContent = "Submit review (" + queue.length + ")";
    if (!documentReadOnly) submitReviewButton.disabled = queue.length === 0;
  }

  function targetAnchorY(target) {
    // Purely a sort key now (reading-order position at creation time), not a
    // pixel coordinate anything gets positioned at \u2014 bubbles live in normal
    // document flow inside #rail-scroll, ordered by this value, not placed
    // at an absolute Y. Keeps the "roughly near its source, top to bottom"
    // correlation the rail is meant to preserve, without pixel-exact
    // alignment (which stopped being viable the moment scrolling was added:
    // with many comments, pixel alignment and a working scrollbar can't
    // both hold at once).
    var rect = target.getBoundingClientRect();
    var frameRect = frame.getBoundingClientRect();
    return frameRect.top + rect.top;
  }

  function layoutBubbles() {
    // Sort by reading-order position, then re-append in that order \u2014 append
    // on an already-attached node reorders it. Horizontal placement and
    // spacing are pure CSS (.bubble's left/right/margin-bottom); the
    // rail's own overflow-y: auto handles anything that doesn't fit.
    // draftBubble is deliberately excluded \u2014 it floats over the content
    // near where it was opened until addDraftToQueue moves it in.
    var all = queue.concat(sentItems);
    all.sort(function (a, b) {
      return a.anchorY - b.anchorY;
    });
    for (var i = 0; i < all.length; i++) {
      railScroll.appendChild(all[i].node);
    }
  }

  function resolveAnnotationElement(item) {
    var doc = getIframeDoc();
    if (!doc) return null;
    try {
      if (item.shadowHost) {
        var host = doc.querySelector(item.shadowHost);
        if (!host || !host.shadowRoot) return null;
        return host.shadowRoot.querySelector(item.selector);
      }
      return doc.querySelector(item.selector);
    } catch (e) {
      return null;
    }
  }

  function findAnnotationNodeById(id) {
    var lists = [sentItems, queue];
    for (var i = 0; i < lists.length; i++) {
      for (var j = 0; j < lists[i].length; j++) {
        if (lists[i][j].id === id) return lists[i][j].node;
      }
    }
    return null;
  }

  // The thread container is a single capped-height, internally scrolling box
  // (DAC-2) \u2014 a thread has no message-count limit, so left ungrown it would
  // push every other bubble in the rail out of reach.
  function getOrCreateThreadContainer(node) {
    var container = node.querySelector(".bubble-thread");
    if (!container) {
      container = document.createElement("div");
      container.className = "bubble-thread";
      node.appendChild(container);
      // markBubbleSent (which appends the Reply button / follow-up controls)
      // runs at send time, before any agent reply exists \u2014 so this container
      // is often created afterward and would otherwise land ABOVE those
      // controls in the DOM. appendChild on an already-attached node moves
      // it, so re-appending puts the controls back below the thread, always
      // at the bubble's bottom-right regardless of creation order.
      var existingReplyControls = node.querySelector(".followup-reply-btn, .followup-controls");
      if (existingReplyControls) {
        var controlsRoot = existingReplyControls.className === "followup-reply-btn"
          ? existingReplyControls.parentNode
          : existingReplyControls;
        node.appendChild(controlsRoot);
      }
      if (node.classList.contains("bubble-collapsed")) container.style.display = "none";
    }
    return container;
  }

  function appendAnswerToThread(node, text) {
    var container = getOrCreateThreadContainer(node);
    var answerBlock = document.createElement("div");
    answerBlock.className = "answer-block";
    answerBlock.style.marginTop = "6px";
    answerBlock.style.paddingLeft = "8px";
    answerBlock.style.borderLeft = "3px solid var(--accent)";
    answerBlock.style.background = "var(--accent-soft)";

    var agentLabel = document.createElement("div");
    agentLabel.className = "agent-label";
    agentLabel.textContent = "AGENT";
    agentLabel.style.fontSize = "10px";
    agentLabel.style.fontWeight = "bold";
    agentLabel.style.color = "var(--accent)";
    answerBlock.appendChild(agentLabel);

    var answerText = document.createElement("div");
    answerText.className = "answer-text";
    answerText.textContent = text;
    answerBlock.appendChild(answerText);

    container.appendChild(answerBlock);
    container.scrollTop = container.scrollHeight;
  }

  // Kept as the public name used by the /events "reply" handler below \u2014
  // multi-round threads have no "first answer only" special case anymore,
  // every reply (first or Nth) appends the same way.
  function renderAnswer(node, text) {
    appendAnswerToThread(node, text);
  }

  // Mirrors answerBlock's visual language (left accent bar + role label)
  // for human messages \u2014 "bubble-comment" stays the text node's own class
  // (existing tests assert its exact textContent, with no label mixed in).
  function buildMeBlock(text) {
    var meBlock = document.createElement("div");
    meBlock.className = "me-block";
    meBlock.style.paddingLeft = "8px";
    meBlock.style.borderLeft = "3px solid var(--disconnect-red)";
    meBlock.style.background = "var(--danger-soft)";

    var meLabel = document.createElement("div");
    meLabel.className = "me-label";
    meLabel.textContent = "ME";
    meLabel.style.fontSize = "10px";
    meLabel.style.fontWeight = "bold";
    meLabel.style.color = "var(--disconnect-red)";
    meBlock.appendChild(meLabel);

    var commentText = document.createElement("div");
    commentText.className = "bubble-comment";
    commentText.textContent = text;
    meBlock.appendChild(commentText);

    return meBlock;
  }

  function appendFollowUpToThread(node, text) {
    var container = getOrCreateThreadContainer(node);
    var meBlock = buildMeBlock(text);
    meBlock.style.marginTop = "6px";
    container.appendChild(meBlock);
    container.scrollTop = container.scrollHeight;
  }

  function setAnchorLost(node, lost) {
    var badge = node.querySelector(".anchor-lost-badge");
    if (lost) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "anchor-lost-badge";
        badge.textContent = "\u26A0 Anchor lost";
        badge.style.display = "inline-block";
        badge.style.marginTop = "4px";
        badge.style.padding = "1px 6px";
        badge.style.borderRadius = "4px";
        badge.style.fontSize = "11px";
        badge.style.color = "var(--stale-amber-fg)";
        badge.style.background = "var(--stale-amber-bg)";
        node.appendChild(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  }

  // Drafts float over the content near where the user just clicked/selected
  // (position: fixed, appended to document.body) rather than appearing in
  // the rail right away \u2014 only once "Add to queue" commits it does the same
  // node move into #rail-scroll (see addDraftToQueue). createBubbleShell is
  // only ever called to start a fresh draft, never reused for an
  // already-queued bubble, so it's safe to always build the floating form.
  function createBubbleShell() {
    var node = document.createElement("div");
    node.className = "bubble";
    node.style.background = "var(--card-bg)";
    node.style.color = "var(--card-fg)";
    node.style.border = "1px solid var(--card-border)";
    node.style.borderRadius = "8px";
    node.style.padding = "10px 12px";
    node.style.boxShadow = "var(--card-shadow)";
    node.style.fontSize = "13px";
    node.style.boxSizing = "border-box";
    node.style.marginBottom = "8px";
    node.style.position = "fixed";
    node.style.width = "260px";
    // Above highlightBox's z-index (1000) \u2014 a floating draft opened right
    // where the hover highlight box currently sits must never be covered by
    // it.
    node.style.zIndex = "1100";
    document.body.appendChild(node);
    return node;
  }

  // Shared by openDraftBubble/openTextDraftBubble \u2014 draft controls (textarea
  // + Add + a close "x") look the same regardless of which kind of
  // annotation is being drafted.
  function buildDraftControls(node) {
    var closeBtn = document.createElement("button");
    closeBtn.className = "bubble-cancel";
    closeBtn.textContent = "\xD7";
    closeBtn.title = "Cancel";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "6px";
    closeBtn.style.right = "6px";
    closeBtn.style.width = "20px";
    closeBtn.style.height = "20px";
    closeBtn.style.lineHeight = "18px";
    closeBtn.style.border = "none";
    closeBtn.style.background = "transparent";
    closeBtn.style.color = "var(--chrome-dim)";
    closeBtn.style.fontSize = "16px";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.borderRadius = "4px";
    closeBtn.style.padding = "0";

    var textarea = document.createElement("textarea");
    textarea.style.display = "block";
    textarea.style.width = "100%";
    textarea.style.boxSizing = "border-box";
    textarea.style.marginTop = "16px";
    textarea.style.border = "1px solid var(--card-border)";
    textarea.style.borderRadius = "6px";
    textarea.style.padding = "6px 8px";
    textarea.style.fontSize = "13px";
    textarea.style.fontFamily = "inherit";
    textarea.style.resize = "vertical";
    textarea.style.background = "var(--draft-input-bg)";
    textarea.style.color = "var(--card-fg)";
    textarea.rows = 3;

    var footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.justifyContent = "flex-end";
    footer.style.marginTop = "8px";

    var addBtn = document.createElement("button");
    addBtn.className = "bubble-add";
    addBtn.textContent = "Add";
    // Same look as the toolbar's Submit review button (var(--accent) fill).
    addBtn.style.background = "var(--accent)";
    addBtn.style.color = "var(--accent-ink)";
    addBtn.style.border = "none";
    addBtn.style.borderRadius = "6px";
    addBtn.style.padding = "6px 14px";
    addBtn.style.fontSize = "12.5px";
    addBtn.style.cursor = "pointer";
    footer.appendChild(addBtn);

    node.appendChild(closeBtn);
    node.appendChild(textarea);
    node.appendChild(footer);

    closeBtn.addEventListener("click", closeDraftBubble);
    addBtn.addEventListener("click", addDraftToQueue);

    return { textarea: textarea };
  }

  function positionFloatingBubble(node, pageX, pageY) {
    var width = 260;
    // Estimated height (textarea + Add/Cancel buttons) \u2014 the real height
    // isn't known until the browser lays it out, but clamping needs a
    // number now so the bubble's *bottom* stays on-screen too, not just
    // its top-left corner.
    var estimatedHeight = 160;
    var maxLeft = Math.max(12, window.innerWidth - width - 12);
    node.style.left = Math.min(Math.max(pageX, 12), maxLeft) + "px";
    var maxTop = Math.max(48, window.innerHeight - estimatedHeight - 12);
    node.style.top = Math.min(Math.max(pageY, 48), maxTop) + "px";
  }

  function closeDraftBubble() {
    if (!draftBubble) return;
    if (draftBubble.type === "text-annotation" && textHighlightSet) {
      textHighlightSet.delete(draftBubble.range);
    }
    draftBubble.node.remove();
    draftBubble = null;
    layoutBubbles();
  }

  function markTextAnnotationsLost() {
    // sentItems too, not just queue: a text annotation's Range is bound to
    // the pre-reload iframe document, so it goes stale the moment this
    // reload's frame.src reassignment replaces that document \u2014 regardless
    // of whether the annotation is still queued or has already been sent.
    var lists = [queue, sentItems];
    for (var l = 0; l < lists.length; l++) {
      for (var i = 0; i < lists[l].length; i++) {
        if (lists[l][i].type === "text-annotation") {
          lists[l][i].lost = true;
        }
      }
    }
  }

  // ---- Text annotation re-anchoring after a reload ----
  //
  // Re-anchor inside nearestSelector first. An unchanged selectedText must
  // be unique within that element; if it was edited or appears more than
  // once, the locally captured before/after landmarks must identify exactly
  // one gap. There is no arbitrary character limit: the element itself is
  // the structural boundary. If the selector disappeared, only a globally
  // unique unchanged selectedText is safe enough to recover \u2014 never guess a
  // replacement from document-wide context.

  function buildTextIndex(root) {
    var doc = root.ownerDocument;
    var walker = doc.createTreeWalker(root, 4, null); // 4 = NodeFilter.SHOW_TEXT
    var nodes = [];
    var text = "";
    var node;
    while ((node = walker.nextNode())) {
      var start = text.length;
      text += node.nodeValue;
      nodes.push({ node: node, start: start, end: text.length });
    }
    return { text: text, nodes: nodes };
  }

  function pointAtOffset(index, offset) {
    for (var i = 0; i < index.nodes.length; i++) {
      var n = index.nodes[i];
      if (offset >= n.start && offset <= n.end) {
        return { node: n.node, offset: offset - n.start };
      }
    }
    return null;
  }

  // -1 for "not found" AND for "found more than once" \u2014 an ambiguous
  // landmark is as unusable as a missing one; the caller can't tell them
  // apart and shouldn't try to.
  function findUniqueOccurrence(haystack, needle) {
    var first = haystack.indexOf(needle);
    if (first === -1) return -1;
    if (haystack.indexOf(needle, first + 1) !== -1) return -1;
    return first;
  }

  function resolveTextAnnotationRoot(item) {
    var doc = getIframeDoc();
    if (!doc) return null;
    if (item.shadowHost) {
      try {
        var host = doc.querySelector(item.shadowHost);
        if (host && host.shadowRoot) return host.shadowRoot;
        return null;
      } catch (e) {
        return null;
      }
    }
    return doc.documentElement || doc.body;
  }

  function resolveTextAnnotationScope(item, searchRoot) {
    if (!searchRoot || !item.nearestSelector) return null;
    try {
      var queryRoot = item.shadowHost ? searchRoot : searchRoot.ownerDocument;
      return queryRoot && queryRoot.querySelector(item.nearestSelector);
    } catch (e) {
      return null;
    }
  }

  function rangeFromOffsets(scopeRoot, index, start, end) {
    var startPoint = pointAtOffset(index, start);
    var endPoint = pointAtOffset(index, end);
    if (!startPoint || !endPoint) return null;
    var range = scopeRoot.ownerDocument.createRange();
    try {
      range.setStart(startPoint.node, startPoint.offset);
      range.setEnd(endPoint.node, endPoint.offset);
    } catch (e) {
      return null;
    }
    return range;
  }

  function occurrenceStarts(text, needle) {
    if (needle === "") return [0];
    var starts = [];
    var from = 0;
    var found;
    while ((found = text.indexOf(needle, from)) !== -1) {
      starts.push(found);
      from = found + Math.max(needle.length, 1);
    }
    return starts;
  }

  function findUniqueContextGap(text, context) {
    var before = (context && context.before) || "";
    var after = (context && context.after) || "";
    var beforeStarts = occurrenceStarts(text, before);
    var afterStarts = after === "" ? [text.length] : occurrenceStarts(text, after);
    var match = null;
    for (var i = 0; i < beforeStarts.length; i++) {
      var start = beforeStarts[i] + before.length;
      for (var j = 0; j < afterStarts.length; j++) {
        var end = afterStarts[j];
        if (end < start) continue;
        if (match) return null;
        match = { start: start, end: end };
      }
    }
    return match;
  }

  function captureLocalOffsets(range, scopeRoot) {
    if (!scopeRoot) return null;
    try {
      var beforeRange = range.cloneRange();
      beforeRange.collapse(true);
      beforeRange.setStart(scopeRoot, 0);
      var afterRange = range.cloneRange();
      afterRange.collapse(false);
      afterRange.setEnd(scopeRoot, scopeRoot.childNodes.length);
      return {
        start: beforeRange.toString().length,
        endFromScopeEnd: afterRange.toString().length,
      };
    } catch (e) {
      return null;
    }
  }

  function rangeFromWeakContextBoundary(item, scopeRoot, index) {
    var offsets = item.localOffsets;
    var context = item.localContext;
    if (!offsets || !context) return null;
    var before = context.before || "";
    var after = context.after || "";
    var beforeIsWeak = before.trim() === "";
    var afterIsWeak = after.trim() === "";
    var start;
    var end;

    // An edge selection may have only whitespace on one side. Use its saved
    // offset only when the opposite landmark is unique and the edge is still
    // whitespace-only; structural edits must remain lost rather than guessed.
    if (beforeIsWeak && !afterIsWeak) {
      end = findUniqueOccurrence(index.text, after);
      start = offsets.start;
      if (
        end === -1 ||
        index.text.slice(0, start).trim() !== "" ||
        index.text.slice(Math.max(0, start - before.length), start) !== before
      ) return null;
    } else if (afterIsWeak && !beforeIsWeak) {
      var beforeStart = findUniqueOccurrence(index.text, before);
      start = beforeStart === -1 ? -1 : beforeStart + before.length;
      end = index.text.length - offsets.endFromScopeEnd;
      if (
        start === -1 ||
        index.text.slice(end).trim() !== "" ||
        index.text.slice(end, end + after.length) !== after
      ) return null;
    } else {
      return null;
    }

    if (start < 0 || end < start || end > index.text.length) return null;
    return rangeFromOffsets(scopeRoot, index, start, end);
  }

  function tryReanchorTextAnnotation(item) {
    var searchRoot = resolveTextAnnotationRoot(item);
    if (!searchRoot) return null;
    var scopeRoot = resolveTextAnnotationScope(item, searchRoot);

    if (scopeRoot) {
      var localIndex = buildTextIndex(scopeRoot);
      var exactStart = findUniqueOccurrence(localIndex.text, item.selectedText || "");
      if (exactStart !== -1) {
        return rangeFromOffsets(scopeRoot, localIndex, exactStart, exactStart + item.selectedText.length);
      }

      if (item.localContext) {
        var gap = findUniqueContextGap(localIndex.text, item.localContext);
        if (gap) return rangeFromOffsets(scopeRoot, localIndex, gap.start, gap.end);
        var weakBoundaryRange = rangeFromWeakContextBoundary(item, scopeRoot, localIndex);
        if (weakBoundaryRange) return weakBoundaryRange;
      }
      return null;
    }

    var globalIndex = buildTextIndex(searchRoot);
    var globalStart = findUniqueOccurrence(globalIndex.text, item.selectedText || "");
    if (globalStart === -1) return null;
    return rangeFromOffsets(searchRoot, globalIndex, globalStart, globalStart + item.selectedText.length);
  }

  function reanchorLostTextAnnotations() {
    var lists = [queue, sentItems];
    for (var l = 0; l < lists.length; l++) {
      for (var i = 0; i < lists[l].length; i++) {
        var item = lists[l][i];
        if (item.type !== "text-annotation" || !item.lost) continue;
        var newRange = tryReanchorTextAnnotation(item);
        if (newRange) {
          item.range = newRange;
          item.lost = false;
          setAnchorLost(item.node, false);
          if (textHighlightSet) textHighlightSet.add(newRange);
        }
      }
    }
  }

  function addDraftToQueue() {
    if (!draftBubble) return;
    var comment = draftBubble.textarea.value;
    var node = draftBubble.node;
    node.textContent = "";
    node.className = "bubble";
    // Clear the floating-draft positioning \u2014 layoutBubbles() below moves
    // this node into #rail-scroll, where it should behave like any other
    // rail bubble (normal document flow), not still be pinned to whatever
    // fixed viewport position it was opened at. Kept relative (not cleared
    // to static) so the "x" delete button below still anchors to this
    // bubble's own corner instead of escaping to a positioned ancestor.
    node.style.position = "relative";
    node.style.left = "";
    node.style.top = "";
    node.style.width = "";
    node.style.zIndex = "";
    var meBlock = buildMeBlock(comment);
    meBlock.style.paddingRight = "18px";
    var deleteBtn = document.createElement("button");
    deleteBtn.className = "bubble-delete";
    deleteBtn.textContent = "\xD7";
    deleteBtn.title = "Delete";
    deleteBtn.style.position = "absolute";
    deleteBtn.style.top = "6px";
    deleteBtn.style.right = "6px";
    deleteBtn.style.width = "20px";
    deleteBtn.style.height = "20px";
    deleteBtn.style.lineHeight = "18px";
    deleteBtn.style.border = "none";
    deleteBtn.style.background = "transparent";
    deleteBtn.style.color = "var(--chrome-dim)";
    deleteBtn.style.fontSize = "16px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.borderRadius = "4px";
    deleteBtn.style.padding = "0";
    node.appendChild(meBlock);
    node.appendChild(deleteBtn);

    var id = newAnnotationId();
    var item;
    if (draftBubble.type === "text-annotation") {
      item = {
        id: id,
        node: node,
        anchorY: draftBubble.anchorY,
        type: "text-annotation",
        selectedText: draftBubble.selectedText,
        context: draftBubble.context,
        localContext: draftBubble.localContext,
        localOffsets: draftBubble.localOffsets,
        nearestSelector: draftBubble.nearestSelectorResult.selector,
        shadowHost: draftBubble.nearestSelectorResult.shadowHost,
        comment: comment,
        range: draftBubble.range,
        lost: false,
      };
    } else {
      item = {
        id: id,
        node: node,
        anchorY: draftBubble.anchorY,
        type: "element-annotation",
        selector: draftBubble.selResult.selector,
        shadowHost: draftBubble.selResult.shadowHost,
        comment: comment,
        target: draftBubble.target,
      };
    }
    queue.push(item);
    node.setAttribute("data-annotation-id", id);

    deleteBtn.addEventListener("click", function () {
      if (item.type === "text-annotation" && textHighlightSet) {
        textHighlightSet.delete(item.range);
        textHighlightHoverSet.delete(item.range);
      }
      removeFromQueue(id);
    });

    if (item.type === "text-annotation") {
      node.addEventListener("mouseenter", function () {
        currentHoverTarget = null;
        hideHighlight();
        if (item.lost) {
          setAnchorLost(node, true);
          return;
        }
        setAnchorLost(node, false);
        if (textHighlightSet && textHighlightHoverSet) {
          textHighlightSet.delete(item.range);
          textHighlightHoverSet.add(item.range);
        }
      });
      node.addEventListener("click", function (event) {
        if (bubbleClickTargetsControl(event) || item.lost) return;
        var anchorEl = nearestElementAncestor(item.range.commonAncestorContainer);
        if (anchorEl && anchorEl.scrollIntoView) anchorEl.scrollIntoView({ block: "center" });
      });
      node.addEventListener("mouseleave", function () {
        if (item.lost) return;
        if (textHighlightSet && textHighlightHoverSet) {
          textHighlightHoverSet.delete(item.range);
          textHighlightSet.add(item.range);
        }
      });
    } else {
      node.addEventListener("mouseenter", function () {
        currentHoverTarget = null;
        var el = resolveAnnotationElement(item);
        if (el) {
          setAnchorLost(node, false);
          positionHighlight(el);
        } else {
          setAnchorLost(node, true);
          hideHighlight();
        }
      });
      node.addEventListener("mouseleave", function () {
        hideHighlight();
      });
      node.addEventListener("click", function (event) {
        if (bubbleClickTargetsControl(event)) return;
        currentHoverTarget = null;
        var el = resolveAnnotationElement(item);
        if (!el) {
          setAnchorLost(node, true);
          hideHighlight();
          return;
        }
        setAnchorLost(node, false);
        if (el.scrollIntoView) el.scrollIntoView({ block: "center" });
        positionHighlight(el);
      });
    }

    draftBubble = null;
    updateSubmitReviewLabel();
    layoutBubbles();
  }

  function removeFromQueue(id) {
    var idx = -1;
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].id === id) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return;
    queue[idx].node.remove();
    queue.splice(idx, 1);
    updateSubmitReviewLabel();
    layoutBubbles();
  }

  function openDraftBubble(target, clickX, clickY) {
    if (draftBubble) closeDraftBubble();

    var selResult = generateSelector(target);
    var node = createBubbleShell();
    node.className = "bubble bubble-draft";

    var controls = buildDraftControls(node);

    var frameRect = frame.getBoundingClientRect();
    positionFloatingBubble(node, frameRect.left + clickX, frameRect.top + clickY);
    controls.textarea.focus();

    draftBubble = {
      node: node,
      anchorY: targetAnchorY(target),
      type: "element-annotation",
      target: target,
      selResult: selResult,
      textarea: controls.textarea,
    };
  }

  function nearestElementAncestor(node) {
    while (node && node.nodeType !== 1) {
      node = node.parentNode;
    }
    return node;
  }

  function getTextContextWithin(range, ancestorEl) {
    if (!ancestorEl) return { before: "", after: "" };
    var beforeRange = range.cloneRange();
    beforeRange.collapse(true);
    beforeRange.setStart(ancestorEl, 0);
    var beforeText = beforeRange.toString();

    var afterRange = range.cloneRange();
    afterRange.collapse(false);
    afterRange.setEnd(ancestorEl, ancestorEl.childNodes.length);
    var afterText = afterRange.toString();

    return {
      before: beforeText.slice(-25),
      after: afterText.slice(0, 25),
    };
  }

  function getTextContext(range) {
    // Climb to an ancestor with enough surrounding text, then build
    // before/after ranges via native Range semantics (start-of-ancestor to
    // selection-start, and selection-end to end-of-ancestor). This handles
    // both text-node and element-boundary containers uniformly \u2014 Range's
    // own toString() flattens across element boundaries correctly, which a
    // manual sibling-walk over startContainer's own children would not
    // (that fails when the selection starts/ends exactly at a child index
    // with nothing earlier *inside* that same container).
    var ancestorEl = range.commonAncestorContainer;
    if (ancestorEl.nodeType !== 1) ancestorEl = ancestorEl.parentElement;
    while (ancestorEl && ancestorEl.parentElement && ancestorEl.textContent.length < 200) {
      ancestorEl = ancestorEl.parentElement;
    }
    if (!ancestorEl) return { before: "", after: "" };

    return getTextContextWithin(range, ancestorEl);
  }

  function openTextDraftBubble(range) {
    if (draftBubble) closeDraftBubble();

    var selectedText = range.toString();
    var ancestorEl = nearestElementAncestor(range.commonAncestorContainer);
    var context = getTextContext(range);
    var localContext = getTextContextWithin(range, ancestorEl);
    var localOffsets = captureLocalOffsets(range, ancestorEl);
    var nearestSelectorResult = ancestorEl ? generateSelector(ancestorEl) : { selector: null, shadowHost: null };

    if (textHighlightSet) textHighlightSet.add(range);

    var node = createBubbleShell();
    node.className = "bubble bubble-draft";

    var controls = buildDraftControls(node);

    var rect = range.getBoundingClientRect();
    var frameRect = frame.getBoundingClientRect();

    positionFloatingBubble(node, frameRect.left + rect.left, frameRect.top + rect.bottom + 6);
    controls.textarea.focus();

    draftBubble = {
      node: node,
      anchorY: frameRect.top + rect.top,
      type: "text-annotation",
      range: range,
      selectedText: selectedText,
      context: context,
      localContext: localContext,
      localOffsets: localOffsets,
      nearestSelectorResult: nearestSelectorResult,
      textarea: controls.textarea,
    };
  }

  function truncateText(text, max) {
    return text.length > max ? text.slice(0, max) + "\u2026" : text;
  }

  function buildSubmissionPayload() {
    return queue.map(function (item) {
      if (item.type === "follow-up") {
        return {
          id: item.id,
          replyToId: item.replyToId,
          comment: item.comment,
        };
      }
      if (item.type === "text-annotation") {
        return {
          id: item.id,
          type: "text-annotation",
          selectedText: item.selectedText,
          context: item.context,
          localContext: item.localContext,
          nearestSelector: item.nearestSelector,
          shadowHost: item.shadowHost,
          comment: item.comment,
        };
      }
      var outerHTML = item.target && item.target.outerHTML ? truncateText(item.target.outerHTML, 500) : "";
      return {
        id: item.id,
        type: "element-annotation",
        selector: item.selector,
        shadowHost: item.shadowHost,
        outerHTML: outerHTML,
        comment: item.comment,
      };
    });
  }

  // Follow-up input is persistent, not click-to-expand (DAC-1) \u2014 reuses
  // buildDraftControls' textarea/Add/\xD7 visual language, but submitting it
  // queues a { replyToId } item instead of opening a fresh draft bubble.
  // Collapsed behind a "Reply" button by default \u2014 only expanding into the
  // textarea once clicked, not shown open-ended on every sent bubble.
  function addFollowUpControls(node, rootId) {
    if (node.querySelector(".followup-controls") || node.querySelector(".followup-reply-btn")) return;

    var replyBtnRow = document.createElement("div");
    replyBtnRow.className = "followup-reply-row";
    replyBtnRow.style.display = "flex";
    replyBtnRow.style.justifyContent = "flex-end";
    replyBtnRow.style.marginTop = "8px";

    var replyBtn = document.createElement("button");
    replyBtn.className = "followup-reply-btn";
    replyBtn.textContent = "Reply";
    replyBtn.style.background = "var(--accent)";
    replyBtn.style.color = "var(--accent-ink)";
    replyBtn.style.border = "none";
    replyBtn.style.borderRadius = "6px";
    replyBtn.style.padding = "4px 12px";
    replyBtn.style.fontSize = "12px";
    replyBtn.style.cursor = "pointer";
    replyBtnRow.appendChild(replyBtn);
    node.appendChild(replyBtnRow);
    if (node.classList.contains("bubble-collapsed")) replyBtnRow.style.display = "none";

    replyBtn.addEventListener("click", function () {
      if (documentReadOnly) return;
      replyBtnRow.remove();

      var wrap = document.createElement("div");
      wrap.className = "followup-controls";
      wrap.style.position = "relative";
      wrap.style.marginTop = "8px";

      var controls = buildDraftControls(wrap);
      // buildDraftControls wires its own close/add buttons assuming a
      // floating draft bubble \u2014 a follow-up box lives inline in a sent
      // bubble, so those default bindings are replaced below.
      var closeBtn = wrap.querySelector(".bubble-cancel");
      var addBtn = wrap.querySelector(".bubble-add");
      var newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      var newAddBtn = addBtn.cloneNode(true);
      addBtn.parentNode.replaceChild(newAddBtn, addBtn);

      newCloseBtn.addEventListener("click", function () {
        wrap.remove();
        addFollowUpControls(node, rootId);
      });
      newAddBtn.addEventListener("click", function () {
        var text = controls.textarea.value;
        if (!text) return;
        queueFollowUp(rootId, text, node);
        wrap.remove();
        addFollowUpControls(node, rootId);
      });

      node.appendChild(wrap);
      if (node.classList.contains("bubble-collapsed")) {
        wrap.style.display = "none";
      } else {
        controls.textarea.focus();
      }
    });
  }

  function queueFollowUp(rootId, text, node) {
    var id = newAnnotationId();
    threadRootById[id] = rootId;
    var item = {
      id: id,
      node: null,
      type: "follow-up",
      replyToId: rootId,
      comment: text,
    };
    queue.push(item);
    appendFollowUpToThread(node, text);
    updateSubmitReviewLabel();
  }

  // Collapsing a sent bubble hides everything except the original "ME"
  // comment at the top \u2014 the thread history and the reply controls
  // (whichever of the collapsed Reply button or the expanded textarea is
  // currently showing). Direct style.display toggling, not a CSS class,
  // matching this file's existing show/hide convention (e.g. applyRailWidth)
  // \u2014 a class-based rule would be overridden by inline styles already set
  // on these same elements (e.g. .followup-reply-row's own display: flex).
  function setBubbleCollapsed(node, collapsed) {
    // A class purely as a state flag (queried, not styled by CSS) \u2014 lets
    // thread/reply-control elements created or recreated *while* collapsed
    // (a new agent reply, cancelling out of an expanded follow-up form)
    // start out hidden too, instead of only the elements alive at toggle time.
    node.classList.toggle("bubble-collapsed", collapsed);
    var thread = node.querySelector(".bubble-thread");
    var replyRow = node.querySelector(".followup-reply-row");
    var controls = node.querySelector(".followup-controls");
    if (thread) thread.style.display = collapsed ? "none" : "block";
    if (replyRow) replyRow.style.display = collapsed ? "none" : "flex";
    if (controls) controls.style.display = collapsed ? "none" : "block";
    var toggleBtn = node.querySelector(".bubble-collapse-toggle");
    if (toggleBtn) toggleBtn.textContent = collapsed ? "+" : "\u2212";
  }

  function markBubbleSent(node) {
    var deleteBtn = node.querySelector(".bubble-delete");
    if (deleteBtn) deleteBtn.remove();
    node.classList.add("bubble-sent");
    node.style.background = "var(--card-sent-bg)";
    addFollowUpControls(node, node.getAttribute("data-annotation-id"));

    var collapseBtn = document.createElement("button");
    collapseBtn.className = "bubble-collapse-toggle";
    collapseBtn.title = "Collapse this comment";
    collapseBtn.textContent = "\u2212";
    collapseBtn.style.position = "absolute";
    collapseBtn.style.top = "6px";
    collapseBtn.style.right = "6px";
    collapseBtn.style.width = "20px";
    collapseBtn.style.height = "20px";
    collapseBtn.style.lineHeight = "18px";
    collapseBtn.style.border = "none";
    collapseBtn.style.background = "transparent";
    collapseBtn.style.color = "var(--chrome-dim)";
    collapseBtn.style.fontSize = "16px";
    collapseBtn.style.cursor = "pointer";
    collapseBtn.style.borderRadius = "4px";
    collapseBtn.style.padding = "0";
    collapseBtn.addEventListener("click", function () {
      setBubbleCollapsed(node, collapseBtn.textContent === "\u2212");
    });
    node.appendChild(collapseBtn);
  }

  function showSendFailure(message) {
    statusText.textContent = message;
    window.setTimeout(function () {
      if (dot.classList.contains("disconnected")) return;
      statusText.textContent = "";
    }, 3000);
  }

  submitReviewButton.addEventListener("click", function () {
    if (queue.length === 0) return;
    var payload = buildSubmissionPayload();
    fetch("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) {
          showSendFailure("Send failed \u2014 please retry");
          return;
        }
        for (var i = 0; i < queue.length; i++) {
          var item = queue[i];
          // A follow-up's own id never receives a reply \u2014 the agent always
          // replies to the thread's root id \u2014 so track that instead.
          pendingReplyIds[item.type === "follow-up" ? item.replyToId : item.id] = true;
          // Follow-up items have no bubble of their own (queueFollowUp
          // already rendered the message inline into the root bubble's
          // thread) \u2014 only new-annotation items go through the normal
          // sent/history bubble lifecycle.
          if (item.type === "follow-up") continue;
          markBubbleSent(item.node);
          sentItems.push(item);
        }
        queue.length = 0;
        updateSubmitReviewLabel();
        updateReplySpinner();
        layoutBubbles();
      })
      .catch(function () {
        showSendFailure("Send failed \u2014 network error");
      });
  });

  function enterReadOnlyMode() {
    documentReadOnly = true;
    documentConfirmed = true;
    approveButton.disabled = true;
    approveButton.textContent = "Confirmed";
    submitReviewButton.disabled = true;
    if (reviewOn) {
      reviewOn = false;
      reviewSwitch.setAttribute("data-on", "false");
      detachOverlayListeners();
      detachSelectionListeners();
    }
    reviewSwitch.style.pointerEvents = "none";
    reviewSwitch.style.opacity = "0.5";
  }

  approveButton.addEventListener("click", function () {
    if (queue.length > 0) {
      showSendFailure("Send or clear the queue first");
      return;
    }
    confirmModalBackdrop.classList.add("visible");
  });

  confirmModalCancel.addEventListener("click", function () {
    confirmModalBackdrop.classList.remove("visible");
  });

  confirmModalOk.addEventListener("click", function () {
    confirmModalBackdrop.classList.remove("visible");
    fetch("/confirm-document", { method: "POST" })
      .then(function (res) {
        if (!res.ok) {
          showSendFailure("Confirm failed \u2014 please retry");
          return;
        }
        enterReadOnlyMode();
      })
      .catch(function () {
        showSendFailure("Confirm failed \u2014 network error");
      });
  });

  function onIframeClick(e) {
    if (!reviewOn) return;
    var doc = getIframeDoc();
    var sel = doc && doc.getSelection ? doc.getSelection() : null;
    if (sel && sel.toString().length > 0) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    // A real mousemove normally precedes a click; fall back to e.target
    // defensively in case it somehow doesn't.
    openDraftBubble(currentHoverTarget || e.target, e.clientX, e.clientY);
  }

  function attachOverlayListeners() {
    var doc = getIframeDoc();
    if (!doc) return;
    doc.addEventListener("mousemove", onIframeMouseMove);
    doc.addEventListener("mouseleave", onIframeMouseLeave);
    doc.addEventListener("click", onIframeClick, true);
    doc.addEventListener("scroll", refreshHighlightPosition, true);
  }

  function detachOverlayListeners() {
    var doc = getIframeDoc();
    if (doc) {
      doc.removeEventListener("mousemove", onIframeMouseMove);
      doc.removeEventListener("mouseleave", onIframeMouseLeave);
      doc.removeEventListener("click", onIframeClick, true);
      doc.removeEventListener("scroll", refreshHighlightPosition, true);
    }
    currentHoverTarget = null;
    hideHighlight();
  }

  frame.addEventListener("load", function () {
    if (reviewOn) attachOverlayListeners();
    attachSelectionListeners();
    reanchorLostTextAnnotations();
  });
  if (reviewOn) attachOverlayListeners();
  attachSelectionListeners();

  reviewSwitch.addEventListener("click", function () {
    reviewOn = !reviewOn;
    reviewSwitch.setAttribute("data-on", reviewOn ? "true" : "false");
    if (reviewOn) {
      attachOverlayListeners();
      attachSelectionListeners();
    } else {
      detachOverlayListeners();
      detachSelectionListeners();
    }
  });

  window.addEventListener("resize", refreshHighlightPosition);
})();
`;
}

// src/shell.ts
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderShellPage(fileName, filePath) {
  const safeFileName = escapeHtml(fileName);
  const safeFilePath = escapeHtml(filePath);
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<title>ezreview</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
<link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
<link rel="alternate icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/favicon-192x192.png" sizes="192x192" />
<style>
  :root[data-theme="dark"] {
    --chrome-bg: rgba(18, 24, 38, 0.72);
    --chrome-bg-solid: #0f1420;
    --chrome-border: rgba(120, 200, 255, 0.25);
    --chrome-fg: #dce8f5;
    --chrome-dim: #6f8299;
    --accent: #4ee6c4;
    --accent-soft: rgba(78, 230, 196, 0.15);
    --accent-ink: #06231c;
    --stage-bg: #06080d;
    --stage-glow: radial-gradient(circle at 50% 0%, #0c1220, var(--stage-bg) 70%);
    --bg-glow-1: rgba(78, 230, 196, 0.06);
    --bg-glow-2: rgba(157, 123, 255, 0.08);
    --ok-green: #4ee6c4;
    --disconnect-red: #ff7a90;
    --stale-amber-fg: #e0c578;
    --stale-amber-bg: rgba(224, 197, 120, 0.12);
    --agent-fg: #f0e3bd;
    --agent-soft: rgba(224, 197, 120, 0.09);
    --agent-border: rgba(224, 197, 120, 0.3);
    --agent-label: #e0c578;
    --title-fg: #fff;
    --body-fg: #c3d0e0;
    --card-bg: #0f1420;
    --card-sent-bg: #141b2b;
    --card-border: rgba(120, 200, 255, 0.18);
    --card-fg: #dce8f5;
    --card-shadow: 0 0 0 1px rgba(255, 255, 255, 0.02), 0 8px 20px -8px rgba(0, 0, 0, 0.6);
    --draft-input-bg: rgba(255, 255, 255, 0.03);
    --danger-soft: rgba(255, 122, 144, 0.1);
    --modal-bg: #0f1420;
    --modal-fg: #dce8f5;
    --modal-cancel-bg: rgba(120, 200, 255, 0.12);
    --modal-cancel-fg: #dce8f5;
  }
  :root[data-theme="light"] {
    --chrome-bg: rgba(255, 255, 255, 0.78);
    --chrome-bg-solid: #ffffff;
    --chrome-border: rgba(20, 90, 110, 0.18);
    --chrome-fg: #1c2b33;
    --chrome-dim: #64798a;
    --accent: #0f9e82;
    --accent-soft: rgba(15, 158, 130, 0.12);
    --accent-ink: #ffffff;
    --stage-bg: #eef2f6;
    --stage-glow: radial-gradient(circle at 50% 0%, #ffffff, var(--stage-bg) 70%);
    --bg-glow-1: rgba(15, 158, 130, 0.07);
    --bg-glow-2: rgba(120, 110, 230, 0.06);
    --ok-green: #0f9e82;
    --disconnect-red: #c23b52;
    --stale-amber-fg: #6b5312;
    --stale-amber-bg: rgba(168, 120, 31, 0.12);
    --agent-fg: #6b5312;
    --agent-soft: rgba(168, 120, 31, 0.1);
    --agent-border: rgba(168, 120, 31, 0.3);
    --agent-label: #a8781f;
    --title-fg: #10202a;
    --body-fg: #35454e;
    --card-bg: #ffffff;
    --card-sent-bg: #f2f5f7;
    --card-border: rgba(20, 90, 110, 0.14);
    --card-fg: #1c2b33;
    --card-shadow: 0 0 0 1px rgba(0, 0, 0, 0.02), 0 8px 20px -8px rgba(20, 40, 50, 0.12);
    --draft-input-bg: rgba(0, 0, 0, 0.02);
    --danger-soft: rgba(194, 59, 82, 0.08);
    --modal-bg: #ffffff;
    --modal-fg: #1c2b33;
    --modal-cancel-bg: rgba(20, 90, 110, 0.08);
    --modal-cancel-fg: #1c2b33;
  }
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    font-family: -apple-system, "Segoe UI", sans-serif;
    font-size: 13px;
  }
  body {
    display: flex;
    flex-direction: column;
    background: var(--stage-bg);
    color: var(--chrome-fg);
    background-image:
      radial-gradient(circle at 15% 15%, var(--bg-glow-1), transparent 40%),
      radial-gradient(circle at 85% 80%, var(--bg-glow-2), transparent 45%);
  }
  #toolbar {
    height: 48px;
    flex: 0 0 48px;
    background: var(--chrome-bg);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--chrome-border);
    color: var(--chrome-fg);
    display: flex;
    align-items: center;
    padding: 0 18px;
    gap: 16px;
    box-sizing: border-box;
    position: relative;
  }
  #wordmark {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    border-right: 1px solid var(--chrome-border);
    padding-right: 14px;
  }
  #wordmark-logo {
    width: 22px;
    height: 22px;
    flex: 0 0 22px;
    display: block;
    filter: drop-shadow(0 0 8px var(--accent-soft));
  }
  #file-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 13px;
  }
  #status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ok-green);
    box-shadow: 0 0 8px var(--ok-green), 0 0 2px var(--ok-green);
    display: inline-block;
  }
  #status-dot.disconnected {
    background: var(--disconnect-red);
    box-shadow: 0 0 8px var(--disconnect-red), 0 0 2px var(--disconnect-red);
  }
  #agent-status {
    color: var(--chrome-fg);
  }
  #file-name {
    color: var(--chrome-fg);
    font-weight: 600;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 40vw;
  }
  #status-text {
    color: var(--disconnect-red);
    margin-left: 4px;
    font-weight: 400;
  }
  #spacer {
    flex: 1;
  }
  #review-mode {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--chrome-dim);
    font-family: ui-monospace, Consolas, monospace;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .switch {
    width: 34px;
    height: 18px;
    border-radius: 9px;
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    position: relative;
    cursor: pointer;
  }
  .switch[data-on="false"] {
    background: transparent;
    border-color: var(--chrome-border);
  }
  .switch-knob {
    position: absolute;
    top: 1px;
    left: 17px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent);
    transition: left 0.15s ease;
  }
  .switch[data-on="false"] .switch-knob {
    left: 1px;
    background: var(--chrome-dim);
    box-shadow: none;
  }
  #spacer-2 {
    flex: 1;
  }
  #theme-toggle {
    background: transparent;
    border: 1px solid var(--chrome-border);
    color: var(--chrome-dim);
    border-radius: 4px;
    width: 30px;
    height: 30px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #theme-toggle:hover {
    color: var(--chrome-fg);
    border-color: var(--accent);
  }
  #approve {
    background: transparent;
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 4px;
    padding: 6px 14px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    letter-spacing: 0.03em;
  }
  #approve:hover {
    background: var(--accent-soft);
  }
  #approve:disabled {
    background: transparent;
    color: var(--chrome-dim);
    border-color: var(--chrome-border);
    cursor: default;
  }
  #submit-review {
    background: var(--accent);
    color: var(--accent-ink);
    border: none;
    border-radius: 6px;
    padding: 9px 12px;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transform: translateY(0) scale(1);
    box-shadow: 0 0 0 rgba(78, 230, 196, 0);
    transition:
      background-color 0.16s ease,
      box-shadow 0.16s ease,
      color 0.16s ease,
      transform 0.12s ease;
  }
  #submit-review:not(:disabled):hover {
    box-shadow: 0 10px 22px -14px var(--accent), 0 0 0 3px var(--accent-soft);
    transform: translateY(-1px);
  }
  #submit-review:not(:disabled):active {
    box-shadow: 0 4px 12px -10px var(--accent), 0 0 0 2px var(--accent-soft);
    transform: translateY(0) scale(0.98);
  }
  #submit-review:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  #submit-review:disabled {
    background: var(--chrome-border);
    color: var(--chrome-dim);
    cursor: default;
    box-shadow: none;
    transform: none;
  }
  #stage {
    flex: 1;
    display: flex;
    min-height: 0;
    position: relative;
  }
  #artifact-pane {
    flex: 1;
    min-width: 0;
    background: var(--stage-glow);
    position: relative;
    padding-left: 16px;
    box-sizing: border-box;
  }
  #artifact-frame {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
    /* The artifact document is arbitrary, uncontrolled HTML \u2014 many pages
       have no explicit background at all, which defaults to transparent,
       not white. Force the iframe element itself opaque so the pane's own
       (now dark-mode-aware) background never shows through unstyled
       artifact content, regardless of what that content does or doesn't set. */
    background: #fff;
  }
  #rail-grip {
    width: 6px;
    flex: 0 0 6px;
    cursor: col-resize;
    background: var(--chrome-border);
  }
  #comment-rail {
    flex: 0 0 auto;
    width: 280px;
    background: var(--chrome-bg);
    backdrop-filter: blur(12px);
    border-left: 1px solid var(--chrome-border);
    position: relative;
    overflow: hidden;
  }
  #comment-rail.collapsed {
    border-left-color: transparent;
  }
  #rail-scroll {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 48px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 40px 12px 12px;
    box-sizing: border-box;
  }
  #rail-collapse {
    position: absolute;
    top: 8px;
    left: 6px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--chrome-bg-solid);
    color: var(--chrome-fg);
    border: 1px solid var(--chrome-border);
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    z-index: 950;
  }
  #rail-collapse-all {
    position: absolute;
    top: 8px;
    right: 6px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--chrome-bg-solid);
    color: var(--chrome-fg);
    border: 1px solid var(--chrome-border);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    z-index: 950;
  }
  #rail-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 56px;
    box-sizing: border-box;
    padding: 8px 14px;
    background: var(--chrome-bg-solid);
    border-top: 1px solid var(--chrome-border);
    display: flex;
    align-items: center;
  }
  #rail-footer #submit-review {
    width: 100%;
  }
  #reply-spinner {
    display: none;
    width: 14px;
    height: 14px;
    flex: 0 0 14px;
    margin-right: 8px;
    border: 2px solid var(--chrome-border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: reply-spinner-spin 0.8s linear infinite;
  }
  #reply-spinner.visible {
    display: block;
  }
  @keyframes reply-spinner-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .bubble-thread {
    max-height: 300px;
    overflow-y: auto;
  }
  #confirm-modal-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 2000;
    align-items: center;
    justify-content: center;
  }
  #confirm-modal-backdrop.visible {
    display: flex;
  }
  #confirm-modal {
    background: var(--modal-bg);
    border: 1px solid var(--chrome-border);
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    padding: 20px 22px;
    width: 320px;
    font-family: -apple-system, "Segoe UI", sans-serif;
    color: var(--modal-fg);
  }
  #confirm-modal p {
    margin: 0 0 18px;
    font-size: 13.5px;
    line-height: 1.5;
  }
  #confirm-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  #confirm-modal-actions button {
    border: none;
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
  }
  #confirm-modal-cancel {
    background: var(--modal-cancel-bg);
    color: var(--modal-cancel-fg);
  }
  #confirm-modal-ok {
    background: var(--accent);
    color: var(--accent-ink);
  }
</style>
</head>
<body>
  <div id="toolbar">
    <span id="wordmark"><img id="wordmark-logo" src="/favicon.svg" alt="" aria-hidden="true" />ezreview</span>
    <div id="file-status">
      <span id="status-dot"></span>
      <span id="agent-status">Agent connected</span>
      <span id="status-text"></span>
    </div>
    <div id="spacer"></div>
    <span id="file-name" title="${safeFilePath}">${safeFileName}</span>
    <div id="spacer-2"></div>
    <button id="theme-toggle" title="Toggle light/dark theme">\u2600\uFE0E</button>
    <div id="review-mode">
      <span>REVIEW MODE</span>
      <span class="switch" id="review-mode-switch" data-on="true"><span class="switch-knob"></span></span>
    </div>
    <button id="approve">Approve</button>
  </div>
  <div id="stage">
    <div id="artifact-pane">
      <iframe id="artifact-frame" src="/artifact"></iframe>
    </div>
    <div id="rail-grip"></div>
    <div id="comment-rail">
      <button id="rail-collapse" title="Collapse comments">\u2039</button>
      <button id="rail-collapse-all" title="Collapse/expand all comments">\u2261</button>
      <div id="rail-scroll"></div>
      <div id="rail-footer">
        <span id="reply-spinner" title="Waiting for the agent to reply"></span>
        <button id="submit-review" disabled>Submit review (0)</button>
      </div>
    </div>
  </div>
  <div id="confirm-modal-backdrop">
    <div id="confirm-modal">
      <p>Confirm this document is done? All feedback history will be deleted.</p>
      <div id="confirm-modal-actions">
        <button id="confirm-modal-cancel">Cancel</button>
        <button id="confirm-modal-ok">OK</button>
      </div>
    </div>
  </div>
  <script>${renderClientScript()}</script>
</body>
</html>
`;
}

// src/sse.ts
import { EventEmitter } from "node:events";
var SseHub = class extends EventEmitter {
  clients = /* @__PURE__ */ new Set();
  register(res) {
    const wasEmpty = this.clients.size === 0;
    this.clients.add(res);
    if (wasEmpty) {
      this.emit("connected");
    }
  }
  unregister(res) {
    const had = this.clients.delete(res);
    if (had && this.clients.size === 0) {
      this.emit("empty");
    }
  }
  get size() {
    return this.clients.size;
  }
  broadcast(eventType, data) {
    const payload = `event: ${eventType}
data: ${JSON.stringify(data)}

`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }
  // server.close() waits for existing keep-alive connections to end on their own; without this, it hangs forever while any SSE tab is open.
  closeAll() {
    for (const client of this.clients) {
      try {
        client.end();
      } catch {
      }
    }
    this.clients.clear();
  }
};

// src/watcher.ts
import { watch } from "node:fs";
var DEFAULT_DEBOUNCE_MS = 250;
function watchArtifactFile(filePath, onChange, debounceMs = DEFAULT_DEBOUNCE_MS) {
  let timer;
  const watcher = watch(filePath, () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = void 0;
      onChange();
    }, debounceMs);
  });
  watcher.on("error", () => {
    if (timer) {
      clearTimeout(timer);
      timer = void 0;
    }
  });
  return {
    close() {
      if (timer) {
        clearTimeout(timer);
      }
      watcher.close();
    }
  };
}

// src/idle-exit.ts
var DEFAULT_IDLE_TIMEOUT_MS = 60 * 60 * 1e3;
function watchForIdle(hub, idleMs, onIdle) {
  let timer;
  function arm() {
    timer = setTimeout(() => {
      timer = void 0;
      onIdle();
    }, idleMs);
  }
  function disarm() {
    if (timer) {
      clearTimeout(timer);
      timer = void 0;
    }
  }
  if (hub.size === 0) {
    arm();
  }
  hub.on("empty", arm);
  hub.on("connected", disarm);
  return {
    stop() {
      disarm();
      hub.off("empty", arm);
      hub.off("connected", disarm);
    }
  };
}

// embedded-favicons:favicon-assets
var faviconAssets = new Map([["/favicon.svg", { "body": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiByb2xlPSJpbWciIGFyaWEtbGFiZWw9ImV6cmV2aWV3Ij4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ibWludCIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM2MkYwRDEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMjZFMkIxIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9IjExMiIgZmlsbD0iIzBGMTcyMCIvPgogIDxwYXRoCiAgICBkPSJNMTI2IDExOGgyMjhjMjcgMCA0OSAyMiA0OSA0OXYxMTBsLTU4IDU4SDIzOWwtNzAgNjN2LTYzaC00M2MtMjcgMC00OS0yMi00OS00OVYxNjdjMC0yNyAyMi00OSA0OS00OVoiCiAgICBmaWxsPSJub25lIgogICAgc3Ryb2tlPSJ1cmwoI21pbnQpIgogICAgc3Ryb2tlLXdpZHRoPSI0MiIKICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgIHN0cm9rZS1saW5lam9pbj0icm91bmQiCiAgLz4KICA8cGF0aCBkPSJNMTUxIDIwMmgxNDdNMTUxIDI2N2g5NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ1cmwoI21pbnQpIiBzdHJva2Utd2lkdGg9IjMwIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8cGF0aAogICAgZD0ibTI4NSAzMzQgNTEgNTAgMTAxLTEwOSIKICAgIGZpbGw9Im5vbmUiCiAgICBzdHJva2U9InVybCgjbWludCkiCiAgICBzdHJva2Utd2lkdGg9IjUyIgogICAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogICAgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIKICAvPgo8L3N2Zz4K", "type": "image/svg+xml" }], ["/favicon.ico", { "body": "AAABAAEAICAAAAEAIAAoEQAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgEAAQIBYOgSAWDrkgFw7pIBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcO6SAWDrkgFg6BIBAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAHxUOSR8WDuUgFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8fFg7lHxUOSQAAAAAAAAAAAAAAAB8WDVEgFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcNTwAAAAAgEAggIBYP7yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFg/vIBAIICAWD4ggFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFg+IIBYOuCAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IhoQ/z0+F/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAWDrggFg7oIBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/95jSj/vOc7/4mjK/8mHxH/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//KiUS/4ikKf+IpCf/KCER/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBYO6CAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/5e0Mv+95zz/vec7/5/BMf8uKhP/IBcP/yAXD/8gFw//IBcP/ykjEv+iwzX/u+Y5/7rmNv+Goif/IRkP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//l7Qz/77oPv+95zz/vOc7/6vQNf85ORb/IBcP/yAXD/8qIxL/osA6/7/oQf++6D7/vOc6/7rmN/9/mCb/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8mHxH/QUIa/0hMHP+iwjj/vug//77oP/+95zz/vec8/7TdOP9YYh7/TVMc/6vJQf/D6kj/wupG/8DoQv+/6D//vOc7/7vnOf9wgyP/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8jGhD/dIMt/8LoR//C6Ub/welE/8DpQ//A6UL/rM86/3yQK/+95z3/vec8/7znOv/E6kn/x+xQ/8brTf/E6kr/wOhC/7/oP/+/6ED/vec9/7znOv9ndiH/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/4SXNP/F60v/w+pJ/8PqSP/C6Ub/wulF/8DpQ/+SrTP/IBcP/259J/+95z3/veg8/8brTv/K7VX/yOxR/8PqSP+45TX/ueU1/8DoQv/A6UL/vec+/73nO/9aZR7/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/9DQxz/xutO/8XrTP+sykL/X2gl/0lMHf9JTB3/RUcb/yYeEf8gFw//IBcP/zQxFf9ISxv/WGAi/5ivQP+BkjT/SU4a/0dMGf+Zui3/uuY2/8HpRP/A6UP/v+g//7zmPP9UXB3/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/2RtKv/H60//x+xO/1FVIf8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/ycgEf+VtSz/u+Y4/8LpRv/B6UT/v+hA/7zlPf9JThr/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//dYIx/8jsUf/H7E//NTIX/yAXD/89PRj/kq4x/5a0MP+Usy3/k7Ir/5GyKP+QsSb/g6Eh/ychEP8gFw//IBcP/yAXD/8gFw//IBcP/yYfEf+SsSv/u+Y6/8PqSP/C6UX/wOhC/6nLOP8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/91gzL/yOxS/8jsUv81Mhf/IBcP/2FrJv/C6kX/wOhC/7/oP/+85zv/u+c4/7nlNf+45TL/NjUT/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/zMxFP+55TX/veg8/8PqSf/D6kf/iqEx/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/3aCM//K7VX/yexT/zUyF/8gFw//IRkQ/0RGHf9JTB7/SUwd/0hMHP9ISxv/R0sa/zs7Fv8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//MzEU/7rmN/+55jb/fJEp/11mJf8lHhH/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//doM0/8rtVv/K7VX/NTIY/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/80MRT/u+Y4/7vmOP9tfyL/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/93gzT/zO5Y/8vtVv81Mhj/IBcP/z48Hf93gzX/doM0/3WCMv90gjD/c4Iv/3OBLf9ygSv/cYAq/3CAKP9vgCf/QEEY/yAXD/8gFw//IBcP/zQxFf+85zv/u+Y5/25/I/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/3eDNf/M7ln/zO5Y/zUyGP8gFw//Z24w/9HwYv/P71//zu9d/8ztWP/L7Vb/yOxS/8fsUP/F6kv/xOpJ/8HpRf9qdyf/IBcP/yAXD/8gFw//NDEV/7znPP+85zv/bn8k/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//d4M2/87vXP/N7lr/NjIY/yAXD/8hGRD/R0ch/0xNJP9MTST/TE0j/0xNI/9LTSL/S00h/0pNIP9KTB//Rkcd/yMaEP8gFw//IBcP/yAXD/80MRX/vug+/73nPP9ufyX/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/90fzX/zu9d/87vXP89Oxz/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/zs6GP++6D//vug//2p6JP8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/1hcKf/P71//zu9d/32LOP8hGRD/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8hGQ//dogr/8DoQf+/6ED/UFce/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//LScV/8XiW//Q8F//zu9d/7vXVP+iuUj/orlH/6G4Rv+huUX/oLhD/6C4Q/+ft0H/n7hB/523P/+dtz7/nLY9/5y3PP+btjr/m7Y6/7DSQP/C6kX/wOhD/7XbPv8qJBL/IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//YGUt/9DwYf/Q71//z+9e/87vXf/N7lv/ze5a/8vuWP/L7Vf/yu1V/8ntVP/I7FL/yOxR/8fsT//G607/xetM/8XrS//E6kn/w+pI/8LpRv/C6UX/WGAh/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD+AgFw//IBcP/yAXD/8gFw//T1El/6nAT//I5lz/z+9e/8/vXf/N7lv/ze5a/8vtWP/L7lf/yu1V/8rtVP/I7FL/yOxR/8frT//H7E7/xetM/8XrS/+84Uf/n7s8/0lNHf8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw/gIBcOqCAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXDqggFw5wIBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcOcB4PDxEfFg7mIBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/x8WDuUcDg4SAAAAACAWDkcgFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//HxUOSQAAAAAAAAAAAAAAAB8VDkkfFg7lIBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//HxYO5R8VDkkAAAAAAAAAAAAAAAAAAAAAAAAAACAQABAgFg6BIBYOuSAXDukgFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw7pIBYOuSAWDoEgEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==", "type": "image/x-icon" }], ["/favicon-16x16.png", { "body": "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACU0lEQVR4nJySz0tUURTHP3fmvZlxJAfT8QeYji6cbJv0B9RCDDcuoqQIJI0wiChatIwIMhDbtaiFRAhWlIto0a+F0kIIA93kKKbGODmj5qgzOjPvvdt9bxpjNhZ+H7xz7vn5PedeDRBlwYY+4eKKlCIsBDr7QEpyCDmn5JOt+OKgKKsOXRcwyEFgcVuUVYW+qa5hDoZFDUHI1pp7Omk8fxpvbQWGtLAUR1O1MG2pziaS9HKC2PA7YkNv8+NAjaboezW/j/C1LiKPX5GYmP7jtL98VEE/dKKFmqudrIx8xNrJ4OTaMYFjTeDRmH/6Br20BK3Uj+2VMp9qpHbYXV4lHVmi8nIHvpZ60pOzTiOnAC4XhqVIWpLGc20Ejh8lq872KFlpkvw6Q/ThC8dvWJYTX4BWoGvmCTOrWLhfftijnfkRd+6uAHsv3upy0sKhWCiA083Wqi624WttJqcY5JQt1jOAzOScZE9jLbpw03y/jzldZ210PF8g9T3qbLriVCub41MkRj6RiSYoCddz5EI7u7+S7CS3qLvXg1cV2FyOk/w8/XeEbGKDlfcTNN3tdZhk4uvEX48R7O2gQvMr0pJ1I40uXWytrjN/qR9D5dgQgerQ3oAe9QaCZ09S2d2OaZpEHwzjNiUNN7ow/DrptQ0WuvvJLa4UL7GAbGyN1MwSgd0MS7cesT025di3JyNU3jxDfOB5UXKBwYKSDXsGzY1eFyS78JN/QV3CjEv9hoqMhvlfyU4zGHVn/PoXHx63FLJc7eqwEMK1f1dpIEREbfbZJqk7vwEAAP//+3xGfgAAAAZJREFUAwDngxZcYPwfPgAAAABJRU5ErkJggg==", "type": "image/png" }], ["/favicon-32x32.png", { "body": "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFAUlEQVR4nMRXW0xbZRz/fT2HHspaKAgFB4MSHJIp6qYmi8aEvQy3h2EWFyPGXXQxGYmbPoz5xNDF+GDCkqnLHpiZZpo4H1wWdRj3QOJmGPHCrqAgULrBuI220NLbOZ/f97WnF1ouEob/k/a79v///e89MhLJardmG/Eum20GwVMEsGEFiAJj7KuLTTs8QRyHa9ClnxF9kl1Qto2tWgkha/EAiVI6zMDs94w7LsYAZNvstYSgDatIVKPbOQiSk1OaSxVyi2n+MFaRhCX8arVMMw17mBlWVTgn7mpqknfL4AH3/9FmmaQBYHvuSWw4VA9LZRkMJoVHMTSqxUfCRzpnn0b3I+uwbxbev51wnDgHT2d3WulcNskptNPEzdIdNXjm43cYI54+kScmjD1syr/n7FPu0+i+Di5+3nfkJO5f7EgPIhGA0WrB1p9PQc5eIzSZvTeJmaERwYTGNIxcF2OCxnPPjSUFyCjKg6ZpCE17cXPbYajTvhQAcuIi/9nHIFuyBNPe1u/Q03KWpwuWRQaCkkO7YNu7HQbG0/x0JdztXanXEhfmipKYGe+cb1++cE7st5MXrkTcxh5jRfr6lmQBIksxH4ZnA5E9pknuE5WQjBlirUOiUaBi5HERCmP6xj+gqhrjpzIeOj+SIS8OgF9Woz7VRdl3bcWmDxrEPj8JaZExTNWU9VDLN7h35kckGyIaI8DSAOiIdZr8oxs3Pvk6FtXxDJgb/RTuztspAuJZsQQAEIy1pMue3iHxWQ5FLKrbky4OgNJUxDwGLNUVICwGEn3Ox7BrBoG+u1gIgv4oeTmw1b2AibYOaIHQPAAIFb5OJNvOGpQd3QeV+VqN+pqP+trxUhPCQ2PzQuDKKJIM+6u14JzNz1ejv/HkIhZIMJfneh8mLneBGuVIILJLPPz4GHJNQ51wpxVsyDSisHkPMogBZoORAY8op2woS7qXBCAwPhWr6VmsJvjvjmOW1fP+Ay34L8T7R/FnB2HeWAmzpDDhmvioLEWHjp2ZH4Dn9kAs2ssPvwb5oWz470TMy/Pc1+1g/guKtXFtvvgoBVaU1tVgxjmK4UsdrHhpyD+4E6bHy5lwo7CW0F5T4ThyCt6ryY0ppRmtb96Pwpe3JHc5RBqR6/J19DW0oOitHbA11AlL5UkmKAZZaDirhTAZ8nK2sDDNea8IazxmAGfTabgv/JpiLSnTbG1O3Jj65Zr4oXnTo/FOpycRq5TKOhvy970YO8sgEvtzEU83iflcNkhiLszO7owc/xauc+1IRykWiPmRBZGpohiGLAUljfVQKkvEvi6I9/vhD89Cc3uxvnE3lPKiSEVMyBa+Hmv9AROfnsd8JM93oPmD8N4aEPOQxwsj4n0+ODoFBwvMQP+IOL/WdRRVp9+DUrUuKlwTET/FmtFCwoWiWAIlxoKPZ0X9sZhwYZUZH3re/AgzvU7WG1QBwHXpN4y+/+WivCVljfUA86F5oUuZVaUwVZczpr/D+faJtH8saDAMV9tVyGU2+AdGMNb0hdhbUDGKUcLeCdoYgNqFLhLJAOWRYvj/cmIliQH4iVV6dC16UdVWXDgnLptkWu12xYg/2cqK1SQKF6tpGw1+1+AgS5c3sMqkEezlskXFCHrdPUpWTiebbmFvLBY8QIq+nL4yPeb4nq8l/SDgc/cFMnI/VyTwYh/g1ZT5aA1WgKKv51fY9CtPkLweuO+4qZ/9CwAA//+4WbtnAAAABklEQVQDANOa59N84qZ6AAAAAElFTkSuQmCC", "type": "image/png" }], ["/favicon-64x64.png", { "body": "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", "type": "image/png" }], ["/favicon-192x192.png", { "body": "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", "type": "image/png" }], ["/favicon-512x512.png", { "body": "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", "type": "image/png" }]].map(([pathname, asset]) => [
  pathname,
  { body: Buffer.from(asset.body, "base64"), type: asset.type }
]));
function isFaviconPath(pathname) {
  return faviconAssets.has(pathname);
}
function loadFaviconAsset(pathname) {
  const asset = faviconAssets.get(pathname);
  if (!asset) throw new Error(`Unknown favicon path: ${pathname}`);
  return asset;
}

// src/feedback-queue.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
var QUEUE_FILENAME = "feedback-queue.jsonl";
var SUBMITTED_IDS_FILENAME = "submitted-ids.jsonl";
var THREADS_FILENAME = "threads.jsonl";
var THREAD_ROOTS_FILENAME = "thread-roots.jsonl";
function readIdLines(path) {
  if (!existsSync(path)) {
    return /* @__PURE__ */ new Set();
  }
  const lines = readFileSync(path, "utf-8").split("\n").filter((line) => line.length > 0);
  return new Set(lines);
}
function appendBatch(sessionDir, items) {
  mkdirSync(sessionDir, { recursive: true });
  appendFileSync(join(sessionDir, QUEUE_FILENAME), JSON.stringify(items) + "\n");
  const ids = items.map((item) => String(item.id));
  appendFileSync(join(sessionDir, SUBMITTED_IDS_FILENAME), ids.map((id) => id + "\n").join(""));
  const threadRoots = loadThreadRoots(sessionDir);
  const rootRecords = [];
  for (const item of items) {
    const id = String(item.id);
    const parentId = item.replyToId != null ? String(item.replyToId) : id;
    const rootId = threadRoots.get(parentId) ?? parentId;
    threadRoots.set(id, rootId);
    rootRecords.push({ id, rootId });
    appendThreadMessage(sessionDir, rootId, "human", String(item.comment ?? ""));
  }
  if (rootRecords.length > 0) {
    appendFileSync(join(sessionDir, THREAD_ROOTS_FILENAME), rootRecords.map((record) => JSON.stringify(record) + "\n").join(""));
  }
}
function loadSubmittedIds(sessionDir) {
  return readIdLines(join(sessionDir, SUBMITTED_IDS_FILENAME));
}
function loadThreadRoots(sessionDir) {
  const path = join(sessionDir, THREAD_ROOTS_FILENAME);
  if (!existsSync(path)) {
    return /* @__PURE__ */ new Map();
  }
  const lines = readFileSync(path, "utf-8").split("\n").filter((line) => line.length > 0);
  return new Map(lines.map((line) => {
    const record = JSON.parse(line);
    return [record.id, record.rootId];
  }));
}
function appendThreadMessage(sessionDir, threadId, from, text) {
  mkdirSync(sessionDir, { recursive: true });
  const message = { threadId, from, text, timestamp: Date.now() };
  appendFileSync(join(sessionDir, THREADS_FILENAME), JSON.stringify(message) + "\n");
}
function loadThreadHistory(sessionDir, threadId) {
  const path = join(sessionDir, THREADS_FILENAME);
  if (!existsSync(path)) {
    return [];
  }
  const lines = readFileSync(path, "utf-8").split("\n").filter((line) => line.length > 0);
  return lines.map((line) => JSON.parse(line)).filter((message) => message.threadId === threadId).sort((a, b) => a.timestamp - b.timestamp);
}
function resetSessionFiles(sessionDir) {
  for (const filename of [QUEUE_FILENAME, SUBMITTED_IDS_FILENAME, THREADS_FILENAME, THREAD_ROOTS_FILENAME]) {
    const path = join(sessionDir, filename);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}
function consumeNextBatch(sessionDir) {
  const path = join(sessionDir, QUEUE_FILENAME);
  if (!existsSync(path)) {
    return null;
  }
  const lines = readFileSync(path, "utf-8").split("\n").filter((line) => line.length > 0);
  if (lines.length === 0) {
    return null;
  }
  const [first, ...rest] = lines;
  if (rest.length === 0) {
    unlinkSync(path);
  } else {
    const tmpPath = `${path}.${process.pid}.tmp`;
    writeFileSync(tmpPath, rest.join("\n") + "\n");
    renameSync(tmpPath, path);
  }
  return JSON.parse(first);
}

// src/session.ts
import { resolve, join as join2 } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { mkdirSync as mkdirSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2, existsSync as existsSync2 } from "node:fs";
function normalizeArtifactPath(filePath) {
  const absolute = resolve(filePath);
  return process.platform === "win32" ? absolute.toLowerCase() : absolute;
}
function sessionHash(filePath) {
  const normalized = normalizeArtifactPath(filePath);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}
function sessionDirFor(filePath, root = join2(homedir(), ".ezreview")) {
  return join2(root, sessionHash(filePath));
}
function readSessionInfo(sessionDir) {
  const sessionJsonPath = join2(sessionDir, "session.json");
  if (!existsSync2(sessionJsonPath)) {
    return void 0;
  }
  try {
    const raw = readFileSync2(sessionJsonPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return void 0;
  }
}
function writeSessionInfo(sessionDir, info) {
  mkdirSync2(sessionDir, { recursive: true });
  writeFileSync2(join2(sessionDir, "session.json"), JSON.stringify(info, null, 2));
}

// src/server.ts
var DEFAULT_HOST = "127.0.0.1";
var BASE_PORT = 4400;
var MAX_PORT_ATTEMPTS = 50;
function readJsonBody(req) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        resolvePromise(raw.length ? JSON.parse(raw) : void 0);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
function createRequestHandler(artifactPath, sseHub, sessionDir, onConfirmDocument) {
  const absoluteArtifactPath = resolve2(artifactPath);
  const submittedIds = loadSubmittedIds(sessionDir);
  return function handler(req, res) {
    const pathname = (req.url ?? "/").split("?")[0];
    if (pathname === "/" && req.method === "GET") {
      const body = renderShellPage(basename(absoluteArtifactPath), absoluteArtifactPath);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(body);
      return;
    }
    if (isFaviconPath(pathname) && req.method === "GET") {
      try {
        const faviconAsset = loadFaviconAsset(pathname);
        res.writeHead(200, {
          "Content-Type": faviconAsset.type,
          "Cache-Control": "public, max-age=86400"
        });
        res.end(faviconAsset.body);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Favicon asset not found");
      }
      return;
    }
    if (pathname === "/artifact" && req.method === "GET") {
      try {
        const body = readFileSync3(absoluteArtifactPath);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(body);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`File not found: ${absoluteArtifactPath}`);
      }
      return;
    }
    if (pathname === "/healthz" && req.method === "GET") {
      const body = JSON.stringify({ file: absoluteArtifactPath, pid: process.pid });
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(body);
      return;
    }
    if (pathname === "/events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      res.write(":ok\n\n");
      sseHub.register(res);
      const cleanup = () => {
        sseHub.unregister(res);
      };
      req.on("close", cleanup);
      res.on("error", cleanup);
      return;
    }
    if (pathname === "/feedback" && req.method === "POST") {
      readJsonBody(req).then((body) => {
        const isValidBatch = Array.isArray(body) && body.every((item) => item && typeof item === "object" && "id" in item);
        if (!isValidBatch) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "expected an array of annotation items, each with an id" }));
          return;
        }
        const batchIds = body.map((item) => String(item.id));
        const idsSeenInBatch = /* @__PURE__ */ new Set();
        const duplicateId = batchIds.find((id) => {
          if (submittedIds.has(id) || idsSeenInBatch.has(id)) {
            return true;
          }
          idsSeenInBatch.add(id);
          return false;
        });
        if (duplicateId) {
          res.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: `duplicate annotation id: ${duplicateId}` }));
          return;
        }
        const unknownReplyTo = body.find(
          (item) => item.replyToId != null && !submittedIds.has(String(item.replyToId))
        );
        if (unknownReplyTo) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: `unknown annotation id: ${String(unknownReplyTo.replyToId)}` }));
          return;
        }
        appendBatch(sessionDir, body);
        for (const item of body) {
          submittedIds.add(String(item.id));
        }
        sseHub.broadcast("feedback", {});
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true }));
      }).catch(() => {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "invalid JSON body" }));
      });
      return;
    }
    if (pathname === "/reply" && req.method === "POST") {
      readJsonBody(req).then((body) => {
        const isValid = !!body && typeof body === "object" && typeof body.id === "string" && typeof body.text === "string";
        if (!isValid) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "expected { id: string, text: string }" }));
          return;
        }
        const { id, text } = body;
        if (!submittedIds.has(id)) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: `unknown annotation id: ${id}` }));
          return;
        }
        const rootId = loadThreadRoots(sessionDir).get(id) ?? id;
        appendThreadMessage(sessionDir, rootId, "agent", text);
        sseHub.broadcast("reply", { id: rootId, text });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, id: rootId }));
      }).catch(() => {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "invalid JSON body" }));
      });
      return;
    }
    if (pathname === "/confirm-document" && req.method === "POST") {
      resetSessionFiles(sessionDir);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true }));
      sseHub.broadcast("confirmed", {});
      onConfirmDocument();
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  };
}
function listenOnAvailablePort(server, host, basePort, maxAttempts = MAX_PORT_ATTEMPTS) {
  return new Promise((resolvePromise, reject) => {
    let attempt = 0;
    function tryListen(port) {
      const onError = (err) => {
        server.removeListener("listening", onListening);
        if ((err.code === "EADDRINUSE" || err.code === "EACCES" || err.code === "EPERM") && attempt < maxAttempts) {
          attempt += 1;
          tryListen(port + 1);
          return;
        }
        reject(err);
      };
      const onListening = () => {
        server.removeListener("error", onError);
        resolvePromise(port);
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port, host);
    }
    tryListen(basePort);
  });
}
async function checkHealthz(baseUrl, timeoutMs = 500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(new URL("/healthz", baseUrl), { signal: controller.signal });
    if (!res.ok) {
      return void 0;
    }
    return await res.json();
  } catch {
    return void 0;
  } finally {
    clearTimeout(timer);
  }
}
async function startReviewServer(options) {
  const host = options.host ?? DEFAULT_HOST;
  const basePort = options.basePort ?? BASE_PORT;
  const sessionDir = options.sessionDir ?? sessionDirFor(options.artifactPath);
  const sseHub = new SseHub();
  const handler = createRequestHandler(options.artifactPath, sseHub, sessionDir, () => {
    close().catch(() => {
    });
  });
  const server = createHttpServer(handler);
  const port = await listenOnAvailablePort(server, host, basePort);
  const watcherHandle = watchArtifactFile(options.artifactPath, () => {
    sseHub.broadcast("reload", { timestamp: Date.now() });
  });
  function close() {
    idleHandle.stop();
    watcherHandle.close();
    sseHub.closeAll();
    server.closeAllConnections();
    return new Promise((resolvePromise, reject) => {
      server.close((err) => err ? reject(err) : resolvePromise());
    });
  }
  const idleHandle = watchForIdle(sseHub, options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS, () => {
    close().catch(() => {
    });
  });
  return {
    server,
    port,
    host,
    url: `http://${host}:${port}/`,
    sseHub,
    close
  };
}

// src/idempotent-open.ts
async function openIdempotently(file, opts = {}) {
  const host = opts.host ?? DEFAULT_HOST;
  const normalizedFile = normalizeArtifactPath(file);
  const dir = sessionDirFor(file, opts.sessionRoot);
  const existing = readSessionInfo(dir);
  if (existing) {
    const health = await checkHealthz(`http://${host}:${existing.port}/`);
    if (health && normalizeArtifactPath(health.file) === normalizedFile) {
      return { url: `http://${host}:${existing.port}/`, reused: true };
    }
  }
  const handle = await startReviewServer({ artifactPath: file, host, basePort: opts.basePort, sessionDir: dir });
  writeSessionInfo(dir, { port: handle.port, pid: process.pid, file: normalizedFile });
  return { url: handle.url, reused: false, handle };
}

// src/wait.ts
import { TextDecoder } from "node:util";
import { request as httpRequest } from "node:http";
var WaitError = class extends Error {
};
var ReviewConfirmed = class extends Error {
};
function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max)}\u2026` : text;
}
function requiredReply(id) {
  return `Required reply: ${id}. After handling this annotation, run the ezreview reply command for this id and confirm it succeeds. An artifact reload is not a reply.`;
}
function renderBatch(items, sessionDir) {
  const threadRoots = loadThreadRoots(sessionDir);
  return items.map((item) => {
    if (item.replyToId) {
      const rootId = threadRoots.get(item.id) ?? threadRoots.get(item.replyToId) ?? item.replyToId;
      const history = loadThreadHistory(sessionDir, rootId);
      const historyText = history.map((m) => `  [${m.from}] ${m.text}`).join("\n");
      return `[${item.id}] Follow-up on thread ${rootId}
Reply target: ${rootId}
Full history:
${historyText}
${requiredReply(rootId)}`;
    }
    const comment = item.comment ?? "";
    if (item.type === "text-annotation") {
      const context = item.localContext ?? item.context;
      const selector = item.nearestSelector ?? "?";
      const before = context?.before ?? "";
      const after = context?.after ?? "";
      return `[${item.id}] Selected text: "${item.selectedText}"
Nearest element: ${selector}
Local context: before (${before.length} characters) "${before}", after (${after.length} characters) "${after}"
Edit scope: exact occurrence only inside ${selector}; never replace identical text elsewhere in the document.
Edit boundary: the highlighted selected text is a hard edit boundary; do not modify anything outside the highlight.
Minimal change: follow the comment literally. If it names a specific word, token, or phrase, change only that text inside the highlight and preserve every other character unless the comment explicitly requests more. Do not translate, rename, normalize, or rewrite adjacent text.
Comment: ${comment}
${requiredReply(item.id)}`;
    }
    const outer = item.outerHTML ? ` \u2014 ${truncate(item.outerHTML, 500)}` : "";
    return `[${item.id}] Element ${item.selector}${outer}. Comment: ${comment}
${requiredReply(item.id)}`;
  }).join("\n");
}
function readerFromIncomingMessage(res) {
  const iterator = res[Symbol.asyncIterator]();
  return {
    async read() {
      const { value, done } = await iterator.next();
      return { value, done: !!done };
    }
  };
}
async function nextSseChunk(reader, decoder, state) {
  while (true) {
    const boundary = state.buffer.indexOf("\n\n");
    if (boundary !== -1) {
      const chunk = state.buffer.slice(0, boundary);
      state.buffer = state.buffer.slice(boundary + 2);
      return chunk;
    }
    let value;
    let done;
    try {
      ({ value, done } = await reader.read());
    } catch {
      throw new WaitError("Connection to the review server closed unexpectedly.");
    }
    if (done) {
      throw new WaitError("Connection to the review server closed unexpectedly.");
    }
    state.buffer += decoder.decode(value, { stream: true });
  }
}
function connectToEvents(baseUrl) {
  return new Promise((resolvePromise, reject) => {
    const req = httpRequest(new URL("events", baseUrl), { headers: { Accept: "text/event-stream" } }, (res) => {
      resolvePromise({ req, res });
    });
    req.on("error", reject);
    req.end();
  });
}
async function waitForFeedback(file, opts = {}) {
  const host = opts.host ?? DEFAULT_HOST;
  const sessionDir = sessionDirFor(file, opts.sessionRoot);
  const info = readSessionInfo(sessionDir);
  const notRunningMessage = `No running review session for ${file}. Run "ezreview ${file}" first.`;
  if (!info) {
    throw new WaitError(notRunningMessage);
  }
  const baseUrl = `http://${host}:${info.port}/`;
  const health = await checkHealthz(baseUrl);
  if (!health) {
    throw new WaitError(notRunningMessage);
  }
  const { req, res } = await connectToEvents(baseUrl);
  const reader = readerFromIncomingMessage(res);
  const decoder = new TextDecoder();
  const state = { buffer: "" };
  try {
    await nextSseChunk(reader, decoder, state);
    while (true) {
      const batch = consumeNextBatch(sessionDir);
      if (batch) {
        return renderBatch(batch, sessionDir);
      }
      const chunk = await nextSseChunk(reader, decoder, state);
      if (chunk.startsWith("event: confirmed")) {
        throw new ReviewConfirmed("Review confirmed complete \u2014 no further feedback will arrive.");
      }
      if (!chunk.startsWith("event: feedback")) {
        continue;
      }
    }
  } finally {
    req.destroy();
  }
}

// src/reply.ts
var ReplyError = class extends Error {
};
async function sendReply(file, id, text, opts = {}) {
  const host = opts.host ?? DEFAULT_HOST;
  const sessionDir = sessionDirFor(file, opts.sessionRoot);
  const info = readSessionInfo(sessionDir);
  const notRunningMessage = `No running review session for ${file}. Run "ezreview ${file}" first.`;
  if (!info) {
    throw new ReplyError(notRunningMessage);
  }
  const baseUrl = `http://${host}:${info.port}/`;
  const health = await checkHealthz(baseUrl);
  if (!health) {
    throw new ReplyError(notRunningMessage);
  }
  const res = await fetch(new URL("reply", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, text })
  });
  if (!res.ok) {
    const body2 = await res.json().catch(() => ({}));
    throw new ReplyError(body2.error ?? `reply failed with status ${res.status}`);
  }
  const body = await res.json().catch(() => ({}));
  return body.id ?? id;
}

// src/cli.ts
var USAGE = `Usage:
  ezreview <file.html>                          Open a review server
  ezreview wait <file.html>                      Block until the next feedback batch
  ezreview reply <file.html> --to <id> "<text>"  Respond to a submitted annotation

Options:
  -h, --help    Show this help message
`;
function parseCliArgs(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
      to: { type: "string" }
    },
    allowPositionals: true
  });
  if (values.help) {
    return { kind: "help" };
  }
  const [first, second, third] = positionals;
  if (first === "wait") {
    if (!second) {
      return { kind: "error", message: "wait requires <file.html>" };
    }
    return { kind: "wait", file: second };
  }
  if (first === "reply") {
    if (!second) {
      return { kind: "error", message: "reply requires <file.html>" };
    }
    if (!values.to) {
      return { kind: "error", message: "reply requires --to <id>" };
    }
    if (!third) {
      return { kind: "error", message: 'reply requires "<text>"' };
    }
    return { kind: "reply", file: second, to: values.to, text: third };
  }
  if (!first) {
    return { kind: "error", message: "missing required argument <file.html>" };
  }
  return { kind: "open", file: first };
}
var CliError = class extends Error {
};
function validateArtifactFile(path) {
  if (!existsSync3(path)) {
    throw new CliError(`File not found: ${path}`);
  }
  if (!statSync(path).isFile()) {
    throw new CliError(`Not a file: ${path}`);
  }
  if (extname(path).toLowerCase() !== ".html") {
    process.stderr.write(`Warning: ${path} does not have a .html extension
`);
  }
}
async function openReview(file, deps = {}) {
  const result = await openIdempotently(file, deps);
  process.stdout.write(`${result.url}
`);
  if (!result.reused) {
    (deps.openBrowser ?? openInBrowser)(result.url);
  }
  return result;
}
async function main(argv = process.argv.slice(2)) {
  const parsed = parseCliArgs(argv);
  if (parsed.kind === "help") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (parsed.kind === "error") {
    process.stderr.write(`Error: ${parsed.message}

`);
    process.stderr.write(USAGE);
    return 1;
  }
  try {
    validateArtifactFile(parsed.file);
  } catch (err) {
    if (err instanceof CliError) {
      process.stderr.write(`Error: ${err.message}
`);
      return 1;
    }
    throw err;
  }
  if (parsed.kind === "open") {
    await openReview(parsed.file);
    return 0;
  }
  if (parsed.kind === "wait") {
    try {
      const rendered = await waitForFeedback(parsed.file);
      process.stdout.write(`${rendered}
`);
      return 0;
    } catch (err) {
      if (err instanceof ReviewConfirmed) {
        process.stdout.write(`${err.message}
`);
        return 0;
      }
      if (err instanceof WaitError) {
        process.stderr.write(`Error: ${err.message}
`);
        return 1;
      }
      throw err;
    }
  }
  try {
    const replyId = await sendReply(parsed.file, parsed.to, parsed.text);
    process.stdout.write(`Reply sent to ${replyId}.
`);
    return 0;
  } catch (err) {
    if (err instanceof ReplyError) {
      process.stderr.write(`Error: ${err.message}
`);
      return 1;
    }
    throw err;
  }
}
function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === realpathSync(resolve3(process.argv[1]));
  } catch {
    return false;
  }
}
if (isMainModule()) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((err) => {
    process.stderr.write(`Error: ${err.message}
`);
    process.exitCode = 1;
  });
}
export {
  CliError,
  USAGE,
  main,
  openReview,
  parseCliArgs,
  validateArtifactFile
};
