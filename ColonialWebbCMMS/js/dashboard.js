/* Dashboard: combines live figures from all other tabs. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const db = CW.db;
  const open = db.workOrders.filter(order => order.status !== 'Completed');
  const critical = open.filter(order => order.priority === 'Critical');
  const overdue = db.pmTasks.filter(pm => pm.nextDue <= CW.today());
  const shortages = db.parts.filter(part => CW.partStatus(part) !== 'In Stock');

  document.getElementById('dashboard-metrics').innerHTML =
    CW.metric('Open Work Orders', open.length, 'Active maintenance requests', '▤') +
    CW.metric('Critical Issues', critical.length, 'Open critical work orders', '!', 'red') +
    CW.metric('PMs Due / Overdue', overdue.length, 'Preventive maintenance', '◷', 'amber') +
    CW.metric('Stock Alerts', shortages.length, 'Low or out of stock locations', '▣', 'green');

  document.getElementById('recent-orders').innerHTML = db.workOrders.slice(0, 6).map(order => `
    <tr><td><a class="cell-id" href="work-orders.html?order=${encodeURIComponent(order.id)}">${CW.escape(order.id)}</a></td>
    <td class="cell-title">${CW.escape(order.title)}</td><td>${CW.escape(CW.assetName(order.assetId))}</td>
    <td>${CW.statusBadge(order.priority)}</td><td>${CW.escape(CW.nameFor(order.assigneeId))}</td>
    <td>${CW.statusBadge(order.status)}</td></tr>
  `).join('') || '<tr><td colspan="6">No work orders yet.</td></tr>';

  const priority = [...open].sort((a, b) => ({ Critical: 0, High: 1, Medium: 2, Low: 3 }[a.priority] - { Critical: 0, High: 1, Medium: 2, Low: 3 }[b.priority])).slice(0, 4);
  document.getElementById('priority-list').innerHTML = priority.length ? '<ul class="line-list">' + priority.map(order => `
    <li class="flex-between"><div><a class="list-title" href="work-orders.html?order=${encodeURIComponent(order.id)}">${CW.escape(order.title)}</a>
    <div class="list-meta">${CW.escape(order.id)} · ${CW.escape(CW.assetName(order.assetId))}</div></div>${CW.statusBadge(order.priority)}</li>
  `).join('') + '</ul>' : CW.empty('No open work orders.');

  document.getElementById('upcoming-pms').innerHTML = '<ul class="line-list">' + [...db.pmTasks]
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue)).slice(0, 4).map(pm => `
    <li class="flex-between"><div><div class="list-title">${CW.escape(pm.title)}</div><div class="list-meta">${CW.escape(CW.assetName(pm.assetId))}</div></div>
    <span class="tiny ${pm.nextDue < CW.today() ? 'badge badge-red' : 'text-muted'}">${CW.date(pm.nextDue)}</span></li>`).join('') + '</ul>';

  document.getElementById('inventory-alerts').innerHTML = shortages.length ? '<ul class="line-list">' + shortages.slice(0, 4).map(part => `
    <li class="flex-between"><div><div class="list-title">${CW.escape(part.name)}</div><div class="list-meta">${CW.escape(part.number)} · Locker ${CW.escape(part.locker)}, Bin ${CW.escape(part.bin)}</div></div>
    ${CW.statusBadge(CW.partStatus(part))}</li>`).join('') + '</ul>' : CW.empty('All parts are above minimum stock.');

  const date = new Date();
  const dates = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (6 - index));
    return CW.ymd(day);
  });
  const created = dates.map(day => db.workOrders.filter(order => order.createdAt === day).length);
  const completed = dates.map(day => db.workOrders.filter(order => order.completedAt === day).length);
  const max = Math.max(1, ...created, ...completed);
  document.getElementById('activity-chart').innerHTML = '<div class="bar-chart">' + dates.map((day, index) => `
    <div class="bar-group" title="${CW.escape(day)}: ${created[index]} created, ${completed[index]} completed">
      <div class="bar" style="height:${Math.max(2, created[index] / max * 96)}%"></div>
      <div class="bar done" style="height:${Math.max(2, completed[index] / max * 96)}%"></div></div>
  `).join('') + '</div><div class="bar-labels">' + dates.map(day => `<span>${new Date(day + 'T12:00:00').toLocaleDateString('en-US',{weekday:'short'})}</span>`).join('') +
    '</div><div class="chart-key"><span><i class="key-dot light"></i>Created</span><span><i class="key-dot"></i>Completed</span></div>';
});
