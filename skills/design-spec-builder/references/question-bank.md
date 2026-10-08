# Design Spec Builder Question Bank

Use these questions selectively. Never ask all of them. Ask each one as multiple choice (constitution §7):

- Offer the listed options.
- Where an entry says *from the category*, offer 2–4 well-known products from the product's own category.
- When the question is a choice, put the recommendation first.
- Keep the free-form escape.

## Triage Order

When design direction is vague, resolve the topics in this order:

1. Product personality
2. Reference and anti-reference products
3. Main workspace and navigation
4. Information density
5. Visual system
6. Interaction states
7. AI execution UI presentation
8. Design acceptance criteria

## Translating Vague Taste

These vague answers cannot guide UI work. Each entry gives the translation question to ask:

- If the user says **"Clean and modern"**, ask: "Clean like Linear, native like Apple Settings, compact like Cursor, or editorial like a magazine tool?"
- If the user says **"High-end / premium"**, ask: "Should high-end mean restrained typography, precise spacing, rich imagery, dense professional controls, subtle motion, or premium materials?"
- If the user says **"Make it feel AI"**, ask: "Should AI appear as a command interface, execution log, status layer, collaborator panel, or invisible automation?"
  - Avoid these default AI tropes:
    - purple-blue gradients
    - glowing orbs
    - abstract neural backgrounds
    - empty marketing cards
    - decorative chat bubbles with no workflow value
  - Use one of these tropes only if the user explicitly requests it.
- If the user says **"Like Cursor"**, the reference is unclear. Ask: "Which part of Cursor: command palette, sidebar layout, editor density, dark theme, typography, composer, or developer-tool mood?"
- If the user says **"Powerful but very simple"**, the goals conflict. Ask: "Should v1 prioritize visible controls for power users, or guided progressive disclosure for simpler first use?"
- If the user says **"I know what I like"**, the anti-reference is missing. Ask: "Which should it definitely not look or feel like: cheap and generic, childish, heavy enterprise software, or gimmicky AI?"
- If the user says **"Just design the main page"**, the states are missing. Ask: "Which states must v1 design: empty, loading, error, success, long-running?" (pick all that apply)
- If the user says **"Put things where they make sense"**, the IA is missing. Ask: "Which arrangement of areas: sidebar + canvas, list + detail, tabs, or one workspace + inspector?"

## Product Personality

- Which one-line feel fits best: calm and precise, fast and dense, friendly and guided, or bold and expressive?
- More like an operational tool, creative workspace, developer tool, consumer app, or command center?
- Optimize for speed, confidence, calm, playfulness, power, or craft?
- Which feel must it never have: cheap and generic, childish, heavy and bureaucratic, or gimmicky?
- Consider the target user. Which kind of product do they already trust: an established pro tool, a modern SaaS app, a native OS app, or a developer tool?

## References

- Which product is the closest structural reference? Which is the closest visual reference? Which is the closest interaction-model reference? Offer options *from the category*, plus "none".
- Use the chosen reference whole, or only its layout, visual style, or interaction?
- What exactly should the design copy: layout, density, navigation, controls, motion, or tone?

## Anti-References

- Which product should this explicitly not resemble? Offer options *from the category*.
- Which visual trope should the design avoid: gradients and glow, heavy shadows and skeuomorphism, emoji and playful illustration, or dense enterprise chrome?
- Which interaction pattern would feel wrong for the target user: chat-first, step-by-step wizards, modal-heavy flows, or hidden gestures?
- Which risk matters most: cheap, generic, childish, too heavy, or too AI-themed?

## Information Architecture

- What is the main object that end users manage: projects, files, records, timelines, chats, tasks, or outputs?
- Which must stay visible at all times: navigation, the current item's details, status or progress, or the primary action? (pick all that apply)
- Which arrangement of top-level areas: sidebar + canvas, list + detail, tabs, or one workspace + inspector?
- Which belongs in settings rather than the main flow: preferences, integrations, rarely changed defaults, or admin controls?

## Layout

- Sidebar-first, canvas-first, timeline-first, chat-first, table-first, or inspector-first?
- Split panes, or a single pane?
- Navigation: persistent, collapsible, command-driven, or tabbed?
- Which area must stay free of clutter: the main canvas, the editor, the list, or the reading area?
- On smaller screens or narrow windows: stack the panels, collapse the sidebar, hide the secondary panel, or not supported in v1?

## Density and Hierarchy

- Compact, medium, or spacious?
- Are end users expected to scan, compare, configure, create, or monitor?
- For the main screen's controls, propose a primary / secondary / advanced split. Then ask: keep it, promote some controls, or demote some?
- Which may compress into icons, menus, or tooltips: labels, secondary actions, metadata, or help text?
- Which must stay readable at a glance or from a distance: status, totals, alerts, or none?

## Visual System

- Default theme: light, dark, or both?
- Color roles: a single accent, an accent plus a semantic set (selection, warning, success, AI activity), or an existing brand palette?
- Palette mood: neutral, warm, technical, editorial, playful, or cinematic?
- Typography: system-native, editorial, geometric, technical, or mono-influenced?
- Corners: sharp, moderate, or soft? Depth: flat, bordered, subtle shadow, or layered panels?

## AI Execution UI Presentation

If the product has no AI or agent execution, skip this entire section.

The capabilities come from the Product Spec (doctrine boundary). Never re-interview them here. Ask only about presentation:

- Where does the AI live: side panel, bottom composer, command palette, inline overlay, or background status?
- Show a plan before acting: never, as an inline summary, or as a step list to approve?
- How does execution appear: log, step tree, timeline markers, cards, or status bar?
- Where do the spec-confirmed controls (pause/cancel/approve...) surface: a toolbar, inline on each step, a floating bar, or a context menu?
- How do AI uncertainty, tool failure, and completion appear: inline badges, toasts, a status panel, or the log only?
- How much AI activity stays visible: a status line only, a collapsible panel, progress on the affected items, or nothing until done?

## Interaction States

- Consider the empty state for a new user or a project with no data. What should it show: a guided first step, sample data, or a blank screen with one primary action?
- Loading: a spinner, skeletons, progress with named steps, or background work with a notification? Short tasks and long-running work may differ.
- What should an error state offer next: retry, inline fixes to the input, report or contact, or undo?
- What should success confirm: a toast, an inline status change, a summary screen, or nothing beyond the result itself?
- What needs undo, rollback, or version history: destructive actions only, all edits, versioned documents, or nothing in v1?

## Copy and Tone

- Does the product speak as a tool, collaborator, expert, coach, or system?
- Labels: terse, descriptive, or instructive?
- AI messages: conversational or operational?
- Which words to avoid: jargon, hype words, human-like wording for the AI, or nothing specific?

## Design Acceptance Criteria

- Which screen must look correct first? Propose the 2–3 core screens as options.
- Which user flow must be visually complete? Propose the main flows as options.
- What must a design reviewer inspect: layout and spacing, every state, copy, or accessibility? (pick all that apply)
- What would make the design unacceptable even if functional: inconsistent spacing, unreadable density, missing states, or an off-brand look?
- What can remain rough in v1: settings, empty states, animation, or secondary screens?
