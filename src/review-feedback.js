import { FIELD_MAP, QUALIFICATIONS } from './data.js';
import { answerValue, escapeHtml as e, moduleReviewMissing, resolved } from './domain.js';

export const QUALIFICATION_PROMPTS = [
  ['meaning', 'Our working meaning'],
  ['evidence', 'Evidence we will seek'],
  ['disqualifying', 'Disqualifying patterns'],
  ['questions', 'Difficult cases / interpretive questions'],
];

export function missingQualificationPrompts(p) {
  return QUALIFICATIONS.flatMap((q) =>
    QUALIFICATION_PROMPTS.filter(([part]) => !p.qualifications[q.id]?.[part]?.trim()).map(
      ([part, label]) => ({
        id: `${q.id}-${part}`,
        qualificationId: q.id,
        label: `${q.title} — ${label}`,
      }),
    ),
  );
}

// Explanations and navigation use exactly the same missing fields as reviewModule.
export function moduleReviewIssues(p, moduleId) {
  return moduleReviewMissing(p, moduleId).map((f) => {
    const a = p.answers[f.id];
    let targetId = `field-${f.id}`,
      targetLabel = f.label,
      reason;
    const prompts = f.id === 'qualificationAdoption' ? missingQualificationPrompts(p) : [];
    if (prompts.length) {
      targetId = prompts[0].id;
      targetLabel = prompts[0].label;
      reason = `${new Set(prompts.map((q) => q.qualificationId)).size} working definition(s) still have unanswered prompts. Complete all four prompts for each definition, then record the committee’s actual adoption. First missing: ${targetLabel}.`;
    } else if (f.id === 'compFinal' && answerValue(p, 'compStatus') !== 'approved') {
      targetId = 'field-compStatus';
      targetLabel = FIELD_MAP.compStatus.label;
      reason =
        'The compensation package is not recorded as “Approved / final”. Finalize it through your church’s process, update Compensation package status, then confirm the complete package here.';
    } else if (a?.status !== 'known' || !a.value.trim()) {
      reason = `${f.type === 'select' ? 'Choose' : 'Record'} an answer; this required item is currently unknown or blank.`;
    } else if (f.accept && !f.accept.includes(a.value)) {
      const choice = f.options?.find(([value]) => value === a.value)?.[1] || a.value;
      const accepted = f.accept
        .map((value) => `“${f.options?.find(([v]) => v === value)?.[1] || value}”`)
        .join(' or ');
      reason = `Current answer: “${choice}”. This item needs ${accepted} before module review. Record that only when it reflects the church’s actual situation or decision.`;
    }
    return { fieldId: f.id, label: f.label, targetId, targetLabel, reason };
  });
}

export function reviewIssueMessage(issue) {
  return `<strong>Required item needs attention.</strong> ${e(issue.reason)}${issue.targetId !== `field-${issue.fieldId}` ? ` <button type="button" class="text-button" data-review-target="${e(issue.targetId)}">Go to ${e(issue.targetLabel)} →</button>` : ''}`;
}

export function reviewSummaryContent(issues, position, attempted = false) {
  if (!issues.length)
    return `<h2 id="review-summary-${position}-title">Required answers are complete.</h2><p>Review the answers against your church’s documents and decisions, then mark this module reviewed below.</p>`;
  return `<h2 id="review-summary-${position}-title">${attempted ? 'Module not marked reviewed: ' : ''}${issues.length} required item${issues.length === 1 ? '' : 's'} need${issues.length === 1 ? 's' : ''} attention</h2><p>These items must be resolved before marking this whole module reviewed, including any needed at a later milestone. Your work is saved as you go; you can leave unknowns and work elsewhere.</p><ul>${issues.map((issue) => `<li><button type="button" class="text-button" data-review-target="${e(issue.targetId)}">${e(issue.label)} →</button><p>${e(issue.reason)}</p></li>`).join('')}</ul>`;
}

