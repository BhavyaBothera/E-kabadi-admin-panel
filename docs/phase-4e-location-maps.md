# Phase 4E — Location, Maps & Nearby Collector Intelligence System

## 1. Objective

Phase 4E introduces a privacy-first, transparent **Location, Maps & Nearby Collector Intelligence System** for the E-Kabaadi platform. The system empowers citizens to discover, evaluate, and choose authorized scrap collectors based on factual proximity and operational status while strictly enforcing core architectural boundaries:
- **CITIZEN SELECTS COLLECTOR**: The citizen remains 100% authoritative over partner choice. Neither the Admin nor automated algorithms assign collectors.
- **SELECTED COLLECTOR IMMUTABILITY**: Once a pickup request is created, `selectedCollectorId` (`collectorId`) is permanently locked across the database, storage, and service layers.
- **ZERO AI AUTHORITY OVER ASSIGNMENT**: Gemini AI scrap intelligence remains exclusively confined to materials identification and volume estimation; AI has zero authority over geographic sorting, ranking, or collector selection.
- **PRIVACY FIRST**: Private residential addresses and coordinates are never exposed to unauthorized citizens or public directories. Public collector locations represent approximate service areas or masked centroid coordinates.

---

## 2. Architecture Overview

Phase 4E integrates seamlessly into the established dual-engine (Mock / Supabase) foundation without modifying existing working contracts:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CITIZEN SELECTION FLOW                         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │ 1. Scrap Selection / AI     │ (Phase 4D)
                     └─────────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │ 2. Location Confirmation   │ (GPS / Saved Address / Manual)
                     └─────────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │ 3. Nearby Collector Discovery│ (Haversine & Service Radius)
                     └─────────────────────────────┘
                                    │
                   ┌────────────────┴────────────────┐
                   ▼                                 ▼
        ┌───────────────────────┐         ┌───────────────────────┐
        │  4A. Compact Vector   │         │  4B. Nearby Collector │
        │      Map Preview      │         │      Card List        │
        └───────────────────────┘         └───────────────────────┘
                   │                                 │
                   └────────────────┬────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │ 5. Citizen Selects Partner  │ (Immutable Choice)
                     └─────────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │ 6. Pickup Confirmation     │ (Snapshot Coordinates & Address)
                     └─────────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │ 7. REQUESTED Lifecycle      │ (Collector Dashboard Alert)
                     └─────────────────────────────┘
