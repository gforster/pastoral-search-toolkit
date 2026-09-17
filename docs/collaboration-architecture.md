# Committee collaboration architecture

## Inspection and baseline (17 September 2026)

Before refactoring, the application has schema v2: one serializable project containing shared workbook answers, qualification definitions, requirements, custom questions, milestone prerequisites, module review attestations and artifact approvals. There is no candidate record. `reviews` means **workbook module review**, not a person's candidate evaluation.

The domain is independent of storage. `ProjectStore` uses IndexedDB, optimistic revisions and a cached repository facade; the app serializes saves, handles conflicts and preserves recovery data. Backups import as a separate local ID. Artifact templates project explicit audience field allowlists into shared sections, then HTML/Markdown/ZIP. Readiness evaluates actual required answers and additional prerequisites; it does not evaluate candidates. The application uses relative assets and hash routes for static subpath hosting.

Inspection covered schema/migration, storage, imports/exports, readiness, artifact generation, current routes and existing Node/browser tests and production build. The bundled Playwright browser is absent locally; baseline browser checks use installed Chrome. No backend, telemetry or network API is needed for the feature.

## Boundaries and migration plan

Preserve existing shared configuration fields rather than renaming every workbook answer. Add a separately typed `collaboration` aggregate to schema v3, containing a stable search fingerprint, member directory, candidate records, review rounds/snapshots, individual submissions and committee decisions. Keep legacy `reviews` explicitly documented as module attestations. Extend task records with optional calendar date, candidate, module and status; ordinary assignments must not become readiness prerequisites unless deliberately designated.

Migration v1 -> v2 -> v3 is additive and nonmutating. Existing project content, timestamps and approvals remain intact. Old tasks remain prerequisites with their original milestone/resolved semantics. A stable fingerprint derived from the old project ID is assigned once; new searches use random IDs. A backup import preserves the fingerprint but receives a new local storage ID. Copies of the same search therefore exchange reviews; a new search starts with a new fingerprint. The sample starts a fresh collaboration identity when copied.

The local repository may persist the aggregate atomically. Candidate/review/decision domain operations neither call IndexedDB nor depend on browser UI. A typed repository contract provides the seam for future adapters; separate remote tables are not necessary in the local implementation. Reviewer-only work is persisted independently from full church projects, so receiving a review packet cannot create or overwrite authoritative shared facts.

## Implement now

- Local committee directory and candidate records, evidence references/HTTP(S) links, process status and progress.
- Five review types, immutable criteria/evidence snapshots, expected reviewer identifiers, open/closed/released round lifecycle.
- Minimal versioned review packets and completed review files, strict bounded validation, stable search/candidate/round matching, duplicate/revision handling and stale criteria warnings.
- Independent reviewer workspace: import, self-entered name, save locally, structured observations/concerns/questions, completed export and printable worksheet. No other members' reviews travel in a packet.
- Explicit release of compiled reviews in the chair's local interface. This is a workflow guard, **not** authenticated access control or encryption. A local file owner can inspect local data.
- Deterministic response distributions, exact normalized question grouping, all original wording, minority/material concerns, missing participation and underlying review access. No semantic inference, scores or automatic gate decisions.
- Official committee decision history entered after actual deliberation, with rationale, unresolved concerns, result/recorder and follow-up assignments. Historical decisions do not silently set workbook approvals/readiness.
- Internal candidate meeting sheet. Public/candidate/congregation handouts retain their audience allowlists and receive no individual review data.
- Distinct sensitive backups, sanitized reusable templates, assignment packets and individual submissions. No candidate/review records enter templates or public build inputs.

## Snapshot and conflict policy

A round captures its criteria/template version, relevant explicitly selected church context, evidence metadata and creation time. Reviews echo exact round context identifiers and snapshot version. Later edits never reinterpret prior responses. A current-context comparison warns about changed church criteria or evidence. A review with a different search/candidate/round/snapshot is rejected with a specific explanation, not automatically rebound. Exact duplicate files may be skipped. A changed submission from the same reviewer requires explicit replacement while retaining the previous revision and original submission time. Closed/released rounds do not accept edits until explicitly reopened; reopening hides compilation in the workflow again.

Expected reviewer IDs are assignment references, not credentials. Names and initials are self-entered. Directory membership, submission, attendance, voting eligibility and constitutional quorum are separate concepts. Missing reviews never imply assent.

## Export boundaries

Full project JSON and the full working ZIP may include private collaboration records only through an explicit sensitive-export action. A church template is built from a strict reusable allowlist and excludes candidates, reviews, decisions, membership directory, tasks and transition/compensation data; free text in allowed fields still merits human review. A review packet contains only one assignment's context, not the committee directory or unrelated church facts. A completed review carries only that person's responses and necessary identifiers. External artifacts exclude collaboration records. Evidence links are never fetched, embedded or redistributed automatically.

## Deferred Committee Workspace

An optional self-hostable API adapter will need authenticated membership, invitations with expiration, role authorization on every request, access revocation, secure transport, encryption at rest, backups/restores, candidate/project isolation, deletion/retention, logging of sensitive administrative actions and conflict/version checking. Chair/admin, member and read-only are sufficient initial roles. Server-enforced sealing must restrict raw data access, not merely hide UI elements. Revocation cannot recall already exported local files. See `roadmap-collaboration.md` for phases and `collaboration-battle-test.md` for evaluation.

No provider, cloud dependency, authentication requirement, congregational voting system, ranking, AI service, notifications, attachments or chat is introduced in this iteration.
