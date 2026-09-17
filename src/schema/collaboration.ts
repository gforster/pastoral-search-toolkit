import { z } from 'zod';

export const Id = z.string().regex(/^[\w-]{1,80}$/);
export const Short = z.string().max(300);
export const Note = z.string().max(12_000);
export const Timestamp = z.iso.datetime({ offset: true });
export const CalendarDate = z
  .string()
  .refine(
    (s) =>
      s === '' ||
      (/^\d{4}-\d{2}-\d{2}$/.test(s) &&
        Number.isFinite(Date.parse(s)) &&
        new Date(s).toISOString().slice(0, 10) === s),
    'Use a valid calendar date',
  );
export const ReviewType = z.enum(['sermon', 'materials', 'interview', 'qualifications', 'general']);
export const Finding = z.enum([
  'not_reviewed',
  'no_concern',
  'clarify',
  'concern',
  'material_concern',
]);
export const CandidateStatus = z.enum([
  'PROSPECT',
  'INITIAL_REVIEW',
  'GATE_REVIEW',
  'INTERVIEWING',
  'REFERENCES',
  'PAUSED',
  'FINALIST',
  'RELEASED',
  'WITHDRAWN',
  'CALLED',
  'SEARCH_CLOSED',
]);
export const DecisionType = z.enum([
  'ADVANCE',
  'PAUSE_FOR_EVIDENCE',
  'RELEASE',
  'FINALIST',
  'WITHDRAWN',
  'CALLED',
  'GATE_CLEARED',
  'COMMITTEE_ORGANIZED',
  'QUALIFICATIONS_ADOPTED',
  'READY_TO_SEARCH',
  'CANDIDATE_PROCESS_ADOPTED',
  'COMPENSATION_APPROVED',
  'OTHER',
]);
export const MemberSchema = z
  .object({
    id: Id,
    name: Short.min(1),
    initials: z.string().max(20),
    role: z.enum(['chair', 'member', 'read_only']),
    email: z.union([z.literal(''), z.email().max(254)]),
    active: z.boolean(),
    voting: z.enum(['voting', 'non_voting', 'unspecified']),
  })
  .strict();
export const EvidenceSchema = z
  .object({
    id: Id,
    title: Short.min(1),
    kind: z.enum(['sermon', 'resume', 'testimony', 'doctrine', 'interview', 'reference', 'other']),
    reference: z.string().max(1500),
    url: z
      .string()
      .max(2000)
      .refine((s) => {
        if (!s) return true;
        try {
          const u = new URL(s);
          return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password;
        } catch {
          return false;
        }
      }, 'Use an HTTP(S) evidence link without credentials'),
    notes: Note,
    updatedAt: Timestamp,
  })
  .strict();
export const CandidateSchema = z
  .object({
    id: Id,
    name: Short.min(1),
    context: Note,
    status: CandidateStatus,
    stage: Short,
    evidenceNeeded: Note,
    createdAt: Timestamp,
    updatedAt: Timestamp,
    evidence: z.array(EvidenceSchema).max(100),
    progress: z
      .object({
        questionnaire: z.enum(['not_started', 'requested', 'received']),
        interview: z.enum(['not_started', 'scheduled', 'complete']),
        referencesDone: z.number().int().min(0).max(100),
        referencesExpected: z.number().int().min(0).max(100),
        safety: z.enum(['not_started', 'in_progress', 'complete']),
      })
      .strict(),
  })
  .strict();
export const CriterionSchema = z
  .object({ id: Id, label: Short.min(1), prompt: Note, hardGate: z.boolean() })
  .strict();
export const SnapshotSchema = z
  .object({
    id: Id,
    templateVersion: z.literal(1),
    includeDoctrine: z.boolean(),
    criteria: z.array(CriterionSchema).min(1).max(40),
    context: z.array(z.object({ label: Short, text: z.string().max(100_000) }).strict()).max(30),
    evidence: z.array(EvidenceSchema).max(100),
  })
  .strict();
