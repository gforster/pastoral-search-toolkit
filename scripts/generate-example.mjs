import { writeFile } from 'node:fs/promises';
import { newProject, serializeBackup } from '../src/domain.js';
const p = newProject('planned');
p.id = 'fellowship-example';
p.name = 'SAMPLE — Fellowship-inspired pastoral search';
p.createdAt = p.updatedAt = '2026-09-17T12:00:00.000Z';
p.milestone = 'committee';
const answers = {
  churchName: 'Sample Baptist Church — fictional learning example',
  location: 'A small community (fictional)',
  membership: '80 members (illustrative, not a source-church fact)',
  attendance: 'About 65 on a typical Sunday (illustrative)',
  identity:
    'Independent Fundamental Baptist; example configuration derived from the project that inspired this toolkit.',
  event: 'retirement',
  vacant: 'no',
  departingServing: 'yes',
  interim: 'no',
  associate: 'no',
  servicesCovered: 'yes',
  currentAuthority:
    'Example: existing church officers continue under their current governing authority. Confirm each responsibility before transfer.',
  pulpitPlan:
    'Example preparation: the serving pastor covers scheduled services; designated leaders arrange authorized supply when needed.',
  immediateMessage:
    'Example: an authorized leadership update explains the planned transition and the next meeting.',
  operations:
    'Example: treasurer and existing officers maintain ordinary operations under current controls.',
  recordsAccess:
    'Example: assign a secure inventory and access handoff; no credentials belong in this workbook.',
  carePlan:
    'Example: designate a care coordinator and provide confidential support through existing church channels.',
  nextMeeting:
    'Example: leadership will agree on the committee formation agenda; date not yet confirmed.',
  documents:
    'Example derived from source church constitution/bylaws and adopted process. Obtain your own current authoritative documents.',
  createAuthority:
    'Source-derived example: the church forms the pulpit committee under its governing provisions.',
  selectMembers: 'Source-derived example: deacons select additional eligible voting members.',
  approveMembers:
    'Source-derived example: committee approval requires at least two-thirds of members present; verify notice and quorum separately.',
  composition:
    'Source-derived example: all deacons plus at least two additional voting members; additional members do not exceed the number of deacons.',
  committeeAuthority:
    'Example: research and recommend within the authority actually granted; the committee does not call the pastor.',
  chairRule:
    'Source-derived operating choice: a deacon chairs. This is not presented as a universal constitutional rule.',
  chair: 'Example: chair selected through the approved process; no real person identified.',
  conflicts:
    'Example: disclose interests, record recusal, restrict access, and use independent oversight when an internal person may be considered.',
  callAuthority: 'Source-derived example: the congregation makes the final call.',
  callMethod: 'vote',
  voteThreshold:
    'Source-derived example: two-thirds of eligible members present. Verify the complete governing provision and denominator.',
  preachRule: 'Source-derived example: the candidate preaches before the call decision.',
  meetingRule:
    'Source-derived example: recommendation precedes the following midweek worship service business meeting. Confirm eligibility, quorum, and notice from current documents.',
  pastoralModel: 'flexible',
  responsibilities:
    'Example draft: preaching, teaching, care, evangelism, discipleship, and equipping members; workload to be agreed.',
  staff: 'Example: volunteer ministry leaders and deacons share practical work.',
  strengths: 'Example: faithful service, personal relationships, and community connections.',
  challenges:
    'Example: limited volunteer capacity; clarify realistic expectations before presenting the position.',
  prospectPool: 'parallel',
  seriousConsideration: 'one',
  internalCandidate: 'no',
  compStatus: 'discussion',
  updateRhythm: 'Example: authorized process updates at regular church gatherings.',
  questionChannel:
    'Example: questions and suggestions go to the designated committee contact; contact details remain to be confirmed.',
};
for (const [id, value] of Object.entries(answers)) p.answers[id] = { status: 'known', value };
for (const id of ['quorum', 'notice', 'salary', 'finalDate'])
  p.answers[id] = { status: 'unknown', value: '' };
p.inventory = {
  constitution: 'yes',
  bylaws: 'yes',
  doctrine: 'yes',
  job: 'no',
  search: 'yes',
  policies: 'unknown',
};
p.questions = ['i1', 'i3', 'i5', 'i6', 'i14', 'i18'];
const backup = JSON.parse(serializeBackup(p));
backup.exportedAt = p.updatedAt;
const json = JSON.stringify(backup, null, 2) + '\n';
await writeFile('examples/fellowship-baptist.example.json', json);
await writeFile('public/examples/fellowship-baptist.example.json', json);
