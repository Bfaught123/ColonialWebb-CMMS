/* Work orders: Operator submits tickets; Maintenance edits and issues parts; Admin can also delete. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);
  const statuses = ['Open', 'In Progress', 'On Hold', 'Completed'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const canEdit = () => CW.can('write');

  function render() {
    const items = CW.records('workOrders');
    $('workorder-metrics').innerHTML =
      CW.metric('Total Work Orders', items.length, 'All active orders', '▤') +
      CW.metric('Open', items.filter(x => x.status === 'Open').length, 'Not yet started', '○') +
      CW.metric('In Progress', items.filter(x => x.status === 'In Progress').length, 'Being worked', '◷', 'amber') +
      CW.metric('Completed', items.filter(x => x.status === 'Completed').length, 'Closed repairs', '✓', 'green');
    const query = $('order-search').value.trim().toLowerCase();
    const status = $('order-status').value;
    const priority = $('order-priority').value;
    const rows = items.filter(order =>
      (!status || order.status === status) && (!priority || order.priority === priority) &&
      [order.id, order.title, CW.assetName(order.assetId), CW.nameFor(order.assigneeId)].join(' ').toLowerCase().includes(query)
    );
    $('order-count').textContent = rows.length + ' of ' + items.length + ' work orders';
    $('order-table').innerHTML = rows.map(order => `<tr>
      <td class="cell-id">${CW.escape(order.id)}</td><td class="cell-title">${CW.escape(order.title)}</td>
      <td>${CW.escape(CW.assetName(order.assetId))}</td><td>${CW.statusBadge(order.priority)}</td>
      <td>${CW.escape(CW.nameFor(order.assigneeId))}</td><td>${CW.date(order.dueDate)}</td>
      <td>${CW.statusBadge(order.status)}</td>
      <td>${CW.woCosts(order).laborHours.toFixed(2)} hr</td><td>${CW.money(CW.woCosts(order).parts)}</td>
      <td><strong>${CW.money(CW.woCosts(order).total)}</strong></td>
      <td><div class="action-buttons">
        <button class="button-link" data-edit="${CW.escape(order.id)}">${canEdit() ? 'View / Edit' : 'View'}</button>
        ${canEdit() ? `<button class="button button-small button-outline" data-parts="${CW.escape(order.id)}">Parts</button>
        <button class="button button-small button-outline" data-time="${CW.escape(order.id)}">Time</button>` : ''}
        ${CW.deleteButton('workOrders', order.id)}
      </div></td>
    </tr>`).join('') || '<tr><td colspan="11">No work orders match your search.</td></tr>';
    $('new-workorder').textContent = CW.role() === 'Operator' ? '＋ Submit Ticket' : '＋ New Work Order';
  }

  function openForm(id) {
    const existing = id ? CW.active('workOrders', id) : null;
    if (id && !existing) return;
    if (!existing && !CW.require('ticket:create')) return;
    const readonly = Boolean(existing && !canEdit());
    const operatorNew = !existing && !canEdit();
    const order = existing || { title: '', assetId: '', priority: 'Medium', assigneeId: '', status: 'Open', dueDate: '', description: '', laborHours: 0, downtimeHours: 0 };
    const used = existing ? CW.woParts(existing.id).filter(part => part.used || part.issued || part.returned) : [];
    const costs = existing ? CW.woCosts(existing) : null;
    const timeInfo = existing ? `<div class="full workorder-parts"><h3>Automatically Calculated Work Order Totals</h3>
      <div class="kpi-inline"><span>Labor ${costs.laborHours.toFixed(2)} hr · ${CW.money(costs.labor)}</span><span>Downtime ${costs.downtimeHours.toFixed(2)} hr</span>
      <span>Parts ${CW.money(costs.parts)}</span><strong>Total ${CW.money(costs.total)}</strong></div>
      ${canEdit() ? `<button type="button" class="button button-small button-outline" id="manage-workorder-time">Track / Log Time</button>` : ''}
      </div>` : '';
    const partsInfo = existing ? `<div class="full workorder-parts"><h3>Parts Used — Live Inventory Link</h3>
       ${used.length ? '<ul>' + used.map(x => `<li>${CW.escape(x.number)}: issued ${x.issued}, returned ${x.returned}, net used <strong>${x.used}</strong></li>`).join('') + '</ul>' : '<p>No parts issued against this work order.</p>'}
       ${canEdit() ? `<button type="button" class="button button-small button-outline" id="manage-workorder-parts">Issue / Return Parts</button>` : ''}</div>` : '';
    const fields =
      CW.field('Work Order Description *', 'title', order.title, 'text', 'required maxlength="140"') +
      CW.select('Equipment / Asset', 'assetId', CW.assetOptions(order.assetId)) +
      CW.select('Priority', 'priority', CW.choice(priorities, order.priority)) +
      (!operatorNew ? CW.select('Status', 'status', CW.choice(statuses, order.status)) +
        CW.select('Assigned Technician', 'assigneeId', CW.userOptions(order.assigneeId)) +
        CW.field('Due Date', 'dueDate', order.dueDate, 'date') +
        CW.field('Untracked Labor Hours (manual)', 'laborHours', order.laborHours, 'number', 'min="0" step="0.01"') +
        CW.field('Untracked Downtime Hours (manual)', 'downtimeHours', order.downtimeHours, 'number', 'min="0" step="0.01"') :
        '<div class="full note-box">New operator tickets start Open and Unassigned. Maintenance will set the status, technician, time and completion details.</div>') +
      '<div class="full">' + CW.field('Repair Notes / Description', 'description', order.description, 'textarea') + '</div>' +
      (operatorNew ? '' : '<div class="full note-box">Time recorded using a timer or the Time button is added automatically. Do not enter those same hours in the manual fields.</div>') + timeInfo + partsInfo;
    CW.modal(existing ? (readonly ? 'View ' : 'Edit ') + existing.id : operatorNew ? 'Submit Maintenance Ticket' : 'Create Work Order',
      fields,
      data => {
        if (existing && !CW.require('write')) return false;
        if (!data.title?.trim()) { CW.toast('Enter a description.', 'danger'); return false; }
        const prev = existing?.status;
        const oldManualLabor = existing ? Number(existing.laborHours || 0) : null;
        const oldManualDowntime = existing ? Number(existing.downtimeHours || 0) : null;
        if (!operatorNew && (Number(data.laborHours) < 0 || Number(data.downtimeHours) < 0)) {
          CW.toast('Hours cannot be negative.', 'danger'); return false;
        }
        const values = operatorNew ? {
          title: data.title.trim(), assetId: data.assetId, priority: data.priority,
          description: data.description || '', status: 'Open', assigneeId: '', dueDate: '', laborHours: 0, downtimeHours: 0
        } : {
          ...data, title: data.title.trim(), laborHours: Number(data.laborHours || 0), downtimeHours: Number(data.downtimeHours || 0)
        };
        const updated = Object.assign(existing || {}, values);
        if (!operatorNew) {
          if (!existing || oldManualLabor !== Number(data.laborHours || 0)) {
            updated.legacyLaborRate = CW.rateFor(data.assigneeId || CW.currentUser().id);
            updated.manualHoursAt = CW.isoNow();
          }
          if (!existing || oldManualDowntime !== Number(data.downtimeHours || 0)) updated.manualDowntimeAt = CW.isoNow();
        }
        updated.updatedAt = CW.isoNow();
        if (!existing) {
          updated.id = CW.nextId(CW.db.workOrders, 'WO', 1048);
          updated.createdAt = CW.today();
          updated.createdBy = CW.currentUser().id;
          updated.completedAt = updated.status === 'Completed' ? CW.today() : '';
          CW.db.workOrders.unshift(updated);
        }
        if (updated.status === 'In Progress' && !updated.startedAt) updated.startedAt = CW.isoNow();
        if (updated.status === 'Completed' && prev !== 'Completed') CW.completeWorkOrder(updated);
        else if (updated.status !== 'Completed' && prev === 'Completed') { updated.completedAt = ''; updated.completedTimestamp = ''; }
        CW.log((existing ? 'Updated ' : operatorNew ? 'Submitted ticket ' : 'Created ') + updated.id + ' — ' + updated.title + ' by ' + CW.currentUser().name);
        render(); CW.toast(operatorNew ? 'Maintenance ticket submitted.' : 'Work order saved.');
      }, operatorNew ? 'Submit Ticket' : existing ? 'Save Work Order' : 'Create Work Order', { readOnly: readonly });
    if (existing && canEdit()) {
      const openPartsButton = document.getElementById('manage-workorder-parts');
      if (openPartsButton) openPartsButton.onclick = () => openParts(existing.id);
      const openTimeButton = document.getElementById('manage-workorder-time');
      if (openTimeButton) openTimeButton.onclick = () => openTime(existing.id);
    }
  }

  function openTime(id) {
    if (!CW.require('write')) return;
    const order = CW.active('workOrders',id);
    if (!order) return;
    const userId = CW.currentUser().id;
    const active = type => CW.timerFor(type,id,userId);
    const showTimer = type => {
      const timer = active(type);
      return `<div class="timer-action"><div><strong>${type === 'labor' ? 'Labor' : 'Equipment Downtime'}</strong>
        <div class="tiny text-muted">${timer ? 'Started '+CW.time(timer.startedAt) : 'Not running'}</div></div>
        <button type="button" id="timer-${type}" class="button button-small ${timer ? 'button-outline' : 'button-primary'}">${timer ? 'Stop Timer' : 'Start Timer'}</button></div>`;
    };
    const logged = CW.all('laborEntries').filter(e => e.workOrderId === id).length;
    const down = CW.all('downtimeEntries').filter(e => e.workOrderId === id).length;
    CW.modal('Time & Downtime — '+id,
      '<div class="full note-box">Use start/stop to collect actual elapsed time. Timers remain active when you navigate to another page. Manually log work completed earlier below. Labor uses the technician rate saved at the time of entry.</div>'+
      '<div class="full">'+showTimer('labor')+showTimer('downtime')+'</div>'+
      '<div class="full tiny text-muted">Recorded: '+logged+' labor entries; '+down+' downtime entries.</div>'+
      CW.select('Manual Entry Type','type',CW.choice(['labor','downtime'],'labor'))+
      CW.field('Hours to add','hours','0.5','number','required min="0.001" max="10000" step="0.001"')+
      CW.select('Employee','userId',CW.options(CW.records('team').filter(x => x.active && x.role !== 'Operator'),userId))+
      '<div class="full">'+CW.field('Description / Notes','note','','textarea')+'</div>',
      data => {
        const result = CW.addTimeEntry(data.type,id,Number(data.hours),data.userId,data.note);
        if (!result.ok) { CW.toast(result.error || 'Unable to log time.','danger'); return false; }
        render(); CW.toast('Time entry saved. Dashboard totals updated.');
      },'Add Manual Time');
    for(const type of ['labor','downtime']) {
      document.getElementById('timer-'+type).onclick = () => {
        const result = active(type) ? CW.stopTimer(type,id) : CW.startTimer(type,id);
        if (!result.ok) { CW.toast(result.error || 'Timer not updated.','danger'); return; }
        render(); openTime(id);
        CW.toast(type === 'labor' ? 'Labor timer updated.' : 'Downtime timer updated.');
      };
    }
  }

  function openParts(id) {
    if (!CW.require('write')) return;
    const order = CW.active('workOrders', id);
    if (!order) return;
    const parts = CW.records('parts');
    if (!parts.length) { CW.toast('Create inventory parts before issuing them.', 'danger'); return; }
    const used = CW.woParts(id).filter(row => row.used !== 0);
    const summary = used.length ? '<ul>' + used.map(x => '<li>' + CW.escape(x.number) + ': ' + x.used + ' net used</li>').join('') + '</ul>' : '<p>No parts currently issued.</p>';
    const options = parts.map(p => ({ id: p.id, name: p.number + ' — ' + p.name + ' · Locker ' + p.locker + ', Bin ' + p.bin + ' · Available ' + p.quantity }));
    CW.modal('Work Order Parts — ' + id,
      '<div class="full workorder-parts"><h3>' + CW.escape(order.title) + '</h3>' + summary + '</div>' +
      CW.select('Action', 'type', CW.choice(['Issue', 'Return'], 'Issue')) +
      CW.select('Part / Location', 'partId', CW.options(options)) +
      CW.field('Quantity', 'quantity', 1, 'number', 'required min="1" step="1"') +
      '<div class="full">' + CW.field('Notes', 'note', '', 'textarea') + '</div>' +
      '<div class="full note-box">Issuing parts immediately deducts them from inventory. Returning parts restores stock. Completing the work order does not deduct them again.</div>',
      data => {
        const result = CW.moveStock({ type: data.type, partId: data.partId, quantity: data.quantity, workOrderId: id, note: data.note });
        if (!result.ok) { if (result.error) CW.toast(result.error, 'danger'); return false; }
        render(); CW.toast(data.type + ' recorded for ' + id + '.');
      }, 'Save Part Movement');
  }

  $('new-workorder').onclick = () => openForm();
  $('order-search').oninput = render;
  $('order-status').onchange = render;
  $('order-priority').onchange = render;
  $('order-table').onclick = event => {
    const del = event.target.closest('[data-delete]');
    const parts = event.target.closest('[data-parts]');
    const time = event.target.closest('[data-time]');
    const edit = event.target.closest('[data-edit]');
    if (del && CW.deleteRecord('workOrders', del.dataset.delete)) render();
    else if (parts) openParts(parts.dataset.parts);
    else if (time) openTime(time.dataset.time);
    else if (edit) openForm(edit.dataset.edit);
  };
  $('export-workorders').onclick = () => CW.exportCSV('work-orders.csv',
    ['ID', 'Description', 'Asset', 'Priority', 'Status', 'Technician', 'Due', 'Labor Hours', 'Downtime Hours', 'Labor Cost', 'Parts Cost', 'Total Cost', 'Notes'],
    CW.records('workOrders').map(o => [o.id, o.title, CW.assetName(o.assetId), o.priority, o.status, CW.nameFor(o.assigneeId), o.dueDate, CW.woCosts(o).laborHours, CW.woCosts(o).downtimeHours, CW.woCosts(o).labor, CW.woCosts(o).parts, CW.woCosts(o).total, o.description]));
  const params = new URLSearchParams(location.search);
  if (params.has('asset')) $('order-search').value = CW.assetName(params.get('asset'));
  render();
  if (params.get('new') === '1') openForm();
  if (params.has('order') && CW.active('workOrders', params.get('order'))) openForm(params.get('order'));
});
