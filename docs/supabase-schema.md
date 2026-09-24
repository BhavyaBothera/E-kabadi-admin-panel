# E-Kabaadi Supabase Database Schema
**Version**: 4.0.0 (Phase 4A Backend Foundation)  
**Date**: September 2026  
**Status**: Implementation Ready  

---

## 1. Architecture Overview

```
Frontend (HTML/JS)
       ↓
Shared Service Layer (services.js)
       ↓
Data Adapter (storage.js — adapter factory)
       ↓
┌─────────────┬──────────────────┐
│ Mock Mode   │ Supabase Mode    │
│ localStorage│ PostgreSQL + RLS │
└─────────────┴──────────────────┘
```

The database uses **Supabase Auth** for authentication and maps each authenticated user to a `profiles` table that stores the application role (`citizen`, `collector`, `admin`). Row Level Security (RLS) policies enforce authorization at the database level.

---

## 2. Table Schemas

### 2.1 `profiles`
Maps Supabase Auth users to application roles. **This is the role source of truth.**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, FK → `auth.users(id)` | Supabase Auth user ID |
| `role` | `TEXT` | NOT NULL, CHECK | `citizen` \| `collector` \| `admin` |
| `first_name` | `TEXT` | NOT NULL | |
| `last_name` | `TEXT` | NOT NULL | |
| `email` | `TEXT` | NOT NULL | |
| `phone` | `TEXT` | | |
| `avatar` | `TEXT` | | Initials or URL |
| `status` | `TEXT` | NOT NULL, DEFAULT `pending_approval` | `active` \| `pending_approval` \| `rejected` \| `suspended` |
| `application_status` | `TEXT` | NOT NULL, DEFAULT `pending_approval` | `draft` \| `pending_approval` \| `approved` \| `rejected` \| `correction_required` |
| `phone_verified` | `BOOLEAN` | DEFAULT FALSE | |
| `email_verified` | `BOOLEAN` | DEFAULT FALSE | |
| `masked_aadhaar` | `TEXT` | | e.g., `XXXX-XXXX-4821` |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

---

### 2.2 `citizens`
Extended profile for consumer scrap sellers.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK | e.g., `CIT-1001` |
| `user_id` | `UUID` | FK → `profiles(id)`, UNIQUE, NOT NULL | |
| `name` | `TEXT` | NOT NULL | |
| `phone` | `TEXT` | | |
| `email` | `TEXT` | | |
| `avatar` | `TEXT` | | |
| `addresses` | `JSONB` | DEFAULT `'[]'` | Array of address objects |
| `location` | `JSONB` | | `{lat, lng, address, city, state, pincode}` |
| `kyc_status` | `TEXT` | DEFAULT `pending` | `pending` \| `verified` \| `rejected` |
| `payout_method` | `TEXT` | DEFAULT `UPI` | |
| `upi_id` | `TEXT` | | |
| `eco_coins` | `INTEGER` | DEFAULT 0 | |
| `total_earnings` | `DECIMAL(10,2)` | DEFAULT 0 | |
| `total_pickups` | `INTEGER` | DEFAULT 0 | |
| `completed_pickups` | `INTEGER` | DEFAULT 0 | |
| `total_waste_sold` | `DECIMAL(8,2)` | DEFAULT 0 | |
| `rating` | `DECIMAL(3,2)` | DEFAULT 5.00 | |
| `joined_date` | `TEXT` | | |
| `status` | `TEXT` | DEFAULT `pending_approval` | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

---

### 2.3 `collectors`
Extended profile for independent scrap collection partners.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK | e.g., `COL-2001` |
| `user_id` | `UUID` | FK → `profiles(id)`, UNIQUE, NOT NULL | |
| `name` | `TEXT` | NOT NULL | |
| `phone` | `TEXT` | | |
| `email` | `TEXT` | | |
| `avatar` | `TEXT` | | |
| `business_name` | `TEXT` | | |
| `vehicle_type` | `TEXT` | | |
| `vehicle_number` | `TEXT` | | |
| `service_radius` | `INTEGER` | DEFAULT 8 | km |
| `service_area` | `TEXT` | | |
| `location` | `JSONB` | | `{lat, lng, address, city}` |
| `distance` | `DECIMAL(5,2)` | | Computed/cached |
| `accepted_materials` | `JSONB` | DEFAULT `'[]'` | |
| `scrap_categories` | `JSONB` | DEFAULT `'[]'` | |
| `rating` | `DECIMAL(3,2)` | DEFAULT 5.00 | |
| `total_pickups` | `INTEGER` | DEFAULT 0 | |
| `completed_pickups` | `INTEGER` | DEFAULT 0 | |
| `pending_pickups` | `INTEGER` | DEFAULT 0 | |
| `queue_length` | `INTEGER` | DEFAULT 0 | |
| `response_time` | `TEXT` | DEFAULT `~20 min` | |
| `total_waste_collected` | `DECIMAL(8,2)` | DEFAULT 0 | |
| `total_earnings` | `DECIMAL(10,2)` | DEFAULT 0 | |
| `eco_coins` | `INTEGER` | DEFAULT 0 | |
| `is_online` | `BOOLEAN` | DEFAULT FALSE | |
| `verification_status` | `TEXT` | DEFAULT `pending` | |
| `scale_status` | `TEXT` | DEFAULT `certified` | |
| `scale_id` | `TEXT` | | |
| `masked_bank` | `TEXT` | | Masked display |
| `status` | `TEXT` | DEFAULT `pending_approval` | |
| `joined_date` | `TEXT` | | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

