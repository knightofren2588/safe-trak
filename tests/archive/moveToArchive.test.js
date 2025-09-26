import { describe, it, expect, beforeAll } from 'vitest';
import { ensurePM } from '../helpers/ensurePM.js';

describe('move to archive', () => {
  let pm;
  const seed = [{ id: 101, name: 'Completed X', completed: true, status: 'completed', percentComplete: 100 }];

  beforeAll(async () => {
    localStorage.clear();
    window.__TEST__ = true;
    localStorage.setItem('safetrack_current_user', JSON.stringify({ id:'u1', username:'u1', role:'admin', name:'Admin' }));
    localStorage.setItem('projects', JSON.stringify(seed));
    localStorage.setItem('safetrack_projects', JSON.stringify(seed));
    localStorage.setItem('safetrack_archived_projects', JSON.stringify({}));

    const { CloudStub } = await import('../helpers/cloudStub.mjs');
    window.CloudStorageService = CloudStub;

    pm = await ensurePM();

    // Force allow in test
    pm.canArchive = () => true;

    expect(typeof pm.archiveProject).toBe('function');
  });

  it('archives 101 and removes from active', async () => {
    await pm.archiveProject(101);
    const key = (typeof pm.currentArchiveBucketKey === 'function') ? pm.currentArchiveBucketKey() : 'u1';
    const archived = pm.archivedProjects?.[key] || [];
    expect(archived.some(p => p.id === 101)).toBe(true);
    expect(pm.projects.some(p => p.id === 101)).toBe(false);
  });
});