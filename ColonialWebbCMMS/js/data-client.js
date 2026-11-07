/*
 * PERSISTENCE BOUNDARY
 * Current implementation: per-browser demo storage.
 * For a production MySQL-backed system, replace this adapter with authenticated
 * API calls AND refactor domain writes into server-authorized operations.
 * Never put MySQL credentials, password checks, or trusted roles in browser JS.
 */
(function () {
  const KEY = 'colonialwebb_cmms_v3'; // Keep existing demos, including saved work.
  const mode = window.CMMS_CONFIG?.mode || 'demo';
  if (mode !== 'demo') {
    throw new Error('Live mode is not connected. Implement authenticated API integration first.');
  }
  window.CMMS_DATA = {
    mode,
    key: KEY,
    read() {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    },
    write(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
  };
})();
