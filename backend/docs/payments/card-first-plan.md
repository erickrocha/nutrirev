# Card-first payments

## First increment: internal preparation

Sandbox only. Production processing is unavailable and this is not PCI
certification.

Implemented:

- Clinic-owned merchant metadata, BRL charges, and durable attempt reservations.
- Required clinic identity; missing context cannot yield unrestricted access.
- Composite foreign keys enforce clinic ownership of related records.
- Server-side amount and merchant selection.
- Credit/debit installment validation and durable idempotency keys.
- Row locking and one active reservation per charge, including unknown outcomes.
- Sandbox-only preparation using an enabled sandbox merchant connection.
- A provider-neutral, ephemeral card-submission boundary and an OAuth 2.0 e.Rede
  v2 sandbox adapter. Sensitive fields are non-serializable/non-debuggable and
  zeroized on drop; provider response bodies are not included in errors.

Preparing an attempt does not mark a charge as paid.
Public routes must enforce staff permissions and a customer's access to each charge
in addition to clinic identity. The internal services do not replace those checks.
Merchant setup requires a trusted provisioning workflow that is not implemented yet.
The adapter is exposed only through the authenticated
`POST /v1/card-payments/{attempt_id}/authorize` route. Tenant staff may submit a
clinic charge; customer-role users must own that charge through `customer.user_id`.
The attempt records the submitting user and enters `submitting` before the provider
call. Ambiguous outcomes enter `unknown` and cannot be submitted again.

Sandbox credentials are resolved indirectly from `credentials_secret_ref`. For a
reference such as `rede/clinic-a`, configure
`PAYMENT_SECRET_REDE_CLINIC_A_CLIENT_ID` and
`PAYMENT_SECRET_REDE_CLINIC_A_CLIENT_SECRET`. Provider credentials are never
accepted from an API request or stored in payment tables. Replace the environment
resolver with the deployment secret manager before production.

## Second increment: Asaas alongside Rede, and the Pix/recurrence foundation

Three defects that were live in the card path were fixed first:

- A charge was marked `paid` on an authorization that was never captured
  (`capture: false`), so the money never settled while the customer kept access
  — `enforce_access` only blocks on `overdue`. `CardProcessorResult` now carries
  `captured`, only captured money settles a charge, and the Rede adapter
  authorizes and captures in one call.
- Both clients derived the idempotency key from the clock on every tap. A retry
  after a lost response therefore sent a *new* key, missed on `attempt_by_key`,
  hit the reservation the first call had already made, and locked that charge
  permanently — nothing in the system ever wrote `cancelled` to an attempt. The
  key is now stable per checkout and dropped only after a definitive decline.
- Every `/payment-date` handler ran with no role check at all, so any
  authenticated patient could read and rewrite another patient's subscription
  within the same clinic. Restricted to clinic staff.

Settlement now also restores app access in the same transaction instead of
waiting up to an hour for the next worker tick.

Added, not yet reachable from any route:

- `payment_merchant.provider` accepts `asaas` as well as `rede`; the two
  coexist and the clinic's merchant row picks. `card_payment_gateway` no longer
  hardcodes provider or environment.
- `payment_attempt` accepts `method = 'pix'` (with the installment check
  extended to match), carries `initiator` (`cit`/`mit`), and its
  `provider_transaction_id` is wide enough for a 32-character Pix EndToEndId
  alongside a provider payment id.
- `customer.tax_id` and `customer.provider_customer_id`, with CPF/CNPJ
  check-digit validation in the domain. The document is optional at
  registration and required at checkout; it is unique per clinic.
- `PixProcessor` and `CardTokenizer` boundaries beside the existing
  `CardProcessor`, and an `AsaasProcessor` implementing all three.
- The gateway functions and `settle_charge` take an explicit `tenant_id` rather
  than a `PaymentScope`. The scope type is the request-path gate and refuses to
  exist without an authenticated user, which is exactly what the billing worker
  and the provider webhook do not have. No `PaymentScope::system(..)` exists,
  and none should: it would make the type's only safety property untrue.

