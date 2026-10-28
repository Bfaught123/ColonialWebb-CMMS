/* Assets: equipment cards, maintenance history, and editable details. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);

  function render() {
    const search = $('asset-search').value.trim().toLowerCase();
    const status = $('asset-filter').value;
    const filtered = CW.db.assets.filter(asset => (!status || asset.status === status) &&
      [asset.id, asset.name, asset.serial, asset.category, asset.location, asset.manufacturer].join(' ').toLowerCase().includes(search));
    $('asset-metrics').innerHTML =
      CW.metric('Registered Assets', CW.db.assets.length, 'In equipment register', '▧') +
      CW.metric('Operational', CW.db.assets.filter(x => x.status === 'Operational').length, 'Currently running', '✓', 'green') +
      CW.metric('Needs Attention', CW.db.assets.filter(x => x.status === 'Needs Attention').length, 'Repair or inspection needed', '!', 'amber') +
      CW.metric('Down', CW.db.assets.filter(x => x.status === 'Down').length, 'Out of service', '✕', 'red');
    $('asset-grid').innerHTML = filtered.map(asset => `
      <article class="card asset-card"><div class="asset-icon">⚙</div><h3>${CW.escape(asset.name)}</h3>
      <div class="text-muted small">${CW.escape(asset.id)} · ${CW.escape(asset.category)}</div>
      <div class="asset-bottom flex-between"><div><span class="tiny text-muted">LOCATION</span><strong class="small">${CW.escape(asset.location || 'Not assigned')}</strong></div>${CW.statusBadge(asset.status)}</div>
      <div class="flex-between mt-16"><span class="small text-muted">${CW.db.workOrders.filter(wo => wo.assetId === asset.id && wo.status !== 'Completed').length} open work orders</span><button class="button-link" data-asset="${CW.escape(asset.id)}">Details →</button></div></article>
    `).join('') || CW.empty('No equipment matches your filters.');
  }

  function openForm(id) {
    const existing = id ? CW.find('assets', id) : null;
    const asset = existing || { name: '', category: '', location: '', manufacturer: '', model: '', serial: '', status: 'Operational', criticality: 'Medium', hours: 0, notes: '' };
    const work = existing ? CW.db.workOrders.filter(wo => wo.assetId === id) : [];
    const parts = existing ? CW.db.parts.filter(part => (part.compatibleAssetIds || []).includes(id)) : [];
    const history = existing ? `<div class="full note-box"><strong>Maintenance History:</strong> ${work.length} work orders.
      <a class="button-link" href="work-orders.html?asset=${encodeURIComponent(id)}">View equipment work orders →</a><br>
      <strong>Compatible parts:</strong> ${parts.length ? parts.map(p => CW.escape(p.number) + ' (Locker ' + CW.escape(p.locker) + ', Bin ' + CW.escape(p.bin) + ')').join('; ') : 'None linked yet.'}</div>` : '';
    CW.modal(existing ? 'Asset Details — ' + existing.id : 'Add New Asset',
      CW.field('Equipment Name *', 'name', asset.name, 'text', 'required maxlength="120"') +
      CW.field('Category', 'category', asset.category) +
      CW.field('Location', 'location', asset.location) +
      CW.select('Condition', 'status', CW.choice(['Operational', 'Needs Attention', 'Down', 'Retired'], asset.status)) +
      CW.field('Manufacturer', 'manufacturer', asset.manufacturer) +
      CW.field('Model', 'model', asset.model) +
      CW.field('Serial Number', 'serial', asset.serial) +
      CW.select('Criticality', 'criticality', CW.choice(['Low', 'Medium', 'High'], asset.criticality)) +
      CW.field('Run Hours', 'hours', asset.hours, 'number', 'min="0" step="0.1"') +
      '<div class="full">' + CW.field('Notes', 'notes', asset.notes, 'textarea') + '</div>' + history,
      data => {
        if (!data.name.trim() || Number(data.hours) < 0) { CW.toast('Check equipment name and hours.', 'danger'); return false; }
        const updated = Object.assign(existing || {}, data, { name: data.name.trim(), hours: Number(data.hours || 0) });
        if (!existing) { updated.id = CW.nextId(CW.db.assets, 'AST'); CW.db.assets.unshift(updated); }
        CW.log((existing ? 'Updated asset ' : 'Added asset ') + updated.id + ': ' + updated.name);
        render(); CW.toast('Asset saved.');
      }, existing ? 'Save Asset' : 'Add Asset');
  }

  $('asset-search').oninput = render;
  $('asset-filter').onchange = render;
  $('new-asset').onclick = () => openForm();
  $('asset-grid').onclick = event => { const button = event.target.closest('[data-asset]'); if (button) openForm(button.dataset.asset); };
  render();
});
