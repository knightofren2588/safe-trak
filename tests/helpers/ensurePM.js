import { loadAppScriptsInOrder } from './loadLocalScript.js';

export async function ensurePM() {
  await loadAppScriptsInOrder();
  // Give microtask a tick to expose window.ProjectManager
  await new Promise(r => setTimeout(r, 0));

  if (typeof window.ProjectManager !== 'function') {
    throw new Error('ProjectManager still not available after load/microtask');
  }

  if (!window.projectManager) {
    window.projectManager = new window.ProjectManager();
  }
  const pm = window.projectManager;

  // Prefer stable ready hooks if present
  if (typeof pm.whenReady === 'function') {
    await pm.whenReady();
  } else if (typeof pm.__testLoadNow === 'function') {
    await pm.__testLoadNow();
  }
  return pm;
}
