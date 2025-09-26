import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Import a file as an ES module so top-level await is legal.
export async function importAsModule(rel) {
  const abs = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(abs)) throw new Error('[LOAD] file not found: ' + abs);
  const href = pathToFileURL(abs).href;
  console.log('[LOAD] importing:', href);
  return await import(href);
}

export async function loadAppScriptsInOrder() {
  // Match index.html local order
  await importAsModule('assets/js/cloudStorage.js');
  await importAsModule('assets/js/app.js');
  console.log('[LOAD] done importing local app modules');
}
