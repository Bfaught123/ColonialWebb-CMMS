/* Run with: node tests/automated-regression.cjs (no npm packages required) */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const stored = new Map();
const sandbox = { console, Date, Intl, URLSearchParams, Number, Math, JSON, String, Object, Array, Map, Set, Boolean,
  localStorage: { getItem:k=>stored.get(k)||null, setItem:(k,v)=>stored.set(k,v) },
  location:{search:''}, confirm:()=>true };
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
function load(rel){vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});}
for(const file of ['js/seed.js','js/config.js','js/data-client.js','js/store.js','js/analytics.js']) load(file);
const CW = sandbox.CW;
const close=(a,b,eps=0.015)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
const wo=CW.active('workOrders','WO-1045');
const first=CW.woCosts(wo);
close(first.laborHours,1.5);
close(first.labor,1.5*42);
assert.equal(first.parts,0);
assert.equal(CW.all('laborEntries').length,0);
assert.equal(CW.all('activeTimers').length,0);
const part=CW.active('parts','PART-001'), before=part.quantity;
assert.equal(CW.moveStock({type:'Issue',partId:part.id,workOrderId:wo.id,quantity:2}).ok,true);
assert.equal(part.quantity,before-2);
close(CW.woPartsCost(wo),29);
part.unitCost=250;
close(CW.woPartsCost(wo),29); // historical issue price doesn't change
assert.equal(CW.moveStock({type:'Return',partId:part.id,workOrderId:wo.id,quantity:1}).ok,true);
close(CW.woPartsCost(wo),14.5);
assert.equal(part.quantity,before-1);
assert.equal(CW.moveStock({type:'Return',partId:part.id,workOrderId:wo.id,quantity:2}).ok,false);
assert.equal(CW.addTimeEntry('labor',wo.id,2,'USR-002','inspection').ok,true);
close(CW.woLaborHours(wo),3.5);
close(CW.woLaborCost(wo),63+80);
CW.find('team','USR-002').hourlyRate=120;
close(CW.woLaborCost(wo),143); // booked rate remains 40/hr
assert.equal(CW.addTimeEntry('downtime',wo.id,1.25,'USR-002').ok,true);
close(CW.woDowntimeHours(wo),6.25);
// Timers only book elapsed time on stop. They are stored while navigating.
const wo2=CW.active('workOrders','WO-1047');
const start=CW.startTimer('labor',wo2.id);
assert.equal(start.ok,true);
assert.equal(wo2.status,'In Progress');
assert.equal(CW.timerFor('labor',wo2.id,'USR-001')?.id,start.timer.id);
close(CW.woLaborHours(wo2),0);
start.timer.startedAt=new Date(Date.now()-3600000).toISOString();
const stop=CW.stopTimer('labor',wo2.id);
assert.equal(stop.ok,true);
close(stop.entry.hours,1,0.01);
close(stop.entry.hourlyRate,48);
assert.equal(CW.timerFor('labor',wo2.id,'USR-001'),undefined);
const downStart=CW.startTimer('downtime',wo2.id);
downStart.timer.startedAt=new Date(Date.now()-7200000).toISOString();
CW.completeWorkOrder(wo2);
assert.equal(wo2.status,'Completed');
assert.equal(CW.timerFor('downtime',wo2.id,'USR-001'),undefined);
close(CW.woDowntimeHours(wo2),2,0.01);
// PM closing from WO moves the recurrence and creates one history event
const pm=CW.active('pmTasks','PM-301');
const due=pm.nextDue;
const linked={id:'WO-9999',title:'[PM] test',assetId:pm.assetId,assigneeId:'USR-002',status:'In Progress',pmId:pm.id,pmDue:due,laborHours:0,downtimeHours:0,createdAt:CW.today()};
CW.db.workOrders.push(linked);
CW.completeWorkOrder(linked);
assert.notEqual(pm.nextDue,due);
assert.equal(CW.all('pmHistory').filter(x=>x.workOrderId===linked.id).length,1);
CW.completeWorkOrder(linked);
assert.equal(CW.all('pmHistory').filter(x=>x.workOrderId===linked.id).length,1);
const perf=CW.performance('all');
const totalByWO=CW.all('workOrders').reduce((s,x)=>s+CW.woCosts(x).total,0);
close(perf.maintenanceCost,totalByWO,0.03);
close(perf.maintenanceCost,perf.laborCost+perf.partsCost,0.03);
assert.ok(perf.downtimeHours>0);
const pRequest={id:'PR-900',partId:part.id,partNumber:part.number,description:'test',quantity:3,unitCost:55,status:'Received',receivedAt:CW.today()};
const beforeMaintenance=CW.performance('all').maintenanceCost;
CW.db.purchaseRequests.push(pRequest);
close(CW.performance('all').maintenanceCost,beforeMaintenance);
close(CW.performance('all').receivedPurchases,165);
// Operator may create tickets but may not alter stock or run timers.
CW.db.currentUserId='USR-004';
assert.equal(CW.can('ticket:create'),true);
assert.equal(CW.can('write'),false);
assert.equal(CW.moveStock({type:'Issue',partId:part.id,quantity:1,workOrderId:wo.id}).ok,false);
assert.equal(CW.startTimer('labor',wo.id).ok,false);
CW.db.currentUserId='USR-001';
CW.save();
// Reload a saved demo into a fresh sandbox to verify no new field disappears.
const fromDisk=JSON.parse(stored.get(CW.key));
assert.ok(fromDisk.laborEntries.length>=2);
assert.ok(fromDisk.downtimeEntries.length>=2);
assert.ok('legacyLaborRate' in fromDisk.workOrders[0]);

