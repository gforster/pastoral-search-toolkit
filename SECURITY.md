# Security and privacy

Projects stay in browser storage on the device. They are not encrypted. Anyone with access to the same browser profile may be able to read them. Clearing browser data removes them unless an exported backup exists. Shared devices require particular care.

The app does not automatically send project contents to a server. Normal hosting logs may include request metadata. Exported JSON contains the entire project. Markdown/HTML/PDF drafts contain the displayed document; review every field before distributing one. ZIP packages also contain internal documents and the full private backup. The application cannot judge whether a church placed sensitive information in a candidate-facing field.

Do not store background reports, allegations, credentials, full candidate dossiers, donor records or private pastoral-care notes in the toolkit. Use the church’s appropriate systems and authorized records practices.

## Report a vulnerability

Use the repository’s **Security → Report a vulnerability** option if enabled. If private reporting is unavailable, open an issue asking for a private reporting channel without revealing exploit details, confidential data or credentials. Do not post church backups publicly.

The current release uses a restrictive content policy, safe text rendering, bounded schema validation, version checks, and revision conflict detection. These are safeguards, not an assurance against all data loss or device compromise. Concurrent tabs use optimistic revisions within IndexedDB transactions; keep one active editing tab and export backups regularly.

Security fixes are maintained on the current `main` branch. There is no published long-term support schedule yet.

## Local collaboration boundaries

Candidate process records, individual review notes and committee history are sensitive local data. Member roles and submitted names do not provide authentication or access control. Closing a round hides its compilation in the workflow; it does not encrypt or cryptographically seal browser storage. Full private exports are explicitly labeled; sanitized templates and external handouts structurally exclude collaboration records. Inspect reusable free text before sharing.

Portable imports validate version, size, exact record shape, identifiers, response categories, snapshot linkage and duplicates. Evidence links are HTTP(S) only and are never automatically fetched. Local reviewer drafts, like projects, reject stale concurrent updates/deletes. Future shared-mode requirements for invitation expiry, per-project authorization, encryption, revocation, backups, deletion, logging and retention are documented in `docs/roadmap-collaboration.md`; none is implied by the current static edition.
