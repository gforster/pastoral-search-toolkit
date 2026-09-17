import { z } from 'zod';
import { CollaborationSchema, CalendarDate, Id } from './collaboration';

export const SCHEMA_VERSION = 3;
const text = z.string().max(20_000);
const identifier = z.string().regex(/^[\w-]{1,80}$/);
const timestamp = z
  .string()
  .max(40)
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');
export const AnswerSchema = z.object({
  status: z.enum(['known', 'unknown', 'not_applicable']),
  value: z.string().max(100_000),
});
export const RequirementSchema = z.object({
  id: identifier,
  statement: text,
  evidence: text,
  category: z.enum(['conviction', 'fit', 'preference']),
  status: z.enum(['draft', 'adopted']),
});
export const CustomQuestionSchema = z.object({
  id: identifier,
  title: z.string().max(200),
  category: z.string().max(100),
  kind: z.enum(['core', 'church', 'followup', 'scenario']),
  question: text,
});
// Templates are independently versioned and contain only allowlisted reusable decisions.
// Active search answers remain private unless the church explicitly exports its project.
export const ChurchTemplateSchema = z.object({
  templateVersion: z.literal(1),
  name: z.string().max(200),
  assumptions: z.array(z.string().max(1000)).max(20),
  answers: z.record(z.string(), AnswerSchema),
  requirements: z.array(RequirementSchema).max(200),
  questions: z.array(z.string()).max(300),
  qualifications: z
    .record(
      z.string(),
      z.object({
        meaning: text.optional(),
        evidence: text.optional(),
        disqualifying: text.optional(),
        questions: text.optional(),
      }),
    )
    .optional(),
  artifactOptions: z.object({ includeStatus: z.boolean() }).optional(),
});
export const PastoralSearchProjectSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: identifier,
  name: z.string().max(1000),
  createdAt: timestamp,
  updatedAt: timestamp,
  revision: z.number().int().nonnegative(),
  milestone: z.enum([
    'stabilize',
    'committee',
    'search',
    'advancement',
    'finalist',
    'call',
    'handoff',
  ]),
  answers: z.record(z.string(), AnswerSchema),
  reviews: z.record(z.string(), z.object({ at: timestamp, stale: z.boolean() })),
  qualifications: z.record(
    z.string(),
    z.object({
      meaning: text.optional(),
      evidence: text.optional(),
      disqualifying: text.optional(),
      questions: text.optional(),
    }),
  ),
  requirements: z.array(RequirementSchema).max(200),
  questions: z.array(z.string()).max(300),
  customQuestions: z.array(CustomQuestionSchema).max(100),
  tasks: z
    .array(
      z.object({
        id: identifier,
        label: z.string().max(1000),
        owner: z.string().max(500),
        due: z.number().int().min(0).max(6),
        resolved: z.boolean(),
        dueDate: CalendarDate.optional(),
        candidateId: Id.nullable().optional(),
        moduleId: z.string().max(80).optional(),
        status: z.enum(['open', 'in_progress', 'done']).optional(),
        prerequisite: z.boolean().optional(),
      }),
    )
    .max(200),
  inventory: z.record(z.string(), z.enum(['yes', 'no', 'unknown'])),
  artifactOptions: z.object({ includeStatus: z.boolean() }),
  artifactReviews: z.record(
    z.string(),
    z.object({ at: timestamp, record: z.string().min(1).max(1000) }),
  ),
  presetSuggestions: ChurchTemplateSchema.nullable(),
  collaboration: CollaborationSchema,
});
export type PastoralSearchProject = z.infer<typeof PastoralSearchProjectSchema>;
export type ChurchTemplate = z.infer<typeof ChurchTemplateSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
