import { documentPresentation } from './presentation.js';
import { EXTRA_DOCUMENTS, extraSections, selectedQuestions } from './additional.js';
import { TRANSITION_GUIDANCE } from '../../data.js';
import { HANDOFF_ITEMS, SCORE_NOTICE } from '../../content/guidance/principles.js';
import {
  AUTHORITY_NOTICE,
  FIELDS,
  FIELD_MAP,
  MILESTONES,
  QUALIFICATIONS,
  REQUIREMENT_CATEGORIES,
} from '../../data.js';
import { answerValue, escapeHtml as e, resolved, tasksFor, applicable } from '../../domain.js';
export const DOCUMENTS = [
  {
    id: 'start',
    code: 'START',
    title: 'Quick reference & next steps',
    audience: 'Internal',
    description: 'Your current milestone, open decisions, and next actions.',
  },
  {
    id: 'preparation',
    code: '01',
    title: 'Search Preparation Worksheet',
    audience: 'Internal',
    description: 'Transition, church context, and authority in one working sheet.',
  },
  {
    id: 'qualifications',
    code: '02',
    title: 'Pastoral Qualifications & Working Definitions',
    audience: 'Internal',
    description: 'All 26 expressions, interpretations, evidence, and adoption record.',
  },
  {
    id: 'committee',
    code: '03',
    title: 'Committee Startup Worksheet',
    audience: 'Internal',
    description: 'Roles, authority, meeting rules, and safeguards.',
  },
  {
    id: 'screening',
    code: '04',
    title: 'Candidate Screening Worksheet',
    audience: 'Internal',
    description: 'Three separate gates before ministry-fit consideration.',
  },
  {
    id: 'evaluation',
    code: '05',
    title: 'Candidate Evaluation Worksheet',
    audience: 'Internal',
    description: 'A blank evidence worksheet. No points or ranking.',
  },
  {
    id: 'call',
    code: '06',
    title: 'Finalist & Call Checklist',
    audience: 'Internal',
    description: 'Candidating, terms, governing rules, and actual verification.',
  },
  {
    id: 'handoff',
    code: '07',
    title: 'Transition & Handoff Plan',
    audience: 'Internal',
    description: 'Acceptance, authority, records, staff, and the first season.',
  },
  {
    id: 'packet',
    code: 'H00',
    title: 'Candidate Packet Cover & Checklist',
    audience: 'Candidate',
    description: 'Contents, version, contact, attachments, and deferred information.',
  },
  {
    id: 'candidate',
    code: 'H01',
    title: 'Candidate Guide',
    audience: 'Candidate',
    description: 'Requirements, mutual discernment, and what a candidate can expect.',
  },
  {
    id: 'congregation',
    code: 'H02',
    title: 'Congregation Guide',
    audience: 'Congregation',
    description: 'The process, current update, prayer, and where questions belong.',
  },
  {
    id: 'profile',
    code: 'H03',
    title: 'Church Profile',
    audience: 'Candidate',
    description: 'An honest view of your church today.',
  },
  {
    id: 'position',
    code: 'H04',
    title: 'Pastoral Position Description',
    audience: 'Candidate',
    description: 'Responsibilities, authority, support, and realistic expectations.',
  },
  {
    id: 'compensation',
    code: 'H05',
    title: 'Compensation & Benefits Summary',
    audience: 'Candidate',
    description: 'Actual terms and clear disclosure of provisional information.',
  },
  {
    id: 'process',
    code: 'H06',
    title: 'Candidate Process Guide',
    audience: 'Candidate',
    description: 'Stages, contact, consent, and communication.',
  },
  {
    id: 'governance',
    code: 'H07',
    title: 'Committee Governance Summary',
    audience: 'Candidate',
    description: 'The church’s recorded rules; no invented thresholds.',
  },
  {
    id: 'authority',
    code: 'A01',
    title: 'Committee Authority Checklist',
    audience: 'Internal',
    description: 'Who may create, approve, contact, advance, recommend, and call.',
  },
  {
    id: 'covenant',
    code: 'A02',
    title: 'Committee Covenant',
    audience: 'Internal',
    description: 'Prayer, fairness, confidentiality, authority, and accountability.',
  },
  {
    id: 'roles',
    code: 'A03',
    title: 'Committee Roles Sheet',
    audience: 'Internal',
    description: 'Chair, records keeper, liaison, and decision responsibilities.',
  },
  {
    id: 'intake',
    code: 'A04',
    title: 'Candidate Intake Procedure',
    audience: 'Internal',
    description: 'Sourcing, suggestions, acknowledgments, and authorized contact.',
  },
  ...EXTRA_DOCUMENTS,
  {
    id: 'interviews',
    code: 'A05',
    title: 'Interview Guide',
    audience: 'Internal',
    description: 'Your selected questions and the evidence-gathering plan.',
  },
];
const byModule = (module) => FIELDS.filter((f) => f.module === module).map((f) => f.id);
const PUBLIC_PROFILE = [
  'churchName',
  'location',
  'attendance',
  'membership',
  'identity',
  'staff',
  'history',
  'people',
  'ministries',
  'facilities',
  'finances',
  'strengths',
  'challenges',
  'transitionSummary',
];
const PUBLIC_GOVERNANCE = [
  'composition',
  'committeeAuthority',
  'contactAuthority',
  'advanceAuthority',
  'recommendAuthority',
  'callAuthority',
  'callMethod',
  'decisionProcedure',
  'voteThreshold',
  'quorum',
  'notice',
  'preachRule',
  'meetingRule',
  'noCall',
  'governanceSummary',
];
const PUBLIC_PROCESS = [
  'liaison',
  'candidateSteps',
  'intake',
  'prospectPool',
  'seriousConsideration',
  'sermonSubmission',
  'releaseProcess',
  'referenceProcess',
  'safetyProcess',
  'visitPlan',
  'resultProcess',
];
function value(p, id) {
  const a = p.answers[id],
    f = FIELD_MAP[id];
  if (a?.status === 'not_applicable' && f.allowNA)
    return 'Not applicable / not offered, as recorded by the church.';
  if (a?.status === 'known' && a.value.trim())
    return f.options?.find(([v]) => v === a.value)?.[1] || a.value;
  return '[TO BE CONFIRMED — ' + f.label + ']';
}
function fields(p, ids) {
  return ids
    .filter((id) => applicable(p, FIELD_MAP[id]))
    .map((id) => ({
      heading: FIELD_MAP[id].label,
      paragraphs: [value(p, id)],
      fieldId: id,
      required: FIELD_MAP[id].due !== null,
      unresolved: !resolved(p, FIELD_MAP[id]),
    }));
}
function section(heading, ...paragraphs) {
  return { heading, paragraphs };
}
const blankEvidence = () => [
  'Evidence / source and date: ________________________________________',
  'Concern: ☐ Not yet established ☐ Needs clarification ☐ Material concern ☐ Disqualifying',
  'What remains uncertain: __________________________________________',
  'Material or disqualifying concern, with reasons: _______________________',
  'Next action / owner / review date: __________________________________',
];
export function makeDocument(p, id) {
  const definition = DOCUMENTS.find((d) => d.id === id);
  if (!definition) throw new Error('Document not found.');
  let sections;
  const gateSections = () => [
    section(
      'Before reviewing this candidate',
      'Candidate reference: ____________________   Date: ____________________',
      'Keep this completed sheet in the church’s approved secure records. Do not store sensitive candidate evidence in the toolkit.',
    ),
    ...[
      [
        'Doctrine',
        'Affirmation of the church’s adopted doctrinal statement; record unresolved doctrinal questions.',
      ],
      [
        'Biblical pastoral qualifications',
        'Use all 26 church-adopted working definitions from 1 Timothy 3 and Titus 1. Seek evidence of established patterns.',
      ],
      [
        'Governing integrity',
        'Confirm the candidate can serve under the governing documents as written and use the proper process for any proposed amendment.',
      ],
    ].map(([title, text]) =>
      section(
        title,
        text,
        'Decision: ☐ Established  ☐ Needs evidence / clarification  ☐ Stop concern',
        ...blankEvidence(),
      ),
    ),
    section(
      'Authorized decision',
      'A genuine failed gate cannot be averaged away by strengths in other areas. Uncertainty calls for evidence, not a guessed pass.',
      'Decision: ☐ Advance  ☐ Pause for specified evidence  ☐ Release graciously',
      'Responsible body / written reasons / date: ____________________________',
    ),
  ];
  switch (id) {
    case 'start': {
      const ts = tasksFor(p);
      sections = [
        section(
          'Transition guidance',
          TRANSITION_GUIDANCE[answerValue(p, 'event')] ||
            'Clarify what happened, who may act, and what the next services and care needs require.',
        ),
        section('Current focus', MILESTONES.find((m) => m.id === p.milestone).title),
        section(
          'What you can do now',
          'Open any module. Clarify the church’s own doctrine, governance, needs, and working definitions before reviewing candidates.',
        ),
        section(
          'Resolve before this milestone',
          ...ts.filter((t) => t.classification === 'BLOCKER_NOW').map((t) => t.label),
        ),
        section(
          'Can wait until a later stage',
          ...ts
            .filter((t) => t.classification === 'REQUIRED_LATER')
            .map((t) => `${t.label} — before ${MILESTONES[t.due].title.toLowerCase()}`),
        ),
        section(
          'Working principles',
          'Pray throughout. Gates before fit. Character before charisma. Evidence before impressions. Protect identities while communicating the process.',
        ),
      ];
      break;
    }
    case 'preparation':
      sections = fields(p, [
        ...byModule('transition'),
        'churchName',
        'location',
        'staff',
        'strengths',
        'challenges',
        ...byModule('governance').filter((id) => FIELD_MAP[id].due <= 2),
      ]);
      break;
    case 'qualifications':
      sections = [
        section(
          'Read together',
          '1 Timothy 3:1–7 and Titus 1:6–9. These 26 expressions follow the Fellowship source worksheet. The church must own its interpretations before applying them to individuals.',
          'Consider the established pattern of life, not imagined perfection. Discuss contested family and maturity questions before considering names.',
        ),
        ...QUALIFICATIONS.map((q, i) =>
          section(
            `${i + 1}. ${q.title} — ${q.reference}`,
            q.prompt,
            ...[
              ['meaning', 'Working meaning'],
              ['evidence', 'Evidence to seek'],
              ['disqualifying', 'Disqualifying pattern'],
              ['questions', 'Questions / cases requiring judgment'],
            ].map(
              ([key, label]) => `${label}: ${p.qualifications[q.id]?.[key] || '[TO BE CONFIRMED]'}`,
            ),
          ),
        ),
        ...fields(p, byModule('qualifications')),
      ];
      break;
    case 'committee':
      sections = fields(p, byModule('committee'));
      break;
    case 'screening':
      sections = gateSections();
      break;
    case 'evaluation':
      sections = [
        ...gateSections(),
        section('Discernment', SCORE_NOTICE),
        section(
          'Use only after the gates',
          'Record evidence individually, then discuss it with the authorized committee. Classify concerns as not yet established, needs clarification, material concern, or disqualifying; explain the evidence. Do not calculate an overall score.',
        ),
        ...[
          'Preaching and teaching',
          'Pastoral care, evangelism, and discipleship',
          'Leadership, conflict, and accountability',
          'Delegation and practical stewardship',
          'Family boundaries and sustainable ministry',
          'Transition posture and mutual expectations',
        ].map((title) => section(title, ...blankEvidence())),
        ...p.requirements.map((r) =>
          section(
            `${REQUIREMENT_CATEGORIES.find(([v]) => v === r.category)[1]} · ${r.status === 'adopted' ? 'Church-owned' : 'Draft discussion item'}`,
            r.statement,
            r.evidence || 'Evidence to seek: __________________',
            ...blankEvidence(),
          ),
        ),
      ];
      break;
    case 'call':
      sections = [
        ...fields(p, [
          'callAuthority',
          'callMethod',
          'decisionProcedure',
          'voteThreshold',
          'quorum',
          'notice',
          'preachRule',
          'meetingRule',
          'noCall',
          ...byModule('call'),
        ]),
        section(
          'Additional church prerequisites',
          ...p.tasks
            .filter((t) => t.prerequisite !== false)
            .map(
              (t) =>
                `${t.resolved ? '☑' : '☐'} ${t.label} — ${MILESTONES[t.due].title}; responsible: ${t.owner || 'not assigned'}`,
            ),
        ),
      ];
      break;
    case 'handoff':
      sections = [
        ...fields(p, byModule('handoff')),
        section('Practical transfer checklist', ...HANDOFF_ITEMS.map((item) => '☐ ' + item)),
        section(
          'Responsibilities by role',
          'Outgoing pastor: clarify remaining authority and dates, honor confidentiality, and support a clear transfer.',
          'Interim pastor: conclude temporary authority under the agreed terms and hand off essential responsibilities.',
          'Associate pastor: confirm duties, reporting, and any staffing decisions through the church’s proper process.',
          'Church leadership: verify authority, access, continuity, practical support, and appropriate records custody.',
          'Incoming pastor: listen, learn the church, establish working relationships, and revisit workload and support.',
        ),
        section(
          'Pastoral-care confidentiality',
          'Transfer only information needed for appropriate continuity, with consent and safeguards where appropriate. Do not make a general archive of private confidences.',
        ),
      ];
      break;
    case 'packet':
      sections = [
        section(
          'Distribution record',
          'Candidate: ______________________   Sent on: ______________________',
          'Packet version/date: __________________   Sent by/method: ___________',
        ),
        ...fields(p, ['chair', 'liaison']),
        section(
          'Attach and verify before sending',
          '☐ H01 Candidate Guide',
          '☐ H03 Church Profile',
          '☐ H04 Pastoral Position Description',
          '☐ H05 Compensation & Benefits Summary, or an explicit approved deferral',
          '☐ H06 Candidate Process Guide',
          '☐ H07 Committee Governance Summary',
          '☐ Current adopted doctrinal statement — supply the authoritative document',
          '☐ Current constitution/bylaws — supply the authoritative documents',
          'These attachments are not automatically included in this cover sheet.',
        ),
        section(
          'Intentionally deferred information',
          'Item / authorized reason / when it will be supplied: ___________________',
        ),
        ...fields(p, ['packetRecord']),
        section(
          'Release review',
          '☐ All material is current, appropriate for this stage, and approved for release.',
          '☐ The candidate knows whom to contact and which items remain outstanding.',
        ),
      ];
      break;
    case 'candidate':
      sections = [
        section(
          'An honest process of mutual discernment',
          'We seek a pastor who meets the biblical qualifications, affirms our adopted doctrine, and can serve faithfully under our governing documents. Ministry fit is considered after these gates.',
          'The church and the candidate both need time to ask direct questions. Please raise questions about the church’s doctrine, governance, finances, care, family expectations, and transition.',
        ),
        ...fields(p, [
          'liaison',
          'affirmations',
          'governanceSummary',
          'candidateSteps',
          'workPattern',
          'transitionSummary',
        ]),
        section(
          'Fairness and privacy',
          'The intended process uses consistent core questions, evidence, appropriate consent, and timely communication. Candidate identities should be protected until disclosure is properly authorized and mutually agreed.',
        ),
        section(
          'Church-owned convictions',
          ...p.requirements
            .filter((r) => r.category === 'conviction' && r.status === 'adopted')
            .map((r) => r.statement),
        ),
        section(
          'Authoritative documents',
          'Request the church’s complete adopted doctrinal statement and constitution/bylaws. Summaries in this packet do not replace them.',
        ),
      ];
      break;
    case 'congregation':
      sections = [
        section(
          'Our shared work',
          'Pray, learn the process, ask questions through the designated channel, and give the church time for careful discernment. Do not make unauthorized promises or circulate private candidate information.',
        ),
        ...fields(p, ['publicUpdate', 'updateRhythm', 'questionChannel', 'callAuthority']),
        section(
          'The recommended path',
          'Stabilize → organize → prepare the search → evaluate evidence → present a finalist → call → handoff. The governing documents and adopted process determine the church’s actual decisions.',
        ),
        section(
          'How to help',
          'Pray for those affected by the transition, the church’s leaders, candidates and their families, and the candidate’s current church. Share suggestions through the approved process rather than lobbying privately.',
        ),
      ];
      break;
    case 'profile':
      sections = fields(p, PUBLIC_PROFILE);
      break;
    case 'position':
      sections = [
        ...fields(p, byModule('position')),
        ...(answerValue(p, 'pastoralModel') === 'bivocational'
          ? [
              section(
                'Sustainable bivocational ministry',
                'Responsibilities must fit actual availability, outside work, rest, and family. Share care and administration; arrange emergency coverage.',
              ),
              ...fields(p, byModule('bivocational')),
            ]
          : []),
      ];
      break;
    case 'compensation': {
      const finalized =
        answerValue(p, 'compStatus') === 'approved' && resolved(p, FIELD_MAP.compFinal);
      sections = [
        section(
          'Package status',
          finalized
            ? 'The church has recorded this package as approved/final. Verify the approval record and complete written terms before release.'
            : 'Compensation package is under development and must be finalized before the finalist/call stage.',
        ),
        ...fields(p, byModule('compensation')),
        ...(answerValue(p, 'pastoralModel') === 'bivocational'
          ? [
              section(
                'Bivocational support',
                'Match the agreed availability and responsibilities to the support offered. Confirm outside employment, shared coverage, and a regular sustainability review.',
              ),
            ]
          : []),
        section(
          'Review the whole arrangement',
          'Distinguish guaranteed pay, reimbursements, discretionary benefits, and terms still subject to approval. Match workload to support. Obtain appropriate professional advice on tax and legal matters.',
        ),
      ];
      break;
    }
    case 'process':
      sections = [
        section(
          'Gates before fit',
          'Doctrine → biblical pastoral qualifications → governing integrity → ministry fit → discernment → final call. Follow the church’s adopted authority and process.',
        ),
        ...fields(p, PUBLIC_PROCESS),
      ];
      break;
    case 'governance':
      sections = [
        section(
          'Authority',
          AUTHORITY_NOTICE,
          'This summary explains recorded rules; it does not amend the governing documents.',
        ),
        ...fields(p, PUBLIC_GOVERNANCE),
      ];
      break;
    case 'authority':
      sections = fields(p, [
        'documents',
        'createAuthority',
        'selectMembers',
        'approveMembers',
        'composition',
        'committeeAuthority',
        'chairRule',
        'contactAuthority',
        'advanceAuthority',
        'recommendAuthority',
        'callAuthority',
      ]);
      break;
    case 'covenant':
      sections = [
        section(
          'Proposed commitments for church adoption',
          'We will pray for the church, affected families, candidates, and one another.',
          'We will work within Scripture, our governing documents, and the authority granted to this committee.',
          'We will protect candidate information while remaining accountable for the process.',
          'We will disclose interests, follow recusal rules, and avoid unauthorized promises or side-channel recruiting.',
          'We will use the same adopted standards, seek evidence, hear dissent, and record the reasons for decisions.',
          'We will treat candidates and their present churches with care and honesty.',
        ),
        ...fields(p, [
          'conflicts',
          'confidentiality',
          'decisionRules',
          'recordsPolicy',
          'covenantApproved',
        ]),
        section(
          'Adoption',
          'Name / signature / date: __________________________________________',
          'Church or committee approval record: ______________________________',
        ),
      ];
      break;
    case 'roles':
      sections = fields(p, [
        'members',
        'chair',
        'secretary',
        'liaison',
        'committeeAuthority',
        'advanceAuthority',
        'recommendAuthority',
        'callAuthority',
      ]);
      break;
    case 'intake':
      sections = fields(p, [
        'sourcing',
        'intake',
        'liaison',
        'contactAuthority',
        'confidentiality',
        'recordsPolicy',
      ]);
      break;
    case 'interviews':
      sections = [
        ...fields(p, ['interviewPlan', 'evidenceProcess', 'mutualQuestions']),
        section(
          'Use consistently',
          'Use manageable core questions, locally adopted convictions, evidence-driven follow-ups, and selected scenarios. The bank is not a mandatory single interview.',
        ),
        ...(selectedQuestions(p).length
          ? selectedQuestions(p).map((q) =>
              section(`${q.kind} · ${q.title}`, q.question, ...blankEvidence()),
            )
          : [
              section(
                'Selected questions',
                '[TO BE CONFIRMED — choose questions in Interviews & Evaluation.]',
              ),
            ]),
      ];
      break;
    default:
      sections = extraSections(p, id, { section, fields, blankEvidence }) || [];
  }
  sections = sections.map((s) => ({
    ...s,
    ...(id === 'qualifications' && /^\d+\./.test(s.heading)
      ? {
          qualification: true,
          displayHeading: s.heading.split(' — ')[0],
          reference: s.heading.split(' — ').slice(1).join(' — '),
        }
      : {}),
    paragraphs: s.paragraphs.length ? s.paragraphs : ['[TO BE CONFIRMED / no items recorded]'],
  }));
  const missing = sections.filter((s) => s.required && s.unresolved);
  const unresolved = sections.some(
    (s) => s.unresolved || s.paragraphs.some((text) => text.includes('[TO BE CONFIRMED')),
  );
  const incomplete =
    missing.length > 0 ||
    sections.some(
      (s) => !s.fieldId && s.paragraphs.some((text) => text.includes('[TO BE CONFIRMED')),
    ) ||
    (id === 'compensation' &&
      !(answerValue(p, 'compStatus') === 'approved' && resolved(p, FIELD_MAP.compFinal)));
  const review = p.artifactReviews[id];
  const status = incomplete
    ? 'INCOMPLETE'
    : review
      ? 'APPROVED FOR USE'
      : unresolved
        ? 'DRAFT — READY FOR REVIEW'
        : 'READY FOR COMMITTEE REVIEW';
  return {
    ...definition,
    ...documentPresentation(p, definition),
    church: answerValue(p, 'churchName') || 'Church name to be confirmed',
    date:
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(p.updatedAt)) + ' UTC',
    sections,
    status,
    incomplete,
    includeStatus: p.artifactOptions.includeStatus,
    approval: review?.record || '',
    provenance: {
      applicationVersion: '0.4.1',
      schemaVersion: p.schemaVersion,
      templateVersion: '2026-10-21.2',
      projectUpdatedAt: p.updatedAt,
      generatedAt: new Date().toISOString(),
    },
  };
}
export function documentPresentationHtml(doc) {
  return `${doc.focus ? `<p class="meeting-marker">${e(doc.focus)}</p>` : ''}${doc.note ? `<aside class="artifact-note"><strong>${e(doc.note.title)}</strong><p>${e(doc.note.body)}</p></aside>` : ''}`;
}
export function documentSectionsHtml(doc, level = 2) {
  const tag = level === 3 ? 'h3' : 'h2';
  const paragraph = (text, qualification) => {
    const match =
      qualification &&
      /^(Working meaning|Evidence to seek|Disqualifying pattern|Questions \/ cases requiring judgment): (.*)$/s.exec(
        text,
      );
    return match ? `<p><strong>${e(match[1])}:</strong> ${e(match[2])}</p>` : `<p>${e(text)}</p>`;
  };
  return doc.sections
    .map(
      (s) =>
        `<section${s.qualification ? ' class="qualification-block"' : ''}><${tag}>${e(s.displayHeading || s.heading)}</${tag}>${s.reference ? `<p class="qualification-reference">${e(s.reference)}</p>` : ''}${s.paragraphs.map((p) => paragraph(p, s.qualification)).join('')}${s.columns ? `<div class="work-table-wrap"><table class="work-table ${e(s.layout || '')}"><thead><tr>${s.columns.map((c) => `<th scope="col">${e(c)}</th>`).join('')}</tr></thead><tbody>${s.rows.length ? s.rows.map((row) => `<tr>${row.map((cell) => `<td>${e(cell)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${s.columns.length}">No open items recorded in this category.</td></tr>`}</tbody></table></div>` : ''}</section>`,
    )
    .join('');
}
export function documentHtml(doc) {
  return `<article class="document-sheet"><header><p class="eyebrow">${e(doc.code)} · ${e(doc.audience)} material${doc.includeStatus ? ` · ${e(doc.status)}` : ''}</p><h1>${e(doc.title)}</h1><p>${e(doc.church)}<br>Project updated ${e(doc.date)}</p></header>${documentPresentationHtml({ ...doc, focus: doc.audience === 'Internal' ? doc.focus : undefined })}<p class="document-notice">Review and approve before use or distribution. Unknowns are shown explicitly. ${e(AUTHORITY_NOTICE)}</p>${documentSectionsHtml(doc)}<footer>Generated with Pastoral Search Toolkit · Project updated ${e(doc.date)} · Recorded answers, not independent verification.</footer></article>`;
}
export function documentMarkdown(doc) {
  const safe = (s) =>
    String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replace(/[\\`*_{}[\]()#!|]/g, '\\$&');
  return (
    `# ${doc.title}\n\n${safe(doc.church)} · ${doc.date}\n\n**${doc.includeStatus ? doc.status + ' · ' : ''}${doc.audience} material. Review and approve before use or distribution.**\n\n${AUTHORITY_NOTICE}\n\n${doc.focus && doc.audience === 'Internal' ? `**${safe(doc.focus)}**\n\n` : ''}${doc.note ? `> **${safe(doc.note.title)}**\n> ${safe(doc.note.body)}\n\n` : ''}` +
    doc.sections
      .map((s) => `## ${safe(s.heading)}\n\n${s.paragraphs.map(safe).join('\n\n')}`)
      .join('\n\n') +
    `\n\nGenerated with Pastoral Search Toolkit · Project updated ${safe(doc.date)}\n`
  );
}

export function availableDocuments(p) {
  return DOCUMENTS.filter(
    (d) =>
      !['sermon-guide', 'sermon-worksheet'].includes(d.id) ||
      answerValue(p, 'sermonReview') === 'yes',
  )
    .filter((d) => d.id !== 'interim' || answerValue(p, 'interim') === 'yes')
    .filter((d) => d.id !== 'bivocational' || answerValue(p, 'pastoralModel') === 'bivocational');
}
