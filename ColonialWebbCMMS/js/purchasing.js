/* Purchasing: simple request → ordered → received workflow. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);
  const stages = ['Requested', 'Ordered', 'Received', 'Cancelled'];

  function render() {
    const requests = CW.db.purchaseRequests;
    $('purchase-metrics').innerHTML =
      CW.metric('Requests', requests.length, 'All recorded requests', '◈') +
      CW.metric('Requested', requests.filter(r => r.status === 'Requested').length, 'Awaiting purchase', '▤', 'amber') +
      CW.metric('Ordered', requests.filter(r => r.status === 'Ordered').length, 'Awaiting delivery', '◷') +
      CW.metric('Estimated Open Cost', CW.money(requests.filter(r => !['Received', 'Cancelled'].includes(r.status)).reduce((sum, r) => sum + r.quantity * r.unitCost, 0)), 'Based on entered unit costs', '$', 'green');
    $('purchase-table').innerHTML = requests.map(request => `<tr>
      <td class="cell-id">${CW.escape(request.id)}</td><td>${CW.escape(request.partNumber)}</td>
      <td class="cell-title">${CW.escape(request.description)}</td><td>${CW.number(request.quantity)}</td>
      <td>${CW.money(request.quantity * request.unitCost)}</td><td>${CW.escape(request.supplier)}</td>
      <td>${CW.escape(request.requestedBy)}</td><td>${CW.statusBadge(request.status)}</td>
      <td><button class="button-link" data-purchase="${CW.escape(request.id)}">View / Update</button></td>
    </tr>`).join('') || '<tr><td colspan="9">No purchase requests yet.</td></tr>';
  }

  function openForm(id) {
    const existing = id ? CW.find('purchaseRequests', id) : null;
    const req = existing || { partId: CW.db.parts[0]?.id || '', description: '', quantity: 1, unitCost: 0, supplier: '', status: 'Requested' };
    const partOptions = CW.db.parts.map(p => ({ id: p.id, name: p.number + ' — ' + p.name + ' (Locker ' + p.locker + ', Bin ' + p.bin + ')' }));
    CW.modal(existing ? 'Purchase Request ' + req.id : 'Create Purchase Request',
      CW.select('Part / Receiving Location *', 'partId', CW.options(partOptions, req.partId, 'id', 'name')) +
      CW.field('Description *', 'description', req.description, 'text', 'required') +
      CW.field('Quantity *', 'quantity', req.quantity, 'number', 'min="1" required step="1"') +
      CW.field('Estimated Unit Cost ($)', 'unitCost', req.unitCost, 'number', 'min="0" step="0.01"') +
      CW.field('Supplier', 'supplier', req.supplier) +
      CW.select('Status', 'status', CW.choice(stages, req.status)) +
      '<div class="full note-box">Receiving a purchase automatically adds units to the selected locker/bin. Once received, this request cannot be edited again.</div>',
      data => {
        const linkedPart = CW.find('parts', data.partId);
        const qty = Number(data.quantity), cost = Number(data.unitCost);
        if (!linkedPart || !data.description.trim() || !Number.isInteger(qty) || qty < 1 || !Number.isFinite(cost) || cost < 0) {
          CW.toast('Select an inventory location and enter valid amounts.', 'danger'); return false;
        }
        if (existing && ['Received', 'Cancelled'].includes(existing.status)) {
          CW.toast('This request is already closed.', 'danger'); return false;
        }
        const record = Object.assign(existing || {}, {
          partId: data.partId, partNumber: linkedPart.number, description: data.description.trim(), quantity: qty,
          unitCost: cost, supplier: data.supplier.trim(), status: data.status
        });
        if (!existing) {
          record.id = CW.nextId(CW.db.purchaseRequests, 'PR', 100);
          record.requestedAt = CW.today();
          record.requestedBy = CW.currentUser().name;
          record.receivedAt = '';
          CW.db.purchaseRequests.unshift(record);
        }
        if (data.status === 'Received') {
          linkedPart.quantity = Number(linkedPart.quantity) + qty;
          record.receivedAt = CW.today();
          CW.db.transactions.unshift({ id: CW.nextId(CW.db.transactions, 'TX'), date: CW.isoNow(), type: 'Receive',
            partId: linkedPart.id, partNumber: linkedPart.number, quantity: qty,
            from: record.supplier || 'Supplier', to: linkedPart.locker + ' / ' + linkedPart.bin,
            technician: CW.currentUser().name, workOrderId: '', note: 'Purchase request ' + record.id });
        }
        CW.log('Purchase request ' + record.id + ' set to ' + record.status + ' by ' + CW.currentUser().name);
        render(); CW.toast('Purchase request saved.');
      }, existing ? 'Update Request' : 'Create Request');
  }

  $('new-request').onclick = () => openForm();
  $('purchase-table').onclick = event => {
    const button = event.target.closest('[data-purchase]');
    if (!button) return;
    const request = CW.find('purchaseRequests', button.dataset.purchase);
    if (['Received', 'Cancelled'].includes(request.status)) {
      CW.toast('This request is closed; its history is kept.');
      return;
    }
    openForm(request.id);
  };
  render();
});
