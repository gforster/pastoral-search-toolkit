# Architecture

## Initial decisions

- Dependency-free, standards-based HTML, CSS and JavaScript ES modules. A static host is sufficient; no vendor account, server database, paid API, or build framework is required to operate the application.
- Authored deployable files live in `dist/` and are tracked as source. This is intentional: there is no generated bundle. The repository root contains documentation, tests and local server tooling.
- Browser-local projects plus explicit JSON export/import support privacy and portability. Self-hosting on the same origin preserves browser storage. Different origins/browsers require an exported backup.
- No remote fonts, analytics, external scripts, candidate uploads or hidden network calls. Content Security Policy restricts active content. Hosting infrastructure can still log normal page requests.

## Layers

`dist/data.js`: declarative module content, field schema, milestones, qualification framework and document definitions. Stable IDs are part of the backup format.

`dist/domain.js`: pure project creation, answer handling, applicability, task classification, readiness, module states and backup validation. No DOM or browser storage. Tests focus on milestone boundaries, conditional requirements and malformed imports.

`dist/storage.js`: versioned device storage, defensive loading, revision checks and export-safe errors. Never clears corrupted data automatically.

`dist/documents.js`: deterministic document selection and escaping; explicit public/internal field boundaries and honest placeholders.

`dist/views.js`: escaped HTML view functions for orientation, dashboard, independent modules, question/qualification worksheets, tasks and document preview.

`dist/app.js`: navigation, editing events, project management, recovery feedback and optional feature-detected browser-agent tools. Hash routes support static hosting and direct links. User values render as text or through a central escaping function.

`dist/styles.css`: shared design tokens, responsive working surfaces, visible focus, reduced-motion support and dedicated print rules.

`scripts/serve.mjs`: small dependency-free local static server, safe path handling and security headers. Production may use any static server. `npm test` uses the Node test runner; browser verification exercises actual user journeys.

## Content stewardship

Content has an explicit provenance and classification audit. The source package supplied by the user in Google Drive includes START HERE, seven working documents, eight handouts, and five references. The audit records their reusable content and church-specific exceptions; private original documents are not bundled into the public repository. Never imply endorsement or independent review by Fellowship Baptist Church, pastoral counselors, attorneys, or tax professionals. Contribution review must keep doctrine, interpretation, governance, convictions, fit and preference separate.

## Security and durability

- Local storage is unencrypted; avoid candidate personal records. Export is an intentional download; backups are never automatically transmitted.
- Imports have a size cap, version check, ID/schema allowlists, type/length bounds, and no executable content. An imported project gets a new ID.
- No `eval`, user-provided HTML, unsafe markup injection, or remote rendering services.
- Per-project revisions detect stale-tab writes. On conflict, stop saving the stale project and offer backup/reload.
- Storage failure shows persistent feedback and retains work in memory for export; never claim it saved.
- Browser data removal is irreversible without backup. Deletion requires a specific confirmation.
- Print/download actions distinguish internal material from candidate-facing handouts.

## Delivery and maintenance

MIT license, contributor guide, security policy, CI checks and self-hosting instructions accompany the app. GitHub Pages can publish `dist/` directly using the included workflow. Sites hosting is an optional preview/distribution channel, not a runtime dependency. Public GitHub publication depends on an authenticated account and is reported separately from local completion.

## Deliberate limits

No server synchronization, account system, encrypted vault, legal compliance engine, candidate scoring, or background-check integration. Accessibility checks and automated tests provide evidence, not a certification. The initial content requires pastoral/editorial review before describing it as a vetted denominational resource.
