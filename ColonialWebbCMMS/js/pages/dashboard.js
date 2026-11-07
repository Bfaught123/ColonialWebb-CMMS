/* Dashboard calculations are shared with Reports through js/analytics.js. */
document.addEventListener('DOMContentLoaded', function () {
  const CW=window.CW, $=id=>document.getElementById(id);
  const progress = (label, value, max, amount) => `<div class="progress-row"><div class="progress-label"><span>${CW.escape(label)}</span><strong>${CW.money(amount)}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${max ? Math.max(0,Math.min(100,value/max*100)):0}%"></div></div></div>`;
  function render() {
    const orders=CW.records('workOrders'), pms=CW.records('pmTasks'), parts=CW.records('parts');
    const open=orders.filter(x=>x.status!=='Completed');
    const overdue=pms.filter(pm=>pm.nextDue <= CW.today());
    const shortages=parts.filter(part=>CW.partStatus(part)!=='In Stock');
    const perf=CW.performance($('dashboard-period').value);
    $('dashboard-metrics').innerHTML=
      CW.metric('Open Work Orders',open.length,'All currently open', '▤')+
      CW.metric('Critical Issues',open.filter(x=>x.priority==='Critical').length,'Active critical work orders','!','red')+
      CW.metric('PMs Due / Overdue',overdue.length,'Action needed','◷','amber')+
      CW.metric('Stock Alerts',shortages.length,'Low or out of stock locations','▣','green');
    const period=$('dashboard-period').selectedOptions[0].textContent;
    $('dashboard-financial').innerHTML=
      CW.metric('Maintenance Cost',CW.money(perf.maintenanceCost),period+' · Labor + issued parts','$','green')+
      CW.metric('Labor Cost',CW.money(perf.laborCost),period+' · Hourly rate × logged hours','◷')+
      CW.metric('Parts Used',CW.money(perf.partsCost),period+' · Net issue / return value','▣')+
      CW.metric('Labor Logged',perf.laborHours.toFixed(2)+' hr',period+' · Manual + tracked','◷')+
      CW.metric('Equipment Downtime',perf.downtimeHours.toFixed(2)+' hr',period+' · Recorded only','!','red')+
      CW.metric('Received Purchases',CW.money(perf.receivedPurchases),period+' · Procurement spending','$')+
      CW.metric('Open Purchase Requests',CW.money(perf.pendingPurchases),'Current estimated commitments','◈','amber')+
      CW.metric('Inventory On Hand',CW.money(perf.inventoryValue),'Current stock × latest unit cost','▣','green');
    const max=Math.max(perf.laborCost,perf.partsCost,1);
    $('dashboard-cost-breakdown').innerHTML=
      progress('Labor',perf.laborCost,max,perf.laborCost)+progress('Parts used (net returns)',perf.partsCost,max,perf.partsCost)+
      '<p class="note">Received purchases are tracked separately to avoid counting a part twice. Rates are configurable demo estimates.</p>';
    const top=perf.assetRows.filter(x=>x.total!==0 || x.workOrders>0).slice(0,5);
    $('dashboard-asset-costs').innerHTML=top.length ? '<ul class="line-list">'+top.map(x=>`<li class="flex-between"><div><div class="list-title">${CW.escape(x.name)}</div><div class="list-meta">${x.workOrders} new WOs · ${x.downtimeHours.toFixed(2)} hr downtime</div></div><strong>${CW.money(x.total)}</strong></li>`).join('')+'</ul>' : CW.empty('No asset costs recorded this period.');
    const events=perf.events.filter(x=>x.kind!=='purchasing').sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);
    $('dashboard-cost-events').innerHTML=events.map(event=>`<tr><td>${CW.date(event.date)}</td><td class="cell-id">${CW.escape(event.woId)}</td><td>${CW.escape(CW.assetName(event.assetId))}</td><td>${CW.escape(event.kind)}</td><td>${event.hours ? event.hours.toFixed(3) : '—'}</td><td>${event.kind==='downtime' ? '—' : CW.money(event.amount)}</td></tr>`).join('')||'<tr><td colspan="6">No labor, parts or downtime recorded in this period.</td></tr>';
    $('recent-orders').innerHTML=orders.slice(0,6).map(order=>`<tr><td><a class="cell-id" href="work-orders.html?order=${encodeURIComponent(order.id)}">${CW.escape(order.id)}</a></td><td class="cell-title">${CW.escape(order.title)}</td><td>${CW.escape(CW.assetName(order.assetId))}</td><td>${CW.statusBadge(order.priority)}</td><td>${CW.escape(CW.nameFor(order.assigneeId))}</td><td>${CW.statusBadge(order.status)}</td></tr>`).join('')||'<tr><td colspan="6">No work orders yet.</td></tr>';
    const priority=[...open].sort((a,b)=>({Critical:0,High:1,Medium:2,Low:3}[a.priority]-{Critical:0,High:1,Medium:2,Low:3}[b.priority])).slice(0,4);
    $('priority-list').innerHTML=priority.length?'<ul class="line-list">'+priority.map(order=>`<li class="flex-between"><div><a class="list-title" href="work-orders.html?order=${encodeURIComponent(order.id)}">${CW.escape(order.title)}</a><div class="list-meta">${CW.escape(order.id)} · ${CW.escape(CW.assetName(order.assetId))}</div></div>${CW.statusBadge(order.priority)}</li>`).join('')+'</ul>':CW.empty('No open work orders.');
    $('upcoming-pms').innerHTML=pms.length?'<ul class="line-list">'+[...pms].sort((a,b)=>a.nextDue.localeCompare(b.nextDue)).slice(0,4).map(pm=>`<li class="flex-between"><div><div class="list-title">${CW.escape(pm.title)}</div><div class="list-meta">${CW.escape(CW.assetName(pm.assetId))}</div></div><span class="tiny ${pm.nextDue<CW.today()?'badge badge-red':'text-muted'}">${CW.date(pm.nextDue)}</span></li>`).join('')+'</ul>':CW.empty('No PM schedules.');
    $('inventory-alerts').innerHTML=shortages.length?'<ul class="line-list">'+shortages.slice(0,4).map(part=>`<li class="flex-between"><div><div class="list-title">${CW.escape(part.name)}</div><div class="list-meta">${CW.escape(part.number)} · Locker ${CW.escape(part.locker)}, Bin ${CW.escape(part.bin)}</div></div>${CW.statusBadge(CW.partStatus(part))}</li>`).join('')+'</ul>':CW.empty('All parts are above minimum stock.');
    const date=new Date(), dates=Array.from({length:7},(_,i)=>{const d=new Date(date.getFullYear(),date.getMonth(),date.getDate()-(6-i));return CW.ymd(d)});
    const created=dates.map(day=>orders.filter(x=>String(x.createdAt).slice(0,10)===day).length);
    const completed=dates.map(day=>orders.filter(x=>String(x.completedAt).slice(0,10)===day).length);
    const maxCount=Math.max(1,...created,...completed);
    $('activity-chart').innerHTML='<div class="bar-chart">'+dates.map((day,i)=>`<div class="bar-group" title="${day}: ${created[i]} created, ${completed[i]} completed"><div class="bar" style="height:${Math.max(2,created[i]/maxCount*96)}%"></div><div class="bar done" style="height:${Math.max(2,completed[i]/maxCount*96)}%"></div></div>`).join('')+'</div><div class="bar-labels">'+dates.map(day=>`<span>${new Date(day+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'})}</span>`).join('')+'</div><div class="chart-key"><span><i class="key-dot light"></i>Created</span><span><i class="key-dot"></i>Completed</span></div>';
  }
  $('dashboard-period').onchange=render;
  render();
});
