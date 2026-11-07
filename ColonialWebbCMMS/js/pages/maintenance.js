/* PM Schedules: create/edit, record completions, roll next due forward. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);
  const dateOffset = days => { const d = new Date(); d.setDate(d.getDate() + days); return CW.ymd(d); };

  function category(pm) {
    if (pm.nextDue < CW.today()) return 'overdue';
    if (pm.nextDue <= dateOffset(7)) return 'soon';
    return 'later';
  }
  function render() {
    const query = $('pm-search').value.toLowerCase();
    const selected = $('pm-filter').value;
    const all = CW.records('pmTasks');
    $('pm-metrics').innerHTML =
      CW.metric('Active PM Schedules', all.length, 'Recurring PMs', '◷') +
      CW.metric('Overdue PMs', all.filter(pm => category(pm) === 'overdue').length, 'Past their due date', '!', 'red') +
      CW.metric('Due Within 7 Days', all.filter(pm => category(pm) === 'soon').length, 'Includes due today', '▣', 'amber') +
      CW.metric('Total Completions', CW.db.pmHistory.length, 'Logged PM confirmations', '✓', 'green');
    const rows = [...all].filter(pm => (!selected || category(pm) === selected) &&
      [pm.id, pm.title, CW.assetName(pm.assetId)].join(' ').toLowerCase().includes(query)).sort((a, b) => a.nextDue.localeCompare(b.nextDue));
    $('pm-table').innerHTML = rows.map(pm => `<tr>
      <td class="cell-id">${CW.escape(pm.id)}</td><td class="cell-title">${CW.escape(pm.title)}</td><td>${CW.escape(CW.assetName(pm.assetId))}</td>
      <td>${pm.intervalDays} days</td><td>${CW.escape(CW.nameFor(pm.assigneeId))}</td><td>${CW.date(pm.nextDue)}</td>
      <td>${category(pm) === 'overdue' ? CW.badge('Overdue', 'red') : category(pm) === 'soon' ? CW.badge('Due Soon', 'amber') : CW.badge('Scheduled', 'green')}</td>
      <td>${CW.money(CW.all('workOrders').filter(wo => wo.pmId === pm.id).reduce((sum,wo)=>sum + CW.woCosts(wo).total,0))}</td>
      <td class="cell-nowrap"><div class="action-buttons"><button class="button button-small button-outline" data-edit="${CW.escape(pm.id)}">${CW.can('write') ? 'Edit' : 'View'}</button>
      ${CW.can('write') ? `<button class="button button-small button-primary" data-complete="${CW.escape(pm.id)}">Complete</button>
      <button class="button button-small button-outline" data-generate="${CW.escape(pm.id)}">Create WO</button>` : ''}${CW.deleteButton('pmTasks', pm.id)}</div></td>
    </tr>`).join('') || '<tr><td colspan="9">No schedules match your filters.</td></tr>';
    $('pm-history').innerHTML = CW.db.pmHistory.slice(0, 30).map(h => `<tr><td>${CW.time(h.completedAt)}</td><td class="cell-id">${CW.escape(h.pmId)}</td>
      <td>${CW.escape(CW.assetName(h.assetId))}</td><td>${CW.escape(h.technician)}</td><td>${CW.escape(h.notes || '—')}</td></tr>`).join('') || '<tr><td colspan="5">No completed PMs recorded yet.</td></tr>';
  }
  function openForm(id) {
    if (!id && !CW.require('write')) return;
    const existing = id ? CW.active('pmTasks', id) : null;
    if (id && !existing) return;
    const pm = existing || { title: '', assetId: '', assigneeId: '', intervalDays: 30, nextDue: CW.today(), instructions: '' };
    CW.modal(existing ? 'Edit ' + id : 'Create PM Schedule',
      CW.field('Task Name *', 'title', pm.title, 'text', 'required maxlength="140"') +
      CW.select('Asset', 'assetId', CW.assetOptions(pm.assetId)) +
      CW.select('Assigned Technician', 'assigneeId', CW.userOptions(pm.assigneeId)) +
      CW.field('Repeat Every (days) *', 'intervalDays', pm.intervalDays, 'number', 'required min="1" step="1"') +
      CW.field('Next Due Date *', 'nextDue', pm.nextDue, 'date', 'required') +
      '<div class="full">' + CW.field('Checklist / Instructions', 'instructions', pm.instructions, 'textarea') + '</div>',
      data => {
        if (!CW.require('write')) return false;
        if (!data.title.trim() || !(Number(data.intervalDays) >= 1)) { CW.toast('Enter a name and valid interval.', 'danger'); return false; }
        const record = Object.assign(existing || {}, data, { title: data.title.trim(), intervalDays: Math.floor(Number(data.intervalDays)) });
        if (!existing) { record.id = CW.nextId(CW.db.pmTasks, 'PM'); record.lastDone = ''; CW.db.pmTasks.unshift(record); }
        CW.log((existing ? 'Updated PM ' : 'Created PM ') + record.id); render(); CW.toast('PM schedule saved.');
      }, 'Save PM Schedule', { readOnly: !CW.can('write') });
  }
  function complete(id) {
    if (!CW.require('write')) return;
    const pm = CW.active('pmTasks', id);
    if (!pm) return;
    CW.modal('Complete ' + id, '<div class="full note-box"><strong>' + CW.escape(pm.title) + '</strong><br>' + CW.escape(pm.instructions || 'No checklist provided.') + '</div>' +
      '<div class="full">' + CW.field('Completion Notes', 'notes', '', 'textarea') + '</div>',
      data => {
        const oldDue = pm.nextDue;
        const now = new Date(CW.today() + 'T12:00:00');
        const next = new Date(pm.nextDue + 'T12:00:00');
        do { next.setDate(next.getDate() + Number(pm.intervalDays)); } while (next <= now);
        pm.lastDone = CW.today(); pm.nextDue = CW.ymd(next);
        // Completing a PM from the schedule also closes its linked, still-open WO.
        // The WO is the financial source of truth for labor/parts used.
        const linked = CW.records('workOrders').find(o => o.pmId === pm.id && o.pmDue === oldDue && o.status !== 'Completed');
        if (linked) CW.completeWorkOrder(linked);
        if (!linked) CW.db.pmHistory.unshift({ id: CW.nextId(CW.db.pmHistory, 'PMH'), pmId: id, assetId: pm.assetId, technician: CW.currentUser().name,
          notes: data.notes.trim(), completedAt: CW.isoNow(), previousDue: oldDue, workOrderId: linked?.id || '' });
        CW.log('Completed ' + id + ' by ' + CW.currentUser().name);
        render(); CW.toast('PM completed; next due date moved to ' + CW.date(pm.nextDue));
      }, 'Mark Complete');
  }
  function generateWorkOrder(id) {
    if (!CW.require('write')) return;
    const pm = CW.active('pmTasks', id);
    if (!pm) return;
    const duplicate = CW.all('workOrders').find(wo => wo.pmId === pm.id && wo.pmDue === pm.nextDue);
    if (duplicate) { CW.toast('This PM already has an open work order: ' + duplicate.id, 'danger'); return; }
    const wo = { id: CW.nextId(CW.db.workOrders, 'WO', 1048), title: '[PM] ' + pm.title,
      assetId: pm.assetId, priority: 'Medium', status: 'Open', assigneeId: pm.assigneeId,
      dueDate: pm.nextDue, description: pm.instructions, laborHours: 0, downtimeHours: 0,
      createdAt: CW.today(), completedAt: '', createdBy: CW.currentUser().id, pmId: pm.id, pmDue: pm.nextDue };
    CW.db.workOrders.unshift(wo);
    CW.log('Generated ' + wo.id + ' from ' + pm.id);
    CW.toast('Created work order ' + wo.id + '.');
    render();
  }
  CW.setVisible('generate-due-pms', 'write');
  $('generate-due-pms').onclick = () => {
    if (!CW.require('write')) return;
    const today = CW.today();
    const due = CW.records('pmTasks').filter(pm => pm.nextDue <= today &&
      !CW.all('workOrders').some(wo => wo.pmId === pm.id && wo.pmDue === pm.nextDue));
    if (!due.length) { CW.toast('No due PMs need a new work order.'); return; }
    due.forEach(pm => generateWorkOrder(pm.id));
    CW.toast('Generated ' + due.length + ' due PM work orders.');
  };
  CW.setVisible('new-pm', 'write');
  $('new-pm').onclick = () => openForm();
  $('pm-search').oninput = render;
  $('pm-filter').onchange = render;
  $('pm-table').onclick = event => {
    const edit = event.target.closest('[data-edit]');
    const done = event.target.closest('[data-complete]');
    const del = event.target.closest('[data-delete]');
    const create = event.target.closest('[data-generate]');
    if (del && CW.deleteRecord('pmTasks', del.dataset.delete)) render();
    else if (edit) openForm(edit.dataset.edit);
    else if (done) complete(done.dataset.complete);
    else if (create) generateWorkOrder(create.dataset.generate);
  };
  render();
});
