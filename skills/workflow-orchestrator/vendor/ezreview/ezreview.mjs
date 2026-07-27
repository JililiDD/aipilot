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
  var settingsToggleButton = document.getElementById("settings-toggle");
  var appearancePopover = document.getElementById("appearance-popover");
  var appearanceCloseButton = document.getElementById("appearance-close");
  var themeChoiceButtons = Array.prototype.slice.call(document.querySelectorAll("[data-theme-choice]"));
  var commentTextSizeInput = document.getElementById("comment-text-size");
  var commentTextSizeValue = document.getElementById("comment-text-size-value");
  var appearanceResetButton = document.getElementById("appearance-reset");
  var accentPresetButtons = Array.prototype.slice.call(
    document.querySelectorAll(".accent-swatch[data-color]"),
  );
  var customAccentWrap = document.getElementById("custom-accent-wrap");
  var customAccentInput = document.getElementById("custom-accent-color");
  var customAccentVisual = document.getElementById("custom-accent-visual");
  var documentReadOnly = false;
  var documentConfirmed = false;

  // ---- Appearance settings ----

  var THEME_STORAGE_KEY = "ezreview-theme";
  var APPEARANCE_COOKIE_NAME = "ezreview-appearance-v1";
  var APPEARANCE_COOKIE_MAX_AGE = 31536000;
  var DEFAULT_APPEARANCE = {
    version: 1,
    commentTextSize: 13,
    accentColor: "#4ee6c4",
  };

  function isValidCommentTextSize(value) {
    return Number.isInteger(value) && value >= 12 && value <= 22;
  }

  function isValidAccentColor(value) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  }

  function parseHexColor(hex) {
    if (!isValidAccentColor(hex)) return null;
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  function rgbToHsl(rgb) {
    var r = rgb.r / 255;
    var g = rgb.g / 255;
    var b = rgb.b / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var lightness = (max + min) / 2;
    var hue = 0;
    var saturation = 0;
    var delta = max - min;
    if (delta !== 0) {
      saturation = lightness > 0.5
        ? delta / (2 - max - min)
        : delta / (max + min);
      if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
      hue /= 6;
    }
    return { h: hue, s: saturation, l: lightness };
  }

  function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToRgb(hsl) {
    var r;
    var g;
    var b;
    if (hsl.s === 0) {
      r = hsl.l;
      g = hsl.l;
      b = hsl.l;
    } else {
      var q = hsl.l < 0.5
        ? hsl.l * (1 + hsl.s)
        : hsl.l + hsl.s - hsl.l * hsl.s;
      var p = 2 * hsl.l - q;
      r = hueToRgb(p, q, hsl.h + 1 / 3);
      g = hueToRgb(p, q, hsl.h);
      b = hueToRgb(p, q, hsl.h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  function linearizeColorChannel(channel) {
    var normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance(rgb) {
    return (
      0.2126 * linearizeColorChannel(rgb.r) +
      0.7152 * linearizeColorChannel(rgb.g) +
      0.0722 * linearizeColorChannel(rgb.b)
    );
  }

  function contrastRatio(first, second) {
    var lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
    var darker = Math.min(relativeLuminance(first), relativeLuminance(second));
    return (lighter + 0.05) / (darker + 0.05);
  }

  function deriveEffectiveAccent(sourceHex, theme) {
    var source = parseHexColor(sourceHex) || parseHexColor(DEFAULT_APPEARANCE.accentColor);
    var surface = theme === "light"
      ? { r: 255, g: 255, b: 255 }
      : { r: 15, g: 20, b: 32 };
    var effective = source;
    if (contrastRatio(effective, surface) < 3) {
      var hsl = rgbToHsl(source);
      var passing;
      var failing;
      if (theme === "light") {
        passing = 0;
        failing = hsl.l;
      } else {
        passing = 1;
        failing = hsl.l;
      }
      for (var iteration = 0; iteration < 24; iteration += 1) {
        var midpoint = (passing + failing) / 2;
        var candidate = hslToRgb({ h: hsl.h, s: hsl.s, l: midpoint });
        if (contrastRatio(candidate, surface) >= 3) passing = midpoint;
        else failing = midpoint;
      }
      effective = hslToRgb({ h: hsl.h, s: hsl.s, l: passing });
    }
    var black = { r: 0, g: 0, b: 0 };
    var white = { r: 255, g: 255, b: 255 };
    return {
      rgb: effective,
      ink: contrastRatio(effective, black) >= contrastRatio(effective, white)
        ? "#000000"
        : "#ffffff",
      softAlpha: theme === "light" ? 0.12 : 0.15,
    };
  }

  function applyAccentTokens() {
    var theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    var effective = deriveEffectiveAccent(appearanceState.accentColor, theme);
    var rgb = effective.rgb;
    document.documentElement.style.setProperty(
      "--accent",
      "rgb(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ")",
    );
    document.documentElement.style.setProperty(
      "--accent-soft",
      "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + effective.softAlpha + ")",
    );
    document.documentElement.style.setProperty("--accent-ink", effective.ink);
  }

  function readAppearanceCookie() {
    try {
      var cookiePrefix = APPEARANCE_COOKIE_NAME + "=";
      var entries = document.cookie ? document.cookie.split(";") : [];
      for (var index = 0; index < entries.length; index += 1) {
        var entry = entries[index].trim();
        if (entry.indexOf(cookiePrefix) !== 0) continue;
        var parsed = JSON.parse(decodeURIComponent(entry.slice(cookiePrefix.length)));
        if (
          parsed &&
          parsed.version === 1 &&
          isValidCommentTextSize(parsed.commentTextSize) &&
          isValidAccentColor(parsed.accentColor)
        ) {
          return {
            version: 1,
            commentTextSize: parsed.commentTextSize,
            accentColor: parsed.accentColor.toLowerCase(),
          };
        }
      }
    } catch (e) {
      // Malformed or unavailable cookies fall back to safe defaults.
    }
    return {
      version: DEFAULT_APPEARANCE.version,
      commentTextSize: DEFAULT_APPEARANCE.commentTextSize,
      accentColor: DEFAULT_APPEARANCE.accentColor,
    };
  }

  function writeAppearanceCookie() {
    try {
      document.cookie =
        APPEARANCE_COOKIE_NAME +
        "=" +
        encodeURIComponent(JSON.stringify(appearanceState)) +
        "; Path=/; Max-Age=" +
        APPEARANCE_COOKIE_MAX_AGE +
        "; SameSite=Strict";
    } catch (e) {
      // The in-memory value remains active even if persistence is unavailable.
    }
  }

  var appearanceState = readAppearanceCookie();
  var customAccentSelected = false;

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeChoiceButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-theme-choice") === theme));
    });
    applyAccentTokens();
  }

  function persistTheme(theme) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      // The current page still reflects the selection when storage is blocked.
    }
  }

  function applyAppearance() {
    document.documentElement.style.setProperty(
      "--comment-font-size",
      appearanceState.commentTextSize + "px",
    );
    commentTextSizeInput.value = String(appearanceState.commentTextSize);
    commentTextSizeValue.value = appearanceState.commentTextSize + "px";
    var selectedPreset = false;
    accentPresetButtons.forEach(function (button) {
      var swatchColor = button.getAttribute("data-color");
      var selected =
        !customAccentSelected &&
        !!swatchColor &&
        swatchColor.toLowerCase() === appearanceState.accentColor;
      button.setAttribute("aria-pressed", String(selected));
      if (selected) selectedPreset = true;
    });
    var customSelected = !selectedPreset;
    customAccentWrap.setAttribute("data-selected", String(customSelected));
    customAccentInput.setAttribute("aria-pressed", String(customSelected));
    customAccentInput.value = appearanceState.accentColor;
    customAccentVisual.style.setProperty("--custom-accent-color", appearanceState.accentColor);
    applyAccentTokens();
  }

  function setPopoverOpen(open, returnFocus) {
    appearancePopover.hidden = !open;
    settingsToggleButton.setAttribute("aria-expanded", String(open));
    if (!open && returnFocus) settingsToggleButton.focus();
  }

  (function initTheme() {
    var stored = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch (e) {
      // localStorage may be unavailable (privacy mode, sandboxed iframe) \u2014
      // fall back to the server-rendered default theme silently.
    }
    applyTheme(stored === "light" || stored === "dark" ? stored : "dark");
  })();

  applyAppearance();

  settingsToggleButton.addEventListener("click", function () {
    setPopoverOpen(appearancePopover.hidden, false);
  });

  appearanceCloseButton.addEventListener("click", function () {
    setPopoverOpen(false, true);
  });

  themeChoiceButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var theme = button.getAttribute("data-theme-choice");
      if (theme !== "dark" && theme !== "light") return;
      applyTheme(theme);
      persistTheme(theme);
    });
  });

  accentPresetButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var color = button.getAttribute("data-color");
      if (!isValidAccentColor(color)) return;
      customAccentSelected = false;
      appearanceState.accentColor = color.toLowerCase();
      applyAppearance();
      writeAppearanceCookie();
    });
  });

  customAccentInput.addEventListener("input", function () {
    var color = customAccentInput.value;
    if (!isValidAccentColor(color)) return;
    customAccentSelected = true;
    appearanceState.accentColor = color.toLowerCase();
    applyAppearance();
    writeAppearanceCookie();
  });

  commentTextSizeInput.addEventListener("input", function () {
    var next = Number(commentTextSizeInput.value);
    if (!isValidCommentTextSize(next)) return;
    appearanceState.commentTextSize = next;
    applyAppearance();
    writeAppearanceCookie();
  });

  appearanceResetButton.addEventListener("click", function () {
    customAccentSelected = false;
    appearanceState = {
      version: DEFAULT_APPEARANCE.version,
      commentTextSize: DEFAULT_APPEARANCE.commentTextSize,
      accentColor: DEFAULT_APPEARANCE.accentColor,
    };
    applyTheme("dark");
    persistTheme("dark");
    applyAppearance();
    writeAppearanceCookie();
  });

  document.addEventListener("click", function (event) {
    if (appearancePopover.hidden) return;
    if (appearancePopover.contains(event.target) || settingsToggleButton.contains(event.target)) return;
    setPopoverOpen(false, false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || appearancePopover.hidden) return;
    event.preventDefault();
    setPopoverOpen(false, true);
  });

  function dismissAppearanceFromIframe() {
    if (!appearancePopover.hidden) setPopoverOpen(false, false);
  }

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
  highlightBox.style.zIndex = "var(--z-review-element)";
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

  function getReviewTarget(target) {
    var doc = getIframeDoc();
    if (!target || !doc || target === doc || target === doc.documentElement || target === doc.body) {
      return null;
    }
    return target;
  }

  function positionHighlight(target) {
    target = getReviewTarget(target);
    if (!target) {
      hideHighlight();
      return;
    }
    var rect = target.getBoundingClientRect();
    var frameRect = frame.getBoundingClientRect();
    var left = frameRect.left + rect.left;
    var top = frameRect.top + rect.top;
    var right = left + rect.width;
    var bottom = top + rect.height;
    if (
      right <= frameRect.left ||
      left >= frameRect.right ||
      bottom <= frameRect.top ||
      top >= frameRect.bottom
    ) {
      hideHighlight();
      return;
    }
    var clipTop = Math.max(0, frameRect.top - top);
    var clipRight = Math.max(0, right - frameRect.right);
    var clipBottom = Math.max(0, bottom - frameRect.bottom);
    var clipLeft = Math.max(0, frameRect.left - left);
    highlightBox.style.left = left + "px";
    highlightBox.style.top = top + "px";
    highlightBox.style.width = rect.width + "px";
    highlightBox.style.height = rect.height + "px";
    highlightBox.style.clipPath =
      "inset(" + clipTop + "px " + clipRight + "px " + clipBottom + "px " + clipLeft + "px)";
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
    currentHoverTarget = getReviewTarget(e.target);
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

  // CSS Custom Highlight supplies the translucent fill behind the glyphs,
  // while this shell-owned overlay adds a two-tone edge around each rendered
  // line box. Keeping the edge outside the iframe makes it independent of an
  // artifact's theme, CSP, stacking contexts, transforms, and pointer events.
  var textHighlightOverlayRoot = document.createElement("div");
  textHighlightOverlayRoot.id = "text-highlight-overlay";
  textHighlightOverlayRoot.setAttribute("aria-hidden", "true");
  textHighlightOverlayRoot.style.position = "fixed";
  textHighlightOverlayRoot.style.pointerEvents = "none";
  textHighlightOverlayRoot.style.overflow = "hidden";
  textHighlightOverlayRoot.style.zIndex = "var(--z-review-text)";
  textHighlightOverlayRoot.style.display = "none";
  document.body.appendChild(textHighlightOverlayRoot);

  var textHighlightOverlayFrameId = null;

  function clearTextHighlightOverlay() {
    if (textHighlightOverlayFrameId !== null) {
      window.cancelAnimationFrame(textHighlightOverlayFrameId);
      textHighlightOverlayFrameId = null;
    }
    textHighlightOverlayRoot.textContent = "";
    textHighlightOverlayRoot.style.display = "none";
  }

  function appendTextHighlightEdges(highlightSet, state) {
    if (!highlightSet || !highlightSet.forEach) return;
    var seenRects = {};
    highlightSet.forEach(function (range) {
      if (!range || !range.getClientRects) return;
      var rects = range.getClientRects();
      for (var i = 0; i < rects.length; i++) {
        var rect = rects[i];
        if (rect.width <= 0 || rect.height <= 0) continue;
        var key = [
          Math.round(rect.left * 10),
          Math.round(rect.top * 10),
          Math.round(rect.width * 10),
          Math.round(rect.height * 10),
        ].join(":");
        if (seenRects[key]) continue;
        seenRects[key] = true;

        var edge = document.createElement("div");
        edge.className = "text-highlight-edge text-highlight-edge-" + state;
        edge.style.position = "absolute";
        edge.style.left = rect.left - 2 + "px";
        edge.style.top = rect.top - 1 + "px";
        edge.style.width = rect.width + 4 + "px";
        edge.style.height = rect.height + 2 + "px";
        edge.style.boxSizing = "border-box";
        edge.style.border = "1px solid var(--selection-edge-light)";
        edge.style.borderRadius = "2px";
        edge.style.boxShadow = state === "hover"
          ? "0 0 0 2px var(--selection-edge-dark)"
          : "0 0 0 1px var(--selection-edge-dark)";
        textHighlightOverlayRoot.appendChild(edge);
      }
    });
  }

  function refreshTextHighlightOverlay() {
    textHighlightOverlayFrameId = null;
    var frameRect = frame.getBoundingClientRect();
    textHighlightOverlayRoot.style.left = frameRect.left + "px";
    textHighlightOverlayRoot.style.top = frameRect.top + "px";
    textHighlightOverlayRoot.style.width = frameRect.width + "px";
    textHighlightOverlayRoot.style.height = frameRect.height + "px";
    textHighlightOverlayRoot.textContent = "";
    appendTextHighlightEdges(textHighlightSet, "normal");
    appendTextHighlightEdges(textHighlightHoverSet, "hover");
    textHighlightOverlayRoot.style.display = textHighlightOverlayRoot.childNodes.length ? "block" : "none";
  }

  function scheduleTextHighlightOverlayRefresh() {
    if (textHighlightOverlayFrameId !== null) return;
    textHighlightOverlayFrameId = window.requestAnimationFrame(refreshTextHighlightOverlay);
  }

  function addTextHighlight(range) {
    if (!textHighlightSet) return;
    textHighlightSet.add(range);
    scheduleTextHighlightOverlayRefresh();
  }

  function removeTextHighlight(range) {
    if (textHighlightSet) textHighlightSet.delete(range);
    if (textHighlightHoverSet) textHighlightHoverSet.delete(range);
    scheduleTextHighlightOverlayRefresh();
  }

  function setTextHighlightHovered(range, hovered) {
    if (!textHighlightSet || !textHighlightHoverSet) return;
    if (hovered) {
      textHighlightSet.delete(range);
      textHighlightHoverSet.add(range);
    } else {
      textHighlightHoverSet.delete(range);
      textHighlightSet.add(range);
    }
    scheduleTextHighlightOverlayRefresh();
  }

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
    clearTextHighlightOverlay();
    textHighlightRegistryDoc = doc;

    var style = doc.createElement("style");
    style.setAttribute("data-ezreview-text-highlight", "");
    var rootStyle = getComputedStyle(document.documentElement);
    var selectionRest =
      rootStyle.getPropertyValue("--selection-highlight-rest").trim() || "rgba(255,196,0,.28)";
    var selectionHover =
      rootStyle.getPropertyValue("--selection-highlight-hover").trim() || "rgba(255,196,0,.58)";
    style.textContent =
      // Fill locates the selected text; the shell-level black/white edge
      // carries contrast across light, dark, saturated, and mixed artwork.
      "::highlight(" + HIGHLIGHT_NAME + ") { background-color: " + selectionRest + "; }" +
      "::highlight(" + HIGHLIGHT_HOVER_NAME + ") { background-color: " + selectionHover + "; }";
    doc.head.appendChild(style);

    textHighlightSet = new win.Highlight();
    textHighlightHoverSet = new win.Highlight();
    win.CSS.highlights.set(HIGHLIGHT_NAME, textHighlightSet);
    win.CSS.highlights.set(HIGHLIGHT_HOVER_NAME, textHighlightHoverSet);
    doc.addEventListener("scroll", scheduleTextHighlightOverlayRefresh, true);
    win.addEventListener("resize", scheduleTextHighlightOverlayRefresh);
    scheduleTextHighlightOverlayRefresh();
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
    if (railCollapsed) hideSourceTooltip();
    else if (activeSourceTooltip) positionSourceTooltip(activeSourceTooltip.help, activeSourceTooltip.tooltip);
    scheduleTextHighlightOverlayRefresh();
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
    answerBlock.style.paddingTop = "4px";
    answerBlock.style.paddingBottom = "4px";
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
    meBlock.style.paddingTop = "4px";
    meBlock.style.paddingBottom = "4px";
    meBlock.style.paddingLeft = "8px";
    meBlock.style.borderLeft = "3px solid var(--human-color)";
    meBlock.style.background = "var(--human-soft)";

    var meLabel = document.createElement("div");
    meLabel.className = "me-label";
    meLabel.textContent = "ME";
    meLabel.style.fontSize = "10px";
    meLabel.style.fontWeight = "bold";
    meLabel.style.color = "var(--human-color)";
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

  var TEXT_SOURCE_NOT_FOUND_DETAIL =
    "The original selection not found because its text and the surrounding text changed.";
  var ELEMENT_SOURCE_NOT_FOUND_DETAIL =
    "The referenced element not found because it was removed or its element structure changed.";

  var activeSourceTooltip = null;

  function positionSourceTooltip(help, tooltip) {
    var railRect = railScroll.getBoundingClientRect();
    var helpRect = help.getBoundingClientRect();
    var tooltipWidth = Math.max(120, Math.min(220, railRect.width - 16));
    tooltip.style.width = tooltipWidth + "px";
    var tooltipRect = tooltip.getBoundingClientRect();
    var left = Math.min(
      Math.max(helpRect.left, railRect.left + 8),
      railRect.right - tooltipRect.width - 8,
    );
    var below = helpRect.bottom + 6;
    var above = helpRect.top - tooltipRect.height - 6;
    var top = below + tooltipRect.height <= railRect.bottom - 8
      ? below
      : Math.max(railRect.top + 8, above);
    tooltip.style.left = Math.round(left) + "px";
    tooltip.style.top = Math.round(top) + "px";
  }

  function showSourceTooltip(help, tooltip) {
    hideSourceTooltip();
    tooltip.classList.add("visible");
    activeSourceTooltip = { help: help, tooltip: tooltip };
    positionSourceTooltip(help, tooltip);
  }

  function hideSourceTooltip(tooltip) {
    var target = tooltip || (activeSourceTooltip && activeSourceTooltip.tooltip);
    if (target) target.classList.remove("visible");
    if (!tooltip || (activeSourceTooltip && activeSourceTooltip.tooltip === tooltip)) {
      activeSourceTooltip = null;
    }
  }

  function removeSourceNotFoundBadge(node) {
    var badge = node.querySelector(".anchor-lost-badge");
    if (!badge) return;
    var help = badge.querySelector(".anchor-lost-help");
    var tooltipId = help && help.getAttribute("aria-describedby");
    var tooltip = tooltipId && document.getElementById(tooltipId);
    if (tooltip) {
      hideSourceTooltip(tooltip);
      tooltip.remove();
    }
    badge.remove();
  }

  function setAnchorLost(node, lost, detail) {
    var badge = node.querySelector(".anchor-lost-badge");
    if (lost) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "anchor-lost-badge";

        var label = document.createElement("span");
        label.className = "anchor-lost-label";
        label.textContent = "Source not found";
        label.setAttribute("role", "status");
        badge.appendChild(label);

        var tooltipId = "source-not-found-" + node.getAttribute("data-annotation-id");
        var help = document.createElement("button");
        help.type = "button";
        help.className = "anchor-lost-help";
        help.textContent = "?";
        help.setAttribute("aria-label", "Why the source could not be found");
        help.setAttribute("aria-describedby", tooltipId);
        badge.appendChild(help);

        var tooltip = document.createElement("span");
        tooltip.id = tooltipId;
        tooltip.className = "anchor-lost-tooltip";
        tooltip.setAttribute("role", "tooltip");
        tooltip.textContent = detail || "The source changed, so this comment can no longer be linked to it.";
        node.appendChild(badge);
        document.body.appendChild(tooltip);

        help.addEventListener("mouseenter", function () {
          showSourceTooltip(help, tooltip);
        });
        help.addEventListener("mouseleave", function () {
          if (document.activeElement !== help) hideSourceTooltip(tooltip);
        });
        help.addEventListener("focus", function () {
          showSourceTooltip(help, tooltip);
        });
        help.addEventListener("blur", function () {
          hideSourceTooltip(tooltip);
        });
      } else {
        var existingHelp = badge.querySelector(".anchor-lost-help");
        var existingTooltipId = existingHelp && existingHelp.getAttribute("aria-describedby");
        var existingTooltip = existingTooltipId && document.getElementById(existingTooltipId);
        if (existingTooltip && detail) existingTooltip.textContent = detail;
      }
    } else {
      removeSourceNotFoundBadge(node);
    }
  }

  railScroll.addEventListener("scroll", function () {
    if (activeSourceTooltip) positionSourceTooltip(activeSourceTooltip.help, activeSourceTooltip.tooltip);
  });

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
    // Above the review highlights \u2014 a floating draft opened right
    // where the hover highlight box currently sits must never be covered by
    // it.
    node.style.zIndex = "var(--z-review-draft)";
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
    textarea.style.fontSize = "var(--comment-font-size)";
    textarea.style.lineHeight = "1.45";
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
    if (draftBubble.type === "text-annotation") {
      removeTextHighlight(draftBubble.range);
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
    if (textHighlightSet && textHighlightSet.clear) textHighlightSet.clear();
    if (textHighlightHoverSet && textHighlightHoverSet.clear) textHighlightHoverSet.clear();
    clearTextHighlightOverlay();
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
          addTextHighlight(newRange);
        } else {
          setAnchorLost(item.node, true, TEXT_SOURCE_NOT_FOUND_DETAIL);
        }
      }
    }
  }

  function refreshSourceNotFoundStatuses() {
    var lists = [queue, sentItems];
    for (var l = 0; l < lists.length; l++) {
      for (var i = 0; i < lists[l].length; i++) {
        var item = lists[l][i];
        if (item.type === "text-annotation") {
          setAnchorLost(item.node, item.lost, TEXT_SOURCE_NOT_FOUND_DETAIL);
        } else if (item.type === "element-annotation") {
          setAnchorLost(item.node, !resolveAnnotationElement(item), ELEMENT_SOURCE_NOT_FOUND_DETAIL);
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
      if (item.type === "text-annotation") {
        removeTextHighlight(item.range);
      }
      removeFromQueue(id);
    });

    if (item.type === "text-annotation") {
      node.addEventListener("mouseenter", function () {
        currentHoverTarget = null;
        hideHighlight();
        if (item.lost) {
          setAnchorLost(node, true, TEXT_SOURCE_NOT_FOUND_DETAIL);
          return;
        }
        setAnchorLost(node, false);
        setTextHighlightHovered(item.range, true);
      });
      node.addEventListener("click", function (event) {
        if (bubbleClickTargetsControl(event) || item.lost) return;
        var anchorEl = nearestElementAncestor(item.range.commonAncestorContainer);
        if (anchorEl && anchorEl.scrollIntoView) anchorEl.scrollIntoView({ block: "center" });
      });
      node.addEventListener("mouseleave", function () {
        if (item.lost) return;
        setTextHighlightHovered(item.range, false);
      });
    } else {
      node.addEventListener("mouseenter", function () {
        currentHoverTarget = null;
        var el = resolveAnnotationElement(item);
        if (el) {
          setAnchorLost(node, false);
          positionHighlight(el);
        } else {
          setAnchorLost(node, true, ELEMENT_SOURCE_NOT_FOUND_DETAIL);
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
          setAnchorLost(node, true, ELEMENT_SOURCE_NOT_FOUND_DETAIL);
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
    removeSourceNotFoundBadge(queue[idx].node);
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

    addTextHighlight(range);

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
    var target = getReviewTarget(e.target);
    if (!target) return;
    openDraftBubble(target, e.clientX, e.clientY);
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
    var loadedDoc = getIframeDoc();
    if (loadedDoc) loadedDoc.addEventListener("pointerdown", dismissAppearanceFromIframe);
    if (reviewOn) attachOverlayListeners();
    attachSelectionListeners();
    reanchorLostTextAnnotations();
    refreshSourceNotFoundStatuses();
  });
  var initialFrameDoc = getIframeDoc();
  if (initialFrameDoc) initialFrameDoc.addEventListener("pointerdown", dismissAppearanceFromIframe);
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

  window.addEventListener("resize", function () {
    refreshHighlightPosition();
    if (activeSourceTooltip) positionSourceTooltip(activeSourceTooltip.help, activeSourceTooltip.tooltip);
    scheduleTextHighlightOverlayRefresh();
  });
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
  :root {
    --z-review-text: 900;
    --z-rail-controls: 950;
    --z-review-element: 1000;
    --z-review-draft: 1100;
    --z-toolbar: 1200;
    --z-modal: 2000;
    --comment-font-size: 13px;
    --selection-highlight-rest: rgba(255, 196, 0, 0.28);
    --selection-highlight-hover: rgba(255, 196, 0, 0.58);
    --selection-edge-light: rgba(255, 255, 255, 0.96);
    --selection-edge-dark: rgba(0, 0, 0, 0.88);
  }
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
    --ok-green: #3ecf7a;
    --disconnect-red: #ff7a90;
    --stale-amber-fg: #e0c578;
    --stale-amber-bg: rgba(224, 197, 120, 0.12);
    --human-color: #ff7a90;
    --human-soft: rgba(255, 122, 144, 0.1);
    --title-fg: #fff;
    --body-fg: #c3d0e0;
    --card-bg: #0f1420;
    --card-sent-bg: #141b2b;
    --card-border: rgba(120, 200, 255, 0.18);
    --card-fg: #dce8f5;
    --card-shadow: 0 0 0 1px rgba(255, 255, 255, 0.02), 0 8px 20px -8px rgba(0, 0, 0, 0.6);
    --draft-input-bg: rgba(255, 255, 255, 0.03);
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
    --ok-green: #218f55;
    --disconnect-red: #c23b52;
    --stale-amber-fg: #6b5312;
    --stale-amber-bg: rgba(168, 120, 31, 0.12);
    --human-color: #c23b52;
    --human-soft: rgba(194, 59, 82, 0.08);
    --title-fg: #10202a;
    --body-fg: #35454e;
    --card-bg: #ffffff;
    --card-sent-bg: #f2f5f7;
    --card-border: rgba(20, 90, 110, 0.14);
    --card-fg: #1c2b33;
    --card-shadow: 0 0 0 1px rgba(0, 0, 0, 0.02), 0 8px 20px -8px rgba(20, 40, 50, 0.12);
    --draft-input-bg: rgba(0, 0, 0, 0.02);
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
    z-index: var(--z-toolbar);
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
    width: 23px;
    height: 23px;
    flex: 0 0 23px;
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
  #settings-wrap {
    position: relative;
    flex: 0 0 34px;
  }
  #settings-toggle {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--chrome-border);
    border-radius: 6px;
    color: var(--chrome-fg);
    background: transparent;
    cursor: pointer;
    transition:
      color 0.15s ease,
      border-color 0.15s ease,
      background-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  #settings-toggle svg {
    width: 20px;
    height: 20px;
    display: block;
  }
  #settings-toggle:hover,
  #settings-toggle[aria-expanded="true"] {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-soft);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  #settings-toggle:focus-visible,
  #appearance-popover button:focus-visible,
  #appearance-popover input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  #settings-tooltip {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    z-index: 2;
    transform: translate(-50%, -3px);
    padding: 4px 7px;
    border: 1px solid var(--chrome-border);
    border-radius: 5px;
    color: var(--chrome-fg);
    background: var(--chrome-bg-solid);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
      opacity 0.12s ease,
      transform 0.12s ease,
      visibility 0.12s;
  }
  #settings-toggle:hover + #settings-tooltip,
  #settings-toggle:focus-visible + #settings-tooltip {
    transform: translate(-50%, 0);
    opacity: 1;
    visibility: visible;
  }
  #settings-toggle[aria-expanded="true"] + #settings-tooltip {
    opacity: 0;
    visibility: hidden;
  }
  #appearance-popover {
    position: absolute;
    z-index: 3;
    top: 40px;
    right: 0;
    width: 292px;
    box-sizing: border-box;
    padding: 14px;
    border: 1px solid var(--chrome-border);
    border-radius: 10px;
    color: var(--chrome-fg);
    background: var(--chrome-bg-solid);
    box-shadow:
      0 18px 48px -22px rgba(0, 0, 0, 0.75),
      0 8px 18px -12px rgba(0, 0, 0, 0.55);
  }
  #appearance-popover[hidden] {
    display: none;
  }
  #appearance-popover::before {
    content: "";
    position: absolute;
    top: -5px;
    right: 12px;
    width: 9px;
    height: 9px;
    transform: rotate(45deg);
    background: var(--chrome-bg-solid);
    border-left: 1px solid var(--chrome-border);
    border-top: 1px solid var(--chrome-border);
  }
  #appearance-popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  #appearance-title {
    margin: 0;
    font-size: 14px;
    letter-spacing: -0.01em;
  }
  #appearance-close {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    color: var(--chrome-dim);
    background: transparent;
    font-size: 17px;
    line-height: 1;
    cursor: pointer;
  }
  #appearance-close:hover {
    color: var(--chrome-fg);
    background: var(--accent-soft);
  }
  .appearance-setting + .appearance-setting {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--chrome-border);
  }
  .appearance-setting-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 9px;
    color: var(--chrome-fg);
    font-size: 12px;
    font-weight: 650;
  }
  #comment-text-size-value {
    color: var(--chrome-dim);
    font-variant-numeric: tabular-nums;
    font-weight: 550;
  }
  #theme-segments {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px;
    padding: 3px;
    border: 1px solid var(--chrome-border);
    border-radius: 7px;
    background: var(--draft-input-bg);
  }
  .theme-segment {
    padding: 6px 10px;
    border: 0;
    border-radius: 5px;
    color: var(--chrome-dim);
    background: transparent;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  .theme-segment[aria-pressed="true"] {
    color: var(--accent-ink);
    background: var(--accent);
    font-weight: 700;
  }
  #comment-text-size {
    width: 100%;
    height: 18px;
    margin: 0;
    accent-color: var(--accent);
    cursor: pointer;
  }
  #accent-swatches {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .accent-swatch {
    position: relative;
    width: 24px;
    height: 24px;
    flex: 0 0 24px;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 50%;
    background: var(--swatch);
    box-shadow: 0 0 0 1px var(--chrome-border);
    cursor: pointer;
  }
  .accent-swatch[aria-pressed="true"],
  #custom-accent-wrap[data-selected="true"] #custom-accent-visual {
    border-color: var(--chrome-bg-solid);
    box-shadow: 0 0 0 2px var(--accent);
  }
  .accent-swatch[aria-pressed="true"]::after,
  #custom-accent-wrap[data-selected="true"] #custom-accent-visual::after {
    content: "\u2713";
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 12px;
    font-weight: 900;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
  }
  #custom-accent-wrap {
    position: relative;
    margin-left: auto;
    width: 24px;
    height: 24px;
  }
  #custom-accent-color {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 24px;
    height: 24px;
    margin: 0;
    padding: 0;
    opacity: 0;
    cursor: pointer;
  }
  #custom-accent-visual {
    display: grid;
    place-items: center;
    color: #fff;
    background: conic-gradient(#ff5e7d, #ffc14d, #50df91, #43d5ff, #7e74ff, #ef6cff, #ff5e7d);
    font-size: 14px;
    font-weight: 800;
    pointer-events: none;
  }
  #custom-accent-wrap[data-selected="true"] #custom-accent-visual {
    color: transparent;
    background: var(--custom-accent-color);
  }
  #custom-accent-color:focus-visible + #custom-accent-visual {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
  #appearance-reset {
    width: 100%;
    margin-top: 14px;
    padding: 11px 0 0;
    border: 0;
    border-top: 1px solid var(--chrome-border);
    color: var(--chrome-dim);
    background: transparent;
    font: inherit;
    font-size: 12px;
    font-weight: 650;
    text-align: left;
    cursor: pointer;
  }
  #appearance-reset:hover {
    color: var(--accent);
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
  #approve:focus-visible,
  #confirm-modal-ok:focus-visible,
  .bubble-add:focus-visible,
  .followup-reply-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .bubble-add:hover,
  .followup-reply-btn:hover {
    box-shadow: 0 0 0 3px var(--accent-soft);
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
    z-index: var(--z-rail-controls);
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
    z-index: var(--z-rail-controls);
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
  .answer-text,
  .bubble-comment {
    font-size: var(--comment-font-size);
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .anchor-lost-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    position: relative;
    margin-top: 6px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    line-height: 16px;
    color: var(--stale-amber-fg);
    background: var(--stale-amber-bg);
    z-index: 2;
  }
  .anchor-lost-help {
    width: 16px;
    height: 16px;
    padding: 0;
    border: 1px solid currentColor;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 700;
    line-height: 14px;
    text-align: center;
    cursor: help;
  }
  .anchor-lost-help:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .anchor-lost-tooltip {
    position: fixed;
    left: 0;
    top: 0;
    z-index: var(--z-toolbar);
    width: 220px;
    box-sizing: border-box;
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--chrome-bg-solid);
    color: var(--chrome-fg);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.28);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.4;
    text-align: left;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
  .anchor-lost-tooltip.visible {
    opacity: 1;
    visibility: visible;
  }
  #confirm-modal-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: var(--z-modal);
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
  @media (max-width: 520px) {
    #appearance-popover {
      width: min(292px, calc(100vw - 24px));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
</style>
</head>
<body>
  <div id="toolbar">
    <span id="wordmark">
      <svg id="wordmark-logo" viewBox="0 0 512 512" aria-hidden="true">
        <rect width="512" height="512" rx="112" fill="var(--chrome-bg-solid)" />
        <path d="M126 118h228c27 0 49 22 49 49v110l-58 58H239l-70 63v-63h-43c-27 0-49-22-49-49V167c0-27 22-49 49-49Z" fill="none" stroke="currentColor" stroke-width="42" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M283 285l53 75 101-105" fill="none" stroke="var(--chrome-bg-solid)" stroke-width="72" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M151 190h164M151 238h102M151 285h132l53 75 101-105" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      ezreview
    </span>
    <div id="file-status">
      <span id="status-dot"></span>
      <span id="agent-status">Agent connected</span>
      <span id="status-text"></span>
    </div>
    <div id="spacer"></div>
    <span id="file-name" title="${safeFilePath}">${safeFileName}</span>
    <div id="spacer-2"></div>
    <div id="settings-wrap">
      <button id="settings-toggle" type="button" aria-label="Appearance settings" aria-describedby="settings-tooltip" aria-expanded="false" aria-controls="appearance-popover">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M19.14 12.94a7.7 7.7 0 0 0 .05-.94 7.7 7.7 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.2 7.2 0 0 0-1.62-.94L14.39 2.8a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.52c-.58.24-1.12.56-1.62.94L5.18 5.3a.5.5 0 0 0-.61.22L2.65 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.7 7.7 0 0 0-.05.94c0 .32.02.63.05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.61.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.52c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.52c.58-.24 1.12-.56 1.62-.94l2.39.96c.22.1.48.01.61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/>
        </svg>
      </button>
      <span id="settings-tooltip" role="tooltip">Settings</span>
      <section id="appearance-popover" aria-labelledby="appearance-title" hidden>
        <div id="appearance-popover-header">
          <h2 id="appearance-title">Appearance</h2>
          <button id="appearance-close" type="button" aria-label="Close appearance settings">\xD7</button>
        </div>
        <div class="appearance-setting">
          <div class="appearance-setting-label" id="theme-label">Theme</div>
          <div id="theme-segments" role="group" aria-labelledby="theme-label">
            <button class="theme-segment" type="button" data-theme-choice="dark" aria-pressed="true">Dark</button>
            <button class="theme-segment" type="button" data-theme-choice="light" aria-pressed="false">Light</button>
          </div>
        </div>
        <div class="appearance-setting">
          <label class="appearance-setting-label" for="comment-text-size">
            <span>Comment text size</span>
            <output id="comment-text-size-value" for="comment-text-size">13px</output>
          </label>
          <input id="comment-text-size" type="range" min="12" max="22" step="1" value="13" />
        </div>
        <div class="appearance-setting">
          <div class="appearance-setting-label" id="accent-label">Accent color</div>
          <div id="accent-swatches" role="group" aria-labelledby="accent-label">
            <button class="accent-swatch" type="button" style="--swatch:#4ee6c4" data-color="#4ee6c4" aria-label="Turquoise" aria-pressed="true"></button>
            <button class="accent-swatch" type="button" style="--swatch:#4d9cff" data-color="#4d9cff" aria-label="Blue" aria-pressed="false"></button>
            <button class="accent-swatch" type="button" style="--swatch:#6877f5" data-color="#6877f5" aria-label="Indigo" aria-pressed="false"></button>
            <button class="accent-swatch" type="button" style="--swatch:#9b7cf8" data-color="#9b7cf8" aria-label="Violet" aria-pressed="false"></button>
            <button class="accent-swatch" type="button" style="--swatch:#ed72b6" data-color="#ed72b6" aria-label="Pink" aria-pressed="false"></button>
            <button class="accent-swatch" type="button" style="--swatch:#f29a52" data-color="#f29a52" aria-label="Orange" aria-pressed="false"></button>
            <span id="custom-accent-wrap" data-selected="false">
              <input id="custom-accent-color" type="color" value="#4ee6c4" aria-label="Custom color" aria-pressed="false" />
              <span class="accent-swatch" id="custom-accent-visual" aria-hidden="true">+</span>
            </span>
          </div>
        </div>
        <button id="appearance-reset" type="button">Reset to defaults</button>
      </section>
    </div>
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
var faviconAssets = new Map([["/favicon.svg", { "body": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiByb2xlPSJpbWciIGFyaWEtbGFiZWw9ImV6cmV2aWV3Ij4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ibWludCIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM2MkYwRDEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMjZFMkIxIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9IjExMiIgZmlsbD0iIzBGMTcyMCIvPgogIDxwYXRoCiAgICBkPSJNMTI2IDExOGgyMjhjMjcgMCA0OSAyMiA0OSA0OXYxMTBsLTU4IDU4SDIzOWwtNzAgNjN2LTYzaC00M2MtMjcgMC00OS0yMi00OS00OVYxNjdjMC0yNyAyMi00OSA0OS00OVoiCiAgICBmaWxsPSJub25lIgogICAgc3Ryb2tlPSJ1cmwoI21pbnQpIgogICAgc3Ryb2tlLXdpZHRoPSI0MiIKICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgIHN0cm9rZS1saW5lam9pbj0icm91bmQiCiAgLz4KICA8cGF0aAogICAgZD0iTTI4MyAyODVsNTMgNzUgMTAxLTEwNSIKICAgIGZpbGw9Im5vbmUiCiAgICBzdHJva2U9IiMwRjE3MjAiCiAgICBzdHJva2Utd2lkdGg9IjcyIgogICAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogICAgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIKICAvPgogIDxwYXRoCiAgICBkPSJNMTUxIDE5MGgxNjRNMTUxIDIzOGgxMDJNMTUxIDI4NWgxMzJsNTMgNzUgMTAxLTEwNSIKICAgIGZpbGw9Im5vbmUiCiAgICBzdHJva2U9InVybCgjbWludCkiCiAgICBzdHJva2Utd2lkdGg9IjMyIgogICAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogICAgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIKICAvPgo8L3N2Zz4K", "type": "image/svg+xml" }], ["/favicon.ico", { "body": "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D/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcOcB4PDxEfFg7mIBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/x8WDuUcDg4SAAAAACAWDkcgFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//HxUOSQAAAAAAAAAAAAAAAB8VDkkfFg7lIBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//HxYO5R8VDkkAAAAAAAAAAAAAAAAAAAAAAAAAACAQABAgFg6BIBYOuSAXDukgFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw//IBcP/yAXD/8gFw7pIBYOuSAWDoEgEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==", "type": "image/x-icon" }], ["/favicon-16x16.png", { "body": "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACWElEQVR4nJxTS2gTURQ9bzL5GE1C08RULE0UNbYLQSnVXUGzUeqiKxFXgkqxoCIICm7cuom4caHYIqHQjXUhFQWFFhT8UNC4aGvQJpKkzceWNP/MzPPOmyaYTS29w8y9M+/de849940MgDm9/qtMwgjnLMgYzNjEOEcDjMfIP1nPxMPM6QvcYEAY2zENd5hzd2CeUIPYnsVlMAT06NClYey7cAbWPZ1QuAaNOKoEoeqe3lVwlFNZpCfeID0+bbQDdMlE3yrbbQheO4/Fx8+R/RjdWNQvY1czdgz0omt0GCuTb6FVahC5+h5X337AIuPns5fYGzoBZ9BPYnHC54KJ7hORV1iJvIbnyhBsvT0oz/0QQKIAJAmKRiQ1jnqxjEpuTdDWUdVGHZpGLdQbYl2hWFPUlghyk65qEIYvNAD34FGjb7qjNx9g9X0UJDRMDjtyUzNQ8wXYgj2oLiSaBSCE06Ps5+8orxeJtiGk43gfVj9E9flDcu1CdS4Gz8hZpO4+paIMkl6g9Csp0DpP9QM7bSgv51CYj6OSX4NSreHg2G1Izh2wBrthHzxCyWOtFpjLFxDcD4evoyPUL5jUMn+QmZqF9/IQspPvoJUqYG4HJI8TqdGHeppoqa2AbhY6A95zJ+G5eBqqqiJ5fwK1WBL131nYjh1AceYreKkmqLeJ2LR6Oo8SCeMi2olbj1Cc/WacCf0HmP60gcz+TREMlsj7Wx9kE8zdXtSXlvE/o7oLEj3G2z7SjLeSLMCAF6aa3fzFBouJM95BU3QTRWlzVK5QH4s05UgBpXt/AQAA//8kFfKdAAAABklEQVQDAJYMFNX/RN18AAAAAElFTkSuQmCC", "type": "image/png" }], ["/favicon-32x32.png", { "body": "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFKElEQVR4nMRXa2wUVRT+7u50t6/dbmm7fS2l2lITH7GIjQQ0sf6QtibwQ/ABUtEUE/ghNmkLMRiJiaJWSuIPgkpIkIqJiUKMpIhIaqikAR8tgVKktd2+393OutvdbXfGe+/O7M6225Y0pXybnTv33jPnfPecc8+dEaCFJdtiNqCc3q0DQT4BrFgCyMAQvTTR20bRhyNwdDrUOaLemFNWFdPecUJIBu4hZFnuo2TKxGF7XZCA2Zq9kRCcxzJCluQSRoIkJGQlykZyk648HcsI7gmP/zFBjta9Tt2wrMYZWKjlGKFUAEu4+4d1AolAwLr+cTy8dxtMeaugizGyLIYkS6GWsFaeMS4r44H+tHsSrn+6Yf/8O4hXb0W0zmyThNRsWTuYtelZPFn9DlXEtk/gFzRGf/SWXWeMyyymyrhKLjTftu8oxuoaI5PQEjBYTHj+l2MQzHF8JZMDo/ivq58rkYMrDIjzVrPimfMGWwqi0lZAkiRMOV24UVwJv9M9i4Cg7SQXPALBFMuV3jl+Bq01tWy7YFHQEdj2boV1Zwl0VGf82jxM1DfNFtN24nNsQTf2nK1fvHEG+uzoj78HwkZ/hpzI9S3MA0TQB2M4PenlY7bip1FQXQ4SJYRiq4m5pIm13+/Hnc9q0X3yHH/WT3Wo+tjzCxLgSpSYAqHVa7NbbZkcywG/FNoVAWISwh2h5AhwdwRUxip66hr4f7FQ9fmGHdxrvPYTEpkAuDulMLYZxRuQ/+nbkPX6iJ7o+voc2j45NadxPzUq/voXHD9cZtWPb2N2IQqJsCSUZWj2sapE5kok3krB1k/badaXA/kAWY5IQfytCT37v4DtwA7kXTwMw8qUMInwEJCAci0GLjRisn8ExCAESarEoBQrc/5qOJvbAi7WuFfy+NBbyYyXwrx5Pd1VUpj7ZxNQPaAJQlbpC8it2B70jJr5aqVTd8EorXTtVUdDJGjW+0U30ve9ChM1zpK1r+IYfF1DcxPwDo8Ha3osrQme3mGMX2vByJXrVDKUA9CEiRGIffRBJBQVIKlhA9/7ULyVWr4V5hef4c/07f8KzkuBQkTmSkKxpSO4sgcqt0NIMsPTM4SOL89AmpqG+5YdktfHZQ0ZyYhKT4K71Y4VRU8h871SpL37GpzXWjE1MAZrxUtIeKWQ58/AgRNwXviTB47MCMGsw2j1wTKkbikMP+UQOIgcDdfRtqcGaW9tgnXPZu4RT9cg2ra8D9uhXTA9twau5na4Gltg2VXCwzH0wSmIZ68oK8cs6KPjLQe1A+OXm3mBiX/iodBJp5RnFgbjSiuS3ygKzunMsdAnxmHgo9OIp2GIoiXXuDaXzw9//C3E7xsirnxOD6jQRRsQk5MJXawRtqptMObZ+Lhf2QbsvO/7sBZTg+O8P0nPfnYCZp6sojVDh5Fq+h5w+hIzgTlscwhzTbAt5LrZwe+nRBcMCJ3zPmrUvrsG3n/7g/KMl0fsRG/ZYegs8XDXNwdWOI/xeQlooc0FN11p1+4jmB4Vw2SYIZkmhaepXXnXJwsaZ9BRvYMLCblvd/GVOy7+gc7SQ7OMa0mQwOWujDPbhH4TnKfCG+cTJDSmxtxMeG53YylBCfxM31vQtKCgX1py4wzMNom2ZGcbDfib9ixYTtCI0pq2RudxdHbS/fwmlhkSwU5mW886PtdEqzE24Sq9LaRJZMI9hPJx+rJzyP4T6+vVCa97os0blXjCqAcr9l4aEhONURyWAMrnOT2l8I3oIzu8Y/Yb6tz/AAAA//+5tXVYAAAABklEQVQDAHCC6KEImu6GAAAAAElFTkSuQmCC", "type": "image/png" }], ["/favicon-64x64.png", { "body": "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", "type": "image/png" }], ["/favicon-192x192.png", { "body": "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", "type": "image/png" }], ["/favicon-512x512.png", { "body": "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", "type": "image/png" }]].map(([pathname, asset]) => [
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
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
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
  if (!existsSync(sessionDir)) return;
  const sessionStat = lstatSync(sessionDir);
  if (!sessionStat.isDirectory() || sessionStat.isSymbolicLink()) return;
  const ownedFiles = /* @__PURE__ */ new Set([
    QUEUE_FILENAME,
    SUBMITTED_IDS_FILENAME,
    THREADS_FILENAME,
    THREAD_ROOTS_FILENAME,
    "session.json"
  ]);
  for (const entry of readdirSync(sessionDir, { withFileTypes: true })) {
    const isInterruptedQueueWrite = /^feedback-queue\.jsonl\.\d+\.tmp$/.test(entry.name);
    if (entry.isFile() && (ownedFiles.has(entry.name) || isInterruptedQueueWrite)) {
      unlinkSync(join(sessionDir, entry.name));
    }
  }
  try {
    rmdirSync(sessionDir);
  } catch (error) {
    if (error.code !== "ENOTEMPTY") throw error;
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
  -h, --help          Show this help message
  --decode-newlines   In reply text, decode \\n and \\r\\n as line breaks
`;
function decodeReplyNewlines(text) {
  return text.replace(/\\r\\n|\\n|\\r/g, "\n");
}
function parseCliArgs(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
      to: { type: "string" },
      "decode-newlines": { type: "boolean" }
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
    return {
      kind: "reply",
      file: second,
      to: values.to,
      text: values["decode-newlines"] ? decodeReplyNewlines(third) : third
    };
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
  decodeReplyNewlines,
  main,
  openReview,
  parseCliArgs,
  validateArtifactFile
};