---

### 2.4 `kyc_documents`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `UUID` | FK → `profiles(id)`, NOT NULL | |
| `document_type` | `TEXT` | NOT NULL | `aadhaar` \| `address_proof` \| `business_license` \| `vehicle_rc` |
| `document_status` | `TEXT` | DEFAULT `pending` | `pending` \| `approved` \| `rejected` |
| `storage_path` | `TEXT` | | Private bucket path |
| `submitted_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `reviewed_at` | `TIMESTAMPTZ` | | |
| `reviewed_by` | `UUID` | FK → `profiles(id)` | |
| `rejection_reason` | `TEXT` | | |

---

### 2.5 `pickups`
Central transaction entity.

> **CRITICAL**: `collector_id` is ALWAYS chosen by the Citizen.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK | e.g., `PK-9481` |
| `citizen_id` | `TEXT` | FK → `citizens(id)`, NOT NULL | |
| `collector_id` | `TEXT` | FK → `collectors(id)`, NOT NULL | |
| `citizen_name` | `TEXT` | | Snapshot |
| `collector_name` | `TEXT` | | Snapshot |
| `address` | `TEXT` | | |
| `scheduled_date` | `TEXT` | | |
| `scheduled_time` | `TEXT` | | |
| `date` | `TEXT` | | |
| `time_slot` | `TEXT` | | |
| `scrap_type` | `TEXT` | | |
| `items` | `JSONB` | DEFAULT `'[]'` | |
| `estimated_weight` | `DECIMAL(8,2)` | | |
| `estimated_value` | `DECIMAL(10,2)` | | |
| `final_weight` | `DECIMAL(8,2)` | | |
| `final_value` | `DECIMAL(10,2)` | | |
| `status` | `TEXT` | NOT NULL, DEFAULT `requested` | State machine |
| `payment_status` | `TEXT` | DEFAULT `pending` | |
| `payment_method` | `TEXT` | DEFAULT `UPI` | |
| `eco_coins_awarded` | `INTEGER` | DEFAULT 0 | |
| `notes` | `TEXT` | | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `accepted_at` | `TIMESTAMPTZ` | | |
| `enroute_at` | `TIMESTAMPTZ` | | |
| `arrived_at` | `TIMESTAMPTZ` | | |
| `completed_at` | `TIMESTAMPTZ` | | |
| `paid_at` | `TIMESTAMPTZ` | | |
| `cancelled_at` | `TIMESTAMPTZ` | | |
| `cancellation_reason` | `TEXT` | | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

---

### 2.6 `scrap_categories`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK | e.g., `SCRAP-01` |
| `category` | `TEXT` | NOT NULL | |
| `name` | `TEXT` | NOT NULL | |
| `code` | `TEXT` | | |
| `icon` | `TEXT` | | |
| `rate_per_kg` | `DECIMAL(10,2)` | NOT NULL | |
| `unit` | `TEXT` | DEFAULT `kg` | |
| `description` | `TEXT` | | |
| `recyclability` | `TEXT` | | |
| `co2_saved_per_kg` | `DECIMAL(5,2)` | | |
| `active` | `BOOLEAN` | DEFAULT TRUE | |
| `effective_from` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

---

### 2.7 `payments`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK | |
| `pickup_id` | `TEXT` | FK → `pickups(id)`, UNIQUE | One payment per pickup |
| `citizen_id` | `TEXT` | FK → `citizens(id)` | |
| `collector_id` | `TEXT` | FK → `collectors(id)` | |
| `citizen_name` | `TEXT` | | |
| `collector_name` | `TEXT` | | |
| `amount` | `DECIMAL(10,2)` | NOT NULL | |
| `method` | `TEXT` | DEFAULT `UPI` | |
| `status` | `TEXT` | DEFAULT `paid` | |
| `transaction_id` | `TEXT` | | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `completed_at` | `TIMESTAMPTZ` | | |

---

### 2.8 `reward_transactions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK | |
| `user_id` | `TEXT` | NOT NULL | |
| `type` | `TEXT` | NOT NULL | `earned_pickup` \| `redeemed_perk` \| `bonus` |
| `points` | `INTEGER` | NOT NULL | +/- |
| `pickup_id` | `TEXT` | | Source pickup |
| `description` | `TEXT` | | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

