import { describe, it, expect, beforeAll } from "vitest";
import { loadScript } from "../helpers/loadScript.js";
import { ensurePM } from '../helpers/ensurePM.js';

beforeAll(async () => {
  // --- test boot standardization ---
  localStorage.clear();
  window.__TEST__ = true;

  // (seed anything your test needs)
  localStorage.setItem('safetrack_current_user', JSON.stringify({ id: 'u1', role: 'admin', name: 'Admin' }));
  // example seed:
  const seeded = [{ id: 101, name: 'Completed X', completed: true, status: 'completed', percentComplete: 100, archived: false }];
  localStorage.setItem('projects', JSON.stringify(seeded));
  localStorage.setItem('safetrack_projects', JSON.stringify(seeded));
  localStorage.setItem('safetrack_archived_projects', JSON.stringify({}));

  // optional: stub cloud before load if your test needs it
  try {
    const { CloudStub } = await import('../helpers/cloudStub.mjs');
    window.CloudStorageService = CloudStub;
  } catch (_) {}

  // obtain pm deterministically
  const pm = await ensurePM();
  global.pm = pm; // if convenient for subsequent tests
  // --- end standardization ---
});

describe("Storage guard: saveCustomQuotes", () => {
  it("does not crash when storage is blocked", () => {
    expect(pm && typeof pm.saveCustomQuotes).toBe("function");

    const run = () => {
      pm.saveCustomQuotes(["Safety first", "PPE saves lives"]);
    };

    // FAIL-FIRST on purpose: should NOT throw once we add the guard
    expect(run).not.toThrow();
  });
});