## Third increment: Pix

Reachable end to end from web and mobile. Sandbox only.

- `POST /v1/payments/charges/{id}/pix` reserves the attempt and issues the QR in
  one round trip. `GET /v1/payments/attempts/{id}` is polled while the code is on
  screen, and `POST /v1/payments/attempts/{id}/cancel` releases it.
- **Attempt cancellation and a worker sweep.** `uq_pa_active` permits one live
  attempt per charge and, before this, nothing in the system ever wrote
  `cancelled`. A customer who opened a Pix QR and changed their mind was locked
  out of that charge by *every* method, permanently and only fixable by hand. The
  clients now release the attempt when the panel closes, and because that is
  best-effort — a force-quit leaves it live — the billing worker expires stale
  attempts on every tick.
- `AttemptStatus::advance` is wired into the write path. The lifecycle used to be
  called only by its own unit tests while the use case assigned status strings
  directly; a state machine nothing enforces reads as a guarantee and is not one.
- `POST /v1/payments/webhooks/asaas` is the only unauthenticated route. It is a
  router with no auth layer rather than a new entry in the middleware's public
  path list: that list matches by prefix, and widening it to `/v1/payments` would
  silently unauthenticate the charge listing and prepare endpoints. The callback
  body is used only to *locate* an attempt; the status and amount that settle a
  charge come from a read back to the provider with that clinic's own key, and
  the shared secret is per merchant and compared in constant time. Anything short
  of a bad secret answers 200, because a non-2xx pauses the provider's whole
  webhook queue for that account.
- Only the BR Code is stored. The QR image is passed through in the create
  response and never persisted — `payment_attempt` is row-locked and fully
  selected on every prepare and authorize.
- An amount that does not match our charge is never settled: the attempt goes to
  `unknown` for a human.

Not yet handled: refunds and chargebacks. A reversed Pix payment currently leaves
the charge settled and the customer's access open.

## Fourth increment: card on file

The patient chooses at checkout between paying this charge only and having every
cycle charged automatically.

- `payment_token` holds the provider's opaque token plus brand, last four and the
  consent timestamp and IP. Never a PAN.
