import { PastoralSearchProjectSchema } from './pastoral-search-project';
import { emptyCollaboration, rejectUnsafeKeys } from './collaboration';

// Never mutate an imported file. Each migration is explicit and independently testable.
export function migrateProject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid project.');
  rejectUnsafeKeys(input);
  if (
    'schemaVersion' in input &&
    typeof input.schemaVersion === 'number' &&
    input.schemaVersion > 3
  )
    throw new Error(
      'This project was created with a newer version of the toolkit. Update the application before importing it.',
    );
  let raw = structuredClone(input) as Record<string, unknown>;
  if (raw.schemaVersion === 1) {
    raw = {
      ...raw,
      schemaVersion: 2,
      customQuestions: [],
      artifactOptions: { includeStatus: true },
      artifactReviews: {},
      presetSuggestions: null,
    };
    // v1 treated every church as voting. Preserve that behavior for existing records,
    // but require human confirmation; never infer a no-vote waiver from free text.
  }
  if (raw.schemaVersion === 2) {
    raw = { ...raw, schemaVersion: 3, collaboration: emptyCollaboration(String(raw.id)) };
  }
  const result = PastoralSearchProjectSchema.safeParse(raw);
  if (!result.success)
    throw new Error(
      'This project is invalid or uses an unsupported version. Keep the original backup.',
    );
  return result.data;
}
