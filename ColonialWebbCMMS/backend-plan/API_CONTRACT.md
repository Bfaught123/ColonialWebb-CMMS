# Production API & security integration contract

The browser demo is deliberately not an authenticated live application. This document is a proposed target for **Node.js + Express + MySQL 8+** integration, not a claim that those endpoints exist.

## Production security

- Use HTTPS, secure **HttpOnly SameSite** session cookies, CSRF protection, server-side sessions and session expiration. Store password hashes with Argon2id or bcrypt; never password plaintext or SQL credentials in frontend JavaScript.
- Get the user and role from the validated server session, **never** from a request body or the demo's `currentUserId` selector.
- Enforce authorization **on every API endpoint**. Operator: GET on ordinary resources and POST `/work-orders` with only allowed ticket fields. Maintenance: read/create/update domain records and inventory movements; no user creation or deletions. Admin: Maintenance capabilities plus users and soft deletes.
- Validate all inputs server-side; use prepared SQL queries. Include centralized error handling, rate limiting, audit logging, input size limits and backups.
- Implement stock issue/return/transfer/receipt as single **database transactions**, locking relevant rows (`SELECT ... FOR UPDATE`) and checking balances before commit. Store before/after quantities, actor, WO and timestamps. Do not silently erase history.
- Ensure permission restrictions are checked when returning/exporting sensitive user data; audit access to admin-only exports.

## Suggested endpoints

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/login`, `/api/auth/logout`, `/api/auth/session` | POST, POST, GET | Sessions, server-signed user/role |
| `/api/dashboard`, `/api/reports` | GET | Server-computed summaries and exports |
| `/api/work-orders` | GET, POST | List and create; Operator POST accepts only ticket description, asset, priority, notes |
| `/api/work-orders/:id` | GET, PATCH, DELETE | Details/update, admin-only soft delete |
| `/api/work-orders/:id/parts` | GET | Stock movements associated with a WO |
| `/api/work-orders/:id/labor-entries` | GET, POST | Immutable manual labor entries with server-side hourly rate snapshot |
| `/api/work-orders/:id/downtime-entries` | GET, POST | Time and downtime entries |
| `/api/work-orders/:id/timers` | GET, POST | Start a timer for the authenticated technician |
| `/api/work-orders/:id/timers/:type/stop` | POST | Stop running session and book time, idempotently |
| `/api/assets`, `/api/assets/:id` | GET, POST, PATCH, DELETE | Equipment register |
| `/api/pm-schedules`, `/api/pm-schedules/:id` | GET, POST, PATCH, DELETE | PM recurrence management |
| `/api/pm-schedules/:id/complete` | POST | Record completion and advance next due date |
| `/api/pm-schedules/:id/generate-work-order` | POST | Create idempotent linked WO |
| `/api/parts`, `/api/parts/:id` | GET, POST, PATCH, DELETE | Part locations and master data |
| `/api/inventory/movements` | GET, POST | Auditable issue/return/receive/adjust/transfer; include optional `workOrderId` |
| `/api/purchase-requests`, `/api/purchase-requests/:id` | GET, POST, PATCH, DELETE | Purchasing workflow; receipt changes stock exactly once |
| `/api/users`, `/api/users/:id` | GET, POST, PATCH, DELETE | Admin creates, updates, archives accounts |
| `/api/audit-events` | GET | Admin audit events |

Return proper HTTP statuses (`401`, `403`, `404`, `409`, `422`) and machine-readable error codes. Use pagination and filtering for growing datasets. Make delete a soft delete with a reason and actor. Preserve foreign-key history.

## Frontend migration

Currently `CW.db` is a browser-local snapshot. The real migration is to keep the HTML/CSS/component markup but replace direct `CW.db` mutations in the page scripts with per-entity `fetch` operations via an authenticated API client. On login, hydrate page views from API responses. Do **not** blindly PUT the entire browser state to a production server: that would create role-escalation, race conditions and audit problems. Remove the role switcher in production and show the server-authorized session role.

## Scheduled PMs

The demo's **Generate Due Work Orders** button runs in the browser. In production, run a backend scheduled task that idempotently creates one WO for each due occurrence, with a unique `(pm_schedule_id, occurrence_due_date)` constraint. Calendar dates should use consistent timezone rules.

## Remaining production tasks

Implement the API endpoints, DB migrations, login / recovery, server RBAC, validation, automated tests, production audit logging, backups, monitoring, deploy pipeline, and migration/import of browser sample data (only where permitted). The supplied SQL is a starting schema, not an installed database or completed backend.

## KPI definitions and cost integrity

The frontend now has a **shared calculation engine** (`js/analytics.js`), used by both Dashboard and Reports. When replacing the browser-local demo with MySQL, implement equivalent server-side aggregation rather than using browser-submitted cost totals.

- **Work order labor cost:** sum of manual legacy hours × the historically snapshotted labor rate plus each logged labor entry × its immutable rate snapshot. The user's current rate only affects future entries.
- **Work order parts cost:** sum of inventory Issues × recorded unit price, less Returns × the original issue value. Transfers, receipts and adjustments do not count as work-order consumption.
- **Maintenance cost = labor + net parts cost**. The value is an estimate when hourly rates or unit costs are example data; overhead, depreciation and lost production are not included.
- **Purchasing received:** separate received-purchase spend. Do not add to the maintenance total because purchased stock may later be issued to a work order.
- **Downtime:** explicit recorded manual downtime and stopped downtime timers. Do not infer uptime, MTBF or true labor hours solely from a WO being In Progress.
- **Time period:** tracked entries use end date, parts use transaction date, and purchase spending uses receipt date. Legacy manual hours in the prototype may be attributed to the work order creation date where no event timestamp exists. Use timezone-aware UTC timestamps in MySQL and convert to the facility's time zone for filtering.
- **Stock valuation:** quantity × latest entered unit cost is an approximate replacement valuation, not FIFO/accounting inventory valuation.
- **Soft deletions:** hidden records remain available for historical financial/audit computations. Access filtering and audit write protection must be enforced on the server.

**Atomicity and permissions:** starting/stopping timers, completing WOs (which must close related timers and advance linked PM schedules), purchase receiving (one receipt only), and stock movements all require database transactions and idempotency. The browser's editable JS and localStorage are not production access control.
