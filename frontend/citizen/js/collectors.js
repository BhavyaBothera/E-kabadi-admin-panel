/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Find & Select Nearby Collectors Controller
   File: frontend/citizen/js/collectors.js
   
   RULE: Citizen selects the Collector. Admin does NOT assign.
   ========================================================= */

(function () {
    "use strict";

    let filters = {
        material: "all",
        maxDistance: null,
        minRating: null,
        onlineOnly: false,
        sortBy: "distance"
    };

    function renderCollectorsList() {
        const container = document.getElementById("collectorsListContainer");
        if (!container) return;

        if (typeof collectorService === "undefined") return;

        const collectors = collectorService.getNearbyCollectors(filters);

        if (collectors.length === 0) {
            container.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:48px 20px;background:#fff;border-radius:12px;border:1px dashed var(--border-subtle);">
                    <span style="font-size:36px;display:block;margin-bottom:8px;">🔍</span>
                    <h3 style="font-size:16px;font-weight:700;color:var(--forest-deep);">No collectors match your filters</h3>
                    <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">Try broadening your distance or material requirements.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = collectors.map(col => `
            <div class="collector-card ui-card" style="display:flex;flex-direction:column;justify-content:space-between;border:1.5px solid var(--border-subtle);transition:all 0.2s ease;">
                <div>
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                        <div style="display:flex;gap:12px;align-items:center;">
                            <div class="sidebar-avatar" style="width:46px;height:46px;background:var(--forest);font-size:16px;">
                                ${col.avatar || "RK"}
                            </div>
                            <div>
                                <h3 style="font-size:16px;font-weight:800;color:var(--forest-deep);">${col.name}</h3>
                                <span style="font-size:12px;color:var(--text-muted);">${col.businessName || "Verified Partner"}</span>
                            </div>
                        </div>
                        <span class="status-pill ${col.isOnline ? "success" : "neutral"}" style="font-size:11px;">
                            ${col.isOnline ? "● Radar Online" : "○ Offline"}
                        </span>
                    </div>

                    <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;background:rgba(247,244,234,0.6);border-radius:8px;padding:10px;font-size:12px;margin-bottom:14px;text-align:center;">
                        <div>
                            <span style="color:var(--text-muted);display:block;font-size:10px;">RATING</span>
                            <strong style="color:var(--forest-deep);">⭐ ${col.rating || 4.8}</strong>
                        </div>
                        <div>
                            <span style="color:var(--text-muted);display:block;font-size:10px;">DISTANCE</span>
                            <strong style="color:var(--forest);">${col.distance || 1.2} km</strong>
                        </div>
                        <div>
                            <span style="color:var(--text-muted);display:block;font-size:10px;">QUEUE</span>
                            <strong style="color:var(--forest-deep);">${col.queueLength || 0} jobs</strong>
                        </div>
                    </div>

                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">
                        <div>🚛 <strong>Vehicle:</strong> ${col.vehicleType} (${col.vehicleNumber})</div>
                        <div>⏱️ <strong>Response:</strong> ${col.responseTime || "~15 min"} • Radius: ${col.serviceRadius || 8} km</div>
                    </div>

                    <div style="margin-bottom:16px;">
                        <span style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;">ACCEPTED SCRAP:</span>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;">
                            ${(col.acceptedMaterials || ["Paper", "Plastic"]).map(m => `
                                <span style="background:#e8f4ed;color:#1F6F43;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${m}</span>
                            `).join("")}
                        </div>
                    </div>
                </div>

                <button type="button" class="btn-primary" onclick="window.selectCollector('${col.id}')" style="width:100%;justify-content:center;padding:10px;font-size:13px;">
                    Select Collector & Schedule →
                </button>
            </div>
        `).join("");
    }

    window.selectCollector = function (collectorId) {
        if (typeof collectorService === "undefined") return;
        const col = collectorService.getCollectorById(collectorId);
        if (!col) return;

        try {
            sessionStorage.setItem("ekabadi_selected_collector", JSON.stringify({
                id: col.id,
                name: col.name,
                businessName: col.businessName,
                vehicle: col.vehicleType,
                number: col.vehicleNumber,
                rating: col.rating,
                avatar: col.avatar
            }));
        } catch (e) {}

        showToast(`Selected ${col.name}! Proceeding to schedule pickup.`, "success");
        setTimeout(() => {
            window.location.href = "pickup.html";
        }, 500);
    };

    window.filterByMaterial = function (mat) {
        filters.material = mat;
        renderCollectorsList();
    };

    window.toggleOnlineOnly = function (checkbox) {
        filters.onlineOnly = checkbox.checked;
        renderCollectorsList();
    };

    window.setSortBy = function (sort) {
        filters.sortBy = sort;
        renderCollectorsList();
    };

    document.addEventListener("DOMContentLoaded", () => {
        renderCollectorsList();
    });
})();
