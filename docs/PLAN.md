# Implementation plan and data model

PRD v2 and the supplied master prompt are the requirements authority.

1. Foundation: Next.js App Router, TypeScript, database migrations, secure sessions, validation and warehouse permissions.
2. Inventory: transaction service, exclusive stock buckets, ledger, idempotency, approvals, transfers and opening import.
3. Operations: orders, allocations, containers, loading, dispatch, inbound receipts, discrepancies, returns and tracking.
4. Interface: responsive operations workspace with real forms, filters, detail views, reports and administration.
5. Verification: acceptance tests, concurrency/rollback/isolation tests, typecheck, lint, production build and browser smoke tests.

Data model: users -> sessions and warehouse assignments; warehouses -> locations; products -> conversions and lots; stock balances keyed by product/location/lot/state; immutable movements -> operation references; orders -> lines -> allocations -> containers -> shipments; receipts -> receipt lines -> discrepancies; transfers and approvals -> versioned operations; shipments -> checkpoints/ETA revisions/attachments; import batches -> opening movements; alerts and audit events.

Database operations use integer fixed-point quantities (six decimal places maximum), SQLite BEGIN IMMEDIATE transactions, conditional balance updates, database uniqueness for idempotency and foreign keys. SQLite serializes concurrent writers across connections. Runtime is a single self-hosted Node application with a persistent local disk. Horizontal/serverless deployment is intentionally unsupported by this storage configuration.
