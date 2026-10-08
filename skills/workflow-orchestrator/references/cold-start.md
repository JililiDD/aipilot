# Cold Start

This procedure runs once for a project with no documents root. It runs whether the session began with `/aipilot` or with a natural-language request.

1. Ask one low-risk question in the constitution §7 format: "Where should project documents live?" Offer these options:
   - **A. `docs/aipilot/` inside this repo (recommended)**. This location is version-controlled and travels with the code.
   - B. A custom location.
2. For a custom location, ask whether to create a project-named subfolder under it. For example, with `/programs/projectDocumentations/` and the project `projectDemo`, the root becomes `/programs/projectDocumentations/projectDemo/docs/aipilot/`. Warn once, plainly, that an out-of-repo root loses version control. The warning names these losses:
   - no branch correlation;
   - no clone portability;
   - no git-tracked merge-back history.

   Then respect the choice.
3. Write `Documents root: <path>` under an `## AIPilot` heading in the project-root `AGENTS.md`. If the file is missing, create it with just this section. Never overwrite existing content. Courtesy (optional): if a `CLAUDE.md` exists and does not reference `AGENTS.md`, suggest adding an `@AGENTS.md` import line. With this line, plain Claude Code sessions also see `AGENTS.md`.
4. Create `work-items/`, `work-items/merged/`, and `design-assets/` at the resolved root. Do not create an empty `memory/` directory or empty memory files. `memory/` and its files are created lazily by the skill that records their first entry. The constitution stays in the plugin.
5. Route to `product-spec-builder`. Pass the user's request as the initial requirement statement.
