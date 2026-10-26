# Verification

Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` from the project root. Tests use separate in-memory databases; the concurrency test uses a temporary database and two real child processes. They do not reset the working demo database.

## Acceptance coverage

The automated suite covers PRD AC01–AC20: warehouse isolation, stock-state arithmetic, loading/dispatch, duplicate retries, adjustment approval, partial receipts, blocked inspection, split orders, chronological tracking, concurrent reservations, cancellation, residual closure, pre-dispatch unload, opening-import rejection, stale count approvals, physical returns, ledger reconciliation, attachment authorization, immutable receipts and quarantine.

Additional tests cover invalid units and precision, lot and parent-record validation, transfers, required documents, dispatch correction, immutable database triggers, alert deduplication, CSRF, absent sessions, a TOTP reference vector and ordinary-object database serialization for React forms.

## Browser checks

The manager sign-in and overview were verified against the running server. Desktop and 390-pixel mobile screenshots were inspected. After the reported SQLite serialization error, the shared adapter was corrected and the export form was opened successfully at mobile width. Inventory, products, imports, shipments, approvals, reports, warehouses, discrepancies, tracking, users and settings were checked for rendered page headings.

## Operational acceptance still required

Use representative customer data to verify units, opening counts, warehouse assignments, loading and receiving policies. Test all end-to-end workflows with real operators, assistive technology, scanner integration and the chosen production authentication/reset setup. Run the specified 50-user/10-warehouse/10,000-SKU benchmark on the intended host. Conduct and time a complete backup/restore drill. Passing local unit and browser checks does not certify these operational targets.

For a manual smoke test: sign in as the employee, confirm Chennai is absent, submit a count without changing balances, then approve as manager. Create an export order, allocate eligible stock, load, review manifest and dispatch. Create an incoming order, receive 90 accepted and 5 blocked against 100 expected, inspect blocked goods, resolve discrepancies and verify quantities in the ledger and report. Retry a submitted operation with its original idempotency key and confirm it does not post twice.
