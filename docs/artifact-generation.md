# Artifact generation

The workbook contains 43 templates. Optional interim, bivocational and sermon tools appear only when enabled by relevant answers; the self-assessment is available as a recommended optional tool. Working documents, candidate handouts, congregation communications and committee references use shared section data.

Every available document can be generated while the project is incomplete. Required missing inputs produce INCOMPLETE; outstanding recommended content may produce DRAFT — READY FOR REVIEW; otherwise a document is READY FOR COMMITTEE REVIEW. Only an explicit user approval record yields APPROVED FOR USE. Further workbook edits clear prior artifact approval. Readiness does not prove the truth of answers or authorize the church to act.

Church name and project-update date appear on documents. Internal provenance includes application version, schema version, template version, last modification and generation timestamps. Technical IDs and hashes are not shown prominently to churches. Blank candidate/reference forms intentionally leave room for handwritten evidence, dates, contacts and decisions; completed source files remain in authorized church records; structured individual observations can now be held in the separate collaboration area.

## Formats

- Markdown: editable text with imported markup escaped.
- Standalone HTML: opens without the application, with its own restrictive content policy and print CSS.
- PDF: use browser Print / Save as PDF. No separate PDF service or fragile conversion dependency.
- JSON: validated human-readable whole-project backup; imported copies preserve answer content and artifact bodies.
- ZIP: fflate creates `pastoral-search/START-HERE.md` and `.html`, `WORKING-DOCUMENTS/`, `HANDOUTS/`, `REFERENCE-MATERIALS/`, `project.json`, `provenance.json`, and a package README. Each document is included as Markdown and HTML.

The full package is an internal working packet and includes private project data. It remains downloadable before final readiness, with truthful status and placeholders. Review individual handouts before distribution. Authoritative governing and doctrinal documents are supplied separately, never fabricated or presumed attached.

Template changes should be visible in pull requests. Update the content/template version after consequential content changes. DOCX, direct professional PDF composition, and Google Docs export remain roadmap items.

## Collaboration artifacts and export boundaries

Review worksheets and candidate meeting sheets use dedicated internal renderers in `artifacts/renderers/collaboration.js`. They escape user text, allow only validated evidence links and use a restrictive standalone content policy. A printable worksheet captures exactly the assigned criteria/context and leaves room for handwriting; it does not require digital participation. A meeting sheet projects one candidate’s process state, work, evidence needs, decision history and only released round observations, preserving material/minority concerns.

These are separate from the 43 general workbook templates. Existing candidate/congregation projections retain explicit field allowlists and never read collaboration notes, member identities or submissions. The generic internal call checklist includes only tasks marked as prerequisites.

The full working ZIP still includes the complete private project JSON; when collaboration data is present the app requires an explicit private export action. A review packet and completed review are dedicated minimal JSON formats, not full backups. A reusable church template is a separate allowlisted export with a preview, excluding candidate/review/decision data.
