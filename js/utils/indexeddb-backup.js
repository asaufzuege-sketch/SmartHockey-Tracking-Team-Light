// IndexedDB Backup System for SmartHockey Team Light
const DB_NAME = 'SmartHockeyTeamLightBackup';
const PREFIX = 'sLight_';

const IDBBackup = (function() {
  const STORE_NAME = 'backupStore';
  const DB_VERSION = 1;

  function _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function _put(db, key, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function _get(db, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function _delete(db, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function saveFullBackup() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        data[key] = localStorage.getItem(key);
      }
    }

    // Safety guard: don't overwrite a good backup with empty data
    const keyCount = Object.keys(data).length;
    if (keyCount === 0) {
      return;
    }

    const db = await _openDB();
    await _put(db, 'fullBackup', JSON.stringify(data));
    await _put(db, 'backupTimestamp', new Date().toISOString());
    db.close();
  }

  async function loadFullBackup() {
    const db = await _openDB();
    const raw = await _get(db, 'fullBackup');
    db.close();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  async function getFullBackup() {
    return loadFullBackup();
  }

  async function getBackupTimestamp() {
    const db = await _openDB();
    const ts = await _get(db, 'backupTimestamp');
    db.close();
    return ts || null;
  }

  async function restoreFullBackup() {
    const data = await loadFullBackup();
    if (!data || Object.keys(data).length === 0) return false;
    Object.keys(data).forEach(key => {
      try { localStorage.setItem(key, data[key]); } catch(e) {}
    });
    return true;
  }

  async function clearBackup() {
    const db = await _openDB();
    await _delete(db, 'fullBackup');
    await _delete(db, 'backupTimestamp');
    db.close();
  }

  return {
    saveFullBackup,
    loadFullBackup,
    getFullBackup,
    getBackupTimestamp,
    restoreFullBackup,
    clearBackup
  };
})();

// Request persistent storage to prevent browser eviction
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}
