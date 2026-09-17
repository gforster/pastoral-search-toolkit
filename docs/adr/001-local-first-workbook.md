# 001 — Static workbook, typed schema, and local persistence

Accepted 2026-09-17.

Keep the existing semantic HTML/JavaScript presentation layer and hash routes. Introduce Vite for a real static production build and TypeScript strict mode with Zod for the canonical schema, migrations, and reusable-template boundary. A React rewrite would add migration work without improving this form-driven MVP. JavaScript UI modules are linted; they are not claimed to be fully TypeScript-checked. Contributors can migrate them incrementally.

Use IndexedDB transactions for project storage and revision conflict checks. Import the previous localStorage records once, retaining the originals for recovery. Keep the original backup format and migrate schema v1 to v2 without guessing missing answers. A transaction failure must leave revisions and recoverable browser data intact. BroadcastChannel informs other tabs; transaction revision checks remain authoritative.

No server, accounts, analytics, candidate database, or automatic transmission of project contents. Backups remain essential and unencrypted. GitHub Pages hosts the static build, using relative assets and hash routing for repository subpaths.
