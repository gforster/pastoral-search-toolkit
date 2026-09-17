import { newProject, setAnswer } from '../../src/domain.js';
import { FIELDS, QUALIFICATIONS } from '../../src/data.js';
export function completeProject() {
  const p = newProject();
  for (const f of FIELDS)
    p.answers[f.id] = {
      status: 'known',
      value:
        f.type === 'date'
          ? '2027-04-04'
          : f.options
            ? f.accept?.at(-1) || f.options.at(-1)[0]
            : `Verified ${f.id}`,
    };
  Object.assign(
    p.answers,
    Object.fromEntries(
      Object.entries({
        callMethod: 'vote',
        event: 'retirement',
        interim: 'no',
        associate: 'no',
        internalCandidate: 'no',
        pastoralModel: 'flexible',
      }).map(([id, value]) => [id, { status: 'known', value }]),
    ),
  );
  for (const q of QUALIFICATIONS)
    p.qualifications[q.id] = {
      meaning: 'Church-adopted meaning',
      evidence: 'Firsthand evidence to seek',
      disqualifying: 'Established contrary pattern',
      questions: 'Interpretations discussed',
    };
  return p;
}
export function scenario(name) {
  const p = newProject('planned');
  const values =
    {
      A: {
        membership: '80',
        identity: 'Independent Baptist',
        event: 'retirement',
        finalDate: '2027-03-17',
        vacant: 'no',
        callAuthority: 'Congregation',
        callMethod: 'vote',
        composition: 'Deacons plus additional members',
        pastoralModel: 'flexible',
      },
      B: {
        membership: '50',
        event: 'sudden_resignation',
        vacant: 'yes',
        interim: 'no',
        callMethod: 'vote',
      },
      C: {
        membership: '120',
        event: 'planned_resignation',
        interim: 'yes',
        internalCandidate: 'yes',
        interimCandidacy: 'undecided',
      },
      D: { membership: '60', pastoralModel: 'bivocational', compStatus: 'discussion' },
      E: { churchName: 'Unknown governance example' },
    }[name] || {};
  for (const [id, value] of Object.entries(values)) setAnswer(p, id, value);
  return p;
}
