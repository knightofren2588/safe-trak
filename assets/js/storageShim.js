(function () {
  // Global config (can be set in index.html)
  const cfg = (window.SafeTrackConfig = window.SafeTrackConfig || { allowLocalStorage: false });

  function canUseLocalStorage() {
    if (!cfg.allowLocalStorage) return false;
    try {
      const ls = window.localStorage;
      void ls.getItem; // touches getter
      return true;
    } catch { return false; }
  }

  // Export to global namespace (vanilla app)
  window.__storageShim__ = {
    read(key) {
      try { return window.localStorage.getItem(key); } catch { return null; }
    },
    write(key, value) {
      if (!canUseLocalStorage()) return false; // writes disabled in prod
      try { window.localStorage.setItem(key, value); return true; } catch { return false; }
    },
    remove(key) {
      if (!canUseLocalStorage()) return false;
      try { window.localStorage.removeItem(key); return true; } catch { return false; }
    }
  };
}());
