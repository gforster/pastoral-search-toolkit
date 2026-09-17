import exampleBackup from '../examples/fellowship-baptist.example.json';
import { STARTER_PRESET } from './content/presets/independent-baptist.js';
import { suggestPreset } from './domain/templates.ts';
import { FIELD_MAP, MODULES, PATHS } from './data.js';
import {
  newProject,
  setAnswer,
  escapeHtml as e,
  uid,
  now,
  reviewModule,
  invalidateReviews,
  importBackup,
  serializeBackup,
  readiness,
  resolved,
  MAX_BACKUP_BYTES,
  validateProject,
} from './domain.js';
import { ProjectStore, PREFIX } from './storage.js';
import { createCollaborationUI } from './collaboration/controller.js';
import { sensitiveProject, SENSITIVE_NOTICE } from './domain/collaboration.ts';
import {
  moduleReviewIssues,
  focusReviewTarget,
  syncModuleReviewFeedback,
} from './review-feedback.js';
import { makeDocument, documentMarkdown, standaloneHtml, generatePackage } from './documents.js';
import {
  homeView,
  projectsView,
  orientationView,
  sidebar,
  dashboardView,
  moduleView,
  tasksView,
  documentsView,
  aboutView,
  base,
} from './views.js';
const app = document.querySelector('#app'),
  announcer = document.querySelector('#announcer');
const cache = new Map(),
  saveErrors = new Map(),
  unsavedIds = new Set(),
  reviewAttempts = new Set();
let store,
  collaborationUI,
  current = null,
  draft = null,
  draftPath = '',
  step = 0,
  saveError = '',
  message = '',
  unsaved = false,
  loadError = '';
document.querySelector('.skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  document.querySelector('#main')?.focus();
});
const SAMPLE_ID = 'fellowship-example';
const pendingSaves = new Map();
const changes =
  typeof BroadcastChannel === 'function' ? new BroadcastChannel('pastoral-search-projects') : null;
