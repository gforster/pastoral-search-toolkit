import { validateProject } from '../domain.js';
export const PREFIX = 'pastoral-search-toolkit:v1:';
export const DATABASE = 'pastoral-search-toolkit';
const requestResult = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
const transactionDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('Local storage transaction was cancelled.'));
    tx.onerror = () => {}; // Abort carries the actual failure to the caller.
  });

export class ProjectStore {
  constructor(db) {
    this.db = db;
    this.records = new Map();
    this.legacyErrors = new Map();
  }
  static async open(indexedDB, legacyStorage, databaseName = DATABASE) {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('projects', { keyPath: 'id' });
      request.result.createObjectStore('meta');
    };
    const db = await requestResult(request),
      store = new ProjectStore(db);
    db.onversionchange = () => db.close();
    await store.migrateLegacy(legacyStorage);
    await store.refresh();
    return store;
  }
  async migrateLegacy(storage) {
    const read = this.db.transaction('meta', 'readonly');
    const migrated = await requestResult(read.objectStore('meta').get('legacy-v1-migrated'));
    if (migrated || !storage) return;
    const projects = [],
      errors = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const raw = storage.getItem(key);
      try {
        projects.push(validateProject(JSON.parse(raw)));
      } catch {
        errors.push([key.slice(PREFIX.length), raw]);
      }
    }
    const tx = this.db.transaction(['projects', 'meta'], 'readwrite'),
      done = transactionDone(tx);
    for (const p of projects) {
      const request = tx.objectStore('projects').get(p.id);
      request.onsuccess = () => {
        if (!request.result) tx.objectStore('projects').put(p);
      };
    }
    tx.objectStore('meta').put(errors, 'legacy-errors');
    tx.objectStore('meta').put(true, 'legacy-v1-migrated');
    await done;
    // Keep originals intact. The one-time marker prevents resurrecting deleted projects.
  }
  async refresh() {
    const tx = this.db.transaction(['projects', 'meta'], 'readonly');
    const records = requestResult(tx.objectStore('projects').getAll());
    const errors = requestResult(tx.objectStore('meta').get('legacy-errors'));
    this.records = new Map((await records).map((p) => [p.id, p]));
    this.legacyErrors = new Map((await errors) || []);
  }
  list() {
    const projects = [],
      errors = [...this.legacyErrors.keys()];
    for (const [id, raw] of this.records) {
      try {
        projects.push(validateProject(raw));
      } catch {
        errors.push(id);
      }
    }
    return { projects: projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), errors };
  }
  load(id) {
    const raw = this.records.get(id);
    return raw ? validateProject(raw) : null;
  }
  async save(p) {
    const clean = validateProject(p),
      tx = this.db.transaction('projects', 'readwrite');
    const done = transactionDone(tx),
      bucket = tx.objectStore('projects');
    let failure;
    const request = bucket.get(p.id);
    request.onsuccess = () => {
      try {
        const existing = request.result ? validateProject(request.result) : null;
        if (existing && existing.revision !== clean.revision)
          throw new Error(
            'This project changed in another tab. Export this tab’s work, then reload the latest saved copy.',
          );
        if (!existing && clean.revision > 0)
          throw new Error(
            'This project was removed in another tab. Export your current work to preserve it.',
          );
        clean.revision++;
        bucket.put(clean);
      } catch (err) {
        failure = err;
        tx.abort();
      }
    };
    try {
      await done;
    } catch (err) {
      throw failure || err;
    }
    this.records.set(p.id, structuredClone(clean));
    p.revision = clean.revision;
    return p;
  }
  async remove(id, revision) {
    const tx = this.db.transaction('projects', 'readwrite'),
      done = transactionDone(tx),
      bucket = tx.objectStore('projects');
    let failure;
    const request = bucket.get(id);
    request.onsuccess = () => {
      if (request.result && request.result.revision !== revision) {
        failure = new Error('The project changed in another tab. Reload before deleting it.');
        tx.abort();
      } else bucket.delete(id);
    };
    try {
      await done;
    } catch (err) {
      throw failure || err;
    }
    this.records.delete(id);
  }
  recoverRaw(id) {
    return this.legacyErrors.get(id) || JSON.stringify(this.records.get(id));
  }
  close() {
    this.db.close();
  }
}
