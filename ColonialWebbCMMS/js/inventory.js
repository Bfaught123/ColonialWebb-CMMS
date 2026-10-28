/* ================================================================
   INVENTORY PAGE
   ----------------------------------------------------------------
   - Each row represents ONE part number in ONE locker + bin.
   - The same part number can appear in several locations.
   - All technicians may receive, issue, return, transfer and adjust.
   - Quantity changes are recorded in the transaction history.
   - Work order is OPTIONAL for issue/return.
   - Edit descriptive fields in the part detail; use actions for qty.
   ================================================================ */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);

  function partLabel(part) {
    return part.number + ' — ' + part.name + ' (Locker ' + part.locker + ', Bin ' + part.bin + '; Qty ' + part.quantity + ')';
  }
  function partOptions(selected) {
    return CW.options(CW.db.parts.map(part => ({ id: part.id, name: partLabel(part) })), selected, 'id', 'name');
  }
  function location(part) { return part.locker + ' / ' + part.bin; }
  function recordTransaction(type, part, quantity, from, to, note, workOrderId) {
    CW.db.transactions.unshift({
      id: CW.nextId(CW.db.transactions, 'TX'),
      date: CW.isoNow(),
      type, partId: part.id, partNumber: part.number,
      quantity: Number(quantity), from, to,
      technician: CW.currentUser().name,
      workOrderId: workOrderId || '', note: note || ''
    });
  }

  function render() {
    const parts = CW.db.parts;
    const alerts = parts.filter(part => CW.partStatus(part) !== 'In Stock');
    const value = parts.reduce((sum, part) => sum + CW.partValue(part), 0);
    const numberOfItems = new Set(parts.map(part => part.number.toLowerCase())).size;
    const units = parts.reduce((sum, part) => sum + Number(part.quantity), 0);
    const onOrder = CW.db.purchaseRequests.filter(req => !['Received', 'Cancelled'].includes(req.status)).reduce((sum, req) => sum + Number(req.quantity), 0);
    $('inventory-metrics').innerHTML =
      CW.metric('Unique Part Numbers', numberOfItems, parts.length + ' stocked locations', '▣') +
      CW.metric('Inventory Value', CW.money(value), CW.number(units) + ' total units', '$', 'green') +
      CW.metric('Low / Out of Stock', alerts.length, 'Locations below minimum', '!', 'red') +
      CW.metric('Units on Order', onOrder, 'Open purchasing requests', '◷', 'amber');

    const oldLocker = $('inventory-locker').value;
    const lockers = [...new Set(parts.map(part => part.locker))].sort();
    $('inventory-locker').innerHTML = '<option value="">All lockers</option>' + lockers.map(x => `<option value="${CW.escape(x)}">Locker ${CW.escape(x)}</option>`).join('');
    $('inventory-locker').value = lockers.includes(oldLocker) ? oldLocker : '';
    const query = $('inventory-search').value.trim().toLowerCase();
    const filter = $('inventory-stock').value;
    const locker = $('inventory-locker').value;
    const filtered = parts.filter(part =>
      (!filter || CW.partStatus(part) === filter) && (!locker || part.locker === locker) &&
      [part.number, part.name, part.manufacturer, part.manufacturerNumber, part.category, part.locker, part.bin, part.supplier]
        .join(' ').toLowerCase().includes(query)
    );
    $('inventory-count').textContent = filtered.length + ' of ' + parts.length + ' locations · quantities shown per locker/bin';
    $('inventory-table').innerHTML = filtered.map(part => `<tr>
      <td class="cell-id">${CW.escape(part.number)}</td>
      <td class="cell-title">${CW.escape(part.name)}<span class="cell-secondary">${CW.escape(part.category)}</span></td>
      <td>${CW.escape(part.manufacturer)}<span class="cell-secondary">${CW.escape(part.manufacturerNumber)}</span></td>
      <td class="cell-nowrap">${CW.escape(part.locker)}</td><td>${CW.escape(part.bin)}</td>
      <td class="cell-title">${CW.number(part.quantity)}</td><td>${CW.number(part.minimum)}</td>
      <td>${CW.money(part.unitCost)}</td><td>${CW.money(CW.partValue(part))}</td>
      <td>${CW.statusBadge(CW.partStatus(part))}</td>
      <td><button class="button-link" data-detail="${CW.escape(part.id)}">View / Edit</button></td>
    </tr>`).join('') || '<tr><td colspan="11">No inventory matches your filters.</td></tr>';

    $('transaction-table').innerHTML = CW.db.transactions.map(tx => `<tr>
      <td class="cell-nowrap">${CW.time(tx.date)}</td><td>${CW.statusBadge(tx.type)}</td>
      <td class="cell-id">${CW.escape(tx.partNumber)}</td><td class="cell-title">${CW.number(tx.quantity)}</td>
      <td>${CW.escape(tx.from || '—')} → ${CW.escape(tx.to || '—')}</td>
      <td>${CW.escape(tx.technician)}</td><td>${CW.escape(tx.workOrderId || '—')}</td><td>${CW.escape(tx.note || '—')}</td>
    </tr>`).join('') || '<tr><td colspan="8">No transactions yet.</td></tr>';
  }

  /* Edit or add a stocked location. No direct quantity edit on existing rows. */
  function openPartForm(id) {
    const existing = id ? CW.find('parts', id) : null;
    const part = existing || {
      number: '', name: '', manufacturer: '', manufacturerNumber: '', category: 'Other', locker: '', bin: '',
      quantity: 0, minimum: 0, maximum: 0, unitCost: 0, supplier: '', compatibleAssetIds: [], notes: ''
    };
    const currentAssets = (part.compatibleAssetIds || []).join(', ');
    CW.modal(existing ? 'Part Details — ' + part.number : 'Add Part / Storage Location',
      CW.field('Part Number *', 'number', part.number, 'text', 'required maxlength="60"') +
      CW.field('Part Description *', 'name', part.name, 'text', 'required maxlength="150"') +
      CW.field('Manufacturer', 'manufacturer', part.manufacturer) +
      CW.field('Manufacturer Part #', 'manufacturerNumber', part.manufacturerNumber) +
      CW.select('Category', 'category', CW.choice(['Bearings', 'Electrical', 'Mechanical', 'Filters', 'Hydraulic', 'Pneumatic', 'Consumables', 'Other'], part.category)) +
      CW.field('Supplier', 'supplier', part.supplier) +
      CW.field('Locker Number *', 'locker', part.locker, 'text', 'required maxlength="30"') +
      CW.field('Bin Number *', 'bin', part.bin, 'text', 'required maxlength="30"') +
      CW.field('Minimum Stock', 'minimum', part.minimum, 'number', 'min="0" step="1"') +
      CW.field('Maximum Stock', 'maximum', part.maximum, 'number', 'min="0" step="1"') +
      CW.field('Unit Cost ($)', 'unitCost', part.unitCost, 'number', 'min="0" step="0.01"') +
      (!existing ? CW.field('Initial Quantity', 'initialQty', 0, 'number', 'min="0" step="1"') : '<div class="form-field"><span>Current Stock</span><div class="note-box">' + CW.number(part.quantity) + ' units — use Receive / Issue / Adjust for quantity changes.</div></div>') +
      '<div class="full">' + CW.field('Compatible Asset IDs (comma separated)', 'compatibleAssets', currentAssets) + '</div>' +
      '<div class="full">' + CW.field('Notes', 'notes', part.notes, 'textarea') + '</div>',
      data => {
        data.number = data.number.trim(); data.name = data.name.trim();
        data.locker = data.locker.trim(); data.bin = data.bin.trim();
        const initial = Number(data.initialQty || 0);
        if (!data.number || !data.name || !data.locker || !data.bin ||
            ![initial, Number(data.minimum), Number(data.maximum), Number(data.unitCost)].every(n => Number.isFinite(n) && n >= 0) ||
            ![initial, Number(data.minimum), Number(data.maximum)].every(Number.isInteger)) {
          CW.toast('Enter valid part, location, and nonnegative stock numbers.', 'danger'); return false;
        }
        const conflicting = CW.db.parts.find(other => other.id !== id &&
          other.number.toLowerCase() === data.number.toLowerCase() &&
          other.locker.toLowerCase() === data.locker.toLowerCase() && other.bin.toLowerCase() === data.bin.toLowerCase());
        if (conflicting) { CW.toast('This part already exists in that locker/bin. Receive stock into its existing location.', 'danger'); return false; }
        const newValues = {
          number: data.number, name: data.name, manufacturer: data.manufacturer.trim(),
          manufacturerNumber: data.manufacturerNumber.trim(), category: data.category,
          locker: data.locker, bin: data.bin, minimum: Number(data.minimum), maximum: Number(data.maximum),
          unitCost: Number(data.unitCost), supplier: data.supplier.trim(), notes: data.notes.trim(),
          compatibleAssetIds: data.compatibleAssets.split(',').map(x => x.trim()).filter(x => CW.find('assets', x))
        };
        if (existing) Object.assign(existing, newValues);
        else {
          const created = Object.assign({ id: CW.nextId(CW.db.parts, 'PART'), quantity: initial }, newValues);
          CW.db.parts.push(created);
          if (initial > 0) recordTransaction('Receive', created, initial, 'Initial Stock', location(created), 'Initial stock when part created', '');
        }
        CW.log((existing ? 'Edited part ' : 'Added part ') + data.number + ' at ' + data.locker + '/' + data.bin);
        render(); CW.toast('Inventory record saved.');
      }, existing ? 'Save Part Details' : 'Add Part');
  }

  function openTransaction(type, selectedPartId) {
    if (!CW.db.parts.length) { CW.toast('Create a part first.', 'danger'); return; }
    const extra = type === 'Transfer'
      ? CW.field('Destination Locker *', 'targetLocker', '', 'text', 'required') + CW.field('Destination Bin *', 'targetBin', '', 'text', 'required')
      : '';
    const quantityField = type === 'Adjust'
      ? CW.field('New Physical Quantity *', 'quantity', '', 'number', 'required min="0" step="1"')
      : CW.field('Quantity *', 'quantity', 1, 'number', 'required min="1" step="1"');
    const form = CW.select('Part / Locker / Bin', 'partId', partOptions(selectedPartId)) + quantityField + extra +
      (['Issue', 'Return'].includes(type) ? CW.select('Related Work Order (optional)', 'workOrderId', CW.options(CW.db.workOrders, '', 'id', 'id', 'No work order')) : '') +
      '<div class="full">' + CW.field('Reason / Notes', 'note', '', 'textarea') + '</div>';
    CW.modal(type + ' Inventory', form, data => {
      const part = CW.find('parts', data.partId);
      const quantity = Number(data.quantity);
      if (!part || !Number.isInteger(quantity) || quantity < (type === 'Adjust' ? 0 : 1)) {
        CW.toast('Enter a whole, valid quantity.', 'danger'); return false;
      }
      const current = Number(part.quantity);
      let change = quantity;
      if (type === 'Issue' || type === 'Transfer') change = -quantity;
      if (type === 'Adjust') change = quantity - current;
      if (current + change < 0) { CW.toast('Not enough stock in that locker and bin.', 'danger'); return false; }
      const before = location(part);
      if (type === 'Transfer') {
        const locker = data.targetLocker.trim(); const bin = data.targetBin.trim();
        if (!locker || !bin) { CW.toast('Select destination locker and bin.', 'danger'); return false; }
        if (locker.toLowerCase() === part.locker.toLowerCase() && bin.toLowerCase() === part.bin.toLowerCase()) {
          CW.toast('Choose a different destination.', 'danger'); return false;
        }
        let target = CW.db.parts.find(p => p.number.toLowerCase() === part.number.toLowerCase() &&
          p.locker.toLowerCase() === locker.toLowerCase() && p.bin.toLowerCase() === bin.toLowerCase());
        if (!target) {
          target = Object.assign({}, part, { id: CW.nextId(CW.db.parts, 'PART'), locker, bin, quantity: 0, minimum: 0, maximum: 0 });
          CW.db.parts.push(target);
        }
        target.quantity = Number(target.quantity) + quantity;
        part.quantity = current - quantity;
        recordTransaction(type, part, quantity, before, location(target), data.note.trim(), '');
      } else {
        part.quantity = current + change;
        const from = ['Issue'].includes(type) ? before : type === 'Adjust' ? before + ' (count ' + current + ')' : 'Outside Inventory';
        const to = type === 'Issue' ? 'Used / Removed' : before;
        recordTransaction(type, part, type === 'Adjust' ? change : quantity, from, to, data.note.trim(), data.workOrderId || '');
      }
      CW.log(type + ' ' + quantity + ' ' + part.number + ' by ' + CW.currentUser().name);
      render(); CW.toast(type + ' transaction saved.');
    }, type === 'Adjust' ? 'Save Adjustment' : type + ' Parts');
  }

  $('add-part').onclick = () => openPartForm();
  document.querySelectorAll('[data-tx]').forEach(button => { button.onclick = () => openTransaction(button.dataset.tx); });
  $('inventory-search').oninput = render;
  $('inventory-stock').onchange = render;
  $('inventory-locker').onchange = render;
  $('inventory-table').onclick = event => { const btn = event.target.closest('[data-detail]'); if (btn) openPartForm(btn.dataset.detail); };
  $('export-inventory').onclick = () => CW.exportCSV('inventory.csv',
    ['Part Number', 'Description', 'Manufacturer', 'Manufacturer Part Number', 'Category', 'Locker', 'Bin', 'Quantity', 'Minimum', 'Maximum', 'Unit Cost', 'Total Value', 'Supplier'],
    CW.db.parts.map(p => [p.number, p.name, p.manufacturer, p.manufacturerNumber, p.category, p.locker, p.bin, p.quantity, p.minimum, p.maximum, p.unitCost, CW.partValue(p), p.supplier]));
  $('export-transactions').onclick = () => CW.exportCSV('inventory-transactions.csv',
    ['Date', 'Type', 'Part Number', 'Quantity', 'From', 'To', 'Technician', 'Work Order', 'Notes'],
    CW.db.transactions.map(t => [t.date, t.type, t.partNumber, t.quantity, t.from, t.to, t.technician, t.workOrderId, t.note]));
  render();
});
