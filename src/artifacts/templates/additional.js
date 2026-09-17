import { QUESTIONS, FIELDS, MILESTONES } from '../../data.js';
import { answerValue } from '../../domain.js';
import {
  PRINCIPLES,
  SCORE_NOTICE,
  SERMON_CATEGORIES,
  REFERENCE_QUESTIONS,
  HANDOFF_ITEMS,
} from '../../content/guidance/principles.js';
export const EXTRA_DOCUMENTS = [
  ['candidate-communication', 'A06', 'Candidate Communication Checklist', 'Internal', 'process'],
  ['question-bank', 'R00', 'Interview Question Bank', 'Internal', 'interviews'],
  ['handbook', 'R01', 'Pulpit Committee Handbook', 'Internal', 'committee'],
  ['scenarios', 'R02', 'Scenario Question Bank', 'Internal', 'interviews'],
  ['interview-notes', 'A07', 'Candidate Interview Notes Sheet', 'Internal', 'interviews'],
  ['references', 'R03', 'Reference Check Guide', 'Internal', 'safety'],
  ['reference-form', 'A08', 'Reference Interview Form', 'Internal', 'safety'],
  ['safety', 'A09', 'Safety & Background Process Checklist', 'Internal', 'safety'],
  ['sermon-guide', 'R04', 'Sermon Evaluation Guide', 'Internal', 'sermons'],
  ['sermon-worksheet', 'A10', 'Sermon Review Worksheet', 'Internal', 'sermons'],
  ['faq', 'H08', 'Pastoral Search FAQ', 'Congregation', 'communication'],
  ['update', 'H09', 'Congregational Update Template', 'Congregation', 'communication'],
  ['prayer', 'H10', 'Prayer Update Template', 'Congregation', 'communication'],
  ['announcement', 'H11', 'Finalist Announcement Template', 'Congregation', 'communication'],
  ['communication-templates', 'R05', 'Communication Templates', 'Internal', 'communication'],
  ['visit', 'A11', 'Finalist Visit Checklist', 'Internal', 'call'],
  ['congregation-questions', 'H12', 'Congregational Question Guide', 'Congregation', 'call'],
  ['terms', 'A12', 'Written Call & Terms Checklist', 'Internal', 'call'],
  ['interim', 'R06', 'Interim Ministry Guidance', 'Internal', 'interim'],
  ['bivocational', 'R07', 'Bivocational Ministry Guidance', 'Internal', 'bivocational'],
  ['assessment', 'A13', 'Transition Self-Assessment', 'Internal', 'assessment'],
  ['advancement-gates', 'A14', 'Candidate Advancement Gates', 'Internal', 'process'],
].map(([id, code, title, audience, module]) => ({
  id,
  code,
  title,
  audience,
  module,
  description: {
    Internal: 'Guidance and a practical form for the committee.',
    Congregation: 'An editable draft for appropriate church communication.',
  }[audience],
}));
export function churchQuestions(p) {
  return p.requirements
    .filter((r) => r.category === 'conviction' && r.status === 'adopted' && r.statement.trim())
    .map((r) => ({
      id: `conviction-${r.id}`,
      kind: 'church',
      category: 'Adopted church conviction',
      title: 'Church-specific question',
      question: `Our church has recorded this conviction: “${r.statement}” How does it relate to your convictions and ministry practice? Where would clarification or charitable disagreement be needed?`,
    }));
}
export function selectedQuestions(p) {
  return [
    ...QUESTIONS.filter((q) => p.questions.includes(q.id)),
    ...churchQuestions(p),
    ...p.customQuestions.filter((q) => q.question.trim()),
  ];
}
export function extraSections(p, id, { section: s, fields: f, blankEvidence: b }) {
  const check = (heading, items) =>
    s(
      heading,
      ...items.map((item) => `☐ ${item}`),
      'Responsible person / target date: _________________________________',
    );
  const authority = answerValue(p, 'callAuthority') || '[TO BE CONFIRMED — final call authority]';
  const moduleFields = (module) => FIELDS.filter((x) => x.module === module).map((x) => x.id);
  switch (id) {
    case 'candidate-communication':
      return [
        ...f(p, ['liaison', 'candidateSteps', 'releaseProcess', 'seriousConsideration']),
        check('Each communication stage', [
          'Acknowledge a suggestion or résumé through the authorized channel',
          'Confirm permission before contacting a current church or reference',
          'Explain which stage the candidate has entered and what will happen next',
          'Give realistic update dates without promising an outcome',
          'Disclose whether serious conversations are proceeding with other candidates',
          'Respect withdrawal; confirm closure and records handling',
          'Communicate a release promptly and graciously; avoid unnecessary private details',
        ]),
        s(
          'Suggested release note',
          'Thank you for the time and care you have given this conversation. Following our adopted process, we will not be proceeding further at this stage. We are grateful for your willingness to help us discern faithfully. [Authorized contact and any agreed next steps.]',
        ),
      ];
    case 'question-bank':
      return [
        s(
          'A menu for staged conversations',
          'Select a manageable common core, then questions that fit your adopted doctrine, convictions, and evidence needs. These prompts do not adopt positions for your church. Do not ask the entire bank in one sitting.',
        ),
        ...QUESTIONS.filter((q) => q.kind !== 'scenario').map((q) =>
          s(`${q.kind === 'core' ? 'Core' : 'Follow-up'} · ${q.category}`, q.question),
        ),
        ...churchQuestions(p).map((q) => s(q.category, q.question)),
        ...p.customQuestions
          .filter((q) => q.kind !== 'scenario')
          .map((q) => s(`${q.kind} · ${q.title}`, q.question || '[Question to be written]')),
      ];
    case 'scenarios':
      return [
        s(
          'Explore judgment, not a diagnosis',
          'Ask how the candidate would listen, identify authority, seek evidence, respond patiently, and revisit a mistaken judgment. Consider temperament, humility, shepherding, and ability to receive criticism. These scenarios do not support psychological diagnoses.',
        ),
        ...QUESTIONS.filter((q) => q.kind === 'scenario')
          .concat(p.customQuestions.filter((q) => q.kind === 'scenario'))
          .map((q) =>
            s(
              q.category,
              q.question,
              'What would you do first? What information would you seek? What might cause you to change your approach?',
            ),
          ),
      ];
    case 'interview-notes':
      return [
        s(
          'Interview record',
          'Candidate reference: __________  Date / stage: __________',
          'Interviewers: __________________  Consent / records location: __________________',
          'Keep completed notes in the church’s secure records, not in this toolkit.',
        ),
        ...selectedQuestions(p).map((q) =>
          s(
            q.title,
            q.question,
            'Candidate’s answer / supporting examples: __________________________',
            ...b(),
          ),
        ),
        s(
          'Next conversation',
          'Question or evidence needed: ____________________________________',
          'Follow-up owner / date: _________________________________________',
          'Decision: ☐ Advance ☐ Pause for evidence ☐ Release graciously',
        ),
      ];
    case 'references':
      return [
        s(
          'Purpose and permission',
          'Seek specific firsthand observations, context, dates, and permission. Use the same character standards rather than collecting praise. Distinguish what a reference observed from hearsay or interpretation.',
          'Consider current/former pastors, ministry coworkers, church members, personal references, and appropriately selected additional references. Respect the candidate’s current ministry and agreed timing.',
        ),
        ...f(p, ['referenceProcess', 'safetyOwner']),
        s('Suggested questions', ...REFERENCE_QUESTIONS),
        s(
          'Follow-through',
          'Record who spoke, the relationship, permission, date, interviewer, notes, and unresolved concerns. Give concerns an owner and next step. Do not infer clearance from an unanswered call or a vague endorsement.',
        ),
      ];
    case 'reference-form':
      return [
        s(
          'Secure reference record',
          'Candidate reference: __________  Reference name / role: __________',
          'Relationship and length of acquaintance: __________________________',
          'Permission and contact method: __________________________________',
          'Date / interviewer: _____________________________________________',
        ),
        ...REFERENCE_QUESTIONS.map((q) =>
          s(
            q,
            'Notes / specific firsthand examples: ______________________________',
            '________________________________________________________________',
          ),
        ),
        s(
          'Unresolved concerns and next steps',
          ...b(),
          'Committee review / date: _________________________________________',
        ),
      ];
    case 'safety':
      return [
        ...f(p, ['referenceProcess', 'safetyProcess', 'safetyOwner', 'safetyComplete']),
        check('Plan and verify the review', [
          'Use qualified professional/legal advice to establish consent, scope, and applicable obligations',
          'Verify identity, credentials, ministry history, and unexplained gaps through appropriate channels',
          'Complete authorized background/criminal-history review where appropriate',
          'Consider financial-integrity concerns relevant to the ministry role',
          'Review abuse-prevention policies, accountability, and response procedures',
          'Resolve or properly escalate material concerns; record the authorized decision',
          'Restrict access, retain required records, and follow the adopted disposal policy',
        ]),
        s(
          'Protect sensitive information',
          'These are planning prompts, not legal conclusions or a background-check service. Do not record Social Security numbers, reports, allegations, or identity documents in these ordinary worksheets. Use appropriate secure professional processes.',
        ),
      ];
    case 'sermon-guide':
      return [
        s(
          'Optional practice',
          'Use representative sermons and the church’s adopted doctrinal framework. Listen more than once if needed. Evaluate faithful teaching and shepherding rather than entertainment, charisma, polish, volume, humor, or platform presence.',
        ),
        ...f(p, ['sermonPlan']),
        s('Review categories', ...SERMON_CATEGORIES),
        s(
          'Discuss evidence',
          'Record a passage, quotation, or timestamp for each observation. Distinguish a textual or doctrinal concern from your preferred style. Seek clarification rather than assigning motives.',
        ),
      ];
    case 'sermon-worksheet':
      return [
        s(
          'Listening record',
          'Candidate reference: __________  Reviewer / date: __________',
          'Scripture passage / sermon title: _________________________________',
          'Recording or source / date preached: ______________________________',
        ),
        ...SERMON_CATEGORIES.map((category) =>
          s(
            category,
            'Observation / passage or timestamp: ______________________________',
            'Clarification question: __________________________________________',
          ),
        ),
        s(
          'Review conclusion',
          'Faithful strengths: ______________________________________________',
          'Material concerns requiring clarification: __________________________',
          'Personal style preferences (kept separate): _________________________',
          'Next action / owner / date: _______________________________________',
        ),
      ];
    case 'faq':
      return [
        s(
          'Who calls the pastor?',
          authority,
          'The committee acts only within its recorded authority. Consult the actual governing documents for the decision procedure.',
        ),
        ...f(p, ['updateRhythm', 'questionChannel', 'candidateSteps', 'sharingBoundaries']),
        s(
          'Why are candidate names not always shared?',
          'Confidentiality is not secrecy. The church should know the process and its progress. Private résumés, reference details, identities before agreed disclosure, and deliberations do not need general circulation.',
        ),
        s(
          'How quickly should we finish?',
          'Follow the church’s adopted process with patience. A vacant pulpit does not justify bypassing qualifications or rushing a call.',
        ),
        s(
          'What can members do now?',
          'Continue prayer, worship, care, evangelism, discipleship, missions, and service. Submit suggestions and questions through the approved channel.',
        ),
      ];
    case 'update':
      return [
        s(
          'Editable process update',
          answerValue(p, 'updateTemplate') ||
            'Our current phase is [phase]. Since our last update, [completed work]. Next we will [next steps]. Members may participate by [approved participation]. Please direct questions to [channel]. Our next update is planned for [date].',
        ),
        ...f(p, ['publicUpdate', 'updateRhythm', 'questionChannel']),
        s(
          'Release check',
          'Confirm the phase, facts, dates, and approval before sharing. Keep private candidate identities and deliberations out of ordinary process updates.',
        ),
      ];
    case 'prayer':
      return [
        s(
          'Editable prayer update',
          answerValue(p, 'prayerTemplate') ||
            'Please pray for wisdom, patience, unity in truth, and faithfulness in our ongoing ministry. Remember those affected by the transition, those carrying extra responsibilities, prospective pastors and their families, and their current churches. This week we especially ask prayer for [approved request].',
        ),
        s(
          'Continued ministry',
          'Our church continues to worship, teach, care, serve, and share the gospel throughout this transition.',
        ),
      ];
    case 'announcement':
      return [
        s(
          'Editable finalist announcement',
          answerValue(p, 'announcementTemplate') ||
            'With appropriate authorization and the prospective pastor’s agreement, we plan to introduce [name] on [date]. The approved schedule is [schedule]. Information and questions may be directed to [contact]. The decision will follow [verified governing procedure].',
        ),
        ...f(p, ['finalistCommunication', 'callAuthority', 'visitPlan']),
        s(
          'Before release',
          'Verify candidate consent, authoritative notice requirements, the schedule, approved disclosure, and the proper decision authority. Placeholders are not facts or formal notice.',
        ),
      ];
    case 'communication-templates':
      return [
        ...extraSections(p, 'update', { section: s, fields: f, blankEvidence: b }),
        ...extraSections(p, 'prayer', { section: s, fields: f, blankEvidence: b }),
        ...extraSections(p, 'announcement', { section: s, fields: f, blankEvidence: b }),
        ...f(p, ['rumorResponse']),
        s(
          'Suggested response to a rumor',
          'Thank you for raising your concern. Please use [trusted channel] so an authorized person can respond accurately. We can share [approved process information]. We will protect private information and investigate concerns through the proper process.',
        ),
      ];
    case 'visit':
      return [
        ...f(p, ['visitPlan', 'disclosure', 'liaison']),
        check('Before the visit', [
          'Confirm gates, references, safety work, final responsibilities, and compensation',
          'Provide the candidate packet and authoritative governing/doctrinal documents',
          'Arrange travel, lodging, expenses, rest, and family needs',
          'Agree on preaching, leadership conversations, congregation interaction, and questions',
          'Allow the candidate to ask direct questions privately and evaluate the church honestly',
          'Check the actual notice, meeting, eligibility, quorum, and voting rules where applicable',
          'Agree who communicates next steps and when; avoid pressure for an immediate answer',
        ]),
      ];
    case 'congregation-questions':
      return [
        s(
          'Purpose',
          'Ask respectful, relevant questions consistent with the adopted doctrine, responsibilities, and search process. Allow honest answers. Avoid private family questions or confidential matters already entrusted to the appropriate reviewers.',
        ),
        s(
          'Possible questions',
          'How do you prepare to teach Scripture faithfully?',
          'How do you help members care for one another and grow as disciples?',
          'How do you listen when someone disagrees with you?',
          'What would you seek to learn during your first year?',
          'What questions do you have for our church?',
        ),
        ...f(p, ['questionChannel', 'callAuthority']),
      ];
    case 'terms':
      return [
        ...f(p, ['writtenTerms', 'compStatus', 'compFinal', 'positionApproved', 'callAuthority']),
        check('Confirm the written arrangement', [
          'Responsibilities and limits of authority',
          'Reporting and relationship to church leaders',
          'Salary, housing, benefits, reimbursements, leave, and approval status',
          'Work pattern, outside employment, family boundaries, and emergency coverage',
          'Proposed start, moving, housing, and transition arrangements',
          'Acceptance process and signatures of authorized parties',
          'Appropriate legal, tax, employment, and safeguarding review',
          'Copies retained securely by the church and incoming pastor',
        ]),
      ];
    case 'interim':
      return [
        s(
          'Temporary service with clear boundaries',
          'An interim does not automatically become the next pastor. Confirm appointment authority, responsibilities, duration, compensation, search boundaries, and the end of temporary authority.',
        ),
        ...f(p, ['interimTerms', 'interimCandidacy', 'interimBoundaries', 'internalSafeguards']),
        s(
          'If candidacy is permitted',
          'Use an explicit adopted decision, equal standards, recusal, restricted confidential access, and independent oversight. Do not let temporary authority become influence over the selection process.',
        ),
        s(
          'Handoff',
          'Agree on the conclusion of the interim role, records transfer, pastoral-care continuity, and communication of incoming authority.',
        ),
      ];
    case 'bivocational':
      return [
        s(
          'A sustainable pastoral partnership',
          'Bivocational ministry is not an inferior pastoral model. Build the role around actual availability, adequate preparation time, shared care, delegation, rest, and outside employment.',
        ),
        ...f(p, [
          'pastoralModel',
          'availableHours',
          'sharedCoverage',
          'sustainabilityReview',
          'workPattern',
          'outsideWork',
          'salary',
          'compStatus',
        ]),
        s(
          'Review together',
          'Revisit workload and support regularly. Define emergency coverage while the pastor is working elsewhere. Do not assume the pastor’s spouse will absorb unpaid responsibilities.',
        ),
      ];
    case 'assessment':
      return [
        s(
          'Recommended reflection; optional tool',
          'Discuss honestly with appropriate leaders. This is not a church health score. Keep private allegations or pastoral-care histories in appropriate secure channels.',
        ),
        ...f(p, moduleFields('assessment')),
        s(
          'Shared next steps',
          'What can the church address now? __________________________________',
          'What belongs to members or other leaders? __________________________',
          'Responsible role / first action / review date: ________________________',
        ),
      ];
    case 'advancement-gates':
      return [
        s('Actual requirements, then ministry fit', SCORE_NOTICE),
        ...f(p, ['gates', 'advanceAuthority', 'recommendAuthority']),
        ...[
          'Adopted doctrine',
          'Biblical pastoral qualifications',
          'Governing integrity',
          'Church-adopted convictions',
          'Required references and safety review',
        ].map((title) =>
          s(
            title,
            'Requirement / source: ____________________________________________',
            ...b(),
            'Decision: ☐ Established ☐ Not yet established ☐ Needs clarification ☐ Material concern ☐ Disqualifying',
          ),
        ),
        s(
          'Authorized next step',
          '☐ Advance  ☐ Pause for evidence  ☐ Release graciously',
          'Decision-maker / reasons / date: __________________________________',
        ),
      ];
    case 'handbook':
      return [
        ...PRINCIPLES.map(([title, body]) => s(title, body)),
        s(
          'Know the authority behind a prompt',
          'Scripture framework; church-adopted doctrine or governing requirements; configured process; toolkit recommendation; optional practice. Never treat an example as a binding rule.',
        ),
        s('Stage map', ...MILESTONES.map((m) => `${m.title}: ${m.description}`)),
        ...f(p, [
          'committeeAuthority',
          'contactAuthority',
          'decisionRules',
          'confidentiality',
          'conflicts',
          'recordsPolicy',
          'prospectPool',
          'seriousConsideration',
        ]),
        s(
          'Interviews, references, and evidence',
          'Choose a manageable core from the bank, add adopted-conviction questions, and follow actual evidence. Record firsthand sources and clarification needs. Use consent and qualified safety review; keep private records securely outside the toolkit.',
        ),
        s(
          'Discernment',
          SCORE_NOTICE,
          'Do not rank candidates automatically. Record gates, evidence, concerns, and an authorized advance, pause, or release decision.',
        ),
        s('Handoff checklist', ...HANDOFF_ITEMS.map((x) => `☐ ${x}`)),
      ];
    default:
      return null;
  }
}
