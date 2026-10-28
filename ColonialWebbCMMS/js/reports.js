/* Reports use the actual entered records, not made-up demo metrics. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const db = CW.db;
  const orders = db.workOrders;
  const labor = orders.reduce((sum, wo) => sum + Number(wo.laborHours || 0), 0);
  const downtime = orders.reduce((sum, wo) => sum + Number(wo.downtimeHours || 0), 0);
  const done = orders.filter(wo => wo.status === 'Completed');
  const inventoryValue = db.parts.reduce((sum, part) => sum + CW.partValue(part), 0);
  document.getElementById('report-metrics').innerHTML =
    CW.metric('Work Order Completion', orders.length ? Math.round(done.length / orders.length * 100) + '%' : '—', 'Completed / total work orders', '✓', 'green') +
    CW.metric('Labor Recorded', labor.toFixed(1) + ' hr', 'From work order labor hours', '◷') +
    CW.metric('Downtime Recorded', downtime.toFixed(1) + ' hr', 'From work order downtime entries', '!', 'red') +
    CW.metric('Inventory Value', CW.money(inventoryValue), 'Current quantity × unit cost', '$', 'green');

  function progress(container, entries) {
    const total = entries.reduce((sum, row) => sum + row.count, 0);
    document.getElementById(container).innerHTML = entries.map(row => {
      const percent = total ? Math.round(row.count / total * 100) : 0;
      return `<div class="progress-row"><div class="progress-label"><span>${CW.escape(row.label)}</span><strong>${row.count} (${percent}%)</strong></div>
        <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div></div>`;
    }).join('') || CW.empty('No records available.');
  }
  progress('status-progress', ['Open', 'In Progress', 'On Hold', 'Completed'].map(status => ({ label: status, count: orders.filter(o => o.status === status).length })));
  progress('inventory-progress', ['In Stock', 'Low Stock', 'Out of Stock'].map(status => ({ label: status, count: db.parts.filter(part => CW.partStatus(part) === status).length })));
  const ranking = db.assets.map(asset => ({ name: asset.name, count: orders.filter(order => order.assetId === asset.id).length }))
    .sort((a, b) => b.count - a.count).slice(0, 6);
  document.getElementById('asset-ranking').innerHTML = ranking.length ? '<ul class="line-list">' + ranking.map((entry, index) => `<li class="flex-between"><span class="small"><strong>${index + 1}.</strong> ${CW.escape(entry.name)}</span><span class="badge badge-blue">${entry.count} orders</span></li>`).join('') + '</ul>' : CW.empty('No assets registered.');

  document.getElementById('report-export-wo').onclick = () => CW.exportCSV('work-orders.csv',
    ['ID', 'Description', 'Asset', 'Priority', 'Status', 'Technician', 'Labor Hours', 'Downtime Hours', 'Created', 'Completed'],
    orders.map(o => [o.id, o.title, CW.assetName(o.assetId), o.priority, o.status, CW.nameFor(o.assigneeId), o.laborHours, o.downtimeHours, o.createdAt, o.completedAt]));
  document.getElementById('report-export-inventory').onclick = () => CW.exportCSV('inventory.csv',
    ['Part Number', 'Description', 'Locker', 'Bin', 'Quantity', 'Min', 'Unit Cost', 'Value'],
    db.parts.map(p => [p.number, p.name, p.locker, p.bin, p.quantity, p.minimum, p.unitCost, CW.partValue(p)]));
});