try {
  let legacy;
  try {
    legacy = window.localStorage;
  } catch {}
  store = await ProjectStore.open(window.indexedDB, legacy);
} catch {
  loadError =
    'Browser storage is unavailable. You can work here, but export a backup before closing the page.';
}
function projects() {
  if (!store)
    return { projects: [...cache.values()].filter((p) => p.id !== SAMPLE_ID), errors: [] };
  try {
    const r = store.list();
    for (const p of r.projects) if (!cache.has(p.id)) cache.set(p.id, p);
    return {
      ...r,
      projects: [
        ...new Map(
          [...r.projects, ...cache.values()]
            .filter((p) => p.id !== SAMPLE_ID)
            .map((p) => [p.id, p]),
        ).values(),
      ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    };
  } catch {
    loadError =
      'Saved projects could not be read. Your existing browser data has not been removed.';
    return { projects: [...cache.values()].filter((p) => p.id !== SAMPLE_ID), errors: [] };
  }
}
function getProject(id) {
  if (cache.has(id)) return cache.get(id);
  if (id === SAMPLE_ID) {
    const p = validateProject(exampleBackup.project);
    cache.set(id, p);
    return p;
  }
  const p = store?.load(id);
  if (p) cache.set(id, p);
  return p;
}
function notify(text) {
  message = text;
  announcer.textContent = text;
  updateFeedback();
}
function updateFeedback() {
  saveError = saveErrors.get(active()?.id) || '';
  unsaved = unsavedIds.size > 0;
  const f = document.querySelector('#feedback');
  if (f)
    f.innerHTML = `${loadError ? `<div class="error-banner" role="alert">${e(loadError)}</div>` : ''}${saveError ? `<div class="error-banner" role="alert"><strong>Not saved on this device.</strong> ${e(saveError)} <button class="button" data-export>Export current work</button><button class="button" data-reload>Reload saved copy</button></div>` : ''}${message ? `<div class="feedback-message" role="status">${e(message)}<button class="text-button" data-dismiss aria-label="Dismiss message">Dismiss</button></div>` : ''}`;
  const s = document.querySelector('#save-indicator');
  if (s) {
    s.textContent =
      active()?.id === SAMPLE_ID
        ? 'Sample · temporary exploration'
        : saveError || loadError
          ? 'Keep a backup — saving unavailable'
          : pendingSaves.has(active()?.id)
            ? 'Saving on this device…'
            : current
              ? 'Saved on this device'
              : 'Private · no account';
    s.classList.toggle('save-warning', !!(saveError || loadError));
  }
  const p = active();
  if (p)
    for (const el of document.querySelectorAll('select[data-field]')) {
      const a = p.answers[el.dataset.field];
      const value = a?.status === 'known' ? a.value : '';
      if (el.value !== value) el.value = value;
      updateAnswerControl(el.dataset.field);
    }
}
function save(p = current) {
  if (!p) return Promise.resolve(false);
  if (p.id === SAMPLE_ID) {
    cache.set(p.id, p);
    updateFeedback();
    return Promise.resolve(true);
  }
  cache.set(p.id, p);
  p.updatedAt = now();
  unsavedIds.add(p.id);
  const prior = pendingSaves.get(p.id) || Promise.resolve();
  const saving = prior.then(async () => {
    try {
      if (!store)
        throw new Error(
          'Browser storage is unavailable. Export a backup before closing this page.',
        );
      await store.save(p);
      saveErrors.delete(p.id);
      changes?.postMessage({ id: p.id });
      if (pendingSaves.get(p.id) === saving) unsavedIds.delete(p.id);
      return true;
    } catch (err) {
      saveErrors.set(
        p.id,
        err.name === 'QuotaExceededError'
          ? 'This browser’s storage is full. Export your current work before leaving.'
          : err.message,
      );
      return false;
    } finally {
      if (pendingSaves.get(p.id) === saving) pendingSaves.delete(p.id);
      updateFeedback();
    }
  });
  pendingSaves.set(p.id, saving);
  updateFeedback();
  return saving;
}
function active() {
  return current || draft;
}
function recordChange(module) {
  const p = active();
  invalidateReviews(p, module);
  p.updatedAt = now();
  if (current) save();
}
function route() {
  const [path, query] = (location.hash.slice(1) || 'home').split('?');
  return { parts: path.split('/'), field: new URLSearchParams(query).get('field') };
}
function render(focus = false) {
  const { parts, field } = route();
  let view,
    shell = false,
    section = '',
    moduleId = '';
  current = null;
  try {
    if (parts[0] === 'home') view = homeView(projects().projects);
    else if (parts[0] === 'projects') {
      const ps = projects();
      view = projectsView(ps.projects, ps.errors);
    } else if (parts[0] === 'about') view = aboutView();
    else if (parts[0] === 'reviews' || parts[0] === 'review')
      view = collaborationUI.reviewView(parts);
    else if (parts[0] === 'new') {
      const path = PATHS.some((p) => p[0] === parts[1]) ? parts[1] : 'sudden';
      if (!draft || draftPath !== path) {
        draft = newProject(path);
        draftPath = path;
        step = 0;
      }
      view = orientationView(draft, step);
    } else if (parts[0] === 'project') {
      current = getProject(parts[1]);
      if (!current)
        throw new Error(
          'This project is not on this device. Open a saved project or import its backup.',
        );
      shell = true;
      section = parts[2] || 'dashboard';
      moduleId = section === 'module' ? parts[3] : '';
      if (section === 'dashboard') view = dashboardView(current);
      else if (section === 'module') view = moduleView(current, moduleId);
      else if (section === 'tasks') view = tasksView(current, parts[3]);
      else if (section === 'documents') view = documentsView(current, parts[3]);
      else if (section === 'committee-work') view = collaborationUI.projectView(current, parts);
      else throw new Error('That page is not part of this workbook.');
    } else throw new Error('That page could not be found.');
  } catch (err) {
    view = `<main id="main" class="standalone narrow" tabindex="-1"><h1>Let’s find your workbook.</h1><p>${e(err.message)}</p><a class="button primary" href="#projects">Open a project</a><a class="button" href="#home">Starting points</a></main>`;
    shell = false;
  }
  document.title = `${current ? current.name + ' · ' : ''}Pastoral Search Toolkit`;
  app.innerHTML = `<header class="site-header"><a class="brand" href="#home"><img src="./favicon.svg" alt="" width="36" height="36"><span>Pastoral Search<span class="brand-sub">TOOLKIT</span></span></a><nav aria-label="Main"><span id="save-indicator" class="save-indicator"></span><a href="#projects">Open a project</a><a href="#reviews">Individual reviews</a><a href="#about">About the toolkit</a></nav></header><div id="feedback" class="feedback"></div>${current?.id === SAMPLE_ID ? `<aside class="sample-banner"><strong>Sample search — temporary exploration.</strong> These source-derived and fictional values are not your church’s decisions.<button class="button" data-duplicate="${SAMPLE_ID}">Use this example as a starting point</button></aside>` : ''}${shell ? `<div class="mobile-project-bar"><button class="button" data-toggle-nav aria-expanded="false" aria-controls="project-navigation">Workbook navigation</button><button class="text-button" data-export>Backup</button></div><div class="workspace">${sidebar(current, section, moduleId)}<main id="main" class="project-main ${section === 'documents' && parts[3] ? 'document-main' : ''}" tabindex="-1">${view}</main></div>` : view}<footer class="site-footer"><span>Feedback preview · Independent Fundamental Baptist roots</span><a href="https://github.com/gforster/pastoral-search-toolkit/issues/new" target="_blank" rel="noopener noreferrer">Give feedback ↗</a><a href="https://github.com/gforster/pastoral-search-toolkit" target="_blank" rel="noopener noreferrer">Free & open source ↗</a></footer><dialog id="confirm-dialog" aria-labelledby="confirm-title"><div class="dialog-content"><h2 id="confirm-title"></h2><p id="confirm-description"></p><div class="actions"><button class="button" data-cancel-dialog>Cancel</button><button class="button danger-button" id="confirm-action">Confirm</button></div></div></dialog>`;
  updateFeedback();
  collaborationUI?.afterRender();
  updateModuleReviewFeedback();
  if (focus) {
    document.querySelector('#main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  if (field && FIELD_MAP[field] && focus) {
    focusReviewTarget(`field-${field}`);
  }
}
function updateModuleReviewFeedback() {
  const p = active(),
    moduleId = document.querySelector('[data-module-review]')?.dataset.moduleReview;
  if (p && moduleId) syncModuleReviewFeedback(p, reviewAttempts.has(`${p.id}/${moduleId}`));
}
function download(text, name, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function safeName(s) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 80) || 'church'
  );
}
function exportProject() {
  const p = active();
  if (!p) {
    notify('Open a project before exporting its backup.');
    return;
  }
  const perform = () => {
    download(
      serializeBackup(p),
      `${safeName(p.name)}-${new Date().toISOString().slice(0, 10)}.json`,
    );
    notify('Backup downloaded. Keep it somewhere secure; it contains your complete workbook.');
  };
  if (sensitiveProject(p))
    confirmAction(
      'Export private search backup?',
      SENSITIVE_NOTICE,
      'Download private backup',
      perform,
    );
  else perform();
}
function confirmAction(title, description, button, action) {
  const dialog = document.querySelector('#confirm-dialog');
  document.querySelector('#confirm-title').textContent = title;
  document.querySelector('#confirm-description').textContent = description;
  const b = document.querySelector('#confirm-action');
  b.textContent = button;
  b.onclick = async () => {
    dialog.close();
    try {
      await action();
    } catch (err) {
      notify(err.message);
    }
  };
  dialog.showModal();
}
function updateAnswerControl(id) {
  const p = active(),
    a = p.answers[id],
    f = FIELD_MAP[id],
    label = document.querySelector(`[data-status-for="${id}"]`);
  const issue = document.querySelector('[data-module-review]')
    ? moduleReviewIssues(p, f.module).find(
        (issue) => issue.fieldId === id || issue.targetId === `field-${id}`,
      )
    : null;
  if (label)
    label.textContent = issue
      ? 'Required · needs attention'
      : a?.status === 'not_applicable'
        ? 'Not applicable'
        : resolved(p, f)
          ? 'Recorded'
          : a?.value
            ? 'Needs confirmation'
            : 'Not known yet';
}
function handleEdit(el) {
  const p = active();
  if (!p) return;
  try {
    message = '';
    if (el.dataset.field) {
      const id = el.dataset.field;
      setAnswer(p, id, el.value, el.value ? 'known' : 'unknown');
      if (current) save();
      updateAnswerControl(id);
    } else if (el.dataset.inventory) p.inventory[el.dataset.inventory] = el.value;
    else if (el.dataset.qualification) {
      const { qualification, part } = el.dataset;
      p.qualifications[qualification] ||= {};
      p.qualifications[qualification][part] = el.value;
      recordChange('qualifications');
    } else if (el.dataset.customQuestion) {
      const q = p.customQuestions.find((q) => q.id === el.dataset.customQuestion);
      if (q) {
        q[el.dataset.part] = el.value;
        recordChange('interviews');
      }
    } else if (el.dataset.requirement) {
      const r = p.requirements.find((r) => r.id === el.dataset.requirement);
      if (r) {
        r[el.dataset.part] = el.value;
        recordChange('convictions');
      }
    }
    updateFeedback();
    updateModuleReviewFeedback();
  } catch (err) {
    notify(err.message);
  }
}
app.addEventListener('input', (event) => {
  if (
    event.target.matches(
      'input[data-field],textarea[data-field],textarea[data-qualification],textarea[data-requirement],textarea[data-custom-question],input[data-custom-question]',
    )
  )
    handleEdit(event.target);
});
app.addEventListener('change', async (event) => {
  const el = event.target,
    p = active();
  try {
    if (el.id === 'import-file') {
      const file = el.files[0];
      if (!file) return;
      if (file.size > MAX_BACKUP_BYTES)
        throw new Error('Choose a project JSON backup smaller than 10 MB.');
      const imported = importBackup(await file.text());
      await save(imported);
      location.hash = `project/${imported.id}/dashboard`;
      notify('Backup opened as a separate project. Your other projects are unchanged.');
      return;
    }
    if (!p) return;
    if (
      el.matches(
        'select[data-field],select[data-inventory],select[data-requirement],select[data-custom-question]',
      )
    ) {
      handleEdit(el);
      if (
        [
          'event',
          'associate',
          'interim',
          'internalCandidate',
          'interimCandidacy',
          'callMethod',
          'pastoralModel',
          'sermonReview',
        ].includes(el.dataset.field)
      )
        render();
    }
    if (el.dataset.milestone !== undefined) {
      p.milestone = el.value;
      p.artifactReviews = {};
      save();
      render();
    }
    if (el.dataset.artifactStatus !== undefined) {
      p.artifactOptions.includeStatus = el.checked;
      save();
    }
    if (el.dataset.question) {
      p.questions = el.checked
        ? [...new Set([...p.questions, el.dataset.question])]
        : p.questions.filter((id) => id !== el.dataset.question);
      recordChange('interviews');
    }
    if (el.dataset.resolveTask) {
      const t = p.tasks.find((t) => t.id === el.dataset.resolveTask);
      if (t) {
        t.resolved = el.checked;
        if (t.status) t.status = el.checked ? 'done' : 'open';
        recordChange('call');
        render();
        notify(
          t.resolved
            ? 'Prerequisite recorded as resolved. Verify final call prerequisites again if this affects an earlier review.'
            : 'Prerequisite reopened.',
        );
      }
    }
  } catch (err) {
    notify(err.message);
  }
});
app.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const d = button.dataset,
    p = active();
  try {
    if (d.reviewTarget) {
      focusReviewTarget(d.reviewTarget);
      return;
    }
    if (d.dismiss !== undefined) {
      message = '';
      updateFeedback();
    }
    if (d.cancelDialog !== undefined) document.querySelector('#confirm-dialog').close();
    if (d.toggleNav !== undefined) {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      document.querySelector('.sidebar').classList.toggle('is-open', !expanded);
    }
    if (d.export !== undefined) exportProject();
    if (d.reload !== undefined)
      confirmAction(
        'Reload the saved copy?',
        'Unsaved changes to any project in this tab will be lost. Export each affected project first if you need to keep those changes.',
        'Reload',
        () => {
          unsaved = false;
          location.reload();
        },
      );
    if (d.recover) {
      const raw = store?.recoverRaw(d.recover);
      if (raw) download(raw, 'pastoral-project-recovery.json');
    }
    if (d.delete) {
      const target = getProject(d.delete);
      confirmAction(
        'Delete this project from this device?',
        `“${target.name}” will be removed from this browser. A downloaded backup is the only way to restore it.`,
        'Delete project',
        async () => {
          await pendingSaves.get(target.id);
          await store?.remove(target.id, target.revision);
          changes?.postMessage({ id: target.id });
          cache.delete(target.id);
          saveErrors.delete(target.id);
          unsavedIds.delete(target.id);
          render();
          notify('Project removed from this device. Downloaded backups are unchanged.');
        },
      );
    }
    if (d.orientation) {
      if (d.orientation === 'cancel') {
        draft = null;
        location.hash = 'home';
      } else if (d.orientation === 'back') {
        step = Math.max(0, step - 1);
        render(true);
      } else if (d.orientation === 'next') {
        step = Math.min(2, step + 1);
        render(true);
      } else {
        const created = draft;
        await save(created);
        draft = null;
        location.hash = `project/${created.id}/dashboard`;
        notify(
          'Your project is ready. Open any module, and export a backup as your work develops.',
        );
      }
    }
    if (d.rename) {
      const target = getProject(d.rename);
      const input = document.getElementById(`project-name-${d.rename}`);
      const name = input.value.trim();
      if (!name) throw new Error('Enter a project name.');
      target.name = name;
      await save(target);
      render();
      notify('Project renamed. The church name in documents is unchanged.');
    }
    if (d.duplicate) {
      const original = getProject(d.duplicate),
        copy = structuredClone(original);
      copy.id = uid();
      copy.revision = 0;
      copy.name = copy.name.slice(0, 988) + ' (copy)';
      copy.artifactReviews = {};
      if (original.id === SAMPLE_ID) collaborationUI.resetSample(copy);
      await save(copy);
      location.hash = `project/${copy.id}/dashboard`;
      render();
      notify('A separate project copy is saved on this device.');
    }
    if (d.example !== undefined) {
      getProject(SAMPLE_ID);
      location.hash = `project/${SAMPLE_ID}/dashboard`;
      notify(
        'Explore the sample temporarily. Duplicate it when you want to save a project of your own.',
      );
    }
    if (!p) return;
    if (d.preset !== undefined) {
      suggestPreset(p, STARTER_PRESET);
      save();
      render();
      notify(
        'Suggested values are available for individual review. Existing answers have not changed.',
      );
    }
    if (d.adoptSuggestion) {
      const a = p.presetSuggestions?.answers[d.adoptSuggestion];
      if (a) {
        setAnswer(p, d.adoptSuggestion, a.value, a.status);
        delete p.presetSuggestions.answers[d.adoptSuggestion];
        save();
        render();
        notify(
          'Starting value copied. Verify it against your actual documents and edit it as needed.',
        );
      }
    }
    if (d.nextHelp !== undefined) {
      const first = readiness(p).missing[0];
      notify(
        first
          ? `Work next on: ${first.label} ${first.help} You may continue unrelated preparation while this is being resolved.`
          : 'Recorded prerequisites for this milestone are in place. Review them with the authorized leaders, then choose the next milestone.',
      );
    }
    if (d.addQuestion !== undefined) {
      if (p.customQuestions.length >= 100)
        throw new Error('This project already has 100 custom prompts.');
      p.customQuestions.push({
        id: uid(),
        kind: 'followup',
        title: 'Church question',
        category: 'Church discussion',
        question: '',
      });
      recordChange('interviews');
      render();
      document.querySelector('[data-custom-question]:last-of-type')?.focus();
    }
    if (d.removeQuestion)
      confirmAction(
        'Remove this question?',
        'This removes the custom prompt from the interview guide.',
        'Remove',
        () => {
          p.customQuestions = p.customQuestions.filter((q) => q.id !== d.removeQuestion);
          recordChange('interviews');
          render();
        },
      );
    if (d.html) {
      download(
        standaloneHtml(makeDocument(p, d.html)),
        `${safeName(p.name)}-${d.html}.html`,
        'text/html;charset=utf-8',
      );
      notify('Printable HTML downloaded. It opens without the toolkit.');
    }
    if (d.zip !== undefined) {
      const perform = () => {
        const bytes = generatePackage(p);
        download(bytes, `${safeName(p.name)}-search-packet.zip`, 'application/zip');
        notify(
          'Full working package downloaded, including the private project backup. Share only reviewed handouts with the intended audience.',
        );
      };
      if (sensitiveProject(p))
        confirmAction(
          'Export the full private working packet?',
          SENSITIVE_NOTICE + ' The ZIP includes the complete project backup.',
          'Download private packet',
          perform,
        );
      else perform();
    }
    if (d.approveArtifact) {
      const record = document.getElementById('artifact-approval').value.trim();
      if (!record) throw new Error('Record who approved this document, when, and for what use.');
      const doc = makeDocument(p, d.approveArtifact);
      if (doc.incomplete)
        throw new Error('Resolve the document’s missing information before recording approval.');
      p.artifactReviews[d.approveArtifact] = { at: now(), record };
      save();
      render();
      notify('Approval recorded. Further workbook changes will require document review again.');
    }
    if (d.unknown) {
      setAnswer(p, d.unknown, '', 'unknown');
      if (current) save();
      render();
      document.getElementById(`field-${d.unknown}`)?.focus();
      notify(
        'Recorded as unknown. When required, this remains an open decision for its milestone.',
      );
    }
    if (d.na) {
      setAnswer(
        p,
        d.na,
        '',
        p.answers[d.na]?.status === 'not_applicable' ? 'unknown' : 'not_applicable',
      );
      if (current) save();
      render();
    }
    if (d.stage) {
      p.milestone = d.stage;
      p.artifactReviews = {};
      save();
      render(true);
      notify('Current focus changed. This does not mark earlier work complete.');
    }
    if (d.review) {
      const issues = moduleReviewIssues(p, d.review);
      if (issues.length) {
        message = '';
        updateFeedback();
        reviewAttempts.add(`${p.id}/${d.review}`);
        updateModuleReviewFeedback();
        focusReviewTarget(issues[0].targetId);
        return;
      }
      reviewModule(p, d.review);
      reviewAttempts.delete(`${p.id}/${d.review}`);
      save();
      render();
      notify('Module reviewed. Changes to related information will prompt another review.');
    }
    if (d.addRequirement !== undefined) {
      if (p.requirements.length >= 200)
        throw new Error('This project already has 200 considerations.');
      p.requirements.push({
        id: uid(),
        statement: '',
        evidence: '',
        category: 'conviction',
        status: 'draft',
      });
      recordChange('convictions');
      render();
      document.querySelector('.requirement-card:last-of-type textarea')?.focus();
    }
    if (d.removeRequirement)
      confirmAction(
        'Remove this consideration?',
        'Its statement and notes will be removed from this workbook.',
        'Remove',
        () => {
          p.requirements = p.requirements.filter((r) => r.id !== d.removeRequirement);
          recordChange('convictions');
          render();
        },
      );
    if (d.removeTask)
      confirmAction(
        'Remove this church prerequisite?',
        'Removing it changes the readiness check. Only remove a requirement that your church has determined does not apply.',
        'Remove prerequisite',
        () => {
          p.tasks = p.tasks.filter((t) => t.id !== d.removeTask);
          recordChange('call');
          render();
        },
      );
    if (d.markdown) {
      const doc = makeDocument(p, d.markdown);
      download(
        documentMarkdown(doc),
        `${safeName(p.name)}-${doc.code.toLowerCase()}.md`,
        'text/markdown;charset=utf-8',
      );
      notify('Document downloaded as Markdown. Review it before sharing.');
    }
    if (d.print !== undefined) window.print();
  } catch (err) {
    notify(err.message);
  }
});
app.addEventListener('submit', (event) => {
  if (event.target.id !== 'add-task-form') return;
  event.preventDefault();
  if (!current) return;
  const data = new FormData(event.target),
    label = String(data.get('label')).trim();
  if (!label) return;
  if (current.tasks.length >= 200) {
    notify('This project already has 200 additional prerequisites.');
    return;
  }
  current.tasks.push({
    id: uid(),
    label,
    owner: String(data.get('owner')).trim(),
    due: Number(data.get('due')),
    resolved: false,
  });
  recordChange('call');
  render();
  notify('Church prerequisite added to the readiness checks.');
});
window.addEventListener('hashchange', () => {
  message = '';
  render(true);
});
async function externalChange(ids) {
  await store?.refresh();
  for (const id of ids) {
    if (current?.id === id || unsavedIds.has(id)) {
      saveErrors.set(
        id,
        'This project changed in another tab. Export any work you want to preserve, then reload the saved copy.',
      );
      unsavedIds.add(id);
    } else cache.delete(id);
  }
  updateFeedback();
}
if (changes)
  changes.onmessage = (event) => {
    if (typeof event.data?.id === 'string')
      externalChange([event.data.id]).catch(() =>
        notify('Another tab changed a project. Reload to read its latest saved version.'),
      );
  };
