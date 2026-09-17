import { validateReviewWork } from '../domain/collaboration';
import type { ReviewWork } from '../schema/collaboration';
import type { ReviewWorkRepository } from './repositories';
const result = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('Local save cancelled.'));
    tx.onerror = () => {};
  });
export class ReviewWorkStore implements ReviewWorkRepository {
  records = new Map<string, ReviewWork>();
  errors: string[] = [];
  constructor(private db: IDBDatabase) {}
  static async open(db: IDBDatabase) {
    const store = new ReviewWorkStore(db);
    await store.refresh();
    return store;
  }
  async refresh() {
    const records = await result(
      this.db.transaction('reviewWork', 'readonly').objectStore('reviewWork').getAll(),
    );
    this.records.clear();
    this.errors = [];
    for (const raw of records) {
      try {
        const w = validateReviewWork(raw);
        this.records.set(w.id, w);
      } catch {
        this.errors.push(String(raw.id));
      }
    }
  }
  list() {
    return [...this.records.values()]
      .map((w) => structuredClone(w))
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  }
  load(id: string) {
    const w = this.records.get(id);
    return w ? structuredClone(w) : null;
  }
  async save(work: ReviewWork) {
    const clean = validateReviewWork(work),
      tx = this.db.transaction('reviewWork', 'readwrite'),
      finished = done(tx),
      bucket = tx.objectStore('reviewWork');
    let failure: Error | undefined;
    const request = bucket.get(work.id);
    request.onsuccess = () => {
      const existing = request.result;
      if ((existing && existing.revision !== clean.revision) || (!existing && clean.revision > 0)) {
        failure = new Error(
          'This review changed in another tab. Export your current review before reloading.',
        );
        tx.abort();
        return;
      }
      clean.revision++;
      bucket.put(clean);
    };
    try {
      await finished;
    } catch (err) {
      throw failure || err;
    }
    work.revision = clean.revision;
    this.records.set(clean.id, structuredClone(clean));
    return work;
  }
  async remove(id: string, revision: number) {
    const tx = this.db.transaction('reviewWork', 'readwrite'),
      finished = done(tx),
      bucket = tx.objectStore('reviewWork');
    let conflict = false;
    const r = bucket.get(id);
    r.onsuccess = () => {
      if (r.result && r.result.revision !== revision) {
        conflict = true;
        tx.abort();
      } else bucket.delete(id);
    };
    try {
      await finished;
    } catch (err) {
      if (conflict)
        throw new Error('This review changed in another tab. Reload before deleting it.');
      throw err;
    }
    this.records.delete(id);
  }
  async recoverRaw(id: string) {
    return result(this.db.transaction('reviewWork', 'readonly').objectStore('reviewWork').get(id));
  }
}
