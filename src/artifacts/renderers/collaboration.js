import { escapeHtml as e } from '../../domain.js';
import {
  candidateById,
  CANDIDATE_STATUSES,
  REVIEW_TYPES,
  IDENTITY_NOTICE,
  participation,
  decisionHistory,
  DECISIONS,
  compileRound,
  staleRound,
} from '../../domain/collaboration.ts';

const para = (s) => `<p>${e(s || 'Not recorded.')}</p>`;
const section = (title, body) => `<section><h2>${e(title)}</h2>${body}</section>`;
function html(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${e(title)}</title><style>body{font:11pt/1.55 Georgia,serif;color:#213b3e;max-width:7.2in;margin:2rem auto;padding:1rem;overflow-wrap:anywhere}h1{font-size:25pt;line-height:1.2}h2{font-size:15pt;break-after:avoid}h3{font-size:12pt;break-after:avoid}header{border-bottom:2px solid #94724b}p{white-space:pre-line;orphans:3;widows:3}.notice{border:1px solid #94724b;padding:.8rem}.write-space{min-height:1in;border-bottom:1px solid #aaa}.criterion{break-inside:avoid;margin:1.5rem 0}footer{font-size:9pt;border-top:1px solid #aaa;margin-top:2rem}@page{size:letter;margin:.65in}@media print{body{margin:0;padding:0;max-width:none;color:#000}section{break-inside:auto}}</style></head><body><header><p>PASTORAL SEARCH TOOLKIT · INTERNAL COMMITTEE MATERIAL</p><h1>${e(title)}</h1></header>${body}<footer>Individual observations and committee records support discussion. They do not certify a gate, constitutional quorum or pastoral call.</footer></body></html>`;
}
export function printableReview(packet) {
  return html(
    packet.title,
    para(`${packet.candidate.name} · ${REVIEW_TYPES[packet.reviewType]}`) +
      para(
        `Assigned ${packet.createdAt.slice(0, 10)} · ${packet.recipient?.name || 'Reviewer: __________________'}`,
      ) +
      para(IDENTITY_NOTICE) +
      para(packet.instructions) +
      section(
        'Assigned evidence',
        packet.snapshot.evidence
          .map(
            (ev) =>
              `<h3>${e(ev.title)}</h3>${para(ev.reference)}${ev.url ? `<p><a href="${e(ev.url)}">${e(ev.url)}</a></p>` : ''}${ev.notes ? para(ev.notes) : ''}`,
          )
          .join('') || para('Use the evidence specified by the chair.'),
      ) +
      section(
        'Review independently',
        packet.snapshot.criteria
          .map(
            (c) =>
              `<div class="criterion"><h3>${e(c.label)}</h3>${para(c.prompt)}${para('Mark one: Not reviewed / No concern noted / Clarification / Concern / Material concern')}${c.hardGate ? para('Gate-related evidence: a material concern must be discussed separately.') : ''}<p>Observation and supporting evidence:</p><div class="write-space"></div></div>`,
          )
          .join(''),
      ) +
      section(
        'Overall observations, concerns and proposed questions',
        '<div class="write-space"></div><div class="write-space"></div>',
      ) +
      section(
        'Context as assigned',
        packet.snapshot.context.map((c) => `<h3>${e(c.label)}</h3>${para(c.text)}`).join('') ||
          para('No additional church context included.'),
      ) +
      para(
        'Return this paper to the chair. The chair may open the same assignment packet and transcribe it, preserving your name and wording. Identify the transcription in overall observations and confirm it with you before importing.',
      ),
  );
}
export function candidateMeetingHtml(p, candidateId) {
  const c = candidateById(p, candidateId),
    rounds = p.collaboration.rounds.filter((r) => r.candidateId === candidateId);
  const body =
    `<div class="notice">Private meeting preparation. Review before sharing with the committee. Individual reviews are not committee decisions.</div>` +
    section(
      'Shared committee record',
      para(`${CANDIDATE_STATUSES[c.status]} · ${c.stage}`) +
        para(c.context) +
        para(
          `Questionnaire: ${c.progress.questionnaire}; first interview: ${c.progress.interview}; references: ${c.progress.referencesDone}/${c.progress.referencesExpected}; safety: ${c.progress.safety}`,
        ),
    ) +
    section('Evidence still needed', para(c.evidenceNeeded)) +
    rounds
      .map((r) => {
        const count = participation(r);
        let body =
          para(
            count.expected
              ? `${count.received} of ${count.expected} expected reviews received; ${count.additional} additional reviews.`
              : `${count.total} reviews received; expected count not set.`,
          ) + para('Participation is not meeting attendance or quorum.');
        if (staleRound(p, r))
          body += para(
            'Church criteria or evidence changed after assignment; use the original snapshot when reading these observations.',
          );
        if (r.state !== 'released') body += para('Compilation not yet released for discussion.');
        else {
          const comp = compileRound(r);
          if (comp.materialConcern)
            body += '<p><strong>Material concern raised — committee review required.</strong></p>';
          body += section(
            'Questions to resolve',
            comp.questions
              .map((q) => para(`${q.topic} (${q.reviewerCount} reviewer(s)): ${q.text}`))
              .join('') || para('No proposed questions.'),
          );
          body += section(
            'All recorded concerns',
            comp.concerns
              .map((q) => para(`${q.reviewer} · ${q.category} · ${q.severity}\n${q.text}`))
              .join('') || para('No concerns recorded; this is not gate clearance.'),
          );
          body += section(
            'Individual observations',
            comp.distributions
              .map(
                (d) =>
                  `<h3>${e(d.criterion.label)}</h3>${d.observations.map((o) => para(`${o.reviewer}: ${o.finding}\n${o.notes}`)).join('')}`,
              )
              .join(''),
          );
        }
        return section(r.title, body);
      })
      .join('') +
    section(
      'Assigned work',
      p.tasks
        .filter((t) => t.candidateId === c.id)
        .map((t) =>
          para(
            `${t.label} — ${t.owner || 'Owner not assigned'} · ${t.status || (t.resolved ? 'done' : 'open')}${t.dueDate ? ' · ' + t.dueDate : ''}`,
          ),
        )
        .join('') || para('None assigned.'),
    ) +
    section(
      'Committee decision history',
      decisionHistory(p, c.id)
        .map(
          (d) =>
            `<h3>${e(d.date)} · ${e(DECISIONS[d.type])}</h3>${para(d.rationale)}${para('Unresolved concerns: ' + (d.unresolvedConcerns || 'None recorded.'))}${para('Follow-up: ' + (d.followUp || 'None recorded.') + ' ' + d.owner)}${para('Recorded by: ' + d.recordedBy + (d.result ? ' · Result: ' + d.result : ''))}`,
        )
        .join('') || para('No decisions recorded.'),
    );
  return html(c.name + ' — committee meeting sheet', body);
}
