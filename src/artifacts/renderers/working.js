import { MEETING_LEGEND, DOCUMENT_FOCUS_CSS } from '../templates/presentation.js';
import { escapeHtml as e } from '../../domain.js';
import { documentSectionsHtml, documentPresentationHtml } from '../templates/documents.js';

export const WORKING_PRINT_CSS =
  DOCUMENT_FOCUS_CSS +
  `
  .working-packet{font:10.5pt/1.45 Arial,sans-serif;color:#20373e;max-width:7.2in;margin:auto;overflow-wrap:anywhere}
  .working-packet h1,.working-packet h2,.working-packet h3{font-family:Georgia,serif;font-weight:normal;line-height:1.2;break-after:avoid}
  .working-packet h1{font-size:28pt}.working-packet h2{font-size:21pt}.working-packet h3{font: bold 11pt/1.35 Arial,sans-serif;color:#23666b}
  .packet-cover{padding:1rem 0 2rem;border-bottom:1px solid #c6d5d7}.packet-cover .eyebrow,.packet-status,.packet-tab{font:9pt/1.4 Arial,sans-serif;color:#23666b}
  .packet-index{margin:1rem 0 2rem}.packet-index a{color:inherit}.packet-jump{font:inherit;background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer}.packet-jump:focus-visible{outline:2px solid #23666b;outline-offset:3px}.compact-packet .packet-index{display:none}.packet-index li{margin:.35rem 0}.packet-index ol{list-style:none;padding-left:0}
  .working-document{margin:2rem 0}.working-document>header p{font-size:9pt}.working-document>header h2{margin-bottom:.5rem}
  .working-packet p{white-space:pre-line;orphans:3;widows:3;margin:.4rem 0}.working-packet section{margin:.75rem 0}
  .work-table-wrap{max-width:100%;overflow-x:auto}.work-table{width:100%;border-collapse:collapse;table-layout:fixed;font:9.5pt/1.4 Arial,sans-serif;margin:.7rem 0}
  .work-table th{text-align:left;background:#eaf1f1;color:#20373e;font-weight:bold}.work-table th,.work-table td{padding:.5rem;border-bottom:1px solid #c6d5d7;vertical-align:top;white-space:pre-line;overflow-wrap:anywhere}
  .agenda-table th:nth-child(1){width:15%}.agenda-table th:nth-child(2){width:30%}.assignment-table th:nth-child(1){width:50%}.work-table tr{break-inside:avoid}.work-table thead{display:table-header-group}.working-packet footer{font:9pt Arial,sans-serif;margin-top:1.5rem}
  @page{size:letter;margin:.7in}
  @media print{.working-packet>footer{display:none}.project-main{outline:none!important}.working-packet{max-width:none;margin:0}.packet-cover{break-after:page}.compact-packet .packet-cover{break-after:avoid;padding:0;border:0}.compact-packet .packet-cover>p:not(.eyebrow){display:none}.compact-packet .working-document:first-child>header h2,.compact-packet .working-document:first-child .packet-tab{display:none}.packet-index{break-after:page}.working-document{break-before:page;margin:0}.packet-group>.working-document:first-child{break-before:page}.packet-group:first-of-type>.working-document:first-child{break-before:auto}.work-table-wrap{overflow:visible}.working-packet h2+p{break-before:avoid}.packet-group{margin:0}.working-packet section{break-inside:auto}.working-packet section:not(:has(table)){break-inside:avoid}}
`;
export function workingPacketHtml(packet, interactive = false) {
  const compact = ['meeting-agenda', 'chair-guide', 'second-meeting'].includes(packet.id);
  return `<article class="working-packet ${compact ? 'compact-packet' : ''}"><header class="packet-cover"><p class="eyebrow">${e(packet.church)}</p><h1>${e(packet.title)}</h1><p>Preparation, decisions, assignments and follow-through.</p><p class="packet-status">${e(packet.status)} · Internal committee material</p><p>${packet.id === 'later-resources' ? 'Print only the forms needed for the current stage. Keep completed candidate records separate from the general binder.' : 'Use current facts, record actual action and carry unfinished work into the next meeting. Unknown answers remain open; printed proposals do not become church decisions.'}</p></header><nav class="packet-index" aria-label="Packet contents"><h2>Contents</h2><ol>${packet.groups.map((g, i) => `<li>${interactive ? `<button class="packet-jump" data-packet-section="packet-group-${i + 1}">${e(g.title)}</button>` : `<a href="#packet-group-${i + 1}">${e(g.title)}</a>`}</li>`).join('')}</ol><p class="meeting-legend">${e(MEETING_LEGEND)}</p></nav>${packet.groups.map((g, i) => `<div class="packet-group" id="packet-group-${i + 1}">${g.documents.map((d, j) => `<article class="working-document"><header>${j === 0 ? `<p class="packet-tab">${e(g.title)}</p>` : ''}<h2>${e(d.title)}</h2><p class="packet-status">${e(d.status)} · ${e(d.audience)} material</p></header>${documentPresentationHtml(d)}${documentSectionsHtml(d, 3)}</article>`).join('')}</div>`).join('')}<footer>Recorded answers support the church’s work; they do not independently verify facts or authorize action.</footer></article>`;
}
export function standaloneWorkingHtml(packet) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${e(packet.church)} — ${e(packet.title)}</title><style>body{margin:2rem auto;padding:1rem}${WORKING_PRINT_CSS}@media print{body{margin:0;padding:0}}</style></head><body>${workingPacketHtml(packet)}</body></html>`;
}
