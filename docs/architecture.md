# Architecture

The application is a static, local-first workbook. Vite builds semantic HTML, CSS, and JavaScript presentation modules with a strict TypeScript/Zod schema and migration layer. It needs no application server, account, database service, paid API, remote fonts, or analytics. See the [ADRs](adr/) for the decision to retain the existing presentation layer instead of rewriting it in React.

## Layers

- `src/schema/`: canonical schema v3, collaboration records, independently versioned packet/review/template formats, explicit v1/v2 migration and import bounds.
- `src/content/core/`: modules, stable field IDs, milestone requirements, Scripture references, question bank. `guidance/` contains reusable principles; `presets/` contains suggestions, never adopted defaults.
- `src/domain/`: serializable project logic, explainable readiness and task classification, review invalidation, JSON round-trip, conservative reusable-template extraction.
- `src/storage/`: IndexedDB transactions, optimistic revisions, one-time legacy migration, raw recovery. The UI serializes saves and keeps unsaved work in memory. BroadcastChannel warns other tabs; transactions enforce conflicts even without notifications.
- `src/artifacts/templates/`: one structured section model, conditional content, explicit audience field selections. `renderers/`: standalone HTML and ZIP; Markdown and app previews use the same sections.
- `src/views.js`, `src/app.js`, `src/styles.css`: accessible forms, hash navigation, browser events, save/recovery feedback, responsive handbook presentation and print styles. These existing JS files are linted, not claimed to be fully TypeScript-checked.
- `examples/`: anonymized, labeled worked example. The sample runs temporarily in memory until the user duplicates it as a local project.
- `tests/`: Node domain/storage tests through the TypeScript loader, scenario fixtures A–G, Playwright journeys and axe accessibility checks.

`dist/` is generated and excluded from Git. `public/` contains static assets copied into it. Relative assets and hash routes work at the GitHub Pages repository subpath. The production server is any ordinary HTTPS static host; `scripts/serve.mjs` is a loopback-only local preview server.

## Boundaries

Church answers remain strings with explicit known/unknown/not-applicable states. Stable IDs preserve prior backups; typed structure and content-aware runtime validation reject invalid field choices. This edition has 15 core modules and four optional/contextual tools, plus local committee work. Separate candidate records hold limited context, process status and evidence references; they are not a secure file vault and never determine fitness.

A project may carry preset suggestions separately from active answers. A TypeScript allowlist can extract reusable configuration, excluding active-search fields. Candidate, individual-review, decision and directory records are excluded. Template export requires previewing the remaining free text. Full archival/retention tools are deferred.

Artifacts have a role and computed draft/incomplete/review status. Formal approval requires an explicit approval record and is cleared after relevant workbook edits. Internal provenance records application, schema, template, generation, and project-update versions/dates. Public output shows a modest project-update footer without internal IDs.

Backups preserve project content and update date, while imports receive a new ID and display name. Document headings use the church-name answer rather than the project display name, so round-trip imports produce identical artifact bodies and readiness.

## Local collaboration in v0.3

`src/collaboration/` implements chair and reviewer interfaces. Typed domain operations in `domain/collaboration.ts` handle immutable round snapshots, strict portable imports, participation, deterministic compilation, revisions and decisions without storage dependencies.

Schema v3 adds a stable search fingerprint distinct from the local storage ID. Backup restoration preserves it so assigned reviews still match; a new search gets a new fingerprint. IndexedDB upgrades from version 1 to 2 by adding `reviewWork`, preserving project/meta stores. Reviewer drafts persist independently from the chair’s project. Both repositories enforce transactional optimistic revisions; their contracts are in `storage/repositories.ts`.

See [collaboration architecture](collaboration-architecture.md) and [ADR 003](adr/003-manual-committee-collaboration.md) for the inspected baseline, boundaries, migration and future authenticated security model. Candidate/review records are never build inputs or preset data. No cloud sync, AI service, online ballots, analytics or automatic external evidence retrieval is introduced.
