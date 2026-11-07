/* Demo preferences, backup, guarded destructive actions, and audit events. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);
  $('company-name').value = CW.db.settings.company;
  $('facility-name').value = CW.db.settings.facility;
  $('theme-setting').value = CW.db.settings.theme || 'light';
  $('default-labor-rate').value = CW.db.settings.defaultLaborRate ?? 0;
  if (!CW.can('write')) {
    $('settings-form').querySelectorAll('input,select,button').forEach(el => { el.disabled = true; });
  }
  if (!CW.can('danger')) {
    ['backup-import-label', 'backup-import', 'reset-data'].forEach(id => { const el = $(id); if (el) el.hidden = true; });
  }
  $('settings-form').onsubmit = event => {
    event.preventDefault();
    if (!CW.require('write')) return;
    const data = new FormData(event.currentTarget);
    CW.db.settings.company = String(data.get('company')).trim() || 'ColonialWebb';
    CW.db.settings.facility = String(data.get('facility')).trim() || 'Main Facility';
    CW.db.settings.theme = String(data.get('theme'));
    const hourlyRate = Number(data.get('defaultLaborRate'));
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) { CW.toast('Enter a valid nonnegative labor rate.', 'danger'); return; }
    CW.db.settings.defaultLaborRate = hourlyRate;
    CW.log('Updated facility/appearance settings', 'Settings');
    location.reload();
  };
  $('backup-export').onclick = () => { if (!CW.require('danger')) return; CW.exportJSON(); };
  if (!CW.can('danger')) $('backup-export').hidden = true;
  $('backup-import').onchange = async event => {
    if (!CW.require('danger')) return;
    const file = event.target.files[0];
    if (!file) return;
    if (!CW.confirm('Importing will REPLACE all data currently saved in this browser. Continue?')) return;
    try { CW.importJSON(await file.text()); CW.log('Imported demo data backup', 'Settings'); location.reload(); }
    catch (error) { CW.toast(error.message || 'Invalid backup.', 'danger'); }
  };
  $('reset-data').onclick = () => {
    if (!CW.require('danger')) return;
    if (!CW.confirm('RESET ALL DEMO DATA? This erases changes saved in this browser.')) return;
    CW.reset(); location.reload();
  };
  const audit = $('audit-table');
  if (audit) audit.innerHTML = (CW.db.activity || []).slice(0, 75).map(log => `<tr>
    <td>${CW.time(log.date)}</td><td>${CW.escape(log.actor || 'System')}</td>
    <td>${CW.escape(log.type || 'Change')}</td><td>${CW.escape(log.message)}</td></tr>`).join('') || '<tr><td colspan="4">No events recorded.</td></tr>';
});
