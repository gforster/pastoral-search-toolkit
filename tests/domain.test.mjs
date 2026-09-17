import test from 'node:test';
import assert from 'node:assert/strict';
import { FIELDS, MODULES, QUALIFICATIONS, MILESTONES, PATHS } from '../src/data.js';
import {
  newProject,
  setAnswer,
  readiness,
  tasksFor,
  moduleState,
  reviewModule,
  importBackup,
  serializeBackup,
  validateProject,
  qualificationsComplete,
} from '../src/domain.js';
import { DOCUMENTS, makeDocument, documentHtml, documentMarkdown } from '../src/documents.js';
function fillProject() {
  const p = newProject();
  for (const f of FIELDS)
    p.answers[f.id] = {
      status: 'known',
      value:
        f.type === 'date'
          ? '2027-04-04'
          : f.options
            ? f.accept?.at(-1) || f.options.at(-1)[0]
            : `Verified ${f.id}`,
    };
  p.answers.callMethod.value = 'vote';
  p.answers.event.value = 'retirement';
  p.answers.interim.value = 'no';
  p.answers.associate.value = 'no';
  p.answers.internalCandidate.value = 'no';
  for (const q of QUALIFICATIONS)
    p.qualifications[q.id] = {
      meaning: 'Adopted meaning',
      evidence: 'Evidence sources',
      disqualifying: 'Established contrary pattern',
      questions: 'Cases discussed',
    };
  return p;
}
test('all entry paths use one schema and remain independently editable', () => {
  for (const [path, , , stage] of PATHS) {
    const p = newProject(path);
    assert.equal(p.milestone, stage);
    setAnswer(p, 'salary', 'Provisional range');
    assert.equal(p.answers.salary.value, 'Provisional range');
    assert.equal(Object.keys(p.answers).length, 1);
  }
});
test('schema has 19 modules, 26 expressions, seven milestones and unique field IDs', () => {
  assert.equal(MODULES.length, 19);
  assert.equal(QUALIFICATIONS.length, 26);
  assert.equal(MILESTONES.length, 7);
  assert.equal(new Set(FIELDS.map((f) => f.id)).size, FIELDS.length);
  for (const f of FIELDS) assert(MODULES.some((m) => m.id === f.module));
});
test('unknown salary and quorum do not block committee formation', () => {
  const p = fillProject();
  delete p.answers.salary;
  delete p.answers.quorum;
  assert.equal(readiness(p, 'committee').ready, true);
  assert.equal(readiness(p, 'search').ready, true);
  assert(readiness(p, 'advancement').missing.some((f) => f.id === 'salary'));
  assert(readiness(p, 'finalist').missing.some((f) => f.id === 'quorum'));
});
test('unknown appointing authority blocks organization, not unrelated editing', () => {
  const p = fillProject();
  delete p.answers.createAuthority;
  p.milestone = 'committee';
  assert.equal(readiness(p).ready, false);
  assert.equal(tasksFor(p).find((t) => t.id === 'createAuthority').classification, 'BLOCKER_NOW');
  setAnswer(p, 'history', 'A church serving its community');
  assert.equal(p.answers.history.status, 'known');
});
test('quorum moves from required later to blocker only at the proper stage', () => {
  const p = fillProject();
  delete p.answers.quorum;
  p.milestone = 'committee';
  assert.equal(tasksFor(p).find((t) => t.id === 'quorum').classification, 'REQUIRED_LATER');
  p.milestone = 'finalist';
  assert.equal(tasksFor(p).find((t) => t.id === 'quorum').classification, 'BLOCKER_NOW');
});
test('provisional compensation can support advancement but not a finalist', () => {
  const p = fillProject();
  p.answers.compStatus.value = 'provisional';
  assert.equal(readiness(p, 'advancement').ready, true);
  assert.equal(readiness(p, 'finalist').ready, false);
  assert.match(documentMarkdown(makeDocument(p, 'compensation')), /under development/);
});
test('blank or unknown is unresolved, not a hidden completed value', () => {
  const p = fillProject();
  p.answers.quorum = { status: 'unknown', value: 'two-thirds' };
  assert(readiness(p, 'finalist').missing.some((f) => f.id === 'quorum'));
  assert.match(documentMarkdown(makeDocument(p, 'governance')), /TO BE CONFIRMED/);
  assert.doesNotMatch(documentMarkdown(makeDocument(p, 'governance')), /two-thirds/);
});
test('required fields cannot be waived with not applicable', () => {
  const p = newProject();
  assert.throws(() => setAnswer(p, 'quorum', '', 'not_applicable'));
  setAnswer(p, 'housing', '', 'not_applicable');
  assert.equal(p.answers.housing.status, 'not_applicable');
});
test('internal candidacy and interim arrangements introduce explicit safeguards', () => {
  const p = fillProject();
  delete p.answers.internalSafeguards;
  delete p.answers.interimTerms;
  assert(readiness(p, 'search').ready);
  p.answers.internalCandidate.value = 'yes';
  p.answers.interim.value = 'yes';
  const ids = readiness(p, 'search').missing.map((f) => f.id);
  assert(ids.includes('internalSafeguards'));
  assert(ids.includes('interimTerms'));
});
test('removal requires a safety and healing plan before active search', () => {
  const p = fillProject();
  delete p.answers.healingPlan;
  p.answers.event.value = 'removal';
  assert(readiness(p, 'search').missing.some((f) => f.id === 'healingPlan'));
});
test('all four qualification prompts precede adoption; preferences cannot compensate', () => {
  const p = fillProject();
  assert(qualificationsComplete(p));
  delete p.qualifications.q2.meaning;
  p.requirements.push({
    id: 'pref',
    category: 'preference',
    statement: 'Preferred style',
    evidence: 'Strong impression',
    status: 'adopted',
  });
  assert(readiness(p, 'search').missing.some((f) => f.id === 'qualificationAdoption'));
});
test('review state becomes stale after governing changes and actual attestations reset', () => {
  const p = fillProject();
  reviewModule(p, 'call');
  assert.equal(moduleState(p, 'call'), 'READY');
  setAnswer(p, 'quorum', 'A revised verified rule');
  assert.equal(moduleState(p, 'call'), 'NEEDS_REVIEW');
  assert.equal(p.answers.allPrerequisites.value, 'draft');
  assert.equal(readiness(p, 'call').ready, false);
});
test('approving separate checks does not reset previously approved checks', () => {
  const p = fillProject();
  p.answers.noticeComplete.value = 'draft';
  p.answers.voteCheck.value = 'draft';
  setAnswer(p, 'noticeComplete', 'approved');
  setAnswer(p, 'voteCheck', 'approved');
  assert.equal(p.answers.noticeComplete.value, 'approved');
  assert(readiness(p, 'call').ready);
});
test('custom church requirements participate in readiness and cannot be bypassed by final checkbox', () => {
  const p = fillProject();
  p.tasks.push({
    id: 't1',
    label: 'An additional constitutional requirement',
    owner: 'Clerk',
    due: 5,
    resolved: false,
  });
  assert(readiness(p, 'finalist').ready);
  assert.equal(readiness(p, 'call').ready, false);
  p.tasks[0].resolved = true;
  assert(readiness(p, 'call').ready);
});
test('all seven milestones can be documented ready, with handoff dependent on acceptance', () => {
  const p = fillProject();
  for (const m of MILESTONES) assert(readiness(p, m.id).ready, m.id);
  delete p.answers.acceptance;
  assert(readiness(p, 'call').ready);
  assert.equal(readiness(p, 'handoff').ready, false);
});
test('backup roundtrip preserves all module data while creating a separate ID', () => {
  const p = fillProject();
  p.name = 'Test Church';
  p.questions = ['i1'];
  const imported = importBackup(serializeBackup(p));
  assert.notEqual(imported.id, p.id);
  assert.equal(imported.revision, 0);
  assert.deepEqual(imported.answers, p.answers);
  assert.deepEqual(imported.qualifications, p.qualifications);
  assert.deepEqual(imported.questions, ['i1']);
});
test('reject malformed, future, oversized, and executable-shaped imports', () => {
  assert.throws(() => importBackup('{'));
  const raw = JSON.parse(serializeBackup(newProject()));
  raw.schemaVersion = 999;
  assert.throws(() => importBackup(JSON.stringify(raw)));
  assert.throws(() => importBackup(' '.repeat(2_000_001)));
  const p = newProject();
  p.answers = JSON.parse('{"__proto__":{"value":"x","status":"known"}}');
  assert.throws(() => validateProject(p));
});
test('reject invalid dates, choices, duplicate task IDs and numeric field values', () => {
  const p = newProject();
  assert.throws(() => setAnswer(p, 'startDate', '2027-02-30'));
  assert.throws(() => setAnswer(p, 'interim', 'maybe'));
  p.answers.quorum = { status: 'known', value: 42 };
  assert.throws(() => validateProject(p));
  delete p.answers.quorum;
  p.tasks = [
    { id: 'a', label: 'x', owner: '', due: 1, resolved: false },
    { id: 'a', label: 'y', owner: '', due: 1, resolved: false },
  ];
  assert.throws(() => validateProject(p));
});
test('all documents are generated with honest placeholders and audience labels', () => {
  const p = newProject();
  for (const d of DOCUMENTS) {
    const result = makeDocument(p, d.id);
    const html = documentHtml(result);
    assert(html.includes(result.status));
    assert(html.includes('govern your church'));
    assert(result.sections.length > 0);
  }
  assert.match(documentMarkdown(makeDocument(p, 'packet')), /not automatically included/);
});
test('candidate and congregation outputs exclude internal notes', () => {
  const p = fillProject();
  p.answers.conflicts.value = 'INTERNAL_SECRET';
  p.answers.safetyOwner.value = 'SENSITIVE_LOCATION';
  p.answers.verificationRecord.value = 'INTERNAL_REVIEW';
  for (const d of DOCUMENTS.filter((d) => d.audience !== 'Internal')) {
    const out = documentMarkdown(makeDocument(p, d.id));
    assert.doesNotMatch(out, /INTERNAL_SECRET|SENSITIVE_LOCATION|INTERNAL_REVIEW/, d.id);
  }
});
test('document HTML escapes user-provided markup and markdown blocks active HTML', () => {
  const p = newProject();
  setAnswer(p, 'churchName', '<img src=x onerror=alert(1)>');
  setAnswer(p, 'history', '<script>alert(1)</script>');
  const doc = makeDocument(p, 'profile');
  assert(!documentHtml(doc).includes('<script>'));
  assert(documentHtml(doc).includes('&lt;script&gt;'));
  assert(!documentMarkdown(doc).includes('<script>'));
});