// Smoke-render Dashboard, Reports and Work Orders against simple fake DOM elements.
CW.money = n=>'$'+Number(n||0).toFixed(2);
CW.escape = s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
CW.statusBadge = s=>`<b>${CW.escape(s)}</b>`;
CW.badge=CW.statusBadge;
CW.date = s=>String(s||'').slice(0,10);
CW.time = s=>String(s||'');
CW.number = n=>String(n);
CW.metric=(name,v)=>`<section class="metric"><div class="metric-value">${v}</div><div>${name}</div></section>`;
CW.empty = s=>`<div>${s}</div>`;
CW.deleteButton=()=>'';
CW.options = arr=>arr.map(x=>`<option>${x.name}</option>`).join('');
CW.setVisible=()=>{};
CW.exportCSV=()=>{};
const elements=new Map(), handlers=[];
function el(id){if(!elements.has(id)) elements.set(id,{innerHTML:'',value:id.includes('period')?'30':'',selectedOptions:[{textContent:'Last 30 days'}],textContent:'',hidden:false});return elements.get(id);}
sandbox.document={getElementById:el,addEventListener:(type,fn)=>{if(type==='DOMContentLoaded') handlers.push(fn);},querySelectorAll:()=>[]};
for(const script of ['js/pages/dashboard.js','js/pages/reports.js','js/pages/work-orders.js','js/pages/assets.js','js/pages/maintenance.js','js/pages/inventory.js','js/pages/purchasing.js','js/pages/team.js','js/pages/calendar.js','js/pages/settings.js']){
  handlers.length=0;
  load(script);
  assert.equal(handlers.length,1);
  handlers.pop()();
}
assert.match(el('dashboard-financial').innerHTML,/Maintenance Cost/);
assert.match(el('dashboard-cost-events').innerHTML,/WO-1045/);
assert.match(el('report-order-costs').innerHTML,/WO-1045/);
assert.match(el('order-table').innerHTML,/\$14\.50/);
assert.match(el('order-table').innerHTML,/data-time=/);
console.log('PASS: costs, stock snapshots, returns, labor entries, timers, PM, permissions, purchasing, persistence and render smoke checks');
