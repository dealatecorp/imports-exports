# Import and Export Management Platform

Product Requirements Document

Version 1.0  |  26 October 2026  |  Proposed scope for product review

### Product purpose

Build a web application that gives an import and export organisation a shared view of warehouse stock, container loading, incoming cargo and order delivery. Managers control operations and approvals; employees record day-to-day warehouse and shipment activity. Two connected panels cover Export Operations for loading and dispatch, and Import Operations for arrival and unloading.

### The operating problem

Warehouse quantities, container contents and shipment updates must remain consistent across teams. A shipment leaving the warehouse must reduce the correct stock once, and an arriving shipment must increase stock only after receipt. Users need to see what is available, what is committed, where cargo was last confirmed and what action is required next.

### Intended readers and decisions

This document supports the organisation owner, operations managers, designers, developers and QA team. It defines the proposed first release, operational rules and acceptance criteria. The business owner should confirm the decisions on the final page before implementation estimates are committed.

### Product outcomes

- Maintain traceable inventory balances across warehouses and storage locations.

- Load and dispatch containers with verified item quantities and a complete manifest.

- Receive imported cargo with clear shortage, damage and overage handling.

- Show an ecommerce-style order timeline linked to shipment and container details.

### Scope convention

All numbered requirements in this document are proposed MVP requirements unless explicitly marked as later scope. The phrase “items importing” within the loading panel is represented as “Loading and Dispatch.” Ocean checkpoints represent recorded events; they do not imply continuous GPS tracking.

## 1 Users permissions and navigation

### Login and access

AUTH 01 — Provide manager and employee login entry points backed by one identity system. The assigned account role determines permissions; selecting a login tab cannot grant access. Support password reset, logout, account deactivation and session expiry. Managers create or invite employees and assign warehouses and operational responsibilities.

| Capability | Manager | Employee |
| --- | --- | --- |
| View dashboards and records | All authorised operations | Assigned warehouses and shipments |
| Products and warehouse setup | Create and edit | Read |
| Receipts transfers and loading | Create and confirm | Record assigned operations |
| Manual stock corrections | Approve or reject | Submit with reason |
| Dispatch and exception closure | Approve and confirm | Prepare and submit |
| Tracking and unloading events | Record and correct with audit | Record assigned events |
| Users reports and audit history | Manage and view | Limited operational history |

AUTH 02 — Enforce permissions on every server request, including exports and attachments. Employees cannot read unrelated warehouse records by changing a URL or record identifier. Manager-created stock corrections require a reason and an audit entry; a second approver is a future policy option.

### Primary navigation

- Overview: operational summary, pending approvals and alerts.

- Export Operations: Ready to Load, Loading and Dispatch, Outbound Shipments.

- Import Operations: Incoming Orders, Shipment Details, Unloading and Receiving.

- Shared modules: Warehouse Inventory, Products, Warehouses, Reports and Settings.

### Dashboard requirements

DASH 01 — Show warehouse on-hand, available, reserved and blocked quantities by SKU and unit; ready-to-load allocations; containers awaiting dispatch; active shipments; delayed shipments; arrivals due; and unresolved discrepancies. Do not combine incompatible units into one inventory quantity.

DASH 02 — Every card opens the matching filtered records. Support warehouse, import/export direction, status and date filters. Display the selected timezone and last refresh time. Employees see only authorised data; managers see pending approvals and workload by warehouse.

## 2 Warehouse inventory and stock integrity

### Stock definitions

INV 01 — Track every SKU by warehouse, location and optional lot. On-hand includes available, reserved, staged, loaded-but-not-dispatched and blocked stock. Available equals on-hand minus reserved, staged, loaded-but-not-dispatched and blocked quantities. These buckets must be mutually exclusive. Dispatched cargo is tracked separately from warehouse on-hand.

The Ready to Load screen is a filtered operational view of approved outbound allocations. It is not a second inventory balance. Imported stock becomes available only after receipt and acceptance; damaged or uninspected receipts remain blocked.

### Manual warehouse updates

INV 02 — Allow employees to record receipts, put-away, location transfers and stock counts with SKU, quantity, unit, warehouse, location, date and notes. Each correction creates an adjustment request with old quantity, counted quantity, difference, reason and optional evidence. Apply the correction only after manager approval.

INV 03 — Maintain an append-only movement ledger with movement type, signed quantity, source and destination, reference record, actor and timestamp. Correct posted mistakes using linked reversals or compensating movements. Do not overwrite or delete the original transaction.

### Inventory validation

- Reject zero or negative movement quantities and unsupported units. Store quantities at the configured SKU precision; do not mix pieces, kilograms and cartons without an explicit conversion.

