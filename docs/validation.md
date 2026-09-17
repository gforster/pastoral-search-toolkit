# Validation record

Version 0.2.0 · September 17, 2026. These results were run against the production build, not inferred from implementation.

## Local quality suite

- Clean `npm ci`: passed; npm reported zero dependency vulnerabilities at this run.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed for the strict TypeScript schema, migrations, reusable-template boundary and Vite configuration. Existing JavaScript presentation/domain modules are linted and behavior-tested, not claimed to have full TypeScript coverage.
- `npm run build` and repository/asset/security-policy checks: passed.
- `npm test`: **39 passed, zero failed**. Coverage includes fixtures A–G; milestone boundaries; unknowns; explicit non-voting governance; interim recusal; bivocational workload; schema v1 migration; malformed/future/oversized imports; approval invalidation; identical readiness/artifact bodies across export/import; presets and private-field separation; HTML escaping; audience boundaries; ZIP contents; IndexedDB legacy/corrupt recovery; quota failures; stale updates/deletes.
- `CHROME_CHANNEL=chrome npm run test:browser`: passed. Exercises all 19 modules and 43 documents, editing, saved reload, unknowns, question selection, extra prerequisites, Markdown/HTML/JSON/ZIP downloads, print emulation, explicit artifact approval and invalidation, temporary sample isolation, duplicate/rename/delete, preset review, alternative call processes, stale tabs and persistent recovery feedback.
- The browser suite also completes initial setup using keyboard only, exports recoverable work when storage is blocked, migrates a legacy browser project and rejects a damaged import without deleting existing work.
- Automated axe checks: no WCAG 2 A/AA or 2.1 AA violations on representative landing, dashboard, governance, convictions, task, document and mobile screens.
- Responsive checks: 320px, 390px and 200% text reflow passed. No uncaught browser errors or unexpected external runtime requests were recorded.
- All browser paths use a production build served under `/pastoral-search-toolkit/` to verify repository-subpath assets and hash routing.

Desktop and mobile screenshots were inspected. A two-page compensation PDF was rendered to PNG and visually checked for margins, readable type, headings, truthful unknowns, page breaks and footer; navigation is excluded. Browser downloads and development screenshots remain ignored in `test-results/`. The intentionally public, anonymized example and fictional scenario builders are committed; private original source documents are not.

## Scope and limits

Local browser checks use installed Chrome on macOS. Both GitHub verification and Pages deployment workflows run the same suite using Playwright Chromium on Linux before publishing. See the repository Actions history for the status of a specific commit.

Automated checks are not an accessibility certification. Full manual screen-reader testing, additional browsers and real-church feedback remain useful. Optional browser-agent contracts were tested with a registry adapter; ordinary operation does not depend on native browser-agent support.

Software tests do not independently verify doctrine, governance, safety compliance, church approval or candidate eligibility. Pastoral/theological review of generalized content and appropriate professional review of each church’s legal/financial/safety process remain necessary.
