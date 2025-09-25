#!/usr/bin/env node

import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import path from 'path';

// Initialize JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  resources: 'usable',
});

// Expose DOM globals
global.window = dom.window;
global.document = dom.window.document;

// Stub required globals
window.bootstrap = { 
  Modal: class { 
    static getInstance() { return { hide: () => {} }; }
    show() {}
    hide() {}
  }, 
  Tooltip: class {}, 
  Popover: class {} 
};
window.firebaseApp = {};
window.firestore = {};
window.firebaseAuth = {};
window.firebaseFunctions = {};
window.confirm = () => true;

// Stub localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key) => window.__store?.[key] || null,
    setItem: (key, value) => { window.__store = window.__store || {}; window.__store[key] = value; },
    removeItem: (key) => { if (window.__store) delete window.__store[key]; },
    clear: () => { window.__store = {}; }
  },
  writable: true
});

// Stub CloudStorageService
window.CloudStorageService = class {
  constructor() {}
  isConnected = true;
  saveToLocalStorage() { return true; }
  loadFromLocalStorage() { return null; }
  saveCurrentUser() { return true; }
  getCurrentUser() { return { role: "user" }; }
  saveUserSession() { return true; }
  getUserSession() { return null; }
  saveToCloud() { return Promise.resolve(true); }
  loadFromCloud() { return Promise.resolve([]); }
  saveProjects() { return Promise.resolve(true); }
  deleteFromCloud() { return Promise.resolve(true); }
};

// Load script helper
function loadScript(relativePathFromRepoRoot) {
  const repoRoot = process.cwd();
  const abs = path.resolve(repoRoot, relativePathFromRepoRoot);
  const code = readFileSync(abs, 'utf-8');
  window.eval(code + '\n//# sourceURL=' + abs);
}

// Load app script
loadScript('assets/js/app.js');

// Initialize app
document.dispatchEvent(new window.Event('DOMContentLoaded'));
window.dispatchEvent(new window.Event('load'));

// Get ProjectManager instance
const pm = window.projectManager;

// Setup test project
const testProject = { 
  id: 'smoke-test-1', 
  name: 'Smoke Test Project', 
  status: 'completed',
  createdBy: 'smoke-test-user',
  description: 'Test project for smoke test'
};

// Setup test environment
pm.projects = [testProject];
pm.currentUser = 'smoke-test-user';
pm.archivedProjects = { 'smoke-test-user': [] };
pm.canUserEditProject = () => true;
pm.render = () => {};
pm.showNotification = () => {};

// Verify initial state
console.log('Initial state:');
console.log('- Active projects:', pm.projects.length);
console.log('- Archived projects:', pm.archivedProjects['smoke-test-user'].length);

if (pm.projects.length !== 1) {
  console.error('SMOKE FAIL: Initial active projects count should be 1');
  process.exit(1);
}

if (pm.archivedProjects['smoke-test-user'].length !== 0) {
  console.error('SMOKE FAIL: Initial archived projects count should be 0');
  process.exit(1);
}

// Archive the project
console.log('\nArchiving project...');
await pm.archiveProject('smoke-test-1');

// Verify final state
console.log('\nFinal state:');
console.log('- Active projects:', pm.projects.length);
console.log('- Archived projects:', pm.archivedProjects['smoke-test-user'].length);

if (pm.projects.length !== 0) {
  console.error('SMOKE FAIL: Final active projects count should be 0');
  process.exit(1);
}

if (pm.archivedProjects['smoke-test-user'].length !== 1) {
  console.error('SMOKE FAIL: Final archived projects count should be 1');
  process.exit(1);
}

if (!pm.archivedProjects['smoke-test-user'].some(p => p.originalId === 'smoke-test-1')) {
  console.error('SMOKE FAIL: Archived project should have originalId "smoke-test-1"');
  process.exit(1);
}

console.log('\nSMOKE PASS: Project was successfully moved from active to archive');
