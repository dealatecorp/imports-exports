# Implementation status

## Available locally

Authentication, manager/employee access, warehouse assignments, products/locations/lots/conversions, thresholds, exclusive stock states, ledger and reconciliation, count approvals, transfer accounting, opening CSV validation and posting, export orders/reservation/staging/loading/unload/dispatch, import orders/partial receipts/inspection/discrepancies, split allocations, transport checkpoints/corrections/ETA history, private scanned documents with retained versions, in-app alerts, filtered CSV reports and manager audit history.

The interface includes desktop and mobile layouts based on the supplied references, an original generated orange truck illustration, real shipment selection, capacity display, search, filtering, pagination, operation confirmation dialogs, validation and retry feedback. The truck image is an illustration; the application makes no GPS or vehicle-photo claim.

## Explicit limitations and configuration dependencies

- SQLite is the chosen local database, rather than PostgreSQL/Prisma. Single host with persistent disk only; multi-instance deployment requires migration and concurrency retesting.
- Employee assignment is warehouse-based. All shipments in assigned warehouses are accessible. Finer per-shipment employee restrictions are not yet implemented.
- Product setup supports creation and archival; operational identifiers and unit definitions with history are intentionally not freely editable. Broader master-data editing requires additional versioned forms.
- Discrepancy resolution currently uses Open/Closed plus manager decision/audit, rather than the optional five-step proposed lifecycle. Wrong-item receipts must be mapped to an existing SKU before posting; a separate wrong-item capture wizard is not present.
- Core alert conditions are persisted and deduplicated, with acknowledgement, closure and manual escalation. Recipient-specific routing and time-based escalation schedules are not configured.
- Scan integration is configurable but no scanner is installed by this project. Missing/failed scans quarantine uploads. Production mail delivery is not configured; local resets use the private outbox.
- Mandatory manager MFA is enforced when `APP_PRODUCTION=true`. Configurable separation of duties, automated backup jobs, retention enforcement and nonce-based CSP hardening remain production preparation work.
- Opening-stock preview reports invalid rows and rejects the whole batch. The UI does not yet offer a separate downloadable error-report file.
- Order timelines show quantity/checkpoint progression. A fully timestamped customer-style timeline and standalone last-mile delivery are not implemented; last-mile/customer access is outside agreed MVP scope.
- Full performance/SLA/RPO/RTO certification and operational sign-off remain pending.

## Later scope from the PRD

Customer portal, carrier/AIS automation, payment/accounting/customs integration, barcode scanning, offline posting, mobile-native apps, IoT and multi-organisation tenancy. No fake integrations or live vessel positions are displayed.

## UI asset provenance

The desktop and mobile posts were viewed through the user's authorised Brave session. Their layout and visual treatment informed the implementation; copyrighted post images were not embedded as the app interface. `public/container-truck.png` is an original asset created with the built-in image-generation tool. Prompt: photorealistic side-profile European semi truck, white cab on the right, vivid orange corrugated shipping container, full vehicle, soft studio lighting, transparent background, no logos/text/people/UI.


## Order workspace update — 26 October 2026
- New orders start at `/orders?new=1`; after saving, the same workspace contains items, routes, containers, loading, documents, updates and receiving issues.
- Separate Shipments navigation removed; legacy shipment URLs lead to connected orders. Shipment records remain as internal transport records to preserve split/shared cargo relationships.
- Explicit order/transport links persist before the first allocation; existing links are inferred from saved allocations.
- Dashboard selectors are orders, with all connected containers and whole-order progress.
- `/receiving` lists orders whose active assigned containers are Unloaded or Handed over. Inline checkbox confirms all remaining items are received in good condition; stale reviews and duplicate receipts are rejected.
- Export sending is Sent, not Completed. Confirmed delivery completes exports without adding stock; import receipts add accepted stock exactly once. Status and progress share the completion rule.
- Fully sent/received quantities lock new order items and containers. Partial orders retain their outstanding workflows.
- Reused existing ActionForm and visual tokens. 21st catalog search returned booking/payment forms, which did not fit this workflow; no catalog source was added.
