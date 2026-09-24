# E-Kabaadi — Smart Clean Tech Waste Management Platform

An end-to-end, interconnected clean tech waste management platform connecting **Citizens**, certified **Collectors**, and the municipal **Admin Command Center**. Features zero-tamper digital weighing simulations, instant UPI settlements, Eco Coin rewards, and a unified reactive state engine.

---

## 🚀 Portals & Quick Access

Open `index.html` in your browser (or run `npm start`) to access the Portal Gateway:

| Portal | Entry URL | Demo Account |
| :--- | :--- | :--- |
| **Public Landing** | [`frontend/public/index.html`](frontend/public/index.html) | Public Showcase |
| **Authentication** | [`frontend/auth/login.html`](frontend/auth/login.html) | Multi-role Login |
| **Citizen Portal** | [`frontend/citizen/dashboard.html`](frontend/citizen/dashboard.html) | `citizen@ekabadi.demo` / `citizen123` |
| **Collector Cockpit** | [`frontend/collector/dashboard.html`](frontend/collector/dashboard.html) | `collector@ekabadi.demo` / `collector123` |
| **Admin Command Center** | [`frontend/admin/dashboard.html`](frontend/admin/dashboard.html) | `admin@ekabadi.demo` / `admin123` |

---

## 🏗️ Clean Project Architecture

The codebase is organized cleanly under `frontend/` with dedicated role modules and shared infrastructure:

```text
E-KABADI/
├── index.html                    # Root gateway & redirect to public landing
├── package.json                  # NPM scripts & test runners
├── README.md                     # Master documentation
├── docs/
│   └── data-model.md             # Formal data schema & state machine specifications
├── tests/
│   ├── test-verification.js      # Core storage, auth & state machine test suite (32 tests)
│   └── test-golden-flow-e2e.js   # Full end-to-end booking-to-payout verification (29 steps)
└── frontend/
    ├── assets/                   # Shared brand icons & logos (SVG)
    ├── config/                   # Central constants, routes & environment configs
    │   ├── constants.js          # Pickup state machine, rates, coin multipliers
    │   ├── environment.js        # Environment toggles
    │   └── routes.js             # Centralized route catalog
    ├── data/                     # Isolated mock entities & developer demo accounts
    │   ├── mock-citizens.js      # Citizen profiles
    │   ├── mock-collectors.js    # Collector partners & vehicle fleets
    │   ├── mock-notifications.js # Real-time notification streams
    │   ├── mock-payments.js      # Transaction & settlement records
    │   ├── mock-pickups.js       # Pickup lifecycle store
    │   ├── mock-rewards.js       # Eco Coin rewards catalog & ledger
    │   ├── mock-scrap.js         # Scrap categories, base rates & market multipliers
    │   └── mock-users.js         # Unified authentication credentials
    ├── shared/                   # Shared services, state engine, & UI components
    │   ├── components/           # Navbar, sidebar, modal, toast, loader, badges
    │   ├── css/                  # Shared styling & design system variables
    │   └── js/                   # Unified storage adapter, services API layer, router
    ├── public/                   # Public landing page with live rate calculator & impact stats
    ├── auth/                     # Citizen/Collector signups, login, pending approval screens
    ├── citizen/                  # Citizen booking, scrap analysis, tracking, wallet & rewards
    ├── collector/                # Collector transit, radar navigation, scale weighing & earnings
    └── admin/                    # Preserved Admin Command Center with live state synchronization
```

---

## 🔄 Core Business Logic & State Machine

### 1. Citizen-Driven Collector Selection
The Citizen **strictly chooses** which background-verified Collector services their area during pickup creation. The Admin panel never overrides or assigns a different collector without explicit citizen request.

### 2. Pickup State Machine Lifecycle
```text
REQUESTED ──> ACCEPTED ──> ON_THE_WAY ──> ARRIVED ──> COLLECTING ──> COMPLETED ──> PAID
    │             │
    └──> CANCELLED <─── (Cancellation allowed only prior to arrival)
```

