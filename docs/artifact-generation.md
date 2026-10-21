# Artifact generation

## Expected working outcome

Printouts use **[1] First meeting**, **[2] Proposed second meeting** and **[F] Future meetings**, with an action such as assign, report, discuss or authorize. A sheet can have more than one mark. The marks are a proposed meeting plan, not dates, readiness gates, completed tasks or approvals. Numbered tabs remain useful as replacement sheets are added; the HTML packet adds no continuous page counters. Browser-provided print headers/footers are controlled by the browser's print settings.

Boxed revision notes identify draft working definitions, proposed procedures, source gaps and material needing review before distribution. Notes use the actual recorded adoption state: adopted church definitions are not relabeled as samples. The 26 qualification blocks keep the church's recorded content, show the reference separately and emphasize meaning, evidence, contrary patterns and judgment questions. The **Committee Governance Summary** keeps the existing `governance` ID and expressly defers to the actual church constitution and adopted sources.

**Congregation input and updates** is one of the eight shared assignments. The chair's guide and binder include a suggested approach: assign a lead at meeting 1, review questions/accessible response routes and authorization at meeting 2, then discuss themes at a later session. Paper cards and equivalent phone/conversation options avoid requiring another application. The proposal preserves differing views, routes personal/safety matters separately, and does not turn feedback into a vote or an amendment of church standards.

The default printable outcome should help the committee accomplish its next work. A page should supply a needed current fact or source, support a concrete decision, assign a result, or provide space to record evidence and follow-through. Avoid repeated handbooks, empty divider pages and several worksheets asking the same question. Keep unresolved matters truthful and distinguish current work from later prerequisites.

**Documents & handouts** offers five assembled packets as well as the existing individual documents:

- **Working committee binder:** twelve tab groups, with the first document carrying the tab label. Includes current focus, coverage/handoff planning, decision and action records, committee roles, eight first-meeting assignments, draft minutes, source checks, church profile, doctrine/practice review, all 26 qualification definitions, compensation planning, and later-stage preparation sheets.
- **First meeting agenda:** a two-hour schedule with organizing formalities immediately after prayer, roles/communication and the shared assignment sheet.
- **First meeting chair’s guide:** the same schedule and assignments, with prompts to distinguish information, requested reports, proposed action and decisions actually made.
- **Proposed second meeting agenda:** a one-hour follow-up based on written reports roughly 48 hours ahead, reports by exception and one or two prepared decisions. It is also included in the binder, first-meeting packet and chair’s guide for advance distribution. Date and scope remain proposed; substantial standards/governance discussions may need their own focused meeting.
- **Later search resources:** complete candidate forms, interview and scenario banks, references, finalist/call and handoff resources, respecting enabled optional tools. Print individual documents selectively from the library rather than routinely printing the entire resource collection.

These are projections of existing workbook inputs, not stored parallel documents or a new approval mechanism. Recorded church information and definitions are reused. General saved tasks appear in Action follow-up. Existing shared-project decisions retain their reasons, unresolved concerns, recorder and follow-through. Candidate-linked decisions/tasks and individual collaboration observations stay out of the general binder. External documents retain their field allowlists. The full ZIP remains private and still includes the complete project backup.

The binder shows the first eight current and first eight later unresolved prerequisites with an explicit pointer to **Open decisions** for the complete list. This print summary never changes readiness. Blank worksheets do not assert that their work has been completed. Report receipt, task completion and approval remain different actions. Page counts vary with input length; no fixed 34-page promise applies to arbitrary church inputs.

Print styling uses readable body text, serif document titles, teal headings, shaded table headers, repeated table headings and space for handwriting. Contents links work offline in standalone HTML; the in-app contents controls scroll without leaving the project. Tables escape user input just as paragraph output does. Compact meeting packets omit standalone cover/contents pages. Technical provenance remains in the archive rather than filling the working pages.

After a paper meeting, reconcile minutes, actual decisions, unresolved concerns and assignments with the agreed working master. Handwritten changes are not imported or saved automatically. Export a backup after reconciliation. An assembled packet remains an internal working draft even if some component documents have their own explicit approval records.

The workbook contains 43 templates. Optional interim, bivocational and sermon tools appear only when enabled by relevant answers; the self-assessment is available as a recommended optional tool. Working documents, candidate handouts, congregation communications and committee references use shared section data.

Every available document can be generated while the project is incomplete. Required missing inputs produce INCOMPLETE; outstanding recommended content may produce DRAFT — READY FOR REVIEW; otherwise a document is READY FOR COMMITTEE REVIEW. Only an explicit user approval record yields APPROVED FOR USE. Further workbook edits clear prior artifact approval. Readiness does not prove the truth of answers or authorize the church to act.

Church name and project-update date appear on documents. Internal provenance includes application version, schema version, template version, last modification and generation timestamps. Technical IDs and hashes are not shown prominently to churches. Blank candidate/reference forms intentionally leave room for handwritten evidence, dates, contacts and decisions; completed source files remain in authorized church records; structured individual observations can now be held in the separate collaboration area.

## Formats

- Markdown: editable text with imported markup escaped.
- Standalone HTML: opens without the application, with its own restrictive content policy and print CSS.
- PDF: use browser Print / Save as PDF. No separate PDF service or fragile conversion dependency.
- JSON: validated human-readable whole-project backup; imported copies preserve answer content and artifact bodies.
- ZIP: fflate creates `pastoral-search/working-binder.html`, `meeting-agenda.html`, `chair-guide.html`, `second-meeting.html`, `later-resources.html`, `START-HERE.md` and `.html`, `WORKING-DOCUMENTS/`, `HANDOUTS/`, `REFERENCE-MATERIALS/`, `project.json`, `provenance.json`, and a package README. Individual documents are included as Markdown and HTML. Assembled packets use standalone printable HTML; browser printing produces PDF.

The full package is an internal working packet and includes private project data. It remains downloadable before final readiness, with truthful status and placeholders. Review individual handouts before distribution. Authoritative governing and doctrinal documents are supplied separately, never fabricated or presumed attached.

Template changes should be visible in pull requests. Update the content/template version after consequential content changes. DOCX, direct professional PDF composition, and Google Docs export remain roadmap items.

## Collaboration artifacts and export boundaries

Review worksheets and candidate meeting sheets use dedicated internal renderers in `artifacts/renderers/collaboration.js`. They escape user text, allow only validated evidence links and use a restrictive standalone content policy. A printable worksheet captures exactly the assigned criteria/context and leaves room for handwriting; it does not require digital participation. A meeting sheet projects one candidate’s process state, work, evidence needs, decision history and only released round observations, preserving material/minority concerns.

These are separate from the 43 general workbook templates. Existing candidate/congregation projections retain explicit field allowlists and never read collaboration notes, member identities or submissions. The generic internal call checklist includes only tasks marked as prerequisites.

The full working ZIP still includes the complete private project JSON; when collaboration data is present the app requires an explicit private export action. A review packet and completed review are dedicated minimal JSON formats, not full backups. A reusable church template is a separate allowlisted export with a preview, excluding candidate/review/decision data.
