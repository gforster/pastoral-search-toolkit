import type { PastoralSearchProject } from '../schema/pastoral-search-project';
import {
  MemberSchema,
  CandidateSchema,
  EvidenceSchema,
  RoundSchema,
  DecisionSchema,
  ReviewPacketSchema,
  CompletedReviewSchema,
  ReviewWorkSchema,
  validateReviewResponses,
  rejectUnsafeKeys,
  type Member,
  type Candidate,
  type Evidence,
  type Round,
  type Snapshot,
  type CompletedReview,
  type ReviewPacket,
  type ReviewWork,
  type Decision,
} from '../schema/collaboration';
import { QUALIFICATIONS } from '../data.js';
import { invalidateReviews } from './project.js';

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const requireValue = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};
export const MAX_REVIEW_BYTES = 750_000;
export const IDENTITY_NOTICE =
  'Reviewer name is self-entered. Local mode does not verify identity or voting eligibility.';
export const SENSITIVE_NOTICE =
  'This backup contains private pastoral-search information. Store and share it securely.';
export const REVIEW_TYPES = {
  sermon: 'Sermon review',
  materials: 'Candidate materials review',
  interview: 'Interview review',
  qualifications: 'Qualification evidence review',
  general: 'General candidate review',
};
export const CANDIDATE_STATUSES = {
  PROSPECT: 'Prospect',
  INITIAL_REVIEW: 'Initial review',
  GATE_REVIEW: 'Gate review',
  INTERVIEWING: 'Interviewing',
  REFERENCES: 'References',
  PAUSED: 'Paused for evidence',
  FINALIST: 'Finalist',
  RELEASED: 'Released',
  WITHDRAWN: 'Withdrawn',
  CALLED: 'Called',
  SEARCH_CLOSED: 'Search closed',
};
export const FINDINGS = {
  not_reviewed: 'Not reviewed / evidence missing',
  no_concern: 'No concern noted in this evidence',
  clarify: 'Clarification needed',
  concern: 'Concern to discuss',
  material_concern: 'Material concern - committee review required',
};
export const DECISIONS = {
  ADVANCE: 'Advance',
  PAUSE_FOR_EVIDENCE: 'Pause for evidence',
  RELEASE: 'Release graciously',
  FINALIST: 'Approve finalist presentation',
  WITHDRAWN: 'Record withdrawal',
  CALLED: 'Record church call',
  GATE_CLEARED: 'Record gate cleared',
  COMMITTEE_ORGANIZED: 'Committee organized',
  QUALIFICATIONS_ADOPTED: 'Qualifications adopted',
  READY_TO_SEARCH: 'Search authorized by the committee',
  CANDIDATE_PROCESS_ADOPTED: 'Candidate process adopted',
  COMPENSATION_APPROVED: 'Compensation approved',
  OTHER: 'Other committee decision',
};
const templates: Record<string, [string, string, boolean][]> = {
  sermon: [
    ['text', 'Biblical / textual faithfulness', false],
    ['clarity', 'Clarity', false],
    ['doctrine', 'Doctrine', true],
    ['application', 'Application', false],
    ['tone', 'Pastoral tone', false],
  ],
  materials: [
    ['history', 'Resume / ministry history', false],
    ['testimony', 'Testimony', false],
    ['doctrine', 'Doctrinal responses', true],
    ['materials', 'Other written materials', false],
  ],
  interview: [
    ['observations', 'Observations and examples', false],
    ['clarity', 'Areas needing clarification', false],
    ['strengths', 'Strengths observed', false],
    ['integrity', 'Character and accountability', true],
  ],
  general: [
    ['observations', 'Observations and evidence', false],
    ['doctrine', 'Doctrinal agreement', true],
    ['qualifications', 'Biblical qualifications', true],
    ['governance', 'Constitutional integrity', true],
  ],
};
export function candidateById(p: PastoralSearchProject, candidateId: string): Candidate {
  const c = p.collaboration.candidates.find((x) => x.id === candidateId);
  if (!c) throw new Error('Candidate not found in this search.');
  return c;
}
export function roundById(p: PastoralSearchProject, roundId: string): Round {
  const r = p.collaboration.rounds.find((x) => x.id === roundId);
  if (!r) throw new Error('Review round not found in this search.');
  return r;
}
export function addMember(p: PastoralSearchProject, input: Omit<Member, 'id'>): Member {
  requireValue(p.collaboration.members.length < 50, 'This search already has 50 members.');
  const m = MemberSchema.parse({ ...input, name: input.name.trim(), id: id() });
  p.collaboration.members.push(m);
  return m;
}
export function updateMember(
  p: PastoralSearchProject,
  memberId: string,
  input: Omit<Member, 'id'>,
) {
  const i = p.collaboration.members.findIndex((m) => m.id === memberId);
  requireValue(i >= 0, 'Member not found.');
  p.collaboration.members[i] = MemberSchema.parse({
    ...input,
    name: input.name.trim(),
    id: memberId,
  });
}
export function addCandidate(p: PastoralSearchProject, name: string, context = ''): Candidate {
  requireValue(
    p.collaboration.candidates.length < 100,
    'This search already has 100 candidate records.',
  );
  const c = CandidateSchema.parse({
    id: id(),
    name: name.trim(),
    context,
    status: 'PROSPECT',
    stage: 'Initial materials',
    evidenceNeeded: '',
    createdAt: now(),
    updatedAt: now(),
    evidence: [],
    progress: {
      questionnaire: 'not_started',
      interview: 'not_started',
      referencesDone: 0,
      referencesExpected: 0,
      safety: 'not_started',
    },
  });
  p.collaboration.candidates.push(c);
  return c;
}
export function updateCandidate(
  p: PastoralSearchProject,
  candidateId: string,
  input: Pick<Candidate, 'name' | 'context' | 'status' | 'stage' | 'evidenceNeeded' | 'progress'>,
) {
  const c = candidateById(p, candidateId);
  const clean = CandidateSchema.parse({
    ...c,
    ...input,
    name: input.name.trim(),
    updatedAt: now(),
  });
  requireValue(
    clean.progress.referencesDone <= clean.progress.referencesExpected,
    'Completed references cannot exceed expected references.',
  );
  Object.assign(c, clean);
}
export function saveEvidence(
  p: PastoralSearchProject,
  candidateId: string,
  input: Omit<Evidence, 'id' | 'updatedAt'>,
  evidenceId?: string,
): Evidence {
  const c = candidateById(p, candidateId);
  const existing = evidenceId ? c.evidence.find((e) => e.id === evidenceId) : null;
  requireValue(!evidenceId || existing, 'Evidence not found for this candidate.');
  requireValue(
    existing || c.evidence.length < 100,
    'This candidate already has 100 evidence references.',
  );
  const evidence = EvidenceSchema.parse({
    ...input,
    title: input.title.trim(),
    id: evidenceId || id(),
    updatedAt: now(),
  });
  if (existing) Object.assign(existing, evidence);
  else c.evidence.push(evidence);
  c.updatedAt = now();
  return evidence;
}
function contextFor(p: PastoralSearchProject, type: string, includeDoctrine: boolean) {
  const context: { label: string; text: string }[] = [];
  if (includeDoctrine) {
    const a = p.answers.doctrineText;
    context.push({
      label: 'Church-recorded adopted doctrinal statement',
      text: a?.status === 'known' ? a.value : 'Not recorded',
    });
  }
  if (type === 'qualifications') {
    context.push({
      label: 'Qualification adoption state',
      text: `${p.answers.qualificationAdoption?.status || 'unknown'}: ${p.answers.qualificationAdoption?.value || 'Not adopted'}`,
    });
    for (const q of QUALIFICATIONS) {
      const def = p.qualifications[q.id];
      context.push({
        label: q.title + ' (' + q.reference + ')',
        text: ['meaning', 'evidence', 'disqualifying', 'questions']
          .map((k) => `${k}: ${def?.[k as keyof typeof def] || 'Not recorded'}`)
          .join('\n'),
      });
    }
  }
  return context;
}
export function createRound(
  p: PastoralSearchProject,
  candidateId: string,
  input: {
    title: string;
    reviewType: Round['reviewType'];
    instructions: string;
    expectedIds: string[];
    evidenceIds: string[];
    includeDoctrine: boolean;
    extraCriterion?: string;
  },
): Round {
  const c = candidateById(p, candidateId);
  requireValue(p.collaboration.rounds.length < 200, 'This search already has 200 review rounds.');
  requireValue(
    new Set(input.expectedIds).size === input.expectedIds.length,
    'Select each expected reviewer once.',
  );
  const expected = input.expectedIds.map((memberId) => {
    const m = p.collaboration.members.find((x) => x.id === memberId && x.active);
    requireValue(m, 'Choose an active committee member.');
    return { id: m!.id, name: m!.name };
  });
  const evidence = input.evidenceIds.map((evidenceId) => {
    const item = c.evidence.find((x) => x.id === evidenceId);
    requireValue(item, 'Evidence belongs to another candidate or is missing.');
    return structuredClone(item!);
  });
  requireValue(
    new Set(input.evidenceIds).size === input.evidenceIds.length,
    'Select evidence once.',
  );
  if (input.includeDoctrine)
    requireValue(
      p.answers.doctrineText?.status === 'known' && p.answers.doctrineText.value.trim(),
      'Record the actual adopted doctrine before including it in a packet.',
    );
  const criteria =
    input.reviewType === 'qualifications'
      ? QUALIFICATIONS.map((q) => ({
          id: q.id,
          label: q.title,
          prompt: q.reference,
          hardGate: true,
        }))
      : (templates[input.reviewType] || []).map(([key, label, hardGate]) => ({
          id: key,
          label,
          prompt:
            'Record what you observed, the evidence for it and any clarification needed. This is an individual observation, not a committee gate decision.',
          hardGate,
        }));
  if (input.reviewType === 'qualifications')
    requireValue(
      p.answers.qualificationAdoption?.status === 'known' &&
        p.answers.qualificationAdoption.value === 'approved' &&
        QUALIFICATIONS.every((q) =>
          ['meaning', 'evidence', 'disqualifying', 'questions'].every((k) =>
            p.qualifications[q.id]?.[k as keyof (typeof p.qualifications)[string]]?.trim(),
          ),
        ),
      'Adopt all 26 working definitions in the workbook before assigning a qualification evidence review.',
    );
  if (input.extraCriterion?.trim())
    criteria.push({
      id: id(),
      label: input.extraCriterion.trim(),
      prompt: 'Additional topic requested by the chair; record specific evidence.',
      hardGate: false,
    });
  const r = RoundSchema.parse({
    id: id(),
    candidateId,
    title: input.title.trim(),
    reviewType: input.reviewType,
    instructions: input.instructions,
    expected,
    createdAt: now(),
    updatedAt: now(),
    state: 'open',
    snapshot: {
      id: id(),
      templateVersion: 1,
      includeDoctrine: input.includeDoctrine,
      criteria,
      context: contextFor(p, input.reviewType, input.includeDoctrine),
      evidence,
    },
    submissions: [],
  });
  // A packet must remain portable; fail before saving an over-large assignment.
  requireValue(
    new TextEncoder().encode(JSON.stringify(r)).length < MAX_REVIEW_BYTES - 5000,
    'This assignment is too large. Include fewer evidence references or less context.',
  );
  p.collaboration.rounds.push(r);
  return r;
}
export function staleRound(p: PastoralSearchProject, r: Round): boolean {
  if (
    JSON.stringify(contextFor(p, r.reviewType, r.snapshot.includeDoctrine)) !==
    JSON.stringify(r.snapshot.context)
  )
    return true;
  const c = candidateById(p, r.candidateId);
  return r.snapshot.evidence.some(
    (old) => JSON.stringify(c.evidence.find((x) => x.id === old.id)) !== JSON.stringify(old),
  );
}
export function setRoundState(p: PastoralSearchProject, roundId: string, state: Round['state']) {
  const r = roundById(p, roundId);
  requireValue(
    state === 'open' ||
      (state === 'closed' && r.state === 'open') ||
      (state === 'released' && r.state === 'closed'),
    'Close submissions before releasing the compilation.',
  );
  r.state = state;
  r.updatedAt = now();
}
export function reviewPacket(
  p: PastoralSearchProject,
  roundId: string,
  memberId: string | null,
): ReviewPacket {
  const r = roundById(p, roundId);
  requireValue(r.state === 'open', 'Reopen this round before assigning more reviews.');
  const c = candidateById(p, r.candidateId);
  const recipient = memberId ? r.expected.find((m) => m.id === memberId) : null;
  requireValue(!memberId || recipient, 'Select an expected reviewer from this round.');
  requireValue(
    !r.expected.length || recipient,
    'Choose the recipient so participation can be counted.',
  );
  return ReviewPacketSchema.parse({
    format: 'pastoral-search-review-packet',
    schemaVersion: 1,
    projectFingerprint: p.collaboration.fingerprint,
    churchName:
      p.answers.churchName?.status === 'known' ? p.answers.churchName.value.slice(0, 300) : '',
    candidate: { id: c.id, name: c.name },
    roundId: r.id,
    title: r.title,
    reviewType: r.reviewType,
    createdAt: r.createdAt,
    instructions: r.instructions,
    snapshot: structuredClone(r.snapshot),
    recipient: recipient || null,
  });
}
function parseFile(text: string) {
  requireValue(
    typeof text === 'string' && new TextEncoder().encode(text).length <= MAX_REVIEW_BYTES,
    'Choose a review JSON file smaller than 750 KB.',
  );
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This is not a valid review JSON file.');
  }
  rejectUnsafeKeys(raw);
  return raw;
}
export function importReviewPacket(text: string): ReviewPacket {
  const result = ReviewPacketSchema.safeParse(parseFile(text));
  requireValue(
    result.success,
    'This is not a supported review packet. Ask the chair for a current packet.',
  );
  const packet = result.data!;
  requireValue(
    new Set(packet.snapshot.criteria.map((c) => c.id)).size === packet.snapshot.criteria.length,
    'Packet contains duplicate criteria.',
  );
  return packet;
}
export function serializeReviewPacket(packet: ReviewPacket) {
  const text = JSON.stringify(ReviewPacketSchema.parse(packet), null, 2);
  requireValue(
    new TextEncoder().encode(text).length <= MAX_REVIEW_BYTES,
    'The packet exceeds 750 KB. Create a smaller assignment with fewer evidence references or less context.',
  );
  return text;
}
export function newReviewWork(packet: ReviewPacket): ReviewWork {
  return ReviewWorkSchema.parse({
    id: id(),
    revision: 0,
    packet,
    reviewer: {
      name: packet.recipient?.name || '',
      initials: '',
      memberId: packet.recipient?.id || null,
    },
    responses: Object.fromEntries(
      packet.snapshot.criteria.map((c) => [c.id, { finding: 'not_reviewed', notes: '' }]),
    ),
    observations: '',
    concerns: '',
    concernSeverity: 'concern',
    proposedQuestions: '',
    questionTopic: 'General',
    submittedAt: null,
    modifiedAt: now(),
  });
}
export function validateReviewWork(input: unknown): ReviewWork {
  rejectUnsafeKeys(input);
  const w = ReviewWorkSchema.parse(input);
  validateReviewResponses(w, w.packet.snapshot);
  requireValue(
    w.reviewer.memberId === (w.packet.recipient?.id || null),
    'Reviewer assignment does not match the packet.',
  );
  return w;
}
export function completedReview(work: ReviewWork): CompletedReview {
  const w = validateReviewWork(work);
  requireValue(w.reviewer.name.trim(), 'Enter the reviewer’s display name.');
  const lines = (s: string) =>
    s
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
  const review = CompletedReviewSchema.parse({
    format: 'pastoral-search-review',
    schemaVersion: 1,
    id: w.id,
    projectFingerprint: w.packet.projectFingerprint,
    candidateId: w.packet.candidate.id,
    roundId: w.packet.roundId,
    snapshotId: w.packet.snapshot.id,
    templateVersion: w.packet.snapshot.templateVersion,
    reviewType: w.packet.reviewType,
    reviewer: { ...w.reviewer, name: w.reviewer.name.trim() },
    submittedAt: w.submittedAt || now(),
    modifiedAt: now(),
    responses: w.responses,
    observations: w.observations,
    concerns: lines(w.concerns).map((text) => ({
      category: 'General',
      severity: w.concernSeverity,
      text,
    })),
    proposedQuestions: lines(w.proposedQuestions).map((text) => ({ topic: w.questionTopic, text })),
  });
  return review;
}
export function exportCompletedReview(work: ReviewWork): string {
  const review = completedReview(work);
  const text = JSON.stringify(review, null, 2);
  requireValue(
    new TextEncoder().encode(text).length <= MAX_REVIEW_BYTES,
    'The review exceeds 750 KB. Shorten the notes or ask the chair to divide the review activity before exporting.',
  );
  work.submittedAt = review.submittedAt;
  work.modifiedAt = review.modifiedAt;
  return text;
}
export function parseCompletedReview(text: string): CompletedReview {
  const result = CompletedReviewSchema.safeParse(parseFile(text));
  requireValue(result.success, 'This is not a supported completed review file.');
  const review = result.data!;
  requireValue(review.reviewer.name.trim(), 'The submission has no reviewer name.');
  requireValue(
    Date.parse(review.modifiedAt) >= Date.parse(review.submittedAt),
    'The review modification predates its original submission.',
  );
  return review;
}
const normalize = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]+/gu, ' ')
    .trim();
