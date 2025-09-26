import { describe, it, expect, beforeAll } from 'vitest';
import { loadScript } from '../helpers/loadScript.js';
import { ensureTestDom } from '../setup/ensureTestDom.mjs';

let pm;

beforeAll(async () => {
  // reset
  globalThis.__loadedScripts?.clear?.();
  delete window.projectManager;

  // seed localStorage
  localStorage.setItem('safetrack_current_user', JSON.stringify({ id:'u1', role:'user', name:'User One' }));
  localStorage.setItem('safetrack_archived_projects', JSON.stringify({
    u2:[{ id:'p1', name:'Their Project'}],
  }));

  // avoid cloud
  delete window.CloudStorageService;

  // load scripts in index.html order
  loadScript('assets/js/cloudStorage.js');
  loadScript('assets/js/app.js');

  // Ensure DOM is populated before first render
  ensureTestDom({
    ids: [
      'archiveModalBody',
      'archiveUserSelect',
      'archiveListContainer',
    ],
    selectors: []
  });

  // fire init events
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  window.dispatchEvent(new window.Event('load'));

  // wait for constructor (up to 2500ms)
  const wait = (fn, ms=2500)=>new Promise((res,rej)=>{const t0=Date.now();(function tick(){if(fn())return res(true);if(Date.now()-t0>ms)return rej(new Error('timeout'));setTimeout(tick,25);}())});
  await wait(()=> typeof window.ProjectManager === 'function');

  // if app didn't create instance, create it now
  if (!window.projectManager) window.projectManager = new window.ProjectManager();
  pm = window.projectManager;
  expect(pm).toBeTruthy();

  // Sanity: instance has methods now
  expect(typeof pm.fetchArchivedForUser).toBe('function');
  expect(typeof pm.showArchiveForUser).toBe('function');
});

describe("Read-Only UI Tests", () => {
  it("hides destructive buttons when viewing another user's archive", async () => {
    await pm.showArchiveForUser("u2");
    const viewingOther = pm.archiveViewUserId !== pm.currentUserId();
    expect(viewingOther).toBe(true);
    // Check if destructive buttons are hidden or disabled
    const destructiveButtons = document.querySelectorAll('.destructive-button');
    destructiveButtons.forEach(button => {
      expect(button.disabled || button.style.display === 'none').toBe(true);
    });
  });
});