- Prevent reservations and loading beyond available or allocated quantities. Use transactional updates so concurrent users cannot allocate the same stock twice.

- Repeated confirmation requests must create only one stock movement. Show a clear success or validation message, and preserve entered data after recoverable errors.

- Transfers within a warehouse change location balances without changing total stock. Transfers between warehouses use an in-transfer state until destination receipt.

- Keep products with transaction history archived rather than deleted. Require a SKU, product name and unit before any stock movement.

### Warehouse inventory screen

INV 04 — Provide search by SKU and product name; filters by warehouse, location, lot and stock state; and columns for on-hand, available, reserved, staged, loaded and blocked. A product detail view shows movement history and linked orders. Managers can export the filtered list as CSV and configure low-stock thresholds by warehouse and SKU.

## 3 Export loading and dispatch

### Outbound workflow

Create outbound order → reserve stock → stage for loading → allocate to containers → confirm loading → manager dispatch → record transport milestones → confirm handover or delivery.

EXP 01 — Create an outbound order with consignee, origin warehouse, destination, required date and SKU quantities. One order may be fulfilled across multiple shipments, and a shipment may contain multiple orders. Every loaded line must reference its order line and stock source.

EXP 02 — Ready to Load lists approved quantities awaiting loading with SKU, warehouse, location, order, reserved quantity, loaded quantity and remaining quantity. Employees can stage and load partial quantities. Cancelling an unshipped allocation releases stock; loaded stock must be unloaded through a recorded reversal before release.

### Containers and cargo manifest

EXP 03 — Create shipment and container records. Capture container number, type, seal number where applicable, carrier, vessel and voyage when known, departure and destination ports, planned departure and arrival, shipment type and assigned employees. Shipment type includes full-container, less-than-container or other configured cargo classification.

EXP 04 — Allocate SKU quantities, lots, package counts, weight and volume to each container. Show planned and actual contents, container count and loading progress. Compare known weight and volume with configured limits and block dispatch when a configured limit is exceeded. Missing measurements must be visible; unsupported capacity checks must not appear as passed.

### Dispatch control

EXP 05 — Before dispatch, validate the manifest, loaded quantities, required container identifiers, origin and destination, and the organisation’s configured document checklist. The manager confirms dispatch with an actual timestamp. Confirmation removes loaded quantities from warehouse on-hand exactly once and marks them as dispatched cargo.

EXP 06 — Prevent ordinary edits to dispatched quantities. Route corrections through a manager-approved exception with linked stock movements when applicable. Cancelling a dispatched shipment must not automatically restock cargo that has not physically returned.

### Operational documents

EXP 07 — Store attachments such as packing lists, invoices, bills of lading and loading photos against the shipment or container. Show document type, upload time and uploader. Generate a downloadable manifest of containers and cargo. Document requirements are configurable operational checks; customs filing and regulatory validation are outside MVP.

## 4 Import unloading and order tracking

### Incoming workflow

Register incoming order → link shipment and containers → track transport → record arrival → unload and inspect → receive accepted stock → resolve discrepancies → confirm delivery or close the order.

IMP 01 — Register incoming orders with supplier, receiving party, destination warehouse, expected SKU quantities, expected arrival and reference numbers. Link each order line to one or more shipment/container allocations. Preserve expected, received, accepted, damaged and outstanding quantities separately.

### Shipment details

IMP 02 — Display shipment reference, carrier, vessel and voyage when known, origin and destination ports, planned and actual dates, container count, container numbers and types, shipment type, commodity descriptions, package counts, weight, volume, seal details, attached documents and latest confirmed checkpoint. Container count is derived from linked container records.

### Unloading and receipt

IMP 03 — Employees record unloading per container and item, with actual quantity, condition, storage location, timestamp and optional evidence. Support partial unloading and repeated receipt sessions. Receipt increases warehouse stock once; accepted stock becomes available and damaged or pending-inspection stock becomes blocked.

IMP 04 — Compare actual receipt with expected quantities. Create a discrepancy for shortages, damage or overages. Managers approve overages and resolve discrepancies with an outcome and notes. Shortages remain outstanding until received or explicitly closed with an approved reason. Unknown products require a mapped SKU before inventory posting.

### Ecommerce style order timeline

ORD 01 — Provide a simple stepper: Confirmed → Preparing → Shipped → In Transit → Arrived → Receiving → Completed. Show completed step timestamps, the current step, estimated next milestone, latest update and any delay. Show Out for Delivery and Delivered only when last-mile delivery is tracked.

ORD 02 — An order detail page lists items, ordered and received quantities, linked shipments, containers and outstanding items. Split shipments have separate timelines and ETAs. Display Partially Received or Partially Delivered where appropriate; one completed container cannot mark the entire order complete.

