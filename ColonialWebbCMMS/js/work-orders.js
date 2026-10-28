/* Work Orders: create, search, edit, close, and track labor and downtime. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);
  const statuses = ['Open', 'In Progress', 'On Hold', 'Completed'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  function metrics() {
    const items = CW.db.workOrders;
    $('workorder-metrics').innerHTML =
      CW.metric('Total Work Orders', items.length, 'All recorded orders', '▤') +
      CW.metric('Open', items.filter(x => x.status === 'Open').length, 'Not yet started', '○') +
      CW.metric('In Progress', items.filter(x => x.status === 'In Progress').length, 'Being worked', '◷', 'amber') +
      CW.metric('Completed', items.filter(x => x.status === 'Completed').length, 'Closed repairs', '✓', 'green');
  }

  function render() {
    metrics();
    const query = $('order-search').value.trim().toLowerCase();
    const status = $('order-status').value;
    const priority = $('order-priority').value;
    const rows = CW.db.workOrders.filter(order =>
      (!status || order.status === status) && (!priority || order.priority === priority) &&
      [order.id, order.title, CW.assetName(order.assetId), CW.nameFor(order.assigneeId)].join(' ').toLowerCase().includes(query)
    );
    $('order-count').textContent = rows.length + ' of ' + CW.db.workOrders.length + ' work orders';
    $('order-table').innerHTML = rows.map(order => `<tr>
      <td class="cell-id">${CW.escape(order.id)}</td><td class="cell-title">${CW.escape(order.title)}</td>
      <td>${CW.escape(CW.assetName(order.assetId))}</td><td>${CW.statusBadge(order.priority)}</td>
      <td>${CW.escape(CW.nameFor(order.assigneeId))}</td><td>${CW.date(order.dueDate)}</td>
      <td>${CW.statusBadge(order.status)}</td><td><button class="button-link" data-edit="${CW.escape(order.id)}">View / Edit</button></td>
    </tr>`).join('') || '<tr><td colspan="8">No work orders match your search.</td></tr>';
  }

  function openForm(id) {
    const existing = id ? CW.find('workOrders', id) : null;
    const order = existing || { title: '', assetId: '', priority: 'Medium', assigneeId: '', status: 'Open', dueDate: '', description: '', laborHours: 0, downtimeHours: 0 };
    const used = existing ? CW.db.transactions.filter(tx => tx.type === 'Issue' && tx.workOrderId === existing.id) : [];
    const partsInfo = existing ? '<div class="full note-box"><strong>Parts used:</strong> ' + (used.length ? used.map(tx => CW.escape(tx.partNumber) + ' × ' + tx.quantity).join(', ') : 'None yet. Issue parts from the Inventory tab and enter this work order number.') + '</div>' : '';
    CW.modal(existing ? 'Edit ' + existing.id : 'Create Work Order',
      CW.field('Work Order Description *', 'title', order.title, 'text', 'required maxlength="140"') +
      CW.select('Equipment / Asset', 'assetId', CW.assetOptions(order.assetId)) +
      CW.select('Priority', 'priority', CW.choice(priorities, order.priority)) +
      CW.select('Status', 'status', CW.choice(statuses, order.status)) +
      CW.select('Assigned Technician', 'assigneeId', CW.userOptions(order.assigneeId)) +
      CW.field('Due Date', 'dueDate', order.dueDate, 'date') +
      CW.field('Labor Hours', 'laborHours', order.laborHours, 'number', 'min="0" step="0.1"') +
      CW.field('Downtime Hours', 'downtimeHours', order.downtimeHours, 'number', 'min="0" step="0.1"') +
      '<div class="full">' + CW.field('Repair Notes / Description', 'description', order.description, 'textarea') + '</div>' + partsInfo,
      data => {
        if (!data.title.trim()) { CW.toast('Enter a description.', 'danger'); return false; }
        if (Number(data.laborHours) < 0 || Number(data.downtimeHours) < 0) { CW.toast('Hours cannot be negative.', 'danger'); return false; }
        const previous = existing ? existing.status : '';
        const edited = Object.assign(existing || {}, data, {
          title: data.title.trim(), laborHours: Number(data.laborHours || 0), downtimeHours: Number(data.downtimeHours || 0)
        });
        if (!existing) {
          edited.id = CW.nextId(CW.db.workOrders, 'WO', 1048);
          edited.createdAt = CW.today();
          edited.completedAt = data.status === 'Completed' ? CW.today() : '';
          CW.db.workOrders.unshift(edited);
        } else if (edited.status !== previous) {
          edited.completedAt = edited.status === 'Completed' ? CW.today() : '';
        }
        CW.log((existing ? 'Updated ' : 'Created ') + edited.id + ' — ' + edited.title + ' by ' + CW.currentUser().name);
        render(); CW.toast('Work order saved.');
      }, existing ? 'Save Work Order' : 'Create Work Order');
  }

  $('new-workorder').onclick = () => openForm();
  $('order-search').oninput = render;
  $('order-status').onchange = render;
  $('order-priority').onchange = render;
  $('order-table').onclick = event => { const button = event.target.closest('[data-edit]'); if (button) openForm(button.dataset.edit); };
  $('export-workorders').onclick = () => CW.exportCSV('work-orders.csv',
    ['ID', 'Description', 'Asset', 'Priority', 'Status', 'Technician', 'Due', 'Labor Hours', 'Downtime Hours', 'Notes'],
    CW.db.workOrders.map(o => [o.id, o.title, CW.assetName(o.assetId), o.priority, o.status, CW.nameFor(o.assigneeId), o.dueDate, o.laborHours, o.downtimeHours, o.description]));
  const params = new URLSearchParams(location.search);
  if (params.has('asset')) $('order-search').value = CW.assetName(params.get('asset'));
  render();
  if (params.get('new') === '1') openForm();
  if (params.has('order') && CW.find('workOrders', params.get('order'))) openForm(params.get('order'));
});
