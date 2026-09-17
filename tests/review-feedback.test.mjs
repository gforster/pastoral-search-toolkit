import test from 'node:test';
import assert from 'node:assert/strict';
import { FIELDS, FIELD_MAP, MODULES, QUALIFICATIONS } from '../src/data.js';
import { newProject, moduleReviewMissing, reviewModule } from '../src/domain.js';
import { moduleReviewIssues } from '../src/review-feedback.js';

test('review feedback names every blocking field and follows conditional applicability in all modules', () => {
  const p = newProject();
  for (const [id, value] of Object.entries({
    interim: 'yes',
    associate: 'yes',
    internalCandidate: 'yes',
    sermonReview: 'yes',
    pastoralModel: 'bivocational',
  }))
    p.answers[id] = { status: 'known', value };
  for (const m of MODULES) {
    const missing = moduleReviewMissing(p, m.id);
    const issues = moduleReviewIssues(p, m.id);
    assert.deepEqual(
      issues.map((i) => i.fieldId),
      missing.map((f) => f.id),
      m.id,
    );
    for (const issue of issues) {
      assert.ok(issue.reason, `${m.id}: ${issue.label}`);
      assert.ok(issue.targetId);
    }
    if (missing.length)
      assert.throws(
        () => reviewModule(p, m.id),
        (error) => missing.every((f) => error.message.includes(f.label)),
      );
  }
  assert.ok(moduleReviewIssues(p, 'transition').some((i) => i.fieldId === 'interimTerms'));
  p.answers.interim.value = 'no';
  assert.ok(!moduleReviewIssues(p, 'transition').some((i) => i.fieldId === 'interimTerms'));
  p.answers.callMethod = { status: 'known', value: 'no_vote' };
  assert.ok(!moduleReviewIssues(p, 'governance').some((i) => i.fieldId === 'quorum'));
});

test('filled but unresolved answers explain the actual condition instead of asking for a missing answer', () => {
  const p = newProject();
  p.answers.servicesCovered = { status: 'known', value: 'no' };
  const issue = moduleReviewIssues(p, 'transition').find((i) => i.fieldId === 'servicesCovered');
  assert.match(issue.reason, /Current answer: “No”/);
  assert.match(issue.reason, /“Yes”/);
  p.answers.servicesCovered.value = 'yes';
  assert.ok(!moduleReviewIssues(p, 'transition').some((i) => i.fieldId === 'servicesCovered'));
  p.answers.compStatus = { status: 'known', value: 'provisional' };
  p.answers.compFinal = { status: 'known', value: 'approved' };
  const dependent = moduleReviewIssues(p, 'compensation').find((i) => i.fieldId === 'compFinal');
  assert.equal(dependent.targetId, 'field-compStatus');
  assert.match(dependent.reason, /Approved \/ final/);
  p.answers.compStatus.value = 'approved';
  assert.ok(!moduleReviewIssues(p, 'compensation').some((i) => i.fieldId === 'compFinal'));
});

test('qualification feedback identifies the exact unanswered prompt even when adoption says approved', () => {
  const p = newProject();
  for (const q of QUALIFICATIONS)
    p.qualifications[q.id] = {
      meaning: 'Recorded',
      evidence: 'Recorded',
      disqualifying: 'Recorded',
      questions: 'Recorded',
    };
  p.answers.qualificationAdoption = { status: 'known', value: 'approved' };
  delete p.qualifications.q7.evidence;
  const issue = moduleReviewIssues(p, 'qualifications').find(
    (i) => i.fieldId === 'qualificationAdoption',
  );
  assert.equal(issue.targetId, 'q7-evidence');
  assert.match(issue.reason, /Evidence we will seek/);
  p.qualifications.q7.evidence = 'Verified sources';
  assert.ok(
    !moduleReviewIssues(p, 'qualifications').some((i) => i.fieldId === 'qualificationAdoption'),
  );
  for (const f of FIELDS.filter((f) => f.module === 'transition' && f.due !== null))
    p.answers[f.id] = {
      status: 'known',
      value: f.accept?.[0] || f.options?.at(-1)[0] || 'Recorded',
    };
  delete p.answers.currentAuthority;
  assert.deepEqual(
    moduleReviewMissing(p, 'transition').map((f) => f.id),
    ['currentAuthority'],
  );
  assert.throws(
    () => reviewModule(p, 'transition'),
    (error) => error.message.includes(FIELD_MAP.currentAuthority.label),
  );
});
