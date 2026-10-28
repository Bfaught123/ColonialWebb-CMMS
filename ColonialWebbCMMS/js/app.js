/*
 * SHARED INTERFACE
 * ----------------
 * Sidebar, header, dialogs, formatting, buttons, CSV export.
 * Every page includes this script before its own page script.
 */
(function () {
  const CW = window.CW;
  const links = [
    ['index.html', 'dashboard', '▦', 'Dashboard'],
    ['work-orders.html', 'work-orders', '▤', 'Work Orders'],
    ['assets.html', 'assets', '▧', 'Assets'],
    ['maintenance.html', 'maintenance', '◷', 'Preventive Maintenance'],
    ['inventory.html', 'inventory', '▣', 'Inventory'],
    ['purchasing.html', 'purchasing', '◈', 'Purchasing'],
    ['calendar.html', 'calendar', '▦', 'Calendar'],
    ['reports.html', 'reports', '▥', 'Reports'],
    ['team.html', 'team', '♙', 'Team'],
    ['settings.html', 'settings', '⚙', 'Settings']
  ];

  CW.escape = function (value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  };
  CW.money = number => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(number || 0));
  CW.number = number => Number(number || 0).toLocaleString('en-US');
  CW.date = value => value ? new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  CW.time = value => value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
  CW.badge = (text, type) => '<span class="badge badge-' + CW.escape(type || String(text).toLowerCase().replace(/\W+/g, '-')) + '">' + CW.escape(text) + '</span>';
  CW.statusBadge = value => CW.badge(value, ({ 'Open': 'blue', 'In Progress': 'amber', 'On Hold': 'purple', 'Completed': 'green', 'Critical': 'red', 'High': 'amber', 'Medium': 'blue', 'Low': 'gray', 'Operational': 'green', 'Down': 'red', 'Needs Attention': 'amber', 'In Stock': 'green', 'Low Stock': 'amber', 'Out of Stock': 'red', 'Requested': 'blue', 'Ordered': 'purple', 'Received': 'green', 'Cancelled': 'gray' })[value] || 'gray');
  CW.options = function (items, selected, valueKey, textKey, emptyLabel) {
    let html = emptyLabel ? '<option value="">' + CW.escape(emptyLabel) + '</option>' : '';
    return html + items.map(item => {
      const id = String(item[valueKey || 'id']);
      return '<option value="' + CW.escape(id) + '"' + (id === String(selected || '') ? ' selected' : '') + '>' + CW.escape(item[textKey || 'name']) + '</option>';
    }).join('');
  };
  CW.toast = function (message, kind) {
    let node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.className = 'toast show ' + (kind || 'success');
    clearTimeout(CW.toastTimer);
    CW.toastTimer = setTimeout(() => node.className = 'toast', 3500);
  };
  CW.modal = function (title, content, onSave, buttonText) {
    const root = document.getElementById('modal-root');
    root.innerHTML = '<div class="modal-backdrop" id="modal-backdrop"><div class="modal-card" role="dialog" aria-modal="true" aria-label="' + CW.escape(title) + '">' +
      '<div class="modal-heading"><h2>' + CW.escape(title) + '</h2><button type="button" class="icon-button" id="close-modal" aria-label="Close">✕</button></div>' +
      '<form id="modal-form"><div class="modal-body">' + content + '</div><div class="modal-footer"><button type="button" id="cancel-modal" class="button button-outline">Cancel</button><button class="button button-primary" type="submit">' + CW.escape(buttonText || 'Save Changes') + '</button></div></form></div></div>';
    const close = () => root.innerHTML = '';
    document.getElementById('close-modal').onclick = close;
    document.getElementById('cancel-modal').onclick = close;
    document.getElementById('modal-backdrop').onclick = event => { if (event.target.id === 'modal-backdrop') close(); };
    document.getElementById('modal-form').onsubmit = event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const success = onSave(data, event.currentTarget);
      if (success !== false) close();
    };
    const first = root.querySelector('input, select, textarea');
    if (first) first.focus();
  };
  CW.field = (label, name, value, type, options) => {
    const input = type === 'textarea'
      ? '<textarea name="' + name + '" rows="3">' + CW.escape(value || '') + '</textarea>'
      : '<input type="' + (type || 'text') + '" name="' + name + '" value="' + CW.escape(value === null || value === undefined ? '' : value) + '" ' + (options || '') + '>';
    return '<label class="form-field"><span>' + CW.escape(label) + '</span>' + input + '</label>';
  };
  CW.select = (label, name, optionsHtml) => '<label class="form-field"><span>' + CW.escape(label) + '</span><select name="' + name + '">' + optionsHtml + '</select></label>';
  CW.choice = (values, selected) => values.map(value => '<option' + (String(value) === String(selected) ? ' selected' : '') + '>' + CW.escape(value) + '</option>').join('');
  CW.download = function (fileName, contents, mime) {
    const blob = new Blob([contents], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = fileName;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  CW.exportCSV = function (name, headings, rows) {
    const encode = value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
    CW.download(name, [headings, ...rows].map(row => row.map(encode).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  };
  CW.metric = (label, value, foot, icon, color) =>
    '<article class="card metric"><div class="metric-head"><span class="metric-label">' + CW.escape(label) + '</span><span class="metric-icon ' + (color || '') + '">' + (icon || '▤') + '</span></div><div class="metric-value">' + CW.escape(value) + '</div><div class="metric-foot">' + CW.escape(foot || '') + '</div></article>';
  CW.userOptions = selected => CW.options(CW.db.team.filter(person => person.active), selected, 'id', 'name', 'Unassigned');
  CW.assetOptions = selected => CW.options(CW.db.assets, selected, 'id', 'name', 'No asset selected');
  CW.empty = message => '<div class="empty-state"><div class="empty-icon">▤</div><h3>No records found</h3><p>' + CW.escape(message || 'Try changing your search or filters.') + '</p></div>';
  CW.confirm = message => window.confirm(message);

  function initializeShell() {
    const page = document.body.dataset.page || 'dashboard';
    const company = CW.db.settings.company || 'ColonialWebb';
    document.title = (links.find(link => link[1] === page) || links[0])[3] + ' · ' + company + ' CMMS';
    document.documentElement.dataset.theme = CW.db.settings.theme || 'light';
    const activeUser = CW.currentUser();
    document.getElementById('sidebar').innerHTML =
      '<div class="brand"><div class="brand-logo">CW</div><div><strong>' + CW.escape(company) + '</strong><small>MAINTENANCE PLATFORM</small></div></div>' +
      '<div class="sidebar-label">WORKSPACE</div><nav class="sidebar-navigation" aria-label="Main navigation">' +
      links.map(([href, key, icon, text]) => '<a href="' + href + '" class="nav-link ' + (key === page ? 'active' : '') + '"><span class="nav-icon">' + icon + '</span><span>' + text + '</span></a>').join('') +
      '</nav><div class="sidebar-bottom"><span class="sidebar-status-dot"></span> FRONTEND DEMO <small>No server connected</small></div>';
    document.getElementById('topbar').innerHTML =
      '<div class="breadcrumb">' + CW.escape(company) + ' <span>/</span> ' + CW.escape(CW.db.settings.facility || 'Main Facility') + '</div>' +
      '<div class="topbar-actions"><span class="demo-pill">● Demo Mode</span><label class="user-switch"><span>Acting as</span><select id="user-switch" aria-label="Demo technician">' +
      CW.options(CW.db.team.filter(member => member.active), activeUser.id) + '</select></label><div class="avatar">' + CW.escape(activeUser.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()) + '</div></div>';
    const switcher = document.getElementById('user-switch');
    switcher.addEventListener('change', event => {
      CW.db.currentUserId = event.target.value; CW.save(); location.reload();
    });
  }
  document.addEventListener('DOMContentLoaded', initializeShell);
})();
