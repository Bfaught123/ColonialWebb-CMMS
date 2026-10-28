/*
 * SHARED DATA STORE (NO BACKEND)
 * ------------------------------
 * The entire app is saved in this browser's localStorage.
 * No information is shared with other users or browsers.
 */
(function () {
  const KEY = 'colonialwebb_cmms_v3'; // New key avoids old prototype names/data.
  const CW = window.CW = window.CW || {};

  function clone(object) { return JSON.parse(JSON.stringify(object)); }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.workOrders) && Array.isArray(parsed.parts)) return parsed;
      }
    } catch (error) { console.warn('Saved data could not be opened.', error); }
    return window.CW_SEED();
  }

  CW.db = load();
  CW.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(CW.db)); }
    catch (error) { CW.toast('Browser storage is unavailable or full. Changes may not persist.', 'danger'); }
  };
  CW.reset = function () { CW.db = window.CW_SEED(); CW.save(); };
  CW.key = KEY;
  CW.exportJSON = function () {
    CW.download('colonialwebb-cmms-backup.json', JSON.stringify(CW.db, null, 2), 'application/json');
  };
  CW.importJSON = function (raw) {
    const data = JSON.parse(raw);
    const required = ['workOrders', 'assets', 'pmTasks', 'parts', 'transactions', 'team', 'purchaseRequests'];
    if (!data || !required.every(key => Array.isArray(data[key]))) throw new Error('This is not a compatible CMMS backup.');
    CW.db = Object.assign(window.CW_SEED(), data);
    CW.save();
  };
  CW.nextId = function (items, prefix, startNumber) {
    const max = items.reduce((best, item) => {
      const match = String(item.id || '').match(/(\d+)$/);
      return Math.max(best, match ? Number(match[1]) : 0);
    }, startNumber || 0);
    return prefix + '-' + String(max + 1).padStart(3, '0');
  };
  CW.find = (collection, id) => (CW.db[collection] || []).find(item => item.id === id);
  CW.ymd = function (date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  };
  CW.today = () => CW.ymd(new Date());
  CW.isoNow = () => new Date().toISOString();
  CW.nameFor = function (id, collection) {
    if (!id) return 'Unassigned';
    const item = CW.find(collection || 'team', id);
    return item ? item.name : 'Unknown';
  };
  CW.assetName = id => CW.nameFor(id, 'assets');
  CW.currentUser = function () { return CW.find('team', CW.db.currentUserId) || CW.db.team[0] || { name: 'Demo User', id: '' }; };
  CW.log = function (message) {
    CW.db.activity = CW.db.activity || [];
    CW.db.activity.unshift({ id: CW.nextId(CW.db.activity, 'LOG'), date: CW.isoNow(), message });
    CW.db.activity = CW.db.activity.slice(0, 100);
    CW.save();
  };
  CW.partStatus = function (part) {
    if (Number(part.quantity) <= 0) return 'Out of Stock';
    if (Number(part.quantity) < Number(part.minimum)) return 'Low Stock';
    return 'In Stock';
  };
  CW.partValue = part => Number(part.quantity || 0) * Number(part.unitCost || 0);
})();
