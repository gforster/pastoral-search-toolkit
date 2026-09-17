import { PastoralSearchProjectSchema } from './pastoral-search-project';

// Never mutate an imported file. Each migration is explicit and independently testable.
export function migrateProject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid project.');
  const stack: unknown[] = [input];
  const seen = new WeakSet<object>();
  while (stack.length) {
    const value = stack.pop();
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key))
        throw new Error('This project contains an unsafe property name.');
      if (child && typeof child === 'object') stack.push(child);
    }
  }
  if (
    'schemaVersion' in input &&
    typeof input.schemaVersion === 'number' &&
    input.schemaVersion > 2
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
  const result = PastoralSearchProjectSchema.safeParse(raw);
  if (!result.success)
    throw new Error(
      'This project is invalid or uses an unsupported version. Keep the original backup.',
    );
  return result.data;
}
