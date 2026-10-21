import { FIELD_MAP } from '../../data.js';
import { resolved } from '../../domain.js';

export const MEETING_LEGEND =
  '[1] First meeting: organize, introduce and assign. [2] Proposed second meeting: reports and prepared decisions. [F] Future meetings: fuller study or later-stage work. A report is not approval; confirm dates and scope together.';

const FOCUS = {
  'Quick reference & next steps':
    '[1] Organize · [2] Check progress · [F] Revisit as the search develops',
  'Transition planning':
    '[1] Introduce / assign · [2] Coverage report · [F] Authorize arrangements when ready',
  'Decision record': '[1] [2] [F] Reusable — record actual action at any meeting',
  'Action follow-up': '[2] First reports · [F] Reuse for unfinished work',
  'Recorded shared-project decisions':
    '[1] [2] [F] Existing records — preserve concerns and follow-through',
  'Search Preparation Worksheet':
    '[1] Check current facts · [2] Report verification · [F] Revisit later requirements',
  'Committee Startup Worksheet': '[1] Organize and assign committee work',
  'Committee Authority Checklist': '[1] Clarify committee authority · [F] Verify later actions',
  'Committee Roles Sheet': '[1] Select officers / agree responsibilities',
  'Compensation & Benefits Summary':
    '[1] Assign proposal · [2] First report · [F] Finalize before release',
  'Committee Covenant':
    '[1] Review the draft and record actual action · [F] Return to unresolved wording',
  'Committee roles and communication': '[1] Select officers / agree communication and records',
  'First meeting assignments': '[1] Assign leads and first results · [2] Receive first reports',
  'Meeting record': '[1] [2] [F] Reusable draft minutes',
  'Committee Governance Summary':
    '[1] Clarify authority · [2] Report source checks · [F] Verify later actions',
  'Source register and fact checks':
    '[1] Assign verification · [2] Report verified facts and remaining gaps',
  'Church Profile': '[1] Introduce · [2] Verify open facts · [F] Revise and approve before release',
  'Transition self-assessment':
    '[1] Introduce / assign input plan · [2] Review the plan · [F] Discuss findings',
  'Doctrine and ministry practices review':
    '[1] Introduce / assign study · [F] Settle before candidate evaluation',
  'Pastoral Qualifications & Working Definitions':
    '[1] Introduce · [F] Discuss, revise and adopt before candidate evaluation',
  'Pastoral Position Description':
    '[1] Introduce work options · [2] First report · [F] Finalize the role',
  'Compensation and search-budget planning':
    '[1] Assign proposals · [2] Outline / missing facts · [F] Authorize final terms',
  'Congregational Update Template':
    '[1] Name input / update lead · [2] Review the plan · [F] Release approved updates',
  'Congregation input: proposed approach':
    '[1] Appoint a lead · [2] Review the proposal · [F] Discuss themes',
  'Reference and records procedure plan':
    '[1] Assign procedure work · [2] First report · [F] Establish before evaluation',
  'First meeting agenda': '[1] First meeting — organize, introduce and assign',
  'Chair’s meeting prompts': '[1] First meeting — guide discussion and record actual action',
  'Proposed second meeting agenda':
    '[2] Proposed one-hour follow-up — reports and prepared decisions',
};

const focusByTitle = Object.fromEntries(
  Object.entries(FOCUS).map(([title, text]) => [title.toLowerCase(), text]),
);
export function documentPresentation(p, doc) {
  const focus =
    focusByTitle[doc.title.toLowerCase()] ||
    '[F] Future meetings — use when the relevant stage is authorized';
  let note;
  if (doc.id === 'qualifications') {
    const adopted =
      resolved(p, FIELD_MAP.qualificationAdoption) && resolved(p, FIELD_MAP.qualificationRecord);
    note = adopted
      ? {
          title: 'Note — recorded working definitions',
          body: 'The workbook records adoption. Check the actual approved wording, version and authority against the church’s records. These explanations do not replace Scripture.',
        }
      : {
          title: 'Note — draft working definitions, not adopted criteria',
          body: 'This is a starting worksheet for church review. If using sample wording, revise it rather than treating it as an adopted interpretation. Study the cited passages; agree the meanings, evidence, contrary patterns and judgment questions through the proper church authority before evaluating names.',
        };
  } else if (doc.id === 'governance') {
    note = {
      title: 'Note — committee reference, not the constitution',
      body: 'This summary helps the committee locate recorded requirements. It does not replace or amend the church’s constitution, bylaws or adopted policies. Check sources, distinguish proposals from existing rules and revise unresolved wording through the proper authority.',
    };
  } else if (doc.id === 'covenant') {
    note = resolved(p, FIELD_MAP.covenantApproved)
      ? {
          title: 'Note — recorded covenant approval',
          body: 'The workbook records approval. Check that this text matches the wording actually adopted and retain the authority, date and record.',
        }
      : {
          title: 'Note — proposed covenant',
          body: 'The commitments below are starting language for review. Revise as needed and record actual adoption, requested changes or deferral; printing a proposal does not adopt it.',
        };
  } else if (['profile', 'position'].includes(doc.id)) {
    note = {
      title: 'Note — review and update before release',
      body: 'Correct unresolved or outdated facts and review proposed wording before distributing this document. Recorded inputs support drafting; the actual church approval and authoritative sources remain necessary.',
    };
  } else if (doc.title === 'Compensation and search-budget planning') {
    note = {
      title: 'Note — planning worksheet',
      body: 'Record options, verified costs and approval references. Receiving a first report does not authorize a budget, package or housing commitment.',
    };
  } else if (doc.title === 'Doctrine and ministry practices review') {
    note = {
      title: 'Note — working questions and proposed wording',
      body: 'Use actual adopted church sources. This worksheet does not create doctrine or establish a candidate requirement.',
    };
  } else if (doc.title === 'Source register and fact checks') {
    note = {
      title: 'Note — check and update',
      body: 'Confirm current versions and missing facts. Empty fields identify follow-up work, not facts supplied by this packet.',
    };
  } else if (doc.title === 'Congregation input: proposed approach') {
    note = {
      title: 'Note — suggested process for review',
      body: 'Choose the questions, response routes, recipients and release approval before collecting responses. This proposal is not an adopted survey.',
    };
  }
  return { focus, note };
}

// Shared by the CSP-approved app stylesheet and standalone printable HTML.
export const DOCUMENT_FOCUS_CSS = `
 .meeting-marker{font:bold 9pt/1.4 Arial,sans-serif;color:#246568;margin:.4rem 0 .6rem}
 .artifact-note{background:#edf4f3;border:1px solid #8faead;padding:.6rem .75rem;font:9.5pt/1.4 Arial,sans-serif;margin:.6rem 0 .9rem;break-inside:avoid}
 .artifact-note p{margin:.2rem 0}.artifact-note strong{color:#182d36}.meeting-legend{font:9pt/1.4 Arial,sans-serif}
 .qualification-block{padding:.5rem 0;border-top:1px solid #c6d5d7;break-inside:avoid}
 .qualification-block .qualification-reference{font:italic 9.5pt/1.4 Arial,sans-serif;margin:.2rem 0 .5rem}
 .qualification-block p{font-size:10.5pt;line-height:1.4;margin:.4rem 0}.qualification-block strong{color:#182d36}
`;
