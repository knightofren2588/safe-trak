import { readFile } from 'fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { loadScript } from './loadScript.js';

export async function loadFromIndexHtml({ skipExternals = true } = {}) {
  return new Promise((resolve, reject) => {
    try {
      const html = document.documentElement;
      if (!html) throw new Error('no document');

      const scripts = Array.from(document.querySelectorAll('script'))
        .map(s => s.src || 'inline')
        .filter(Boolean);

      console.log('[LOADER] existing scripts in DOM:', scripts);

      // Manually inject just the local files in correct order:
      const localScripts = [
        'assets/js/cloudStorage.js',
        'assets/js/app.js'
      ];

      let i = 0;
      const next = () => {
        if (i >= localScripts.length) {
          console.log('[LOADER] finished');
          return resolve(true);
        }
        const path = localScripts[i++];
        const el = document.createElement('script');
        el.src = path;
        el.onload = () => { console.log('[LOADER] loaded', path); next(); };
        el.onerror = (e) => reject(new Error('Failed to load ' + path));
        document.head.appendChild(el);
      };
      next();
    } catch (e) {
      reject(e);
    }
  });
}
