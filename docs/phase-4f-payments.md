# E-KABAADI PLATFORM — PHASE 4F DOCUMENTATION
## Real Payment Infrastructure, Settlement & Financial Ledger Architecture

---

### 1. Executive Summary
Phase 4F elevates the E-Kabaadi platform from a simulated payment layer to an enterprise-grade, server-authoritative, auditable, and idempotent financial settlement system. Built upon the strict foundational principle that **AI has zero financial authority** and that **the collector's certified digital scale is the authoritative physical input**, Phase 4F integrates real Razorpay payment processing through secure backend boundaries (Supabase Edge Functions), provides deterministic offline mock capabilities for zero-credential automated testing, captures immutable historical rate/weight snapshots, and enforces a strict double-entry `financial_ledger`.

---

### 2. Payment Architecture
The platform implements a strict separation of concerns where client applications never interact directly with payment gateway secret APIs:

```
[ Citizen / Collector Web Frontend ]
               │
               ▼  (JWT Authenticated REST Request)
[ Supabase Edge Functions / Backend Boundary ]
   ├── create-payment-order (Authoritative rate lookup, Razorpay Orders API)
   ├── verify-payment       (HMAC-SHA256 signature verification, atomic settlement RPC)
   ├── razorpay-webhook     (Webhook signature check, idempotency filter, event dispatcher)
   └── reconcile-payment    (Admin-authorized dispute reconciliation and refund ledger)
               │
               ▼  (Transactional Database Boundary - RPC)
[ PostgreSQL Storage & Ledger Engine ]
   ├── payments             (Order ID, payment ID, rate snapshot, weight snapshot, status)
   ├── payment_provider_events (Unique provider events for idempotency)
   ├── financial_ledger     (Immutable double-entry journal: credit/debit, paise)
   ├── payment_adjustments  (Audited administrative delta adjustments)
   └── reward_transactions  (Idempotent Eco Coins reward distribution)
```

---

### 3. Razorpay Integration
The gateway integration utilizes Razorpay's standard Standard Checkout API and server-side Orders API:
- **Server-Side Order Creation**: Orders are created via `POST https://api.razorpay.com/v1/orders` from the `create-payment-order` Edge Function. The payload includes `amount` (in integer paise), `currency: "INR"`, `receipt` (pickup ID), and `notes`.
- **Client-Side Razorpay Checkout**: The client receives only `orderId`, `amountPaise`, `currency`, and the public key `keyId`. Razorpay's client-side SDK (`checkout.js`) is launched with brand primary styling (`#1F6F43`).
- **Cryptographic Callback Verification**: Upon completion, the frontend transmits `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to the backend `verify-payment` Edge Function for HMAC-SHA256 verification before database status updates.

---

### 4. Security Boundary & Key Management
- **Zero Secrets in Frontend**: `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` reside exclusively in Supabase Edge Function environment secrets.
- **Client Access**: The browser client receives only the public key identifier (`RAZORPAY_KEY_ID`).
- **No Secret Storage**: Secrets are never saved in `localStorage`, `sessionStorage`, cookies, HTML attributes, or Git repositories.
- **Environment Configuration**:
  - `RAZORPAY_KEY_ID`: Public key (configured in client/env).
  - `RAZORPAY_KEY_SECRET`: Private secret (configured in Supabase via `supabase secrets set`).
  - `RAZORPAY_WEBHOOK_SECRET`: Private webhook secret (configured in Supabase via `supabase secrets set`).

---

### 5. Financial Authority Model
The platform operates on a single non-negotiable financial chain of truth:
1. **Gemini AI**: Generates scrap material classification and visual weight estimates. AI has **0% financial authority** and can never set scrap rates or final payouts.
2. **Citizen**: Has full authority to review, accept, or override AI classification prior to collector dispatch.
3. **Collector Certified Scale**: The physical scale reading entered at the citizen's doorstep is the **authoritative physical weight input**.
4. **Authoritative Database Rate**: Rates are queried directly from the `scrap_categories` catalog table. Client-provided rates in request bodies are ignored.
5. **Authoritative Final Amount**:
   $$\text{Final Amount} = \text{Final Scale Weight (kg)} \times \text{Trusted Scrap Rate (₹/kg)}$$
   The calculated result is converted to integer paise to eliminate floating-point arithmetic errors.

---

### 6. Rate Snapshot
To prevent historical accounting records from mutating when scrap catalog rates change:
- Every payment record permanently stores:
  - `rate_per_kg_snapshot`: The exact catalog rate applied at settlement time.
  - `final_weight_kg_snapshot`: The exact scale weight verified at doorstep.
  - `scrap_category_snapshot`: The category name applied.
  - `rate_version`: The catalog version identifier (e.g. `'v1'`).
- Modifying rates in `scrap_categories` will never retroactively modify completed payouts.

---

### 7. Final Scale Weight Authority
- Digital scale weights entered by certified collectors must be numeric, finite, and strictly $> 0$.
- Once collection is finalized and settled (`status: 'completed'`, `paymentStatus: 'paid'`), the `finalWeight` and `final_weight_kg_snapshot` become **strictly immutable**.
- Direct attempts to mutate `finalWeight` or `amount` in storage or database throw a security violation. Corrections must be handled via the audited `payment_adjustments` ledger.

---

### 8. Money Representation & Integer Paise
To eliminate IEEE-754 binary floating-point drift (e.g. $0.10 + 0.20 = 0.30000000000000004$):
- **Integer Minor Units**: All monetary values are converted to **Paise** (1 INR = 100 Paise) for order creation and ledger recording:
  $$\text{Amount Paise} = \text{round}(\text{Rupees} \times 100)$$
- **Precision Utilities**: Standardized helper functions `toPaise(rupees)` and `toRupees(paise)` are shared across client and backend modules.

---

### 9. Payment State Machine
The payment lifecycle implements explicit valid state transitions:

```
[ created ]
    │
    ▼
