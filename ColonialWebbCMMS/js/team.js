/* Team members can be added and edited. This is NOT authentication. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);
  const roles = ['Administrator', 'Maintenance Manager', 'Technician', 'Requestor', 'Management'];
  function render() {
    const team = CW.db.team;
    $('team-metrics').innerHTML =
      CW.metric('Team Members', team.length, 'All profiles', '♙') +
      CW.metric('Active Members', team.filter(p => p.active).length, 'Available for assignment', '✓', 'green') +
      CW.metric('Technicians', team.filter(p => p.role === 'Technician').length, 'Technician profiles', '⚙') +
      CW.metric('Departments', new Set(team.map(p => p.department)).size, 'Represented in this demo', '▦');
    $('team-table').innerHTML = team.map(member => `<tr>
      <td class="cell-title">${CW.escape(member.name)}</td><td>${CW.escape(member.department)}</td>
      <td>${CW.escape(member.role)}</td><td>${CW.escape(member.email || '—')}</td>
      <td>${CW.statusBadge(member.active ? 'Operational' : 'Retired').replace('Operational', 'Active').replace('Retired', 'Inactive')}</td>
      <td><button class="button-link" data-person="${CW.escape(member.id)}">Edit Profile</button></td>
    </tr>`).join('') || '<tr><td colspan="6">No personnel yet.</td></tr>';
  }
  function edit(id) {
    const existing = id ? CW.find('team', id) : null;
    const item = existing || { name: '', department: 'Maintenance', role: 'Technician', email: '', active: true };
    CW.modal(existing ? 'Edit Staff Profile' : 'Add Team Member',
      CW.field('Employee Name *', 'name', item.name, 'text', 'required') +
      CW.field('Department', 'department', item.department) +
      CW.select('Role', 'role', CW.choice(roles, item.role)) +
      CW.select('Account Status', 'active', CW.choice(['Active', 'Inactive'], item.active ? 'Active' : 'Inactive')) +
      '<div class="full">' + CW.field('Email (optional)', 'email', item.email, 'email') + '</div>',
      data => {
        if (!data.name.trim()) { CW.toast('Employee name is required.', 'danger'); return false; }
        const member = Object.assign(existing || {}, { name: data.name.trim(), department: data.department.trim(), role: data.role, email: data.email.trim(), active: data.active === 'Active' });
        if (!existing) { member.id = CW.nextId(CW.db.team, 'USR'); CW.db.team.push(member); }
        if (member.id === CW.db.currentUserId && !member.active) {
          CW.db.currentUserId = CW.db.team.find(m => m.active)?.id || member.id;
        }
        CW.log((existing ? 'Updated team member ' : 'Added team member ') + member.name);
        render(); CW.toast('Team member saved. Refresh the page to update the user dropdown.');
      });
  }
  $('new-member').onclick = () => edit();
  $('team-table').onclick = event => { const btn = event.target.closest('[data-person]'); if (btn) edit(btn.dataset.person); };
  render();
});
