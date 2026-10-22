# Scaling OpenMuse to public use

A review of this repository against the question: *can it be improved or enhanced for
large-scale public use?* It separates what is already solid, the blockers to serving many
people, and the feature work that would move the needle most.

Short answer: the engineering underneath is stronger than the packaging suggests. The
**single-owner self-hosted alpha** described in [VERIFICATION.md](VERIFICATION.md) is real;
**public multi-tenant hosting is not yet safe**, and the gap is authentication, per-person
isolation, operations, and distribution trust — not agent features.

## What is already strong

- **Durable work, not a chat wrapper.** Jobs, plans, checkpoints, database leases, retries,
  cancellation, review gates with idempotency keys, and saved receipts exist and are
  tested. Recovery after a restart is designed for rather than bolted on.
- **Honest verification culture.** 154 automated tests, real Chromium lifecycle coverage,
  a real Docker isolation smoke test, and documentation that states its own boundaries.
- **Real isolation primitives.** Chromium profiles are separated from the server, and the
  Linux computer is a nonroot container with a persistent workspace, capped output, and no
  terminal network.
- **Distributable shells exist now.** Signed Android APK, Linux AppImage/deb, Windows
  installer, and unsigned macOS builds are produced from this tree (see
  [DOWNLOAD.md](DOWNLOAD.md)).

## Blockers before public hosting

| # | Area | Current state | What public use needs |
| --- | --- | --- | --- |
| 1 | Identity | One deployment-wide `OPENMUSE_ACCESS_KEY`; 24-hour bearer sessions; no accounts, invite, reset, or revocation | OIDC/SAML or email+passkey sign-in, per-person sessions with refresh and revocation, orgs and roles |
| 2 | Tenancy | One owner per deployment; browser worker and computer container bound to that owner | A sandbox per person or per conversation, ownership checks on every artifact, cross-tenant regression tests |
| 3 | Secrets | `TOKEN_ENCRYPTION_KEY` encrypts connected accounts for the whole deployment | Per-person envelope encryption, KMS/rotating keys, audit of decryption access |
| 4 | Abuse and cost | Sign-in throttle is in-process memory; no per-person quotas | Per-person and per-IP limits in shared storage, model-spend budgets, tool-call ceilings, global kill switch |
| 5 | Data lifecycle | Retention is implicit; no export or delete-all | Retention policy, export, delete-my-data, log redaction, review audit trail, GDPR/CCPA posture |
| 6 | Operations | PGlite by default (one process), `max: 5` pool, no metrics or backups | PostgreSQL with migrations for every deployment, metrics/tracing/alerting, backup and restore drills, horizontal workers |
| 7 | Delivery | In-app inbox only; no push | APNs/FCM for "your result is ready", digests, session refresh on resume |
| 8 | Trust in binaries | macOS builds are unsigned; Windows has no code-signing certificate; sideloaded APK | Developer ID + notarization, EV/OV certificate, Play Store AAB with privacy policy and data-safety form, signed auto-update channel |

The in-process sign-in throttle is worth fixing regardless of scale: it resets on restart
and is per process, so a multi-instance deployment has no shared limit. The
`usesCleartextTraffic` plugin is intentional for LAN self-hosting, but a public build should
drop it so HTTPS is enforced.

## Enhancements with the most leverage

1. **Sign-in and a hosted "connect" path.** Today a new person must already run a server and
   type its URL. Either support a hosted service that the app pairs with, or generate a QR
   code / deep link (`openmuse://`) that carries the server address and a one-time pairing
   token.
2. **Shared results.** A read-only link to a finished job (plan, artifacts, receipt) makes
   the product spread without exposing a workspace.
3. **Push plus a daily digest.** Most delegated work is asynchronous; without push the
   product feels finished only while the app is open.
4. **Task templates.** A gallery of proven jobs (trip research, invoice extraction, weekly
   competitor check) converts curiosity into a first success far faster than a blank box.
5. **Usage and billing.** If hosted, a per-person usage page and Stripe meter are required
   before free model spend becomes a liability.
6. **Team workspaces.** Shared goals, delegated approvals, and per-team tracking are the
   natural paid tier and reuse the existing review machinery.

## Suggested sequence

- **Weeks 1–2 — distribution trust.** Code signing and notarization, a CI release workflow
  that builds all four platforms and publishes checksums, and an update feed. This is
  cheap and unblocks real downloads.
- **Weeks 3–6 — multi-person core.** OIDC, per-person data model and sessions, PostgreSQL
  with migrations, metrics and alerting.
- **Weeks 7–10 — isolation and cost.** Sandbox per person, quotas and disk limits, spend
  budgets, Stripe metering.
- **Weeks 11–13 — compliance and reach.** Retention/export/delete, privacy policy and DPA,
  push notifications, store submissions.

None of this changes the agent's feature inventory; it makes the same inventory safe to hand
to strangers.