ORD 03 — MVP order tracking is available to authorised internal users. A customer portal or secure external tracking link is later scope. Visual familiarity with ecommerce tracking does not include shopping, checkout or payments.

## 5 Shipment events and status rules

### Checkpoint tracking

TRK 01 — Support configurable checkpoints such as origin warehouse dispatch, origin port, vessel departure, transshipment port, ocean waypoint, destination port, unloading and final handover. Each event contains shipment/container scope, event type, location, event time, recorded time, source, actor and notes. Store coordinates only when supplied.

TRK 02 — MVP tracking uses manual updates from authorised employees and managers. Display the last confirmed location, source and update time. A route map is optional; if shown, label planned routes separately from confirmed positions. Never animate or infer live vessel positions from elapsed time.

TRK 03 — Preserve the original ETA and record revised ETAs with reason and history. Highlight overdue milestones and stale updates using manager-configured thresholds. A delay or hold is an exception indicator and does not erase the underlying transport stage.

| Record | Normal progression | Completion rule |
| --- | --- | --- |
| Outbound cargo | Draft → Reserved → Staged → Loaded → Dispatched | Dispatch confirmed and stock posted once |
| Transport | Planned → Departed → In Transit → Arrived | Arrival supported by a recorded event |
| Inbound receipt | Expected → Unloading → Partially Received → Received | All expected quantities received or variance closed |
| Order | Open → In Progress → Partial → Completed | All lines fulfilled or approved residual closure |

### Corrections and exceptions

TRK 04 — Validate transitions and retain a full event history. Late or out-of-order events may be added to history without automatically regressing the current status. Managers may correct or invalidate an event with a reason; keep both original and corrected records. Container-specific events affect only the linked cargo; shipment-wide updates must show their scope.

TRK 05 — A shipment may have mixed container states. Summaries show counts by state and partial progress. Received, delivered and completed quantities are computed from line-level records rather than an editable summary label.

### Notifications and future integrations

TRK 06 — Provide in-app alerts for low stock, pending approval, delays, arrival, discrepancies and stale tracking. Link alerts to records, deduplicate repeated alerts and allow acknowledgement. Email, SMS and messaging channels are later scope.

Later scope — Integrate carrier or maritime tracking feeds after provider selection and coverage validation. Normalise provider events, deduplicate callbacks, retain source identifiers, retry failures and distinguish reported position from estimated position. Provider availability, cost and refresh frequency remain delivery dependencies.

## 6 Data reporting and quality requirements

### Core data relationships

DATA 01 — Use stable identifiers for users, roles, warehouses, locations, products, lots, orders, order lines, allocations, shipments, containers, cargo lines, stock movements, receipts, discrepancies, tracking events and attachments. An allocation connects an order line to cargo quantities, a shipment and a container. Prevent orphaned references and duplicate active container assignments.

DATA 02 — Require explicit units for quantities, weight and volume. Store timestamps in UTC and display them in the organisation’s configured timezone with the timezone visible where needed. Use unique internal references even when external booking or bill-of-lading numbers are reused.

### Reports

REP 01 — Managers can filter and export inventory balances, stock movements, ready-to-load quantities, container manifests, active and delayed shipments, incoming orders, receipt discrepancies and order fulfilment. Exports must match the applied filters and permissions. Include generation time, timezone and units.

### Security and reliability

- NFR 01 — Enforce server-side role and warehouse access, encrypted transport, secure password storage or a managed identity provider, session expiry and rate limits on login. Require manager MFA for production launch.

- NFR 02 — Audit sign-in relevant security events, role changes, approvals, stock postings, dispatch, receipts and tracking corrections. Record actor, time, action and affected entity; audit records are not editable through the application.

- NFR 03 — Validate file size and type, scan uploads before access and use permission-controlled downloads. Avoid exposing documents through permanent public URLs.

- NFR 04 — Use atomic stock transactions, duplicate-request protection and conflict messages. Refresh changed records before allowing a stale edit to overwrite operational data.

- NFR 05 — Proposed service targets: 99.5% monthly availability, recovery point within 24 hours and recovery time within 4 hours. Schedule backups and verify restoration before launch; targets require infrastructure approval.

### Performance and usability

NFR 06 — Proposed load-test baseline: 50 concurrent users, 10 warehouses, 10,000 SKUs and 100,000 stock movements. At this baseline, 95% of common list/detail requests should complete within 2 seconds and stock confirmations within 3 seconds, excluding file transfer and external providers. Use pagination and indexed search.

