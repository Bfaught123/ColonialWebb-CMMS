/* Purchasing: simple request → ordered → received workflow. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);
  const stages = ['Requested', 'Ordered', 'Received', 'Cancelled'];

  function render() {
    const requests = CW.records('purchaseRequests');
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
      <td><div class="action-buttons"><button class="button-link" data-purchase="${CW.escape(request.id)}">${CW.can('write') ? 'View / Update' : 'View'}</button>${CW.deleteButton('purchaseRequests',request.id)}</div></td>
    </tr>`).join('') || '<tr><td colspan="9">No purchase requests yet.</td></tr>';
  }

  function openForm(id) {
    if (!id && !CW.require('write')) return;
    const existing = id ? CW.active('purchaseRequests', id) : null;
    if (id && !existing) return;
    const req = existing || { partId: CW.records('parts')[0]?.id || '', description: '', quantity: 1, unitCost: 0, supplier: '', status: 'Requested' };
    const partOptions = CW.records('parts').map(p => ({ id: p.id, name: p.number + ' — ' + p.name + ' (Locker ' + p.locker + ', Bin ' + p.bin + ')' }));
    CW.modal(existing ? 'Purchase Request ' + req.id : 'Create Purchase Request',
      CW.select('Part / Receiving Location *', 'partId', CW.options(partOptions, req.partId, 'id', 'name')) +
      CW.field('Description *', 'description', req.description, 'text', 'required') +
      CW.field('Quantity *', 'quantity', req.quantity, 'number', 'min="1" required step="1"') +
      CW.field('Estimated Unit Cost ($)', 'unitCost', req.unitCost, 'number', 'min="0" step="0.01"') +
      CW.field('Supplier', 'supplier', req.supplier) +
      CW.select('Status', 'status', CW.choice(stages, req.status)) +
      '<div class="full note-box">Receiving a purchase automatically adds units to the selected locker/bin. Once received, this request cannot be edited again.</div>',
      data => {
        if (!CW.require('write')) return false;
        const linkedPart = CW.active('parts', data.partId);
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
          const tx = CW.moveStock({ type: 'Receive', partId: linkedPart.id, quantity: qty, note: 'Purchase request ' + record.id });
          if (!tx.ok) { CW.toast(tx.error || 'Receiving failed.', 'danger'); return false; }
          record.receivedAt = CW.today();
          // New receipts refresh the estimated replacement value of remaining stock.
          // Previous work-order issue transactions keep their own cost snapshot.
          linkedPart.unitCost = cost;
        }
        CW.log('Purchase request ' + record.id + ' set to ' + record.status + ' by ' + CW.currentUser().name);
        render(); CW.toast('Purchase request saved.');
      }, existing ? 'Update Request' : 'Create Request', { readOnly: !CW.can('write') || (existing && ['Received','Cancelled'].includes(existing.status)) });
  }

  CW.setVisible('new-request', 'write');
  $('new-request').onclick = () => openForm();
  $('purchase-table').onclick = event => {
    const del = event.target.closest('[data-delete]');
    if (del) { if (CW.deleteRecord('purchaseRequests', del.dataset.delete)) render(); return; }
    const button = event.target.closest('[data-purchase]');
    if (!button) return;
    const request = CW.active('purchaseRequests', button.dataset.purchase);

    openForm(request.id);
  };
  render();
});
