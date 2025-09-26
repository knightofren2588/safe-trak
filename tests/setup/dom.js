/* ESM setup for Vitest + jsdom */
// At this point, Vitest should have created jsdom. If not, defensively align globals.
(() => {
  const g = globalThis;
  // Ensure window/document/navigator references exist on both global and window
  if (typeof g.window !== 'undefined') {
    if (!g.document && g.window.document) g.document = g.window.document;
    if (!g.navigator && g.window.navigator) g.navigator = g.window.navigator;
    if (!global.window) global.window = g.window;
    if (!global.document) global.document = g.document;
    if (!global.navigator) global.navigator = g.navigator;
  }
})();

// --- Tailwind stub (idempotent) ---
// Inline <script> in index.html may execute: tailwind.config = {...}
if (!('tailwind' in globalThis)) globalThis.tailwind = {};
if (globalThis.window && !('tailwind' in globalThis.window)) globalThis.window.tailwind = globalThis.tailwind;

// --- Bootstrap stub (idempotent) ---
if (globalThis.window && !globalThis.window.bootstrap) {
  globalThis.window.bootstrap = {
    Modal: class { constructor(){} show(){} hide(){} },
    Tooltip: class {},
    Popover: class {},
  };
}

// --- Minimal DOM skeleton required by archive UI (idempotent) ---
(function ensureArchiveDom() {
  if (!globalThis.document) return;
  const ensure = (id, tag='div') => {
    if (!document.getElementById(id)) {
      const el = document.createElement(tag);
      el.id = id;
      document.body.appendChild(el);
    }
  };
  ensure('archiveModalBody', 'div');
  ensure('archiveUserSelect', 'select');
  ensure('archiveListContainer', 'div');
})();

// ensure whenReady exists even if app didn’t patch yet
Object.defineProperty(window, 'ensureWhenReady', {
  value: (pm) => {
    if (!pm) return;
    if (typeof pm.whenReady !== 'function') {
      pm.__readyPromise ??= Promise.resolve(true);
      pm.whenReady = () => pm.__readyPromise;
    }
  },
  configurable: true
});