export const ReviewerSchema = z
  .object({ name: Short, initials: z.string().max(20), memberId: Id.nullable() })
  .strict();
export const ResponseSchema = z.object({ finding: Finding, notes: Note }).strict();
const reviewFields = {
  id: Id,
  projectFingerprint: Id,
  candidateId: Id,
  roundId: Id,
  snapshotId: Id,
  templateVersion: z.literal(1),
  reviewType: ReviewType,
  reviewer: ReviewerSchema,
  submittedAt: Timestamp,
  modifiedAt: Timestamp,
  responses: z.record(Id, ResponseSchema),
  observations: Note,
  concerns: z
    .array(
      z
        .object({
          category: Short,
          severity: z.enum(['clarification', 'concern', 'material']),
          text: Note.min(1),
        })
        .strict(),
    )
    .max(100),
  proposedQuestions: z.array(z.object({ topic: Short, text: Note.min(1) }).strict()).max(100),
};
export const CompletedReviewSchema = z
  .object({
    format: z.literal('pastoral-search-review'),
    schemaVersion: z.literal(1),
    ...reviewFields,
  })
  .strict();
export const ReviewPacketSchema = z
  .object({
    format: z.literal('pastoral-search-review-packet'),
    schemaVersion: z.literal(1),
    projectFingerprint: Id,
    churchName: Short,
    candidate: z.object({ id: Id, name: Short.min(1) }).strict(),
    roundId: Id,
    title: Short.min(1),
    reviewType: ReviewType,
    createdAt: Timestamp,
    instructions: Note,
    snapshot: SnapshotSchema,
    recipient: z.object({ id: Id, name: Short }).strict().nullable(),
  })
  .strict();
export const SubmissionSchema = z
  .object({
    review: CompletedReviewSchema,
    importedAt: Timestamp,
    previous: z
      .array(z.object({ review: CompletedReviewSchema, importedAt: Timestamp }).strict())
      .max(10),
  })
  .strict();
export const RoundSchema = z
  .object({
    id: Id,
    candidateId: Id,
    title: Short.min(1),
    reviewType: ReviewType,
    instructions: Note,
    createdAt: Timestamp,
    updatedAt: Timestamp,
    state: z.enum(['open', 'closed', 'released']),
    expected: z.array(z.object({ id: Id, name: Short }).strict()).max(50),
    snapshot: SnapshotSchema,
    submissions: z.array(SubmissionSchema).max(100),
  })
  .strict();
export const DecisionSchema = z
  .object({
    id: Id,
    candidateId: Id.nullable(),
    type: DecisionType,
    stage: Short,
    date: CalendarDate.refine(Boolean, 'Enter the decision date'),
    rationale: Note.min(1),
    unresolvedConcerns: Note,
    followUp: Note,
    owner: Short,
    reviewDate: CalendarDate,
    result: Short,
    recordedBy: Short.min(1),
    notes: Note,
    createdAt: Timestamp,
  })
  .strict();
export const CollaborationSchema = z
  .object({
    fingerprint: Id,
    members: z.array(MemberSchema).max(50),
    candidates: z.array(CandidateSchema).max(100),
    rounds: z.array(RoundSchema).max(200),
    decisions: z.array(DecisionSchema).max(1000),
  })
  .strict();
export const ReviewWorkSchema = z
  .object({
    id: Id,
    revision: z.number().int().nonnegative(),
    packet: ReviewPacketSchema,
    reviewer: ReviewerSchema,
    responses: z.record(Id, ResponseSchema),
    observations: Note,
    concerns: Note,
    concernSeverity: z.enum(['clarification', 'concern', 'material']),
    proposedQuestions: Note,
    questionTopic: Short,
    submittedAt: Timestamp.nullable(),
    modifiedAt: Timestamp,
  })
  .strict();