Unique constraint on `(pickup_id, type)` WHERE `type = 'earned_pickup'` to prevent duplicate rewards.

---

### 2.9 `reward_catalog`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK | |
| `name` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | | |
| `cost` | `INTEGER` | NOT NULL | Eco Coins price |
| `icon` | `TEXT` | | |
| `category` | `TEXT` | | |
| `active` | `BOOLEAN` | DEFAULT TRUE | |

---

### 2.10 `notifications`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK | |
| `user_id` | `TEXT` | NOT NULL | |
| `role` | `TEXT` | | |
| `type` | `TEXT` | | |
| `title` | `TEXT` | NOT NULL | |
| `message` | `TEXT` | | |
| `read` | `BOOLEAN` | DEFAULT FALSE | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

---

### 2.11 `issues`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK | |
| `raised_by` | `TEXT` | | Display name |
| `user_id` | `TEXT` | | |
| `citizen_id` | `TEXT` | | |
| `pickup_id` | `TEXT` | | |
| `role` | `TEXT` | | |
| `category` | `TEXT` | | |
| `type` | `TEXT` | | |
| `title` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | | |
| `priority` | `TEXT` | DEFAULT `medium` | |
| `status` | `TEXT` | DEFAULT `open` | |
| `assigned_to` | `TEXT` | DEFAULT `Customer Support` | |
| `resolution` | `TEXT` | | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

---

### 2.12 `approval_audit_trail`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK | |
| `entity_type` | `TEXT` | NOT NULL | `citizen` \| `collector` |
| `entity_id` | `TEXT` | NOT NULL | |
| `reviewer_name` | `TEXT` | | |
| `reviewer_admin_id` | `UUID` | FK → `profiles(id)` | |
| `action` | `TEXT` | NOT NULL | `APPROVE` \| `REJECT` \| `REQUEST_CORRECTION` \| `SUSPEND` \| `REACTIVATE` |
| `previous_status` | `TEXT` | | |
| `new_status` | `TEXT` | | |
| `reason` | `TEXT` | | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

---

## 3. Row Level Security (RLS) Policy Summary

| Table | Citizen | Collector | Admin |
|---|---|---|---|
| `profiles` | Own profile R/W | Own profile R/W | All R/W |
| `citizens` | Own record R/W | None | All R/W |
| `collectors` | Public info READ | Own record R/W | All R/W |
| `kyc_documents` | Own docs R | None | All R/W |
| `pickups` | Own pickups R/W* | Assigned pickups R/W* | All R |
| `scrap_categories` | Read all | Read all | Full CRUD |
| `payments` | Own payments R | Own payments R | All R |
| `reward_transactions` | Own txns R | Own txns R | All R |
| `notifications` | Own notifs R/W | Own notifs R/W | Admin notifs R/W |
| `issues` | Own issues R/W | Own issues R/W | All R/W |
| `approval_audit_trail` | None | None | All R/Insert |

*Pickup write = controlled transitions only via RPC functions.

---

## 4. Database Functions

### `validate_pickup_transition()`
Trigger on `pickups` UPDATE that validates status transitions against the allowed transition map.

### `process_collection_completion(pickup_id, final_weight, final_value, items)`
Atomic RPC that:
1. Updates pickup to `completed` + `paid`
2. Creates payment record (idempotent — checks for existing)
3. Awards Eco Coins (idempotent — checks for existing reward txn)
4. Updates citizen/collector stats

### `update_timestamp()`
Auto-updates `updated_at` on row modification.

---

## 5. Indexes

- `profiles(role)`, `profiles(status)`
- `citizens(user_id)`, `citizens(status)`
- `collectors(user_id)`, `collectors(status)`, `collectors(is_online)`
- `pickups(citizen_id)`, `pickups(collector_id)`, `pickups(status)`
- `payments(pickup_id)`, `payments(citizen_id)`, `payments(collector_id)`
- `reward_transactions(user_id)`, `reward_transactions(pickup_id, type)`
- `notifications(user_id)`, `notifications(read)`
- `issues(user_id)`, `issues(status)`
- `approval_audit_trail(entity_id)`

---

## 6. Realtime Enabled Tables
- `pickups` — citizen ↔ collector live status updates
- `notifications` — push-style notification delivery
- `payments` — payment completion visibility
