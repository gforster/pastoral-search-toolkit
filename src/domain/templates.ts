import {
  ChurchTemplateSchema,
  type PastoralSearchProject,
} from '../schema/pastoral-search-project';
// Conservative allowlist: no transition circumstances, dates, names, finances, or notes.
// Free text still needs human privacy review before any future sharing feature.
export const REUSABLE_FIELDS = [
  'governanceSummary',
  'composition',
  'committeeAuthority',
  'chairRule',
  'callAuthority',
  'callMethod',
  'voteThreshold',
  'quorum',
  'notice',
  'doctrineText',
  'affirmations',
  'pastoralModel',
  'responsibilities',
  'reporting',
  'prospectPool',
  'seriousConsideration',
];
export function reusableTemplate(project: PastoralSearchProject) {
  return ChurchTemplateSchema.parse({
    templateVersion: 1,
    name: 'Church search framework',
    assumptions: [],
    answers: Object.fromEntries(
      Object.entries(project.answers).filter(([id]) => REUSABLE_FIELDS.includes(id)),
    ),
    requirements: project.requirements
      .filter((r) => r.category === 'conviction')
      .map((r) => ({ ...r, evidence: '', status: 'draft' })),
    questions: project.questions,
  });
}
export function suggestPreset(project: PastoralSearchProject, input: unknown) {
  project.presetSuggestions = ChurchTemplateSchema.parse(input);
  return project;
}