- **`REQUESTED`**: Pickup created by Citizen with item breakdown and estimated weight.
- **`ACCEPTED`**: Selected Collector accepts pickup in their dispatch queue.
- **`ON_THE_WAY`**: Collector is en route; live GPS tracking simulation updates on Citizen tracking page.
- **`ARRIVED`**: Collector reaches doorstep; Citizen receives notification.
- **`COLLECTING`**: Scale session starts; scrap is verified and weighed.
- **`COMPLETED`**: Final weights locked, scrap value computed.
- **`PAID`**: Instant UPI payout recorded and Eco Coins credited to Citizen wallet (`2 Eco Coins per kg`).

### 3. State Adapter (`frontend/shared/js/storage.js`)
All reads and writes flow through a unified state adapter (`EKABADI_STORAGE.adapter`) that abstracts `localStorage` with reactive `CustomEvent` dispatches (`ekabadi:db-change`). This allows seamless transition to a live backend (Supabase / REST / GraphQL) without changing any UI page logic.

---

## 🛡️ Phase 4C — Security, Integrity & Production Hardening

E-Kabaadi incorporates comprehensive defense-in-depth security, strict data integrity constraints, and privilege escalation protections across all platform tiers:

- **Privilege Escalation Defense**: PostgreSQL triggers (`trg_prevent_profile_tampering`, `trg_prevent_citizen_tampering`, `trg_prevent_collector_tampering`) prevent unauthorized modification of roles, account statuses, verification flags, wallet balances, and certified scale metrics.
- **Atomic Concurrency & Row Locking**: Pickup state transitions (`pickup_accept`, `pickup_start_transit`, `pickup_arrive`, `pickup_start_collection`, `pickup_cancel`) use PostgreSQL row-level locks (`FOR UPDATE`) to eliminate race conditions.
- **Strict Cancellation Boundary**: Pickups can only be cancelled by the owning citizen prior to arrival; cancellation is rejected once collection or scale weighing is underway.
- **Payment & Reward Ledger Protection**: Client `INSERT` is blocked on `payments` and `reward_transactions`. All ledger entries and Eco Coin credits are minted atomically via `process_collection_completion` with unique constraint idempotency.
- **Private KYC & 60s Expiring Signed URLs**: Identity documents are isolated in a private Supabase Storage bucket (`kyc-documents`) accessible exclusively to the document owner and verified administrators via short-lived signed URLs.
- **PII & Financial Masking**: Aadhaar numbers (`XXXX-XXXX-1234`) and bank accounts (`••••••••1234`) are masked across all UI views and client responses.
- **Public Collector Directory Sanitation**: The public collector endpoint filters out private residential addresses, bank accounts, and identity documents, exposing only operational fleet information.
- **Immutable Audit Trail**: Administrative approvals, rejections, and status changes are permanently logged to `approval_audit_trail` with triggers blocking `UPDATE` and `DELETE`.
- **Session Security & XSS Defense**: Client-side storage strips sensitive JWT tokens (`sanitizeSessionForStorage`), enforces session expiration (`isSessionValid`), and sanitizes untrusted input (`escapeHtml`, `sanitizeInput`, `validateInternalRoute`).
- **Zero Secrets**: Frontend contains zero service-role keys, database passwords, Gemini API keys, or unmasked credentials.

---

## 🤖 Phase 4D — Real Gemini-Powered Scrap Intelligence System

Phase 4D establishes a multimodal AI scrap recognition pipeline powered by Google Gemini Vision (`gemini-1.5-flash`):

- **Server-Side Security Boundary**: The `GEMINI_API_KEY` is hosted exclusively inside the Supabase Edge Function (`analyze-scrap`). The client never handles raw AI secrets.
- **Zero Financial Trust in AI**: Gemini only estimates the material and weight; official scrap rates are fetched strictly from trusted database catalogs (`scrap_categories`), and payouts are computed in application logic.
- **Authoritative Doorstep Scale**: Physical certified digital scale measurements by Collectors supersede all AI estimates during collection finalization.
- **Human-in-the-Loop & Correction**: Citizens can review, confirm, or override the AI classification using the interactive Category Correction Drawer before booking.
- **Resilient Fallback**: A zero-dependency manual weight calculator is available if a camera or AI service is unavailable.
- **Admin Scrap Analytics**: Migration `005_gemini_ai_analysis.sql` provides the analytical RPC `get_ai_analysis_stats()` tracking model accuracy, confidence tiers, and user correction rates.

