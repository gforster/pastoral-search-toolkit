# Pastoral Search Toolkit

A free, open-source pastoral-transition and search workbook for small churches, especially those without denominational or professional transition support.

**What can we do now? What must we decide next? What can safely wait—and why?**

[Open the public feedback preview](https://gforster.github.io/pastoral-search-toolkit/) · [Give feedback](https://github.com/gforster/pastoral-search-toolkit/issues/new)

Choose **Explore a Sample Search** to try a labeled, temporary example. Duplicate it only when you want to create a saved local project. The GitHub Pages publication is a feedback preview; it can be disabled in repository Pages settings without removing the repository.

The public/static version supports local projects and portable committee reviews. A future optional **Committee Workspace** is planned, but no cloud account is required for the core toolkit.

<!-- Screenshot placeholder: a current landing/dashboard screenshot can be added here after editorial review. Browser checks produce local screenshots in test-results/. Never publish private church projects. -->

## What it does

- Guides immediate stability, committee organization, preparation, candidate discernment, finalist/call, and handoff through **15 independent core modules** and **four optional/contextual tools**: sermon review, church self-assessment, interim ministry, and bivocational ministry.
- Explains **seven separate readiness milestones**. Unknown compensation need not stop committee preparation; unresolved vote requirements block the relevant later stages. A confirmed alternative decision process uses its own requirements.
- Turns unknown answers into current decisions, later requirements, recommendations, or optional work. Additional church prerequisites can be assigned an owner and milestone.
- Keeps biblical qualifications, adopted doctrine, governance, convictions, ministry fit, and preference distinct. All 26 qualification entries retain Scripture references and church-owned definitions.
- Provides a grouped source question bank, selected core prompts, questions from adopted convictions, custom follow-ups, and scenarios. There is no automatic candidate ranking or total score.
- Generates **43 templates** across working documents, candidate and congregation handouts, and reference guides. Relevant optional documents appear when enabled. Every draft remains useful with truthful placeholders; approval requires an explicit human record.
- Exports Markdown, standalone printable HTML, whole-project JSON, and a structured ZIP with documents and backup. Use browser printing for PDF.
- Autosaves projects in **IndexedDB**, with rename, duplicate, confirmed deletion, old-backup migration, corrupt-record recovery, and stale-tab conflict protection.
- Separates shared church facts, candidate records, individual observations, committee decisions and assigned work. Members can review independently, return small JSON files, and discuss a compilation that preserves minority concerns without scoring candidates.

## Manual committee workflow

1. Chair opens **Committee work & candidates**, adds members and a candidate, and creates a review round with selected evidence and expected reviewers.
2. Chair downloads a **Review Packet** for each recipient. Packets contain assignment context, not the entire church project or anyone else's review.
3. Member opens **Individual reviews**, imports the packet, enters a self-identified name, completes the review and downloads **Completed Review**. Drafts save locally; nothing is sent automatically. A printable worksheet supports paper participation.
4. Chair imports the returned files together, handles duplicates or stale criteria explicitly, closes submissions and releases the compilation for discussion.
5. The committee considers original observations, questions, divergent responses and every material concern. The chair records its actual decision and any follow-up assignment.

Sermon, materials, interview, qualification-evidence and general reviews are available. Qualification reviews use the church's adopted definitions. Round snapshots preserve what each reviewer saw. Submission counts are not attendance, quorum, votes or a candidate score. Local release controls guide the workflow; they are not authenticated security or encryption.

See the [architecture](docs/collaboration-architecture.md), [practice checklist](docs/collaboration-battle-test.md) and [Committee Workspace roadmap](docs/roadmap-collaboration.md).

It does not choose a pastor, replace Scripture or prayer, override governing documents, give legal advice, conduct background checks, or centrally store candidate data. Readiness means recorded prerequisites, not independent verification or permission to act.

## Privacy and backups

No account, central project database, analytics, advertising, remote fonts, or automatic project upload. The static host may log ordinary page requests. Data stays in this browser profile and origin; **it is not encrypted or cloud-backed up**.

Use **Download Project Backup** periodically. Clearing browser data can remove projects. Imports make separate copies, not synchronized committee workspaces. The full ZIP includes private project data and internal documents; share only reviewed handouts with the intended audience. Keep candidate dossiers, allegations, background reports, passwords, donor records, and private care histories in appropriate secure systems outside the toolkit. See [Privacy](docs/privacy.md) and [Security](SECURITY.md).

Full backups containing collaboration records have a private-export warning. Reusable church-template exports exclude candidates, reviews, decisions and transition-specific fields; review the remaining free text before reuse. Ordinary candidate/congregation handouts never draw from individual review records. Review packets, completed reviews and internal meeting sheets have their own narrow audiences.

## Run locally

Install Node.js 22.13+ (or Node 24 LTS), then:

```sh
git clone https://github.com/gforster/pastoral-search-toolkit.git
cd pastoral-search-toolkit
npm ci
npm run dev
```

For a production preview:

```sh
npm run build
npm run preview
```

Open the printed local URL. Production preview normally uses `http://127.0.0.1:4173`. Keep the same host/port to access the same browser projects. Do not open the entrypoint directly with `file://`.

## Deploy

Serve generated **`dist/`** on an HTTPS static host. GitHub Actions performs clean install, formatting, lint, strict schema typecheck, unit tests, build, and Playwright checks before publishing Pages on `main`. Select **GitHub Actions** as the Pages source in a fork. Relative assets and hash routes support repository subpaths, which the browser suite explicitly tests.

No application backend, database service, account server, or API key is required. Changing origins requires exporting and importing projects. See [Deployment](docs/deployment.md).

## Repository map

| Location | Responsibility |
| --- | --- |
| `src/schema/` | TypeScript/Zod project and reusable-template schemas; migrations |
| `src/domain/` | Readiness, tasks, review invalidation, backup and template boundaries |
| `src/content/` | Modules, Scripture references, questions, guidance and suggested presets |
| `src/storage/` | Transactional IndexedDB persistence and legacy recovery |
| `src/collaboration/` | Local chair workflow, independent reviewer UI, import resolution |
| `src/artifacts/` | Shared templates, audience boundaries, HTML and ZIP rendering |
| `src/app.js`, `src/views.js`, `src/styles.css` | Browser interaction and accessible responsive presentation |
| `examples/` | Sanitized Fellowship-inspired worked example |
| `tests/` | Domain/storage checks, scenarios A–G and browser journeys |
| `docs/`, `docs/adr/` | Source audit, models, privacy, deployment and consequential decisions |

Vite packages the existing standards-based presentation layer. The canonical schema, migrations and template boundary use strict TypeScript; existing JS UI modules are linted and can migrate incrementally. [ADRs](docs/adr/) explain this choice and the local-first architecture.

## Source and theological scope

The design grew from Fellowship Baptist Church’s Independent Fundamental Baptist source package: START HERE, seven working documents, eight handouts and five references. Preparation before candidates, gates before fit, character before charisma, evidence before impressions, and confidentiality without secrecy remain central.

Named people, private staffing intentions, calendar and tenure are excluded from the example. Source committee composition and call thresholds appear only in labeled example configuration. Quorum and notice remain unknown where the sources did not establish them. Theology, music, translation practice and cooperation positions are configurable topics, not automatic doctrine. The source’s weighted rubric becomes an unscored evidence worksheet; the superseded guide remains historical.

Read the [source audit](docs/source-content-audit.md), [domain model](docs/domain-model.md), [content model](docs/content-model.md), and [theology and scope](docs/theology-and-scope.md). Original private source documents are not bundled. Attribution is not endorsement.

## Quality and contribution

```sh
npm run format:check
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

With installed Chrome, use `CHROME_CHANNEL=chrome npm run test:browser`. Both workbook and collaboration journeys run against a temporary static server under a repository subpath. Checks include independent offline review, packet/returned-review downloads, six-of-seven participation, minority concerns, duplicates/mismatches, stale snapshots, actual decisions and follow-up, sensitive backups, sanitized templates, persistence, accessibility and mobile layouts. Test screenshots remain ignored under `test-results/`. Run `npm run test:collaboration` or `npm run test:browser:collaboration` for focused checks.

See [Validation](docs/validation.md) for results actually run, [Contributing](CONTRIBUTING.md), and the issue/PR templates. Pastoral/theological review is still needed for generalized qualification labels, adapted source questions, polity/preset language, and pastoral guidance. Legal/financial/safety wording needs appropriate professional review for each church; tests do not validate those judgments.

## Intentional next steps

DOCX and dedicated PDF output, an optional authenticated Committee Workspace, encrypted attachments, document-assisted workflows with human confirmation, more declared fellowship/polity presets, localization and cycle archival remain [roadmap](docs/roadmap.md) work. No candidate marketplace, automated pastoral recommendation or AI scoring is planned.

## License

[MIT](LICENSE). Free to use, modify, share and self-host.
