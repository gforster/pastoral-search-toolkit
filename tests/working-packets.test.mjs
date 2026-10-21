import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { newProject, setAnswer, importBackup, readiness } from '../src/domain.js';
import { completeProject } from './fixtures/scenarios.mjs';
import { QUALIFICATIONS } from '../src/data.js';
import {
  WORKING_PACKETS,
  BINDER_TABS,
  FIRST_ASSIGNMENTS,
  MEETING_PLAN,
  makeWorkingPacket,
  standaloneWorkingHtml,
  generatePackage,
  makeDocument,
  documentMarkdown,
  WORKING_PRINT_CSS,
  documentHtml,
  MEETING_LEGEND,
} from '../src/documents.js';

const allDocuments = (packet) => packet.groups.flatMap((group) => group.documents);
const body = (packet) => JSON.stringify(packet);
test('working binder has twelve substantive tabs and separate reusable records, without later banks', () => {
  const p = newProject('planned');
  const packet = makeWorkingPacket(p, 'working-binder');
  assert.equal(packet.groups.length, BINDER_TABS.length);
  assert(packet.groups.every((g) => g.documents.length));
  const titles = allDocuments(packet).map((d) => d.title);
  for (const title of [
    'Meeting record',
    'Decision record',
    'Action follow-up',
    'First meeting assignments',
    'Transition planning',
  ])
    assert(titles.includes(title));
  for (const title of [
    'Interview Question Bank',
    'Scenario Question Bank',
    'Pulpit Committee Handbook',
    'Search Preparation Worksheet',
    'Candidate Evaluation Worksheet',
  ])
    assert(!titles.includes(title));
  assert.match(body(packet), /Who is authorized|authorized/i);
});
test('all 26 qualification definitions and difficult judgment prompts survive assembly', () => {
  const p = newProject();
  for (const q of QUALIFICATIONS)
    p.qualifications[q.id] = Object.fromEntries(
      ['meaning', 'evidence', 'disqualifying', 'questions'].map((key) => [
        key,
        `${q.id}-${key}-retained`,
      ]),
    );
  const text = body(makeWorkingPacket(p, 'working-binder'));
  for (const q of QUALIFICATIONS)
    for (const key of ['meaning', 'evidence', 'disqualifying', 'questions'])
      assert(text.includes(`${q.id}-${key}-retained`));
});
test('all meeting packets share the same eight assignments and the agenda totals two hours', () => {
  const packets = ['working-binder', 'meeting-agenda', 'chair-guide'].map((id) =>
    makeWorkingPacket(newProject(), id),
  );
  const sheets = packets.map((p) =>
    allDocuments(p).find((d) => d.title === 'First meeting assignments'),
  );
  assert.deepEqual(sheets[0], sheets[1]);
  assert.deepEqual(sheets[1], sheets[2]);
  assert.equal(sheets[0].sections[1].rows.length, FIRST_ASSIGNMENTS.length);
  assert.equal(
    MEETING_PLAN.reduce((n, [minutes]) => n + minutes, 0),
    120,
  );
  assert.match(MEETING_PLAN[1][1], /formalities/);
  assert.match(MEETING_PLAN[1][2], /chair and minutes secretary/);
});
test('unknowns stay truthful and generating packets never advances or approves the project', () => {
  const p = newProject('planned');
  setAnswer(p, 'churchName', 'Cedar Brook Fictional Church');
  setAnswer(p, 'finalDate', '', 'unknown');
  setAnswer(p, 'salary', '', 'unknown');
  const before = JSON.stringify(p),
    ready = readiness(p, 'search');
  for (const { id } of WORKING_PACKETS) {
    const packet = makeWorkingPacket(p, id);
    assert.match(packet.status, /DRAFT/);
    if (['working-binder', 'later-resources'].includes(id))
      assert.match(body(packet), /TBD|TO BE CONFIRMED/);
    assert.equal(packet.church, 'Cedar Brook Fictional Church');
  }
  assert.equal(JSON.stringify(p), before);
  assert.deepEqual(readiness(p, 'search'), ready);
  assert.deepEqual(p.artifactReviews, {});
});
test('follow-up projects existing work and owners, but excludes candidate-specific tasks', () => {
  const p = newProject();
  p.tasks = [
    {
      id: 'fact',
      label: 'Verify membership roll',
      owner: 'Fictional recorder',
      due: 1,
      dueDate: '2026-11-01',
      resolved: true,
    },
    {
      id: 'private',
      label: 'PRIVATE-CANDIDATE-CONCERN',
      owner: 'Private reviewer',
      candidateId: 'candidate-only',
      due: 0,
      resolved: false,
    },
  ];
  const text = body(makeWorkingPacket(p, 'working-binder'));
  assert.match(text, /Verify membership roll/);
  assert.match(text, /Fictional recorder/);
  assert.match(text, /2026-11-01/);
  assert.match(text, /Recorded complete — verify report/);
  assert.doesNotMatch(text, /PRIVATE-CANDIDATE-CONCERN|Private reviewer/);
  assert.deepEqual(p.artifactReviews, {});
});
test('internal assembly preserves external audience boundaries and escapes table and title input', () => {
  const p = newProject();
  setAnswer(p, 'churchName', '<img src=x onerror=alert(1)>');
  setAnswer(p, 'confidentiality', 'PRIVATE-COMMITTEE-TEXT');
  p.requirements = [
    {
      id: 'draft',
      category: 'preference',
      status: 'draft',
      statement: '<script>bad()</script>',
      evidence: 'Clarify first',
    },
  ];
  const html = standaloneWorkingHtml(makeWorkingPacket(p, 'working-binder'));
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /PRIVATE-COMMITTEE-TEXT/);
  for (const id of ['profile', 'candidate', 'congregation', 'update'])
    assert.doesNotMatch(documentMarkdown(makeDocument(p, id)), /PRIVATE-COMMITTEE-TEXT/);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /scope="col"/);
});
test('later resources preserve full question banks and respect optional tools', () => {
  const p = newProject();
  let docs = allDocuments(makeWorkingPacket(p, 'later-resources'));
  for (const id of ['question-bank', 'scenarios', 'evaluation', 'reference-form'])
    assert.deepEqual(docs.find((d) => d.id === id).sections, makeDocument(p, id).sections);
  assert(!docs.some((d) => d.id === 'sermon-worksheet'));
  setAnswer(p, 'sermonReview', 'yes');
  setAnswer(p, 'interim', 'yes');
  setAnswer(p, 'pastoralModel', 'bivocational');
  docs = allDocuments(makeWorkingPacket(p, 'later-resources'));
  for (const id of ['sermon-worksheet', 'interim', 'bivocational'])
    assert(docs.some((d) => d.id === id));
});
test('ZIP includes all assembled packets and restores the same working content', () => {
  const p = newProject();
  setAnswer(p, 'churchName', 'Cedar Brook Fictional Church');
  const files = unzipSync(generatePackage(p));
  const restored = importBackup(strFromU8(files['pastoral-search/project.json']));
  for (const { id } of WORKING_PACKETS) {
    assert.equal(
      strFromU8(files[`pastoral-search/${id}.html`]),
      standaloneWorkingHtml(makeWorkingPacket(p, id)),
    );
    assert.deepEqual(
      allDocuments(makeWorkingPacket(restored, id)).map((doc) => doc.sections),
      allDocuments(makeWorkingPacket(p, id)).map((doc) => doc.sections),
    );
  }
});

