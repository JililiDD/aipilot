# Design Spec Builder Question Bank

Use these questions selectively — never all of them. When rejecting a vague answer: name the missing design decision, state what a downstream agent would otherwise invent, offer 2–3 concrete options.

## Triage Order

When design direction is vague, resolve in this order:

1. Product personality
2. Reference and anti-reference products
3. Main workspace and navigation
4. Information density
5. Visual system
6. Interaction states
7. AI execution UI presentation
8. Design acceptance criteria

## Translating Vague Taste

Vague answers that cannot guide UI work, and the translation question to ask:

- **"Clean and modern"** → "Clean like Linear, native like Apple Settings, compact like Cursor, or editorial like a magazine tool?"
- **"High-end / premium"** → "Should high-end mean restrained typography, precise spacing, rich imagery, dense professional controls, subtle motion, or premium materials?"
- **"Make it feel AI"** → "Should AI appear as a command interface, execution log, status layer, collaborator panel, or invisible automation?" Avoid default AI tropes unless explicitly requested: purple-blue gradients, glowing orbs, abstract neural backgrounds, empty marketing cards, decorative chat bubbles with no workflow value.
- **"Like Cursor"** (unclear reference) → "Which part of Cursor: command palette, sidebar layout, editor density, dark theme, typography, composer, or developer-tool mood?"
- **"Powerful but very simple"** (conflicting goals) → "Should v1 prioritize visible controls for power users, or guided progressive disclosure for simpler first use?"
- **"I know what I like"** (missing anti-reference) → "What should this definitely not look or feel like?"
- **"Just design the main page"** (missing states) → "Which empty, loading, error, success, and long-running states must be designed for v1?"
- **"Put things where they make sense"** (missing IA) → "What are the top-level panels or areas, and what must stay visible during the main workflow?"

## Product Personality

- What should the product feel like in one sentence?
- More like an operational tool, creative workspace, developer tool, consumer app, or command center?
- Optimize for speed, confidence, calm, playfulness, power, or craft?
- What should the product never feel like?
- What product would the target user trust immediately?

## References

- Which existing product is closest structurally? Visually? In interaction model?
- Which product should be used only as a partial reference?
- What exactly should be copied: layout, density, navigation, controls, motion, or tone?

## Anti-References

- Which products should this explicitly not resemble?
- What visual trope should be avoided?
- What interaction pattern would feel wrong for the target user?
- What would make the product feel cheap, generic, childish, too heavy, or too AI-themed?

## Information Architecture

- What is the main object users manage: projects, files, records, timelines, chats, tasks, or outputs?
- What should be visible at all times? What can be hidden until needed?
- What are the top-level areas or panels? The primary workspace? The secondary control area?
- What belongs in settings rather than the main flow?

## Layout

- Sidebar-first, canvas-first, timeline-first, chat-first, table-first, or inspector-first?
- Does the layout need split panes?
- Navigation: persistent, collapsible, command-driven, or tabbed?
- What area must be protected from clutter?
- What happens on smaller screens or narrow windows?

## Density and Hierarchy

- Compact, medium, or spacious?
- Are users expected to scan, compare, configure, create, or monitor?
- Which controls are primary, secondary, or advanced?
- What must be readable from a distance? What can compress into icons, menus, or tooltips?

## Visual System

- Default theme: light, dark, or both?
- What colors signal action, selection, warning, success, and AI activity?
- Palette mood: neutral, warm, technical, editorial, playful, or cinematic?
- Typography: system-native, editorial, geometric, technical, or mono-influenced?
- Corners: sharp, moderate, or soft? Depth: flat, bordered, subtle shadow, or layered panels?

## AI Execution UI Presentation

Skip this entire section for products without AI or agent execution.

The capabilities themselves (whether users can pause, cancel, retry, approve, or edit AI steps) are Product Spec decisions — read them from the master spec or the target work-item's Requirement section; never re-interview them here. Ask only about presentation:

- Where does the AI live: side panel, bottom composer, command palette, inline overlay, or background status?
- Should a plan be shown before acting, and in what form?
- How does execution appear: log, step tree, timeline markers, cards, or status bar?
- Where do the spec-confirmed controls (pause/cancel/approve...) surface in the UI?
- How should AI uncertainty, tool failure, and completion appear?
- What AI activity stays visible without overwhelming the workspace?

## Interaction States

- Empty state for a new user? For a project with no data?
- Loading for short tasks? Long-running work?
- What should error states help the user do next? What should success confirm?
- What needs undo, rollback, or version history?

## Copy and Tone

- Does the product speak as a tool, collaborator, expert, coach, or system?
- Labels: terse, descriptive, or instructive?
- AI messages: conversational or operational?
- What words should be avoided?

## Design Acceptance Criteria

- What screen must look correct first?
- What user flow must be visually complete?
- What must a design reviewer inspect?
- What would make the design unacceptable even if functional?
- What can remain rough in v1?