function sameReviewer(a: CompletedReview, b: CompletedReview) {
  if (a.reviewer.memberId && b.reviewer.memberId)
    return a.reviewer.memberId === b.reviewer.memberId;
  return (
    normalize(a.reviewer.name) === normalize(b.reviewer.name) &&
    normalize(a.reviewer.initials) === normalize(b.reviewer.initials)
  );
}
export function inspectReviewImport(
  p: PastoralSearchProject,
  roundId: string,
  review: CompletedReview,
) {
  const r = roundById(p, roundId);
  CompletedReviewSchema.parse(review);
  requireValue(review.reviewer.name.trim(), 'The submission has no reviewer name.');
  requireValue(
    Date.parse(review.modifiedAt) >= Date.parse(review.submittedAt),
    'The review modification predates its original submission.',
  );
  requireValue(
    review.projectFingerprint === p.collaboration.fingerprint,
    'Different search project: this review cannot be imported here. Open the matching search or ask the reviewer to use its packet.',
  );
  requireValue(
    review.candidateId === r.candidateId,
    'Different candidate: open the matching candidate and round.',
  );
  requireValue(
    review.roundId === r.id,
    'Different review round: open the round that assigned this review.',
  );
  requireValue(
    review.snapshotId === r.snapshot.id &&
      review.templateVersion === r.snapshot.templateVersion &&
      review.reviewType === r.reviewType,
    'Different criteria snapshot: the review cannot be rebound. Use the original round or request a new review.',
  );
  requireValue(
    !review.reviewer.memberId || r.expected.some((x) => x.id === review.reviewer.memberId),
    'The reviewer assignment does not belong to this round.',
  );
  validateReviewResponses(review, r.snapshot);
  const sameId = r.submissions.find((s) => s.review.id === review.id);
  if (sameId)
    requireValue(
      sameReviewer(sameId.review, review),
      'This review ID is already associated with a different reviewer.',
    );
  const existing = sameId || r.submissions.find((s) => sameReviewer(s.review, review));
  return {
    existing,
    duplicate: !!existing,
    exact: existing ? JSON.stringify(existing.review) === JSON.stringify(review) : false,
    stale: staleRound(p, r),
    late: r.state !== 'open',
  };
}
export function importCompletedReview(
  p: PastoralSearchProject,
  roundId: string,
  review: CompletedReview,
  options: { replace?: boolean; acceptStale?: boolean } = {},
) {
  const r = roundById(p, roundId),
    check = inspectReviewImport(p, roundId, review);
  requireValue(
    !check.late,
    'Submissions are closed. Explicitly reopen the round before importing a late or revised review.',
  );
  requireValue(
    !check.stale || options.acceptStale,
    'Criteria or evidence changed after assignment. Confirm import against the original snapshot, or request a new round.',
  );
  requireValue(
    !check.duplicate || options.replace,
    'Duplicate review or reviewer detected. Skip it or explicitly replace while preserving the previous revision.',
  );
  const incoming = structuredClone(review);
  if (check.existing) {
    requireValue(
      check.existing.previous.length < 10,
      'This review already has 10 archived revisions. Preserve a backup and use a new round.',
    );
    requireValue(
      Date.parse(incoming.modifiedAt) >= Date.parse(check.existing.review.modifiedAt),
      'This file is older than the stored submission. Keep the newer review or ask the reviewer for a current export.',
    );
    const first = check.existing.review.submittedAt;
    check.existing.previous.push({
      review: structuredClone(check.existing.review),
      importedAt: check.existing.importedAt,
    });
    incoming.submittedAt = first;
    check.existing.review = incoming;
    check.existing.importedAt = now();
  } else {
    requireValue(r.submissions.length < 100, 'This round already has 100 reviews.');
    r.submissions.push({ review: incoming, importedAt: now(), previous: [] });
  }
  r.updatedAt = now();
  return check;
}
export function participation(r: Round) {
  const received = new Set(r.submissions.map((s) => s.review.reviewer.memberId).filter(Boolean));
  return {
    expected: r.expected.length,
    received: r.expected.filter((x) => received.has(x.id)).length,
    total: r.submissions.length,
    additional: r.submissions.filter((s) => !s.review.reviewer.memberId).length,
    missing: r.expected.filter((x) => !received.has(x.id)),
  };
}
export function compileRound(r: Round) {
  requireValue(
    r.state === 'released',
    'Close submissions and release the compilation before group discussion.',
  );
  const reviews = r.submissions.map((s) => s.review);
  const distributions = r.snapshot.criteria.map((criterion) => ({
    criterion,
    counts: Object.keys(FINDINGS).map((finding) => ({
      finding,
      count: reviews.filter((r) => r.responses[criterion.id]?.finding === finding).length,
    })),
    observations: reviews.map((review) => ({
      reviewer: review.reviewer.name,
      reviewId: review.id,
      ...review.responses[criterion.id],
    })),
    divergent:
      new Set(
        reviews.map((r) => r.responses[criterion.id]?.finding).filter((v) => v !== 'not_reviewed'),
      ).size > 1,
  }));
  const concerns = reviews.flatMap((review) => [
    ...review.concerns.map((c) => ({ ...c, reviewer: review.reviewer.name, reviewId: review.id })),
    ...r.snapshot.criteria
      .filter((c) =>
        ['concern', 'material_concern', 'clarify'].includes(review.responses[c.id].finding),
      )
      .map((c) => ({
        category: c.label,
        severity:
          review.responses[c.id].finding === 'material_concern'
            ? 'material'
            : review.responses[c.id].finding === 'clarify'
              ? 'clarification'
              : 'concern',
        text:
          review.responses[c.id].notes ||
          'Reviewer selected a concern without supporting notes. Ask for evidence.',
        reviewer: review.reviewer.name,
        reviewId: review.id,
      })),
  ]);
  const questions = new Map<
    string,
    {
      text: string;
      topic: string;
      originals: { reviewer: string; reviewId: string; text: string }[];
    }
  >();
  for (const review of reviews)
    for (const q of review.proposedQuestions) {
      const key = normalize(q.topic) + '|' + normalize(q.text);
      const group = questions.get(key) || { text: q.text, topic: q.topic, originals: [] };
      group.originals.push({ reviewer: review.reviewer.name, reviewId: review.id, text: q.text });
      questions.set(key, group);
    }
  return {
    participation: participation(r),
    distributions,
    concerns,
    materialConcern: concerns.some((c) => c.severity === 'material'),
    questions: [...questions.values()].map((g) => ({
      ...g,
      reviewerCount: new Set(g.originals.map((o) => o.reviewId)).size,
    })),
    reviews,
  };
}
export function addDecision(
  p: PastoralSearchProject,
  input: Omit<Decision, 'id' | 'createdAt'>,
): Decision {
  requireValue(p.collaboration.decisions.length < 1000, 'This search already has 1000 decisions.');
  if (input.candidateId) candidateById(p, input.candidateId);
  const candidateTypes = [
    'ADVANCE',
    'PAUSE_FOR_EVIDENCE',
    'RELEASE',
    'FINALIST',
    'WITHDRAWN',
    'CALLED',
    'GATE_CLEARED',
  ];
  requireValue(
    !candidateTypes.includes(input.type) || input.candidateId,
    'Select the candidate for this decision.',
  );
  requireValue(
    candidateTypes.includes(input.type) || input.type === 'OTHER' || !input.candidateId,
    'Select Shared project for a church-wide decision.',
  );
  const d = DecisionSchema.parse({
    ...input,
    rationale: input.rationale.trim(),
    recordedBy: input.recordedBy.trim(),
    id: id(),
    createdAt: now(),
  });
  p.collaboration.decisions.push(d);
  // Only the explicit committee record may change process status; reviews never do.
  const statusByDecision: Partial<Record<Decision['type'], Candidate['status']>> = {
    ADVANCE: 'GATE_REVIEW',
    PAUSE_FOR_EVIDENCE: 'PAUSED',
    RELEASE: 'RELEASED',
    FINALIST: 'FINALIST',
    WITHDRAWN: 'WITHDRAWN',
    CALLED: 'CALLED',
  };
  if (d.candidateId && statusByDecision[d.type]) {
    const c = candidateById(p, d.candidateId);
    c.status = statusByDecision[d.type]!;
    c.stage = d.stage || c.stage;
    c.updatedAt = now();
  }
  // Project approvals/readiness remain independently verified in the shared workbook.
  return d;
}
export function decisionHistory(p: PastoralSearchProject, candidateId?: string) {
  return p.collaboration.decisions
    .filter((d) => !candidateId || d.candidateId === candidateId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}
export function addAssignment(
  p: PastoralSearchProject,
  input: {
    label: string;
    owner: string;
    dueDate: string;
    candidateId: string | null;
    moduleId: string;
    prerequisite: boolean;
    due: number;
  },
) {
  requireValue(p.tasks.length < 200, 'This search already has 200 tasks.');
  if (input.candidateId) candidateById(p, input.candidateId);
  requireValue(input.label.trim(), 'Enter the assigned work.');
  const task = {
    id: id(),
    ...input,
    label: input.label.trim(),
    status: 'open' as const,
    resolved: false,
  };
  p.tasks.push(task);
  if (input.prerequisite) invalidateReviews(p, 'call');
  return task;
}
export function sensitiveProject(p: PastoralSearchProject) {
  return !!(
    p.collaboration.candidates.length ||
    p.collaboration.rounds.length ||
    p.collaboration.decisions.length ||
    p.collaboration.members.length
  );
}