test('CSP-approved app styles match the standalone print renderer', async () => {
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const normalize = (text) =>
    text
      .replace(/(?<!\d)0\./g, '.')
      .replace(/\s+/g, '')
      .replace(/;}/g, '}');
  assert(normalize(css).includes(normalize(WORKING_PRINT_CSS)));
});
test('shared decision records retain dissent and follow-through without importing candidate decisions', () => {
  const p = newProject();
  p.collaboration.decisions = [
    {
      candidateId: null,
      date: '2026-10-21',
      type: 'OTHER',
      result: 'Report requested',
      rationale: 'Need source evidence',
      unresolvedConcerns: 'One member needs the original minutes',
      followUp: 'Locate adopted version',
      owner: 'Fictional recorder',
      reviewDate: '',
      recordedBy: 'Fictional chair',
      notes: '',
    },
    { candidateId: 'candidate-private', rationale: 'PRIVATE-CANDIDATE-DECISION' },
  ];
  const text = body(makeWorkingPacket(p, 'working-binder'));
  assert.match(text, /One member needs the original minutes/);
  assert.match(text, /Locate adopted version/);
  assert.doesNotMatch(text, /PRIVATE-CANDIDATE-DECISION/);
  assert.deepEqual(p.artifactReviews, {});
});

test('proposed second agenda is shared across meeting packets and reserves one hour without inventing decisions', () => {
  const p = newProject();
  const agenda = allDocuments(makeWorkingPacket(p, 'second-meeting'))[0];
  for (const id of ['working-binder', 'meeting-agenda', 'chair-guide'])
    assert.deepEqual(
      allDocuments(makeWorkingPacket(p, id)).find((d) => d.title === agenda.title),
      agenda,
    );
  assert.equal(agenda.sections[1].rows.at(-1)[0], '55–60');
  assert.match(JSON.stringify(agenda), /48 hours beforehand/);
  assert.match(JSON.stringify(agenda), /report receipt is not approval/);
  assert.match(
    JSON.stringify(agenda),
    /substantial doctrine, qualifications or governance questions/,
  );
});