export type Collaboration = z.infer<typeof CollaborationSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Candidate = z.infer<typeof CandidateSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Round = z.infer<typeof RoundSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type ReviewPacket = z.infer<typeof ReviewPacketSchema>;
export type CompletedReview = z.infer<typeof CompletedReviewSchema>;
export type ReviewWork = z.infer<typeof ReviewWorkSchema>;
export type Decision = z.infer<typeof DecisionSchema>;

export function emptyCollaboration(fingerprint: string): Collaboration {
  return { fingerprint, members: [], candidates: [], rounds: [], decisions: [] };
}
export function rejectUnsafeKeys(input: unknown) {
  const stack: unknown[] = [input];
  const seen = new WeakSet<object>();
  while (stack.length) {
    const v = stack.pop();
    if (!v || typeof v !== 'object' || seen.has(v)) continue;
    seen.add(v);
    for (const [key, value] of Object.entries(v)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key))
        throw new Error('The file contains an unsafe property name.');
      if (value && typeof value === 'object') stack.push(value);
    }
  }
}
export function validateReviewResponses(
  review: { responses: Record<string, z.infer<typeof ResponseSchema>> },
  snapshot: Snapshot,
) {
  const keys = Object.keys(review.responses);
  if (
    keys.length !== snapshot.criteria.length ||
    snapshot.criteria.some((c) => !Object.hasOwn(review.responses, c.id))
  )
    throw new Error('Review responses do not match the assigned criteria.');
}
export function validateCollaboration(input: unknown): Collaboration {
  rejectUnsafeKeys(input);
  const c = CollaborationSchema.parse(input);
  const unique = (ids: string[]) => {
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate collaboration identifier.');
  };
  for (const list of [c.members, c.candidates, c.rounds, c.decisions])
    unique(list.map((x) => x.id));
  for (const candidate of c.candidates) {
    unique(candidate.evidence.map((x) => x.id));
    if (candidate.progress.referencesDone > candidate.progress.referencesExpected)
      throw new Error('Completed references exceed expected references.');
  }
  for (const round of c.rounds) {
    if (!c.candidates.some((x) => x.id === round.candidateId))
      throw new Error('Review round references a missing candidate.');
    unique(round.expected.map((x) => x.id));
    unique(round.snapshot.criteria.map((x) => x.id));
    unique(round.submissions.map((x) => x.review.id));
    unique(round.snapshot.evidence.map((x) => x.id));
    if (round.expected.some((m) => !c.members.some((existing) => existing.id === m.id)))
      throw new Error('Expected reviewer is missing from the committee directory.');
    const identities = round.submissions.map(
      (s) =>
        s.review.reviewer.memberId ||
        s.review.reviewer.name.trim().toLowerCase() +
          '|' +
          s.review.reviewer.initials.trim().toLowerCase(),
    );
    unique(identities);
    for (const sub of round.submissions)
      for (const { review } of [sub, ...sub.previous]) {
        if (
          review.projectFingerprint !== c.fingerprint ||
          review.candidateId !== round.candidateId ||
          review.roundId !== round.id ||
          review.snapshotId !== round.snapshot.id ||
          review.templateVersion !== round.snapshot.templateVersion ||
          review.reviewType !== round.reviewType
        )
          throw new Error('Stored review does not match its search, candidate or round snapshot.');
        if (!review.reviewer.name.trim())
          throw new Error('A submitted review needs a reviewer name.');
        if (
          review.reviewer.memberId &&
          !round.expected.some((x) => x.id === review.reviewer.memberId)
        )
          throw new Error('Review is assigned to a member outside this round.');
        if (Date.parse(review.modifiedAt) < Date.parse(review.submittedAt))
          throw new Error('Review modification predates its original submission.');
        validateReviewResponses(review, round.snapshot);
      }
  }
  for (const d of c.decisions)
    if (d.candidateId && !c.candidates.some((x) => x.id === d.candidateId))
      throw new Error('Decision references a missing candidate.');
  return c;
}
