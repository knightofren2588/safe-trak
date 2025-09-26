import { ensureTestDom } from '../setup/ensureTestDom.mjs';

const REQUIRED = {
  ids: [
    "archiveModalBody",
    "archiveUserSelect",
    "archiveListContainer",
    "totalQuotes",
    "builtinQuotes",
    "customQuotes",
    "favoriteQuotes",
    "certificationModalTitle",
    "certificationSubmitText",
    "certificationFilePreview",
    "totalCertifications",
    "activeCertifications",
    "expiringCertifications",
    "expiredCertifications",
    "certificationModalTitle",
    "certificationSubmitText",
    "modalTitle",
    "submitText",
    "activeProjects",
    "atRiskProjects",
    "teamMembers",
    "overdueProjects",
    "userModalTitle",
    "userSubmitText",
    "progressValue",
    "importModalLabel",
    "validProjectsCount",
    "errorCount",
    "userModalTitle",
    "userSubmitText"
  ],
  selectors: []
};
ensureTestDom(REQUIRED);

// @vitest-environment jsdom

import { describe, it, expect, beforeAll } from 'vitest';
import { loadScript } from '../helpers/loadScript.js';

let pm;
const TEST_DEBUG = true;
const log = (...a) => TEST_DEBUG && console.log("[TEST]", ...a);

function clearLoaderCache() {
  if (globalThis.__loadedScripts) globalThis.__loadedScripts.clear();
  delete window.projectManager;
}

async function waitForPM(timeoutMs = 2500) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    (function tick() {
      if (window.projectManager && typeof window.projectManager === "object") return resolve(window.projectManager);
      if (Date.now() - t0 > timeoutMs) return reject(new Error("projectManager not initialized"));
      setTimeout(tick, 25);
    })();
  });
}

function ensureWorkingLocalStorage() {
  try { window.localStorage.getItem("x"); return; } catch {}
  const store = new Map();
  window.localStorage = {
    getItem:k=>store.has(k)?store.get(k):null,
    setItem:(k,v)=>store.set(k,String(v)),
    removeItem:k=>store.delete(k),
    clear:()=>store.clear(),
  };
}

beforeAll(async () => {
  // reset
  globalThis.__loadedScripts?.clear?.();
  delete window.projectManager;

  // seed localStorage
  localStorage.setItem('safetrack_current_user', JSON.stringify({ id:'u1', role:'user', name:'User One' }));
  localStorage.setItem('safetrack_archived_projects', JSON.stringify({
    u1:[{ id:'p1', name:'Mine'}],
    u2:[{ id:'x1', name:'Theirs'}],
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
      'totalQuotes',
      'builtinQuotes',
      'customQuotes',
      'favoriteQuotes',
      'certificationModalTitle',
      'certificationSubmitText',
      'certificationFilePreview',
      'totalCertifications',
      'activeCertifications',
      'expiringCertifications',
      'expiredCertifications',
      'certificationModalTitle',
      'certificationSubmitText',
      'modalTitle',
      'submitText',
      'activeProjects',
      'atRiskProjects',
      'teamMembers',
      'overdueProjects',
      'userModalTitle',
      'userSubmitText',
      'progressValue',
      'importModalLabel',
      'validProjectsCount',
      'errorCount',
      'userModalTitle',
      'userSubmitText'
    ],
    selectors: []
  });

  console.log('[DOM SETUP OK]', document.body.innerHTML);

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

  // Assert real methods exist
  expect(typeof pm.fetchArchivedForUser).toBe("function");
  expect(typeof pm.showArchiveForUser).toBe("function");

  // DIAG: what is the constructor and prototype?
  console.log('[DIAG] typeof window.ProjectManager =', typeof window.ProjectManager);
  console.log('[DIAG] pm constructor name =', pm && pm.constructor && pm.constructor.name);
  console.log('[DIAG] proto === PM.prototype ?', !!(window.ProjectManager && pm && Object.getPrototypeOf(pm) === window.ProjectManager.prototype));
  console.log('[DIAG] instance fns =', Object.getOwnPropertyNames(Object.getPrototypeOf(pm)).filter(n => typeof pm[n] === 'function'));
});

describe("Archive View Tests", () => {
  it("view own archive", async () => {
    await pm.showArchiveForUser("u1");
    const mine = await pm.fetchArchivedForUser("u1");
    expect(Array.isArray(mine)).toBe(true);
    expect(mine.some(p => String(p.id) === "p1")).toBe(true);
  });

  it("view other user's archive (read-only)", async () => {
    await pm.showArchiveForUser("u2");
    const theirs = await pm.fetchArchivedForUser("u2");
    expect(Array.isArray(theirs)).toBe(true);
    expect(theirs.some(p => String(p.id) === "x1")).toBe(true);
  });

  it("API returns and caches", async () => {
    const list = await pm.fetchArchivedForUser("u2");
    expect(Array.isArray(list)).toBe(true);
    expect(pm.archivedProjects && Array.isArray(pm.archivedProjects["u2"])).toBe(true);
  });
});
