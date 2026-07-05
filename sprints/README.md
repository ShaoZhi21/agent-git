# sprints/

Time-boxed batches of work. **The agent reads the current sprint to know what's in scope right now, and writes status + a retro back.** Part of the working loop in [`../AGENTS.md`](../AGENTS.md) §3.

## Convention
- One folder per sprint: `sprint-NN/` with a `README.md`.
- Each sprint README has: **Goal**, **Scope** (which features/tasks), **Definition of done**, a **Status board**, and a **Retro** (filled when it closes).
- Keep the *current* sprint obvious (highest number, status `active`).

## How the agent uses a sprint
- **Before work:** open the active sprint → pick a task in scope → jump to its `features/F<n>-*/` doc.
- **After work:** update the task's status on the board here; add a retro note when the sprint closes.

## Sprints
| Sprint | Goal | Status |
|---|---|---|
| [sprint-01](sprint-01/) | Connect a repo → see detected agents | planned |
