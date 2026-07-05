# Security Conventions (Secrets, BYOK, Sandbox)

**Read before handling any secret or building the eval sandbox.** Locked 2026-07-06 (D9; D10 direction). Principle: **customer keys are encrypted with a swappable KMS interface and only ever decrypted inside the isolated sandbox; untrusted code touches nothing but an outbound results callback.**

---

## 1. Two classes of secret

- **Platform secrets** (ours): GitHub App private key (PEM), DB/NATS credentials, session signing keys. Injected from the environment / a secrets manager; never in the repo (`.gitignore` already blocks `.env`, `*.pem`).
- **Customer BYOK** (theirs): LLM provider keys (OpenAI/Anthropic/…) supplied so Mode B can run their evals. These print money — treat as crown jewels.

## 2. BYOK lifecycle — envelope encryption behind a KMS interface (D9)

**Never store a customer key in plaintext, and never decrypt it outside the sandbox.**

- **Envelope encryption:** generate a per-secret data key, encrypt the customer key with it, then wrap the data key with a KMS master key. Store `{ciphertext, wrapped_data_key, kms_key_ref}` in the DB (encrypted column, tenant-scoped via RLS).
- **`KmsPort` interface** with a **Vault-backed default** (self-hostable per G1). AWS/GCP KMS may back it in managed deployments — but only behind the interface, never called directly.
- **Decrypt only inside the eval sandbox, at run time, in memory.** The control plane hands the sandbox a wrapped key + a short-lived unwrap grant; the plaintext key never touches the API's memory, logs, or disk.
- **Rotation & revocation:** support re-wrapping (rotate master key without re-encrypting payloads) and immediate revoke (delete the row → key unusable).

## 3. Never leak secrets

- No secrets in logs, traces, error messages, or events. Apply redaction at the logging boundary; deny-list known secret field names.
- Secrets are not part of any `agentgit-json` payload, event, or API response.

## 4. Sandbox isolation (D10 — when Mode B is built)

Mode B runs **untrusted customer code** — the highest-risk component. Non-negotiable properties:
- **Strong isolation:** gVisor or Firecracker microVMs (OSS, self-hostable), not bare Docker. Ephemeral — created per run, destroyed after.
- **No inbound network. Egress locked down** to exactly (a) the customer's declared LLM provider endpoints and (b) the authenticated results callback. Nothing else.
- **No access to the bus, the DB, or platform secrets.** The sandbox holds only what one eval run needs.
- **Results go out over HTTP**, not the bus: the sandbox POSTs `agentgit-json` to `/api/v1/eval-runs` authenticated with a **short-lived, single-purpose token** scoped to post exactly one eval run (mirrors the Mode A Action token). This is why no untrusted service ever consumes NATS.
- Resource limits (CPU/mem/time), no host mounts, read-only base image.

## 5. Transport & GitHub

- TLS everywhere.
- **Verify GitHub webhooks** (`X-Hub-Signature-256` HMAC) before processing (spec F1).
- **Least-privilege GitHub App scopes** — only what spec F1 lists (`contents:read`, `metadata:read`, `pull_requests:write`, `checks:write`). Installation tokens are short-lived; never store long-lived tokens.

## 6. Dependency & license hygiene

Per the open-core decision ([`../../changes/2026-07-06-open-core-self-host.md`](../../changes/2026-07-06-open-core-self-host.md)): the distributed core uses **permissive-OSS deps only** (MIT/Apache/BSD/ISC). No AGPL/SSPL/BSL linked into the core. Enforce with a license check in CI.
