import { migrateProject } from '../schema/migrations.ts';
import { emptyCollaboration, validateCollaboration } from '../schema/collaboration.ts';
import {
  SCHEMA_VERSION,
  FIELDS,
  FIELD_MAP,
  MODULES,
  MILESTONES,
  QUALIFICATIONS,
  QUESTIONS,
  PATHS,
} from '../data.js';
export const MAX_BACKUP_BYTES = 10_000_000;
export const now = () => new Date().toISOString();
export const uid = () => globalThis.crypto.randomUUID();
export const stageIndex = (id) => MILESTONES.findIndex((s) => s.id === id);
export const answerValue = (p, id) =>
  p.answers[id]?.status === 'known' ? p.answers[id].value : '';
export function newProject(path = 'sudden') {
  const start = PATHS.find((p) => p[0] === path) || PATHS[0];
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid(),
    name: 'Our church’s pastoral search',
    createdAt: now(),
    updatedAt: now(),
    revision: 0,
    milestone: start[3],
    answers: {},
    reviews: {},
    qualifications: {},
    requirements: [],
    questions: [],
    tasks: [],
    inventory: {},
    customQuestions: [],
    artifactOptions: { includeStatus: true },
    artifactReviews: {},
    presetSuggestions: null,
    collaboration: emptyCollaboration(uid()),
  };
}
export function applicable(p, f) {
  if (f.id === 'internalSafeguards')
    return (
      answerValue(p, 'internalCandidate') === 'yes' ||
      (answerValue(p, 'interim') === 'yes' && answerValue(p, 'interimCandidacy') === 'permitted')
    );
  if (f.voteOnly && answerValue(p, 'callMethod') === 'no_vote') return false;
  if (f.module === 'bivocational' && answerValue(p, 'pastoralModel') !== 'bivocational')
    return false;
  if (f.module === 'interim' && answerValue(p, 'interim') !== 'yes') return false;
  if (f.module === 'sermons' && answerValue(p, 'sermonReview') !== 'yes') return false;
  return !f.when || answerValue(p, f.when[0]) === f.when[1];
}
export function requiredAt(f, index) {
  return f.due !== null && (f.stages ? f.stages.includes(index) : f.due <= index);
}
export function resolved(p, f) {
  const a = p.answers[f.id];
  if (!a) return false;
  if (a.status === 'not_applicable') return !!f.allowNA;
  if (a.status !== 'known' || !a.value.trim()) return false;
  if (f.accept && !f.accept.includes(a.value)) return false;
  if (f.id === 'compFinal' && answerValue(p, 'compStatus') !== 'approved') return false;
  if (f.id === 'qualificationAdoption' && !qualificationsComplete(p)) return false;
  return true;
}
export function qualificationsComplete(p) {
  return QUALIFICATIONS.every((q) =>
    ['meaning', 'evidence', 'disqualifying', 'questions'].every((k) =>
      p.qualifications[q.id]?.[k]?.trim(),
    ),
  );
}
export function qualificationCount(p) {
  return QUALIFICATIONS.filter((q) =>
    ['meaning', 'evidence', 'disqualifying', 'questions'].every((k) =>
      p.qualifications[q.id]?.[k]?.trim(),
    ),
  ).length;
}
export function readiness(p, milestone = p.milestone) {
  const index = stageIndex(milestone);
  if (index < 0) throw new Error('Choose a valid milestone.');
  const missing = FIELDS.filter((f) => applicable(p, f) && requiredAt(f, index) && !resolved(p, f));
  const custom = p.tasks.filter((t) => t.prerequisite !== false && t.due <= index && !t.resolved);
  return {
    ready: missing.length === 0 && custom.length === 0,
    missing,
    custom,
    total: missing.length + custom.length,
  };
}
export function tasksFor(p) {
  const index = stageIndex(p.milestone);
  return FIELDS.filter((f) => applicable(p, f) && !resolved(p, f))
    .map((f) => {
      const needed = requiredAt(f, index);
      const future = f.due !== null && (f.stages ? f.stages.some((s) => s > index) : f.due > index);
      return {
        id: f.id,
        module: f.module,
        label: f.label,
        help: f.help,
        due: f.due,
        resolved: false,
        classification: needed
          ? 'BLOCKER_NOW'
          : future
            ? 'REQUIRED_LATER'
            : f.priority === 'OPTIONAL'
              ? 'OPTIONAL'
              : 'RECOMMENDED',
      };
    })
    .concat(
      p.tasks
        .filter((t) => t.prerequisite !== false && !t.resolved)
        .map((t) => ({
          ...t,
          module: 'call',
          custom: true,
          classification: t.due <= index ? 'BLOCKER_NOW' : 'REQUIRED_LATER',
        })),
    );
}
export function moduleState(p, moduleId) {
  const fs = FIELDS.filter((f) => f.module === moduleId && applicable(p, f));
  const started =
    fs.some((f) => p.answers[f.id]) ||
    (moduleId === 'qualifications' && Object.keys(p.qualifications).length > 0) ||
    (moduleId === 'convictions' && p.requirements.length > 0);
  if (!started) return 'NOT_STARTED';
  const review = p.reviews[moduleId];
  if (review?.stale) return 'NEEDS_REVIEW';
  const required = fs.filter((f) => f.due !== null);
  if (review?.at && required.every((f) => resolved(p, f))) return 'READY';
  if (fs.some((f) => requiredAt(f, stageIndex(p.milestone)) && !resolved(p, f))) return 'BLOCKED';
  return 'IN_PROGRESS';
}
export function invalidateReviews(p, moduleId, resetAttestations = true) {
  p.artifactReviews = {};
  const dependencies = {
    transition: ['profile', 'committee', 'process', 'call', 'handoff'],
    profile: ['position', 'process', 'call'],
    governance: MODULES.map((m) => m.id),
    committee: ['process', 'interviews', 'call', 'handoff'],
    doctrine: ['process', 'interviews', 'call'],
    qualifications: ['process', 'interviews', 'call'],
    convictions: ['position', 'process', 'interviews', 'call'],
    position: ['compensation', 'process', 'call', 'handoff'],
    compensation: ['process', 'call', 'handoff'],
    process: ['interviews', 'safety', 'call'],
    interim: ['committee', 'process', 'interviews', 'call', 'handoff'],
    bivocational: ['position', 'compensation', 'call', 'handoff'],
    sermons: ['interviews', 'call'],
    assessment: ['profile', 'position', 'call'],
    interviews: ['call'],
    safety: ['call'],
    communication: ['call'],
    call: ['handoff'],
    handoff: [],
  };
  const affected = new Set([moduleId, ...(dependencies[moduleId] || [])]);
  for (const id of affected) if (p.reviews[id]?.at) p.reviews[id].stale = true;
  if (resetAttestations)
    for (const f of FIELDS) {
      if (
        affected.has(f.module) &&
        f.options?.some(([v]) => v === 'approved') &&
        f.id !== 'compStatus' &&
        p.answers[f.id]?.value === 'approved'
      )
        p.answers[f.id] = { status: 'known', value: 'draft' };
    }
}
export function setAnswer(p, id, value, status = 'known') {
  const f = FIELD_MAP[id];
  if (!f) throw new Error('Unknown workbook field.');
  validateAnswer({ value, status }, f);
  p.answers[id] = { value, status };
  if (id === 'churchName') p.name = value.trim() || 'Our church’s pastoral search';
  invalidateReviews(p, f.module, !f.accept || ['interimCandidacy', 'compStatus'].includes(f.id));
  p.updatedAt = now();
  return p;
}
export function moduleReviewMissing(p, id) {
  return FIELDS.filter(
    (f) => f.module === id && applicable(p, f) && f.due !== null && !resolved(p, f),
  );
}
export function reviewModule(p, id) {
  if (!MODULES.some((m) => m.id === id)) throw new Error('Unknown module.');
  const missing = moduleReviewMissing(p, id);
  if (missing.length)
    throw new Error(
      `Before marking this module reviewed, resolve: ${missing.map((f) => f.label).join('; ')}. You can leave it in progress and work elsewhere.`,
    );
  p.reviews[id] = { at: now(), stale: false };
  p.updatedAt = now();
  return p;
}
function object(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function str(v, max = 20000) {
  return typeof v === 'string' && v.length <= max;
}
function assert(ok, msg = 'This project file is invalid or unsupported.') {
  if (!ok) throw new Error(msg);
}
function validateAnswer(a, f) {
  assert(
    object(a) &&
      ['known', 'unknown', 'not_applicable'].includes(a.status) &&
      str(a.value, f.id === 'doctrineText' ? 100000 : f.id === 'churchName' ? 1000 : 20000),
  );
  assert(
    a.status !== 'not_applicable' || f.allowNA,
    'This required field cannot be marked not applicable.',
  );
  if (a.status === 'known' && a.value) {
    if (f.options)
      assert(
        f.options.some(([v]) => v === a.value),
        'This file contains an invalid choice.',
      );
    if (f.type === 'date')
      assert(
        /^\d{4}-\d{2}-\d{2}$/.test(a.value) &&
          !Number.isNaN(Date.parse(a.value)) &&
          new Date(a.value).toISOString().slice(0, 10) === a.value,
        'Use a valid calendar date.',
      );
  }
}
export function validateProject(raw) {
  raw = migrateProject(raw);
  assert(object(raw));
  assert(
    raw.schemaVersion === SCHEMA_VERSION,
    'This backup uses a different version. Keep the original file and use a compatible toolkit release.',
  );
  assert(str(raw.id, 80) && /^[\w-]{1,80}$/.test(raw.id));
  assert(str(raw.name, 1000) && str(raw.createdAt, 40) && str(raw.updatedAt, 40));
  assert(!Number.isNaN(Date.parse(raw.createdAt)) && !Number.isNaN(Date.parse(raw.updatedAt)));
  assert(Number.isSafeInteger(raw.revision) && raw.revision >= 0 && stageIndex(raw.milestone) >= 0);
  assert(
    object(raw.answers) &&
      object(raw.reviews) &&
      object(raw.qualifications) &&
      object(raw.inventory),
  );
  const p = {
    schemaVersion: SCHEMA_VERSION,
    id: raw.id,
    name: raw.name,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    revision: raw.revision,
    milestone: raw.milestone,
    answers: {},
    reviews: {},
    qualifications: {},
    requirements: [],
    questions: [],
    tasks: [],
    inventory: {},
    customQuestions: [],
    artifactOptions: { includeStatus: true },
    artifactReviews: {},
    presetSuggestions: null,
  };
  for (const [id, a] of Object.entries(raw.answers)) {
    assert(Object.hasOwn(FIELD_MAP, id), 'This file contains an unrecognized field.');
    validateAnswer(a, FIELD_MAP[id]);
    p.answers[id] = { status: a.status, value: a.value };
  }
  for (const [id, r] of Object.entries(raw.reviews)) {
    assert(
      MODULES.some((m) => m.id === id) &&
        object(r) &&
        str(r.at, 40) &&
        !Number.isNaN(Date.parse(r.at)) &&
        typeof r.stale === 'boolean',
    );
    p.reviews[id] = { at: r.at, stale: r.stale };
  }
  for (const [id, q] of Object.entries(raw.qualifications)) {
    assert(QUALIFICATIONS.some((q) => q.id === id) && object(q));
    p.qualifications[id] = {};
    for (const [k, v] of Object.entries(q)) {
      assert(['meaning', 'evidence', 'disqualifying', 'questions'].includes(k) && str(v));
      p.qualifications[id][k] = v;
    }
  }
  assert(Array.isArray(raw.requirements) && raw.requirements.length <= 200);
  for (const r of raw.requirements) {
    assert(
      object(r) &&
        str(r.id, 80) &&
        str(r.statement) &&
        str(r.evidence) &&
        ['conviction', 'fit', 'preference'].includes(r.category) &&
        ['draft', 'adopted'].includes(r.status),
    );
    p.requirements.push({
      id: r.id,
      statement: r.statement,
      evidence: r.evidence,
      category: r.category,
      status: r.status,
    });
  }
  assert(
    Array.isArray(raw.questions) &&
      raw.questions.length <= QUESTIONS.length &&
      new Set(raw.questions).size === raw.questions.length,
  );
  assert(raw.questions.every((id) => QUESTIONS.some((q) => q.id === id)));
  p.questions = [...raw.questions];
  assert(Array.isArray(raw.tasks) && raw.tasks.length <= 200);
  for (const t of raw.tasks) {
    assert(
      object(t) &&
        str(t.id, 80) &&
        str(t.label, 1000) &&
        str(t.owner, 500) &&
        Number.isInteger(t.due) &&
        t.due >= 0 &&
        t.due < MILESTONES.length &&
        typeof t.resolved === 'boolean',
    );
    p.tasks.push({ ...t });
  }
  for (const [id, status] of Object.entries(raw.inventory)) {
    assert(
      ['constitution', 'bylaws', 'doctrine', 'job', 'search', 'policies'].includes(id) &&
        ['yes', 'no', 'unknown'].includes(status),
    );
    p.inventory[id] = status;
  }
  assert(
    new Set(p.requirements.map((r) => r.id)).size === p.requirements.length &&
      new Set(p.tasks.map((t) => t.id)).size === p.tasks.length,
  );
  p.customQuestions = raw.customQuestions;
  assert(new Set(p.customQuestions.map((q) => q.id)).size === p.customQuestions.length);
  p.artifactOptions = raw.artifactOptions;
  p.artifactReviews = raw.artifactReviews;
  p.presetSuggestions = raw.presetSuggestions;
  p.collaboration = validateCollaboration(raw.collaboration);
  for (const t of p.tasks) {
    if (t.candidateId)
      assert(
        p.collaboration.candidates.some((c) => c.id === t.candidateId),
        'Task references a missing candidate.',
      );
    if (t.moduleId)
      assert(
        MODULES.some((m) => m.id === t.moduleId),
        'Task references an unknown module.',
      );
    if (t.status)
      assert(t.resolved === (t.status === 'done'), 'Task completion and status disagree.');
  }
  if (p.presetSuggestions)
    for (const [id, a] of Object.entries(p.presetSuggestions.answers)) {
      assert(Object.hasOwn(FIELD_MAP, id));
      validateAnswer(a, FIELD_MAP[id]);
    }
  return p;
}
export function serializeBackup(p) {
  return JSON.stringify(
    {
      format: 'pastoral-search-toolkit',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: now(),
      project: validateProject(p),
    },
    null,
    2,
  );
}
export function importBackup(text) {
  assert(
    typeof text === 'string' && new TextEncoder().encode(text).length <= MAX_BACKUP_BYTES,
    'Choose a project JSON backup smaller than 10 MB.',
  );
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This is not a valid JSON backup. Your existing projects have not changed.');
  }
  if (raw?.format === 'pastoral-search-toolkit' && raw.schemaVersion > SCHEMA_VERSION)
    throw new Error(
      'This project was created with a newer version of the toolkit. Update the application before importing it.',
    );
  assert(
    raw?.format === 'pastoral-search-toolkit' &&
      [1, 2, SCHEMA_VERSION].includes(raw.schemaVersion) &&
      raw.project?.schemaVersion === raw.schemaVersion,
    'Choose a Pastoral Search Toolkit backup in a supported version.',
  );
  const p = validateProject(raw.project);
  p.id = uid();
  p.revision = 0;
  p.name = p.name.slice(0, 989) + ' (imported)';
  return p;
}
export function escapeHtml(s = '') {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
