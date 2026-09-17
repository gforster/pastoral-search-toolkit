import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { ProjectStore, PREFIX } from '../src/storage.js';
import {
  newProject,
  validateProject,
  setAnswer,
  readiness,
  tasksFor,
  serializeBackup,
  importBackup,
} from '../src/domain.js';
import {
  makeDocument,
  documentMarkdown,
  standaloneHtml,
  availableDocuments,
  generatePackage,
} from '../src/documents.js';
import { migrateProject } from '../src/schema/migrations.ts';
import { reusableTemplate, suggestPreset } from '../src/domain/templates.ts';
import { STARTER_PRESET } from '../src/content/presets/independent-baptist.js';
import { selectedQuestions } from '../src/artifacts/templates/additional.js';
import { scenario, completeProject } from './fixtures/scenarios.mjs';
class MemoryStorage {
  data = new Map();
  get length() {
    return this.data.size;
  }
  key(i) {
    return [...this.data.keys()][i];
  }
  getItem(k) {
    return this.data.get(k) ?? null;
  }
  setItem(k, v) {
    this.data.set(k, v);
  }
}
function legacyProject() {
  const p = newProject();
  p.schemaVersion = 1;
  for (const key of ['customQuestions', 'artifactOptions', 'artifactReviews', 'presetSuggestions'])
    delete p[key];
  return p;
}

