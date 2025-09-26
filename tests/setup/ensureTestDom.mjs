export function ensureTestDom({ ids = [], selectors = [] } = {}) {
  if (!globalThis.document) {
    throw new Error('[ensureTestDom] document not available');
  }

  const originalGetById = document.getElementById.bind(document);
  const originalQuery = document.querySelector.bind(document);

  // Create element by ID once, with a tag heuristic
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

  // Pre-create declared IDs
  ids.forEach(id => createByIdOnce(id));

  // Pre-create simple “#id” selectors
  selectors.forEach(sel => {
    if (typeof sel === 'string' && sel.startsWith('#')) {
      const id = sel.slice(1);
      createByIdOnce(id);
    }
  });

  // Optional: very light “auto-heal” without recursion:
  if (!document.__patchedGetElementById) {
    document.__patchedGetElementById = true;
    document.getElementById = function(id) {
      // Use originals to avoid recursion
      const el = originalGetById(id);
      return el || createByIdOnce(id);
    };
  }

  if (!document.__patchedQuerySelector) {
    document.__patchedQuerySelector = true;
    document.querySelector = function(sel) {
      if (typeof sel === 'string' && sel.startsWith('#')) {
        const id = sel.slice(1);
        // Reuse getElementById (already patched but uses original internally)
        return originalGetById(id) || createByIdOnce(id);
      }
      return originalQuery(sel);
    };
  }
}
