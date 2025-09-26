import { describe, it, expect, beforeAll } from 'vitest';
import { ensurePM } from '../helpers/ensurePM.js';

describe('archive persistence across reload', () => {
  let pm;
  const seed = [{ id: 101, name: 'Completed X', completed: true, status: 'completed', percentComplete: 100 }];

  async function reloadPM() {
    delete window.projectManager;
    window.projectManager = undefined;
    pm = await ensurePM();
    // re-apply test-only permission override
    pm.canArchive = () => true;
    return pm;
  }

  beforeAll(async () => {
    localStorage.clear();
    window.__TEST__ = true;
    localStorage.setItem('safetrack_current_user', JSON.stringify({ id: 'u1', username: 'u1', role: 'admin', name: 'Admin' }));
    localStorage.setItem('safetrack_projects', JSON.stringify(seed));
    localStorage.setItem('safetrack_archived_projects', JSON.stringify({}));

    const { CloudStub } = await import('../helpers/cloudStub.mjs');
    window.CloudStorageService = CloudStub;

    pm = await ensurePM();
    pm.canArchive = () => true;

    expect(typeof pm.archiveProject).toBe('function');
  });

  it('archives and persists across reload', async () => {
    await pm.archiveProject(101);

    // Prefer real app hooks first
    if (typeof pm.whenReady === 'function') {
      await pm.whenReady();
    } else if (typeof pm.__testLoadNow === 'function') {
      await pm.__testLoadNow();
    }

    // If datasets are already populated, mark them as loaded to avoid race timeouts
    if (!pm.__loadedProjects && Array.isArray(pm.projects)) {
      pm._markLoaded?.('projects');
    }
    if (!pm.__loadedArchive && pm.archivedProjects && typeof pm.archivedProjects === 'object') {
      pm._markLoaded?.('archive');
    }

    // wait until both datasets reported loaded
    await new Promise((resolve, reject) => {
      const start = Date.now();
      (function poll() {
        if (pm.__loadedProjects && pm.__loadedArchive) return resolve();
        if (Date.now() - start > 3000) return reject(new Error('timeout waiting for loads'));
        setTimeout(poll, 15);
      })();
    });

    // Keep using the app’s bucket key helper for assertions
    const key = typeof pm.currentArchiveBucketKey === 'function' ? pm.currentArchiveBucketKey() : 'u1';

    // Ensure the test does NOT reseed projects after archiving and before reload.
    expect((pm.archivedProjects?.[key] || []).some(p => p.id === 101)).toBe(true);
    expect(pm.projects.some(p => p.id === 101)).toBe(false);

    await reloadPM();

    const key2 = typeof pm.currentArchiveBucketKey === 'function' ? pm.currentArchiveBucketKey() : 'u1';
    expect((pm.archivedProjects?.[key2] || []).some(p => p.id === 101)).toBe(true);
    expect(pm.projects.some(p => p.id === 101)).toBe(false);
  });
});
