# Architecture Template

Use this structure for `docs/aipilot/architecture.md`. The diagrams follow the constitution §7 Diagrams and Architecture views. Give one `## Component View` section to each element that a change opened. Leave out Element Types when the document declares no new type. Leave out Assumptions when it has none.

```markdown
# Architecture

## Summary
<what the system does, which elements it has, and where they run, in a few sentences>

## Container View
<Mermaid flowchart: the end users, each system with its services, batch jobs, functions, stores, and queues, the external systems, and their links>

## Component View: <element name>
<Mermaid flowchart: the modules or layers inside one element>

## Element Types
| Type | Group | Definition |
|---|---|---|
| <new type> | <core group or new group> | <one-line definition> |

## Assumptions
- **A-1 (Concept Anchor):** <an element or a relationship that the code, the build files, and the infrastructure code cannot confirm>
```
