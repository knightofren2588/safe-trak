import { ensureTestDom } from '../setup/ensureTestDom.mjs';

/* Ensure jsdom globals exist before any other setup runs */
(() => {
  const g = globalThis;
  // In Vitest jsdom, these should already exist, but bail out early if not.
  if (!g.window || !g.document) {
    // If this ever triggers, something’s off with vitest env; avoid partial init.
    throw new Error('[SETUP] jsdom window/document not present; check vitest.config.mjs environment:"jsdom"');
  }
  // Normalize globals
  if (!global.window) global.window = g.window;
  if (!global.document) global.document = g.document;
  if (!global.navigator) global.navigator = g.window.navigator;
})();

// Tailwind (inline configs expect this)
if (!('tailwind' in globalThis)) globalThis.tailwind = {};
if (globalThis.window && !globalThis.window.tailwind) globalThis.window.tailwind = globalThis.tailwind;

// Bootstrap (avoid modal errors)
if (globalThis.window && !globalThis.window.bootstrap) {
  globalThis.window.bootstrap = {
    Modal: class { constructor(){} show(){} hide(){} },
    Tooltip: class {},
    Popover: class {},
  };
}

// Save original methods
const originalGetById = document.getElementById.bind(document);
const originalQuery = document.querySelector.bind(document);

// Helper to create elements by ID
function createByIdOnce(id) {
  if (!id) return null;
  const existing = originalGetById(id);
  if (existing) return existing;

  let tag = 'div';
  if (id.endsWith('Select')) tag = 'select';
  else if (id.endsWith('Table')) tag = 'table';
  else if (id.endsWith('Input')) tag = 'input';

  const el = document.createElement(tag);
  el.id = id;
  document.body.appendChild(el);
  return el;
}

// Patch document.getElementById
if (!document.__patchedGetElementById) {
  document.__patchedGetElementById = true;
  document.getElementById = function(id) {
    const el = originalGetById(id);
    return el || createByIdOnce(id);
  };
}

// Patch document.querySelector
if (!document.__patchedQuerySelector) {
  document.__patchedQuerySelector = true;
  document.querySelector = function(sel) {
    if (typeof sel === 'string' && sel.startsWith('#')) {
      const id = sel.slice(1);
      return originalGetById(id) || createByIdOnce(id);
    }
    return originalQuery(sel);
  };
}
