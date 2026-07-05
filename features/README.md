# features/

**One folder per feature** — the agent's main read/write surface for a task (part of the working loop in [`../AGENTS.md`](../AGENTS.md) §3). Each folder holds the feature's spec, plan, and an append-only **worklog** the agent updates *before* (plan) and *after* (what changed) implementing.

## Convention
- Folder name: `F<n>-<kebab-name>/` — e.g. `F1-github-connect/`.
- Inside: a `README.md` using the template below. Add design notes, diagrams, or sub-docs as needed.
- **Create the folder when you start the feature**, expanding from spec §7 — don't pre-create all 13.

## Feature README template
```markdown
# F<n> — <name>

- **Spec ref:** docs/spec.md §7 F<n>   · **Phase:** <1|2|3>   · **Target user:** <Builder|Consumer>
- **Status:** not-started | in-progress | done
- **Sprint:** <sprint-NN or —>   · **Depends on:** <F# / infra>

## Goal
<the user-visible outcome, one paragraph>

## Acceptance criteria
<the concrete "done" test from the spec, made checkable>

## Conventions to read first
<links to the relevant docs/conventions/*>

## Plan (write BEFORE coding)
<what you'll do, which packages/files you'll touch, in what order>

## Worklog (write AFTER each work session)
- YYYY-MM-DD — <what changed, key decisions, follow-ups, new status>

## Out of scope
<explicit non-goals; cross-check docs/spec.md §8>

## Open questions
<what needs a decision>
```

## Feature index (spec §7)
| ID | Name | Phase | Build step (§10) | Folder |
|---|---|---|---|---|
| F1 | One-click GitHub install | 1 | 1 | [F1-github-connect](F1-github-connect/) |
| F2 | Agent & eval detection | 1 | 2 | [F2-agent-detection](F2-agent-detection/) |
| F3 | Checkpoint creation | 1 | 3 | — |
| F4 | Eval runner (Mode A → B) | 1 | 4, 9 | — |
| F5 | Eval-as-property / timeline UI | 1 | 5 | — |
| F6 | Regression detection + bound traces | 1 | 6 | — |
| F7 | Behavioral diff + rewind | 1 | 8 | — |
| F8 | Diagnosis agent | 1 | 7 | — |
| F9 | Dataset builder | 1→2 | 9 | — |
| F10–F13 | Registry · graph · cost · teams | 2 | — | — |

> **Phasing discipline:** don't build Phase 2/3 features until Phase 1's core assumption (spec §1.4) is validated.
