# E-Kabaadi Platform — Environment Setup & Configuration Guide

## 1. Overview

E-Kabaadi supports dual-engine runtime execution:
1. **Mock Mode (`DATA_MODE=mock`)**: Works out of the box with zero external configuration or database setup. Uses in-browser `localStorage`.
2. **Supabase Mode (`DATA_MODE=supabase`)**: Connects to a live Supabase instance with full PostgreSQL relational schema, Row Level Security, and Realtime capabilities.

---

## 2. Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **Web Browser**: Chrome, Edge, Firefox, or Safari with ES6+ support
- **Supabase Account**: Free or Pro tier at [supabase.com](https://supabase.com) (required only for Supabase mode)

---

## 3. Supabase Project Setup (For Supabase Mode)

### Step 3.1: Create a Supabase Project
1. Log in to [Supabase Console](https://app.supabase.com).
2. Click **New Project**.
3. Choose your organization, set Project Name to `e-kabadi-prod` (or `e-kabadi-dev`), set a secure database password, and select a region (e.g. `ap-south-1` for Mumbai, India).
4. Wait 1–2 minutes for the database to provision.

### Step 3.2: Run SQL Migrations
In the Supabase Dashboard, navigate to the **SQL Editor** and run the migration files in numerical order:

1. **`supabase/migrations/001_initial_schema.sql`**
   - Creates all 12 relational tables (`profiles`, `citizens`, `collectors`, `pickups`, `payments`, etc.).
   - Configures indexes, trigger timestamps, helper functions, and Row Level Security (RLS) policies.
   - Adds tables to the `supabase_realtime` publication.

2. **`supabase/migrations/002_storage_policies.sql`**
   - Creates the private storage bucket `kyc-documents` (`public = false`).
   - Configures storage RLS policies for document isolation and administrative access.

3. **`supabase/migrations/003_seed_data.sql`** (Optional for testing)
   - Populates scrap categories, demo accounts, and baseline catalog items.

4. **`supabase/migrations/004_security_hardening.sql`**
   - Privilege escalation triggers (`trg_prevent_profile_tampering`, `trg_prevent_citizen_tampering`, `trg_prevent_collector_tampering`).
   - Restricted INSERT on `payments` and `reward_transactions`.
   - Immutable audit trail triggers (`trg_prevent_audit_update`, `trg_prevent_audit_delete`).
   - Sanitized collector directory view (`public_collectors_directory`) and function (`get_public_collectors`).
   - Concurrency-locked state machine RPCs (`pickup_accept`, `pickup_start_transit`, `pickup_arrive`, `pickup_start_collection`, `pickup_cancel`).
   - Atomic approval workflow RPC (`admin_process_application`).

5. **`supabase/migrations/005_gemini_ai_analysis.sql`**
   - Creates the `ai_analyses` table with columns: `id`, `user_id`, `pickup_id`, `provider`, `model`, `detected_material`, `primary_category`, `confidence`, `confidence_tier`, `estimated_weight_kg`, `condition`, `notes`, `detected_items`, `user_confirmed`, `user_corrected`, `corrected_category`, `applied_rate_snapshot`, `status`, timestamps.
   - Adds `ai_analysis_id` and `ai_metadata` to `pickups` table.
   - Row Level Security (RLS) policies: Citizen own-records SELECT/INSERT/UPDATE; Collector assigned-pickup SELECT; Admin full SELECT.
   - Analytical RPC: `get_ai_analysis_stats()` aggregating total, confirmed, corrected, and average confidence metrics.

### Step 3.3: Deploy Gemini AI Edge Function (For Real Gemini Mode)
1. Install Supabase CLI: `npm install -g supabase`
2. Link your local project: `supabase link --project-ref your-project-id`
3. Set the Gemini API Key as a server-side secret (NEVER exposed to frontend):
   ```bash
   supabase secrets set GEMINI_API_KEY="AIzaSyYourSecretGeminiKey"
   ```
4. Deploy the `analyze-scrap` Edge Function:
   ```bash
   supabase functions deploy analyze-scrap
   ```
5. Test locally if desired:
   ```bash
   supabase functions serve analyze-scrap --env-file .env
   ```

---

## 4. Frontend Configuration Setup

### Option A: Local Development Configuration (`config.local.js`)
For static HTML environments without a Node build process, create a local configuration file at `frontend/config/config.local.js` (this file is excluded from Git via `.gitignore`):

```javascript
// frontend/config/config.local.js
window.__EKABADI_CONFIG__ = {
    // Set to "supabase" to connect to your live database, or "mock" for offline testing
    DATA_MODE: "supabase",

    // Found in Supabase Dashboard > Project Settings > API
    SUPABASE_URL: "https://your-project-id.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
```

### Option B: Environment Template (`.env.example`)
If deploying to platforms supporting build-time environment variable injection (Vercel, Netlify, Cloudflare Pages):

```bash
# Copy template to .env
cp .env.example .env
```

Fill in your project credentials:
```env
EKABADI_DATA_MODE=supabase
EKABADI_SUPABASE_URL=https://your-project-id.supabase.co
EKABADI_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5. Running the Application Locally

Start a local static web server from the project root:

```bash
# Using npx serve (recommended)
npx serve -p 3000 .

# Or using Python 3
python -m http.server 3000
```

Open your browser to:
- **Landing Page**: `http://localhost:3000/index.html`
- **Auth / Login**: `http://localhost:3000/frontend/auth/login.html`
- **Admin Command Center**: `http://localhost:3000/frontend/admin/dashboard.html`
- **Citizen Portal**: `http://localhost:3000/frontend/citizen/dashboard.html`
- **Collector Portal**: `http://localhost:3000/frontend/collector/dashboard.html`

---

## 6. How to Switch Modes

To switch between mock mode and Supabase mode at runtime:

1. **In `frontend/config/config.local.js`**:
   Change `DATA_MODE: "mock"` or `DATA_MODE: "supabase"`.
2. **In Browser DevTools Console**:
   ```javascript
   // Inspect current mode
   console.log(EKABADI_ENV.DATA_MODE);
   console.log(EKABADI_STORAGE.getActiveMode());
   ```
3. Refresh the page to initialize the selected adapter.

---

## 7. Running Automated Tests

Run the comprehensive verification suites via npm:

```bash
# 1. Baseline Verification & Golden Flow (81 tests)
npm test

# 2. Phase 4B Cloud Integration (18 tests)
npm run test:phase4b

# 3. Phase 4C Comprehensive Security Suite (36 tests)
npm run test:phase4c

# 4. Phase 4D Gemini AI Scrap Intelligence Suite (26 tests)
npm run test:phase4d

# 5. Full Platform Verification Suite (182 total assertions)
npm run test:all
```

---

## 8. Security Reminders & Best Practices

> [!CAUTION]
> **NEVER commit the Supabase `service_role` secret or `GEMINI_API_KEY`** to any client-side file, repository, or version control.
> - Only the public `anon` key (`SUPABASE_ANON_KEY`) should ever be referenced in frontend code.
> - `GEMINI_API_KEY` resides strictly in the server-side Supabase Edge Function environment (`analyze-scrap`).
> - The browser client communicates exclusively with the Edge Function using the user's Supabase JWT.

> [!NOTE]
> All table access is governed by Supabase Row Level Security (RLS). The `anon` key only has permissions granted by the RLS policies defined in `001_initial_schema.sql`, `004_security_hardening.sql`, and `005_gemini_ai_analysis.sql`.

