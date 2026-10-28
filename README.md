# ColonialWebb-CMMS
ColonialWebb CMMS — Frontend Prototype
A self-contained maintenance-management website for demonstrating a Maximo-style CMMS tailored to ColonialWebb.

Start here
Extract the entire ZIP file (keep all folders together).
Double-click index.html to open the dashboard in a web browser, or open the folder in VS Code and use Live Server.
Click the tabs in the sidebar. Each tab is a separate HTML file.
To host on GitHub Pages, upload the complete contents of this folder to the root of your repository, then enable GitHub Pages under Settings > Pages.
No packages, npm, installation, build, account or backend are required.

File map
File	What you edit
index.html	Dashboard layout
work-orders.html	Work Orders layout
assets.html	Assets layout
maintenance.html	Preventive Maintenance layout
inventory.html	Inventory layout
purchasing.html	Purchasing layout
calendar.html	Maintenance Calendar layout
reports.html	Reports layout
team.html	Team page layout
settings.html	Settings layout
css/styles.css	Shared fonts, layout, colors, mobile styles
js/seed.js	Example names, equipment, stock, PMs and work orders
js/store.js	Shared browser data and save/load functions
js/app.js	Sidebar, topbar, dialogs and common helpers
js/pages/*.js	The behavior for each corresponding HTML tab
Key features
Dashboard with figures derived from entered records.
Work orders: create, search, edit, assign, change status, log labor and downtime, optional equipment links.
Asset register with status, serial number, run hours, notes, and related work orders/compatible parts.
Recurring preventive maintenance schedules and completion log.
Inventory with part number, locker, bin, cost, minimum and maximum stock, and stock status.
Multiple locker/bin locations for the same part number.
All demo technicians can receive, issue, return, transfer, and adjust parts, with timestamped transactions.
Work order reference when issuing/returning parts is optional.
Purchasing: request, order, receive; receiving linked parts adds stock automatically.
Calendar, reports, staff profiles, CSV exports, light/dark theme, JSON backups.
Mobile-friendly layout and no outside dependencies.
Important: names seem stuck after editing the code?
The first time you open the site, js/seed.js initializes browser data. Afterward, the app loads saved localStorage data instead of recreating sample values. If you change seed names, open Settings > Reset All Demo Data. Reset deletes everything saved in that browser, so export a backup first if necessary.

This version uses the storage key colonialwebb_cmms_v3 to avoid old sample data from the earlier single-file prototype.

What is not included yet
There is NO authentication, no shared database, no server-side security, no simultaneous multiuser syncing, and no secure audit trail. The Acting as dropdown is just for testing. Browser storage is specific to one browser/device; GitHub Pages will host the site but will NOT synchronize anybody's information. Do not store actual confidential facility or personnel information in the public demo.

For production, connect the pages to a backend with authentication, access control, database storage, audit logs, and backups.

Screenshots
See previews/dashboard.png and previews/inventory.png for reference screenshots. They are not required for the website to run.
