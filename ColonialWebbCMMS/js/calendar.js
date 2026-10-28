/* Calendar: month view of work order due dates and PM due dates. */
document.addEventListener('DOMContentLoaded', function () {
  const CW = window.CW;
  const $ = id => document.getElementById(id);
  let monthCursor = new Date(); monthCursor.setDate(1);
  let selectedDate = CW.today();
  const ymd = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const events = day => ({
    work: CW.db.workOrders.filter(order => order.dueDate === day),
    pm: CW.db.pmTasks.filter(item => item.nextDue === day)
  });
  function renderDay() {
    $('selected-date').textContent = CW.date(selectedDate);
    const selected = events(selectedDate);
    const items = [
      ...selected.work.map(o => `<li><a class="list-title" href="work-orders.html?order=${encodeURIComponent(o.id)}">${CW.escape(o.id)} — ${CW.escape(o.title)}</a><div class="list-meta">Work order · ${CW.escape(CW.assetName(o.assetId))}</div></li>`),
      ...selected.pm.map(pm => `<li><div class="list-title">${CW.escape(pm.id)} — ${CW.escape(pm.title)}</div><div class="list-meta">PM · ${CW.escape(CW.assetName(pm.assetId))}</div><a class="button-link" href="maintenance.html">Open PM page →</a></li>`)
    ];
    $('day-events').innerHTML = items.length ? '<ul class="line-list">' + items.join('') + '</ul>' : CW.empty('No scheduled maintenance for this day.');
  }
  function render() {
    const year = monthCursor.getFullYear(), month = monthCursor.getMonth();
    $('month-title').textContent = monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const first = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - first.getDay());
    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<div class="calendar-weekday">${day}</div>`).join('');
    for (let index = 0; index < 42; index++) {
      const day = new Date(gridStart); day.setDate(gridStart.getDate() + index);
      const value = ymd(day), counts = events(value);
      html += `<button class="calendar-day ${day.getMonth() !== month ? 'outside' : ''} ${value === CW.today() ? 'today' : ''} ${value === selectedDate ? 'selected' : ''}" data-date="${value}">
        <span class="calendar-number">${day.getDate()}</span><span class="calendar-events">
        ${counts.work.length ? `<span class="event-count" title="${counts.work.length} work orders">${counts.work.length} WO</span>` : ''}
        ${counts.pm.length ? `<span class="event-count pm" title="${counts.pm.length} PMs">${counts.pm.length} PM</span>` : ''}
        </span></button>`;
    }
    $('calendar-grid').innerHTML = html;
    renderDay();
  }
  $('calendar-grid').onclick = event => { const day = event.target.closest('[data-date]'); if (day) { selectedDate = day.dataset.date; render(); } };
  $('calendar-prev').onclick = () => { monthCursor.setMonth(monthCursor.getMonth() - 1); render(); };
  $('calendar-next').onclick = () => { monthCursor.setMonth(monthCursor.getMonth() + 1); render(); };
  $('calendar-today').onclick = () => { monthCursor = new Date(); monthCursor.setDate(1); selectedDate = CW.today(); render(); };
  render();
});
