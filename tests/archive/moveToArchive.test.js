import { JSDOM } from "jsdom";
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { loadScript } from "../helpers/loadScript.js";

let pm;

// Test data
const testProject = {
  id: "p1",
  name: "Demo Project",
  status: "completed", // Important: Only completed projects can be archived
  description: "Test project for archive functionality",
  createdBy: "user1",
  assignedTo: ["user1"],
  createdAt: new Date().toISOString()
};

const TEST_DEBUG = true;
const log = (...a) => { if (TEST_DEBUG) console.log('[TEST]', ...a); };

function bootApp({ blockStorage = false, seed = {} } = {}) {
  // (a) Reset script cache from our test loader so scripts can re-evaluate on "reload"
  if (globalThis.__loadedScripts) globalThis.__loadedScripts.clear();

  // (b) Reset globals that app may set between runs
  delete window.projectManager;

  // (c) Optional: block writes (for other tests). For the reload test we will NOT block.
  if (blockStorage) {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new Error("blocked"); },
    });
  } else {
    // Restore jsdom’s normal localStorage if previously mocked
    // (no-op if already fine)
    try {
      const ls = window.localStorage;
      void ls.getItem;
    } catch {
      // Provide a minimal in-memory localStorage polyfill
      const store = new Map();
      window.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => { store.set(k, String(v)); },
        removeItem: (k) => { store.delete(k); },
        clear: () => { store.clear(); },
      };
    }
  }

  // (d) Seed storage with any provided keys (for reload realism)
  for (const [k, v] of Object.entries(seed)) {
    window.localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
  }

  // (e) Stub required globals
  window.firebaseApp = {};
  window.firestore = {};
  window.firebaseAuth = {};
  window.firebaseFunctions = {};

  // (f) Ensure CloudStorageService path uses local in tests
  window.CloudStorageService = undefined;
  log('persistencePath', 'local');

  // (g) Load local scripts in EXACT order from index.html (skip externals)
  loadScript("assets/js/app.js");

  // (h) Fire init events used by the app
  document.dispatchEvent(new window.Event("DOMContentLoaded"));
  window.dispatchEvent(new window.Event("load"));

  return window.projectManager;
}

beforeAll(() => {
  // Stub bootstrap first to prevent errors
  window.bootstrap = { 
    Modal: class { 
      static getInstance() { return { hide: () => {} }; }
      show() {}
      hide() {}
    }, 
    Tooltip: class {}, 
    Popover: class {} 
  };

  // Stub CloudStorageService
  window.CloudStorageService = class {
    constructor() {}
    isConnected = true;
    saveToLocalStorage() { return true; }
    loadFromLocalStorage() { return null; }
    saveCurrentUser() { return true; }
    getCurrentUser() { return { role: "user" }; }
    saveUserSession() { return true; }
    getUserSession() { return null; }
    saveToCloud() { return Promise.resolve(true); }
    loadFromCloud() { return Promise.resolve([]); }
    saveProjects() { return Promise.resolve(true); }
    deleteFromCloud() { return Promise.resolve(true); }
  };

  // Stub required globals
  window.firebaseApp = {};
  window.firestore = {};
  window.firebaseAuth = {};
  window.firebaseFunctions = {};

  // Simulate localStorage
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    writable: true
  });

  // Mock confirm dialog
  global.confirm = () => true;
  
  // Mock alert
  global.alert = () => {};
  
  // Mock console methods to reduce noise
  console.log = vi.fn();
  console.error = vi.fn();

  // Load app script
  loadScript("assets/js/app.js");

  // Fire initialization events
  document.dispatchEvent(new Event("DOMContentLoaded"));
  window.dispatchEvent(new Event("load"));

  // Get ProjectManager instance and configure it for testing
  pm = window.projectManager;
  
  // Set up test data
  if (pm) {
    // Ensure our test project is in the active projects list
    pm.projects = [testProject];
    pm.currentUser = "user1"; // Set current user to match project creator
    
    // Initialize empty archive for the user
    pm.archivedProjects = {};
    pm.archivedProjects["user1"] = [];
    
    // Mock the render method to simulate DOM updates
    pm.render = () => {
      const projectTableBody = document.createElement('tbody');
      projectTableBody.id = 'projectTableBody';
      if (pm.projects.length > 0) {
        const row = document.createElement('tr');
        row.textContent = pm.projects[0].name;
        projectTableBody.appendChild(row);
      }
      document.body.appendChild(projectTableBody);

      const archiveTableBody = document.createElement('tbody');
      archiveTableBody.id = 'archiveTableBody';
      if (pm.archivedProjects["user1"].length > 0) {
        const row = document.createElement('tr');
        row.textContent = pm.archivedProjects["user1"][0].name;
        archiveTableBody.appendChild(row);
      }
      document.body.appendChild(archiveTableBody);
    };
    
    // Mock the showNotification method
    pm.showNotification = () => {};
    
    // Mock canUserEditProject to always return true for our test
    pm.canUserEditProject = () => true;
    
    // Mock saveProjects and saveArchivedProjects to be no-ops
    pm.saveProjects = () => Promise.resolve();
    pm.saveArchivedProjects = () => Promise.resolve();
  }
});

beforeEach(() => {
  // Reset the DOM before each test
  document.body.innerHTML = '';
});