```

### Module Responsibilities
- `frontend/shared/js/location-service.js`: Coordinate validation, Haversine formula calculation, privacy sanitization, operational status evaluation, nearby collector discovery, and geocoding abstraction.
- `frontend/shared/js/map-service.js`: Provider-agnostic map interface (`mapService`) with `MockMapProvider` (offline SVG vector radar) and `ProductionMapProvider` (Leaflet/OSM/Mapbox adapter), plus graceful fallback renderer.
- `supabase/migrations/006_location_and_nearby_collectors.sql`: Database schema extension adding `service_radius_km`, `service_area_locality`, `approx_latitude`, `approx_longitude` to `collectors`, location snapshots on `pickups`, `citizen_saved_locations` table with RLS, and PostgreSQL trigger `trg_prevent_pickup_collector_reassignment`.

---

## 3. Location Privacy Model

The platform strictly demarcates private address information from public operational data:

| Entity | Private Data (Restricted Access) | Public Discovery Data (Citizens & Directory) |
| :--- | :--- | :--- |
| **Citizen** | Full door/flat address, postal code, exact coordinates (`lat`, `lng`). Visible only to citizen owner and assigned collector upon booking acceptance. | Locality name only (e.g., "Sector 62, Noida") displayed to collector on dispatch. |
| **Collector** | Residential home address, exact GPS coordinates, Aadhaar number, KYC identification documents, bank account/IFSC details, internal review notes. | Verified badge, display name, vehicle type, service area locality, approximate map position (masked to 3 decimals / ~100m neighborhood radius), operational status (`AVAILABLE` / `BUSY`). |

### Public Masking Utility (`sanitizeCollectorPublicProfile`)
Before exposing collector records to frontend discovery views, `sanitizeCollectorPublicProfile` strips all sensitive and administrative attributes:
```javascript
const sanitized = sanitizeCollectorPublicProfile(rawCollector);
// Returns: id, name, avatar, businessName, vehicleType, rating, completedPickups,
//          serviceRadiusKm, serviceAreaLocality, approxLocation (masked to 3 decimals)
```

---

## 4. Citizen Location Flow

Citizens confirm their pickup location through three resilient modes without blocking application progress:

1. **Browser Geolocation (`navigator.geolocation`)**:
   - Explicit user consent requested only upon clicking "Use Current Location".
   - Accuracy metric monitored: if `accuracy > 1000m`, the system displays `"Your location may be approximate. Please confirm your pickup address."`
   - Denial or timeout does not stall the application; a clear informational message is displayed and the manual address selector is highlighted.
2. **Saved Addresses (`citizenSavedLocations`)**:
   - Citizens choose from their pre-registered addresses (e.g., Home, Office).
   - In Supabase mode, protected by RLS (`citizen_id = auth.uid()`).
3. **Manual Locality Entry**:
   - Citizens can type an address or locality (e.g., "Sector 18, Noida").
   - Geocoded deterministically by `geocodingService` without relying on mandatory external API keys.

---

## 5. Collector Discovery & Nearby Service

`nearbyCollectorService` orchestrates discovery by combining geographic proximity with operational availability:

1. **Coordinate Validation**: Normalizes inputs and checks bounds (lat: -90..90, lng: -180..180).
2. **Sanitization**: Masks private attributes and rounds approximate coordinates.
3. **Distance Computation**: Calculates Haversine straight-line distance.
4. **Service Radius Check**: Evaluates if `distanceKm <= collector.serviceRadiusKm`.
5. **Operational Status Evaluation**: Determines if collector is `AVAILABLE`, `BUSY`, `OFFLINE`, or `OUTSIDE_SERVICE_AREA`.
6. **Transparent Factual Sorting**: Sorts by nearest distance, active queue workload, or rating. AI or black-box rankings are strictly prohibited.

---

## 6. Distance Calculation (Haversine Formula)

The reusable utility `calculateHaversineDistance(lat1, lon1, lat2, lon2)` implements the spherical law of cosines / Haversine formula using Earth's mean radius ($R = 6371 \text{ km}$):

$$\Delta\text{lat} = \text{lat}_2 - \text{lat}_1, \quad \Delta\text{lon} = \text{lon}_2 - \text{lon}_1$$
$$a = \sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos(\text{lat}_1) \cdot \cos(\text{lat}_2) \cdot \sin^2\left(\frac{\Delta\text{lon}}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot c$$

### Transparency Constraint
Distance is explicitly labeled in UI as:
```
Approx. 2.4 km away
```
The label **never** claims "driving distance" or "driving ETA" unless an authorized road-network routing provider is configured.

---

## 7. Configurable Service Radius

Service radius is dynamic per collector record (`collector.serviceRadiusKm`), never hardcoded in frontend templates:
- **Default fallback**: 8 km (`DEFAULT_SERVICE_RADIUS_KM`).
- **Urban e-rickshaw collectors**: 5 km.
- **Commercial three-wheeler tempo collectors**: 8 km – 10 km.
- **High-capacity mini-truck collectors**: 15 km.

If a citizen's pickup location is outside a collector's service radius, the collector is marked `OUTSIDE_SERVICE_AREA` and cannot be booked for that location.

---

## 8. Collector Operational Eligibility Rules

A collector must satisfy all operational prerequisites before the "Select Partner" action is enabled:

| Parameter | Eligible Requirement | Ineligible State | Resulting UI Status |
| :--- | :--- | :--- | :--- |
| **Account Status** | `status === "active"` | `suspended` / `inactive` | `SUSPENDED` (Disabled) |
| **KYC / Scale** | `verificationStatus === "verified"` | `pending` / `rejected` | `PENDING_APPROVAL` (Disabled) |
| **Online Status** | `isOnline === true` | `false` | `OFFLINE` (Disabled) |
| **Service Radius** | `distanceKm <= serviceRadiusKm` | `distanceKm > serviceRadiusKm` | `OUTSIDE_SERVICE_AREA` (Disabled) |
| **Workload / Queue** | Queue length $< 5$ pickups | Queue length $\ge 5$ pickups | `BUSY` (Enabled with warning) |

---

## 9. Map Provider Abstraction

The map system implements a modular adapter pattern via `mapService`:

```javascript
// Provider Interface
mapService.createMap(containerId, options);
mapService.setCenter(lat, lng, zoom);
mapService.addMarker(id, markerData);
mapService.removeMarker(id);
mapService.fitBounds();
mapService.destroy();
mapService.renderFallback(containerId, reason);
```

### Providers
1. **`MockMapProvider`**: Interactive, zero-dependency SVG vector radar. Visualizes citizen location (green pulse pin), collector partners (emerald vehicle pins), and service-area concentric radar circles. Works completely offline.
2. **`ProductionMapProvider`**: Adapter supporting OpenStreetMap (Leaflet), Mapbox, or Google Maps when configured via `MAP_PROVIDER` and `MAP_PUBLIC_KEY`.
3. **Resilient Fallback**: If map scripts fail or the map is disabled, `mapService.renderFallback()` renders an accessible HTML notification. Collector card listing remains 100% operational.

---

## 10. Geocoding Abstraction

`geocodingService` translates addresses to coordinates and vice versa:
- **`geocodeAddress(addressString)`**: Resolves localities (e.g., "Sector 62, Noida", "Indirapuram") to coordinates.
- **`reverseGeocode(lat, lng)`**: Resolves coordinates to neighborhood localities.
- **Mock Mode**: Uses deterministic locality catalog with zero network dependencies.
- **Production Mode**: Configurable to call OpenStreetMap Nominatim or Google Geocoding API via secure Edge Function proxy.

---

## 11. Mock Mode Architecture

When `DATA_MODE=mock`:
- Collector locations are seeded deterministically across Noida and Ghaziabad sectors (`mock-collectors.js`).
- Seed locations include test variations: in-radius collectors, out-of-radius collectors (`COL-2005` in Greater Noida), offline collectors (`COL-2003`), and high-load collectors (`COL-2006`).
- Saved citizen locations are seeded in `storage.js` for testing default address selection.
- All distance calculations and status evaluations run locally in pure JavaScript.

---

## 12. Supabase Mode Architecture

When `DATA_MODE=supabase`:
- `collectors` table stores `service_radius_km`, `service_area_locality`, `approx_latitude`, `approx_longitude`.
- `citizen_saved_locations` stores encrypted/authenticated user pickup locations.
- Proximity queries execute via PostgreSQL RPC function `get_nearby_collectors(citizen_lat, citizen_lng, max_radius_km)`.
- Client adapter maps `citizenSavedLocations` to table `citizen_saved_locations`.

---

## 13. Row-Level Security (RLS) Policies

Database security is enforced at the PostgreSQL engine level in `006_location_and_nearby_collectors.sql`:

1. **`citizen_saved_locations`**:
   - `SELECT`: Citizen can view only own saved locations (`citizen_id = auth.uid()`).
   - `INSERT`: Citizen can insert only own saved locations (`citizen_id = auth.uid()`).
   - `UPDATE`: Citizen can update only own saved locations (`citizen_id = auth.uid()`).
   - `DELETE`: Citizen can delete only own saved locations (`citizen_id = auth.uid()`).
   - `ADMIN`: Admin role has read-only access for operational audits.
2. **`collectors` Public Columns**:
   - Public view exposes only sanitized operational columns (`service_radius_km`, `service_area_locality`, `approx_latitude`, `approx_longitude`). Exact home addresses and KYC records remain behind restricted collector RLS.

---

## 14. Selected Collector Immutability

To prevent unauthorized hijacking, reassignment, or silent tampering, `selectedCollectorId` (`collectorId`) is enforced as strictly immutable across three distinct layers:

1. **Database Trigger (`trg_prevent_pickup_collector_reassignment`)**:
   ```sql
   CREATE OR REPLACE FUNCTION prevent_pickup_collector_reassignment()
   RETURNS TRIGGER AS $$
   BEGIN
       IF OLD.collector_id IS DISTINCT FROM NEW.collector_id THEN
           RAISE EXCEPTION 'Security violation: Selected collector is immutable and cannot be reassigned once pickup is created.';
       END IF;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```
2. **Storage Layer (`storage.js`)**:
   ```javascript
   if (collectionName === "pickups" && updates.collectorId && updates.collectorId !== collection[index].collectorId) {
       throw new Error("Security violation: Selected collector is immutable and cannot be reassigned once pickup is created.");
   }
   ```
3. **Service Layer (`services.js`)**:
   `pickupService.updateStatus` throws a security exception if any caller attempts to inject a modified `collectorId`.

---

## 15. Graceful Fallback Behavior

The platform never blocks booking creation due to map or geocoding unavailability:

| Component State | Fallback Mechanism |
| :--- | :--- |
| **Geolocation Denied** | Display informational banner; prompt citizen to select saved address or enter manual locality. |
| **Map Script Blocked / Error** | `mapService.renderFallback` displays a clean SVG notice: "Map Preview Unavailable. You can comfortably select a collector from the verified list below." |
| **External Geocoder Down** | `geocodingService` falls back to local recognized locality centroids. |
| **No Eligible Collectors** | Clear empty state displayed: "No collectors currently available for this location." Citizen can choose another locality or save request as draft. Auto-assignment is strictly forbidden. |

---

## 16. Security & Secret Protection

- **Zero Client Secrets**: No Google Maps API private keys, Mapbox secret tokens, or Supabase service-role keys are committed or present in client bundles.
- **Client Distance Not Trusted**: Even if a client injects a spoofed `distanceKm`, the service layer re-evaluates coordinates against collector service radii prior to persistence.
- **Coordinate Boundary Sanitization**: All coordinates pass boundary filters (-90 to +90 lat, -180 to +180 lng) to eliminate NaN, Infinity, and SQL/script injection payloads.

---

## 17. Automated Test Suite

Test suite `tests/test-phase4e-location.js` validates **34 automated assertions** across 12 test groups:

- **Group 1**: Geolocation Coordinates Validation (4 assertions)
- **Group 2**: Haversine Distance Calculation & Formatting (3 assertions)
- **Group 3**: Collector Operational Eligibility & Status Evaluation (4 assertions)
- **Group 4**: Configurable Service-Radius Enforcement (3 assertions)
- **Group 5**: Privacy-First Public Collector Masking (3 assertions)
- **Group 6**: Citizen Saved Location Isolation & Access Control (2 assertions)
- **Group 7**: Collector Location Isolation (1 assertion)
- **Group 8**: Selected Collector Immutability Enforcement (3 assertions)
- **Group 9**: Out-of-Area Fallback & Citizen-Driven Selection (3 assertions)
- **Group 10**: Mock vs Supabase Provider Binding (3 assertions)
- **Group 11**: Map Provider Abstraction & Resilient Offline Fallback (3 assertions)
- **Group 12**: Security Verification & Secrets Scanning (2 assertions)

### Test Execution Command
```bash
npm run test:phase4e
```

---

## 18. Scalability & PostGIS Migration Path

For high-volume production deployments (> 100,000 active collectors across metropolitan zones):
1. **Enable PostGIS Extension**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
2. **Add Geography Column & Spatial Index**:
   ```sql
   ALTER TABLE collectors ADD COLUMN geog geography(Point, 4326);
   UPDATE collectors SET geog = ST_SetSRID(ST_MakePoint(approx_longitude, approx_latitude), 4326);
   CREATE INDEX idx_collectors_geog ON collectors USING GIST(geog);
   ```
3. **Spatial Query Replacement**:
   Replace application-level Haversine with `ST_DWithin`:
   ```sql
   SELECT id, name, ST_Distance(geog, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) / 1000 AS distance_km
   FROM collectors
   WHERE ST_DWithin(geog, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), service_radius_km * 1000)
     AND status = 'active' AND is_online = true
   ORDER BY distance_km ASC;
   ```

---

## 19. Environment Configuration

The following variables in `.env` and `frontend/config/environment.js` control location behavior:

```ini
# MAP_PROVIDER: "mock" (default offline SVG radar) | "leaflet" (OpenStreetMap) | "mapbox" | "google"
MAP_PROVIDER=mock

# Public client-safe map key if using Mapbox or Google (MUST be HTTP-referrer restricted)
MAP_PUBLIC_KEY=
MAP_STYLE=

# GEOCODING_PROVIDER: "mock" (default local lookup) | "nominatim" | "google"
GEOCODING_PROVIDER=mock
```

---

## 20. Known Limitations & Scope Boundaries

1. **Routing ETA**: Straight-line Haversine distance is displayed as `"Approx. X.X km away"`. Real-time traffic road network ETAs require a commercial matrix routing API (e.g., Google Distance Matrix / Mapbox Directions) which will be integrated in Phase 5.
2. **Live Collector GPS Tracking**: Real-time vehicle telematics / live moving markers during the `EN_ROUTE` phase will utilize Supabase Realtime geolocation broadcasts in Phase 5.
3. **Multi-Stop Route Optimization**: Multi-pickup collector daily itinerary route optimization is scheduled for the Collector Cockpit Phase 5 enhancement.
