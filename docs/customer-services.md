# Customer services

Customers register or sign in at `/customer/login`, then book and track orders at `/customer`. Staff see bookings at `/customer-orders` and in the overview. Paid demo bookings use the existing order workspace for shipping details, containers, items and progress.

Demo account: `customer@harbor.local`, password `HarborDemo!2026`. Its phone is a placeholder and WhatsApp consent is off, so it cannot accidentally receive messages. Every new booking requires a WhatsApp number with country code and offers an order-specific updates checkbox. Staff drafts use that booking number and preference. Existing bookings retain their previous account contact as a fallback.

## Prices and checkout

Illustrative route rates are in `lib/customer-pricing.ts`. Prices include a route fee, separate weight and space charges, item-group handling per unit, import processing, package handling, optional fragile/chilled handling, and priority service. The server calculates and stores the quote. Quotes expire after 24 hours. Real taxes, customs and carrier quotes are excluded.

Checkout simulates success, decline or cancellation. It collects no payment credentials and transfers no money. Successful retries cannot create duplicate orders. Demo checkout is disabled when `APP_PRODUCTION=true`; a real payment provider is required for actual charges.

## Customer updates and manual WhatsApp

Order changes create dashboard updates inside the same transaction. Customers can view only their own bookings and their own items inside shared containers. The dashboard refreshes automatically.

Staff have a **Send WhatsApp update** link after supported changes and in the order's customer updates section when the customer opted in. It opens the customer's chat with a prepared message. Staff review it and press Send in WhatsApp themselves. Opening a draft is never recorded as successful delivery.

Staff must sign in to WhatsApp or WhatsApp Web using **7981456043**. Click-to-chat cannot select or enforce the sender account. There is no WhatsApp Business API integration and no automatic message sending.

## Validation

47 automated tests passed, including customer session isolation, booking ownership, server-side pricing, payment retries, staff allocation and customer update drafts. TypeScript, ESLint and the production build passed. Browser checks covered customer sign-in, quote creation, declined checkout, successful retry, staff order listing and the order management link. Browser testing created two clearly identified demo customer orders; no existing operational orders were changed.

Live demo estimates use demo-rates-v2 and recalculate for route, direction, weight, space, packages, item groups, quantities, handling and service speed. Needed-by dates and contact details do not affect rates. Saved and paid quotes retain their original version and amount; submitting a changed booking form creates a new quote.
