import { describe, it, expect, beforeAll } from "vitest";
import { loadScript } from "../helpers/loadScript.js";

let pm;

beforeAll(() => {
  // Simulate privacy mode / blocked storage
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() { throw new Error("blocked"); },
  });

  // Stub required globals
  window.firebaseApp = {};
  window.firestore = {};
  window.firebaseAuth = {};
  window.firebaseFunctions = {};

  // Minimal stub so ProjectManager can new CloudStorageService(...) without crashing
  window.CloudStorageService = class {
    constructor(...args) {
      // no-op
    }
    // Return shapes the app expects during init/use. Add methods if tests complain.
    saveToLocalStorage(key, value) { return true; }
    loadFromLocalStorage(key) { return null; }
    saveCurrentUser(user) { return true; }
    getCurrentUser() { return { role: "user" }; }
    saveUserSession(session) { return true; }
    getUserSession() { return null; }
    // If your app calls others (Cursor can list them), add no-op methods here:
    // saveProjects, saveCertifications, saveComplianceItems, etc.
  };

  // Load scripts in exact order
  loadScript("assets/js/cloudStorage.js");
  loadScript("assets/js/app.js");

  // Fire DOMContentLoaded and load events
  document.dispatchEvent(new Event("DOMContentLoaded"));
  window.dispatchEvent(new Event("load"));

  // Capture the ProjectManager instance
  pm = window.projectManager;
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
