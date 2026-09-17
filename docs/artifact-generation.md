# Artifact generation

The workbook contains 43 templates. Optional interim, bivocational and sermon tools appear only when enabled by relevant answers; the self-assessment is available as a recommended optional tool. Working documents, candidate handouts, congregation communications and committee references use shared section data.

Every available document can be generated while the project is incomplete. Required missing inputs produce INCOMPLETE; outstanding recommended content may produce DRAFT — READY FOR REVIEW; otherwise a document is READY FOR COMMITTEE REVIEW. Only an explicit user approval record yields APPROVED FOR USE. Further workbook edits clear prior artifact approval. Readiness does not prove the truth of answers or authorize the church to act.

Church name and project-update date appear on documents. Internal provenance includes application version, schema version, template version, last modification and generation timestamps. Technical IDs and hashes are not shown prominently to churches. Blank candidate/reference forms intentionally leave room for handwritten evidence, dates, contacts and decisions; completed forms are stored outside the toolkit.

## Formats

- Markdown: editable text with imported markup escaped.
- Standalone HTML: opens without the application, with its own restrictive content policy and print CSS.
- PDF: use browser Print / Save as PDF. No separate PDF service or fragile conversion dependency.
- JSON: validated human-readable whole-project backup; imported copies preserve answer content and artifact bodies.
- ZIP: fflate creates `pastoral-search/START-HERE.md` and `.html`, `WORKING-DOCUMENTS/`, `HANDOUTS/`, `REFERENCE-MATERIALS/`, `project.json`, `provenance.json`, and a package README. Each document is included as Markdown and HTML.

The full package is an internal working packet and includes private project data. It remains downloadable before final readiness, with truthful status and placeholders. Review individual handouts before distribution. Authoritative governing and doctrinal documents are supplied separately, never fabricated or presumed attached.

Template changes should be visible in pull requests. Update the content/template version after consequential content changes. DOCX, direct professional PDF composition, and Google Docs export remain roadmap items.
