/* Reports use the exact calculation engine as the dashboard, and export source events. */
document.addEventListener('DOMContentLoaded',function(){
  const CW=window.CW, $=id=>document.getElementById(id);
  const orders=CW.records('workOrders');
  function progress(container,entries){
    const total=entries.reduce((s,x)=>s+x.count,0);
    $(container).innerHTML=entries.map(x=>{const pct=total?Math.round(100*x.count/total):0;
      return `<div class="progress-row"><div class="progress-label"><span>${CW.escape(x.label)}</span><strong>${x.count} (${pct}%)</strong></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
    }).join('')||CW.empty('No records.');
  }
  function render(){
    const p=CW.performance($('reports-period').value);
    $('report-metrics').innerHTML=
      CW.metric('Maintenance Cost',CW.money(p.maintenanceCost),'Labor + parts · selected period','$','green')+
      CW.metric('Labor Cost',CW.money(p.laborCost),p.laborHours.toFixed(2)+' recorded hours','◷')+
      CW.metric('Parts Used',CW.money(p.partsCost),'Net of returned parts','▣')+
      CW.metric('Downtime',p.downtimeHours.toFixed(2)+' hr','Recorded downtime only','!','red')+
      CW.metric('Purchases Received',CW.money(p.receivedPurchases),'Purchasing spend; not double-counted','$')+
      CW.metric('Open Commitments',CW.money(p.pendingPurchases),'Current open purchase requests','◈','amber')+
      CW.metric('Inventory Value',CW.money(p.inventoryValue),'Current stock at latest unit cost','▣')+
      CW.metric('Work Orders Completed',p.completed,'Selected period · '+p.created+' created','✓','green');
    progress('status-progress',['Open','In Progress','On Hold','Completed'].map(s=>({label:s,count:orders.filter(x=>x.status===s).length})));
    progress('inventory-progress',['In Stock','Low Stock','Out of Stock'].map(s=>({label:s,count:CW.records('parts').filter(x=>CW.partStatus(x)===s).length})));
    const ranks=p.assetRows.filter(x=>x.total!==0||x.workOrders>0).slice(0,6);
    $('asset-ranking').innerHTML=ranks.length?'<ul class="line-list">'+ranks.map((x,i)=>`<li class="flex-between"><span class="small"><strong>${i+1}.</strong> ${CW.escape(x.name)}</span><strong>${CW.money(x.total)}</strong></li>`).join('')+'</ul>':CW.empty('No asset costs in this period.');
    $('report-asset-costs').innerHTML=p.assetRows.map(x=>`<tr><td>${CW.escape(x.name)}</td><td>${x.workOrders}</td><td>${CW.money(x.laborCost)}</td><td>${CW.money(x.partsCost)}</td><td><strong>${CW.money(x.total)}</strong></td><td>${x.downtimeHours.toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="6">No assets found.</td></tr>';
    $('report-order-costs').innerHTML=[...orders].sort((a,b)=>CW.woCosts(b).total-CW.woCosts(a).total).map(x=>{
      const c=CW.woCosts(x);return `<tr><td><a href="work-orders.html?order=${encodeURIComponent(x.id)}" class="cell-id">${CW.escape(x.id)}</a></td><td>${CW.escape(CW.assetName(x.assetId))}</td><td>${CW.statusBadge(x.status)}</td><td>${c.laborHours.toFixed(2)}</td><td>${c.downtimeHours.toFixed(2)}</td><td>${CW.money(c.labor)}</td><td>${CW.money(c.parts)}</td><td><strong>${CW.money(c.total)}</strong></td></tr>`;
    }).join('')||'<tr><td colspan="8">No orders found.</td></tr>';
  }
  $('reports-period').onchange=render;
  $('report-export-wo').onclick=()=>CW.exportCSV('work-orders-with-costs.csv',
    ['ID','Description','Asset','Priority','Status','Assigned','Labor Hours','Downtime Hours','Labor Cost','Parts Cost','Total Cost','Created','Completed'],
    orders.map(o=>{const c=CW.woCosts(o);return [o.id,o.title,CW.assetName(o.assetId),o.priority,o.status,CW.nameFor(o.assigneeId),c.laborHours,c.downtimeHours,c.labor,c.parts,c.total,o.createdAt,o.completedAt]}));
  $('report-export-inventory').onclick=()=>CW.exportCSV('inventory.csv',
    ['Part Number','Description','Locker','Bin','Quantity','Minimum','Unit Cost','Value'],
    CW.records('parts').map(x=>[x.number,x.name,x.locker,x.bin,x.quantity,x.minimum,x.unitCost,CW.partValue(x)]));
  $('report-export-costs').onclick=()=>CW.exportCSV('cost-and-time-events.csv',
    ['Date','Category','Work Order','Asset','Hours','Amount','Source'],
    CW.performance($('reports-period').value).events.map(x=>[x.date,x.kind,x.woId||'',CW.assetName(x.assetId),x.hours,x.amount,x.source]));
  render();
});
