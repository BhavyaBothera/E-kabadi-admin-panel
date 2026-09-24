# E-Kabaadi — Phase 5: Real-Time Fleet Tracking, Routing, ETA & Geo-Spatial Operations

**Status**: Verified & Production-Ready  
**Automated Test Suite**: `tests/test-phase5-location-routing.js` (50 / 50 Passing Assertions)  
**Total Platform Test Suite**: 366 / 366 Passing Assertions Across 11 Test Suites (0 Regressions)  
**Database Migration**: `supabase/migrations/009_fleet_tracking_and_routing.sql`  

---

## 1. Executive Summary

Phase 5 introduces a real-time, privacy-preserving logistics layer connecting Citizens, Collectors, and Admins across doorstep collection operations:
- **Citizens** monitor assigned collector approach in real-time, view live dynamic ETAs, and receive doorstep arrival alerts.
- **Collectors** transmit operational telemetry securely, receive simulated or road routing guidance, and view doorstep proximity warnings.
- **Admins** maintain macro-level operational oversight across the entire city fleet with real-time freshness classification, stale detection, and offline indicators.

### Mandatory Operational & Architectural Corrections
1. **Mock Routing Is Explicitly Simulated**: The `MockRoutingProvider` utilizes deterministic approximations ($Haversine \times 1.25$ urban detour multiplier) for offline development, QA, and demonstrations. It is strictly marked as simulated (`isSimulated: true`, `source: "simulated_mock"`) and never misrepresented as road-network routing.
2. **Never Silently Fall Back from Production Routing to Mock Routing**: In production mode (`DATA_MODE=supabase`), if an external routing provider (OSRM/Mapbox) fails or is unconfigured, the system explicitly returns `ROUTE_UNAVAILABLE` and `ETA_UNAVAILABLE`. Fake ETAs and simulated road distances are forbidden in production.
3. **GPS Teleportation Detection Is Non-Destructive**: Speeds exceeding $120\text{ km/h}$ are flagged as `EXCESSIVE_SPEED` anomalies. Raw coordinates are strictly preserved for audit trails and diagnostics without alteration or deletion, while preventing suspicious coordinates from skewing route and ETA calculations until validated.
4. **Doorstep Arrival Geofencing Is Purely Informational**: Proximity within $150\text{m}$ emits a `COLLECTOR_NEAR_DESTINATION` signal to the citizen and collector. It **never** mutates the pickup state machine to `ARRIVED`. Field arrival authority remains with the collector.
5. **Explicit Dual Freshness Evaluation**: Separate tracking for location freshness (`LIVE`, `RECENT`, `STALE`, `OFFLINE`) and route/ETA freshness (`FRESH`, `STALE`, `UNAVAILABLE` / `AVAILABLE`, `STALE`, `UNAVAILABLE`, `ROUTE_UNAVAILABLE`). Stale ETAs are never displayed as current.
6. **No Surveillance System**: Real-time telemetry is restricted to the active operational tracking session. Historical telemetry is ephemeral, scoped by tenant isolation, and automatically cleaned via `purge_stale_location_history(24)`.
7. **Business Invariant Protection**: All core platform authorities are preserved unchanged:
   - Citizen explicitly selects the collector partner.
   - `collector_id` remains immutable upon booking.
   - Digital certified scale session governs weight and final payout.
   - Financial ledger is append-only with double-entry cryptographic records.
   - Eco Coins are awarded server-authoritatively.

---

## 2. System Architecture

```
[Collector Mobile Device]
        │ (Publish live GPS coordinate)
        ▼
[Tracking Service (tracking-service.js)]
   ├── 1. Verify Caller Authentication & Tenant Ownership
   ├── 2. Validate Coordinate Bounds [-90,+90], [-180,+180]
   ├── 3. Non-Destructive Anomaly Detection (>120 km/h -> EXCESSIVE_SPEED)
   ├── 4. Evaluate Location Freshness (LIVE <= 30s | RECENT <= 120s | STALE <= 300s | OFFLINE)
   ├── 5. Check Informational Proximity Geofence (<= 150m -> COLLECTOR_NEAR_DESTINATION)
   └── 6. Ephemeral Telemetry Buffer (Purge after 24h retention)
        │
        ├── [Persist: collector_live_locations] ──► [Supabase Realtime WebSockets]
        │                                                     │
        ▼                                                     ▼
[Routing & ETA Service (routing-service.js)]       [Citizen Tracking Screen]
   ├── Refresh Throttling (Displacement >100m, Age >60s)    ├── Live Interactive Map
   ├── Provider Routing (Mock Simulated vs Production)       ├── Real-time Road Distance
   ├── Freshness Derivation (Route Freshness + Location Freshness) ├── Freshness Badge (● Live / ⚠️ Stale)
   └── Route Deviation Detection (ON_ROUTE, MINOR, OFF_ROUTE) └── Doorstep Proximity Banner
```

---

## 3. Database Schema (`009_fleet_tracking_and_routing.sql`)

### 1. `collector_live_locations`
Maintains current operational spatial coordinates for active collectors:
- `collector_id`: Primary key referencing `public.collectors(id)`.
- `pickup_id`: Active pickup reference (nullable when idle).
- `latitude`: `DECIMAL(9,6)` constrained to $[-90.0, 90.0]$.
- `longitude`: `DECIMAL(9,6)` constrained to $[-180.0, 180.0]$.
- `heading`: Azimuth angle $[0.0, 360.0]$.
- `speed_kmh`: Speed in kilometers per hour.
- `freshness_status`: `LIVE` | `RECENT` | `STALE` | `OFFLINE`.
- `is_simulated`: Boolean flag designating simulated mock vs real device hardware.
- `anomaly_flag`: Text indicator (e.g., `EXCESSIVE_SPEED`) for non-destructive diagnostic logging.

