import { readFileSync } from "fs";
import path from "path";

if (!globalThis.__loadedScripts) {
  globalThis.__loadedScripts = new Set();
}

export function loadScript(relativePathFromRepoRoot) {
  const abs = path.resolve(process.cwd(), relativePathFromRepoRoot);

  // Avoid double-loading in watch/reruns
  if (globalThis.__loadedScripts.has(abs)) return;

  const code = readFileSync(abs, "utf-8");
  // Evaluate in jsdom "browser" context
  window.eval(code + "\n//# sourceURL=" + abs);

  globalThis.__loadedScripts.add(abs);
}