window.addEventListener('storage', (event) => {
  if (event.key?.startsWith(PREFIX))
    notify(
      'An older toolkit tab changed a legacy project. Export that tab’s work before closing it; import the backup here to keep those changes.',
    );
});
window.addEventListener('beforeunload', (event) => {
  if (unsaved) {
    event.preventDefault();
    event.returnValue = '';
  }
});
collaborationUI = await createCollaborationUI({
  app,
  projectStore: store,
  getProject: active,
  saveProject: save,
  render,
  notify,
  download,
  confirmAction,
  setUnsaved(id, value) {
    if (value) unsavedIds.add(id);
    else unsavedIds.delete(id);
    unsaved = unsavedIds.size > 0;
  },
});
render();

// Optional browser-agent interface; project data is never transmitted automatically.
const modelContext = document.modelContext;
if (modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const definitions = [
    {
      name: 'read_project_readiness',
      title: 'Read project readiness',
      description: 'Read the current milestone and unresolved labels without changing the project.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        if (
          !input ||
          typeof input !== 'object' ||
          Array.isArray(input) ||
          Object.keys(input).length
        )
          throw new Error('Expected an empty object.');
        if (!current) throw new Error('Open a project first.');
        const r = readiness(current);
        return {
          milestone: current.milestone,
          readyForHumanReview: r.ready,
          openDecisions: [...r.missing.map((f) => f.label), ...r.custom.map((t) => t.label)],
        };
      },
    },
    {
      name: 'open_workbook_module',
      title: 'Open workbook module',
      description:
        'Open a module in the current project. Does not change answers or mark work complete.',
      inputSchema: {
        type: 'object',
        properties: { moduleId: { type: 'string', enum: MODULES.map((m) => m.id) } },
        required: ['moduleId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (
          !input ||
          typeof input !== 'object' ||
          Object.keys(input).some((k) => k !== 'moduleId') ||
          !MODULES.some((m) => m.id === input.moduleId)
        )
          throw new Error('Choose a valid moduleId.');
        if (!current) throw new Error('Open a project first.');
        history.replaceState(null, '', `${base(current)}/module/${input.moduleId}`);
        render(true);
        return { openedModule: input.moduleId };
      },
    },
  ];
  for (const tool of definitions) {
    try {
      Promise.resolve(modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(
        () => {},
      );
    } catch {
      /* Normal browser use remains available. */
    }
  }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
