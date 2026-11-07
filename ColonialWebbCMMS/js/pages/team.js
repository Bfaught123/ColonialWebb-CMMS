/* Admin-managed user directory (switchable DEMO roles only, no authentication). */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);
  const roles = ['Operator', 'Maintenance', 'Admin'];
  function render() {
    const team = CW.records('team');
    $('team-metrics').innerHTML =
      CW.metric('Accounts', team.length, 'Demo user profiles', '♙') +
      CW.metric('Active Accounts', team.filter(p => p.active).length, 'Available in demo switcher', '✓', 'green') +
      CW.metric('Maintenance', team.filter(p => p.role === 'Maintenance').length, 'Edit maintenance records', '⚙') +
      CW.metric('Administrators', team.filter(p => p.role === 'Admin').length, 'Manage users and deletion', '▦');
    $('team-table').innerHTML = team.map(member => `<tr>
      <td class="cell-title">${CW.escape(member.name)}</td><td>${CW.escape(member.department)}</td>
      <td>${CW.badge(member.role, member.role === 'Admin' ? 'purple' : member.role === 'Maintenance' ? 'blue' : 'gray')}</td><td>${CW.escape(member.email || '—')}</td>
      <td>${CW.money(CW.rateFor(member.id))}/hr</td>
      <td>${CW.badge(member.active ? 'Active' : 'Inactive', member.active ? 'green' : 'gray')}</td>
      <td><div class="action-buttons"><button class="button-link" data-person="${CW.escape(member.id)}">${CW.can('users:manage') ? 'Edit User' : 'View'}</button>${CW.deleteButton('team', member.id)}</div></td>
    </tr>`).join('') || '<tr><td colspan="6">No users yet.</td></tr>';
  }
  function edit(id) {
    if (!id && !CW.require('users:manage')) return;
    const existing = id ? CW.active('team', id) : null;
    if (id && !existing) return;
    const item = existing || { name: '', department: 'Maintenance', role: 'Maintenance', email: '', hourlyRate: CW.db.settings.defaultLaborRate || 0, active: true };
    CW.modal(existing ? 'User — ' + item.name : 'Add Demo User',
      CW.field('Employee Name *', 'name', item.name, 'text', 'required maxlength="100"') +
      CW.field('Department', 'department', item.department) +
      CW.select('Access Role', 'role', CW.choice(roles, item.role)) +
      CW.field('Estimated Labor Rate ($/hr)', 'hourlyRate', item.hourlyRate ?? CW.db.settings.defaultLaborRate ?? 0, 'number', 'min="0" step="0.01"') +
      CW.select('Account Status', 'active', CW.choice(['Active','Inactive'], item.active ? 'Active' : 'Inactive')) +
      '<div class="full">' + CW.field('Email (optional)', 'email', item.email, 'email') + '</div>' +
      '<div class="full note-box">These profiles simulate permissions in one browser; they are not logins. The live system must manage users and verify permissions server-side.</div>',
      data => {
        if (!CW.require('users:manage')) return false;
        if (!data.name.trim() || !roles.includes(data.role) || !Number.isFinite(Number(data.hourlyRate)) || Number(data.hourlyRate) < 0) { CW.toast('Enter a valid name and role.', 'danger'); return false; }
        const removingAdmin = existing?.role === 'Admin' && existing.active && (data.role !== 'Admin' || data.active !== 'Active');
        if (removingAdmin && CW.records('team').filter(x => x.active && x.role === 'Admin').length <= 1) {
          CW.toast('At least one active admin must remain.', 'danger'); return false;
        }
        const member = Object.assign(existing || {}, { name: data.name.trim(), department: data.department.trim(),
          role: data.role, hourlyRate: Number(data.hourlyRate), email: data.email.trim(), active: data.active === 'Active' });
        if (!existing) { member.id = CW.nextId(CW.db.team, 'USR'); CW.db.team.push(member); }
        CW.log((existing ? 'Updated user ' : 'Created user ') + member.name + ' (' + member.role + ')', 'Users');
        render(); CW.toast('User profile saved. Refresh to update the role switcher.');
        if (member.id === CW.db.currentUserId && (member.role !== 'Admin' || !member.active)) location.reload();
      }, existing ? 'Save User' : 'Add User', { readOnly: !CW.can('users:manage') });
  }
  CW.setVisible('new-member', 'users:manage');
  $('new-member').onclick = () => edit();
  $('team-table').onclick = event => {
    const del = event.target.closest('[data-delete]');
    if (del) { if (CW.deleteRecord('team', del.dataset.delete)) render(); return; }
    const button = event.target.closest('[data-person]');
    if (button) edit(button.dataset.person);
  };
  render();
});
