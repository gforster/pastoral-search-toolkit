import { escapeHtml as e } from '../domain.js';
import { MODULES, MILESTONES, FIELD_MAP, QUALIFICATIONS, QUESTIONS } from '../data.js';
import { reusableTemplate } from '../domain/templates.ts';
import {
  REVIEW_TYPES,
  CANDIDATE_STATUSES,
  FINDINGS,
  DECISIONS,
  IDENTITY_NOTICE,
  candidateById,
  roundById,
  participation,
  compileRound,
  decisionHistory,
  staleRound,
} from '../domain/collaboration.ts';

const base = (p) => `#project/${p.id}/committee-work`;
const text = (s) => `<p class="preserve-lines">${e(s || 'None recorded.')}</p>`;
const options = (values, selected) =>
  Object.entries(values)
    .map(
      ([v, label]) =>
        `<option value="${e(v)}" ${v === selected ? 'selected' : ''}>${e(label)}</option>`,
    )
    .join('');
let controlId = 0;
const field = (name, label, value = '', type = 'text', extra = '') => {
  const id = `collab-control-${++controlId}`;
  return `<div class="collab-control"><label for="${id}">${e(label)}</label><input id="${id}" name="${e(name)}" type="${type}" value="${e(value)}" maxlength="${name === 'initials' ? 20 : name === 'label' ? 1000 : name === 'reference' ? 1500 : name === 'url' ? 2000 : 300}" ${extra}></div>`;
};
const area = (name, label, value = '', extra = '') => {
  const id = `collab-control-${++controlId}`;
  return `<div class="collab-control"><label for="${id}">${e(label)}</label><textarea id="${id}" name="${e(name)}" rows="3" maxlength="12000" ${extra}>${e(value)}</textarea></div>`;
};
const select = (name, label, values, value = '') => {
  const id = `collab-control-${++controlId}`;
  return `<div class="collab-control"><label for="${id}">${e(label)}</label><select id="${id}" name="${e(name)}">${options(values, value)}</select></div>`;
};
const check = (name, label, checked = false, value = 'yes') =>
  `<label class="check-label"><input type="checkbox" name="${e(name)}" value="${e(value)}" ${checked ? 'checked' : ''}>${e(label)}</label>`;
const submit = (label) => `<button class="button primary" type="submit">${e(label)}</button>`;
const button = (action, label, attrs = '') =>
  `<button class="button" data-collab="${action}" ${attrs}>${e(label)}</button>`;
