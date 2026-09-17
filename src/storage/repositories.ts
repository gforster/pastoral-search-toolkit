import type { PastoralSearchProject } from '../schema/pastoral-search-project';
import type { ReviewWork } from '../schema/collaboration';

// Domain operations use plain records. Adapters own transactions and revision conflicts.
// Local candidates, rounds and decisions are committed atomically with the project.
export interface ProjectRepository {
  list(): { projects: PastoralSearchProject[]; errors: string[] };
  load(id: string): PastoralSearchProject | null;
  save(project: PastoralSearchProject): Promise<PastoralSearchProject>;
  remove(id: string, revision: number): Promise<void>;
}
export interface ReviewWorkRepository {
  list(): ReviewWork[];
  load(id: string): ReviewWork | null;
  save(work: ReviewWork): Promise<ReviewWork>;
  remove(id: string, revision: number): Promise<void>;
}
