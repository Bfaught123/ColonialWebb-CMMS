# ColonialWebb CMMS — functional browser demo

This is an expanded version of the supplied CMMS frontend. It runs **without MySQL or Node.js** so you can demonstrate workflows immediately. The role switcher is **not a login**. Real authentication, permissions, synchronization and audit integrity require a backend.

## Open it

1. Extract the ZIP, preserving all subfolders.
2. In desktop VS Code, choose **File → Open Folder** and select `ColonialWebbCMMS`.
3. Open `index.html` using the **Live Server** extension (or another static HTTP server). The address is usually `http://127.0.0.1:5500/index.html`.
4. The sidebar navigates to separate HTML pages. All page scripts are correctly located in **`js/pages/`**.
5. At the top, use **Acting as** to preview different roles. The seeded accounts are: Maintenance Admin (Admin), Technician One/Two (Maintenance), Operations User (Operator).

## Access matrix (DEMO, not security)

| Ability | Operator | Maintenance | Admin |
|---|:---:|:---:|:---:|
| Browse dashboard, work orders, assets, PMs, inventory, purchasing, calendar and reports | Yes | Yes | Yes |
| Submit a NEW work order ticket | Yes | Yes | Yes |
| Edit/assign/complete work orders | No | Yes | Yes |
| Issue/return/receive/transfer/adjust stock | No | Yes | Yes |
| Create/edit assets, inventory locations, PM schedules and purchasing requests | No | Yes | Yes |
| Generate PM work orders and log PM completion | No | Yes | Yes |
| Edit facility settings | No | Yes | Yes |
| Create/edit/disable users, import/reset demo, delete records | No | No | Yes |

**Delete** is admin-only and is a soft delete: the row disappears from normal lists but its reference/audit history is retained. Inventory locations must be adjusted to **zero units** before an admin can delete them. An admin cannot delete their own currently selected account or remove the last active administrator. Inventory movements and audit events are append-only in this prototype.

## Automated maintenance metrics — new

All dashboard and report figures come from the same source transactions; there are **no separately maintained KPI fields**. You can see data updates after refreshing or revisiting pages, or when you change the period filter.

- **Work order costs:** labor hours × the assigned employee's saved hourly rate, plus net parts issued to that work order. Issuing/returning a part updates that WO's cost and the Dashboard and Reports simultaneously. The part's cost is snapshotted at issue time, so future cost edits do not rewrite historical costs; a return credits the associated outstanding issue value.
- **Track time:** Work Orders → **Time** → Start/Stop Labor or Downtime timer. Timers are saved in localStorage and survive navigation/refresh. They book recorded hours when stopped, not while running. Work orders started from timers transition from Open to In Progress. When an order is completed, its remaining timers are stopped automatically.
- **Manual time:** Work Orders → Time → enter hours for a selected person, or use the existing **untracked/manual** hours fields. **Do not enter the same hours in both locations.** Time entries capture their technician's cost rate; default and per-user rates are editable in Settings/Team.
- **PM integration:** Completing a linked PM work order advances the recurring PM's due date and writes completion history. Completing from the PM page will also close a linked open WO (if present) without duplicating the PM history.
- **Purchasing:** Receipt increases stock and refreshes its latest-unit-cost estimate; received purchase spending is displayed **separately** from maintenance labor+parts costs to prevent double-counting.
- **Dashboard:** filters for last 7, 30, 90 days or all time, live maintenance/parts/labor costs, hours, recorded downtime, purchase spend, current inventory valuation, costly assets and the source events.
- **Reports:** the same period filter and calculations, per-asset and per-WO cost breakdowns, plus CSV exports of work orders, inventory and recorded cost/time events.

**Important limits:** Example people/rates/prices are illustrative, so dollar figures are *estimates*, not verified accounting data. Old untracked hours are attributed to the WO creation date if no time log exists. Uptime, MTBF, overall equipment effectiveness, and lost production cannot be accurately inferred from work orders alone. Timers rely on the computer/browser clock; tamper-proof capture and shared sync require a real server. PMs still need a backend scheduler for unattended work-order generation.

## Work order parts — important

On the **Work Orders** page, choose **Parts** beside a work order, or **Issue / Return Parts** from its edit dialog. Select the part's exact **locker/bin**, an Issue or Return action, and a quantity. **Issue deducts inventory immediately**, and **Return adds it back**. Returning a linked part cannot exceed the quantity outstanding on that work order. Completing the work order **does not deduct stock twice**. The work order's details show net issued/returned parts. You can also issue and return parts from the Inventory page and optionally associate a work order.

## PM workflow

Create/edit recurring PM schedules, complete a checklist, and advance the next due date. Use **Create WO** on a schedule or **Generate Due Work Orders** to create linked tickets for due/overdue PMs. The demo checks on button click only. Automatic unattended generation must be implemented by the backend scheduler later.

## Inventory, purchasing, and history

A part-location row is a unique combination of **part number + locker + bin**. Multiple locker/bin locations for the same part number are allowed. Stock movements record technician, time, part, quantity, stock before/after, location, notes and optional work order. Purchase requests can progress Requested → Ordered → Received; receiving adds linked inventory stock exactly once. Settings shows a demo activity log. Existing browser data under key `colonialwebb_cmms_v3` is reused, with old role labels migrated for display.

## Backup and reset

**Settings → Export Backup** downloads the demo's JSON database (Admin only). **Import Backup** and **Reset Demo Data** are also Admin-only and overwrite the browser's stored demo data. Back up your data first. *LocalStorage does not travel with a GitHub upload*, and each browser/computer maintains separate data.

## Backend next step

- **`js/config.js`** has the current `mode: 'demo'` setting.
- **`js/data-client.js`** is the localStorage persistence boundary.
- **`js/store.js`** handles the browser's in-memory model, demo roles, archive actions and stock movement calculations.
- **`backend-plan/mysql-schema.sql`** is a starter relational schema for MySQL 8+.
- **`backend-plan/API_CONTRACT.md`** describes the real backend and security requirements.

**Important:** Changing `mode` to `live` alone **does not connect MySQL**. A Node.js/Express backend must be built, and page data writes must be refactored to use authenticated, per-operation API calls. Browser roles and browser data must never be treated as authoritative. This ZIP is a **functional prototype**, not finished production backend code.

## File organization

```text
ColonialWebbCMMS/
  index.html, work-orders.html, assets.html, maintenance.html, inventory.html, ...
  css/styles.css
  js/config.js, js/data-client.js, js/seed.js, js/store.js, js/analytics.js, js/app.js
  js/pages/dashboard.js, work-orders.js, assets.js, maintenance.js, inventory.js, ...
  backend-plan/mysql-schema.sql, API_CONTRACT.md
  docs/TEST_CHECKLIST.md
```

All seeded names, assets, quantities and purchase records are **examples**, not live facility data. Do not publish company-sensitive records or passwords with the demo.
