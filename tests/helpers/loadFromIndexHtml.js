const { readFileSync } = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { loadScript } = require('./loadScript.js');

async function loadFromIndexHtml({ skipExternals = true } = {}) {
  const htmlPath = path.resolve(process.cwd(), 'index.html');
  const htmlContent = readFileSync(htmlPath, 'utf-8');
  const dom = new JSDOM(htmlContent);
  const scripts = dom.window.document.querySelectorAll('script');
  const loaded = [];

  scripts.forEach((script, index) => {
    const src = script.getAttribute('src');
    const type = script.getAttribute('type');

    if (src) {
      if (skipExternals && (src.startsWith('http://') || src.startsWith('https://'))) {
        return;
      }
      loadScript(src);
      loaded.push({ type: 'src', value: src, attrs: { id: script.id, type } });
    } else {
      const inlineContent = script.textContent;
      if (inlineContent) {
        // Ensure tailwind exists before evaluating tailwind config inline blocks
        if (inlineContent.includes('tailwind.config')) {
          if (!("tailwind" in window)) window.tailwind = {};
          if (!("tailwind" in globalThis)) globalThis.tailwind = window.tailwind;
        }
        dom.window.eval(inlineContent + `\n//# sourceURL=index.html:inline:${index}`);
        loaded.push({ type: 'inline', value: `inline:${inlineContent.length}`, attrs: { id: script.id, type } });
      }
    }
  });

  return loaded;
}

module.exports = { loadFromIndexHtml };