### 2. `pickup_tracking_sessions`
Tracks the operational lifecycle of a pickup logistics session:
- `id`: `TRK-<pickup_id>` unique identifier.
- `pickup_id`: Unique reference to `public.pickups(id)`.
- `collector_id`: Immutable assigned collector.
- `citizen_id`: Immutable pickup owner.
- `status`: `inactive` | `requested` | `active` | `paused` | `stopped`.
- `location_freshness`: `LIVE` | `RECENT` | `STALE` | `OFFLINE`.
- `route_freshness`: `FRESH` | `STALE` | `UNAVAILABLE`.
- `eta_status`: `AVAILABLE` | `STALE` | `UNAVAILABLE` | `ROUTE_UNAVAILABLE`.
- `is_near_destination`: Boolean flag indicating $<150\text{m}$ proximity.
- `deviation_status`: `ON_ROUTE` | `MINOR_DEVIATION` | `OFF_ROUTE`.

**Immutability Trigger**: `trg_prevent_tracking_session_tampering` prevents any unauthorized modification of `pickup_id`, `collector_id`, or `citizen_id`.

### 3. `collector_location_history` & Ephemeral Purge
- Historical breadcrumbs stored temporarily during active transit.
- Automated stored procedure `purge_stale_location_history(p_retention_hours)` purges all telemetry beyond the retention threshold (default 24 hours), preventing permanent citizen/worker surveillance.

---

## 4. Freshness Catalog & State Machine

### Location Freshness States
| State | Age Threshold | Interpretation | UI Indicator |
| :--- | :--- | :--- | :--- |
| **`LIVE`** | $\le 30\text{ seconds}$ | Real-time continuous transmission | `● Live` (Green) |
| **`RECENT`** | $31 - 120\text{ seconds}$ | Recent transmission, vehicle moving | `Updated Xs ago` (Emerald) |
| **`STALE`** | $121 - 300\text{ seconds}$ | Signal delayed or GPS temporarily lost | `⚠️ Stale Location` (Amber) |
| **`OFFLINE`** | $> 300\text{ seconds}$ or Inactive | Collector offline or app in background | `● Offline` (Slate/Gray) |

### Route & ETA Freshness Matrix
| Route Freshness | Location Freshness | Evaluated ETA Status | Citizen UI Display |
| :--- | :--- | :--- | :--- |
| `FRESH` | `LIVE` | **`AVAILABLE`** | `"~12 mins (3.4 km)"` |
| `FRESH` | `RECENT` | **`AVAILABLE`** | `"~12 mins (3.4 km)"` |
| `FRESH` | `STALE` | **`STALE`** | `"~12 mins (stale)"` |
| `STALE` | Any | **`STALE`** | `"~12 mins (stale)"` |
| `UNAVAILABLE` | Any | **`ROUTE_UNAVAILABLE`** | `"ETA Unavailable"` |
| Any | `OFFLINE` | **`STALE` / `UNAVAILABLE`** | `"Collector Offline"` |

---

## 5. Non-Destructive Anomaly Detection

Urban clean tech collection vehicles (tempo trucks, electric trikes, pickup vans) operate under physical urban speed limits ($<60\text{ km/h}$). If a coordinate transmission indicates travel speed $>120\text{ km/h}$:
1. The coordinate is **not** dropped or deleted.
2. The coordinate is **not** silently rewritten or snapped to another location.
3. The coordinate is recorded with `anomalyFlag = "EXCESSIVE_SPEED"`.
4. The routing and ETA recalculation engines bypass the anomalous jump to prevent misleading the citizen, preserving previous validated metrics until stable GPS reception resumes.

---

## 6. Informational Geofencing Invariant

When collector enters the 150m doorstep circle:
- `isNearDestination` flips to `true` on the tracking session.
- Citizen UI renders `"Collector has entered your street / approaching gate!"`.
- Collector navigation renders `"Approaching doorstep (<150m) — prepare digital scale"`.
- **CRITICAL INVARIANT**: The pickup record status remains strictly unchanged (`on_the_way`). The transition to `ARRIVED` requires explicit collector action upon reaching the customer gate.

---

## 7. Tenant Isolation & Privacy Boundaries

1. **Active Session Only**: Citizens can only query collector location while their assigned pickup is in an active transit status (`accepted`, `on_the_way`, `arrived`, `collecting`).
2. **Post-Completion Blackout**: Once a pickup transitions to `completed` or `cancelled`, location tracking terminates immediately (`null` returned). No collector location is exposed outside active pickups.
3. **Cross-Tenant Guard**: Citizen `A` cannot query the collector location for Citizen `B`'s pickup; storage and backend RLS policies enforce isolation.
4. **Data Minimization**: History breadcrumbs are stored with coarse retention and automatically purged.

---

## 8. Verification & Test Suite Summary

Phase 5 was validated using the automated suite `tests/test-phase5-location-routing.js` covering 18 requirement groups across 50 assertions:

```
=======================================================
TOTAL PHASE 5 ASSERTIONS: 50 | PASSED: 50 | FAILED: 0
=======================================================
```

Total repository test suite status:
- 11 test suites: **100% green**
- **366 / 366 total assertions passing**
- **0 regressions across Phases 1, 2, 3, 4B, 4C, 4D, 4E, 4F, 4G, and 5**