test('A: planned transition uses preparation guidance, flexible model, and a truthful packet', () => {
  const p = scenario('A');
  assert.equal(readiness(p, 'search').ready, false);
  assert.match(documentMarkdown(makeDocument(p, 'start')), /gratitude/);
  assert.match(documentMarkdown(makeDocument(p, 'position')), /Flexible/);
  assert.match(documentMarkdown(makeDocument(p, 'packet')), /TO BE CONFIRMED/);
  assert(!tasksFor(p).some((t) => t.id === 'salary' && t.classification === 'BLOCKER_NOW'));
});
test('B: sudden vacancy prioritizes stabilization and leaves later requirements visible', () => {
  const p = scenario('B');
  p.inventory.job = 'no';
  assert.match(documentMarkdown(makeDocument(p, 'start')), /next service/);
  assert(!readiness(p, 'search').ready);
  assert.equal(tasksFor(p).find((t) => t.id === 'quorum').classification, 'REQUIRED_LATER');
  assert(tasksFor(p).some((t) => t.id === 'responsibilities'));
  setAnswer(p, 'history', 'Preparation can continue');
  assert.equal(p.answers.history.value, 'Preparation can continue');
});
test('C: interim candidacy requires an explicit decision and information boundaries', () => {
  const p = scenario('C');
  const missing = readiness(p, 'search').missing.map((f) => f.id);
  for (const id of ['interimCandidacy', 'interimBoundaries', 'internalSafeguards'])
    assert(missing.includes(id));
  assert.match(documentMarkdown(makeDocument(p, 'interim')), /recusal/);
  assert.match(documentMarkdown(makeDocument(p, 'interim')), /does not automatically/);
});
test('D: bivocational availability affects readiness, position, compensation and package', () => {
  const p = scenario('D');
  assert(readiness(p, 'advancement').missing.some((f) => f.id === 'availableHours'));
  assert.match(documentMarkdown(makeDocument(p, 'position')), /actual availability/);
  assert.match(documentMarkdown(makeDocument(p, 'compensation')), /Bivocational support/);
  assert(availableDocuments(p).some((d) => d.id === 'bivocational'));
  setAnswer(p, 'pastoralModel', 'full');
  assert(!availableDocuments(p).some((d) => d.id === 'bivocational'));
  assert(!tasksFor(p).some((t) => t.id === 'availableHours'));
});
test('E: unknown governance never waives a vote; an explicit alternative uses its own procedure', () => {
  const p = completeProject();
  for (const id of ['createAuthority', 'quorum', 'voteThreshold']) setAnswer(p, id, '', 'unknown');
  assert(readiness(p, 'committee').missing.some((f) => f.id === 'createAuthority'));
  assert(readiness(p, 'finalist').missing.some((f) => f.id === 'quorum'));
  setAnswer(p, 'callMethod', 'no_vote');
  setAnswer(p, 'decisionProcedure', '', 'unknown');
  assert(!readiness(p, 'finalist').missing.some((f) => f.id === 'quorum'));
  assert(readiness(p, 'finalist').missing.some((f) => f.id === 'decisionProcedure'));
  const text = documentMarkdown(makeDocument(p, 'governance'));
  assert.doesNotMatch(text, /What quorum/);
  assert.match(text, /Final call decision procedure/);
});
test('F: export/import preserves readiness and every artifact body exactly', () => {
  const p = completeProject();
  p.questions = ['i1', 'i8'];
  p.customQuestions = [
    {
      id: 'custom1',
      title: 'Clarify',
      category: 'Follow-up',
      kind: 'followup',
      question: 'Which example demonstrates that?',
    },
  ];
  const copy = importBackup(serializeBackup(p));
  for (const stage of [
    'stabilize',
    'committee',
    'search',
    'advancement',
    'finalist',
    'call',
    'handoff',
  ])
    assert.deepEqual(readiness(copy, stage), readiness(p, stage));
  for (const d of availableDocuments(p))
    assert.equal(
      documentMarkdown(makeDocument(copy, d.id)),
      documentMarkdown(makeDocument(p, d.id)),
      d.id,
    );
});
test('G: presets remain suggestions and reusable templates exclude private search fields', () => {
  const p = scenario('A');
  setAnswer(p, 'salary', 'PRIVATE_SALARY');
  setAnswer(p, 'members', 'PRIVATE_NAMES');
  setAnswer(p, 'healingPlan', 'PRIVATE_CIRCUMSTANCES');
  const before = serializeBackup(p);
  suggestPreset(p, STARTER_PRESET);
  assert.equal(p.answers.callAuthority.value, 'Congregation');
  assert(p.presetSuggestions.answers.callAuthority);
  assert.equal(p.answers.seriousConsideration, undefined);
  setAnswer(p, 'seriousConsideration', 'several');
  assert.equal(p.answers.seriousConsideration.value, 'several');
  assert.doesNotMatch(JSON.stringify(reusableTemplate(p)), /PRIVATE_/);
  assert.match(before, /PRIVATE_/);
});
test('v1 migrates without guessing governance or mutating the source; future versions are rejected', () => {
  const legacy = legacyProject();
  legacy.answers.quorum = { status: 'unknown', value: '' };
  const copy = migrateProject(legacy);
  assert.equal(copy.schemaVersion, 2);
  assert.equal(legacy.schemaVersion, 1);
  assert.deepEqual(copy.answers, legacy.answers);
  assert.equal(copy.answers.callMethod, undefined);
  assert.throws(() => migrateProject({ ...copy, schemaVersion: 99 }), /newer version/);
  const imported = importBackup(
    JSON.stringify({ format: 'pastoral-search-toolkit', schemaVersion: 1, project: legacy }),
  );
  assert.equal(imported.schemaVersion, 2);
});
test('ZIP contains independent print HTML, Markdown, private backup and provenance; excludes irrelevant tools', () => {
  const p = scenario('A');
  const files = unzipSync(generatePackage(p));
  for (const path of [
    'START-HERE.md',
    'START-HERE.html',
    'project.json',
    'provenance.json',
    'WORKING-DOCUMENTS/01-preparation.md',
    'HANDOUTS/H01-candidate.html',
    'REFERENCE-MATERIALS/R01-handbook.md',
  ])
    assert(files['pastoral-search/' + path], path);
  assert(!Object.keys(files).some((path) => path.endsWith('-bivocational.md')));
  assert.match(strFromU8(files['pastoral-search/START-HERE.html']), /@page/);
  assert.deepEqual(
    importBackup(strFromU8(files['pastoral-search/project.json'])).answers,
    p.answers,
  );
});
test('status distinguishes incomplete, review-ready and explicit approval, then invalidates after edits', () => {
  const p = completeProject();
  assert.equal(makeDocument(p, 'compensation').status, 'READY FOR COMMITTEE REVIEW');
  p.artifactReviews.compensation = {
    at: p.updatedAt,
    record: 'Church-approved for finalist discussion',
  };
  assert.equal(makeDocument(p, 'compensation').status, 'APPROVED FOR USE');
  setAnswer(p, 'salary', 'Revised range');
  assert.notEqual(makeDocument(p, 'compensation').status, 'APPROVED FOR USE');
  setAnswer(p, 'compStatus', 'discussion');
  assert.equal(makeDocument(p, 'compensation').status, 'INCOMPLETE');
});
test('adopted convictions generate questions; draft preferences do not become requirements', () => {
  const p = newProject();
  p.requirements = [
    {
      id: 'c1',
      category: 'conviction',
      status: 'adopted',
      statement: 'Our adopted practice',
      evidence: '',
    },
    { id: 'p1', category: 'preference', status: 'adopted', statement: 'My taste', evidence: '' },
  ];
  const questions = selectedQuestions(p);
  assert.equal(questions.length, 1);
  assert.match(questions[0].question, /Our adopted practice/);
  assert.doesNotMatch(questions[0].question, /My taste/);
});
test('standalone HTML cannot execute imported markup or load scripts', () => {
  const p = newProject();
  setAnswer(p, 'churchName', '<script>alert(1)</script>');
  const html = standaloneHtml(makeDocument(p, 'profile'));
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /default-src 'none'/);
});
test('worked example validates and intentionally leaves unestablished quorum and notice unknown', async () => {
  const raw = JSON.parse(await readFile('examples/fellowship-baptist.example.json', 'utf8'));
  const p = validateProject(raw.project);
  assert.equal(p.answers.quorum.status, 'unknown');
  assert.equal(p.answers.notice.status, 'unknown');
  assert.match(p.name, /SAMPLE/);
});
test('IndexedDB migration retains originals, reports damage, and never resurrects deleted projects', async () => {
  const indexedDB = new IDBFactory(),
    legacy = new MemoryStorage(),
    p = legacyProject();
  legacy.setItem(PREFIX + p.id, JSON.stringify(p));
  legacy.setItem(PREFIX + 'broken', '{broken');
  let store = await ProjectStore.open(indexedDB, legacy);
  assert.equal(store.load(p.id).schemaVersion, 2);
  assert.deepEqual(store.list().errors, ['broken']);
  assert.equal(store.recoverRaw('broken'), '{broken');
  assert(legacy.getItem(PREFIX + p.id));
  await store.remove(p.id, p.revision);
  store.close();
  store = await ProjectStore.open(indexedDB, legacy);
  assert.equal(store.load(p.id), null);
  store.close();
});
test('IndexedDB transactions reject stale saves and stale deletes without losing the newer record', async () => {
  const idb = new IDBFactory(),
    a = await ProjectStore.open(idb),
    p = newProject();
  await a.save(p);
  const b = await ProjectStore.open(idb);
  const stale = b.load(p.id);
  setAnswer(p, 'location', 'New value');
  await a.save(p);
  setAnswer(stale, 'location', 'Stale value');
  await assert.rejects(b.save(stale), /another tab/);
  await assert.rejects(b.remove(stale.id, stale.revision), /another tab/);
  await b.refresh();
  assert.equal(b.load(p.id).answers.location.value, 'New value');
  await a.remove(p.id, p.revision);
  await assert.rejects(a.save(p), /removed/);
  a.close();
  b.close();
});
test('quota/transaction failure preserves in-memory work and revision for backup', async () => {
  const store = await ProjectStore.open(new IDBFactory()),
    p = newProject();
  setAnswer(p, 'history', 'Preserve this work');
  const original = IDBObjectStore.prototype.put;
  try {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('Full', 'QuotaExceededError');
    };
    await assert.rejects(store.save(p), /Full/);
    assert.equal(p.revision, 0);
    assert.match(serializeBackup(p), /Preserve this work/);
  } finally {
    IDBObjectStore.prototype.put = original;
    store.close();
  }
});

test('a permitted interim candidate cannot evade recusal through a conflicting general answer', () => {
  const p = completeProject();
  setAnswer(p, 'interim', 'yes');
  setAnswer(p, 'interimCandidacy', 'permitted');
  delete p.answers.internalSafeguards;
  assert(readiness(p, 'search').missing.some((f) => f.id === 'internalSafeguards'));
  assert.equal(p.answers.gateVerification.value, 'draft');
});
test('a required unknown embedded in narrative prevents formal-ready status', () => {
  const p = completeProject();
  delete p.answers.callAuthority;
  assert.equal(makeDocument(p, 'faq').incomplete, true);
});
