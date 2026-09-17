import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { IDBFactory } from 'fake-indexeddb';
import {
  newProject,
  setAnswer,
  serializeBackup,
  importBackup,
  validateProject,
  readiness,
} from '../src/domain.js';
import { QUALIFICATIONS } from '../src/data.js';
import { reusableTemplate } from '../src/domain/templates.ts';
import {
  addMember,
  addCandidate,
  saveEvidence,
  createRound,
  reviewPacket,
  serializeReviewPacket,
  importReviewPacket,
  newReviewWork,
  exportCompletedReview,
  parseCompletedReview,
  importCompletedReview,
  inspectReviewImport,
  participation,
  compileRound,
  setRoundState,
  staleRound,
  addDecision,
  addAssignment,
} from '../src/domain/collaboration.ts';
import { validateReviewWork } from '../src/domain/collaboration.ts';
import { ProjectStore } from '../src/storage.js';
import { ReviewWorkStore } from '../src/storage/review-work.ts';
import {
  makeDocument,
  availableDocuments,
  documentMarkdown,
  generatePackage,
} from '../src/documents.js';
import { printableReview, candidateMeetingHtml } from '../src/artifacts/renderers/collaboration.js';
import { unzipSync, strFromU8 } from 'fflate';

function setup(count = 7) {
  const p = newProject('planned');
  setAnswer(p, 'churchName', 'Fixture Church');
  setAnswer(p, 'doctrineText', 'A church-owned doctrinal statement for this test.');
  const members = Array.from({ length: count }, (_, i) =>
    addMember(p, {
      name: `Reviewer ${i + 1}`,
      initials: `R${i + 1}`,
      role: i ? 'member' : 'chair',
      email: '',
      active: true,
      voting: 'voting',
    }),
  );
  const c = addCandidate(p, 'Fictional Candidate A', 'Fixture only');
  const ev = saveEvidence(p, c.id, {
    title: 'Sermon one',
    kind: 'sermon',
    url: 'https://example.org/sermon',
    reference: 'Recording 1',
    notes: 'Ordinary Sunday sermon',
  });
  const round = createRound(p, c.id, {
    title: 'Sermon review 1',
    reviewType: 'sermon',
    instructions: 'Independent observations before discussion.',
    expectedIds: members.map((m) => m.id),
    evidenceIds: [ev.id],
    includeDoctrine: true,
  });
  return { p, members, c, ev, round };
}
function reviewFor(s, i = 0) {
  const packet = importReviewPacket(
    serializeReviewPacket(reviewPacket(s.p, s.round.id, s.members[i]?.id || null)),
  );
  const work = newReviewWork(packet);
  work.reviewer.name = s.members[i]?.name || 'Unassigned reviewer';
  for (const response of Object.values(work.responses)) {
    response.finding = 'no_concern';
    response.notes = 'A specific observed example.';
  }
  work.proposedQuestions = 'How did you prepare this sermon?';
  return { work, review: parseCompletedReview(exportCompletedReview(work)) };
}
function release(s) {
  setRoundState(s.p, s.round.id, 'closed');
  setRoundState(s.p, s.round.id, 'released');
  return compileRound(s.round);
}