NFR 07 — Support desktop and tablet warehouse workflows and mobile order tracking. Provide keyboard operation, visible focus, labelled fields, readable contrast and status text independent of colour. Include loading, empty, error and retry states. MVP requires an internet connection; offline posting is later scope.

## 7 Acceptance criteria and release validation

The following scenarios form the minimum business acceptance suite. QA must also test permission failures, invalid inputs, partial completion, retries and concurrent updates across both panels.

| ID | Scenario and pass condition |
| --- | --- |
| AC 01 | An employee requests another warehouse record or export by identifier. Access is denied and no restricted content is returned. |
| AC 02 | With 100 units on-hand and 20 blocked, reserve 60 units. Available becomes 20. A second request to reserve 21 units fails without changing balances. |
| AC 03 | Load 40 of the 60 reserved units. Reserved becomes 20, loaded becomes 40, on-hand remains 100 and available remains 20. Dispatch the 40 units: on-hand becomes 60 and loaded becomes zero. |
| AC 04 | Retry the same dispatch or receipt confirmation after a timeout. Exactly one stock movement and one business confirmation exist. |
| AC 05 | An employee submits a stock correction. Balances remain unchanged until approval; approval records the difference, actor, reason and audit history. |
| AC 06 | For 100 expected units, receive 90 accepted and 5 damaged. Post 95 on-hand, including 5 blocked, and keep a shortage of 5 outstanding with an open discrepancy. |
| AC 07 | Split an order across two containers. Receive one container; show partial progress, its actual receipt and the other container’s ETA. Do not complete the order. |
| AC 08 | Add an older departure event after an arrival event. Both appear in chronological history; the current status remains Arrived. |
| AC 09 | Cancel a reserved but unshipped allocation. Release its reservation. Cancellation after dispatch does not create warehouse stock. |
| AC 10 | Two employees reserve the last available units simultaneously. Only valid quantities commit; total reservations never exceed eligible stock. |
| AC 11 | Import and export dashboards reconcile with filtered detail pages and the movement ledger. Quantities remain grouped by compatible units. |
| AC 12 | Complete an order with an unresolved shortage. Completion is blocked until receipt or manager-approved residual closure is recorded. |

### Launch gate

All acceptance scenarios pass; no unresolved critical stock-integrity or access-control defects remain. Complete a restore drill, approved opening-stock reconciliation, manager and employee training, and end-to-end testing from outbound reservation to dispatch and from incoming order to receipt. Operations signs off the configured milestones and document checklist.

## 8 Delivery scope and business decisions

### Release sequence

- Foundation: confirm workflows and data definitions; design navigation and role permissions; create product, warehouse and user records; validate opening-stock import or entry.

- Inventory and export: deliver movement ledger, manual updates and approvals, ready-to-load allocations, container loading, manifests and dispatch.

- Import and visibility: deliver incoming orders, unloading and receipts, discrepancy handling, manual checkpoints, timelines, dashboards and reports.

- Pilot and launch: test with one operational team and representative shipments, reconcile inventory, resolve launch defects and roll out to the remaining warehouses.

Each stage must satisfy its applicable acceptance criteria before the next operational rollout. Calendar estimates require team capacity, integration decisions and validated data volumes.

### Later scope

Carrier and AIS integrations; customer self-service tracking; barcode or QR scanning; offline warehouse work; purchase and sales accounting; invoicing and payments; customs filing; IoT sensors; advanced route optimisation; mobile apps; and multi-organisation SaaS tenancy. These additions need separate requirements and estimates.

### Decisions required before implementation

| Decision | Proposed starting position |
| --- | --- |
| Organisation and access | One organisation with multiple warehouses; managers define employee assignments. |
| Tracking audience | Internal manager and employee tracking first; confirm whether customers need launch access. |
| Ocean checkpoint source | Manual events for MVP; select provider and budget if automatic tracking is required at launch. |
| Stock ownership | Track operational warehouse custody; confirm consignment and customer-owned stock requirements. |
| Receipt and delivery completion | Warehouse receipt completes inbound fulfilment unless last-mile delivery is explicitly in scope. |
| Product complexity | Confirm lot, expiry, serial number, hazardous cargo and unit-conversion requirements. |
| Operating policy | Confirm approval rules, mandatory documents, timezone, retention period and delay thresholds. |
| Migration and scale | Confirm warehouse count, user count, opening balances, existing spreadsheets and import format. |

### Success measures

During the pilot, measure physical-count variance by SKU, time from receipt to inventory posting, percentage of shipments with current tracking, unresolved discrepancy age and time to find an order’s current status. Establish the baseline in the first two weeks, then agree improvement targets. Stock-changing actions must always retain an actor and traceable reference.