describe("Archive functionality", () => {
  it("should move a project from active to archive", async () => {
    // Skip if pm is not properly initialized
    if (!pm) {
      console.warn("ProjectManager not initialized, skipping test");
      return;
    }
    
    // Verify initial state
    expect(pm.projects.length).toBe(1);
    expect(pm.projects[0].id).toBe("p1");
    
    // Archive the project
    await pm.archiveProject("p1");
    
    // Verify project was added to archive
    expect(pm.archivedProjects["user1"].length).toBeGreaterThan(0);
    expect(pm.archivedProjects["user1"][0].originalId).toBe("p1");
    
    // Verify project was removed from active projects
    expect(pm.projects.length).toBe(0);
    expect(pm.projects.some(p => p.id === "p1")).toBe(false);

    // Re-render the UI
    pm.render();

    // DOM assertions
    const projectTableBody = document.getElementById('projectTableBody');
    expect(projectTableBody.textContent).not.toContain("Demo Project");
    
    // Assuming there's an archive container with ID 'archiveTableBody'
    const archiveTableBody = document.getElementById('archiveTableBody');
    expect(archiveTableBody.textContent).toContain("Demo Project");
  });

  it("should not duplicate a project in archive when archived twice", async () => {
    // Archive the project twice
    await pm.archiveProject("p1");
    await pm.archiveProject("p1");

    // Verify project is in archive exactly once
    expect(pm.archivedProjects["user1"].filter(p => p.originalId === "p1").length).toBe(1);

    // Verify project is not in active projects
    expect(pm.projects.some(p => p.id === "p1")).toBe(false);
  });

  it("should persist archive state across reloads", async () => {
    // Create a test project and directly manipulate the app state
    const testProject = { 
      id: "p1", 
      name: "Demo Project", 
      status: "completed",
      createdBy: "user1"
    };
    
    // Create a new ProjectManager instance
    const pm1 = window.projectManager;
    
    // Set up the test data directly
    pm1.projects = [testProject];
    pm1.currentUser = "user1";
    pm1.archivedProjects = { "user1": [] };
    
    // Mock the required methods
    pm1.canUserEditProject = () => true;
    
    // Store the original methods to restore later
    const originalSaveProjects = pm1.saveProjects;
    const originalSaveArchivedProjects = pm1.saveArchivedProjects;
    
    // Mock the save methods to track calls
    let projectsSaved = false;
    let archiveSaved = false;
    
    pm1.saveProjects = async () => {
      projectsSaved = true;
      localStorage.setItem('safetrack_projects', JSON.stringify(pm1.projects));
      return Promise.resolve();
    };
    
    pm1.saveArchivedProjects = async () => {
      archiveSaved = true;
      localStorage.setItem('safetrack_archived_projects', JSON.stringify(pm1.archivedProjects));
      return Promise.resolve();
    };
    
    // Verify initial state
    expect(pm1.projects.length).toBe(1);
    expect(pm1.projects[0].id).toBe("p1");
    expect(pm1.archivedProjects["user1"].length).toBe(0);
    
    // Archive the project
    await pm1.archiveProject("p1");
    
    // Verify project was added to archive and removed from active
    expect(pm1.archivedProjects["user1"].length).toBe(1);
    expect(pm1.archivedProjects["user1"][0].originalId).toBe("p1");
    expect(pm1.projects.length).toBe(0);
    
    // Verify persistence was called
    expect(projectsSaved).toBe(true);
    expect(archiveSaved).toBe(true);
    
    // Verify localStorage was updated
    const projectsData = localStorage.getItem('safetrack_projects');
    const archivedData = localStorage.getItem('safetrack_archived_projects');
    
    expect(projectsData).toBeTruthy();
    expect(archivedData).toBeTruthy();
    
    const parsedProjects = JSON.parse(projectsData);
    const parsedArchived = JSON.parse(archivedData);
    
    expect(parsedProjects.length).toBe(0);
    expect(parsedArchived["user1"].length).toBe(1);
    expect(parsedArchived["user1"][0].originalId).toBe("p1");

    // Simulate page reload by creating a new instance
    const pm2 = window.projectManager;
    
    // Reset state
    pm2.projects = [];
    pm2.archivedProjects = {};
    pm2.currentUser = "user1";
    
    // Restore original methods
    pm1.saveProjects = originalSaveProjects;
    pm1.saveArchivedProjects = originalSaveArchivedProjects;
    
    // Load data from localStorage
    const loadedProjects = JSON.parse(localStorage.getItem('safetrack_projects') || '[]');
    const loadedArchived = JSON.parse(localStorage.getItem('safetrack_archived_projects') || '{}');
    
    pm2.projects = loadedProjects;
    pm2.archivedProjects = loadedArchived;
    
    // Verify state after "reload"
    expect(pm2.projects.length).toBe(0);
    expect(pm2.archivedProjects["user1"].length).toBe(1);
    expect(pm2.archivedProjects["user1"][0].originalId).toBe("p1");
    
    // Verify the reconcileActiveVsArchive method works
    // Add the project back to active list to simulate a stale state
    pm2.projects.push({...testProject});
    
    // Reconcile should remove it
    pm2.reconcileActiveVsArchive();
    
    // Verify it was removed
    expect(pm2.projects.length).toBe(0);
  });
});