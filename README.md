# Pastoral Search Toolkit

A free, open-source workbook for small churches navigating pastoral transition and a pastoral search.

**Your pastor is leaving. You do not have to invent the process from scratch.**

[Open the public feedback preview](https://gforster.github.io/pastoral-search-toolkit/) · [Report a problem or suggest an improvement](https://github.com/gforster/pastoral-search-toolkit/issues/new)

This GitHub Pages publication is a temporary feedback preview. You can turn it off in the repository’s Pages settings without removing the source repository.

The toolkit helps a church answer three questions: **What can we do now? What must we resolve next? What can safely wait?** It teaches the process, keeps unresolved decisions visible, and generates working documents and audience-specific handouts. It is not an applicant tracker, a candidate-ranking system, or a formula for discerning God’s will.

## Use the toolkit

Choose a starting point, answer a short orientation, and open any module. “We don’t know yet” is a valid answer. Work is saved on this device in this browser; use **Export project backup** regularly. Import a backup to create a separate copy on another device. Print a document or use your browser’s **Save as PDF**, or download its editable Markdown.

The application needs no account and makes no automatic upload of project data. Browser storage and exported backups are **not encrypted**. Clearing browser data can remove your work. Keep sensitive candidate files, allegations, background reports, passwords and pastoral-care records in appropriate secure systems outside this workbook. Backups are copies, not multiuser synchronization.

## What is included

- **15 independent modules:** immediate stability, church profile, governance, committee, doctrine, biblical qualifications, convictions/fit, pastoral position, compensation, candidate process, interviews, references/safety, communication, finalist/call, and handoff.
- **Seven readiness checks:** stabilize, organize, begin search, advance a serious candidate, present a finalist, call/vote, and handoff. Unknown compensation does not block committee formation. Unknown quorum becomes a blocker at the finalist stage.
- **Actionable uncertainty:** blockers for the selected milestone, later requirements, recommendations, optional items, and additional church prerequisites with responsible roles.
- **26 biblical qualification expressions:** the source worksheet’s order and references from 1 Timothy 3 and Titus 1, using KJV wording. Each has working meaning, evidence, disqualifying-pattern and difficult-case prompts. Interpretations are church-owned.
- **Clear categories:** biblical framework, adopted doctrine, governing authority, church convictions, ministry fit and personal preference. Conviction examples are never automatically adopted.
- **21 generated documents:** quick reference, working sheets 01–07, handouts H00–H07, authority checklist, covenant, roles sheet, intake procedure and interview guide. Unknowns remain explicit; draft compensation never invents amounts.
- Local project management, versioned JSON backup/import, defensive storage recovery, stale-tab detection, responsive layouts, keyboard navigation, print styles, and optional feature-detected browser-agent navigation/readiness tools.

Readiness means **recorded process prerequisites**, not independent verification, legal compliance, or permission to act. Your constitution, bylaws, adopted doctrine, and applicable law govern your church. This toolkit cannot override them.

## Run locally

Install Node.js 22 or later, then:

```sh
git clone https://github.com/gforster/pastoral-search-toolkit.git
cd pastoral-search-toolkit
npm start
```

Open the local URL printed by the server, normally `http://127.0.0.1:4173`. No package installation is required to run the application. Keep the same origin/port to access the same browser storage. Set `PORT` if needed. The included server binds to loopback for local use; use a production static server when hosting for others.

Do not open `index.html` directly with `file://`; JavaScript modules need an HTTP server.

## Self-host

Serve the contents of **`dist/`** from any static host over HTTPS. There is no build step, backend, database, account service, API key or runtime dependency. The files in `dist/` are authored source, intentionally tracked in Git. Hash routes and relative assets support a subdirectory such as GitHub Pages.

The included GitHub Pages workflow publishes `dist/` on a push to `main` or manual dispatch. In your fork, select **GitHub Actions** as the Pages source in repository settings. Tests run before deployment. Sites hosting metadata is optional and is not needed for self-hosting; remove `.openai/hosting.json` in an unrelated fork rather than reusing another owner’s Site ID.

Changing the host/origin does not move browser projects. Export a backup first and import it on the new origin. The hosting provider may log ordinary page requests. The toolkit has no analytics, advertising, remote fonts, or external runtime scripts.

## Source and theological origin

The initial design comes from Fellowship Baptist Church’s Independent Fundamental Baptist pastoral-search package. The supplied package includes START HERE, seven working documents, eight handouts, and five reference documents. Its distinctions—gates before fit, evidence before impressions, character before charisma, and confidentiality without secrecy—shape this product.

The church’s named officers, staffing intentions, calendar, committee composition, vote percentage, and meeting timing are **not** defaults. The source’s weighted candidate rubric has deliberately become an **unscored evidence worksheet**. This application does not adopt new doctrine for a church or settle disputed interpretations.

Read the [source content audit](docs/source-content-audit.md), [domain model](docs/domain-model.md), and [architecture](docs/architecture.md). Original private documents and personal arrangements are not bundled in this repository. Attribution is not endorsement.

## Development and verification

```sh
npm ci
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

The application itself has zero third-party runtime dependencies. Development dependencies are pinned browser/accessibility testing tools. The browser suite starts its own temporary local server, exercises editing, persistence, backup/import, conditional safeguards, documents, mobile layouts, keyboard and automated accessibility checks, and cleans up afterward. With installed Chrome, use `CHROME_CHANNEL=chrome npm run test:browser`.

The pure domain tests cover milestone boundaries, unknowns, conditional requirements, approval invalidation, schema validation, injection-safe document rendering, audience boundaries, storage failures and stale revisions. Browser checks do not constitute an accessibility certification. Manual testing with assistive technology and pastoral/editorial review remain valuable.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## Initial-release limits

There is no automatic synchronization, collaborative editing, encrypted vault, candidate database, legal/tax advice, background-check service, or offline service-worker cache. Self-hosted/local use needs no outside service. The local server or static host must be reachable to load the application. Browser-agent tools are optional and do not affect ordinary operation.

This is an initial release with documented tests, not an independently vetted pastoral or legal resource. Church leaders should review the content and their own adopted rules before using it to authorize action.

## License

[MIT](LICENSE). Free to use, modify, share and self-host.
