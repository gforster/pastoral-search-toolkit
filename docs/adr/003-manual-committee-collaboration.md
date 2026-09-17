# ADR 003: Portable independent reviews before a shared server

Status: accepted for v0.3 (17 September 2026).

## Context

A committee's authoritative church facts, individual observations, official decisions and assigned work have different ownership and privacy needs. Exchanging full workbook copies for every review would create competing facts and unnecessarily distribute private records. Simultaneous form editing alone would not support independent discernment.

## Decision

Retain the local-first shared workbook and add a typed collaboration aggregate. The chair owns the authoritative manual search copy. Each review round freezes its criteria and selected evidence, names expected reviewers and exports a minimal recipient packet. Individual reviewers use a separate local store and return only their submission. The chair validates identity references and snapshot linkage, explicitly resolves duplicates/staleness, and releases a deterministic compilation for discussion.

Candidate observations do not mutate shared facts, gate outcomes or approvals. Committee decision records describe actual deliberative conclusions; no online vote is conducted. Material concerns remain visible without averaging. Exact normalized wording may be grouped; semantic summarization and AI calls are absent.

Version projects to v3, portable packets/submissions to v1, and IndexedDB to v2. Migrations preserve v1/v2 workbook content. Search fingerprints survive backup restoration while local IDs change. New searches use fresh fingerprints. Repository contracts allow later adapters without a backend dependency now.

## Consequences

The workflow works on GitHub Pages and while offline after loading, with file handoff through a church's existing channel. Independent review does not require an account or another member's notes. The chair must collect files; copied full projects do not synchronize. Self-entered names cannot prove authorship. Local release is a workflow convention, not confidentiality enforcement against a device owner. Downloaded files cannot be revoked.

Candidate records and review notes increase the sensitivity of full backups. Full-backup/ZIP exports with collaboration records show an explicit private-data notice. Templates and public/external document projections exclude collaboration records. Preview/review of any remaining free text is still necessary. Server-enforced permissions, sealing, encryption, invitations, retention and recoverable backups require a separate optional Committee Workspace design and real committee feedback.
