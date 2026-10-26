# Codex Master Prompt — Import and Export Management Platform

You are the lead product engineer and architect. Build a complete, production-minded MVP web application from the accompanying PRD, **Import and Export Management Platform PRD v2**. Do not build only a landing page or static mockup. Implement working authentication, role-based access, persistent data, inventory transactions, export/import workflows, tracking, reporting, tests and setup documentation.

## 1. First inspect, then plan
1. Inspect the existing repository, package manager, framework, conventions, and current implementation before changing anything.
2. If the repository is empty, choose a cohesive, well-supported full-stack TypeScript stack suitable for a transactional business app. Preferred default: Next.js App Router, TypeScript, PostgreSQL, Prisma, Tailwind CSS and a mature accessible component library. Use a managed authentication solution if already configured; otherwise implement secure server-side sessions and password hashing with a maintained library. Do not invent an external service dependency that requires credentials just to run locally.
3. Write a short implementation plan and proposed data model before major changes. Then continue implementation; do not stop after planning.
4. If requirements conflict, prioritise the PRD's inventory integrity, server-side permissions, auditability and acceptance criteria. Document assumptions in `docs/ASSUMPTIONS.md`. Ask the user only when a decision blocks safe implementation; otherwise choose a conservative default and document it.
5. Build incrementally, run migrations, lint, type-check and tests, and fix failures. Do not claim a command passed unless you actually ran it.

## 2. Required application areas
Implement these functional areas with consistent navigation and responsive layouts:
- Authentication: login, logout, password reset flow appropriate to local setup, session expiry/revocation, manager and employee roles. A role selector must never grant permissions.
- Overview dashboard: stock states by SKU/unit, ready-to-load quantities, pending dispatch, active/delayed shipments, arrivals due, receipts in progress, open discrepancies, low-stock alerts and pending approvals. Cards must navigate to correctly filtered records.
- Products and warehouses: product/SKU management, base units and precision, configured conversions, warehouses, locations, optional lots, low-stock thresholds. Archive products with history instead of deleting them.
- Inventory: searchable/filterable stock balances and append-only movement ledger; receipts, put-away, location transfers, counts and adjustment requests; manager approval before count corrections post; CSV export respecting filters and permissions.
- Export: outbound orders and lines, reservations, staging, ready-to-load view, shipments, containers, cargo lines, loading progress, manifest, configured capacity checks, documents and manager-confirmed dispatch.
- Import: incoming orders, expected lines, shipment/container linking, repeated/partial unloading sessions, accepted and blocked stock, discrepancy workflow and manager resolution.
- Tracking: manual shipment/container checkpoint events, original and revised ETAs, delay/stale indicators, event history and correction audit. Never simulate live vessel tracking or invent GPS positions.
- Orders: derived timeline, split shipment progress, expected/received/accepted/outstanding quantities and partial states.
- Documents: secure permission-controlled upload/download, allowed file types/size, upload status, scanning integration seam (safe local development behavior clearly documented), version history where appropriate. Never expose permanent public URLs for sensitive documents.
- Alerts: in-app alerts with deduplication, acknowledgement and closure/escalation state.
- Reports: filtered CSV exports for inventory, movements, ready-to-load, manifests, active/delayed shipments, incoming orders, discrepancies and fulfilment.
- Administration: users, warehouse assignments, operational settings, document checklist, alert thresholds, timezone, audit history (manager only).
- Opening-stock import: CSV template, preview, validation, duplicate/unknown SKU handling, import batch summary and auditable opening movements.

## 3. Non-negotiable inventory rules
Model physical warehouse inventory as mutually exclusive states per SKU + warehouse + location + optional lot:
`Available`, `Reserved`, `Staged`, `LoadedNotDispatched`, `Blocked`.
`OnHand = Available + Reserved + Staged + LoadedNotDispatched + Blocked`.
Do not subtract these states from one another to calculate Available. Available is the Available-state balance only. Dispatched cargo is outside warehouse on-hand.

Required transitions:
- Reserve: Available → Reserved.
- Stage: Reserved → Staged.
- Load: eligible Reserved/Staged → LoadedNotDispatched, respecting configured workflow and allocation.
- Pre-dispatch unload: reverse the appropriate loaded state through a linked compensating movement; release to the correct eligible state only after the physical action is recorded.
- Dispatch: LoadedNotDispatched leaves warehouse on-hand exactly once and becomes dispatched cargo linked to shipment/container/order lines.
- Physical receipt: increase on-hand exactly once into Available or Blocked.
- Inspection acceptance: Blocked → Available without increasing on-hand.
- Same-warehouse transfer: location balances change, total warehouse on-hand does not.
- Inter-warehouse transfer: use in-transit state until destination receipt.
- Physical return of dispatched cargo: increase stock only after a return receipt and inspection.
- A correction of a mistakenly posted dispatch is not the same as a physical return.

All stock-changing actions must:
- Run in database transactions with concurrency-safe checks/locking or conditional updates.
- Validate quantity, unit, precision, warehouse, location, lot and allocation.
- Have an idempotency key or unique business-operation reference and database-enforced uniqueness.
- Preserve the original transaction; corrections use linked reversals/compensating movements.
- Write actor, timestamp, reason, source/destination and linked business record to audit/movement history.
- Reject over-reservation/over-loading and return actionable conflict messages.
- Avoid optimistic UI that tells the user a stock operation succeeded before the server confirms it.

Add automated tests for concurrent reservation, retrying the same operation, rollback on validation failure, duplicate receipt/dispatch, blocked-stock release, transfer accounting and ledger/balance reconciliation.

