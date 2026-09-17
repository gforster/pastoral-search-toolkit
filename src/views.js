import { churchQuestions } from './artifacts/templates/additional.js';
import { SCORE_NOTICE } from './content/guidance/principles.js';
import { QUALIFICATION_PROMPTS, reviewSummaryView } from './review-feedback.js';
import {
  AUTHORITY_NOTICE,
  MODULES,
  FIELDS,
  FIELD_MAP,
  MILESTONES,
  PATHS,
  TRANSITION_GUIDANCE,
  QUALIFICATIONS,
  QUESTIONS,
  CONVICTION_EXAMPLES,
  REQUIREMENT_CATEGORIES,
} from './data.js';
import {
  escapeHtml as e,
  answerValue,
  readiness,
  tasksFor,
  moduleState,
  applicable,
  resolved,
  qualificationCount,
} from './domain.js';
import { makeDocument, documentHtml, availableDocuments } from './documents.js';
export const base = (p) => `#project/${p.id}`;
export const stateLabels = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  READY: 'Reviewed',
  NEEDS_REVIEW: 'Needs review',
  BLOCKED: 'Decision needed',
};
export const badge = (state) =>
  `<span class="badge ${state.toLowerCase()}">${stateLabels[state] || e(state)}</span>`;
const date = (d) =>
  new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const linkModule = (p, id, label) =>
  `<a href="${base(p)}/module/${id}">${e(label || MODULES.find((m) => m.id === id).short)} →</a>`;
