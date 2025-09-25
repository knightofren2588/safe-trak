import { describe, it, expect, beforeAll } from "vitest";
import { loadScript } from "./helpers/loadScript.js";

beforeAll(() => {
  // Set localStorage to simulate a non-admin user
  localStorage.setItem("safetrack_current_user", JSON.stringify({ role: "user" }));
  loadScript("assets/js/app.js");
});

describe("Permissions", () => {
  it("blocks non-admin users from archiving", () => {
    const pm = window.projectManager; // use the global instance

    let errorThrown = false;
    try {
      pm.archiveProject("123"); // attempt to call the admin-only method
    } catch (e) {
      errorThrown = true;
    }
    expect(errorThrown).toBe(true);
  });
});
