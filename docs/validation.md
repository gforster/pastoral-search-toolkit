# Validation record

## Working packet release — 0.4.0, October 21, 2026

The isolated checkout began at the published default-branch commit `d0309ae`. Before changes, `npm run check`, all 58 unit tests and the existing workbook/collaboration browser suites passed locally.

- `npm run format:check`, `npm run check` (lint, schema typecheck, production build and repository checks), and `npm test`: passed; **69 tests, zero failures**.
- Eleven added regressions cover twelve substantive tabs; separate later resources; all 26 qualifications and 104 recorded definition/evidence/judgment values; identical eight-task sheets and a 120-minute agenda; truthful unknowns without mutation or inferred approval; saved general assignments; preservation of shared decision concerns/follow-through; exclusion of candidate-linked tasks/decisions; escaping and existing external audience boundaries; optional forms; complete question banks; ZIP/backup restoration; and matching app/standalone styles under the unchanged CSP.
- `CHROME_CHANNEL=chrome npm run test:browser` includes the existing workbook and collaboration suites plus the working-packet journey, all against the production build under `/pastoral-search-toolkit/`.
- The added browser journey uses a fresh profile and a fictional church, imports a partially completed project, opens all five packet views, tests contents scrolling without route loss, downloads standalone HTML, reloads saved inputs, checks WCAG 2 A/AA and 2.1 AA axe rules, checks a 390px layout and generates print PDFs. The initial meeting does not require a candidate.
- Local engine: installed Chrome **155.0.8059.85 on macOS**, driven by Playwright Chromium. A responsive viewport is emulation, not a physical-phone test. Firefox and WebKit binaries are not installed locally; the added harness reports them unavailable and runs them when installed. Chromium is required by the CI configuration.
- Test screenshots, standalone downloads, PDFs and actual engine results remain ignored under `test-results/working-packets/`. These fixtures contain no private church or candidate information. No private Fellowship packet or original source document is committed.

The five assembled outputs retain the existing static/local-first architecture, project schema, storage, readiness and external field allowlists. They add no direct Word/PDF engine: standalone HTML and browser printing remain the delivery route. Paper records need manual reconciliation with the agreed working master. Page counts vary with input length. Software checks do not approve church decisions.

## Previous release evidence

Version 0.3.1 · September 17, 2026. Browser checks ran against the production build; results below were observed, not inferred from implementation.

## Local quality suite

- Dependencies were unchanged for v0.3. The preceding v0.2 validation included a clean `npm ci` and reported zero dependency vulnerabilities at that time. GitHub workflows perform a fresh install for every published commit.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed for the strict TypeScript schemas, migrations, collaboration domain, review repository, reusable-template boundary and Vite configuration. JavaScript presentation/domain modules are linted and behavior-tested, not claimed to have full TypeScript coverage.
- `npm run build` and repository/asset/security-policy checks: passed.
- `npm test`: **58 passed, zero failed**, including all 39 original tests, 16 collaboration tests and three module-review feedback tests. Existing coverage includes fixtures A–G; milestone boundaries; unknowns; explicit non-voting governance; interim recusal; bivocational workload; malformed/future/oversized imports; approval invalidation; identical readiness/artifact bodies across export/import; presets and private-field separation; HTML escaping; audience boundaries; ZIP contents; IndexedDB legacy/corrupt recovery; quota failures; stale updates/deletes.
- `npm run test:collaboration`: **16 passed, zero failed**. Covers the complete packet/review round trip, seven distinct reviewers, six-of-seven participation, minority/material concerns, hard-gate findings without averaging, mismatched searches/candidates/rounds/snapshots, duplicate and revised reviews, original timestamps and prior revisions, stale criteria, closed/reopened rounds, deterministic question grouping, all five review types, genuinely adopted qualification definitions, v2-to-v3 migration, private backup/ZIP restoration, sanitized templates, external-artifact privacy, import/export size limits, unsafe inputs, and durable reviewer drafts with IndexedDB upgrade/conflict handling.
- `CHROME_CHANNEL=chrome npm run test:browser`: passed. Exercises all 19 modules and 43 documents, editing, saved reload, unknowns, question selection, extra prerequisites, Markdown/HTML/JSON/ZIP downloads, print emulation, explicit artifact approval and invalidation, temporary sample isolation, duplicate/rename/delete, preset review, alternative call processes, stale tabs and persistent recovery feedback.
- The browser suite also completes initial setup using keyboard only, exports recoverable work when storage is blocked, migrates a legacy browser project and rejects a damaged import without deleting existing work.
- The new collaboration browser suite uses isolated chair/member contexts. It creates seven members and a candidate, exports a recipient packet, imports and edits a review offline, verifies saved reload and completed export, imports six reviews, handles duplicates/mismatches/stale criteria, releases a compilation with a minority material concern, records an actual decision and follow-up assignment, and checks private-backup confirmation and sanitized-template export. Both browser suites are included in `npm run test:browser`.
- Automated axe checks: no WCAG 2 A/AA or 2.1 AA violations on representative landing, dashboard, governance, convictions, task, document and mobile screens.
- Module-review feedback regression checks passed across all 19 modules: named top/bottom checklists, scrolling and focus after a blocked review, keyboard navigation, live correction, conditional fields, collapsed qualification prompts, compensation dependencies, and mobile accessibility. Desktop and mobile feedback screenshots were inspected.
- Collaboration axe checks passed for the directory, round, independent review, compilation and candidate meeting screens, including mobile.
- Responsive checks: 320px, 390px and 200% text reflow passed. No uncaught browser errors or unexpected external runtime requests were recorded.
- All browser paths use a production build served under `/pastoral-search-toolkit/` to verify repository-subpath assets and hash routing.

Desktop compilation and mobile candidate-meeting screenshots were inspected for the collaboration release. The preceding v0.2 validation also inspected a two-page compensation PDF for margins, readable type, headings, truthful unknowns, page breaks and footer. Browser downloads and development screenshots remain ignored in `test-results/`. The intentionally public, anonymized example and fictional scenario builders are committed; private original source documents and Fellowship exports are not.

## Scope and limits

Local browser checks use installed Chrome on macOS. Both GitHub verification and Pages deployment workflows run the same suite using Playwright Chromium on Linux before publishing. See the repository Actions history for the status of a specific commit.

Automated checks are not an accessibility certification. Full manual screen-reader testing, additional browsers and real-church feedback remain useful. Optional browser-agent contracts were tested with a registry adapter; ordinary operation does not depend on native browser-agent support.

Software tests do not independently verify doctrine, governance, safety compliance, church approval or candidate eligibility. Pastoral/theological review of generalized content and appropriate professional review of each church’s legal/financial/safety process remain necessary.
