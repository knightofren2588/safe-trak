import { loadScript } from './loadScript.js';

export async function bootApp({ scripts, seed = {}, forceLocal = false, timeoutMs = 2000 }) {
  // Clear the eval loader cache
  globalThis.__loadedScripts?.clear();

  // Reset window.projectManager
  delete window.projectManager;

  // Ensure a working localStorage (polyfill if needed)
  if (!window.localStorage) {
    const store = new Map();
    window.localStorage = {
      getItem: (key) => store.get(key) || null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    };
  }

  // Seed storage keys from options.seed
  for (const [key, value] of Object.entries(seed)) {
    window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  // Stub globals
  window.firebaseApp = {};
  window.firestore = {};
  window.firebaseAuth = {};
  window.firebaseFunctions = {};

  // Minimal bootstrap stub
  window.bootstrap = {
    Modal: class {},
    Tooltip: class {},
    Popover: class {},
  };

  // Set cloud path to local if options.forceLocal === true
  if (forceLocal) {
    window.CloudStorageService = undefined;
  }

  // Load local scripts in EXACT order
  for (const script of scripts) {
    loadScript(script);
  }

  // Fire DOMContentLoaded and load events
  document.dispatchEvent(new Event('DOMContentLoaded'));
  window.dispatchEvent(new Event('load'));

  // Wait for window.projectManager to appear
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function check() {
      if (window.projectManager) return resolve(window.projectManager);
      if (Date.now() - start > timeoutMs) {
        if (typeof window.ProjectManager === 'function') {
          window.projectManager = new window.ProjectManager();
          return resolve(window.projectManager);
        }
        return reject(new Error('ProjectManager not initialized'));
      }
      setTimeout(check, 25);
    })();
  });
}