test('meeting marks identify the planned action and never imply completed approval', () => {
  const p = newProject();
  const before = JSON.stringify(p);
  const packet = makeWorkingPacket(p, 'working-binder');
  assert(allDocuments(packet).every((doc) => /\[(1|2|F)\]/.test(doc.focus)));
  const html = standaloneWorkingHtml(packet);
  for (const mark of ['[1]', '[2]', '[F]']) assert(html.includes(mark));
  assert(html.includes(MEETING_LEGEND));
  assert.match(body(packet), /proposed first check-in, not a completion deadline/);
  assert.equal(JSON.stringify(p), before);
});
test('draft definitions and covenant notes respect recorded adoption instead of relabeling all inputs as samples', () => {
  const p = newProject();
  assert.match(makeDocument(p, 'qualifications').note.title, /draft/);
  setAnswer(p, 'qualificationAdoption', 'approved');
  setAnswer(p, 'qualificationRecord', 'Recorded checkbox alone');
  assert.match(makeDocument(p, 'qualifications').note.title, /draft/);
  const adopted = completeProject();
  assert.match(makeDocument(adopted, 'qualifications').note.title, /recorded working definitions/);
  assert.doesNotMatch(makeDocument(adopted, 'qualifications').note.title, /sample|draft/);
  assert.match(makeDocument(adopted, 'covenant').note.title, /recorded covenant approval/);
});
test('qualification print blocks retain all 104 values with separate references and clear labels', () => {
  const p = completeProject();
  p.qualifications[QUALIFICATIONS[0].id].meaning = '<script>private markup</script>';
  const html = documentHtml(makeDocument(p, 'qualifications'));
  assert.equal((html.match(/class="qualification-block"/g) || []).length, 26);
  assert.equal((html.match(/class="qualification-reference"/g) || []).length, 26);
  for (const label of [
    'Working meaning',
    'Evidence to seek',
    'Disqualifying pattern',
    'Questions / cases requiring judgment',
  ])
    assert.equal((html.match(new RegExp('<strong>' + label + ':</strong>', 'g')) || []).length, 26);
  assert.match(html, /&lt;script&gt;private markup&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
test('congregation input is an assigned proposal, a second-meeting review and later themes, not a vote', () => {
  const p = newProject();
  const binder = allDocuments(makeWorkingPacket(p, 'working-binder'));
  const chair = allDocuments(makeWorkingPacket(p, 'chair-guide'));
  const plan = binder.find((doc) => doc.title === 'Congregation input: proposed approach');
  assert.deepEqual(
    plan,
    chair.find((doc) => doc.title === plan.title),
  );
  assert.match(JSON.stringify(plan), /paper response card/);
  assert.match(JSON.stringify(plan), /phone or a brief conversation/);
  assert.match(JSON.stringify(plan), /release approval/);
  assert.match(JSON.stringify(plan), /does not amend doctrine/);
  assert.match(body(makeWorkingPacket(p, 'second-meeting')), /congregation-input plan/);
});
test('committee governance title retains its stable ID and explicitly defers to the constitution', () => {
  const p = newProject();
  const doc = makeDocument(p, 'governance');
  assert.equal(doc.id, 'governance');
  assert.equal(doc.title, 'Committee Governance Summary');
  assert.match(doc.note.title, /not the constitution/);
  assert.match(doc.note.body, /does not replace or amend/);
  assert.match(documentMarkdown(doc), /committee reference/);
  assert.doesNotMatch(documentHtml(doc), /class="meeting-marker"/);
  assert.doesNotMatch(documentMarkdown(doc), /\[1\].*Clarify authority/);
});
