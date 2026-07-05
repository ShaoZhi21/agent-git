# services/eval-sandbox — AGENTS.md

**Read before editing. This is the only non-TypeScript service, and it runs untrusted code.**

## Purpose
The **Mode B** hosted eval runner. Clones a repo at a commit, runs the agent's eval command in a **hardened, isolated sandbox**, and **POSTs `agentgit-json` results back to `/api/v1/eval-runs`** over authenticated HTTP. It does **not** connect to the DB, NATS, or hold platform secrets — it is deliberately at arm's length.

## Stack (added at build step 9)
Python 3.12+ · FastAPI · Pydantic v2 · eval adapters (promptfoo/deepeval/ragas). Toolchain = **uv**. Deployed in gVisor/Firecracker isolation.

## Non-negotiable rules (from [`docs/conventions/security.md`](../../docs/conventions/security.md))
- Runs **untrusted customer code** — strong isolation, ephemeral, **no inbound network**, egress restricted to the customer's LLM provider + the results callback.
- Reports over **HTTP only** (never consumes the NATS bus).
- BYOK keys decrypted only here, in memory, at run time — never logged.
- Emits the versioned `agentgit-json` contract (see [`packages/contracts`](../../packages/contracts/AGENTS.md)).

## Status
Scaffold — **deferred to build step 9** (F4 Mode B). Mode A (GitHub Action, in the user's CI) ships first and needs none of this.

## Notes (agent-maintained)
- 2026-07-06 — reserved; kept minimal until Mode B. Mode A unblocks the whole MVP without it.