const stateLabel = {
  open: 'Reviews open',
  closed: 'Submissions closed',
  released: 'Compilation released',
};
export function evidenceView(items) {
  return items.length
    ? `<ul class="evidence-list">${items.map((item) => `<li><strong>${e(item.title)}</strong> <span class="small muted">${e(item.kind)}</span>${item.reference ? text(item.reference) : ''}${item.url ? `<a href="${e(item.url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Open evidence link ↗</a>` : ''}${item.notes ? text(item.notes) : ''}</li>`).join('')}</ul>`
    : '<p>No evidence references selected. Ask the chair what material to review.</p>';
}
export function snapshotView(packet) {
  return `<div class="notice"><strong>Assigned context</strong><p>${e(packet.instructions || 'Review the assigned evidence independently and record observations before group discussion.')}</p><p class="small">External evidence links need their own access and internet connection. The toolkit does not download their contents.</p></div>${evidenceView(packet.snapshot.evidence)}<details class="collab-details"><summary>Criteria and church context as assigned</summary><h3>Review categories</h3><ul>${packet.snapshot.criteria.map((c) => `<li><strong>${e(c.label)}</strong>${c.hardGate ? ' · Gate-related evidence' : ''} — ${e(c.prompt)}</li>`).join('')}</ul>${packet.snapshot.context.map((c) => `<section><h3>${e(c.label)}</h3>${text(c.text)}</section>`).join('') || '<p>No additional church context included.</p>'}<p class="small muted">Template ${packet.snapshot.templateVersion} · Assigned ${e(packet.createdAt.slice(0, 10))}. Later changes do not rewrite this snapshot.</p></details>`;
}
function memberForm(m) {
  return `<form class="collab-form" data-collab-form="member" data-member="${e(m?.id || '')}">${field('name', 'Display name', m?.name, 'text', 'required')}${field('initials', 'Initials (optional)', m?.initials || '', 'text', 'data-limit="20"')}${select('role', 'Role', { chair: 'Chair / project admin', member: 'Committee member', read_only: 'Read only (directory label)' }, m?.role || 'member')}${field('email', 'Email (optional)', m?.email || '', 'email')}${select('voting', 'Voting status', { unspecified: 'Not specified', voting: 'Voting', non_voting: 'Non-voting' }, m?.voting || 'unspecified')}${check('active', 'Active member', m?.active ?? true)}${submit(m ? 'Save member' : 'Add member')}</form>`;
}
function assignmentForm(p, candidateId = '') {
  return `<form class="collab-form" data-collab-form="assignment">${field('label', 'Assigned work', '', 'text', 'required')}${field('owner', 'Owner (person or role)', '', 'text', 'list="committee-owners"')}${field('dueDate', 'Due date (optional)', '', 'date')}${select('candidateId', 'Related candidate', { '': 'Project-wide', ...Object.fromEntries(p.collaboration.candidates.map((c) => [c.id, c.name])) }, candidateId)}${select('moduleId', 'Related workbook module', { '': 'No module', ...Object.fromEntries(MODULES.map((m) => [m.id, m.short])) })}${check('prerequisite', 'This is an additional church prerequisite that must affect readiness')}${select('due', 'If a prerequisite, required before', Object.fromEntries(MILESTONES.map((m, i) => [i, m.title])), '2')}${submit('Add assignment')}</form>`;
}
function assignments(p, candidateId) {
  const tasks = p.tasks.filter((t) => !candidateId || t.candidateId === candidateId);
  return `<section class="collab-section"><h2>Assigned work</h2><p>Ordinary assignments describe work. Only explicitly designated prerequisites affect workbook readiness.</p><datalist id="committee-owners">${p.collaboration.members
    .filter((m) => m.active)
    .map((m) => `<option value="${e(m.name)}"></option>`)
    .join(
      '',
    )}</datalist>${tasks.map((t) => `<article class="collab-card"><h3>${e(t.label)}</h3><p>${e(t.owner || 'Owner not assigned')}${t.dueDate ? ' · Due ' + e(t.dueDate) : ''}${t.prerequisite !== false ? ' · Church prerequisite' : ''}${t.candidateId ? ' · ' + e(candidateById(p, t.candidateId).name) : ''}</p><label>Work status<select data-assignment-status="${e(t.id)}">${options({ open: 'Open', in_progress: 'In progress', done: 'Done' }, t.status || (t.resolved ? 'done' : 'open'))}</select></label></article>`).join('') || '<p>No assignments yet.</p>'}<details class="collab-details"><summary>Add assigned work</summary>${assignmentForm(p, candidateId)}</details></section>`;
}
function decisionForm(p, candidateId = '') {
  return `<form class="collab-form" data-collab-form="decision">${select('candidateId', 'Decision concerns', { '': 'Shared project', ...Object.fromEntries(p.collaboration.candidates.map((c) => [c.id, c.name])) }, candidateId)}${select('type', 'Committee decision', DECISIONS, candidateId ? 'PAUSE_FOR_EVIDENCE' : 'OTHER')}${field('stage', 'Gate or stage')}${field('date', 'Actual decision date', new Date().toISOString().slice(0, 10), 'date', 'required')}${area('rationale', 'Decision and rationale', '', 'required')}${area('unresolvedConcerns', 'Unresolved concerns')}${area('followUp', 'Assigned follow-up (optional)')}${field('owner', 'Follow-up owner')}${field('reviewDate', 'Follow-up review date (optional)', '', 'date')}${field('result', 'Actual vote/result (optional; e.g. consensus or 6–1)')}${field('recordedBy', 'Recorded by', '', 'text', 'required')}${area('notes', 'Additional notes')}${check('confirmed', 'I am recording the committee’s actual conclusion after its deliberative process')}${submit('Record committee decision')}</form>`;
}
export function historyView(p, candidateId) {
  return (
    decisionHistory(p, candidateId)
      .map(
        (d) =>
          `<article class="decision-record"><p class="eyebrow">COMMITTEE DECISION · ${e(d.date)}</p><h3>${e(DECISIONS[d.type])}${d.candidateId ? ' · ' + e(candidateById(p, d.candidateId).name) : ''}</h3><p>${e(d.stage)} · Recorded by ${e(d.recordedBy)}</p>${text(d.rationale)}${d.result ? `<p><strong>Recorded result:</strong> ${e(d.result)}</p>` : ''}${d.unresolvedConcerns ? `<h4>Unresolved concerns</h4>${text(d.unresolvedConcerns)}` : ''}${d.followUp ? `<h4>Follow-up</h4>${text(d.followUp)}<p>${e(d.owner)}${d.reviewDate ? ' · ' + e(d.reviewDate) : ''}</p>` : ''}${d.notes ? text(d.notes) : ''}</article>`,
      )
      .join('') || '<p>No committee decisions recorded.</p>'
  );
}
function decisions(p, candidateId) {
  return `<section class="collab-section"><h2>Committee decision history</h2><p>Records describe the committee’s actual actions. They do not certify a constitutional vote or automatically approve shared workbook answers.</p>${historyView(p, candidateId)}<details class="collab-details"><summary>Record an actual committee decision</summary>${decisionForm(p, candidateId)}</details></section>`;
}
function templatePreview(p) {
  const t = reusableTemplate(p);
  return `<div class="template-preview">${Object.entries(t.answers)
    .map(
      ([id, a]) =>
        `<h3>${e(FIELD_MAP[id]?.label || id)}</h3>${text(a.status === 'known' ? a.value : 'Not recorded')}`,
    )
    .join(
      '',
    )}<h3>Church convictions</h3>${t.requirements.map((r) => text(r.statement)).join('') || '<p>None included.</p>'}<h3>Qualification framework</h3>${
    Object.entries(t.qualifications || {})
      .map(
        ([id, q]) =>
          `<h4>${e(QUALIFICATIONS.find((x) => x.id === id)?.title || id)}</h4>${Object.entries(q)
            .map(([key, value]) => `<p><strong>${e(key)}:</strong> ${e(value)}</p>`)
            .join('')}`,
      )
      .join('') || '<p>No adopted definitions included.</p>'
  }<h3>Standard interview prompts</h3>${t.questions.map((id) => text(QUESTIONS.find((q) => q.id === id)?.question || id)).join('') || '<p>None selected.</p>'}<p>Include document status labels: ${t.artifactOptions?.includeStatus ? 'Yes' : 'No'}.</p></div>`;
}
function individualSubmission(review, criteria) {
  return `<h4>Overall observations</h4>${text(review.observations)}${criteria.map((c) => `<h4>${e(c.label)}</h4><p>${e(FINDINGS[review.responses[c.id]?.finding] || 'Not reviewed')}</p>${text(review.responses[c.id]?.notes)}`).join('')}<h4>Additional concerns</h4>${review.concerns.map((c) => `<p><strong>${e(c.category)} · ${e(c.severity)}:</strong> ${e(c.text)}</p>`).join('') || '<p>None recorded.</p>'}<h4>Proposed questions</h4>${review.proposedQuestions.map((q) => `<p><strong>${e(q.topic)}:</strong> ${e(q.text)}</p>`).join('') || '<p>None recorded.</p>'}`;
}
export function committeeView(p) {
  const preliminary =
    p.answers.prospectPool?.status === 'known'
      ? {
          parallel: 'Several prospects may receive preliminary review',
          single: 'One prospect at a time',
        }[p.answers.prospectPool.value]
      : 'Preliminary-review process not yet recorded';
  const serious =
    p.answers.seriousConsideration?.status === 'known'
      ? {
          one: 'One man in serious mutual discernment at a time',
          several: 'Several serious processes permitted by the church',
        }[p.answers.seriousConsideration.value]
      : 'Serious-discernment process not yet recorded';
  const processNotice = `<p class="small muted">${e(preliminary)}. ${e(serious)}. <a href="#project/${p.id}/module/process">Review the church’s process choices</a>.</p>`;
  return `<p class="eyebrow">LOCAL COMMITTEE WORK</p><h1>Think independently. Work together.</h1><p class="lede">The chair keeps the shared search record. Members receive a small review packet, complete it independently and return a review file for discussion.</p><div class="collab-steps"><span>1 · Assign a review</span><span>2 · Review independently</span><span>3 · Compile and discuss</span><span>4 · Record the decision</span></div><div class="notice">Candidate records and reviews stay in this browser unless you export them. Local roles are directory labels, not access controls. Use a trusted device and share files deliberately.</div><div class="actions"><a class="button" href="#reviews">Open my individual reviews</a>${button('directory', 'Committee directory')}</div><section class="collab-section"><h2>Candidates</h2>${processNotice}<p>Process state only. Individual reviews do not change the shared candidate record.</p><div class="candidate-list">${
    p.collaboration.candidates
      .map((c) => {
        const rounds = p.collaboration.rounds.filter((r) => r.candidateId === c.id);
        return `<article class="collab-card"><p class="record-label">SHARED COMMITTEE RECORD</p><h3><a href="${base(p)}/candidate/${c.id}">${e(c.name)}</a></h3><p>${e(CANDIDATE_STATUSES[c.status])} · ${e(c.stage || 'Stage not recorded')}</p><p>${rounds.reduce((n, r) => n + r.submissions.length, 0)} reviews received across ${rounds.length} rounds · References ${c.progress.referencesDone}/${c.progress.referencesExpected || 'not set'}</p>${c.evidenceNeeded ? text(c.evidenceNeeded) : ''}<a class="button" href="${base(p)}/candidate/${c.id}">Open candidate meeting view</a></article>`;
      })
      .join('') ||
    '<p>No candidates recorded. You can organize the committee before adding a prospect.</p>'
  }</div><details class="collab-details"><summary>Add a candidate</summary><form class="collab-form" data-collab-form="candidate">${field('name', 'Candidate display name', '', 'text', 'required')}${area('context', 'Brief context or secure record reference (optional)')}${submit('Add candidate')}</form></details></section><section class="collab-section" id="committee-members"><h2>Committee directory</h2><p>Names help assign work and count expected reviews. Activity does not establish attendance, voting eligibility or quorum.</p>${p.collaboration.members.map((m) => `<details class="collab-details"><summary>${e(m.name)} · ${e(m.role.replace('_', ' '))} · ${m.active ? 'Active' : 'Inactive'}</summary>${memberForm(m)}</details>`).join('') || '<p>No members yet.</p>'}<details class="collab-details"><summary>Add a committee member</summary>${memberForm()}</details></section>${assignments(p)}${decisions(p)}<section class="collab-section"><h2>Reusable church template</h2><p>This export omits candidate records, reviews, committee decisions, members, assignments, compensation and transition circumstances. Review the remaining church wording before reuse.</p><details class="collab-details"><summary>Review template content and export</summary>${templatePreview(p)}${check('templateChecked', 'I checked this reusable wording for private or search-specific details')}${button('template-export', 'Download church template')}</details></section>`;
}
function evidenceForm(c, ev) {
  return `<form class="collab-form" data-collab-form="evidence" data-candidate="${c.id}" data-evidence="${e(ev?.id || '')}">${field('title', 'Evidence title', ev?.title, 'text', 'required')}${select('kind', 'Evidence type', { sermon: 'Sermon', resume: 'Resume / ministry history', testimony: 'Testimony', doctrine: 'Doctrinal response', interview: 'Interview', reference: 'Reference', other: 'Other' }, ev?.kind || 'sermon')}${field('reference', 'Filename or record reference (optional)', ev?.reference || '')}${field('url', 'HTTP(S) link (optional)', ev?.url || '', 'url')}${area('notes', 'Context to share with assigned reviewers', ev?.notes || '')}${submit(ev ? 'Save evidence reference' : 'Add evidence reference')}</form>`;
}
export function candidateView(p, candidateId) {
  const c = candidateById(p, candidateId),
    rounds = p.collaboration.rounds.filter((r) => r.candidateId === c.id);
  return `<a class="back-link" href="${base(p)}">← Committee work</a><p class="eyebrow">CANDIDATE MEETING VIEW · INTERNAL</p><h1>${e(c.name)}</h1><div class="notice"><strong>Shared committee record:</strong> ${e(CANDIDATE_STATUSES[c.status])} · ${e(c.stage || 'Stage not recorded')}</div>${text(c.context)}<div class="process-grid"><div><strong>Questionnaire</strong><span>${e(c.progress.questionnaire.replace('_', ' '))}</span></div><div><strong>First interview</strong><span>${e(c.progress.interview.replace('_', ' '))}</span></div><div><strong>References</strong><span>${c.progress.referencesDone} / ${c.progress.referencesExpected || 'not set'}</span></div><div><strong>Safety review</strong><span>${e(c.progress.safety.replace('_', ' '))}</span></div></div><h2>Evidence still needed</h2>${text(c.evidenceNeeded)}${button('meeting-export', 'Download internal meeting sheet', `data-candidate="${c.id}"`)}<details class="collab-details"><summary>Update shared candidate record</summary><form class="collab-form" data-collab-form="candidate-update" data-candidate="${c.id}">${field('name', 'Candidate display name', c.name, 'text', 'required')}${area('context', 'Brief context', c.context)}${select('status', 'Process status', CANDIDATE_STATUSES, c.status)}${field('stage', 'Current gate / stage', c.stage)}${area('evidenceNeeded', 'Outstanding evidence', c.evidenceNeeded)}${select('questionnaire', 'Doctrinal questionnaire', { not_started: 'Not started', requested: 'Requested', received: 'Received' }, c.progress.questionnaire)}${select('interview', 'First interview', { not_started: 'Not started', scheduled: 'Scheduled', complete: 'Complete' }, c.progress.interview)}${field('referencesDone', 'References completed', c.progress.referencesDone, 'number', 'min="0" max="100"')}${field('referencesExpected', 'References expected', c.progress.referencesExpected, 'number', 'min="0" max="100"')}${select('safety', 'Background / safety review', { not_started: 'Not started', in_progress: 'In progress', complete: 'Complete' }, c.progress.safety)}${submit('Save shared candidate record')}</form></details><section class="collab-section"><h2>Evidence references</h2><p>Store a title, reference or link. Keep full background reports and private files in your church’s authorized secure records.</p>${c.evidence.map((ev) => `<details class="collab-details"><summary>${e(ev.title)} · ${e(ev.kind)}</summary>${evidenceView([ev])}${evidenceForm(c, ev)}</details>`).join('')}<details class="collab-details"><summary>Add evidence reference</summary>${evidenceForm(c)}</details></section><section class="collab-section"><h2>Independent review rounds</h2>${
    rounds
      .map((r) => {
        const count = participation(r);
        return `<article class="collab-card"><h3><a href="${base(p)}/round/${r.id}">${e(r.title)}</a></h3><p>${e(REVIEW_TYPES[r.reviewType])} · ${stateLabel[r.state]}</p><p>${count.expected ? `${count.received} of ${count.expected} expected reviews received` : `${count.total} reviews received; expected reviewers not set`}${count.additional && count.expected ? ` · ${count.additional} additional unassigned reviews` : ''}</p>${staleRound(p, r) ? '<p class="warning-text">Church criteria or evidence changed after this round was assigned.</p>' : ''}<a class="button" href="${base(p)}/round/${r.id}">Open review round</a></article>`;
      })
      .join('') || '<p>No review rounds yet.</p>'
  }<details class="collab-details"><summary>Create a review round</summary><form class="collab-form" data-collab-form="round" data-candidate="${c.id}">${field('title', 'Review round title', '', 'text', 'required')}${select('reviewType', 'Review activity', REVIEW_TYPES, 'sermon')}${area('instructions', 'Instructions for independent reviewers')}<fieldset><legend>Expected reviewers</legend>${
    p.collaboration.members
      .filter((m) => m.active)
      .map((m) => check('expectedIds', m.name, true, m.id))
      .join('') ||
    '<p>Add members in Committee work to assign named reviews, or use an unassigned packet.</p>'
  }</fieldset><fieldset><legend>Evidence to include</legend>${c.evidence.map((ev) => check('evidenceIds', ev.title, true, ev.id)).join('') || '<p>No evidence yet. You may give a title/reference in the instructions.</p>'}</fieldset>${check('includeDoctrine', 'Include the church-recorded adopted doctrinal statement in this assignment')}${field('extraCriterion', 'Additional review topic (optional)')}<p class="small muted">Qualification evidence reviews require all 26 definitions to be adopted first. A new round stores a fixed copy of its criteria and selected evidence.</p>${submit('Create review round')}</form></details></section>${assignments(p, c.id)}${decisions(p, c.id)}`;
}
export function compilationView(round) {
  const comp = compileRound(round);
  return `<section class="collab-section"><p class="record-label">INDIVIDUAL OBSERVATIONS · RELEASED FOR DISCUSSION</p><h2>Compiled committee review</h2><p>Counts describe submitted observations. Missing reviews do not imply agreement. These findings do not pass a gate or select a pastor.</p>${comp.materialConcern ? '<div class="error-banner"><strong>Material concern raised — committee review required</strong><p>At least one reviewer identified a material concern. It remains visible regardless of other responses.</p></div>' : ''}<h3>Observations by category</h3>${comp.distributions
    .map(
      (d) =>
        `<article class="collab-card"><h4>${e(d.criterion.label)}${d.criterion.hardGate ? ' · Gate-related evidence' : ''}</h4><ul>${
          d.counts
            .filter((x) => x.count)
            .map(
              (x) =>
                `<li>${x.count} reviewer${x.count === 1 ? '' : 's'}: ${e(FINDINGS[x.finding])}</li>`,
            )
            .join('') || '<li>No responses received.</li>'
        }</ul>${d.divergent ? '<p><strong>Divergent observations:</strong> reviewers recorded different response categories; inspect the evidence together.</p>' : ''}<details><summary>Read original observations</summary>${d.observations.map((o) => `<div class="individual-note"><strong>${e(o.reviewer)}</strong> · ${e(FINDINGS[o.finding])}${text(o.notes)}</div>`).join('')}</details></article>`,
    )
    .join(
      '',
    )}<h3>Concerns requiring discussion</h3>${comp.concerns.map((c) => `<article class="concern ${c.severity === 'material' ? 'material' : ''}"><strong>${e(c.category)} · ${e(c.severity)} · ${e(c.reviewer)}</strong>${text(c.text)}</article>`).join('') || '<p>No concerns recorded in the submitted reviews. This does not establish a gate decision.</p>'}<h3>Proposed interview questions</h3><p class="small muted">Only matching wording (ignoring case, punctuation and spacing) is grouped. Related wording is left for the committee to discuss.</p>${comp.questions.map((q) => `<article class="collab-card"><p><strong>${e(q.topic)}</strong> · ${q.reviewerCount} reviewer${q.reviewerCount === 1 ? '' : 's'}</p>${text(q.text)}<details><summary>Original wording and attribution</summary>${q.originals.map((o) => `<p><strong>${e(o.reviewer)}:</strong> ${e(o.text)}</p>`).join('')}</details></article>`).join('') || '<p>No questions proposed.</p>'}<h3>Underlying individual reviews</h3><p class="small muted">${IDENTITY_NOTICE}</p>${round.submissions.map((s) => `<details class="collab-details"><summary>${e(s.review.reviewer.name)} · ${e(s.review.submittedAt.slice(0, 10))}${s.previous.length ? ' · ' + s.previous.length + ' previous revision(s)' : ''}</summary><p>Last modified ${e(s.review.modifiedAt)} · Imported ${e(s.importedAt)}</p>${individualSubmission(s.review, round.snapshot.criteria)}${s.previous.length ? `<details><summary>Previous submissions retained</summary>${s.previous.map((old) => `<section><h4>${e(old.review.reviewer.name)} · Last modified ${e(old.review.modifiedAt)}</h4><p>Originally submitted ${e(old.review.submittedAt)}; imported ${e(old.importedAt)}.</p>${individualSubmission(old.review, round.snapshot.criteria)}</section>`).join('')}</details>` : ''}</details>`).join('')}</section>`;
}
export function roundView(p, roundId, pending = []) {
  const r = roundById(p, roundId),
    c = candidateById(p, r.candidateId),
    count = participation(r);
  const queued = pending.filter((q) => q.projectId === p.id && q.roundId === r.id);
  return `<a class="back-link" href="${base(p)}/candidate/${c.id}">← ${e(c.name)} meeting view</a><p class="eyebrow">${e(REVIEW_TYPES[r.reviewType]).toUpperCase()} · ${stateLabel[r.state].toUpperCase()}</p><h1>${e(r.title)}</h1><p class="lede">${e(c.name)} · ${count.expected ? `${count.received} of ${count.expected} expected reviews received` : `${count.total} reviews received; no expected count set`}</p>${count.additional && count.expected ? `<p>${count.additional} additional unassigned review(s), not included in the expected participation count.</p>` : ''}${count.missing.length ? `<p>Still expected: ${count.missing.map((m) => e(m.name)).join(', ')}. Non-submission is neither agreement nor disagreement.</p>` : ''}<p class="small muted">Review participation is not meeting attendance, voter eligibility or quorum. ${IDENTITY_NOTICE}</p>${staleRound(p, r) ? '<div class="error-banner">Church criteria or evidence changed since assignment. Reviewers’ original snapshots remain intact. Consider a new round; importing against this older snapshot requires confirmation.</div>' : ''}<div class="notice"><strong>Independent first impressions</strong><p>Packets contain no other reviews. This local interface holds the compilation until you close submissions and release it. This is a workflow safeguard; local files and browser storage are not access-controlled or encrypted.</p></div>${snapshotView(r)}<div class="actions">${r.state === 'open' ? button('round-close', 'Close submissions', `data-round="${r.id}"`) : ''}${r.state === 'closed' ? button('round-release', 'Release compilation for discussion', `data-round="${r.id}"`) : ''}${r.state !== 'open' ? button('round-reopen', 'Reopen submissions', `data-round="${r.id}"`) : ''}${button('packet-print', 'Download printable review worksheet', `data-round="${r.id}"`)}</div>${r.state === 'open' ? `<section class="collab-section"><h2>Assign and collect reviews</h2><form class="collab-form" data-collab-form="packet-export" data-round="${r.id}">${select('memberId', 'Packet recipient', r.expected.length ? Object.fromEntries(r.expected.map((m) => [m.id, m.name])) : { '': 'Unassigned reviewer' })}${submit('Download Review Packet')}</form><p>Send the file through your church’s chosen private channel. The recipient opens <strong>Individual reviews</strong> in the toolkit and imports it.</p><label class="file-label">Import Completed Reviews<input type="file" data-review-import="${r.id}" accept=".json,application/json" multiple></label><p class="small muted">Choose several files at once. Matching new submissions import together. Duplicates and changed criteria require your decision; mismatches are rejected.</p></section>` : '<p>Submissions are closed. Reopen explicitly to accept a late or revised review.</p>'}${queued.length ? `<section class="collab-section"><h2>Imports needing attention</h2>${queued.map((q) => `<article class="collab-card"><h3>${e(q.name)}</h3><p>${e(q.message)}</p>${q.error ? '' : button('import-resolve', q.duplicate ? 'Replace and preserve previous review' : 'Import using original criteria', `data-import="${q.id}"`)}${button('import-skip', 'Skip file', `data-import="${q.id}"`)}</article>`).join('')}</section>` : ''}${r.state === 'released' ? compilationView(r) : '<section class="collab-section"><h2>Compilation held for discussion</h2><p>Close submissions, then release the compilation when the committee is ready. Received reviews remain saved.</p></section>'}`;
}
export function reviewListView(works, errors = []) {
  return `<main id="main" class="standalone" tabindex="-1"><p class="eyebrow">INDIVIDUAL REVIEW</p><h1>Your independent reviews</h1><p class="lede">Open the small packet your chair gave you. Record your own observations, then return a completed review file.</p><div class="notice">${IDENTITY_NOTICE} Your work saves in this browser. Export it to return it to the chair; nothing is sent automatically.</div><label class="file-label">Open Review Packet<input type="file" id="review-packet-file" accept=".json,application/json"></label>${errors.map((id) => `<div class="error-banner">A saved review could not be read. Its original data has been preserved. ${button('recover-review', 'Download recovery file', `data-work="${e(id)}"`)}</div>`).join('')}<section class="collab-section"><h2>Saved on this device</h2>${works.map((w) => `<article class="collab-card"><h3><a href="#review/${w.id}">${e(w.packet.title)} · ${e(w.packet.candidate.name)}</a></h3><p>${e(w.reviewer.name || 'Reviewer not named')} · ${w.submittedAt ? 'Exported; editable revision' : 'Draft'} · Updated ${e(w.modifiedAt.slice(0, 10))}</p><div class="actions"><a class="button" href="#review/${w.id}">Continue review</a>${button('review-remove', 'Remove local review', `data-work="${w.id}"`)}</div></article>`).join('') || '<p>No review packets opened yet.</p>'}</section><a class="button" href="#projects">Chair: open a search project</a></main>`;
}
export function individualReviewView(w) {
  const p = w.packet;
  return `<main id="main" class="standalone review-workspace" tabindex="-1"><a class="back-link" href="#reviews">← Your reviews</a><p class="eyebrow">INDIVIDUAL OBSERVATION · ${e(REVIEW_TYPES[p.reviewType]).toUpperCase()}</p><h1>${e(p.title)}</h1><p class="lede">${e(p.candidate.name)}${p.churchName ? ' · ' + e(p.churchName) : ''}</p><p>${IDENTITY_NOTICE} A review cannot change the committee’s shared facts or decisions.</p><div id="review-save-state" role="status"></div><div class="actions">${button('review-export', 'Download Completed Review', `data-work="${w.id}"`)}${button('review-print', 'Download printable worksheet', `data-work="${w.id}"`)}</div>${snapshotView(p)}<div class="collab-form"><div class="two-column"><label>Your display name<input data-review-person="name" maxlength="300" value="${e(w.reviewer.name)}" required></label><label>Initials (optional)<input data-review-person="initials" maxlength="20" value="${e(w.reviewer.initials)}"></label></div>${p.snapshot.criteria.map((c) => `<section class="review-criterion"><h2>${e(c.label)}</h2><p>${e(c.prompt)}</p>${c.hardGate ? '<p class="small muted">Gate-related evidence: a material concern requires committee discussion, even if other reviewers see no issue.</p>' : ''}<label>Observation category<select data-review-response="${e(c.id)}" data-review-part="finding">${options(FINDINGS, w.responses[c.id].finding)}</select></label><label>Evidence, observations and questions<textarea rows="4" maxlength="12000" data-review-response="${e(c.id)}" data-review-part="notes">${e(w.responses[c.id].notes)}</textarea></label></section>`).join('')}<label>Overall observations<textarea rows="4" maxlength="12000" data-review-value="observations">${e(w.observations)}</textarea></label><label>Additional concerns (one per line)<textarea rows="4" maxlength="12000" data-review-value="concerns">${e(w.concerns)}</textarea></label><label>Additional concern category<select data-review-value="concernSeverity">${options({ clarification: 'Clarification needed', concern: 'Concern to discuss', material: 'Material concern - committee review required' }, w.concernSeverity)}</select></label><label>Question topic<input maxlength="300" data-review-value="questionTopic" value="${e(w.questionTopic)}"></label><label>Proposed interview questions (one per line)<textarea rows="4" maxlength="12000" data-review-value="proposedQuestions">${e(w.proposedQuestions)}</textarea></label></div><p class="small muted">A response left “not reviewed” remains missing evidence. Your export may include unresolved questions. It does not attest that the committee has cleared a gate.</p>${button('review-export', 'Download Completed Review', `data-work="${w.id}"`)}<p>Return the downloaded JSON file through the channel your chair specified. If you revise it, export again; the review ID and original submission date are preserved.</p></main>`;
}