- `payment_date.billing_mode` is `manual` (today's behaviour — the patient pays
  each generated charge by hand, by card or by Pix, which is also the "Pix every
  cycle" answer), `card_on_file`, or `pix_automatico`. `ck_pd_token_requires_mode`
  keeps a card from being attached to a mode that would never use it, and the
  subscription's foreign key carries the customer, so the database itself refuses
  to point one patient's subscription at another patient's card.
- Patient-facing routes under `/v1/payments/subscriptions/{id}` resolve through
  `customer.user_id`, so a patient reaches their own subscription and nothing
  else. They can change only how it is paid; dates, amount and cycle stay with
  the clinic on the staff-only `/payment-date` routes.
- Turning it off revokes the token in the same transaction. A customer must be
  able to end a stored-credential arrangement themselves.
- The worker's unattended pass runs after the tick, builds one provider client
  per clinic from that clinic's own secret, and:
  - charges only what is **due today**. Charges are generated 30 days ahead, so
    "every open charge" would have taken a month's money from every patient on
    the first tick after deploy.
  - keys on charge **and day** (`mit-0000000042-20260904`). One key per charge
    for all time would mean one attempt for all time: an attempt that lands in
    `unknown` keeps holding the charge, and `uq_pa_active` would then block every
    future attempt on it by any method — one dropped connection bricking a cycle
    permanently. The key is zero-padded because the reservation validator
    requires at least 16 characters, and `mit-42-20260904` is fifteen.
  - terminates a refusal as `declined`, which releases the charge so the patient
    can still pay by hand; and leaves an `unknown` holding it, for reconciliation
    against the provider rather than a blind retry.
- `initiator` records `cit` or `mit`, and `submitted_by_user_id` stays NULL for
  worker-run charges. Nobody submitted them.

The taxpayer document (CPF/CNPJ) is collected at checkout, not at registration:
the provider needs a registered payer, but a patient who never pays through the
app should never be asked. Both payment endpoints accept it, validate the check
digits, and store it on the customer the first time. The clients ask for it only
when the server answers `PaymentTaxIdRequired`.

Saving the card happens *after* the payment succeeds and never fails it: the
charge is settled either way, and only the recurrence is reported as having gone
wrong.

## Fifth increment: reversals

A refund or a chargeback now puts the charge back on the bill. Before this, money
that left again left the charge reading `paid` and the patient with access to
something nobody had been paid for.

- `payment_attempt` gains `refunded` and `reversed_at`. `captured` was previously
  the end of the line.
- The reversal is a **named operation**, not a new edge in
  `ChargeStatus::can_transition_to`. That function guards the billing worker,
  where "paid is terminal" is exactly the rule you want — no background tick may
  walk back money that moved. `ChargeStatus::reversed` is the separate door, and
  only a provider notification opens it.
- The charge returns carrying its **original due date**, so the existing overdue
  and grace machinery picks up where it actually stands instead of restarting.
  The patient is deliberately **not** cut off on the spot: a disputed payment is
  not proof of delinquency, and the clinic's grace period is already the answer
  to "how late is too late".
- A reversed attempt releases the charge, like a declined one, so it can be paid
  again by any method.
- Idempotent through `reversed_at`: providers redeliver, and a second
  notification changes nothing.
- One route covers both methods. The Asaas adapter stamps `externalReference` on
  card, Pix and unattended charges alike, so a card chargeback and a Pix refund
  reach the same handler.

Every reversal is treated as total. Partial refunds remain out of scope; until
they are handled, a partly-refunded charge goes back on the bill in full — over-
correcting toward the clinic being owed, which a human can see and undo, rather
than toward money quietly written off.

A reversal is now visible where clinic staff already work: `GET
/v1/payments/reversals` (staff only, tenant-scoped) backs a banner on the
payment-dates screen listing who, how much and when. That closes the part that
mattered most — before it, a clawed-back payment was indistinguishable from a
patient who simply never paid.

It is **not** a push notification. This application has no outbound notification
channel of any kind: SQS is receive-only for S3 events, and account invites issue
a token that somebody delivers by hand. Adding email would be the first outbound
channel in the system and needs decisions this repository cannot make on its own
— a verified sender domain, IAM and Terraform changes, and a bounce policy.

## Sixth increment: the clinic chooses its acquirer

The acquirer stopped being a string in the code. A clinic picks one and toggles
the methods it offers; every payment path resolves that choice.

This closed a real gap: the card checkout named e.Rede in code while Pix named
the PSP, so **a clinic set up only on the PSP could take Pix but had no working
card payment at all**. `payment_settings_mariadb` now proves a card payment works
on whichever acquirer the clinic chose.

- Three toggles on the connection: card, Pix, recurring. `active_flag` — a
  generated column that is NULL unless the row is enabled — under a unique index
  makes "one live acquirer per clinic" a database guarantee rather than something
  the use case has to remember.
- Two check constraints encode what each acquirer can actually do: the card-only
  acquirer cannot be switched on for Pix or recurring, and recurring cannot run
  without the card method it charges. The domain mirrors both so the clinic is
  told *why* instead of seeing a constraint violation.
- The split of duties follows the credential rule that was already there. The
  platform operator provisions a connection — `credentials_secret_ref` points at
  a deployment secret and a clinic-set pointer could name another clinic's
  credentials — and the clinic chooses among what it has.
- New connections are provisioned **disabled**. Creating one live would switch a
  clinic's acquirer out from under whatever it is using.
- `GET /v1/payments/methods` tells the checkout what to offer, and says nothing
  about which acquirer is behind it. A patient sees only the methods that will
  actually work.
- The card checkout now fills in the payer for acquirers that require one, which
  is what lets a single checkout serve both.

## Seventh increment: the platform operator manages the connections

Provisioning was a one-way door: a typo in a merchant reference or a rotated
secret left a dead connection with no way to correct it, and no way to see what
had been provisioned for whom. `/v1/payments/admin/connections` closes that.

- List, correct, retire, delete — all `SysAdmin` only, the same split of duties
  the sixth increment set out. The clinic still chooses its acquirer through
  `select`, which is the only path that validates what the acquirer can do.
- Correcting a connection cannot change its `provider`. An attempt records which
  acquirer moved the money, so rewriting that on an existing row would falsify
  history. A different acquirer is a different connection.
- A live connection cannot be moved between environments; retire it first.
  Otherwise a clinic's payments silently point at the other one.
- Deletion refuses once any attempt references the connection — the audit trail
  outranks a tidy table. Disable it instead. Only a never-used connection goes.
- Reference validation is now shared between provisioning and correcting, so the
  two cannot drift apart from the alphabet the secret resolver enforces.
- `credentials_secret_ref` is returned to the operator only. It names a
  deployment secret, so the clinic's own connection list leaves it null.

`payment_settings_mariadb` covers both guards: a connection that processed a
payment cannot be deleted, and a live one cannot change environment.

The operator can also work the clinic's own settings screen on a clinic's
behalf, which is what support actually needs. `staff_scope` now follows the rule
the catalog import already used: staff are held to their own clinic and cannot
reach another by naming it, while the operator — which has no clinic of its own
— says which one it is supporting, through `tenantId`. The money-movement paths
(charges, Pix, recurring, schedules) stay hard-scoped to the signed-in clinic on
purpose; supporting a clinic is not the same as taking a payment as one.

`/admin/payment-connections` is the operator's screen for it: every connection
across every clinic, filterable by clinic, with provisioning, correction,
retirement and deletion in one table. It mirrors the two server rules — the
acquirer field is locked on an existing connection, and the environment field is
locked while the connection is live — so the reason shows before the request
rather than as a rejection after it.

## Next milestones

1. Pix Automatico, binding a provider subscription to our cycles at payment
   creation rather than by date — our cycles advance by `renew_period_days` and
   the provider's by calendar month, so any date matcher drifts.
2. 3DS, debit, and partial refunds.
3. An outbound notification channel, if reversals and failed recurring charges
   should reach staff without them opening the app.
4. Reporting for fees, settlements, disputes, and reconciliation.

The first transaction milestone requires a real sandbox response through checkout,
using the correct clinic merchant. A prepared row or simulated approval is not enough.
For Pix the equivalent bar is a sandbox QR actually paid, arriving by webhook, and
settling the right charge.

## Security gates before production

- Provider onboarding and required PCI validation completed.
- Review the web/mobile/proxy/backend/key-store data flow and threat model.
- Verified tenant and customer authorization, key rotation.
- No PAN or CVV data in logs, tracing, analytics, queues, or database records.
- Store provider secrets in a secret manager, not payment tables.
- **PCI scope is unchanged and is the heavy one.** Card data is posted to this
  backend and tokenization happens server-side; this was a deliberate choice, not
  an oversight, and none of the gates above may be treated as satisfied by it.
  Moving to client-side tokenization — the browser and app post the card straight
  to the provider and the backend only ever sees a token — is the change that
  reduces the scope, and switching providers was the cheap moment to make it.

## Schema and tests

Migration 46 adds three tables and two unique indexes on existing tables. It uses
SeaORM schema builders targeting MariaDB. DDL is not transactionally rolled back
on all failures. Review index
build duration before deployment; inspect partial DDL failures before retrying.
Rollback removes payment records and must not be used once real records exist.

The ignored `card_payment_mariadb` test requires an isolated migrated database whose
name ends in `payment_test`, configured via `PAYMENT_TEST_DATABASE_URL`. It inserts
synthetic fixtures and leaves them for inspection. Dispose of the test database
when finished. Never delete production data for tests.

References:

- https://developer.userede.com.br/e-rede
- https://www.pcisecuritystandards.org/faqs/1086/
- https://www.pcisecuritystandards.org/faqs/are-merchants-allowed-to-request-card-verification-codes-values-from-cardholders/
