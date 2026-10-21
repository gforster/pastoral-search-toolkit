import { FIELD_MAP, MILESTONES, TRANSITION_GUIDANCE } from '../../data.js';
import { answerValue, applicable, tasksFor } from '../../domain.js';
import { makeDocument, availableDocuments } from './documents.js';

// This is a projection of the current workbook, never a second project or approval store.
export const WORKING_PACKETS = [
  {
    id: 'working-binder',
    title: 'Working committee binder',
    description: 'Twelve tabs for current facts, decisions, assignments and follow-through.',
  },
  {
    id: 'meeting-agenda',
    title: 'First meeting agenda',
    description: 'A two-hour meeting: organize first, introduce later work, assign the next steps.',
  },
  {
    id: 'chair-guide',
    title: 'First meeting chair’s guide',
    description: 'Prompts, expected outputs and a shared assignment sheet.',
  },
  {
    id: 'second-meeting',
    title: 'Proposed second meeting agenda',
    description:
      'A focused 60-minute follow-up after written progress reports; date and decisions remain open.',
  },
  {
    id: 'later-resources',
    title: 'Later search resources',
    description: 'Candidate forms and question banks to print selectively when needed.',
  },
];
export const BINDER_TABS = [
  'Start here',
  'Committee & meetings',
  'Governance & authority',
  'Church profile',
  'Doctrine & convictions',
  'Pastoral qualifications',
  'Position & compensation',
  'Search & communication',
  'Candidates',
  'Interviews & evaluation',
  'References & safety',
  'Finalist, call & transition',
];
export const FIRST_ASSIGNMENTS = [
  [
    'Governing documents and profile checks',
    'Locate current adopted documents; verify membership, finances, ministries and facilities.',
  ],
  [
    'Transition and church office coverage',
    'Bring service, care, office and financial handoff options; identify backup coverage.',
  ],
  [
    'Farewell or transition recognition',
    'If appropriate, identify a committee contact and a possible planner from the congregation.',
  ],
  [
    'Compensation and separate search budget',
    'Outline work, housing and support options; develop a distinct search-expense proposal.',
  ],
  [
    'References, safety and records policy',
    'Outline consent, checks, reviewers, costs, concern reporting and records handling.',
  ],
  [
    'Minutes, working records and access',
    'Establish the current master, member access, backups and draft-minutes review.',
  ],
  [
    'Congregation updates and questions',
    'Propose a factual update, release review and a member-question contact.',
  ],
  [
    'Later discussion preparation',
    'Arrange focused study of qualifications, ministry practices and church self-assessment.',
  ],
];
export const MEETING_PLAN = [
  [10, 'Welcome, Scripture and prayer', 'Begin with prayer and the purpose of this meeting.'],
  [
    20,
    'Organizing formalities',
    'Confirm authority and membership; choose a chair and minutes secretary; agree how this meeting will proceed.',
  ],
  [10, 'Purpose and binder tour', 'Show where facts, actual decisions and assignments belong.'],
  [
    15,
    'Covenant and working rules',
    'Review the draft; record adoption, requested changes or deferral under the proper authority.',
  ],
  [
    15,
    'Transition, staffing and housing',
    'Identify immediate gaps and options needing a report; avoid assuming an interim appointment or housing decision.',
  ],
  [
    10,
    'Qualifications, practices and self-assessment',
    'Introduce later study; schedule review before candidate evaluation.',
  ],
  [
    10,
    'Communication, records and access',
    'Choose a practical method, record keeper, update contact and backup routine.',
  ],
  [
    20,
    'Assign the preparation work',
    'Give each task a lead, helpers, a first result and a realistic report date.',
  ],
  [
    10,
    'Read back, next meeting and prayer',
    'Read actual decisions and assignments aloud; confirm next meeting purpose and limited reading.',
  ],
];
const line = '________________________________';
const s = (heading, ...paragraphs) => ({ heading, paragraphs });
const grid = (heading, columns, rows, paragraphs = []) => ({
  heading,
  columns,
  rows,
  paragraphs,
  layout: ['Two-hour meeting plan', 'One-hour meeting plan'].includes(heading)
    ? 'agenda-table'
    : heading === 'Assignments'
      ? 'assignment-table'
      : '',
});
function recorded(p, id) {
  const f = FIELD_MAP[id];
  if (p.answers[id]?.status === 'not_applicable' && f.allowNA) return 'Not applicable, as recorded';
  const value = answerValue(p, id);
  return value ? f.options?.find(([key]) => key === value)?.[1] || value : `TBD — ${f.label}`;
}
function facts(p, ids, heading = 'Recorded information and open questions') {
  return grid(
    heading,
    ['Item', 'Current record'],
    ids
      .filter((id) => applicable(p, FIELD_MAP[id]))
      .map((id) => [FIELD_MAP[id].label, recorded(p, id)]),
  );
}
function form(title, sections) {
  return {
    title,
    audience: 'Internal',
    status: 'WORKING SHEET — NOT AN APPROVAL',
    includeStatus: true,
    sections,
  };
}
function assignmentSheet() {
  return form('First meeting assignments', [
    s(
      'Agree a first result',
      'Name a lead, helpers and a realistic first report date. An outline or list of missing facts is enough; every task need not be settled before the next meeting.',
    ),
    grid(
      'Assignments',
      ['Work and first result', 'Lead / helpers', 'First report'],
      FIRST_ASSIGNMENTS.map(([title, result]) => [
        `${title}\n${result}`,
        'Lead: ______________\nHelp: ______________',
        'Date: _____________\n☐ Received',
      ]),
    ),
    s(
      'Carry work forward',
      'Receiving a report is separate from approving its recommendation. Record actual decisions separately and carry unfinished work to Action follow-up (tab 1).',
      `Next meeting / purpose / limited reading: ${line}`,
    ),
  ]);
}
function recordedSharedDecisions(p) {
  const records = p.collaboration.decisions.filter((decision) => !decision.candidateId);
  return records.length
    ? [
        form('Recorded shared-project decisions', [
          s(
            'Existing committee records',
            'These are the committee’s recorded conclusions, not independent verification or substituted approval of workbook prerequisites. Candidate-linked decisions remain in their separate records.',
          ),
          ...records.map((decision) =>
            s(
              `${decision.date} — ${decision.type}`,
              `Recorded result: ${decision.result || 'Not recorded'}\nReasons: ${decision.rationale}`,
              `Unresolved concerns: ${decision.unresolvedConcerns || 'None recorded; verify the minutes'}`,
              `Follow-up: ${decision.followUp || 'Not recorded'}\nOwner: ${decision.owner || 'TBD'} · Review date: ${decision.reviewDate || 'TBD'}`,
              `Recorder: ${decision.recordedBy}\n${decision.notes || ''}`,
            ),
          ),
        ]),
      ]
    : [];
}
function meetingRecord() {
  return form('Meeting record', [
    s(
      'Draft minutes',
      `Date / location / opening time: ${line}`,
      `Chair / minutes secretary: ${line}`,
      `Present / absent: ${line}`,
      `Applicable meeting requirements / agenda / previous minutes action: ${line}`,
    ),
    grid(
      'Actual work',
      ['Topic / report', 'Action or unresolved question', 'Decision record reference'],
      Array.from({ length: 5 }, () => [line, `${line}\n${line}`, line]),
    ),
    s(
      'Close and review',
      `Assignment sheet dated / next meeting / adjournment: ${line}`,
      `Prepared by / minutes approval, corrections, body and date: ${line}`,
      'Preserve relevant dissent and unresolved concerns. An assignment or report is not approval. Keep private candidate and pastoral-care details in their appropriate separate records.',
    ),
  ]);
}
export function secondMeetingAgenda() {
  return form('Proposed second meeting agenda', [
    s(
      'Purpose and preparation',
      'Aim for 60 minutes: check progress, discuss blockers and make one or two decisions that are ready. Confirm the date and scope at the first meeting.',
      `Proposed date / time / location: ${line}`,
      'About 48 hours beforehand, each lead sends a short report through the agreed channel: work completed and source, what remains unknown, help or decision needed, recommendation and next action. An honest “not ready” report is useful. The chair circulates a short decision list and relevant material before the meeting; private material stays in the appropriate records.',
    ),
    grid(
      'One-hour meeting plan',
      ['Elapsed minutes', 'Topic', 'Result to record'],
      [
        [
          '0–5',
          'Prayer and purpose',
          'Confirm the limited purpose and the decisions actually ready for discussion.',
        ],
        [
          '5–10',
          'Previous minutes and actions',
          'Correct the draft record; confirm actual decisions, leads and report dates.',
        ],
        [
          '10–25',
          'Reports by exception',
          'Cover blockers, missing evidence, questions and changed recommendations. Do not read every written report aloud.',
        ],
        [
          '25–45',
          'One or two prepared decisions',
          'Discuss evidence, authority and unresolved concerns. Record action, referral or deferral; report receipt is not approval.',
        ],
        [
          '45–55',
          'Next preparation and assignments',
          'Agree next results, leads and dates. Schedule focused qualifications or governance study if needed.',
        ],
        [
          '55–60',
          'Read back and close',
          'Confirm actual decisions, remaining concerns and next meeting purpose; close in prayer.',
        ],
      ],
    ),
    s(
      'Choose the decision items in advance',
      `1. Topic / evidence / proper decision authority: ${line}`,
      `2. Topic / evidence / proper decision authority: ${line}`,
      'Possible topics depend on the reports: service and office coverage, working-record arrangements, verified governing facts, or a next step on budget and compensation. Do not assume a package or policy is ready for adoption. Reserve substantial doctrine, qualifications or governance questions for focused discussion rather than rushing them into a status meeting.',
    ),
  ]);
}
function schedule() {
  let elapsed = 0;
  return grid(
    'Two-hour meeting plan',
    ['Elapsed minutes', 'Topic', 'Result to record'],
    MEETING_PLAN.map(([duration, topic, result]) => {
      const start = elapsed;
      elapsed += duration;
      return [`${start}–${elapsed}`, topic, result];
    }),
  );
}
function roles(p) {
  return form('Committee roles and communication', [
    facts(p, ['members', 'committeeAuthority']),
    grid(
      'Agree the practical arrangements',
      ['Responsibility', 'Person / method / backup'],
      [
        ['Chair', 'chair'],
        ['Minutes secretary', 'secretary'],
        ['Candidate contact under recorded authority', 'liaison'],
        ['Congregation updates and questions', 'questionChannel'],
        ['Update rhythm', 'updateRhythm'],
        ['Working master, communication and member access', 'recordsPolicy'],
        ['Backup keeper and frequency', null],
      ].map(([label, id]) => [
        label,
        `${id && answerValue(p, id) ? recorded(p, id) : line}\n${line}`,
      ]),
    ),
    s(
      'Record actual action',
      `Covenant / working rules: ☐ Adopted ☐ Changes requested ☐ Deferred\nAuthority / date / decision record: ${line}`,
    ),
  ]);
}
function binderGroups(p) {
  const doc = (id) => makeDocument(p, id);
  const work = tasksFor(p).filter((task) => !task.candidateId);
  const milestones = (classification) =>
    work
      .filter((t) => t.classification === classification)
      .slice(0, 8)
      .map((t) => [
        t.label,
        t.due === null ? 'Recommended' : MILESTONES[t.due].short,
        `Owner / next action: ${line}`,
      ]);
  return [
    [
      form('Quick reference & next steps', [
        s(
          'Current focus',
          MILESTONES.find((m) => m.id === p.milestone).title,
          TRANSITION_GUIDANCE[answerValue(p, 'event')] ||
            'Confirm current care, service coverage and authority. Prepare without inventing later decisions.',
        ),
        grid(
          'What matters now',
          ['Open requirement', 'Needed before', 'Follow-through'],
          milestones('BLOCKER_NOW'),
          [
            'First eight open requirements for the selected milestone. Use Open decisions in the workbook for the full list. These are recorded prerequisites, not permission to advance.',
          ],
        ),
        grid(
          'What can wait',
          ['Later requirement', 'Needed before', 'Follow-through'],
          milestones('REQUIRED_LATER'),
          [
            'First eight later requirements; the full list remains in Open decisions. Work elsewhere may continue. Set a report date when the item becomes relevant.',
          ],
        ),
        s(
          'Use at every meeting',
          'Review Action follow-up, record actual decisions, assign the next work, and confirm the next meeting. Keep one agreed working master; export a project backup after substantial edits and before transferring devices.',
        ),
      ]),
      form('Transition planning', [
        facts(p, [
          'event',
          'finalDate',
          'currentAuthority',
          'pulpitPlan',
          'operations',
          'carePlan',
          'publicUpdate',
        ]),
        grid(
          'Coverage and handoff',
          ['Responsibility', 'Lead / backup', 'Next action / date / approval'],
          [
            'Services and pulpit supply',
            'Pastoral care and emergencies',
            'Office, records and financial handoff',
            'Property and housing',
            'Transition recognition, if appropriate',
          ].map((label) => [label, `${line}\n${line}`, `${line}\n${line}`]),
        ),
      ]),
      form('Decision record', [
        s(
          'Evidence and authority',
          `Topic / meeting date / recorder: ${line}`,
          `Requirement or source / decision authority: ${line}`,
          `Evidence reviewed: ${line}`,
        ),
        s(
          'Actual action',
          `☐ Adopted ☐ Amended ☐ Deferred ☐ No action\nExact action and reasons: ${line}\n${line}`,
          `Dissent, minority concerns and unresolved questions: ${line}\n${line}`,
          `Actual result, if applicable / authority / date / approval reference: ${line}`,
        ),
        s(
          'Follow-through',
          `Next action / lead / helpers / report date: ${line}`,
          `Church or congregation approval still needed: ${line}`,
        ),
      ]),
      ...recordedSharedDecisions(p),
      form('Action follow-up', [
        s(
          'Return to unfinished work',
          'A report received is not a decision approved. Bring evidence and unresolved concerns back for the proper action.',
        ),
        grid(
          'Follow-up log',
          [
            'Task / owner',
            'Report or evidence received / date',
            'Next action / owner / report date',
          ],
          [
            ...p.tasks
              .filter((task) => !task.candidateId)
              .map((task) => [
                `${task.label}\nOwner: ${task.owner || 'TBD'}`,
                `${task.resolved ? 'Recorded complete — verify report' : 'Report pending'}\n${line}`,
                `Report date: ${task.dueDate || 'TBD'}\n${line}`,
              ]),
            ...Array.from({ length: 4 }, () => [
              `${line}\n${line}`,
              `${line}\n${line}`,
              `${line}\n${line}`,
            ]),
          ],
        ),
        s('Decision record references', line),
      ]),
    ],
    [doc('covenant'), roles(p), assignmentSheet(), meetingRecord(), secondMeetingAgenda()],
    [
      doc('governance'),
      form('Source register and fact checks', [
        grid(
          'Locate the current authority',
          ['Document', 'Version / location / person verifying'],
          [
            'Constitution and amendments',
            'Bylaws and adopted rules',
            'Adopted doctrinal statement',
            'Committee authorization / approval minutes',
            'Safeguarding and relevant policies',
          ].map((title) => [`☐ ${title}`, `${line}\n${line}`]),
        ),
        grid(
          'Bring back verified facts',
          ['Missing fact', 'Source / assigned person', 'Report date / evidence'],
          [
            'Current membership and eligibility',
            'Attendance and ministry reports',
            'General finances and designated funds',
            'Facilities and maintenance',
            'Missions commitments',
          ].map((title) => [title, line, line]),
        ),
      ]),
    ],
    [
      doc('profile'),
      form('Transition self-assessment', [
        facts(p, ['strengths', 'challenges']),
        ...[
          'What should be preserved and strengthened?',
          'What needs attention, and what evidence supports that?',
          'What should the congregation address now?',
          'What belongs in the pastoral role?',
          'Which two or three priorities should guide preparation?',
        ].map((q) => s(q, `${line}\n${line}`)),
        s(
          'Turn discussion into action',
          `Agreed priority / lead / first action / review date: ${line}`,
        ),
      ]),
    ],
    [
      form('Doctrine and ministry practices review', [
        facts(p, ['doctrineText', 'doctrineSource', 'affirmations']),
        grid(
          'Review before applying to candidates',
          ['Source / category', 'Current statement or open question', 'Evidence / next action'],
          p.requirements.length
            ? p.requirements.map((r) => [
                `${r.category} — ${r.status}`,
                r.statement,
                r.evidence || line,
              ])
            : Array.from({ length: 5 }, () => [line, `${line}\n${line}`, line]),
        ),
        s(
          'Record the actual outcome',
          `☐ Further study ☐ Proposed wording ☐ Referred to proper authority\nExact action / authority / date / decision record: ${line}`,
          'Distinguish adopted doctrine, governing requirements, convictions, ministry fit and preferences. Printed wording does not adopt a church position.',
        ),
      ]),
    ],
    [doc('qualifications')],
    [
      doc('position'),
      form('Compensation and search-budget planning', [
        facts(p, ['pastoralModel', 'compStatus', 'salary', 'housing', 'compFinal']),
        grid(
          'Develop a supportable arrangement',
          ['Component', 'Proposed amount / arrangement', 'Evidence / question / approval'],
          [
            'Salary',
            'Housing / parsonage',
            'Health and retirement',
            'Mileage and ministry expenses',
            'Leave / coverage',
            'Training',
            'Outside work / boundaries',
            'Moving and other benefits',
          ].map((label) => [label, line, line]),
        ),
        s(
          'Separate search-expense proposal',
          `Travel / supply / visits / checks / estimated total: ${line}`,
          `Affordability evidence / who verifies / report date: ${line}`,
          `Negotiation authority / required approval / record: ${line}`,
          'Outline options first. No budget, package or housing decision is approved by printing this worksheet.',
        ),
      ]),
    ],
    [
      form('Candidate contact readiness', [
        facts(p, [
          'contactAuthority',
          'liaison',
          'sourcing',
          'intake',
          'candidateSteps',
          'releaseProcess',
        ]),
        grid(
          'Verify before contact',
          ['Required evidence', 'Location / open question', 'Who verifies / date'],
          [
            'Authorized contact and intake method',
            'Adopted doctrine and qualifications',
            'Current church profile and governing documents',
            'Pastoral role and compensation disclosure',
            'Permission and communication process',
          ].map((label) => [label, line, line]),
        ),
        s(
          'Actual action',
          `☐ Continue preparation ☐ Referred for approval ☐ Authorized activity\nAuthority / date / decision record: ${line}`,
        ),
      ]),
      doc('update'),
    ],
    [
      form('Candidate review readiness', [
        grid(
          'Before evaluating names',
          [
            'Required standard',
            'Adopted source / version',
            'Open interpretation / evidence needed',
          ],
          [
            'Doctrine',
            'All 26 biblical qualifications',
            'Governing integrity',
            'Church-owned convictions',
            'Reference and safety process',
          ].map((title) => [title, line, `${line}\n${line}`]),
        ),
        s(
          'Agree a consistent review process',
          `Who reviews / evidence / concerns handling / authority: ${line}`,
          'Use the later-resources forms for one candidate at a time. Keep individual observations and private candidate records separate from the general working binder.',
        ),
      ]),
    ],
    [
      form('Interview preparation', [
        facts(p, ['interviewPlan', 'evidenceProcess', 'mutualQuestions']),
        grid(
          'Choose a manageable common core',
          ['Question / evidence needed', 'Standard / source', 'Who asks / follows up'],
          Array.from({ length: 5 }, () => [`${line}\n${line}`, line, line]),
        ),
        s(
          'Prepare the conversation',
          `Stage / interviewers / recorder / candidate questions / next step: ${line}`,
          'Select from the later question banks; do not ask the whole bank at once. Use the adopted definitions and follow evidence. Preserve concerns separately from personal preferences.',
        ),
      ]),
    ],
    [
      form('Reference and records procedure plan', [
        facts(p, ['referenceProcess', 'safetyProcess', 'safetyOwner', 'recordsPolicy']),
        grid(
          'Establish before use',
          ['Procedure', 'Proposal / qualified advice needed', 'Lead / report date'],
          [
            'Consent and current-ministry contact',
            'Reference selection and consistent record',
            'Appropriate professional checks',
            'Concern reporting and escalation',
            'Restricted access and retention / disposal',
          ].map((label) => [label, `${line}\n${line}`, line]),
        ),
        s(
          'Review and authorization',
          `Proper authority / adopted scope / approval record: ${line}`,
          'This is a planning sheet, not evidence of clearance. Do not put allegations, identity documents or background reports in ordinary committee binders.',
        ),
      ]),
    ],
    [
      form('Call and handoff requirements to confirm', [
        grid(
          'Verify under actual governing documents',
          ['Requirement / source', 'Evidence / unresolved question', 'Verified by / date'],
          [
            'Call authority and decision procedure',
            'Eligibility, notice, quorum and threshold if applicable',
            'Required services and meetings',
            'Adopted standards and required reviews',
            'Written terms and approvals',
            'Acceptance and start arrangements',
            'Authority, staffing, access and records handoff',
          ].map((title) => [title, `${line}\n${line}`, line]),
        ),
        s(
          'Record the actual result',
          `Unresolved requirements / owner / report date: ${line}`,
          `Actual decision / authority / date / decision record: ${line}`,
          'Use the current constitution, bylaws and adopted process. The checklist supplies no default threshold and does not establish permission to call.',
        ),
      ]),
    ],
  ];
}

