export class CloudStub {
  constructor() {
    if (!window.__CLOUD__) window.__CLOUD__ = { collections: new Map(), kv: new Map() };
    this.db = window.__CLOUD__;
  }

  // Projects as a single collection
  async saveProjects(arr) {
    this.db.kv.set('projects', Array.isArray(arr) ? JSON.parse(JSON.stringify(arr)) : []);
    return true;
  }
  async loadProjects() {
    return this.db.kv.get('projects') || [];
  }

  // Generic per-user docs: archived_projects_<userId>
  async saveToCloud(key, value) {
    this.db.kv.set(String(key), JSON.parse(JSON.stringify(value)));
    return true;
  }
  async loadFromCloud(key) {
    return this.db.kv.get(String(key));
  }

  // Optional delete
  async deleteFromCloud(key) {
    this.db.kv.delete(String(key));
    return true;
  }

  // Feature flag
  isConnected() { return true; }
}
