import { readFileSync } from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { loadScript } from "./loadScript.js";

function isExternal(src) {
  if (!src) return true;
  const s = src.trim().toLowerCase();
  return (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("//") ||
    s.startsWith("data:") ||
    s.startsWith("blob:")
  );
}

export function loadScriptsFromHtml(htmlPathFromRepoRoot) {
  const htmlAbs = path.resolve(process.cwd(), htmlPathFromRepoRoot);
  const html = readFileSync(htmlAbs, "utf-8");
  const dom = new JSDOM(html);

  const scriptEls = [...dom.window.document.querySelectorAll("script[src]")];

  for (const el of scriptEls) {
    const src = el.getAttribute("src");
    if (isExternal(src)) continue; // ⬅️ skip CDN/external scripts

    // Optional: skip module scripts if your app uses ES modules in the browser
    // and imports won’t work under eval. Uncomment to skip:
    // if ((el.getAttribute("type") || "").toLowerCase() === "module") continue;

    const scriptAbs = path.resolve(path.dirname(htmlAbs), src);
    const relFromRoot = path.relative(process.cwd(), scriptAbs);

    try {
      loadScript(relFromRoot);
    } catch (e) {
      // Don’t fail the whole load if a non-critical script is missing
      // eslint-disable-next-line no-console
      console.warn("[test] Skipping script that failed to load:", relFromRoot, e?.message);
    }
  }
}
