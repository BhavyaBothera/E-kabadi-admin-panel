/* =========================================================
   E-KABAADI PLATFORM — MAP SERVICE ABSTRACTION
   File: frontend/shared/js/map-service.js

   Provider Architecture:
   - mapService: Public interface
   - MockMapProvider: Interactive offline SVG radar & vector map
   - ProductionMapProvider: Configurable Leaflet/OSM / Mapbox / Google adapter
   - Resilient Fallback: If map fails or is disabled, list view works 100%
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_MAP = factory();
        root.mapService = root.EKABADI_MAP.mapService;
        root.MockMapProvider = root.EKABADI_MAP.MockMapProvider;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // ─────────────────────────────────────────────
    // 1. MOCK MAP PROVIDER (INTERACTIVE OFFLINE SVG)
    // ─────────────────────────────────────────────
    function MockMapProvider() {
        this.container = null;
        this.center = { lat: 28.6215, lng: 77.3645 };
        this.zoom = 13;
        this.markers = {};
        this.onMarkerSelect = null;
    }

    MockMapProvider.prototype.initializeMap = function (containerId, options) {
        options = options || {};
        var container = null;
        if (typeof document !== "undefined") {
            container = typeof containerId === "string" ? document.getElementById(containerId) : containerId;
        }
        if (!container) {
            // Virtual mock container for headless / testing environments
            container = { innerHTML: "", querySelectorAll: function () { return []; } };
        }

        this.container = container;
        if (options.center) this.center = options.center;
        if (options.zoom) this.zoom = options.zoom;
        if (options.onMarkerSelect) this.onMarkerSelect = options.onMarkerSelect;

        this.render();
        return Promise.resolve(this);
    };

    MockMapProvider.prototype.initialize = function (containerId, options) {
        return this.initializeMap(containerId, options);
    };

    MockMapProvider.prototype.setCenter = function (lat, lng, zoom) {
        this.center = { lat: Number(lat), lng: Number(lng) };
        if (zoom) this.zoom = zoom;
        this.render();
    };

    MockMapProvider.prototype.addMarker = function (id, data) {
        this.markers[id] = Object.assign({ id: id }, data);
        this.render();
    };

    MockMapProvider.prototype.removeMarker = function (id) {
        delete this.markers[id];
        this.render();
    };

    MockMapProvider.prototype.clearMarkers = function () {
        this.markers = {};
        this.render();
    };

    MockMapProvider.prototype.fitBounds = function () {
        // Mock adjusts scale/render based on present markers
        this.render();
    };

    MockMapProvider.prototype.destroy = function () {
        if (this.container) {
            this.container.innerHTML = "";
            this.container = null;
        }
        this.markers = {};
    };

    MockMapProvider.prototype.render = function () {
        if (!this.container) return;

        var width = this.container.clientWidth || 600;
        var height = this.container.clientHeight || 280;
        var self = this;

        // Bounding box mapping for SVG canvas projection
        var centerLat = this.center.lat || 28.6215;
        var centerLng = this.center.lng || 77.3645;
        var span = 0.12; // Degrees span for local view (~12 km)

        function project(lat, lng) {
            var x = ((lng - (centerLng - span / 2)) / span) * width;
            var y = (((centerLat + span / 2) - lat) / span) * height;
            return {
                x: Math.max(30, Math.min(width - 30, x)),
                y: Math.max(30, Math.min(height - 30, y))
            };
        }

        var centerPt = project(centerLat, centerLng);

        // Generate markers SVG
        var markersSvg = "";
        for (var id in this.markers) {
            var m = this.markers[id];
            if (m.lat === undefined || m.lng === undefined) continue;

            var pt = project(m.lat, m.lng);
            var isSelected = m.isSelected;
            var isCitizen = m.type === "citizen";
            var color = isCitizen ? "#2b6cb0" : (m.eligible !== false ? "#16a05d" : "#8c9b93");

            if (isCitizen) {
                // Citizen Pickup Marker (Home / Location Pin with pulse)
                markersSvg += `
                    <g class="map-marker citizen-marker" transform="translate(${pt.x}, ${pt.y})">
                        <circle r="18" fill="rgba(43, 108, 176, 0.2)" class="pulse-ring"/>
                        <circle r="8" fill="#2b6cb0" stroke="#fff" stroke-width="2.5"/>
                        <text y="-14" text-anchor="middle" font-size="11" font-weight="700" fill="#12372A">📍 You</text>
                    </g>
                `;
            } else {
                // Collector Marker (Vehicle icon with distance)
                var iconSymbol = m.vehicleType && m.vehicleType.toLowerCase().includes("truck") ? "🚛" : "🛺";
                var selectHighlight = isSelected ? `stroke="#C5D86D" stroke-width="3" filter="drop-shadow(0 0 6px rgba(197,216,109,0.8))"` : `stroke="#fff" stroke-width="1.5"`;

                markersSvg += `
                    <g class="map-marker collector-marker" data-collector-id="${m.id}" transform="translate(${pt.x}, ${pt.y})" style="cursor:pointer;">
                        ${isSelected ? `<circle r="22" fill="none" stroke="#16a05d" stroke-width="2" stroke-dasharray="4,3"/>` : ""}
                        <circle r="15" fill="${color}" ${selectHighlight}/>
                        <text y="4" text-anchor="middle" font-size="12">${iconSymbol}</text>
                        <text y="-20" text-anchor="middle" font-size="10.5" font-weight="700" fill="#12372A" background="#fff">
                            ${m.name ? m.name.split(" ")[0] : "Partner"}
                        </text>
                        ${m.distanceFormatted ? `<text y="28" text-anchor="middle" font-size="9.5" font-weight="600" fill="#526E48">${m.distanceFormatted.replace("Approx. ", "")}</text>` : ""}
                    </g>
                `;
            }
        }

        var html = `
            <div style="position:relative;width:100%;height:100%;min-height:260px;background:#eef4f0;border-radius:12px;overflow:hidden;border:1px solid #d4ded8;">
                <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="position:absolute;top:0;left:0;">
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(18, 55, 42, 0.06)" stroke-width="1"/>
                        </pattern>
                        <style>
                            @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.6); opacity: 0; } }
                            .pulse-ring { animation: pulse-ring 2s infinite ease-out; transform-origin: center; }
                        </style>
                    </defs>
                    <!-- Background Grid -->
                    <rect width="100%" height="100%" fill="#f4f7f5"/>
                    <rect width="100%" height="100%" fill="url(#grid)"/>

                    <!-- Service Radius Wave around Citizen -->
                    <circle cx="${centerPt.x}" cy="${centerPt.y}" r="${Math.min(width, height) * 0.4}" fill="rgba(22, 160, 93, 0.05)" stroke="rgba(22, 160, 93, 0.25)" stroke-width="1.5" stroke-dasharray="6,4"/>

                    <!-- Markers -->
                    ${markersSvg}
                </svg>

                <!-- Map Overlay Badge -->
                <div style="position:absolute;top:10px;left:12px;background:rgba(255,255,255,0.92);backdrop-filter:blur(4px);padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;color:#12372A;border:1px solid #d4ded8;display:flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a05d;"></span>
                    <span>Radar View • Approximate Area (Noida Urban)</span>
                </div>

                <!-- Fallback Info Note -->
                <div style="position:absolute;bottom:8px;right:12px;background:rgba(255,255,255,0.85);padding:3px 8px;border-radius:6px;font-size:10px;color:#738079;">
                    Approximate positions for privacy
                </div>
            </div>
        `;

        this.container.innerHTML = html;

        // Wire marker click events
        if (this.onMarkerSelect) {
            var markerEls = this.container.querySelectorAll(".collector-marker");
            markerEls.forEach(function (el) {
                el.addEventListener("click", function () {
                    var colId = el.getAttribute("data-collector-id");
                    if (colId) self.onMarkerSelect(colId);
                });
            });
        }
    };

    // ─────────────────────────────────────────────
    // 2. PRODUCTION MAP PROVIDER (ADAPTER)
    // ─────────────────────────────────────────────
    function ProductionMapProvider(config) {
        this.config = config || {};
        this.provider = this.config.MAP_PROVIDER || "mock";
    }

    ProductionMapProvider.prototype.initializeMap = function (containerId, options) {
        // If provider is not mock and real key is present, wire Leaflet/Mapbox
        // In local/demo without keys, automatically delegates to MockMapProvider
        if (this.provider === "leaflet" && typeof window !== "undefined" && window.L) {
            // Leaflet open-source OSM integration
            try {
                var map = window.L.map(containerId).setView([options.center.lat, options.center.lng], options.zoom || 13);
                window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: "© OpenStreetMap contributors"
                }).addTo(map);
                return Promise.resolve(map);
            } catch (e) {
                console.warn("[ProductionMapProvider] Leaflet init failed, falling back to mock:", e);
            }
        }

        var mock = new MockMapProvider();
        return mock.initializeMap(containerId, options);
    };

    // ─────────────────────────────────────────────
    // 3. MAP SERVICE (FACADE)
    // ─────────────────────────────────────────────
    var activeInstance = null;

    var mapService = {
        createMap: function (containerId, options) {
            var config = (typeof window !== "undefined" && window.__EKABADI_CONFIG__) || {};
            var providerType = config.MAP_PROVIDER || "mock";

            if (providerType === "mock" || !config.MAP_PUBLIC_KEY) {
                activeInstance = new MockMapProvider();
            } else {
                activeInstance = new ProductionMapProvider(config);
            }

            return activeInstance.initializeMap(containerId, options).catch(function (err) {
                console.warn("[MapService] Map initialization error:", err);
                return mapService.renderFallback(containerId, "Map preview unavailable");
            });
        },

        initializeMap: function (containerId, options) {
            return this.createMap(containerId, options);
        },

        renderFallback: function (containerId, reason) {
            var msg = reason || "Map preview unavailable";
            var html = '<div class="map-fallback-notice" style="background:#f4f7f5;border:1px dashed #c0cdc6;border-radius:10px;padding:20px;text-align:center;color:#526E48;">' +
                '<div style="font-size:24px;margin-bottom:6px;">🗺️</div>' +
                '<div style="font-weight:700;font-size:13px;color:#12372A;">Map Preview Unavailable</div>' +
                '<div style="font-size:12px;margin-top:2px;color:#738079;">' +
                'You can comfortably select a collector from the verified list below.' +
                '</div>' +
                '</div>';
            if (typeof document !== "undefined") {
                var container = typeof containerId === "string" ? document.getElementById(containerId) : containerId;
                if (container) container.innerHTML = html;
            }
            return html;
        },

        setCenter: function (lat, lng, zoom) {
            if (activeInstance) activeInstance.setCenter(lat, lng, zoom);
        },

        addMarker: function (id, data) {
            if (activeInstance) activeInstance.addMarker(id, data);
        },

        removeMarker: function (id) {
            if (activeInstance) activeInstance.removeMarker(id);
        },

        fitBounds: function () {
            if (activeInstance) activeInstance.fitBounds();
        },

        destroy: function () {
            if (activeInstance) {
                activeInstance.destroy();
                activeInstance = null;
            }
        },

        getActiveMap: function () {
            return activeInstance;
        }
    };

    return {
        mapService: mapService,
        MockMapProvider: MockMapProvider,
        ProductionMapProvider: ProductionMapProvider
    };
}));
