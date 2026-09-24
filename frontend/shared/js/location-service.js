/* =========================================================
   E-KABAADI PLATFORM — LOCATION & MAPS INTELLIGENCE
   File: frontend/shared/js/location-service.js

   Core Location Intelligence Layer:
   1. Coordinate Validation & Normalization
   2. Haversine Geographic Distance Calculator
   3. Collector Public Profile Sanitizer (Privacy-First)
   4. Collector Operational Status & Eligibility Evaluator
   5. Nearby Collector Discovery & Transparent Ranking
   6. Geocoding Service Abstraction (Provider Adapter)
   7. Citizen Location Manager (Consent-First Geolocation & Fallbacks)
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_LOCATION = factory();
        root.validateCoordinates = root.EKABADI_LOCATION.validateCoordinates;
        root.calculateHaversineDistance = root.EKABADI_LOCATION.calculateHaversineDistance;
        root.nearbyCollectorService = root.EKABADI_LOCATION.nearbyCollectorService;
        root.geocodingService = root.EKABADI_LOCATION.geocodingService;
        root.citizenLocationManager = root.EKABADI_LOCATION.citizenLocationManager;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var EARTH_RADIUS_KM = 6371.0;
    var DEFAULT_SERVICE_RADIUS_KM = 8.0;

    // ─────────────────────────────────────────────
    // 1. COORDINATE VALIDATION
    // ─────────────────────────────────────────────
    function validateCoordinates(lat, lng) {
        var numLat = Number(lat);
        var numLng = Number(lng);

        if (lat === null || lat === undefined || lng === null || lng === undefined) {
            return { valid: false, error: "Coordinates cannot be null or undefined." };
        }

        if (isNaN(numLat) || isNaN(numLng)) {
            return { valid: false, error: "Coordinates must be valid numbers (received NaN)." };
        }

        if (!isFinite(numLat) || !isFinite(numLng)) {
            return { valid: false, error: "Coordinates cannot be infinite." };
        }

        if (numLat < -90.0 || numLat > 90.0) {
            return { valid: false, error: "Latitude out of range [-90, +90]: " + numLat };
        }

        if (numLng < -180.0 || numLng > 180.0) {
            return { valid: false, error: "Longitude out of range [-180, +180]: " + numLng };
        }

        return {
            valid: true,
            lat: +(numLat.toFixed(6)),
            lng: +(numLng.toFixed(6))
        };
    }

    // ─────────────────────────────────────────────
    // 2. HAVERSINE DISTANCE CALCULATION
    // ─────────────────────────────────────────────
    function toRadians(degrees) {
        return degrees * (Math.PI / 180.0);
    }

    function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        var val1 = validateCoordinates(lat1, lon1);
        var val2 = validateCoordinates(lat2, lon2);

        if (!val1.valid) {
            return { valid: false, error: "Origin: " + val1.error, distanceKm: null };
        }
        if (!val2.valid) {
            return { valid: false, error: "Destination: " + val2.error, distanceKm: null };
        }

        var dLat = toRadians(val2.lat - val1.lat);
        var dLon = toRadians(val2.lng - val1.lng);
        var rLat1 = toRadians(val1.lat);
        var rLat2 = toRadians(val2.lat);

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(rLat1) * Math.cos(rLat2) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);

        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = EARTH_RADIUS_KM * c;
        var km = +(d.toFixed(1));
        var meters = Math.round(d * 1000);

        var formatted = km < 1.0
            ? "Approx. " + meters + " m away"
            : "Approx. " + km + " km away";

        return {
            valid: true,
            distanceKm: km,
            distanceMeters: meters,
            formatted: formatted
        };
    }

    // ─────────────────────────────────────────────
    // 3. PUBLIC COLLECTOR SANITIZER (PRIVACY FIRST)
    // ─────────────────────────────────────────────
    function sanitizeCollectorPublicProfile(collector) {
        if (!collector || typeof collector !== "object") return null;

        // Resolve approximate coordinates (never expose private home address)
        var approxLat = null;
        var approxLng = null;
        var locality = collector.serviceAreaLocality || collector.serviceArea || "Noida";

        if (collector.approxLocation && typeof collector.approxLocation === "object") {
            if (collector.approxLocation.lat !== undefined && collector.approxLocation.lng !== undefined) {
                approxLat = +(Number(collector.approxLocation.lat).toFixed(3));
                approxLng = +(Number(collector.approxLocation.lng).toFixed(3));
            }
            locality = collector.approxLocation.locality || locality;
        } else if (collector.location && typeof collector.location === "object") {
            // Round to 3 decimals to provide ~100m neighborhood precision, not rooftop
            if (collector.location.lat !== undefined && collector.location.lng !== undefined) {
                approxLat = +(Number(collector.location.lat).toFixed(3));
                approxLng = +(Number(collector.location.lng).toFixed(3));
            }
            locality = collector.location.city || locality;
        } else if (collector.approx_latitude !== undefined && collector.approx_longitude !== undefined) {
            approxLat = +(Number(collector.approx_latitude).toFixed(3));
            approxLng = +(Number(collector.approx_longitude).toFixed(3));
        }

        var radius = Number(collector.serviceRadiusKm || collector.serviceRadius || collector.service_radius_km || collector.service_radius) || DEFAULT_SERVICE_RADIUS_KM;

        return {
            id: collector.id,
            name: collector.name,
            avatar: collector.avatar || (collector.name ? collector.name.split(" ").map(function (w) { return w[0]; }).join("") : "CP"),
            businessName: collector.businessName || collector.business_name || (collector.name + " Recycling"),
            vehicleType: collector.vehicleType || collector.vehicle_type || "Three-Wheeler Tempo",
            vehicleNumber: collector.vehicleNumber || collector.vehicle_number || "UP 16 AB 1234",
            serviceArea: collector.serviceArea || collector.service_area || "Noida Urban Zone",
            serviceAreaLocality: locality,
            serviceRadiusKm: radius,
            approxLocation: (approxLat !== null && approxLng !== null) ? { lat: approxLat, lng: approxLng, locality: locality } : null,
            rating: Number(collector.rating) || 4.8,
            totalPickups: Number(collector.totalPickups || collector.total_pickups) || 0,
            completedPickups: Number(collector.completedPickups || collector.completed_pickups) || 0,
            queueLength: Number(collector.queueLength || collector.queue_length) || 0,
            responseTime: collector.responseTime || collector.response_time || "~20 min",
            isOnline: Boolean(collector.isOnline !== undefined ? collector.isOnline : collector.is_online),
            status: collector.status || "active",
            verificationStatus: collector.verificationStatus || collector.verification_status || "verified",
            acceptedMaterials: collector.acceptedMaterials || collector.accepted_materials || collector.scrapCategories || ["Paper", "Plastic", "Metal", "Cardboard"]
        };
    }

    // ─────────────────────────────────────────────
    // 4. COLLECTOR OPERATIONAL STATUS & ELIGIBILITY
    // ─────────────────────────────────────────────
    function evaluateCollectorEligibility(collector, citizenCoords) {
        if (!collector) return { eligible: false, reason: "Collector record not provided." };

        // 1. Account status: Must be active
        if (collector.status !== "active") {
            return {
                eligible: false,
                operationalStatus: collector.status === "suspended" ? "SUSPENDED" : "PENDING_APPROVAL",
                statusLabel: collector.status === "suspended" ? "Account Suspended" : "Pending Verification",
                reason: "Collector is not active on the platform."
            };
        }

        // 2. Verification status: Must be verified
        if (collector.verificationStatus !== "verified") {
            return {
                eligible: false,
                operationalStatus: "PENDING_APPROVAL",
                statusLabel: "Pending Approval",
                reason: "Collector background verification is pending."
            };
        }

        // 3. Online status
        if (!collector.isOnline) {
            return {
                eligible: false,
                operationalStatus: "OFFLINE",
                statusLabel: "Currently Offline",
                reason: "Collector is not currently accepting pickup requests."
            };
        }

        // 4. Service Radius & Distance check (if citizen coordinates available)
        var radius = Number(collector.serviceRadiusKm) || DEFAULT_SERVICE_RADIUS_KM;
        var inServiceRadius = true;
        var distanceKm = null;
        var distanceFormatted = "Distance unavailable";

        if (citizenCoords && citizenCoords.lat !== undefined && citizenCoords.lng !== undefined && collector.approxLocation) {
            var distResult = calculateHaversineDistance(
                citizenCoords.lat, citizenCoords.lng,
                collector.approxLocation.lat, collector.approxLocation.lng
            );
            if (distResult.valid) {
                distanceKm = distResult.distanceKm;
                distanceFormatted = distResult.formatted;
                if (distanceKm > radius) {
                    return {
                        eligible: false,
                        inServiceRadius: false,
                        distanceKm: distanceKm,
                        distanceFormatted: distanceFormatted,
                        operationalStatus: "OUTSIDE_SERVICE_AREA",
                        statusLabel: "Outside Service Area",
                        reason: "Pickup location is " + distanceKm + " km away (service radius is " + radius + " km)."
                    };
                }
            }
        }

        // 5. Workload / Queue load evaluation
        var queue = Number(collector.queueLength) || 0;
        var opStatus = queue >= 5 ? "BUSY" : "AVAILABLE";
        var statusLabel = queue >= 5 ? "Busy (" + queue + " in queue)" : "Available Now";

        return {
            eligible: true,
            inServiceRadius: true,
            distanceKm: distanceKm,
            distanceFormatted: distanceFormatted,
            operationalStatus: opStatus,
            statusLabel: statusLabel,
            queueLength: queue,
            reason: "Eligible for pickup selection."
        };
    }

    // ─────────────────────────────────────────────
    // 5. NEARBY COLLECTOR SERVICE
    // ─────────────────────────────────────────────
    var nearbyCollectorService = {
        /**
         * Discovers and ranks eligible nearby collectors based on citizen pickup location.
         * Transparent and factual — zero black-box scoring or AI manipulation.
         */
        findNearbyCollectors: function (citizenLocation, collectorsList, options) {
            options = options || {};
            var list = Array.isArray(collectorsList) ? collectorsList : [];

            // Validate citizen coords if provided
            var citizenCoords = null;
            if (citizenLocation && citizenLocation.lat !== undefined && citizenLocation.lng !== undefined) {
                var val = validateCoordinates(citizenLocation.lat, citizenLocation.lng);
                if (val.valid) citizenCoords = val;
            }

            var processed = list.map(function (rawCol) {
                var sanitized = sanitizeCollectorPublicProfile(rawCol);
                var evalResult = evaluateCollectorEligibility(sanitized, citizenCoords);

                return Object.assign({}, sanitized, {
                    eligible: evalResult.eligible,
                    inServiceRadius: evalResult.inServiceRadius !== false,
                    distanceKm: evalResult.distanceKm,
                    distanceFormatted: evalResult.distanceFormatted || "Distance unavailable",
                    operationalStatus: evalResult.operationalStatus,
                    statusLabel: evalResult.statusLabel,
                    ineligibilityReason: evalResult.eligible ? null : evalResult.reason
                });
            });

            // Filter
            var filtered = processed;
            if (options.onlineOnly) {
                filtered = filtered.filter(function (c) { return c.isOnline; });
            }
            if (options.eligibleOnly) {
                filtered = filtered.filter(function (c) { return c.eligible; });
            }
            if (options.material && options.material !== "all") {
                filtered = filtered.filter(function (c) {
                    return (c.acceptedMaterials || []).some(function (m) {
                        return m.toLowerCase() === options.material.toLowerCase();
                    });
                });
            }
            if (options.searchQuery) {
                var q = options.searchQuery.toLowerCase().trim();
                filtered = filtered.filter(function (c) {
                    return (c.name && c.name.toLowerCase().includes(q)) ||
                           (c.businessName && c.businessName.toLowerCase().includes(q)) ||
                           (c.serviceArea && c.serviceArea.toLowerCase().includes(q)) ||
                           (c.serviceAreaLocality && c.serviceAreaLocality.toLowerCase().includes(q)) ||
                           (c.vehicleType && c.vehicleType.toLowerCase().includes(q));
                });
            }

            // Transparent Factual Sorting
            var sortBy = options.sortBy || "distance";
            filtered.sort(function (a, b) {
                // Eligible collectors always precede ineligible
                if (a.eligible !== b.eligible) {
                    return a.eligible ? -1 : 1;
                }

                if (sortBy === "distance") {
                    var da = a.distanceKm !== null ? a.distanceKm : 99999;
                    var db = b.distanceKm !== null ? b.distanceKm : 99999;
                    return da - db;
                } else if (sortBy === "queue") {
                    return (a.queueLength || 0) - (b.queueLength || 0);
                } else if (sortBy === "rating") {
                    return (b.rating || 0) - (a.rating || 0);
                } else if (sortBy === "completedPickups") {
                    return (b.completedPickups || 0) - (a.completedPickups || 0);
                }
                return 0;
            });

            var eligibleCount = filtered.filter(function (c) { return c.eligible; }).length;

            return {
                citizenLocation: citizenCoords,
                totalFound: filtered.length,
                eligibleCount: eligibleCount,
                collectors: filtered
            };
        },

        getEligibleCollectors: function (params) {
            params = params || {};
            var citizenLoc = params.citizenLocation || params;
            var list = params.collectorsList;
            if (!list) {
                var storage = (typeof self !== "undefined" && self.EKABADI_STORAGE) ? self.EKABADI_STORAGE.adapter : null;
                if (!storage && typeof require === "function") {
                    try { storage = require("./storage").adapter; } catch (e) {}
                }
                list = storage ? storage.getCollection("collectors") : (typeof MOCK_COLLECTORS !== "undefined" ? MOCK_COLLECTORS : []);
            }
            var opts = Object.assign({ eligibleOnly: false }, params.options || {});
            var result = this.findNearbyCollectors(citizenLoc, list, opts);
            var eligible = result.collectors.filter(function (c) { return c.eligible; });
            return {
                eligibleCollectors: eligible,
                allCollectors: result.collectors,
                totalNearbyCount: result.totalFound,
                eligibleCount: result.eligibleCount,
                citizenLocation: result.citizenLocation
            };
        },

        calculateDistance: calculateHaversineDistance,

        filterByServiceArea: function (collectors, citizenCoords) {
            return (collectors || []).filter(function (c) {
                var evalResult = evaluateCollectorEligibility(c, citizenCoords);
                return evalResult.inServiceRadius !== false;
            });
        },

        filterByAvailability: function (collectors) {
            return (collectors || []).filter(function (c) {
                return c.isOnline && c.status === "active";
            });
        },

        sortCollectors: function (collectors, sortBy) {
            return this.findNearbyCollectors(null, collectors, { sortBy: sortBy }).collectors;
        },

        getCollectorLocation: function (collector) {
            var profile = sanitizeCollectorPublicProfile(collector);
            return profile ? profile.approxLocation : null;
        },

        getCollectorOperationalStatus: function (collector, citizenCoords) {
            return evaluateCollectorEligibility(collector, citizenCoords);
        }
    };

    // ─────────────────────────────────────────────
    // 6. GEOCODING SERVICE (PROVIDER ADAPTER)
    // ─────────────────────────────────────────────
    var KNOWN_LOCALITIES = {
        "sector 62": { lat: 28.6215, lng: 77.3645, locality: "Sector 62, Noida", city: "Noida", pincode: "201309" },
        "sector 18": { lat: 28.5712, lng: 77.3224, locality: "Sector 18, Noida", city: "Noida", pincode: "201301" },
        "sector 45": { lat: 28.5520, lng: 77.3420, locality: "Sector 45, Noida", city: "Noida", pincode: "201303" },
        "sector 55": { lat: 28.5980, lng: 77.3510, locality: "Sector 55, Noida", city: "Noida", pincode: "201307" },
        "sector 58": { lat: 28.6080, lng: 77.3600, locality: "Sector 58, Noida", city: "Noida", pincode: "201301" },
        "sector 15": { lat: 28.5833, lng: 77.3117, locality: "Sector 15, Noida", city: "Noida", pincode: "201301" },
        "indirapuram": { lat: 28.6415, lng: 77.3712, locality: "Indirapuram", city: "Ghaziabad", pincode: "201014" },
        "pari chowk": { lat: 28.4735, lng: 77.5085, locality: "Pari Chowk", city: "Greater Noida", pincode: "201310" },
        "default": { lat: 28.6208, lng: 77.3639, locality: "Sector 62, Noida", city: "Noida", pincode: "201309" }
    };

    var geocodingService = {
        geocodeAddress: function (addressText) {
            if (!addressText || typeof addressText !== "string") {
                return Promise.reject(new Error("Address text is required for geocoding."));
            }

            var clean = addressText.toLowerCase();
            for (var key in KNOWN_LOCALITIES) {
                if (key !== "default" && clean.includes(key)) {
                    var match = KNOWN_LOCALITIES[key];
                    return Promise.resolve({
                        lat: match.lat,
                        lng: match.lng,
                        locality: match.locality,
                        city: match.city,
                        pincode: match.pincode,
                        accuracy: "locality",
                        source: "local-catalog"
                    });
                }
            }

            // Fallback to default Noida center
            var fallback = KNOWN_LOCALITIES["default"];
            return Promise.resolve({
                lat: fallback.lat,
                lng: fallback.lng,
                locality: fallback.locality,
                city: fallback.city,
                pincode: fallback.pincode,
                accuracy: "approximate",
                source: "fallback"
            });
        },

        reverseGeocode: function (lat, lng) {
            var val = validateCoordinates(lat, lng);
            if (!val.valid) {
                return Promise.reject(new Error(val.error));
            }

            // Find closest known locality
            var closest = null;
            var minDistance = Infinity;

            for (var key in KNOWN_LOCALITIES) {
                var item = KNOWN_LOCALITIES[key];
                var d = calculateHaversineDistance(val.lat, val.lng, item.lat, item.lng);
                if (d.valid && d.distanceKm < minDistance) {
                    minDistance = d.distanceKm;
                    closest = item;
                }
            }

            var resolved = closest || KNOWN_LOCALITIES["default"];
            return Promise.resolve({
                address: resolved.locality + ", " + resolved.city + " - " + resolved.pincode,
                locality: resolved.locality,
                city: resolved.city,
                state: "Uttar Pradesh",
                pincode: resolved.pincode,
                lat: val.lat,
                lng: val.lng
            });
        }
    };

    // ─────────────────────────────────────────────
    // 7. CITIZEN LOCATION MANAGER (CONSENT-FIRST)
    // ─────────────────────────────────────────────
    var citizenLocationManager = {
        /**
         * Requests browser geolocation explicitly upon user click.
         * Handles permission denied, timeout, and accuracy degradation.
         */
        requestCurrentPosition: function (options) {
            options = options || { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 };

            return new Promise(function (resolve, reject) {
                if (typeof navigator === "undefined" || !navigator.geolocation) {
                    return reject({
                        code: "UNSUPPORTED",
                        message: "Browser geolocation is not supported on this device. Please use manual location."
                    });
                }

                navigator.geolocation.getCurrentPosition(
                    function (pos) {
                        var lat = pos.coords.latitude;
                        var lng = pos.coords.longitude;
                        var accuracy = pos.coords.accuracy; // meters

                        var val = validateCoordinates(lat, lng);
                        if (!val.valid) {
                            return reject({ code: "INVALID_COORDS", message: val.error });
                        }

                        var isApproximate = accuracy > 1000; // > 1 km

                        resolve({
                            lat: val.lat,
                            lng: val.lng,
                            accuracyMeters: Math.round(accuracy),
                            isApproximate: isApproximate,
                            source: "browser_gps"
                        });
                    },
                    function (err) {
                        var code = "UNKNOWN";
                        var msg = "Unable to retrieve location.";

                        if (err.code === 1) { // PERMISSION_DENIED
                            code = "PERMISSION_DENIED";
                            msg = "Location permission was denied. You can select your saved address or enter it manually.";
                        } else if (err.code === 2) { // POSITION_UNAVAILABLE
                            code = "POSITION_UNAVAILABLE";
                            msg = "Location information is currently unavailable. Please enter your location manually.";
                        } else if (err.code === 3) { // TIMEOUT
                            code = "TIMEOUT";
                            msg = "Location request timed out. Please try again or enter location manually.";
                        }

                        reject({ code: code, message: msg, originalError: err });
                    },
                    options
                );
            });
        }
    };

    return {
        validateCoordinates: validateCoordinates,
        calculateHaversineDistance: calculateHaversineDistance,
        sanitizeCollectorPublicProfile: sanitizeCollectorPublicProfile,
        evaluateCollectorEligibility: evaluateCollectorEligibility,
        nearbyCollectorService: nearbyCollectorService,
        geocodingService: geocodingService,
        citizenLocationManager: citizenLocationManager,
        EARTH_RADIUS_KM: EARTH_RADIUS_KM,
        DEFAULT_SERVICE_RADIUS_KM: DEFAULT_SERVICE_RADIUS_KM
    };
}));
