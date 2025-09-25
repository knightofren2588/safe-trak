import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// --- Global stub for CloudStorageService so ProjectManager can new it safely ---
// Define once, and make it visible to both `window` and the global scope that `eval` uses.
(() => {
  if (typeof globalThis.CloudStorageService === "function") return;

  class CloudStorageService {
    constructor(..._args) { /* no-op */ }
    // Add no-ops that your app might call during init/use.
    saveToLocalStorage(_key, _value) { return true; }
    loadFromLocalStorage(_key) { return null; }
    saveCurrentUser(_user) { return true; }
    getCurrentUser() { return { role: "user" }; }
    saveUserSession(_session) { return true; }
    getUserSession() { return null; }
    // Add more as needed if tests complain:
    // saveProjects(){return true;} saveCertifications(){return true;}
    // saveComplianceItems(){return true;} etc.
  }

  // Make it a writable/configurable global so later tests can tweak/replace it.
  Object.defineProperty(globalThis, "CloudStorageService", {
    value: CloudStorageService, writable: true, configurable: true,
  });
  Object.defineProperty(window, "CloudStorageService", {
    value: CloudStorageService, writable: true, configurable: true,
  });
})();

// Prevent "bootstrap is not defined" errors in tests
window.bootstrap = { Modal: class {}, Tooltip: class {}, Popover: class {} };
