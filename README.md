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

## 🧪 Automated Testing

Run the automated test suites using Node.js:

```bash
# Run both test suites
npm test

# Run core state & storage verification (32 tests)
npm run test:verify

# Run full end-to-end golden flow simulation (29 steps)
npm run test:e2e
```

---

## 🛡️ Security & Privacy
- **Aadhaar Masking**: Displays only last 4 digits (`XXXX-XXXX-9012`).
- **Bank Account Masking**: Displays only last 4 digits (`••••••••1098`).
- **Audit Trail**: Every administrative approval and rejection records reviewer name, action, reason, and ISO timestamp.
- **Access Guard**: Role-based routing enforces login requirements and prevents pending/rejected applicants from accessing dashboard modules.

---

## 📄 License
MIT License. Built for hackathon demonstration.
