/* Shared CMMS demo store, role helpers, soft deletion, and stock service. */
(function () {
  const CW = window.CW = window.CW || {};
  const repository = window.CMMS_DATA;
  const roleMap = {
    Admin: 'Admin', Administrator: 'Admin',
    Maintenance: 'Maintenance', Technician: 'Maintenance', 'Maintenance Manager': 'Maintenance',
    Operator: 'Operator', Requestor: 'Operator', Management: 'Operator'
  };
  function hydrate(data) {
    const seed = window.CW_SEED();
    if (!data || !Array.isArray(data.workOrders) || !Array.isArray(data.parts)) return seed;
    const merged = Object.assign(seed, data);
    for (const key of ['team', 'assets', 'workOrders', 'pmTasks', 'pmHistory', 'parts', 'transactions', 'purchaseRequests', 'activity', 'laborEntries', 'downtimeEntries', 'activeTimers']) {
      if (!Array.isArray(merged[key])) merged[key] = [];
    }
    for (const user of merged.team) user.role = roleMap[user.role] || 'Operator';
    merged.settings = { defaultLaborRate: 0, ...seed.settings, ...(data.settings || {}) };
    // Records from older demo versions keep their original hours and part movements.
    // New labor/time logs are additive; no saved work orders are reset.
    if (!merged.team.some(user => user.id === merged.currentUserId && user.active && !user.deletedAt)) {
      merged.currentUserId = merged.team.find(user => user.active && !user.deletedAt)?.id || '';
    }
    return merged;
  }
  try { CW.db = hydrate(repository.read()); }
  catch (error) { console.warn('Demo data could not load; using examples.', error); CW.db = window.CW_SEED(); }
  // One-time upgrade for saved pre-cost demo orders. Store the current configured
  // rate as their best available historical estimate; future rate changes won't
  // silently rewrite the cost of old manual hours.
  let migratedRates = false;
  CW.db.workOrders.forEach(wo => {
    if (wo.legacyLaborRate === undefined) {
      const technician = CW.db.team.find(person => person.id === wo.assigneeId);
      wo.legacyLaborRate = Number(technician?.hourlyRate ?? CW.db.settings.defaultLaborRate ?? 0);
      migratedRates = true;
    }
  });
  CW.dataMode = repository.mode;
  CW.key = repository.key;
  CW.save = function () {
    try { repository.write(CW.db); }
    catch (error) { console.error(error); if (CW.toast) CW.toast('Unable to save changes in this browser.', 'danger'); }
  };
  if (migratedRates) CW.save();
  CW.reset = function () { CW.db = window.CW_SEED(); CW.save(); };
  CW.exportJSON = () => CW.download('colonialwebb-cmms-backup.json', JSON.stringify(CW.db, null, 2), 'application/json');
  CW.importJSON = function (raw) {
    const data = JSON.parse(raw);
    const required = ['workOrders','assets','pmTasks','parts','transactions','team','purchaseRequests'];
    if (!data || !required.every(key => Array.isArray(data[key]))) throw new Error('This is not a compatible CMMS backup.');
    CW.db = hydrate(data);
    CW.save();
  };
  CW.nextId = function (items, prefix, startNumber) {
    const max = items.reduce((best, item) => {
      const match = String(item.id || '').match(/(\d+)$/);
      return Math.max(best, match ? Number(match[1]) : 0);
    }, startNumber || 0);
    return prefix + '-' + String(max + 1).padStart(3, '0');
  };
  CW.all = collection => CW.db[collection] || [];
  CW.records = collection => CW.all(collection).filter(item => !item.deletedAt);
  CW.find = (collection, id) => CW.all(collection).find(item => item.id === id);
  CW.active = (collection, id) => CW.records(collection).find(item => item.id === id);
  CW.ymd = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  CW.today = () => CW.ymd(new Date());
  CW.isoNow = () => new Date().toISOString();
  CW.nameFor = function (id, collection) {
    if (!id) return 'Unassigned';
    const item = CW.find(collection || 'team', id);
    return item ? item.name : 'Unknown';
  };
  CW.assetName = id => CW.nameFor(id, 'assets');
  CW.currentUser = () => CW.active('team', CW.db.currentUserId) || CW.records('team').find(u => u.active) || { name: 'Demo User', role: 'Operator', id: '' };
  CW.role = () => roleMap[CW.currentUser().role] || 'Operator';
  CW.can = function (action) {
    const role = CW.role();
    if (action === 'view' || action === 'ticket:create') return true;
    if (action === 'write') return role === 'Maintenance' || role === 'Admin';
    if (action === 'delete' || action === 'users:manage' || action === 'danger') return role === 'Admin';
    return false;
  };
  CW.require = function (action) {
    if (CW.can(action)) return true;
    if (CW.toast) CW.toast('Your ' + CW.role() + ' demo role cannot perform this action.', 'danger');
    return false;
  };
  CW.log = function (message, type) {
    CW.db.activity = CW.db.activity || [];
    CW.db.activity.unshift({ id: CW.nextId(CW.db.activity, 'LOG'), date: CW.isoNow(), actorId: CW.currentUser().id,
      actor: CW.currentUser().name, type: type || 'Change', message });
    CW.save();
  };
  CW.partStatus = function (part) {
    if (Number(part.quantity) <= 0) return 'Out of Stock';
    if (Number(part.quantity) < Number(part.minimum)) return 'Low Stock';
    return 'In Stock';
  };
  CW.partValue = part => Number(part.quantity || 0) * Number(part.unitCost || 0);
  CW.deleteRecord = function (collection, id, label) {
    if (!CW.require('delete')) return false;
    const allowed = ['workOrders','assets','pmTasks','parts','purchaseRequests','team'];
    if (!allowed.includes(collection)) return false;
    const record = CW.active(collection, id);
    if (!record) return false;
    if (collection === 'team') {
      if (record.id === CW.db.currentUserId) { CW.toast('Switch to another admin before removing your own account.', 'danger'); return false; }
      if (record.role === 'Admin' && CW.records('team').filter(user => user.active && user.role === 'Admin').length <= 1) {
        CW.toast('At least one active admin must remain.', 'danger'); return false;
      }
    }
    if (collection === 'parts' && Number(record.quantity || 0) !== 0) {
      CW.toast('Adjust this part location to zero stock before deleting it.', 'danger'); return false;
    }
    const name = label || record.name || record.title || record.number || record.id;
    if (!window.confirm('Delete ' + name + '? It will be hidden from normal lists, but history and references are retained for audit purposes.')) return false;
    // Complete any clock that was recording on a work order before archiving.
    if (collection === 'workOrders' && typeof CW.closeTimersForWO === 'function') CW.closeTimersForWO(id);
    record.deletedAt = CW.isoNow();
    record.deletedBy = CW.currentUser().id;
    CW.log('Deleted ' + collection + ' record ' + record.id + ' (' + name + ')', 'Delete');
    CW.toast('Record deleted from active view.');
    return true;
  };
  CW.partBalance = function (workOrderId, partId) {
    return CW.all('transactions').filter(tx => tx.workOrderId === workOrderId && tx.partId === partId)
      .reduce((sum, tx) => sum + (tx.type === 'Issue' ? Number(tx.quantity) : tx.type === 'Return' ? -Number(tx.quantity) : 0), 0);
  };
  CW.woParts = function (workOrderId) {
    const balances = new Map();
    CW.all('transactions').filter(tx => tx.workOrderId === workOrderId && ['Issue','Return'].includes(tx.type)).forEach(tx => {
      const entry = balances.get(tx.partId) || { partId: tx.partId, number: tx.partNumber, issued: 0, returned: 0 };
      if (tx.type === 'Issue') entry.issued += Number(tx.quantity);
      else entry.returned += Number(tx.quantity);
      balances.set(tx.partId, entry);
    });
    return [...balances.values()].map(x => ({ ...x, used: x.issued - x.returned }));
  };
  CW.moveStock = function ({ type, partId, quantity, workOrderId = '', note = '', targetLocker = '', targetBin = '' }) {
    if (!CW.require('write')) return { ok: false };
    const part = CW.active('parts', partId);
    if (!part) return { ok: false, error: 'Select a valid part location.' };
    const count = Number(quantity), before = Number(part.quantity);
    if (!Number.isInteger(count) || count < (type === 'Adjust' ? 0 : 1)) return { ok: false, error: 'Quantity must be a valid whole number.' };
    if (!['Issue','Return','Receive','Adjust','Transfer'].includes(type)) return { ok: false, error: 'Invalid stock action.' };
    if (workOrderId && !CW.active('workOrders', workOrderId)) return { ok: false, error: 'That work order does not exist.' };
    if (workOrderId && type === 'Return' && count > CW.partBalance(workOrderId, partId)) return { ok: false, error: 'Return quantity exceeds issued parts on this work order.' };
    const change = type === 'Issue' || type === 'Transfer' ? -count : type === 'Adjust' ? count - before : count;
    if (before + change < 0) return { ok: false, error: 'Insufficient inventory in this locker/bin.' };
    const origin = part.locker + ' / ' + part.bin;
    let from = origin, to = origin, target = null;
    if (type === 'Transfer') {
      targetLocker = String(targetLocker).trim(); targetBin = String(targetBin).trim();
      if (!targetLocker || !targetBin) return { ok: false, error: 'Enter the destination locker and bin.' };
      if (origin.toLowerCase() === (targetLocker + ' / ' + targetBin).toLowerCase()) return { ok: false, error: 'Choose a different location.' };
      target = CW.records('parts').find(p => p.number.toLowerCase() === part.number.toLowerCase() && p.locker.toLowerCase() === targetLocker.toLowerCase() && p.bin.toLowerCase() === targetBin.toLowerCase());
      if (!target) {
        target = { ...part, id: CW.nextId(CW.all('parts'), 'PART'), locker: targetLocker, bin: targetBin, quantity: 0, minimum: 0, maximum: 0 };
        CW.db.parts.push(target);
      }
      target.quantity = Number(target.quantity) + count;
      to = targetLocker + ' / ' + targetBin;
    } else if (type === 'Issue') to = 'Used / Removed';
    else if (type === 'Receive' || type === 'Return') from = 'Outside Inventory';
    else if (type === 'Adjust') from = origin + ' (count ' + before + ')';
    part.quantity = before + change;
    // Snapshot the value at the time of movement. Returning parts credits their original
    // work-order issue value rather than a later edited catalog price.
    let cost = Number(part.unitCost || 0);
    if (type === 'Return' && workOrderId) {
      const prior = CW.all('transactions').filter(tx => tx.partId === partId && tx.workOrderId === workOrderId);
      const netValue = prior.reduce((sum, tx) => sum + (tx.type === 'Issue' ? 1 : tx.type === 'Return' ? -1 : 0) * Number(tx.quantity || 0) * Number(tx.unitCostSnapshot ?? part.unitCost ?? 0), 0);
      const netQty = CW.partBalance(workOrderId, partId);
      if (netQty > 0) cost = Math.max(0, netValue / netQty);
    }
    const transaction = {
      id: CW.nextId(CW.all('transactions'), 'TX'), date: CW.isoNow(), type,
      partId: part.id, partNumber: part.number, quantity: type === 'Adjust' ? change : count,
      from, to, technician: CW.currentUser().name, technicianId: CW.currentUser().id,
      workOrderId, note: String(note || '').trim(), beforeQty: before, afterQty: part.quantity,
      unitCostSnapshot: cost, assetId: workOrderId ? CW.find('workOrders', workOrderId)?.assetId || '' : ''
    };
    CW.db.transactions.unshift(transaction);
    CW.log(type + ' ' + (type === 'Adjust' ? before + ' → ' + count : count) + ' ' + part.number +
      (workOrderId ? ' for ' + workOrderId : '') + ' by ' + CW.currentUser().name, 'Stock');
    return { ok: true, transaction };
  };
})();
