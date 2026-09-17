# Domain model

The unit of work is a **Pastoral Search Project**, not a candidate record or a mandatory wizard. Every module can be opened at any time. An unknown answer is useful information; it generates a task with a milestone, rather than blocking unrelated preparation.

## Project and persistence

`Project` has an ID, schema version, name, created/updated timestamps, orientation context, a selected milestone, keyed answers, module review records, church-authored requirements, and qualification working definitions. Multiple projects may coexist on one device. JSON backups carry the complete project and schema version. Import validates structure and limits before creating a separate project; it never silently overwrites another project.

Device-local storage is the initial privacy boundary. No account, server database, telemetry, candidate repository, or automated candidate ranking is needed. Users must be told where their work is stored, that browser data can be cleared, that this is not an encrypted vault, and that exported backups need appropriate care. A persistence error must preserve current work and offer export. Simultaneous tabs must not silently overwrite each other.

## Independently editable modules

1. Transition & Immediate Stability
2. Church Profile
3. Governing Documents & Authority
4. Search/Pulpit Committee
5. Doctrine
6. Biblical Pastoral Qualifications
7. Church Convictions & Ministry Philosophy
8. Pastoral Position
9. Compensation & Support
10. Candidate Search Process
11. Interviews & Evaluation
12. References & Safety
13. Congregation Communication
14. Finalist & Call
15. Transition & Handoff

Optional/contextual tools: Sermon Review, Transition Self-Assessment, Interim Ministry, and Bivocational Ministry.

Each has guidance, fields, linked milestones and documents. Its computed state is `NOT_STARTED`, `IN_PROGRESS`, `READY`, `NEEDS_REVIEW`, or `BLOCKED`. READY means its applicable required answers are recorded and a human has reviewed the module; it does not certify truth, legal compliance, biblical eligibility, or readiness at another milestone. Editing invalidates its review. Changed governance or requirements also invalidate dependent reviews. A blocked module remains editable.

## Answers and requirements

An `Answer` has `status` (`known`, `unknown`, or `not_applicable`) and a string `value`. Each field has a stable ID, label, optional help, module, optional choices, applicability conditions, classification and earliest required milestone. Non-applicability is offered only for genuinely optional/conditional items; quorum and other governing requirements cannot be waived by selecting N/A. Vote-only fields are omitted only after explicitly selecting a non-voting call process; the alternative decision procedure then becomes required. Unknown applicability keeps the voting safeguards visible.

A `Requirement` has a category, statement, working definition/evidence, and a church-owned adoption state. Categories remain separate:

| Category | Authority/source |
| --- | --- |
| Reusable process principle | Toolkit guidance; not church law |
| Biblical pastoral qualification | 1 Timothy 3 and Titus 1; church records interpretation |
| Adopted doctrine | Church's own statement; toolkit never generates doctrine |
| Governance | Constitution, bylaws, adopted procedures and applicable law |
| Church conviction | Church-owned position, explicitly adopted |
| Ministry fit | Responsibilities and context, assessed with evidence |
| Personal preference | Acknowledged preference, never silently promoted |

The twenty-six qualification worksheet entries follow the supplied Fellowship working document 02, including its order and passage references. This is that source’s enumeration, not a claim that every church must count expressions identically. Interpretive questions remain open until the church supplies its understanding. All four prompts—meaning, evidence, disqualifying pattern, and difficult cases—must be recorded before adoption can satisfy active-search readiness.

## Readiness and actionable uncertainty

Milestones in recommended order: stabilize; organize committee; active search; serious advancement; present finalist; call/vote; handoff. Each has an explicit set of predicates and applicable prerequisites. They are evaluated independently of the selected dashboard view. A selected milestone controls urgency, not permission to edit.

Unresolved required items due at or before the selected milestone are `BLOCKER_NOW`; items needed later are `REQUIRED_LATER`. Recommendations and optional fields keep their respective classifications. Conditional requirements cover an interim, an associate/internal candidate, and serious conflict. Finalist and call prerequisites include church-specific additional adopted requirements, not merely a universal fixed checklist.

Readiness is **documented process readiness**, never approval to act. A church must verify its own prerequisites and authority. The final call/vote requires an explicit human verification of all applicable constitutional and adopted-process requirements. No total candidate score, automatic elimination, ranking, or claim to discover God's will exists.

## Documents

Documents are deterministic projections of project answers. They carry the church-name answer, project-update date, draft/review/explicit-approval status, unresolved placeholders, authority notice, and intended audience. Internal worksheets may include deliberation; candidate-facing documents use a deliberate allowlist of fields. Draft compensation uses the specified under-development notice. No unknown values are invented. Printable HTML and Markdown downloads support ordinary office workflows. JSON backup is distinct from a candidate packet.

## Boundaries

This edition organizes the church's process, not sensitive candidate dossiers. It records reference and safety procedures and completion verification, not criminal-history details or allegations. It offers no tax/legal advice, no background-check service, no candidate matching, and no synchronized multiuser editing.

## Schema v2 and reusable configuration

The canonical TypeScript/Zod schema is `src/schema/pastoral-search-project.ts`. It adds custom questions, artifact options/approval records and separately typed preset suggestions. `migrations.ts` upgrades v1 without guessing missing church decisions. The active project holds private cycle data; a conservative allowlist in `src/domain/templates.ts` extracts reusable fields without copying dates, committee names, compensation or transition circumstances. Free text still requires human privacy review. IndexedDB stores complete project records transactionally, with revision conflict detection and one-time preservation of legacy browser records.
