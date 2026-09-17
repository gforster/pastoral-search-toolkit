# Contributing

Contributions should make careful pastoral-search work easier for a small church. Explain the church problem your change addresses and include evidence that it works.

## Content

- Read the source audit and domain model before changing guidance.
- Keep biblical framework, interpretation, adopted doctrine, governance, convictions, fit and preference distinct.
- Never insert a church-specific threshold, officer arrangement, calendar, doctrinal position or personal intention as a universal default.
- Examples remain draft discussion items until a church owns them. Do not silently settle contested qualification interpretations.
- Retain compassionate language for bereavement/incapacity, explicit conflict safeguards, and honest unknowns.
- Do not add candidate ranking, aggregate scoring, or claims that the application determines God’s will.
- Cite the source document/section and explain its classification when adapting additional material. Do not commit private source documents, project backups or candidate information.

## Code

Use Node 22.13+, `npm ci`, `npm run check`, `npm test`, and `npm run test:browser` (install Playwright Chromium first). Keep deployment static and dependencies limited to demonstrated needs; no server is required. Add meaningful tests for readiness, persistence, import, or document-boundary changes.

Stable field IDs and the JSON schema are a compatibility contract. A breaking change requires a migration and version update; never silently discard stored work. Document allowlists are privacy boundaries. Validate inputs and escape church-authored text when rendering HTML.

Check desktop and small mobile layouts, keyboard focus, 200% text size, unknown/error states, and print output. Use Conventional Commit titles, such as `fix: preserve project data on storage failure` or `docs: clarify committee authority`.

Open pull requests with the problem, resulting behavior, relevant validation, and any remaining limitations. Never include sensitive church or candidate data in issues or screenshots.

## Contribution paths and content review

Content corrections belong in `src/content/` or `src/artifacts/templates/`; explain the source, intended audience, and whether the statement is biblical framework, local requirement, configured process, recommendation, or optional practice. Changes to qualifications, doctrine, polity or search philosophy need identified pastoral/theological review in the pull request, separately from code checks. Do not imply that automated tests validate theology.

Preset proposals must state name, assumptions, audience, source, and local-adoption requirements. For example: “Independent Baptist Congregational Starter — assumes congregational final call and a pulpit committee.” Values remain suggestions. Never insert real church names, financial figures, candidate data or private search history into a reusable preset.

Bug fixes should include a reproducible case and meaningful regression coverage. Feature proposals should describe the church task and remain consistent with the local-first boundary. Documentation changes should be checked against the current implementation. Translation proposals should preserve authority labels, theological distinctions, accessible labels and unknown states, and identify an appropriate language/pastoral reviewer; localization infrastructure is still roadmap work.

Run `npm run format`, `npm run format:check`, `npm run check`, `npm test`, and the browser suite before a code PR. Stable field IDs, migrations, audience allowlists, conditional readiness and recoverable storage are especially important contracts.
