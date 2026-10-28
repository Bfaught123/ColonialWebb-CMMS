/* Preferences and moving local-only data between browsers. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);
  $('company-name').value = CW.db.settings.company;
  $('facility-name').value = CW.db.settings.facility;
  $('theme-setting').value = CW.db.settings.theme || 'light';
  $('settings-form').onsubmit = event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    CW.db.settings.company = String(data.get('company')).trim() || 'ColonialWebb';
    CW.db.settings.facility = String(data.get('facility')).trim() || 'Main Facility';
    CW.db.settings.theme = String(data.get('theme'));
    CW.save(); location.reload();
  };
  $('backup-export').onclick = () => CW.exportJSON();
  $('backup-import').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (!CW.confirm('Importing will REPLACE all data currently saved in this browser. Continue?')) return;
    try { CW.importJSON(await file.text()); CW.toast('Backup imported.'); location.reload(); }
    catch (error) { CW.toast(error.message || 'Invalid backup.', 'danger'); }
  };
  $('reset-data').onclick = () => {
    if (!CW.confirm('RESET ALL DEMO DATA? This will erase work orders, part changes, inventory history, team changes, and all other records in this browser.')) return;
    CW.reset(); location.reload();
  };
});