test('review packet -> independent review -> portable submission -> chair round trip', () => {
  const s = setup(),
    { work, review } = reviewFor(s);
  const before = structuredClone(s.p.answers);
  const packetText = serializeReviewPacket(work.packet);
  assert(!packetText.includes('Reviewer 2'));
  assert(!packetText.includes('compensation'));
  assert(!packetText.includes('submissions'));
  assert(!JSON.stringify(review).includes('churchName'));
  assert(!JSON.stringify(review).includes('A church-owned doctrinal statement'));
  importCompletedReview(s.p, s.round.id, review);
  assert.equal(s.round.submissions.length, 1);
  assert.deepEqual(s.p.answers, before);
  assert.equal(s.c.status, 'PROSPECT');
  assert.equal(s.p.collaboration.decisions.length, 0);
  assert.equal(validateProject(s.p).collaboration.rounds[0].submissions.length, 1);
});
test('seven unique reviews compile; six of seven never implies unanimity', () => {
  const s = setup();
  for (let i = 0; i < 6; i++) importCompletedReview(s.p, s.round.id, reviewFor(s, i).review);
  assert.deepEqual(participation(s.round), {
    expected: 7,
    received: 6,
    total: 6,
    additional: 0,
    missing: [{ id: s.members[6].id, name: s.members[6].name }],
  });
  assert.throws(() => compileRound(s.round), /release/);
  importCompletedReview(s.p, s.round.id, reviewFor(s, 6).review);
  const comp = release(s);
  assert.equal(comp.participation.received, 7);
  assert.equal(comp.questions[0].reviewerCount, 7);
  assert.equal(comp.questions[0].originals.length, 7);
  assert.equal(comp.distributions[0].counts.find((c) => c.finding === 'no_concern').count, 7);
  assert.equal('score' in comp, false);
  assert.equal('recommended' in comp, false);
});
test('one minority material concern survives six no-concern responses and cannot pass a hard gate', () => {
  const s = setup();
  for (let i = 0; i < 7; i++) {
    const { review } = reviewFor(s, i);
    if (i === 6) {
      review.responses.doctrine = {
        finding: 'material_concern',
        notes: 'Specific doctrinal contradiction requiring evidence.',
      };
      review.concerns = [
        {
          category: 'Integrity',
          severity: 'material',
          text: 'A ministry-history discrepancy needs independent verification.',
        },
      ];
    }
    importCompletedReview(s.p, s.round.id, review);
  }
  const comp = release(s);
  assert(comp.materialConcern);
  assert.equal(comp.concerns.length, 2);
  assert(comp.concerns.some((c) => c.text.includes('doctrinal contradiction')));
  assert(comp.distributions.find((d) => d.criterion.id === 'doctrine').divergent);
  assert.equal(s.c.status, 'PROSPECT');
  assert.equal(readiness(s.p, 'search').ready, false);
  const html = candidateMeetingHtml(s.p, s.c.id);
  assert.match(html, /Material concern raised/);
  assert.match(html, /ministry-history discrepancy/);
  assert.doesNotMatch(html, /86%|score/i);
});
test('duplicates require a deliberate choice; revised review preserves identity, timestamps and previous wording', () => {
  const s = setup(),
    { work, review } = reviewFor(s);
  importCompletedReview(s.p, s.round.id, review);
  assert(inspectReviewImport(s.p, s.round.id, review).exact);
  assert.throws(() => importCompletedReview(s.p, s.round.id, review), /Duplicate/);
  work.observations = 'Revised after checking the passage.';
  const revised = parseCompletedReview(exportCompletedReview(work));
  assert.equal(revised.id, review.id);
  assert.equal(revised.submittedAt, review.submittedAt);
  importCompletedReview(s.p, s.round.id, revised, { replace: true });
  assert.equal(s.round.submissions.length, 1);
  assert.equal(s.round.submissions[0].previous.length, 1);
  assert.equal(s.round.submissions[0].previous[0].review.observations, review.observations);
  const duplicatePerson = { ...revised, id: crypto.randomUUID() };
  assert(inspectReviewImport(s.p, s.round.id, duplicatePerson).duplicate);
  const impostor = structuredClone(review);
  impostor.reviewer.memberId = s.members[1].id;
  assert.throws(() => inspectReviewImport(s.p, s.round.id, impostor), /different reviewer/);
  const older = structuredClone(revised);
  older.modifiedAt = '2000-01-01T00:00:00.000Z';
  assert.throws(() => parseCompletedReview(JSON.stringify(older)), /predates/);
});
test('candidate, project, round and criteria mismatches cannot silently import', () => {
  const s = setup(),
    { review } = reviewFor(s);
  for (const [key, pattern] of [
    ['candidateId', /Different candidate/],
    ['projectFingerprint', /Different search/],
    ['roundId', /Different review round/],
    ['snapshotId', /Different criteria/],
  ]) {
    assert.throws(
      () => importCompletedReview(s.p, s.round.id, { ...review, [key]: 'other' }),
      pattern,
    );
    assert.equal(s.round.submissions.length, 0);
  }
  const missing = structuredClone(review);
  delete missing.responses.doctrine;
  assert.throws(() => importCompletedReview(s.p, s.round.id, missing), /criteria/);
});
test('stale church criteria and evidence warn without reinterpreting earlier reviews', () => {
  const s = setup(),
    { review, work } = reviewFor(s),
    snapshot = structuredClone(s.round.snapshot);
  setAnswer(s.p, 'doctrineText', 'Changed church statement');
  assert(staleRound(s.p, s.round));
  assert.throws(() => importCompletedReview(s.p, s.round.id, review), /changed/);
  importCompletedReview(s.p, s.round.id, review, { acceptStale: true });
  assert.deepEqual(s.round.snapshot, snapshot);
  assert.deepEqual(work.packet.snapshot, snapshot);
  setAnswer(s.p, 'doctrineText', snapshot.context[0].text);
  assert(!staleRound(s.p, s.round));
  saveEvidence(
    s.p,
    s.c.id,
    { ...s.ev, title: 'Changed sermon', notes: 'Different evidence' },
    s.ev.id,
  );
  assert(staleRound(s.p, s.round));
});
test('closed rounds hold late revisions; explicit reopening hides compilation again', () => {
  const s = setup(),
    { review } = reviewFor(s);
  assert.throws(() => setRoundState(s.p, s.round.id, 'released'), /Close/);
  setRoundState(s.p, s.round.id, 'closed');
  assert.throws(() => importCompletedReview(s.p, s.round.id, review), /closed/);
  setRoundState(s.p, s.round.id, 'released');
  assert.equal(compileRound(s.round).reviews.length, 0);
  setRoundState(s.p, s.round.id, 'open');
  assert.throws(() => compileRound(s.round), /release/);
  importCompletedReview(s.p, s.round.id, review);
});
test('normalization groups matching questions but retains divergent wording and attribution', () => {
  const s = setup(3);
  [
    'What happened at your last church?',
    'what happened at your last church!',
    'Clarify the circumstances of your departure.',
  ].forEach((q, i) => {
    const { review } = reviewFor(s, i);
    review.proposedQuestions = [{ topic: 'Ministry history', text: q }];
    importCompletedReview(s.p, s.round.id, review);
  });
  const comp = release(s);
  assert.equal(comp.questions.length, 2);
  assert.equal(comp.questions[0].reviewerCount, 2);
  assert.equal(comp.questions[0].originals[1].text, 'what happened at your last church!');
});
test('directory activity does not control voting and unassigned reviews do not inflate expected participation', () => {
  const s = setup(2);
  const { review } = reviewFor(s, 0);
  review.reviewer = { name: 'Unassigned', initials: 'U', memberId: null };
  importCompletedReview(s.p, s.round.id, review);
  assert.equal(participation(s.round).received, 0);
  assert.equal(participation(s.round).additional, 1);
  assert.equal(participation(s.round).missing.length, 2);
  assert.equal('quorum' in participation(s.round), false);
  assert.equal(s.p.answers.quorum, undefined);
});
test('decision history and assignments remain distinct from workbook adoption and readiness', () => {
  const s = setup();
  const before = readiness(s.p, 'search').total;
  addAssignment(s.p, {
    label: 'Contact reference',
    owner: 'Reviewer 1',
    dueDate: '2026-10-04',
    candidateId: s.c.id,
    moduleId: 'safety',
    prerequisite: false,
    due: 2,
  });
  assert.equal(readiness(s.p, 'search').total, before);
  const d = addDecision(s.p, {
    candidateId: s.c.id,
    type: 'PAUSE_FOR_EVIDENCE',
    stage: 'Gate 2',
    date: '2026-09-22',
    rationale: 'Two references needed.',
    unresolvedConcerns: 'Ministry dates need checking.',
    followUp: 'Contact second reference',
    owner: 'Reviewer 2',
    reviewDate: '2026-10-01',
    result: 'Consensus',
    recordedBy: 'Chair',
    notes: '',
  });
  assert.equal(s.c.status, 'PAUSED');
  assert.equal(s.p.collaboration.decisions[0].id, d.id);
  assert.equal(readiness(s.p, 'search').total, before);
  addDecision(s.p, {
    ...d,
    candidateId: null,
    type: 'QUALIFICATIONS_ADOPTED',
    rationale: 'Minutes record adoption.',
  });
  assert.equal(s.p.answers.qualificationAdoption, undefined);
  const copy = validateProject(s.p);
  assert.equal(copy.tasks[0].dueDate, '2026-10-04');
  assert.equal(copy.tasks[0].status, 'open');
});
test('full backup restores all collaboration records and preserves portable search identity', () => {
  const s = setup(),
    { review } = reviewFor(s);
  importCompletedReview(s.p, s.round.id, review);
  const copy = importBackup(serializeBackup(s.p));
  assert.notEqual(copy.id, s.p.id);
  assert.deepEqual(copy.collaboration, s.p.collaboration);
  const next = reviewFor(s, 1).review;
  importCompletedReview(copy, s.round.id, next);
  assert.equal(copy.collaboration.rounds[0].submissions.length, 2);
  assert.equal(s.round.submissions.length, 1);
  const zip = unzipSync(generatePackage(s.p));
  assert.deepEqual(
    importBackup(strFromU8(zip['pastoral-search/project.json'])).collaboration,
    s.p.collaboration,
  );
});
test('templates and all external artifacts exclude collaboration canaries', () => {
  const s = setup();
  s.c.name = 'PRIVATE_CANDIDATE_CANARY';
  s.c.context = 'PRIVATE_CONTEXT_CANARY';
  s.members[0].name = 'PRIVATE_REVIEWER_CANARY';
  const { review } = reviewFor(s);
  review.observations = 'PRIVATE_REVIEW_CANARY';
  importCompletedReview(s.p, s.round.id, review);
  setAnswer(s.p, 'salary', 'PRIVATE_COMPENSATION_CANARY');
  setAnswer(s.p, 'pastoralModel', 'bivocational');
  setAnswer(s.p, 'responsibilities', 'PRIVATE_POSITION_CANARY');
  const template = JSON.stringify(reusableTemplate(s.p));
  assert.doesNotMatch(template, /PRIVATE_|collaboration|candidateId|submittedAt|pastoralModel/);
  for (const d of availableDocuments(s.p)) {
    const doc = makeDocument(s.p, d.id);
    if (doc.audience === 'Internal') continue;
    assert.doesNotMatch(
      documentMarkdown(doc),
      /PRIVATE_(CANDIDATE|CONTEXT|REVIEWER|REVIEW)_CANARY/,
      d.id,
    );
  }
});
test('strict portable validation rejects extra data, unsafe URLs, prototype keys and excessive files', () => {
  const s = setup(),
    { work, review } = reviewFor(s);
  assert.throws(
    () => importReviewPacket(JSON.stringify({ ...work.packet, unrelatedCompensation: 'private' })),
    /supported/,
  );
  assert.throws(
    () => parseCompletedReview(JSON.stringify({ ...review, candidates: [] })),
    /supported/,
  );
  assert.throws(() => parseCompletedReview(' '.repeat(750001)), /750 KB/);
  assert.throws(() => importReviewPacket('{"__proto__":{}}'), /unsafe/);
  assert.throws(() =>
    saveEvidence(s.p, s.c.id, {
      title: 'Unsafe',
      kind: 'other',
      url: 'javascript:alert(1)',
      reference: '',
      notes: '',
    }),
  );
  const hostile = structuredClone(work.packet);
  hostile.instructions = '<script>alert(1)</script>';
  const html = printableReview(hostile);
  assert(!html.includes('<script>'));
  assert(html.includes('&lt;script&gt;'));
  assert(html.includes("default-src 'none'"));
  const corrupted = structuredClone(s.p);
  corrupted.collaboration.rounds[0].candidateId = 'missing';
  assert.throws(() => validateProject(corrupted), /missing candidate/);
  const badWork = structuredClone(work);
  badWork.reviewer.memberId = 'other';
  assert.throws(() => validateReviewWork(badWork), /assignment/);
});
test('all review types work; qualification rounds require adopted definitions', async () => {
  const s = setup();
  for (const reviewType of ['materials', 'interview', 'general'])
    assert(
      createRound(s.p, s.c.id, {
        title: reviewType,
        reviewType,
        instructions: '',
        expectedIds: [],
        evidenceIds: [],
        includeDoctrine: false,
      }).snapshot.criteria.length,
    );
  assert.throws(
    () =>
      createRound(s.p, s.c.id, {
        title: 'Qualification evidence',
        reviewType: 'qualifications',
        instructions: '',
        expectedIds: [],
        evidenceIds: [],
        includeDoctrine: false,
      }),
    /Adopt/,
  );
  for (const q of QUALIFICATIONS)
    s.p.qualifications[q.id] = {
      meaning: 'Church definition',
      evidence: 'Evidence to seek',
      disqualifying: 'Contrary pattern',
      questions: 'Cases requiring judgment',
    };
  s.p.answers.qualificationAdoption = { status: 'unknown', value: 'approved' };
  const settings = {
    title: 'Adopted qualifications',
    reviewType: 'qualifications',
    instructions: '',
    expectedIds: [],
    evidenceIds: [],
    includeDoctrine: false,
  };
  assert.throws(() => createRound(s.p, s.c.id, settings), /Adopt/);
  setAnswer(s.p, 'qualificationAdoption', 'approved');
  const qualificationRound = createRound(s.p, s.c.id, settings);
  assert.equal(qualificationRound.snapshot.criteria.length, 26);
  assert(qualificationRound.snapshot.criteria.every((c) => c.hardGate));
  const packet = reviewPacket(s.p, qualificationRound.id, null),
    work = newReviewWork(packet);
  work.reviewer.name = 'Reviewer';
  for (const r of Object.values(work.responses)) r.notes = '字'.repeat(12000);
  assert.throws(() => exportCompletedReview(work), /exceeds 750 KB/);
  assert.equal(work.submittedAt, null);
  s.p.qualifications.q1.meaning = 'Changed meaning';
  assert(staleRound(s.p, qualificationRound));
  assert(
    qualificationRound.snapshot.context.some((c) => c.text.includes('meaning: Church definition')),
  );
  const fixture = JSON.parse(
    await readFile(new URL('./fixtures/project-v3.json', import.meta.url), 'utf8'),
  );
  assert.equal(validateProject(fixture).schemaVersion, 3);
});
test('v2 fixture migrates additively, old tasks retain readiness, and the input is untouched', async () => {
  const legacy = JSON.parse(
    await readFile(new URL('./fixtures/project-v2.json', import.meta.url), 'utf8'),
  );
  const original = structuredClone(legacy);
  const p = validateProject(legacy);
  assert.equal(p.schemaVersion, 3);
  assert.deepEqual(p.answers, legacy.answers);
  assert.deepEqual(p.tasks, legacy.tasks);
  assert.deepEqual(legacy, original);
  assert.equal(p.collaboration.candidates.length, 0);
  assert.equal(p.collaboration.fingerprint, legacy.id);
  const backup = { format: 'pastoral-search-toolkit', schemaVersion: 2, project: legacy };
  assert.equal(
    importBackup(JSON.stringify(backup)).collaboration.fingerprint,
    p.collaboration.fingerprint,
  );
});
test('local review repository persists independently, upgrades the database and rejects stale overwrites', async () => {
  const indexedDB = new IDBFactory();
  const legacy = await new Promise((resolve, reject) => {
    const r = indexedDB.open('committee-test', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('projects', { keyPath: 'id' });
      r.result.createObjectStore('meta');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  legacy.close();
  const projects = await ProjectStore.open(indexedDB, null, 'committee-test'),
    reviews = await ReviewWorkStore.open(projects.db),
    s = setup(),
    { work } = reviewFor(s);
  await projects.save(s.p);
  await reviews.save(work);
  const stale = reviews.load(work.id);
  work.observations = 'New wording';
  await reviews.save(work);
  await assert.rejects(() => reviews.save(stale), /another tab/);
  await assert.rejects(() => reviews.remove(stale.id, stale.revision), /another tab/);
  const reloaded = await ReviewWorkStore.open(projects.db);
  assert.equal(reloaded.load(work.id).observations, 'New wording');
  assert.equal(projects.load(s.p.id).collaboration.rounds[0].submissions.length, 0);
  await reloaded.remove(work.id, work.revision);
  assert.equal(reloaded.list().length, 0);
  projects.close();
});