## 4. Data and business logic
Use stable IDs, foreign keys and database constraints. At minimum model users/roles/warehouse assignments, warehouses, locations, products, unit conversions, lots where enabled, orders/order lines, reservations, allocations, shipments, containers, cargo lines, receipt sessions/lines, discrepancies, stock balances, stock movements, transfers, tracking events, attachments/document versions, approvals, alerts, import batches, idempotency records and audit events.

Keep statuses separated:
- Order fulfilment status
- Shipment transport status
- Container status
- Receipt status
- Last-mile delivery status (only when enabled)
The order timeline is derived from line-level posted quantities and events, not an independently editable status label. Late/out-of-order tracking events appear in history without automatically regressing current status. Split orders cannot be marked complete because only one container is complete. Completion requires all quantities fulfilled or approved residual closure, and required discrepancies resolved/closed according to policy.

All timestamps are stored in UTC and displayed in the configured organisation timezone. Quantities use explicit units and configured precision. Never add or compare incompatible units without an explicit valid conversion.

## 5. Security requirements
- Enforce permissions in server-side route handlers/actions and data-access functions; hiding buttons in the UI is not authorization.
- Scope employee reads/writes/search/export/downloads to assigned warehouses and shipments. Test IDOR attempts by changing IDs and query parameters.
- Deny by default and validate access to every referenced parent record, not only the requested child ID.
- Use secure password hashing or a maintained auth provider, secure cookies, CSRF protection where applicable, rate limiting, session expiry and revocation, and production manager MFA support or a documented enforced provider configuration.
- Validate all inputs server-side with schemas. Use parameterized ORM/database queries.
- Restrict file types and size; store files privately; verify authorization on each download; quarantine files if scanning fails. Do not trust client-provided MIME types or filenames.
- Keep audit events append-only at application level and restrict access. Do not log passwords, tokens or sensitive file contents.
- Never ship production secrets in source control. Provide `.env.example` with placeholders only.

## 6. UI/UX quality bar
Build a polished, coherent enterprise operations interface—not a generic marketing page. Use a clear left navigation/sidebar on desktop, responsive navigation on small screens, readable tables, useful filters, status badges with text labels, summary cards, detail pages, activity history, and confirmation dialogs for irreversible or stock-changing actions. Provide skeleton/loading, empty, validation, error, retry and success states. Preserve form input after recoverable errors. Ensure keyboard access, focus visibility, accessible labels and contrast. Use realistic seeded sample data clearly marked as demo data. Avoid fake integrations, fake GPS, fake success messages and dead buttons.

For every important screen, ensure actions work end-to-end against the database. Use server pagination for large lists. Exports must use the same filters and permission checks as the UI. Add useful empty states with next actions. Do not leave TODOs for core workflows.

## 7. Acceptance tests to implement
At minimum automate tests for these scenarios:
1. Employee cannot access another warehouse's records, exports or attachments by changing IDs.
2. With 100 on-hand, 20 blocked and all other states zero, Available is 80. Reserve 60 → Available 20, Reserved 60. Further reserve 21 fails without balance change.
3. Load 40 of 60 reserved → Reserved 20, Loaded 40, on-hand 100, Available 20. Dispatch 40 → on-hand 60, Loaded 0, dispatched cargo 40.
4. Retry receipt/dispatch confirmation after timeout; only one business confirmation and one set of movements exist.
5. Adjustment does not affect balances until approval; approval creates an auditable movement.
6. Expected 100, physically receive 90 accepted + 5 damaged → on-hand 95, Available 90, Blocked 5, shortage 5 and open discrepancy.
7. Accept the 5 blocked units later → Available +5, Blocked -5, on-hand unchanged.
8. Split shipment receipt leaves the overall order partial until all lines are fulfilled or residual closure is approved.
9. Add a departure event older than an arrival event; preserve chronological history and current Arrived status.
10. Two simultaneous reservations for the last available units cannot oversell.
11. Cancel reserved unshipped allocation and release reservation; cancellation after dispatch does not automatically restock.
12. Order with unresolved shortage cannot complete before approved residual closure.
13. Pre-dispatch unloading creates linked movements and restores the appropriate stock state.
14. Opening-stock import previews and rejects invalid/duplicate rows and produces auditable opening movements for accepted rows.
15. Approval fails or requires review if the record version changed since it was reviewed.
16. Physical return of dispatched cargo increases on-hand only after an authorised return receipt and inspection.
17. Dashboard and filtered details reconcile to the movement ledger by SKU, unit and state.
18. Discrepancy closure preserves the original receipt.
19. Failed/quarantined upload is not downloadable as a trusted document.

## 8. Developer deliverables
- Working source code and database schema/migrations.
- Seed script with manager and employee demo accounts; credentials documented only for local development and never used as production defaults.
- `.env.example`.
- README with exact prerequisites and commands to install, configure, migrate, seed, run, test, lint and build.
- `docs/ARCHITECTURE.md` with architecture, entity relationships and stock transaction model.
- `docs/ASSUMPTIONS.md` listing decisions made where the PRD leaves choices open.
- `docs/SECURITY.md` with authorization, upload and production-hardening notes.
- `docs/TESTING.md` describing automated and manual acceptance tests.
- CSV templates/examples for opening stock and any import workflow.
- A list of any incomplete non-core integrations and their configuration requirements.

## 9. Execution instructions
Start by inspecting the repository and reporting the existing stack. Then create/update the implementation plan and proceed to build the application. Do not stop at wireframes or a scaffold. After implementation, run available tests, lint, type-check and production build; fix errors and report exactly what passed, what did not run, and what remains incomplete. Prioritise a coherent end-to-end vertical slice (login → inventory → outbound reservation/loading/dispatch and incoming receipt → ledger/report) before polishing secondary screens. Do not silently omit a requirement: either implement it, explicitly mark it as later scope per the PRD, or document the blocker.
