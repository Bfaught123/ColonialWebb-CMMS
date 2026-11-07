# Demo test checklist

1. Load `index.html` through VS Code Live Server. Confirm dashboard, sidebar and all 10 HTML pages load without console 404s.
2. At top, switch to **Operations User (Operator)**. On Work Orders, click **Submit Ticket**; fill in a description and submit. On an existing WO, click **View** and verify its fields are disabled. Verify Add Part, inventory actions, PM completion, editing, user management and delete buttons are absent.
3. Switch to **Technician One (Maintenance)**. Edit a WO and confirm it saves; open **Parts**, select a locker/bin and issue one unit. Inventory should decrease immediately. Return it from the WO and confirm stock goes back up. Completing the WO should not change stock again.
4. On Inventory, add a part at a new locker/bin, receive it, transfer it and adjust quantities. Transaction history should show movements and actor.
5. On PMs, create a schedule, generate its work order, log completion and see the due date advance. Use **Generate Due Work Orders** for overdue occurrences.
6. On Purchasing, create a request and mark it Received once. Stock increases once; reopening a received request is read-only.
7. Switch to **Maintenance Admin (Admin)**. Create or edit a user, change its role, delete an unused WO, PM and asset, and verify they disappear from active lists. Try deleting a stocked inventory location; it should require quantity zero first.
8. As Admin, export JSON in Settings. Import and Reset are destructive actions; confirm backups first. Use Activity & Audit History to see deletions and stock movement records.
9. Refresh each page and confirm changes persist in the same browser, but are not visible in another browser/device without importing a backup.
10. Do not use real credentials in this demo; the user dropdown does not authenticate anyone.

## Automated analytics regression checks

11. Work Orders → **Time** → start/stop Labor. Recorded hours and labor costs should increase on that WO and in Dashboard/Reports; refresh between starting/stopping to verify the timer survives page loads.
12. Start/stop Downtime. Only recorded downtime hours should increase; **do not** automatically count elapsed In Progress time as labor.
13. Issue two parts from a specific locker/bin against a WO. Note the WO Parts Cost and inventory count, then change that part's unit price. Historic WO cost must remain unchanged. Return one: stock and the net WO cost must update.
14. Change a team member's hourly rate after logging time. Earlier logged entry costs must remain unchanged, future entries use the new rate. Configure the default rate in Settings.
15. Mark a linked PM WO Completed: confirm PM nextDue advances only once, and no duplicate PM completion appears. Receiving a purchase should change inventory/Received Purchase spend, **not** labor+parts maintenance cost by itself.
16. Compare Dashboard → All Time and Reports → All Time for labor cost, parts cost, maintenance cost, and downtime. They should agree. Export Cost Entries CSV and compare the component events.
