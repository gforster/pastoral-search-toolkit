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

Use Node 22+, `npm ci`, `npm run check`, `npm test`, and `npm run test:browser` (install Playwright Chromium first). Keep the runtime static and dependency-free unless a demonstrated user need justifies a change. Add meaningful tests for readiness, persistence, import, or document-boundary changes.

Stable field IDs and the JSON schema are a compatibility contract. A breaking change requires a migration and version update; never silently discard stored work. Document allowlists are privacy boundaries. Validate inputs and escape church-authored text when rendering HTML.

Check desktop and small mobile layouts, keyboard focus, 200% text size, unknown/error states, and print output. Use Conventional Commit titles, such as `fix: preserve project data on storage failure` or `docs: clarify committee authority`.

Open pull requests with the problem, resulting behavior, relevant validation, and any remaining limitations. Never include sensitive church or candidate data in issues or screenshots.
