import { zipSync, strToU8 } from 'fflate';
import {
  makeDocument,
  documentHtml,
  documentMarkdown,
  availableDocuments,
} from '../templates/documents.js';
import { serializeBackup, escapeHtml } from '../../domain.js';
export function standaloneHtml(doc) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(doc.title)}</title><style>
  body{font:11pt/1.6 Georgia,serif;color:#172e3b;max-width:7.2in;margin:2rem auto;padding:1rem;overflow-wrap:anywhere}
  h1{font-size:25pt;line-height:1.15}h2{font-size:14pt;break-after:avoid}p{white-space:pre-line;orphans:3;widows:3}header{border-bottom:2px solid #8c582f;padding-bottom:1rem}.eyebrow,footer{font:9pt/1.5 system-ui,sans-serif}footer{margin-top:2rem;border-top:1px solid #aaa;padding-top:.7rem}.document-notice{font-size:9pt}section{margin:1.5rem 0}section p{margin:.6rem 0}
  @page{size:letter;margin:.65in}@media print{body{margin:0;padding:0;max-width:none;color:#000}a{color:inherit}header{break-after:avoid}section{break-inside:auto}h2+p{break-before:avoid}}
  </style></head><body>${documentHtml(doc)}</body></html>`;
}
export function generatePackage(p) {
  const files = {};
  const add = (name, content) => {
    files[`pastoral-search/${name}`] = strToU8(content);
  };
  const documents = availableDocuments(p);
  for (const definition of documents) {
    const doc = makeDocument(p, definition.id);
    const folder =
      doc.id === 'start'
        ? ''
        : doc.audience !== 'Internal'
          ? 'HANDOUTS/'
          : doc.code.startsWith('R')
            ? 'REFERENCE-MATERIALS/'
            : 'WORKING-DOCUMENTS/';
    const name = doc.id === 'start' ? 'START-HERE' : `${doc.code}-${doc.id}`;
    add(`${folder}${name}.md`, documentMarkdown(doc));
    add(`${folder}${name}.html`, standaloneHtml(doc));
  }
  add('project.json', serializeBackup(p));
  add(
    'PACKAGE-README.md',
    `# Full working search packet\n\nThis package contains private internal material and a complete project backup. Review and share individual handouts only with the intended audience. Completed candidate forms belong in your church’s secure records.\n\nOpen START-HERE.html or START-HERE.md. Each document is provided in Markdown and standalone printable HTML. Use the browser’s Print command to save PDFs. Unknown information remains marked. Formal approval is never inferred. Supply authoritative doctrine and governing documents separately.\n\n## Included documents\n\n${documents.map((d) => `- ${d.code}: ${d.title} (${makeDocument(p, d.id).status})`).join('\n')}\n`,
  );
  add('provenance.json', JSON.stringify(makeDocument(p, 'start').provenance, null, 2));
  return zipSync(files, { level: 6 });
}