export function reviewSummaryView(p, moduleId, position) {
  const issues = moduleReviewIssues(p, moduleId);
  return `<section class="review-summary ${issues.length ? 'has-missing' : 'is-complete'}" data-module-review="${moduleId}" data-review-position="${position}" aria-labelledby="review-summary-${position}-title">${reviewSummaryContent(issues, position)}</section>`;
}

export function focusReviewTarget(id) {
  const control = document.getElementById(id);
  if (!control) return;
  for (let parent = control.parentElement; parent; parent = parent.parentElement)
    if (parent.tagName === 'DETAILS') parent.open = true;
  control.focus({ preventScroll: true });
  (control.closest('.field-card, .qualification-prompt') || control).scrollIntoView({
    block: 'center',
  });
}

// Update the small feedback regions without replacing inputs, caret positions or open worksheets.
export function syncModuleReviewFeedback(p, attempted = false) {
  const summary = document.querySelector('[data-module-review]');
  if (!summary || !p) return;
  const issues = moduleReviewIssues(p, summary.dataset.moduleReview);
  for (const region of document.querySelectorAll('[data-module-review]')) {
    region.innerHTML = reviewSummaryContent(issues, region.dataset.reviewPosition, attempted);
    region.classList.toggle('has-missing', !!issues.length);
    region.classList.toggle('is-complete', !issues.length);
    region.classList.toggle('review-attempted', attempted && !!issues.length);
  }
  for (const control of document.querySelectorAll('.fields [data-field]')) {
    const f = FIELD_MAP[control.dataset.field];
    const issue =
      issues.find((i) => i.fieldId === f.id) || issues.find((i) => i.targetId === control.id);
    const card = control.closest('.field-card');
    const message = document.getElementById(`review-message-${f.id}`);
    card.classList.toggle('required-missing', !!issue);
    card.classList.toggle('review-attempted', attempted && !!issue);
    control.setAttribute('aria-invalid', String(attempted && !!issue));
    message.hidden = !issue;
    message.innerHTML = issue ? reviewIssueMessage(issue) : '';
    const status = card.querySelector('[data-status-for]');
    status.textContent = issue
      ? 'Required · needs attention'
      : resolved(p, f)
        ? 'Recorded'
        : p.answers[f.id]?.status === 'not_applicable'
          ? 'Not applicable'
          : 'Not known yet';
  }
  const prompts = missingQualificationPrompts(p);
  const qualificationCount = document.querySelector('[data-qualification-count]');
  if (qualificationCount)
    qualificationCount.textContent = `${QUALIFICATIONS.length - new Set(prompts.map((q) => q.qualificationId)).size} recorded with all four prompts`;
  for (const control of document.querySelectorAll('[data-qualification]')) {
    const missing = prompts.some((q) => q.id === control.id);
    const region = control.closest('.qualification-prompt');
    region.classList.toggle('required-missing', missing);
    region.classList.toggle('review-attempted', attempted && missing);
    control.setAttribute('aria-invalid', String(attempted && missing));
    document.getElementById(`review-message-${control.id}`).hidden = !missing;
  }
  for (const detail of document.querySelectorAll('[data-qualification-card]')) {
    const count = prompts.filter(
      (q) => q.qualificationId === detail.dataset.qualificationCard,
    ).length;
    detail.querySelector('.qual-mark').textContent = count
      ? `${count} required prompt${count === 1 ? '' : 's'} open`
      : 'Recorded';
  }
  const announcement = document.getElementById('module-review-announcement');
  if (announcement && attempted) {
    const text = issues.length
      ? `Module not marked reviewed. ${issues.length} required item${issues.length === 1 ? '' : 's'} still need${issues.length === 1 ? 's' : ''} attention. First: ${issues[0].label}. ${issues[0].reason}`
      : 'All required answers are now complete. You can mark this module reviewed.';
    if (announcement.textContent !== text) announcement.textContent = text;
  }
}