export function homeView(projects) {
  return `<main id="main" class="home" tabindex="-1"><div class="home-intro"><div><p class="eyebrow">FOR SMALL CHURCHES · FREE & OPEN SOURCE</p><h1>Your next faithful step<br>starts here.</h1><p class="lede">Your pastor is leaving. You do not have to invent the process from scratch.</p><p class="intro-copy">A practical workbook to help your church find its footing, organize a search, and move forward with care and clarity.</p>${projects.length ? `<a class="button primary" href="${base(projects[0])}/dashboard">Continue ${e(projects[0].name)} →</a>` : ''}</div><aside class="reassurance"><span class="section-number">A STEADY PATH FORWARD</span><h2>You don’t need all<br>the answers today.</h2><p>Start where you are. Work on one part at a time. “We don’t know yet” is a useful place to begin.</p><div class="privacy-note"><span aria-hidden="true">◈</span> Your work stays on this device.<br>No account. No subscription.</div></aside></div><section class="entry-section" aria-labelledby="entry-title"><div class="section-heading"><h2 id="entry-title">Where is your church today?</h2><span>Choose a starting point. You can change it later.</span></div><div class="entry-grid">${PATHS.map(([id, title, desc], i) => `<a class="entry-card" href="#new/${id}"><span class="card-number">0${i + 1}</span><h3>${title}</h3><p>${desc}</p><span class="card-arrow" aria-hidden="true">↗</span></a>`).join('')}</div></section><section class="sample-invitation"><h2>See how a search takes shape.</h2><p>Explore a labeled example before entering your church’s information. Nothing from the example is adopted for your church.</p><button class="button" data-example>Explore a Sample Search →</button></section><div class="home-footer"><p>Scripture before preference. Character before charisma. Evidence before impressions.</p><a href="#projects">Have a saved project? Open it →</a></div></main>`;
}
export function projectsView(projects, errors = []) {
  return `<main id="main" class="standalone" tabindex="-1"><p class="eyebrow">YOUR WORKBOOKS</p><div class="page-heading"><div><h1>Projects on this device</h1><p class="muted">Your work is saved in this browser. Export a backup to move it or share it with an authorized person.</p></div><a class="button primary" href="#home">Start a project</a></div><div class="notice"><strong>Keep a backup.</strong> Clearing browser data can remove your work. Projects and exports are not encrypted; use a trusted device and avoid private candidate records.</div>${errors.length ? `<div class="error-banner" role="alert">${errors.length} saved project(s) could not be read. They have been preserved. Download the raw data before seeking recovery help.${errors.map((id) => `<button class="button" data-recover="${e(id)}">Download recovery file</button>`).join('')}</div>` : ''}<div class="project-list">${projects.length ? projects.map((p) => `<article class="project-row"><div><h2><a href="${base(p)}/dashboard">${e(p.name)}</a></h2><p>${e(MILESTONES.find((m) => m.id === p.milestone).title)} · Updated ${date(p.updatedAt)}</p></div><div class="actions"><a class="button" href="${base(p)}/dashboard">Open project</a><button class="button" data-duplicate="${e(p.id)}">Duplicate</button><button class="text-button danger" data-delete="${e(p.id)}">Delete</button><details class="rename-project"><summary>Rename project</summary><label for="project-name-${e(p.id)}">Project name</label><input id="project-name-${e(p.id)}" maxlength="1000" value="${e(p.name)}"><button class="button" data-rename="${e(p.id)}">Save name</button></details></div></article>`).join('') : `<div class="empty-state"><h2>A place for your church’s next steps.</h2><p>Start from where you are today, or import a backup you previously saved.</p></div>`}</div><section class="import-panel"><h2>Committee member?</h2><p>Open the review packet supplied by your chair and return your own observations.</p><a class="button" href="#reviews">Individual reviews</a><h2>Open a project backup</h2><p>Choose a toolkit JSON file. Import creates a separate copy and keeps your existing projects.</p><label class="button" for="import-file">Choose backup file</label><input class="file-input" type="file" id="import-file" accept=".json,application/json"><p class="small muted">Maximum 10 MB. Only open backups from people you trust.</p></section></main>`;
}
export function fieldView(p, f, compact = false) {
  const a = p.answers[f.id] || { status: 'unknown', value: '' };
  const status =
    a.status === 'not_applicable'
      ? 'Not applicable'
      : resolved(p, f)
        ? 'Recorded'
        : a.status === 'known' && a.value
          ? 'Needs confirmation'
          : 'Not known yet';
  const inputId = `field-${f.id}`;
  const attrs = `id="${inputId}" data-field="${f.id}" aria-describedby="help-${f.id}${!compact ? ` review-message-${f.id}` : ''}" ${!compact && f.due !== null ? 'aria-required="true"' : ''}`;
  const max = f.id === 'doctrineText' ? 100000 : f.id === 'churchName' ? 1000 : 20000;
  const input =
    f.type === 'select'
      ? `<select ${attrs}><option value="">We don’t know yet</option>${f.options.map(([v, t]) => `<option value="${e(v)}" ${a.status === 'known' && a.value === v ? 'selected' : ''}>${e(t)}</option>`).join('')}</select>`
      : f.type === 'text' || f.type === 'date'
        ? `<input ${attrs} type="${f.type}" maxlength="${max}" value="${e(a.status === 'known' ? a.value : '')}" autocomplete="off">`
        : `<textarea ${attrs} maxlength="${max}" rows="${compact ? 3 : f.id === 'doctrineText' ? 10 : 4}" ${a.status === 'not_applicable' ? 'disabled' : ''}>${e(a.status === 'known' ? a.value : '')}</textarea>`;
  const basis =
    f.module === 'qualifications'
      ? 'Scripture framework'
      : f.module === 'governance'
        ? 'Your governing documents — confirm manually'
        : f.priority === 'OPTIONAL' || ['assessment', 'sermons'].includes(f.module)
          ? 'Optional practice'
          : f.due === null
            ? 'Recommended practice'
            : 'Toolkit readiness checkpoint — record your church’s decision';
  const suggestion = p.presetSuggestions?.answers[f.id];
  return `<div class="field-card ${compact ? 'compact' : ''}" id="item-${f.id}"><div class="field-heading"><label for="${inputId}">${e(f.label)}</label>${!compact && f.due !== null ? `<span class="due-tag"><strong>Required for module review</strong><br>Before ${e(MILESTONES[f.due].short.toLowerCase())}</span>` : ''}</div><p class="field-help" id="help-${f.id}">${e(f.help)}</p>${!compact ? `<p class="small muted">Why this appears: ${e(basis)}</p>` : ''}${suggestion ? `<aside class="notice"><strong>Suggested starting value — review and adopt locally.</strong><p>${e(f.options?.find(([v]) => v === suggestion.value)?.[1] || suggestion.value)}</p><button class="button" data-adopt-suggestion="${f.id}">Use this starting value</button></aside>` : ''}${!compact ? `<div class="field-review-message" id="review-message-${f.id}" hidden></div>` : ''}${input}<div class="field-footer"><span class="field-status" data-status-for="${f.id}">${status}</span>${f.type !== 'select' ? `<div class="actions"><button class="text-button" type="button" data-unknown="${f.id}">We don’t know yet</button>${f.allowNA ? `<button class="text-button" type="button" data-na="${f.id}">${a.status === 'not_applicable' ? 'Add an answer' : 'Not applicable / not offered'}</button>` : ''}</div>` : ''}</div></div>`;
}
export function orientationView(p, step) {
  const stepTitles = [
    'What has happened?',
    'Tell us a little about your church.',
    'What documents do you have?',
  ];
  const ids =
    step === 0
      ? [
          'event',
          'vacant',
          'finalDate',
          'interim',
          'associate',
          'departingServing',
          'servicesCovered',
        ]
      : ['churchName', 'location', 'attendance', 'membership', 'identity', 'staff'];
  const inventories = [
    ['constitution', 'Constitution'],
    ['bylaws', 'Bylaws'],
    ['doctrine', 'Adopted doctrinal statement'],
    ['job', 'Pastoral job description'],
    ['search', 'Pastoral-search provisions'],
    ['policies', 'Relevant church policies'],
  ];
  return `<main id="main" class="orientation standalone narrow" tabindex="-1"><a class="back-link" href="#home">← Starting points</a><p class="eyebrow">A LITTLE CONTEXT · STEP ${step + 1} OF 3</p><h1>${stepTitles[step]}</h1><p class="lede">${step === 2 ? 'You can check later. Missing information becomes a next step.' : 'Answer what you can. Every answer can be changed later.'}</p><ol class="step-list" aria-label="Orientation steps">${['Transition', 'Church', 'Documents'].map((t, i) => `<li ${i === step ? 'aria-current="step"' : ''}><span>${i + 1}</span>${t}</li>`).join('')}</ol>${step === 0 && answerValue(p, 'event') ? `<div class="notice">${e(TRANSITION_GUIDANCE[answerValue(p, 'event')])}</div>` : ''}${
    step < 2
      ? ids.map((id) => fieldView(p, FIELD_MAP[id], true)).join('')
      : `<div class="inventory">${inventories
          .map(
            ([id, title]) =>
              `<div class="inventory-row"><label for="inventory-${id}">${title}</label><select id="inventory-${id}" data-inventory="${id}">${[
                ['unknown', 'We need to check'],
                ['yes', 'Yes, we have it'],
                ['no', 'No / not available'],
              ]
                .map(
                  ([v, t]) =>
                    `<option value="${v}" ${p.inventory[id] === v ? 'selected' : ''}>${t}</option>`,
                )
                .join('')}</select></div>`,
          )
          .join(
            '',
          )}</div><div class="notice">You can organize the work while documents are being located. Confirm the actual authority before forming the committee or making a call.</div>`
  }<div class="orientation-actions"><button class="button" data-orientation="${step === 0 ? 'cancel' : 'back'}">${step === 0 ? 'Cancel' : 'Back'}</button><button class="button primary" data-orientation="${step === 2 ? 'finish' : 'next'}">${step === 2 ? 'Create our project' : 'Continue'} →</button></div><p class="small muted">No account needed. Once created, this project saves on this device. Export backups regularly.</p></main>`;
}
export function sidebar(p, route, moduleId) {
  return `<aside class="sidebar" id="project-navigation"><a class="project-name" href="${base(p)}/dashboard">${e(p.name)}</a><nav aria-label="Project navigation"><a class="nav-primary ${route === 'dashboard' ? 'active' : ''}" href="${base(p)}/dashboard" ${route === 'dashboard' ? 'aria-current="page"' : ''}>Overview & next steps</a><a class="nav-primary ${route === 'committee-work' ? 'active' : ''}" href="${base(p)}/committee-work">Committee work & candidates</a><a class="nav-primary ${route === 'tasks' ? 'active' : ''}" href="${base(p)}/tasks">Open decisions</a><a class="nav-primary ${route === 'documents' ? 'active' : ''}" href="${base(p)}/documents">Documents & handouts</a>${[
    ...new Set(MODULES.map((m) => m.group)),
  ]
    .map(
      (group) =>
        `<p class="nav-group">${group}</p>${MODULES.filter((m) => m.group === group)
          .map(
            (m) =>
              `<a href="${base(p)}/module/${m.id}" class="module-nav ${moduleId === m.id ? 'active' : ''}" ${moduleId === m.id ? 'aria-current="page"' : ''}><span class="nav-index">${String(MODULES.indexOf(m) + 1).padStart(2, '0')}</span><span>${m.short}</span>${moduleState(p, m.id) === 'READY' ? '<span class="nav-check" aria-label="Reviewed">✓</span>' : ''}</a>`,
          )
          .join('')}`,
    )
    .join(
      '',
    )}</nav><div class="sidebar-bottom"><a href="#projects">All projects</a><button class="text-button" data-export>Download Project Backup</button><span class="small muted">Saved only on this device</span></div></aside>`;
}
const taskLink = (p, t) =>
  `<li><a href="${base(p)}/module/${t.module}?field=${encodeURIComponent(t.id)}">${e(t.label)}</a>${t.due !== null && t.classification === 'REQUIRED_LATER' ? `<span>Before ${e(MILESTONES[t.due].short.toLowerCase())}</span>` : ''}</li>`;
