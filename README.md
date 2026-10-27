# Sotet Night Experience — Nyeri Edition

A responsive ticket-booking website for the event shown on the supplied poster. Frontend: HTML/CSS/vanilla JavaScript. Backend: Vercel serverless functions. Persistent data: Supabase Postgres.

## Ticket prices configured from the poster

- Advance Regular: KSh 350
- Advance Couple: KSh 600
- Gate Regular: KSh 400
- Gate Couple: KSh 700

Event details shown: 31 October 2026, DeKUT Freedom Hall, Nyeri. Confirm all event details and the official M-Pesa Till/Paybill with the organiser before opening sales.

## Important payment behaviour

This starter supports **manual M-Pesa transaction-code submission**. A submitted code is only a claim and does not mark a booking paid. The booking stays `pending_payment` until an authenticated admin checks the payment against the official M-Pesa statement and approves it. Admin approval is the point at which the ticket becomes `paid`.

This is not an automated Safaricom/M-Pesa API integration. Do not describe a transaction as verified unless an organiser has actually checked it.

## Setup

1. Create a Supabase project at https://supabase.com.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. In Supabase project settings, copy the project URL and **service_role** key. The service-role key bypasses database RLS, so keep it only in Vercel server-side environment variables. Never put it in frontend files or commit it.
4. Deploy this folder to a new GitHub repository, then import that repository into Vercel.
5. In Vercel → Project → Settings → Environment Variables, set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD` (long and unique)
   - `SESSION_SECRET` (random secret, at least 32 characters)
   - `MPESA_PAYBILL_OR_TILL` (the official event payment destination)
   - `MPESA_ACCOUNT_REFERENCE` (for example SOTET)
   - `EVENT_SUPPORT_CONTACT` (optional)
6. Redeploy after setting environment variables.
7. Open `/admin.html`, sign in with `ADMIN_PASSWORD`, then review submitted transaction codes against the actual M-Pesa statement before marking bookings paid.

## Local development

Install Node.js 20+ and the Vercel CLI, then run:

```bash
npm install
npm i -g vercel
vercel dev
```

Create a local `.env` from `.env.example` and fill it with real credentials. Never share the `.env` file.

## Ticket sales and fulfilment

- The booking form generates a unique booking reference and stores the booking in Supabase.
- Customers submit their M-Pesa transaction code against that booking reference.
- The admin dashboard shows pending submissions. Admin verifies against the official M-Pesa account, then approves or rejects the claim.
- A paid ticket can be printed or saved using the browser's Print option.
- Ticket quantities are stored, but this starter does not enforce a ticket inventory/capacity limit. Add an event capacity and atomic reservation logic before selling a limited number of seats.
- Admin access uses a server-checked password and short-lived signed session cookie. Use HTTPS (Vercel provides it), a unique password, and a long random `SESSION_SECRET`.
- For a production launch, add rate limiting/WAF, privacy notice and retention policy, email/SMS delivery, audit logs, and preferably individual admin accounts.

## Folder structure

- `public/index.html` — booking page
- `public/admin.html` — admin dashboard
- `public/styles.css` — responsive styling
- `public/app.js` — booking/payment form and ticket display
- `public/admin.js` — admin interface
- `api/` — Vercel serverless API routes
- `supabase/schema.sql` — database tables and indexes
