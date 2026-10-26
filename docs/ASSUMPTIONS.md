# Decisions and assumptions

- One organisation; internal users; warehouse receipt completes inbound fulfilment; no last-mile delivery.
- This empty workspace has Node 24 but no running Docker/PostgreSQL service. Use Node's built-in SQLite database for a credential-free, durable local application. This is a deliberate departure from the preferred PostgreSQL/Prisma default. Migrate and retest the transaction layer on PostgreSQL before multi-instance deployment.
- All quantities are represented as integer micro-units, with product-specific precision from zero to six decimal places. Inputs must be strings, never binary floating point arithmetic.
- Managers may approve their own routine actions; warehouse assignment scopes employees. Document financial visibility may be manager-only.
- Optional lots supported; no serial/expiry/hazardous handling. Manual transport events only.
- Blocking uploads remain quarantined unless an external malware scan command reports success; no development auto-trust. This means secure document downloads and dispatch document gates require a scanner configuration.
- Production manager MFA uses TOTP. Production refuses startup without HTTPS origin and an encryption key for TOTP secrets. Local reset links are written to a private local outbox; production reset delivery requires an authenticated mail adapter before enabling reset requests.
- Interface direction: light neutral operations console, dark navy sidebar, teal actions, dense accessible tables. 21st catalog lookup failed due to connectivity; no catalog code reused.
