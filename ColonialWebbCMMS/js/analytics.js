/* CMMS measurement engine. Calculations derive from source records; never cache KPI totals.
 * In production move the same rules behind authenticated API endpoints/DB transactions.
 * Costs are estimates based on configured demo rates and recorded part prices.
 */
(function () {
  const CW = window.CW;
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const round = (value, dp = 2) => Math.round((value + Number.EPSILON) * 10 ** dp) / 10 ** dp;
  const logDate = value => String(value || '').slice(0, 10);
  CW.rateFor = userId => {
    const user = CW.find('team', userId);
    const rate = user?.hourlyRate;
    return rate === '' || rate === undefined || rate === null
      ? Math.max(0, num(CW.db.settings?.defaultLaborRate)) : Math.max(0, num(rate));
  };
  CW.woLaborHours = wo => num(wo.laborHours) + CW.all('laborEntries').filter(x => x.workOrderId === wo.id).reduce((s, x) => s + num(x.hours), 0);
  CW.woDowntimeHours = wo => num(wo.downtimeHours) + CW.all('downtimeEntries').filter(x => x.workOrderId === wo.id).reduce((s, x) => s + num(x.hours), 0);
  CW.woLaborCost = wo => round(num(wo.laborHours) * (wo.legacyLaborRate === undefined ? CW.rateFor(wo.assigneeId) : num(wo.legacyLaborRate)) +
    CW.all('laborEntries').filter(x => x.workOrderId === wo.id).reduce((s, x) => s + num(x.hours) * num(x.hourlyRate), 0));
  CW.woPartsCost = wo => round(CW.all('transactions').filter(x => x.workOrderId === wo.id && ['Issue', 'Return'].includes(x.type))
    .reduce((s, tx) => {
      const cost = tx.unitCostSnapshot ?? CW.find('parts', tx.partId)?.unitCost ?? 0;
      return s + (tx.type === 'Issue' ? 1 : -1) * num(tx.quantity) * num(cost);
    }, 0));
  CW.woCosts = wo => {
    const labor = CW.woLaborCost(wo), parts = CW.woPartsCost(wo);
    return { labor, parts, total: round(labor + parts), laborHours: round(CW.woLaborHours(wo), 3), downtimeHours: round(CW.woDowntimeHours(wo), 3) };
  };
  CW.costEvents = function () {
    const events = [];
    // Existing/manual hours have no individual timestamps. Their WO creation date is
    // only a reporting attribution fallback; tracked sessions have exact end times.
    CW.all('workOrders').forEach(wo => {
      const rate = wo.legacyLaborRate === undefined ? CW.rateFor(wo.assigneeId) : num(wo.legacyLaborRate);
      if (num(wo.laborHours)) events.push({ kind: 'labor', date: wo.manualHoursAt || wo.createdAt, woId: wo.id, assetId: wo.assetId,
        hours: num(wo.laborHours), amount: num(wo.laborHours) * rate, source: 'manual' });
      if (num(wo.downtimeHours)) events.push({ kind: 'downtime', date: wo.manualDowntimeAt || wo.createdAt, woId: wo.id,
        assetId: wo.assetId, hours: num(wo.downtimeHours), amount: 0, source: 'manual' });
    });
    CW.all('laborEntries').forEach(x => {
      events.push({ kind: 'labor', date: x.endedAt || x.recordedAt, woId: x.workOrderId,
        assetId: CW.find('workOrders', x.workOrderId)?.assetId || '', hours: num(x.hours),
        amount: num(x.hours) * num(x.hourlyRate), source: x.source || 'timer' });
    });
    CW.all('downtimeEntries').forEach(x => {
      events.push({ kind: 'downtime', date: x.endedAt || x.recordedAt, woId: x.workOrderId,
        assetId: CW.find('workOrders', x.workOrderId)?.assetId || '', hours: num(x.hours), amount: 0, source: x.source || 'timer' });
    });
    CW.all('transactions').filter(x => x.workOrderId && ['Issue', 'Return'].includes(x.type)).forEach(tx => {
      const wo = CW.find('workOrders', tx.workOrderId);
      const rate = tx.unitCostSnapshot ?? CW.find('parts', tx.partId)?.unitCost ?? 0;
      events.push({ kind: 'parts', date: tx.date, woId: tx.workOrderId, assetId: wo?.assetId || tx.assetId || '',
        hours: 0, amount: (tx.type === 'Issue' ? 1 : -1) * num(tx.quantity) * num(rate), source: tx.type });
    });
    // Purchasing spend is a separate cash/procurement metric. Never add it to
    // work-order cost, or the same part is counted twice when it gets used.
    CW.all('purchaseRequests').filter(x => x.status === 'Received' && x.receivedAt).forEach(req => {
      events.push({ kind: 'purchasing', date: req.receivedAt, amount: num(req.quantity) * num(req.unitCost),
        woId: '', assetId: '', hours: 0, source: req.id });
    });
    return events;
  };
  CW.periodStart = period => {
    if (!period || period === 'all') return '';
    const days = Number(period);
    if (!Number.isFinite(days) || days < 1) return '';
    const start = new Date(); start.setDate(start.getDate() - days + 1);
    return CW.ymd(start);
  };
  CW.performance = function (period = 'all') {
    const start = CW.periodStart(period), inPeriod = d => !start || logDate(d) >= start;
    const events = CW.costEvents().filter(x => inPeriod(x.date));
    const total = key => events.filter(x => x.kind === key).reduce((s, x) => s + num(x.amount), 0);
    const hours = key => events.filter(x => x.kind === key).reduce((s, x) => s + num(x.hours), 0);
    const orders = CW.records('workOrders');
    const completed = orders.filter(x => x.status === 'Completed' && inPeriod(x.completedAt));
    const created = orders.filter(x => inPeriod(x.createdAt));
    const laborCost = round(total('labor')), partsCost = round(total('parts'));
    const assetRows = CW.all('assets').map(asset => {
      const related = events.filter(x => x.assetId === asset.id);
      const labor = related.filter(x => x.kind === 'labor').reduce((s,x) => s+num(x.amount),0);
      const parts = related.filter(x => x.kind === 'parts').reduce((s,x) => s+num(x.amount),0);
      const relatedOrders = orders.filter(x => x.assetId === asset.id && inPeriod(x.createdAt));
      return { id: asset.id, name: asset.name, laborCost: round(labor), partsCost: round(parts), total: round(labor+parts),
        workOrders: relatedOrders.length, downtimeHours: round(related.filter(x => x.kind === 'downtime').reduce((s,x)=>s+num(x.hours),0),2) };
    }).sort((a,b) => b.total - a.total);
    return { period, start, events, orders: orders.length, open: orders.filter(x => x.status !== 'Completed').length,
      critical: orders.filter(x => x.status !== 'Completed' && x.priority === 'Critical').length,
      completed: completed.length, created: created.length,
      pmDue: CW.records('pmTasks').filter(x => x.nextDue <= CW.today()).length,
      stockAlerts: CW.records('parts').filter(x => CW.partStatus(x) !== 'In Stock').length,
      laborHours: round(hours('labor'),2), downtimeHours: round(hours('downtime'),2), laborCost, partsCost,
      maintenanceCost: round(laborCost+partsCost), receivedPurchases: round(total('purchasing')),
      pendingPurchases: round(CW.records('purchaseRequests').filter(x => ['Requested','Ordered'].includes(x.status)).reduce((s,x) => s + num(x.quantity)*num(x.unitCost),0)),
      inventoryValue: round(CW.records('parts').reduce((s,x) => s + CW.partValue(x),0)),
      assetRows, averageLaborHours: completed.length ? round(completed.reduce((s,x) => s+CW.woLaborHours(x),0)/completed.length,2) : 0 };
  };
  CW.timerFor = (type, workOrderId, userId) => CW.all('activeTimers').find(t => t.type === type && t.workOrderId === workOrderId &&
    (!userId || t.userId === userId));
  CW.startTimer = function (type, workOrderId) {
    if (!CW.require('write')) return {ok:false};
    if (!['labor','downtime'].includes(type)) return {ok:false,error:'Invalid timer type.'};
    const wo = CW.active('workOrders', workOrderId);
    if (!wo || wo.status === 'Completed') return {ok:false,error:'Open a work order before starting a timer.'};
    if (CW.all('activeTimers').some(t => t.type === type && t.userId === CW.currentUser().id))
      return {ok:false,error:'Stop your other '+type+' timer before starting another.'};
    const timer = {id:CW.nextId(CW.all('activeTimers').concat(CW.all('laborEntries'),CW.all('downtimeEntries')),'TIME'),
      type, workOrderId, userId:CW.currentUser().id, startedAt:CW.isoNow(), hourlyRate: type === 'labor' ? CW.rateFor(CW.currentUser().id) : 0};
    CW.db.activeTimers.push(timer);
    if (wo.status === 'Open') wo.status = 'In Progress';
    if (!wo.startedAt) wo.startedAt = timer.startedAt;
    CW.log('Started '+type+' timer for '+workOrderId,'Time');
    return {ok:true,timer};
  };
  CW.stopTimer = function (type, workOrderId, options={}) {
    if (!CW.require('write')) return {ok:false};
    const index = CW.all('activeTimers').findIndex(t => t.type === type && t.workOrderId === workOrderId &&
      (options.adminAll || t.userId === CW.currentUser().id));
    if (index < 0) return {ok:false,error:'No active '+type+' timer for your account on this work order.'};
    const timer = CW.db.activeTimers[index], endedAt = CW.isoNow();
    const hours = round(Math.max(0, (new Date(endedAt)-new Date(timer.startedAt))/3600000),5);
    CW.db.activeTimers.splice(index,1);
    const entry = {id:CW.nextId(CW.all(type === 'labor' ? 'laborEntries' : 'downtimeEntries'), type === 'labor' ? 'LAB' : 'DOWN'),
      workOrderId, userId:timer.userId, startedAt:timer.startedAt, endedAt, recordedAt:endedAt,
      hours, source:'timer', hourlyRate: type === 'labor' ? num(timer.hourlyRate) : 0};
    CW.db[type === 'labor' ? 'laborEntries' : 'downtimeEntries'].push(entry);
    CW.log('Stopped '+type+' timer for '+workOrderId+' ('+round(hours,3)+' hr)','Time');
    return {ok:true,entry};
  };
  CW.addTimeEntry = function (type, workOrderId, hours, userId, note='') {
    if (!CW.require('write')) return {ok:false};
    const wo = CW.active('workOrders',workOrderId), count = Number(hours);
    if (!wo || !['labor','downtime'].includes(type) || !Number.isFinite(count) || count <= 0 || count > 10000)
      return {ok:false,error:'Enter a positive number of hours for an active work order.'};
    const record = {id:CW.nextId(CW.all(type === 'labor' ? 'laborEntries' : 'downtimeEntries'),type === 'labor' ? 'LAB' : 'DOWN'),
      workOrderId, userId:userId || CW.currentUser().id, hours:round(count,5), hourlyRate:type === 'labor' ? CW.rateFor(userId || CW.currentUser().id) : 0,
      recordedAt:CW.isoNow(), source:'manual', note:String(note||'').trim()};
    CW.db[type === 'labor' ? 'laborEntries' : 'downtimeEntries'].push(record);
    CW.log('Logged '+round(count,3)+' '+type+' hours for '+workOrderId,'Time');
    return {ok:true,entry:record};
  };
  CW.closeTimersForWO = function (workOrderId) {
    const timers = CW.all('activeTimers').filter(t => t.workOrderId === workOrderId);
    for (const timer of timers) CW.stopTimer(timer.type,workOrderId,{adminAll:true});
  };
  CW.advancePmFromWorkOrder = function (order) {
    if (!order.pmId || !order.pmDue) return;
    const pm = CW.find('pmTasks',order.pmId);
    if (!pm || CW.all('pmHistory').some(h => h.workOrderId === order.id)) return;
    const oldDue = order.pmDue;
    const now = new Date(CW.today()+'T12:00:00');
    let next = new Date(oldDue+'T12:00:00');
    if (!Number.isFinite(next.getTime()) || !(Number(pm.intervalDays) > 0)) return;
    do { next.setDate(next.getDate()+Number(pm.intervalDays)); } while(next <= now);
    pm.lastDone = CW.today();
    // Do not roll backward if another completion already advanced the schedule.
    if (!pm.nextDue || next > new Date(pm.nextDue+'T12:00:00')) pm.nextDue=CW.ymd(next);
    CW.db.pmHistory.unshift({id:CW.nextId(CW.all('pmHistory'),'PMH'),pmId:pm.id,workOrderId:order.id,
      assetId:order.assetId,technician:CW.nameFor(order.assigneeId),notes:'Automatically recorded on linked WO completion',
      completedAt:CW.isoNow(),previousDue:oldDue});
    CW.log('Advanced '+pm.id+' from completed '+order.id,'PM');
  };
  CW.completeWorkOrder = function (order) {
    CW.closeTimersForWO(order.id);
    order.status='Completed'; order.completedAt=CW.today(); order.completedTimestamp=CW.isoNow();
    CW.advancePmFromWorkOrder(order);
  };
})();
