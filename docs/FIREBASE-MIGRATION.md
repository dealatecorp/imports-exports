# HarborTrack personal demo

Live URL: https://harbortrack-imports-exports.vercel.app
Staff login: /login. Customer login: /customer/login.

## Deployment

Vercel project: dealate/harbortrack-imports-exports, owned by dealatecorp@gmail.com on Hobby.
Firebase project: harbortrack-imports-exports. Database: (default), STANDARD, Mumbai (asia-south1).
Vercel functions run in bom1. No billing upgrade was enabled.

The initial migration copied 7 staff accounts, 1 customer and 10 orders. Existing account IDs, password hashes, roles and warehouse assignments are preserved. Sessions were cleared only in the cloud copy, so users sign in again with the same credentials. The local SQLite source remains unchanged.

## Storage and limits

This small personal-demo adapter stores a compressed private database snapshot in Firestore and restores isolated in-memory SQLite per request. Existing server permissions, inventory validation and bcrypt authentication remain in use. It does not use Firebase Authentication. Transactions compare the saved revision to reject conflicting updates instead of overwriting them; rejected commits do not send login cookies or upload files.

The database has an 850 KB compressed / 32 MB uncompressed limit. Uploaded documents are limited to 1 MB online (10 MB locally) and stored in private Firestore chunks, atomically with their attachment records. Files remain quarantined unless a configured scanner marks them clean. This is a demo architecture, unsuitable for a large or busy deployment. Firebase and Vercel free-tier quotas apply.

Firestore rules deny all direct client reads/writes. The dedicated harbor-demo-server service account has roles/datastore.user in this Firebase project only. Its credential and MFA encryption key are sensitive Vercel production environment variables. Secrets, database files, exports and local deployment metadata are Git-ignored. Review rules and server authorization before broader use.

## Operations

Deploy from this linked workspace with `vercel deploy --prod --scope dealate --yes` after tests/build pass. Keep DATABASE_BACKEND=firestore and FIREBASE_PROJECT_ID configured on Vercel. APP_PRODUCTION stays false for demo payments and unchanged demo manager login; Vercel still uses Secure cookies. Use the canonical live URL for CSRF origin validation.

`scripts/migrate-cloud.ts` defaults to a dry run and requires --apply to write. It refuses any existing cloud state, so it must not be used to overwrite the live database. `data/cloud-deployment/service-account.json` is an ignored local deployment credential; never commit or share it.

Local and online data are now separate. New changes made locally after migration are not automatically synchronized to the live demo.
