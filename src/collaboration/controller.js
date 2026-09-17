import { ReviewWorkStore } from '../storage/review-work.ts';
import { validateProject, invalidateReviews } from '../domain.js';
import { reusableTemplate } from '../domain/templates.ts';
import { emptyCollaboration } from '../schema/collaboration.ts';
import {
  MAX_REVIEW_BYTES,
  addMember,
  updateMember,
  addCandidate,
  updateCandidate,
  saveEvidence,
  createRound,
  setRoundState,
  reviewPacket,
  serializeReviewPacket,
  importReviewPacket,
  newReviewWork,
  exportCompletedReview,
  parseCompletedReview,
  inspectReviewImport,
  importCompletedReview,
  addDecision,
  addAssignment,
  roundById,
} from '../domain/collaboration.ts';
import { printableReview, candidateMeetingHtml } from '../artifacts/renderers/collaboration.js';
import {
  committeeView,
  candidateView,
  roundView,
  reviewListView,
  individualReviewView,
} from './views.js';

const safeName = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 70) || 'review';
export async function createCollaborationUI({
  app,
  projectStore,
  getProject,
  saveProject,
  render,
  notify,
  download,
  confirmAction,
  setUnsaved,
}) {
  let reviewStore = null;
  const works = new Map(),
    pending = [],
    workErrors = new Map(),
    saving = new Map();
  try {
    if (projectStore) reviewStore = await ReviewWorkStore.open(projectStore.db);
  } catch {
    notify('Review storage could not be opened. Export your review before closing the page.');
  }
  for (const w of reviewStore?.list() || []) works.set(w.id, w);
  const activeWork = () => works.get(location.hash.split('/')[1]);
  const saveWork = (w) => {
    setUnsaved(`review-${w.id}`, true);
    const prior = saving.get(w.id) || Promise.resolve();
    const next = prior.then(async () => {
      try {
        if (!reviewStore)
          throw new Error(
            'Browser storage is unavailable. Download your completed review before closing.',
          );
        await reviewStore.save(w);
        workErrors.delete(w.id);
        if (saving.get(w.id) === next) setUnsaved(`review-${w.id}`, false);
        return true;
      } catch (err) {
        workErrors.set(w.id, err.message);
        return false;
      } finally {
        if (saving.get(w.id) === next) saving.delete(w.id);
        feedback();
      }
    });
    saving.set(w.id, next);
    feedback();
    return next;
  };
  function feedback() {
    const w = activeWork(),
      node = document.querySelector('#review-save-state');
    if (node && w) {
      const error = workErrors.get(w.id);
      node.textContent = error
        ? 'Not saved: ' + error
        : saving.has(w.id)
          ? 'Saving review on this device…'
          : reviewStore
            ? 'Saved on this device. Nothing has been sent to the chair.'
            : 'Working in memory. Export your review before closing.';
      node.className = error ? 'error-banner' : 'small muted';
    }
  }
  const ask = (title, description, label, action) =>
    confirmAction(title, description, label, action);
  async function commit(p) {
    validateProject(p);
    const saved = await saveProject(p);
    render();
    if (!saved)
      throw new Error(
        'Changes are kept in this tab but could not be saved. Export a project backup before leaving.',
      );
  }
  async function readFile(file) {
    if (file.size > MAX_REVIEW_BYTES)
      throw new Error('Choose a review JSON file smaller than 750 KB.');
    return file.text();
  }
  app.addEventListener('submit', async (event) => {
    const form = event.target,
      kind = form.dataset.collabForm;
    if (!kind) return;
    event.preventDefault();
    const p = getProject();
    if (!p) return;
    const draft = structuredClone(p);
    const f = new FormData(form);
    const get = (k) => String(f.get(k) || '').trim();
    try {
      if (kind === 'member') {
        const input = {
          name: get('name'),
          initials: get('initials'),
          email: get('email'),
          role: get('role'),
          voting: get('voting'),
          active: f.has('active'),
        };
        if (form.dataset.member) updateMember(draft, form.dataset.member, input);
        else addMember(draft, input);
      } else if (kind === 'candidate') {
        const c = addCandidate(draft, get('name'), get('context'));
        await commit(draft);
        location.hash = `project/${draft.id}/committee-work/candidate/${c.id}`;
        notify('Candidate record added. No gate or decision has been inferred.');
        return;
      } else if (kind === 'candidate-update')
        updateCandidate(draft, form.dataset.candidate, {
          name: get('name'),
          context: get('context'),
          status: get('status'),
          stage: get('stage'),
          evidenceNeeded: get('evidenceNeeded'),
          progress: {
            questionnaire: get('questionnaire'),
            interview: get('interview'),
            referencesDone: Number(get('referencesDone')),
            referencesExpected: Number(get('referencesExpected')),
            safety: get('safety'),
          },
        });
      else if (kind === 'evidence')
        saveEvidence(
          draft,
          form.dataset.candidate,
          {
            title: get('title'),
            kind: get('kind'),
            reference: get('reference'),
            url: get('url'),
            notes: get('notes'),
          },
          form.dataset.evidence || undefined,
        );
      else if (kind === 'round') {
        const r = createRound(draft, form.dataset.candidate, {
          title: get('title'),
          reviewType: get('reviewType'),
          instructions: get('instructions'),
          expectedIds: f.getAll('expectedIds').map(String),
          evidenceIds: f.getAll('evidenceIds').map(String),
          includeDoctrine: f.has('includeDoctrine'),
          extraCriterion: get('extraCriterion'),
        });
        await commit(draft);
        location.hash = `project/${draft.id}/committee-work/round/${r.id}`;
        notify('Review round created with a fixed snapshot of the assigned criteria.');
        return;
      } else if (kind === 'packet-export') {
        const packet = reviewPacket(p, form.dataset.round, get('memberId') || null);
        download(
          serializeReviewPacket(packet),
          `${safeName(packet.candidate.name)}-${safeName(packet.title)}-${safeName(packet.recipient?.name || 'unassigned')}-packet.json`,
        );
        notify(
          'Review packet downloaded. It contains only this assignment, not the complete church project.',
        );
        return;
      } else if (kind === 'decision') {
        if (!f.has('confirmed'))
          throw new Error('Confirm that this records an actual committee conclusion.');
        const decision = addDecision(draft, {
          candidateId: get('candidateId') || null,
          type: get('type'),
          stage: get('stage'),
          date: get('date'),
          rationale: get('rationale'),
          unresolvedConcerns: get('unresolvedConcerns'),
          followUp: get('followUp'),
          owner: get('owner'),
          reviewDate: get('reviewDate'),
          result: get('result'),
          recordedBy: get('recordedBy'),
          notes: get('notes'),
        });
        if (decision.followUp)
          addAssignment(draft, {
            label:
              decision.followUp.length > 1000
                ? decision.followUp.slice(0, 960) + '… See the full committee decision.'
                : decision.followUp,
            owner: decision.owner,
            dueDate: decision.reviewDate,
            candidateId: decision.candidateId,
            moduleId: '',
            prerequisite: false,
            due: 3,
          });
      } else if (kind === 'assignment')
        addAssignment(draft, {
          label: get('label'),
          owner: get('owner'),
          dueDate: get('dueDate'),
          candidateId: get('candidateId') || null,
          moduleId: get('moduleId'),
          prerequisite: f.has('prerequisite'),
          due: Number(get('due')),
        });
      await commit(draft);
      notify(
        kind === 'decision'
          ? 'Committee decision recorded. Shared workbook approvals still require their own verification.'
          : 'Committee record saved.',
      );
    } catch (err) {
      notify(err.message);
    }
  });
  function editReview(el) {
    const w = activeWork();
    if (!w) return;
    if (el.dataset.reviewPerson) w.reviewer[el.dataset.reviewPerson] = el.value;
    else if (el.dataset.reviewResponse)
      w.responses[el.dataset.reviewResponse][el.dataset.reviewPart] = el.value;
    else if (el.dataset.reviewValue) w[el.dataset.reviewValue] = el.value;
    else return;
    w.modifiedAt = new Date().toISOString();
    saveWork(w);
  }
  app.addEventListener('input', (event) => {
    if (
      event.target.matches(
        'input[data-review-person],textarea[data-review-response],textarea[data-review-value],input[data-review-value]',
      )
    )
      editReview(event.target);
  });
  app.addEventListener('change', async (event) => {
    const el = event.target;
    try {
      if (el.matches('select[data-review-response],select[data-review-value]')) editReview(el);
      if (el.dataset.assignmentStatus) {
        const draft = structuredClone(getProject()),
          t = draft.tasks.find((t) => t.id === el.dataset.assignmentStatus);
        if (!t) throw new Error('Assignment not found.');
        t.status = el.value;
        t.resolved = el.value === 'done';
        if (t.prerequisite !== false) invalidateReviews(draft, 'call');
        await commit(draft);
        notify('Assignment status saved.');
      }
      if (el.id === 'review-packet-file') {
        const file = el.files[0];
        if (!file) return;
        const packet = importReviewPacket(await readFile(file));
        const existing = [...works.values()].find(
          (w) =>
            w.packet.projectFingerprint === packet.projectFingerprint &&
            w.packet.roundId === packet.roundId &&
            w.packet.snapshot.id === packet.snapshot.id &&
            w.packet.recipient?.id === packet.recipient?.id,
        );
        if (existing) {
          location.hash = `review/${existing.id}`;
          notify('This packet is already open. Your saved observations were preserved.');
          return;
        }
        const w = newReviewWork(packet);
        works.set(w.id, w);
        await saveWork(w);
        location.hash = `review/${w.id}`;
        notify('Packet opened as your independent review.');
      }
      if (el.dataset.reviewImport) {
        const p = getProject(),
          draft = structuredClone(p);
        let imported = 0;
        const roundId = el.dataset.reviewImport;
        for (const file of [...el.files]) {
          const queued = { id: crypto.randomUUID(), projectId: p.id, roundId, name: file.name };
          try {
            const review = parseCompletedReview(await readFile(file));
            const check = inspectReviewImport(draft, roundId, review);
            if (check.duplicate || check.stale || check.late) {
              pending.push({
                ...queued,
                review,
                duplicate: check.duplicate,
                error: check.exact || check.late,
                message: [
                  check.exact
                    ? 'This exact review was already imported. Skip the duplicate.'
                    : check.duplicate
                      ? 'This reviewer already has a submission. Replacing retains the previous revision.'
                      : '',
                  check.stale
                    ? 'Church criteria or evidence have changed; this review uses the original assignment.'
                    : '',
                  check.late ? 'Submissions are closed. Reopen the round and import again.' : '',
                ]
                  .filter(Boolean)
                  .join(' '),
              });
            } else {
              importCompletedReview(draft, roundId, review);
              imported++;
            }
          } catch (err) {
            pending.push({ ...queued, error: true, message: err.message });
          }
        }
        if (imported) await commit(draft);
        else render();
        notify(
          `${imported} review${imported === 1 ? '' : 's'} imported. ${pending.filter((q) => q.projectId === p.id && q.roundId === roundId).length} file(s) need attention.`,
        );
      }
    } catch (err) {
      notify(err.message);
    }
  });
  app.addEventListener('click', async (event) => {
    const b = event.target.closest('[data-collab]');
    if (!b) return;
    event.preventDefault();
    const action = b.dataset.collab;
    try {
      const p = getProject();
      if (action === 'directory') {
        document.getElementById('committee-members')?.scrollIntoView();
        return;
      }
      if (action === 'review-export') {
        const w = works.get(b.dataset.work);
        if (!w) throw new Error('Review not found.');
        const text = exportCompletedReview(w);
        download(
          text,
          `${safeName(w.packet.candidate.name)}-${safeName(w.packet.title)}-${safeName(w.reviewer.name)}-review.json`,
        );
        await saveWork(w);
        notify(
          'Completed review downloaded. Return this file to the chair through your chosen private channel.',
        );
        return;
      }
      if (action === 'review-print') {
        const w = works.get(b.dataset.work);
        download(
          printableReview(w.packet),
          `${safeName(w.packet.title)}-worksheet.html`,
          'text/html;charset=utf-8',
        );
        return;
      }
      if (action === 'review-remove') {
        const w = works.get(b.dataset.work);
        ask(
          'Remove this review from this device?',
          'Download a completed review first if you need to keep your observations. Other files and the chair’s copy are unchanged.',
          'Remove local review',
          async () => {
            await saving.get(w.id);
            await reviewStore?.remove(w.id, w.revision);
            works.delete(w.id);
            setUnsaved(`review-${w.id}`, false);
            render();
            notify('Local review removed.');
          },
        );
        return;
      }
      if (action === 'recover-review') {
        const raw = await reviewStore?.recoverRaw(b.dataset.work);
        download(JSON.stringify(raw, null, 2), 'review-recovery.json');
        return;
      }
      if (!p) return;
      if (action === 'template-export') {
        if (!document.querySelector('[name="templateChecked"]')?.checked)
          throw new Error('Review the reusable wording and check the box before exporting.');
        download(
          JSON.stringify(
            {
              format: 'pastoral-search-church-template',
              schemaVersion: 1,
              template: reusableTemplate(p),
            },
            null,
            2,
          ),
          'church-search-template.json',
        );
        notify('Reusable church template downloaded. Candidate and review records are excluded.');
        return;
      }
      if (action === 'meeting-export') {
        download(
          candidateMeetingHtml(p, b.dataset.candidate),
          'private-candidate-meeting.html',
          'text/html;charset=utf-8',
        );
        notify('Internal meeting sheet downloaded. It contains private committee material.');
        return;
      }
      if (action === 'packet-print') {
        const r = roundById(p, b.dataset.round),
          c = p.collaboration.candidates.find((c) => c.id === r.candidateId);
        const packet = { ...r, candidate: c, recipient: null };
        download(
          printableReview(packet),
          `${safeName(r.title)}-worksheet.html`,
          'text/html;charset=utf-8',
        );
        return;
      }
      if (['round-close', 'round-release', 'round-reopen'].includes(action)) {
        const state = {
          'round-close': 'closed',
          'round-release': 'released',
          'round-reopen': 'open',
        }[action];
        ask(
          state === 'released'
            ? 'Release individual reviews for discussion?'
            : state === 'closed'
              ? 'Close review submissions?'
              : 'Reopen this review round?',
          state === 'released'
            ? 'The compilation will show all imported observations, including minority concerns. Missing reviewers are still shown.'
            : state === 'closed'
              ? 'You can release the compilation next. Late or revised reviews require explicitly reopening the round.'
              : 'The compilation will be held again while more reviews are collected. Existing observations and previous revisions remain stored.',
          state === 'released'
            ? 'Release compilation'
            : state === 'closed'
              ? 'Close submissions'
              : 'Reopen',
          async () => {
            const draft = structuredClone(getProject());
            setRoundState(draft, b.dataset.round, state);
            await commit(draft);
            notify('Review round updated.');
          },
        );
        return;
      }
      if (action === 'import-skip') {
        const i = pending.findIndex((q) => q.id === b.dataset.import);
        if (i >= 0) pending.splice(i, 1);
        render();
        return;
      }
      if (action === 'import-resolve') {
        const queued = pending.find((q) => q.id === b.dataset.import);
        if (!queued || queued.error) return;
        ask(
          queued.duplicate
            ? 'Replace this reviewer’s current submission?'
            : 'Import against the original criteria?',
          queued.message,
          queued.duplicate ? 'Replace; keep previous revision' : 'Import original-snapshot review',
          async () => {
            const draft = structuredClone(getProject());
            importCompletedReview(draft, queued.roundId, queued.review, {
              replace: queued.duplicate,
              acceptStale: true,
            });
            await commit(draft);
            pending.splice(pending.indexOf(queued), 1);
            render();
            notify('Review imported with its original criteria.');
          },
        );
      }
    } catch (err) {
      notify(err.message);
    }
  });
  return {
    projectView(p, parts) {
      if (parts[3] === 'candidate') return candidateView(p, parts[4]);
      if (parts[3] === 'round') return roundView(p, parts[4], pending);
      return committeeView(p);
    },
    reviewView(parts) {
      if (parts[0] === 'reviews')
        return reviewListView([...works.values()], reviewStore?.errors || []);
      const work = works.get(parts[1]);
      if (!work)
        throw new Error(
          'This review is not on this device. Open its review packet from Individual reviews.',
        );
      return individualReviewView(work);
    },
    afterRender: feedback,
    resetSample(copy) {
      copy.collaboration = emptyCollaboration(crypto.randomUUID());
    },
  };
}
