# Security and operating controls

## Implemented

- Bcrypt password hashing with cost 12; no role selector grants permissions.
- Random opaque sessions stored only as SHA-256 digests in the database; eight-hour expiry; HttpOnly and SameSite Strict cookies; Secure cookies in production mode.
- Request-origin and session CSRF checks for mutations. Server authorization gates warehouse records, search, exports and private document downloads.
- Account deactivation and warehouse-access changes revoke affected sessions. Password reset revokes all sessions and consumes all outstanding reset tokens.
- Persistent per-account login throttling and reset throttling. Add IP/edge rate limiting before public exposure; never trust arbitrary forwarded headers without a configured proxy.
- Manager TOTP enrollment verifies a code and current password; secrets are AES-256-GCM encrypted with a server key. Previously used TOTP time steps are rejected.
- PDFs and images require matching filename and file signatures, a size under 10 MB and a successful scanner result. Private filesystem names are generated UUIDs. Download routes check current access and scan state. Restricted invoices can be manager-only.
- Immutable application audit and stock history, parameterized SQL, schema validation, safe integer arithmetic and CSV formula neutralization.

## Production configuration

Run behind an HTTPS reverse proxy and set `APP_PRODUCTION=true`, `APP_ORIGIN=https://your-domain`, and `MFA_ENCRYPTION_KEY` to 64 securely generated hexadecimal characters. Keep the server bound to loopback behind that proxy. Production manager login requires an enrolled authenticator. Set the key and enroll each manager while the instance is accessible only to the operator, then enable production mode. Do not use demo accounts.

Create an initial manager on an empty database with `INITIAL_MANAGER_EMAIL`, `INITIAL_MANAGER_PASSWORD` and optionally `INITIAL_MANAGER_NAME` in the shell, then run `npm run user:create-manager`. Remove these temporary variables immediately. Subsequent accounts use authenticated administration.

`SCAN_COMMAND` is an absolute path to a trusted executable accepting one file path argument. Exit status zero means clean; errors/timeouts/nonzero exits quarantine the document. It runs without a shell and with a 60-second timeout. Configure a real scanner such as an approved antivirus wrapper, not an always-success stub. Quarantined uploads must be rescanned externally and reuploaded; there is deliberately no “trust anyway” action.

Password reset works locally via private files under `data/reset-outbox`. Tokens expire in 15 minutes and are not returned by the HTTP API. Production reset requests return an explicit unavailable response until an authenticated email adapter is added. Do not expose the local outbox via a static web directory.

## Required before public launch

Configure TLS, firewall, proxy body limits and IP rate limits; protect the data directory and encryption key using OS permissions; define audit/file retention and backups; review attachment scanner isolation; perform security review and restore testing. Review and tighten the CSP for production: the current policy permits inline scripts/styles for Next.js and eval for development tooling. A nonce-based production policy is a hardening task.

A single SQLite process is not a substitute for an approved production data-residency or multi-instance database design. SLA, RPO, RTO and load targets have not been certified. Manager self-approval is allowed by the chosen MVP policy; configurable separation of duties is not implemented.