### Documentation Index
- 🤖 [Phase 4D Gemini AI Scrap Intelligence Guide](docs/phase-4d-gemini-ai.md) — Comprehensive multimodal vision pipeline, schema validation, financial integrity, and scale authority specification.
- 🛡️ [Phase 4C Security Hardening Guide](docs/phase-4c-security-hardening.md) — Comprehensive threat model, authorization architecture, RLS matrix, and security policies.
- ☁️ [Phase 4B Cloud Integration Guide](docs/phase-4b-cloud-integration.md) — Operational guide on live Supabase wiring, session cache, atomic RPC, KYC privacy, and test execution.
- 📘 [Backend Architecture & Relational Schema](docs/backend-architecture.md) — Detailed design of tables, RLS policies, adapter pattern, and stored procedures.
- 🗺️ [Phase 4E Location & Maps Intelligence](docs/phase-4e-location-maps.md) — Privacy-first nearby collector discovery, Haversine calculations, and immutable collector selection.
- ⚙️ [Environment Setup Guide](docs/environment-setup.md) — Step-by-step instructions for Supabase project provisioning, migrations, and local testing.
- 🗺️ [Migration Plan](docs/migration-plan.md) — Multi-phase transition roadmap from mock to cloud database with zero downtime.
- 📊 [Database Schema Reference](docs/supabase-schema.md) — Complete table, column, index, and constraint definitions.

---

## 🧪 Automated Testing

Run the automated test suites using Node.js (**216 passing assertions across 8 suites**):

```bash
# Run ALL 8 test suites (216/216 assertions across all tiers)
npm run test:all

# Run core verification & audit test suites (mock mode — 81 tests)
npm test

# Run core state & storage verification (32 tests)
npm run test:verify

# Run full end-to-end golden flow simulation (29 steps)
npm run test:e2e

# Run Phase 3 hyperlink, route guard, and concurrency audit (20 assertions)
npm run test:qa

# Run Phase 4A Supabase backend integration suite (21 assertions)
npm run test:supabase

# Run Phase 4B Cloud integration & operational contract suite (18 assertions)
npm run test:phase4b

# Run Phase 4C Security, integrity & hardening suite (36 assertions)
npm run test:phase4c

# Run Phase 4D Gemini AI Scrap Intelligence suite (26 assertions)
npm run test:phase4d

# Run Phase 4E Location & Maps Intelligence suite (34 assertions)
npm run test:phase4e
```

---

## 🔒 Security Summary
- **Citizen Selects Collector**: Citizen remains 100% authoritative over collector choice. Admin and automated algorithms never assign collectors.
- **Selected Collector Immutability**: Once created, `selectedCollectorId` is locked at PostgreSQL trigger, storage, and service layers.
- **Location Privacy First**: Citizen door addresses remain private; collector public locations represent approximate service areas or masked neighborhood coordinates (~100m).
- **Zero Frontend Secrets**: Zero `service_role` keys, map secrets, database passwords, or `GEMINI_API_KEY` credentials exist in frontend code or browser storage.
- **Aadhaar Masking**: Displays only last 4 digits (`XXXX-XXXX-9012`). No unmasked Aadhaar numbers are persisted in database tables.
- **Private KYC Storage**: KYC documents reside in a private Supabase Storage bucket (`kyc-documents`) accessible only via 60s time-limited signed URLs.
- **Database Row Level Security (RLS)**: Enforced directly inside PostgreSQL so that Citizens, Collectors, and Admins can never access unauthorized records.
- **Immutable Audit Trail**: Administrative decisions are recorded in `approval_audit_trail` with triggers blocking modifications or deletions.
- **Access Guard**: Role-based routing enforces login requirements and prevents pending/rejected/suspended/deactivated accounts from accessing dashboards.

---

## 📄 License
MIT License. Built for hackathon demonstration.