[ order_created ] ───(Gateway Error)───► [ failed ]
    │                                       │
    ▼                                       ▼
[ payment_pending ]                     (Retry Order)
    │
    ▼
[ verified / settled ] ───(Admin Refund)───► [ refunded ]
```

- Invalid shortcuts (such as transitioning from `requested` directly to `paid`) are blocked by state guards.

---

### 10. Order Creation Contract
- Edge function `create-payment-order` / `paymentService.createOrder`:
  - Validates pickup existence and ownership.
  - Verifies pickup has not already been settled.
  - Reuses existing active order if one was previously created for this pickup (Idempotency).
  - Computes authoritative amount from scale weight and official catalog rate.
  - Returns: `{ success: true, orderId: "order_...", amount: 172.20, amountPaise: 17220, currency: "INR", keyId: "..." }`.

---

### 11. Cryptographic Signature Verification
Razorpay signatures are verified using HMAC-SHA256:
$$\text{Expected Signature} = \text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$
- In production, this calculation is executed exclusively in Deno / Supabase Edge Functions using the native Web Crypto API (`crypto.subtle.sign`).
- Forged, mismatched, or truncated signatures return a $400$ Bad Request / Security Violation and mark the payment attempt as `failed`.

---

### 12. Webhooks
- Webhook endpoint: `supabase/functions/razorpay-webhook/index.ts`.
- Subscribed Events: `payment.captured`, `order.paid`, `payment.failed`.
- Webhook Secret Verification: The `x-razorpay-signature` header is verified against the raw request body using `RAZORPAY_WEBHOOK_SECRET`.

---

### 13. Webhook Idempotency & Replay Protection
- Because payment gateways retry webhook delivery upon network delay, duplicate delivery must not trigger duplicate payouts or rewards.
- Table `payment_provider_events` enforces a PostgreSQL unique constraint on `(provider, provider_event_id)`.
- If an event has already been recorded, the webhook handler returns HTTP $200$ OK `{ acknowledged: true, duplicate: true }` without re-executing settlement.

---

### 14. Transactional Settlement Atomicity
Settlement is executed through the atomic database RPC `verify_and_settle_payment_atomic`:
1. Locks payment and pickup rows (`FOR UPDATE`).
2. Validates payment is not already settled (Idempotent return).
3. Updates `payments` status to `settled`, recording `provider_payment_id`, `verified_at`, and `settled_at`.
4. Updates `pickups` status to `completed` and `payment_status` to `paid`.
5. Appends a credit entry to `financial_ledger`.
6. Awards Eco Coins in `reward_transactions` using an idempotent `ON CONFLICT DO NOTHING` clause.
7. Increments citizen lifetime earnings, waste sold, and pickup counts.
8. Writes an immutable audit entry to `approval_audit_trail`.

---

### 15. Eco Coins Integration
- Eco Coins reward rate: 2 coins per kg (minimum 10 coins).
- Reward calculation uses the final authoritative weight snapshot, never the client or AI estimate.
- Enforces reward idempotency via unique reference `(pickup_id, type = 'earned_pickup')` in `reward_transactions`.

---

### 16. Refund Model & Financial Adjustments
- Citizens cannot initiate refunds.
- Refunds are restricted to authorized administrators and require an explicit reason.
- Table `payment_adjustments` records an auditable delta:
  - `amount_delta: -payment.amount`
  - `adjustment_type: 'refund'`
  - `reason: '...'`
  - `actor_id: '...'`
- `financial_ledger` appends a corresponding `debit` entry to maintain double-entry balance.
- Attempting to refund an already refunded payment is strictly rejected.

---

### 17. Row Level Security (RLS)
Migration `007_real_payments.sql` configures PostgreSQL RLS:
- `financial_ledger`:
  - Citizens can SELECT only their own account entries (`account_type = 'citizen' AND account_id = auth.uid()`).
  - Collectors can SELECT only their own partner entries (`account_type = 'collector' AND account_id = auth.uid()`).
  - Administrators can SELECT all ledger entries.
  - Direct INSERT/UPDATE/DELETE from client roles is disabled; entries are created via `SECURITY DEFINER` RPCs.
- `payment_provider_events`: Admin read-only.
- `payment_adjustments`: Admin read and write only.

---

### 18. Audit Trail
Financial events produce permanent audit logs in `approval_audit_trail`:
- `CREATE_ORDER`: Generated order ID, weight, rate, and amount.
- `SETTLE`: Verified provider payment ID, settled amount, and awarded Eco Coins.
- `REFUND`: Administrator ID, refund reason, and refund amount.
- Card numbers, CVVs, UPI PINs, and gateway secrets are **never** logged.

---

### 19. Mock Payment Provider
For zero-credential offline testing and demo environments:
- Class `MockPaymentProvider` implements the full provider interface:
  - `createOrder()`: Generates deterministic mock order IDs.
  - `verifyPayment()`: Validates deterministic mock signatures (`mock_sig_<orderId>_<paymentId>`).
  - `handleWebhook()`: Simulates webhook processing and idempotency.
  - Deterministic Scenarios: `SUCCESS`, `FAILURE`, `TIMEOUT`, `DUPLICATE`, `ALREADY_PAID`.

---

### 20. Real Payment Provider
- Class `RazorpayPaymentProvider`:
  - Delegates order creation to `create-payment-order` Edge Function.
  - Delegates signature verification to `verify-payment` Edge Function.
  - Launches Razorpay Checkout modal in browser with public key only.
  - Reconciles status through admin Edge Function.

---

### 21. Testing
- Dedicated test suite: `tests/test-phase4f-payments.js`.
- Total Assertions: 50 across 20 distinct groups.
- Coverage includes: formula verification, rate enforcement, scale authority, paise math, state machine, order contract, signature forgery rejection, webhook idempotency, order reuse, RBAC isolation, RLS triggers, settlement atomicity, reward idempotency, immutability triggers, amount tampering protection, failure retry safety, refund controls, mock determinism, and secret scanning.

---

### 22. Sandbox / Test-Mode Verification
When Razorpay test credentials (`rzp_test_...`) are configured in Supabase:
1. Citizen reviews certified scrap weight and official catalog rate on `payments.html`.
2. Citizen clicks "Pay Now" / "Complete Payment".
3. Backend creates Razorpay order with `amount_paise`.
4. Razorpay Checkout modal appears.
5. User enters test UPI / Netbanking credentials.
6. Callback passes payment details to `verify-payment` Edge Function.
7. Backend verifies HMAC-SHA256 signature and invokes atomic settlement RPC.
8. Status transitions to `settled`, Eco Coins are credited once, and receipt slip is generated.

---

### 23. Production Configuration
To deploy Razorpay in live production:
1. Create a Razorpay production merchant account.
2. Configure webhook endpoint in Razorpay Dashboard:
   - URL: `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`
   - Secret: Generate a strong 32+ character webhook secret.
   - Events: `payment.captured`, `order.paid`, `payment.failed`.
3. Set Supabase Edge Function Secrets:
   ```bash
   supabase secrets set RAZORPAY_KEY_ID=rzp_live_...
   supabase secrets set RAZORPAY_KEY_SECRET=...
   supabase secrets set RAZORPAY_WEBHOOK_SECRET=...
   ```
4. Set client public key in `.env`:
   ```bash
   RAZORPAY_KEY_ID=rzp_live_...
   PAYMENT_PROVIDER=razorpay
   DATA_MODE=supabase
   ```

---

### 24. Known Limitations & Deferred Capabilities
- **Direct Payouts via RazorpayX**: Currently payouts to citizens are settled via standard Razorpay Checkout and UPI collection flows. Automated merchant-to-citizen bank payout transfers (RazorpayX Payouts API) require corporate KYC verification and are deferred to Phase 5.
- **Physical Scale Bluetooth Hardware Integration**: Web Bluetooth API connects to standard BLE weight scale profiles; manual certified scale reading entry serves as the resilient offline fallback.
