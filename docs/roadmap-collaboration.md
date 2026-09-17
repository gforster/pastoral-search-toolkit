# Committee Workspace roadmap

The static toolkit remains a first-class product. No cloud account or AI service is required for its core work. The software organizes evidence and discussion; it does not choose the pastor.

## Phase A — Manual collaboration bridge (v0.3)

Implemented locally: committee directory, separate candidate records, evidence references, process progress, five kinds of independent review, minimal review packets, durable reviewer drafts, completed-review imports, expected participation, snapshot/version matching, duplicate/revision handling, explicit compilation release, deterministic observations and questions, all minority concerns, official committee decision history, lightweight assignments and private meeting sheets.

The chair keeps the authoritative shared workbook. Members use assignment packets rather than editing competing full-project copies. Backup imports preserve search identity for restoration; they do not synchronize changes. Local roles and reviewer names are not authenticated. Closing/releasing a round guides the workflow but does not cryptographically seal local files. Application workflows work offline once loaded; external evidence links may not.

Use the [battle-test checklist](collaboration-battle-test.md) before expanding scope. Exact normalized questions are grouped, while differently worded questions remain separate. No automatic semantic summary, majority gate clearance, candidate ranking or online vote exists.

## Phase B — Optional private shared workspace

Only after real use clarifies the requirements, introduce a separately deployable API/storage adapter behind a feature flag. Evaluate portability, self-hosting costs, deployment and recovery before selecting a database or identity provider. The local build must continue without server configuration.

Minimum server design:

- Authenticated identities and explicit project membership. Scope every request to an authorized project and candidate, including downloads and search queries.
- Expiring, single-use invitations bound to the intended recipient; revoke sessions and access when membership changes.
- Three roles: chair/admin, committee member and read only. Enforce permissions on the server, never merely by hiding controls.
- Shared configuration with versions/conditional writes; reject and resolve concurrent compensation or process edits instead of last-write-wins loss.
- Candidate and evidence records isolated from reusable church templates and all public endpoints.
- Individual submissions visible only to their author and authorized roles until a server-enforced release policy permits access. Review snapshots must be immutable.
- TLS transport, encryption at rest, secret management, tested backups/restores and documented operational ownership.
- Record sensitive administrative actions such as invitation, removal, role changes, release and export without copying confidential note text into general logs.
- Explicit project deletion and account deletion, with documented effects on jointly owned committee records, backups and retention.
- Revocation cannot recall already downloaded packets, backups or printed documents; explain that limit.

No congregational voting, quorum certification, central candidate marketplace or automatic pastoral recommendations.

## Phase C — Mature collaboration, only where demonstrated useful

Possible additions: optional assignment notifications and due reminders; review-round opening/closing and server-enforced sealing; carefully bounded audit history; encrypted attachments with permission checks; search closure, archive, retention and deletion tools.

Closure should end active candidate work, retain required committee decision history, handle temporary sensitive materials according to the church's policy and produce a reviewed reusable template. Do not impose a universal retention duration. Do not retain sensitive notes indefinitely by accident.

Open discussion threads remain a hypothesis, not a committed feature. Structured observations, concerns, questions and decisions come first. Add threads only if the committee cannot accomplish necessary discussion with its existing meeting and communication practices.

## Phase D — Optional advanced assistance

Consider local/private summaries, document extraction and question clustering only after the underlying records and permissions are reliable. Preserve raw wording and attribution. Label generated summaries and require human confirmation of extracted rules. No sensitive candidate content may silently leave the church's environment. AI remains optional and never decides advancement, disqualification or a call.

## Conflicts that a shared adapter must resolve

Two people editing compensation; a chair changing the process while a member holds an old packet; doctrine or qualification definitions changing mid-round; duplicate/revised submissions; late reviews after release; revoked users retaining local files; restored backups with the same search identity. The manual bridge already carries search, candidate, round and snapshot IDs, template version, assignment date, original submission and modification timestamps. Server mode must add authenticated authorship, optimistic versions, explicit conflict resolution and enforced access rules rather than treating those identifiers as credentials.