export function dashboardView(p) {
  const stage = MILESTONES.find((m) => m.id === p.milestone),
    r = readiness(p),
    ts = tasksFor(p);
  const nowTasks = ts.filter((t) => t.classification === 'BLOCKER_NOW'),
    later = ts.filter((t) => t.classification === 'REQUIRED_LATER');
  const suggested =
    p.milestone === 'stabilize'
      ? ['transition', 'governance', 'profile']
      : p.milestone === 'committee'
        ? ['governance', 'committee', 'doctrine']
        : p.milestone === 'search'
          ? ['doctrine', 'qualifications', 'process']
          : p.milestone === 'advancement'
            ? ['interviews', 'safety', 'compensation']
            : p.milestone === 'handoff'
              ? ['handoff', 'communication', 'call']
              : ['call', 'governance', 'compensation'];
  return `<p class="eyebrow">YOUR CHURCH’S WORKBOOK</p><div class="page-heading"><div><h1>One faithful step at a time.</h1><p class="muted">Work where you can. Keep the next decision in view.</p><p>${e(answerValue(p, 'event')?.replaceAll('_', ' ') || 'Transition circumstances to be confirmed')} · ${answerValue(p, 'vacant') === 'yes' ? 'Pulpit currently vacant' : answerValue(p, 'finalDate') ? 'Known final date: ' + e(answerValue(p, 'finalDate')) : 'Timing to be confirmed'}</p></div><a class="button" href="${base(p)}/documents">Prepare a document</a></div><div class="actions overview-tools"><button class="button" data-next-help>What should we work on next?</button><button class="text-button" data-export>Download Project Backup</button></div><section class="focus-panel"><div><label class="eyebrow" for="milestone">OUR CURRENT FOCUS</label><select id="milestone" data-milestone>${MILESTONES.map((m) => `<option value="${m.id}" ${p.milestone === m.id ? 'selected' : ''}>${m.title}</option>`).join('')}</select><p>${stage.description}</p></div><div class="readiness-summary"><strong>${r.ready ? 'Ready for human review' : `${r.total} open decision${r.total === 1 ? '' : 's'}`}</strong><span>${r.ready ? 'Recorded prerequisites are in place. Verify them with the proper authority.' : 'To resolve before this milestone. Other work can continue.'}</span></div></section>${answerValue(p, 'event') ? `<p class="transition-guidance">${e(TRANSITION_GUIDANCE[answerValue(p, 'event')])}</p>` : ''}<div class="next-grid"><section class="next-panel"><p class="eyebrow">01 · MAKE A START</p><h2>What can we do now?</h2><p>These parts of the workbook are open whenever you need them.</p><ul>${suggested.map((id) => `<li>${linkModule(p, id)}</li>`).join('')}</ul></section><section class="next-panel urgent"><p class="eyebrow">02 · BEFORE THIS MILESTONE</p><h2>What must we resolve?</h2>${
    nowTasks.length
      ? `<ul>${nowTasks
          .slice(0, 3)
          .map((t) => taskLink(p, t))
          .join(
            '',
          )}</ul><a class="small" href="${base(p)}/tasks/BLOCKER_NOW">View ${nowTasks.length} open decisions →</a>`
      : `<p>All recorded prerequisites are in place. Review the actual documents with the church’s authorized leaders before acting.</p>`
  }</section><section class="next-panel"><p class="eyebrow">03 · KEEP IN VIEW</p><h2>What can safely wait?</h2>${
    later.length
      ? `<ul>${later
          .slice(0, 3)
          .map((t) => taskLink(p, t))
          .join(
            '',
          )}</ul><a class="small" href="${base(p)}/tasks/REQUIRED_LATER">View later requirements →</a>`
      : '<p>No later required items remain in this workbook. Check your church’s additional requirements.</p>'
  }</section></div><section class="workbook-section"><div class="section-heading"><h2>Your workbook</h2><span>15 core modules + 4 optional tools · no mandatory sequence</span></div><div class="module-grid">${MODULES.map((m, i) => `<a class="module-card" href="${base(p)}/module/${m.id}"><div><span class="card-number">${String(i + 1).padStart(2, '0')}</span>${badge(moduleState(p, m.id))}</div><h3>${m.short}</h3><p>${m.intro}</p><span class="small">${FIELDS.filter((f) => f.module === m.id && applicable(p, f) && !resolved(p, f)).length} unresolved items${m.optional ? ' · Optional / when relevant' : ''}</span></a>`).join('')}</div></section><section class="workbook-section"><h2>Useful documents now</h2><p>Drafts are available at every stage, with missing information clearly marked.</p><div class="actions"><a class="button" href="${base(p)}/documents/start">Customized START HERE</a><a class="button" href="${base(p)}/documents">Browse ${availableDocuments(p).length} available documents</a><button class="button" data-zip>Download Full Search Packet (ZIP)</button></div></section><details class="preset-panel"><summary>Optional suggested starting values</summary><p>Independent Baptist Congregational Starter: assumes a congregational final call and a search committee. Suggested values do not replace existing answers or your governing documents.</p><button class="button" data-preset>Load suggestions for individual review</button>${
    p.presetSuggestions
      ? `<ul>${Object.keys(p.presetSuggestions.answers)
          .map(
            (id) =>
              `<li><a href="${base(p)}/module/${FIELD_MAP[id].module}?field=${id}">Review ${e(FIELD_MAP[id].label)}</a></li>`,
          )
          .join('')}</ul>`
      : ''
  }</details><section class="workbook-section"><h2>The path ahead</h2><p class="muted">These are separate readiness checks. You can look ahead without claiming earlier work is done.</p><ol class="milestone-list">${MILESTONES.map(
    (m, i) => {
      const rr = readiness(p, m.id);
      return `<li ${p.milestone === m.id ? 'aria-current="step"' : ''}><button data-stage="${m.id}"><span class="milestone-number">${i + 1}</span><span><strong>${m.title}</strong><small>${rr.ready ? 'Recorded prerequisites in place' : `${rr.total} open decisions`}</small></span><span aria-hidden="true">→</span></button></li>`;
    },
  ).join('')}</ol></section><p class="authority-footnote">${AUTHORITY_NOTICE}</p>`;
}
function qualificationsView(p) {
  return `<section class="worksheet"><div class="section-heading"><h2>26 working definitions</h2><span data-qualification-count>${qualificationCount(p)} recorded with all four prompts</span></div><p>Read 1 Timothy 3 and Titus 1 together. Discuss difficult interpretations before names enter the conversation. For a prompt with no further issue, record that conclusion explicitly.</p>${QUALIFICATIONS.map(
    (q, i) =>
      `<details class="qualification" data-qualification-card="${q.id}"><summary><span class="qual-number">${String(i + 1).padStart(2, '0')}</span><span>${e(q.title)}<small>${q.reference}</small></span><span class="qual-mark">${['meaning', 'evidence', 'disqualifying', 'questions'].every((k) => p.qualifications[q.id]?.[k]?.trim()) ? 'Recorded' : 'Open'}</span></summary><div class="qualification-body"><p class="notice">${e(q.prompt)}</p>${QUALIFICATION_PROMPTS.map(
        ([k, label]) =>
          `<div class="qualification-prompt"><label for="${q.id}-${k}">${label} <span class="small">(required for module review)</span></label><p class="field-review-message" id="review-message-${q.id}-${k}" hidden><strong>Required prompt unanswered.</strong> Record the committee’s working definition or conclusion here.</p><textarea id="${q.id}-${k}" data-qualification="${q.id}" data-part="${k}" rows="3" maxlength="20000" aria-required="true" aria-describedby="review-message-${q.id}-${k}">${e(p.qualifications[q.id]?.[k] || '')}</textarea></div>`,
      ).join('')}</div></details>`,
  ).join('')}</section>`;
}
function requirementsView(p) {
  return `<section class="worksheet"><h2>Keep each kind of standard in its place.</h2><div class="category-explainer"><p><strong>Biblical qualifications</strong> belong in the Scripture worksheet. <strong>Adopted doctrine</strong> belongs with the church’s existing doctrinal statement. <strong>Governance</strong> belongs with the governing documents.</p><p>Use the cards below for <strong>church convictions</strong>, <strong>ministry fit</strong>, and <strong>personal preferences</strong>. Adding an example does not adopt it.</p></div><details class="examples"><summary>Topics your church may want to discuss</summary><p>${CONVICTION_EXAMPLES.map(e).join(' · ')}</p></details>${p.requirements.map((r) => `<article class="requirement-card"><div class="two-column"><div><label for="category-${e(r.id)}">Category</label><select id="category-${e(r.id)}" data-requirement="${e(r.id)}" data-part="category">${REQUIREMENT_CATEGORIES.map(([v, t]) => `<option value="${v}" ${r.category === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div><label for="adopt-${e(r.id)}">Church ownership</label><select id="adopt-${e(r.id)}" data-requirement="${e(r.id)}" data-part="status"><option value="draft" ${r.status === 'draft' ? 'selected' : ''}>Draft for discussion</option><option value="adopted" ${r.status === 'adopted' ? 'selected' : ''}>Recorded by the church</option></select></div></div><label for="statement-${e(r.id)}">What are we stating?</label><textarea id="statement-${e(r.id)}" rows="3" maxlength="20000" data-requirement="${e(r.id)}" data-part="statement">${e(r.statement)}</textarea><label for="evidence-${e(r.id)}">Reason, evidence, and adoption record</label><textarea id="evidence-${e(r.id)}" rows="3" maxlength="20000" data-requirement="${e(r.id)}" data-part="evidence">${e(r.evidence)}</textarea><button class="text-button danger" data-remove-requirement="${e(r.id)}">Remove this item</button></article>`).join('')}<button class="button" data-add-requirement>+ Add a conviction, fit consideration, or preference</button></section>`;
}
function questionsView(p) {
  const card = (q) =>
    `<label class="question-card"><input type="checkbox" data-question="${q.id}" ${p.questions.includes(q.id) ? 'checked' : ''}><span><strong>${e(q.title)}</strong><small>${e(q.category)}</small><span>${e(q.question)}</span></span></label>`;
  return `<section class="worksheet"><div class="section-heading"><h2>Build an interview guide</h2><a href="${base(p)}/documents/interviews">Preview selected questions →</a></div><p>Choose a manageable core for every serious candidate, then use questions that fit your adopted process. The full bank is a menu, not one mandatory interview.</p><p class="notice">${SCORE_NOTICE}</p>${[
    ['core', 'Core questions'],
    ['followup', 'Follow-up question bank'],
    ['scenario', 'Scenario questions'],
  ]
    .map(
      ([kind, title]) =>
        `<details class="question-group" ${kind === 'core' ? 'open' : ''}><summary>${title} (${QUESTIONS.filter((q) => q.kind === kind).length})</summary><div class="question-list">${QUESTIONS.filter(
          (q) => q.kind === kind,
        )
          .map(card)
          .join('')}</div></details>`,
    )
    .join(
      '',
    )}<h3>Church-specific questions</h3><p>Questions below come from convictions you have marked as church-owned. They are included in your guide automatically.</p>${
    churchQuestions(p).length
      ? churchQuestions(p)
          .map((q) => `<p class="notice">${e(q.question)}</p>`)
          .join('')
      : `<p>No adopted convictions recorded. <a href="${base(p)}/module/convictions">Review convictions and fit</a>.</p>`
  }<h3>Your additional prompts</h3>${p.customQuestions
    .map(
      (q) =>
        `<div class="custom-question"><label for="kind-${e(q.id)}">Question type</label><select id="kind-${e(q.id)}" data-custom-question="${e(q.id)}" data-part="kind">${[
          ['core', 'Core'],
          ['church', 'Church-specific'],
          ['followup', 'Follow-up'],
          ['scenario', 'Scenario'],
        ]
          .map(
            ([v, label]) =>
              `<option value="${v}" ${q.kind === v ? 'selected' : ''}>${label}</option>`,
          )
          .join(
            '',
          )}</select><label for="title-${e(q.id)}">Topic</label><input id="title-${e(q.id)}" maxlength="200" data-custom-question="${e(q.id)}" data-part="title" value="${e(q.title)}"><label for="question-${e(q.id)}">Question</label><textarea id="question-${e(q.id)}" rows="3" maxlength="20000" data-custom-question="${e(q.id)}" data-part="question">${e(q.question)}</textarea><button class="text-button danger" data-remove-question="${e(q.id)}">Remove question</button></div>`,
    )
    .join('')}<button class="button" data-add-question>Add a custom question</button></section>`;
}
export function customTasksView(p) {
  return `<section class="worksheet"><h2>Additional church prerequisites</h2><p>Use these for requirements in your constitution or adopted process that this workbook has not already listed. They count toward milestone readiness.</p>${p.tasks
    .filter((t) => t.prerequisite !== false)
    .map(
      (t) =>
        `<div class="custom-task"><label class="check-label"><input type="checkbox" data-resolve-task="${e(t.id)}" ${t.resolved ? 'checked' : ''}><span><strong>${e(t.label)}</strong><small>Before ${MILESTONES[t.due].short.toLowerCase()} · ${e(t.owner || 'No owner assigned')}</small></span></label><button class="text-button danger" data-remove-task="${e(t.id)}" aria-label="Remove prerequisite: ${e(t.label)}">Remove</button></div>`,
    )
    .join(
      '',
    )}<form id="add-task-form" class="task-form"><label for="task-label">Requirement or decision</label><input id="task-label" name="label" required maxlength="1000" placeholder="For example: confirm the required candidate visit length"><div class="two-column"><div><label for="task-due">Required before</label><select id="task-due" name="due">${MILESTONES.map((m, i) => `<option value="${i}" ${i === 4 ? 'selected' : ''}>${m.title}</option>`).join('')}</select></div><div><label for="task-owner">Person or role responsible</label><input id="task-owner" name="owner" maxlength="500" placeholder="Optional"></div></div><button class="button" type="submit">Add prerequisite</button></form></section>`;
}
export function moduleView(p, id) {
  const m = MODULES.find((m) => m.id === id);
  if (!m) return '<h1>Module not found</h1>';
  const index = MODULES.indexOf(m),
    state = moduleState(p, id);
  const moduleFields = FIELDS.filter((f) => f.module === id && applicable(p, f));
  const knownDocs = Object.entries(p.inventory).filter(([, v]) => v !== 'yes');
  const related = availableDocuments(p).filter(
    (d) =>
      d.module === id ||
      d.id === id ||
      (id === 'committee' && ['covenant', 'roles', 'authority', 'intake'].includes(d.id)) ||
      (id === 'governance' && d.id === 'authority') ||
      (id === 'interviews' && ['screening', 'evaluation'].includes(d.id)) ||
      (id === 'process' && ['candidate', 'packet', 'intake'].includes(d.id)) ||
      (id === 'communication' && d.id === 'congregation') ||
      (id === 'transition' && d.id === 'preparation'),
  );
  return `<a class="back-link" href="${base(p)}/dashboard">← Workbook overview</a><div class="module-header"><p class="eyebrow">MODULE ${String(index + 1).padStart(2, '0')} · ${m.group.toUpperCase()}</p>${badge(state)}</div><h1>${m.title}</h1><p class="lede">${m.intro}</p><div class="principle">${m.principle}</div>${state === 'NEEDS_REVIEW' ? '<div class="notice">This module or related information changed after review. Check the answers and any approvals before relying on them.</div>' : ''}${id === 'transition' && answerValue(p, 'event') ? `<div class="notice">${e(TRANSITION_GUIDANCE[answerValue(p, 'event')])}</div>` : ''}${id === 'governance' && knownDocs.length ? `<div class="notice"><strong>From your starting checklist:</strong> ${knownDocs.map(([k]) => ({ constitution: 'constitution', bylaws: 'bylaws', doctrine: 'doctrinal statement', job: 'job description', search: 'search provisions', policies: 'relevant policies' })[k]).join(', ')} still need to be located or checked. Record what governs your church below.</div>` : ''}<div class="module-tools"><span class="small muted">Answers save as you work. Unknown is a valid answer.</span>${related.length ? `<details class="document-links"><summary>Related documents (${related.length})</summary>${related.map((d) => `<a href="${base(p)}/documents/${d.id}">${d.title}</a>`).join('')}</details>` : ''}</div><p id="module-review-announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>${moduleFields.length ? reviewSummaryView(p, id, 'top') : ''}${id === 'qualifications' ? qualificationsView(p) : ''}${id === 'convictions' ? requirementsView(p) : ''}${m.optional && !moduleFields.length ? `<div class="notice">This tool is available when relevant. ${id === 'interim' ? linkModule(p, 'transition', 'Record an interim arrangement') : id === 'bivocational' ? linkModule(p, 'position', 'Select a bivocational arrangement') : linkModule(p, 'interviews', 'Enable sermon review')}</div>` : ''}<div class="fields">${moduleFields.map((f) => fieldView(p, f)).join('')}</div>${id === 'interviews' ? questionsView(p) : ''}${id === 'call' ? customTasksView(p) : ''}${moduleFields.length ? reviewSummaryView(p, id, 'bottom') : ''}<div class="module-end"><div><h2>Take a moment to review.</h2><p>Check required answers against your actual documents and decisions. You can leave this module in progress and return anytime.</p></div><button class="button primary" data-review="${id}" ${!moduleFields.length ? 'disabled' : ''}>Mark module reviewed</button></div><div class="module-pagination">${index > 0 ? `<a href="${base(p)}/module/${MODULES[index - 1].id}">← ${MODULES[index - 1].short}</a>` : '<span></span>'}${index < MODULES.length - 1 ? `<a href="${base(p)}/module/${MODULES[index + 1].id}">${MODULES[index + 1].short} →</a>` : `<a href="${base(p)}/dashboard">Back to overview →</a>`}</div><p class="authority-footnote">${AUTHORITY_NOTICE}</p>`;
}
export function tasksView(p, filter = 'ALL') {
  const options = [
    ['ALL', 'All open items'],
    ['BLOCKER_NOW', 'Before this milestone'],
    ['REQUIRED_LATER', 'Required later'],
    ['RECOMMENDED', 'Recommended'],
    ['OPTIONAL', 'Optional'],
  ];
  const all = tasksFor(p),
    visible = filter === 'ALL' ? all : all.filter((t) => t.classification === filter);
  return `<p class="eyebrow">TURN UNCERTAINTY INTO A NEXT STEP</p><h1>Open decisions</h1><p class="lede">Your current focus is <strong>${e(MILESTONES.find((m) => m.id === p.milestone).short.toLowerCase())}</strong>. A later requirement does not need to hold up today’s preparation.</p><nav class="filter-bar" aria-label="Filter open decisions">${options.map(([v, t]) => `<a href="${base(p)}/tasks/${v}" class="${filter === v ? 'selected' : ''}" ${filter === v ? 'aria-current="page"' : ''}>${t} <span>${v === 'ALL' ? all.length : all.filter((t) => t.classification === v).length}</span></a>`).join('')}</nav><div class="task-list">${visible.length ? visible.map((t) => `<article class="task-row"><div><span class="task-class ${t.classification.toLowerCase()}">${options.find(([k]) => k === t.classification)?.[1]}</span><h2>${e(t.label)}</h2><p>${e(t.help || `Responsible: ${t.owner || 'not assigned'}`)}</p>${t.due !== null ? `<span class="small muted">Required before: ${MILESTONES[t.due].title}</span>` : ''}</div>${t.custom ? `<label class="check-label"><input type="checkbox" data-resolve-task="${e(t.id)}">Resolved</label>` : `<a class="button" href="${base(p)}/module/${t.module}?field=${t.id}">Resolve in workbook →</a>`}</article>`).join('') : '<div class="empty-state"><h2>No open items in this view.</h2><p>Check the other categories and any additional church requirements.</p></div>'}</div>${customTasksView(p)}`;
}
export function documentsView(p, id) {
  const docs = availableDocuments(p);
  if (id) {
    const d = docs.find((d) => d.id === id);
    if (!d)
      return '<h1>This document is not currently included</h1><p>Enable the relevant optional tool in your workbook, or return to the document list.</p>';
    const doc = makeDocument(p, id);
    return `<div class="document-toolbar"><a href="${base(p)}/documents">← All documents</a><div class="actions"><button class="button" data-markdown="${id}">Download Markdown</button><button class="button" data-html="${id}">Download printable HTML</button><button class="button primary" data-print>Print / save as PDF</button></div></div><div class="notice no-print">${d.audience === 'Internal' ? 'Internal committee material. Store completed candidate worksheets securely outside this toolkit.' : 'Review every section before sharing. Only selected fields for this audience appear, but you are responsible for what you entered.'} Browser print lets you save a PDF.</div><details class="artifact-review no-print"><summary>Document status: ${e(doc.status)}</summary><p>Readiness is not church approval. Resolve missing required inputs, review the whole document, and record the proper authority’s actual approval.</p>${doc.approval ? `<p><strong>Approval record:</strong> ${e(doc.approval)}</p>` : ''}<label for="artifact-approval">Approval record (person or body, date, and intended use)</label><input id="artifact-approval" maxlength="1000"><button class="button" data-approve-artifact="${id}" ${doc.incomplete ? 'disabled' : ''}>Record approved for use</button></details>${documentHtml(doc)}`;
  }
  return `<p class="eyebrow">FROM YOUR WORKBOOK TO THE PEOPLE WHO NEED IT</p><h1>Documents & handouts</h1><p class="lede">Your recorded answers become usable drafts. Missing information stays visible; nothing is invented.</p><div class="notice">Preview and approve before distribution. Supply authoritative doctrine and governing documents separately. The full ZIP contains private internal material and a complete project backup.</div><label class="check-label no-print"><input type="checkbox" data-artifact-status ${p.artifactOptions.includeStatus ? 'checked' : ''}>Include document status labels in exports</label><div class="actions"><button class="button primary" data-zip>Download Full Search Packet (ZIP)</button><button class="button" data-export>Download Project Backup</button></div>${[
    'Internal',
    'Candidate',
    'Congregation',
  ]
    .map(
      (a) =>
        `<section class="workbook-section"><h2>${a === 'Internal' ? 'Working documents & reference guides' : a === 'Candidate' ? 'Candidate handouts' : 'For the congregation'}</h2><div class="documents-grid">${docs
          .filter((d) => d.audience === a)
          .map(
            (d) =>
              `<a class="document-card" href="${base(p)}/documents/${d.id}"><span class="document-code">${d.code}</span><h3>${d.title}</h3><p>${d.description}</p><span class="small">${e(makeDocument(p, d.id).status)} →</span></a>`,
          )
          .join('')}</div></section>`,
    )
    .join('')}`;
}
export function aboutView() {
  return `<main id="main" class="standalone narrow about" tabindex="-1"><p class="eyebrow">FREE · OPEN SOURCE · CHURCH OWNED</p><h1>A workbook for a weighty season.</h1><p class="lede">Pastoral Search Toolkit helps small churches organize the work of transition, ask the right questions, and take the next faithful step.</p><h2>Where it comes from</h2><p>This project grew from a real pastoral-search package at Fellowship Baptist Church, with Independent Fundamental Baptist theological and practical roots. Its qualification worksheet draws from 1 Timothy 3 and Titus 1.</p><p>The source church’s officers, vote thresholds, timing, and personal arrangements are not defaults for other churches. Your adopted doctrine, governing documents, and convictions belong to your church.</p><h2>Keep the categories clear</h2><p>Reusable guidance, the biblical framework, adopted doctrine, governance, church convictions, ministry fit, and personal preferences have different roles. The toolkit keeps those distinctions visible. It does not rank candidates or claim to determine God’s will.</p><h2>Your work and privacy</h2><p>Projects save in this browser on this device. There is no toolkit account, analytics, advertising, or automatic upload of project data. The hosting provider may log ordinary page requests. This browser storage and downloaded backups are not encrypted.</p><p>Use a trusted device, export backups regularly, and store them carefully. Clearing site data or changing browsers can make a project unavailable here. Importing a backup creates a separate copy; it does not synchronize other people’s work. Keep allegations, background reports, passwords, and private pastoral-care records in your church’s appropriate secure systems.</p><h2>Guidance and authority</h2><p>${AUTHORITY_NOTICE} Readiness means the workbook’s recorded prerequisites are in place. It is not legal advice, a certificate of compliance, or permission to act.</p><p>This is a public feedback preview. Churches should have appropriate leaders review the content and use qualified professional help for legal, tax, employment, and safeguarding questions.</p><h2>Use it, host it, improve it.</h2><p>The toolkit is available under the MIT license. It runs on a static web host without a subscription or paid service.</p><a class="button primary" href="https://github.com/gforster/pastoral-search-toolkit" target="_blank" rel="noopener noreferrer">Source code & self-hosting guide ↗</a><a class="button" href="#home">Start your workbook</a></main>`;
}