export function makeWorkingPacket(p, id) {
  const definition = WORKING_PACKETS.find((d) => d.id === id);
  if (!definition) throw new Error('Working packet not found.');
  const church = answerValue(p, 'churchName') || 'Church name TBD';
  let groups;
  if (id === 'working-binder')
    groups = binderGroups(p).map((documents, i) => ({
      title: `${i + 1}. ${BINDER_TABS[i]}`,
      documents,
    }));
  else if (id === 'later-resources') {
    const laterIds = [
      'packet',
      'candidate',
      'process',
      'intake',
      'candidate-communication',
      'congregation',
      'faq',
      'prayer',
      'screening',
      'advancement-gates',
      'interviews',
      'question-bank',
      'scenarios',
      'interview-notes',
      'evaluation',
      'sermon-guide',
      'sermon-worksheet',
      'references',
      'reference-form',
      'safety',
      'visit',
      'announcement',
      'congregation-questions',
      'call',
      'terms',
      'handoff',
      'interim',
      'bivocational',
    ];
    const available = new Set(availableDocuments(p).map((d) => d.id));
    groups = laterIds
      .filter((key) => available.has(key))
      .map((key) => ({ title: makeDocument(p, key).title, documents: [makeDocument(p, key)] }));
  } else if (id === 'second-meeting') {
    groups = [{ title: definition.title, documents: [secondMeetingAgenda()] }];
  } else {
    const documents = [
      form('First meeting agenda', [
        s(
          'Purpose and expected result',
          'Organize the committee, establish a practical way of working and assign preparation. Introduce later work without trying to settle every question today.',
          `Date / time / location: ${line}`,
        ),
        schedule(),
      ]),
      roles(p),
      assignmentSheet(),
    ];
    if (id === 'chair-guide')
      documents.splice(
        1,
        0,
        form('Chair’s meeting prompts', [
          ...MEETING_PLAN.map(([, title, result]) =>
            s(
              title,
              result,
              title === 'Organizing formalities'
                ? 'Ask for nominations or follow the established selection method. Record the actual outcome. Do not assume the facilitator has been elected chair. Distinguish the committee minutes role from church staff roles.'
                : title === 'Assign the preparation work'
                  ? 'Read each proposed task. Ask who can lead, who can help and what can realistically be brought back. A lead may coordinate help from outside the committee under its authority.'
                  : title === 'Read back, next meeting and prayer'
                    ? 'Read the decisions, unresolved concerns, leads and dates aloud. Ask for corrections. Set a narrow purpose and limited reading for the next meeting.'
                    : `Ask: What can we record now, what needs a report, and who has authority to decide?\nDecision / follow-up: ${line}`,
            ),
          ),
          s(
            'At the next meeting',
            'Use Meeting record (tab 2) and Action follow-up (tab 1). A report received does not mean a recommendation was adopted. Update the agreed working master and export a backup.',
          ),
        ]),
      );
    documents.push(secondMeetingAgenda());
    groups = [{ title: definition.title, documents }];
  }
  return {
    ...definition,
    church,
    updatedAt: p.updatedAt,
    groups,
    audience: 'Internal',
    status: 'WORKING DRAFT — REVIEW BEFORE USE',
  };
}
