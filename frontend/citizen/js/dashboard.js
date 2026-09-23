/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Dashboard Controller
   File: frontend/citizen/js/dashboard.js
   ========================================================= */

(function () {
    "use strict";

    function renderCitizenDashboard() {
        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001" };
        const citizenId = citizen.citizenId || "CIT-1001";

        if (typeof citizenService === "undefined") return;

        const stats = citizenService.getDashboardStats(citizenId);
        if (!stats) return;

        // Render Metric Counters
        const coinsEl = document.getElementById("dashEcoCoins");
        if (coinsEl) coinsEl.textContent = stats.ecoCoins;

        const earningsEl = document.getElementById("dashTotalEarnings");
        if (earningsEl) earningsEl.textContent = "₹" + stats.totalEarnings;

        const wasteEl = document.getElementById("dashWasteSold");
        if (wasteEl) wasteEl.textContent = stats.totalWasteSold + " kg";

        const co2El = document.getElementById("dashCo2Saved");
        if (co2El) co2El.textContent = stats.co2Saved + " kg";

        const waterEl = document.getElementById("dashWaterSaved");
        if (waterEl) waterEl.textContent = stats.waterSaved + " L";

        const treesEl = document.getElementById("dashTreesSaved");
        if (treesEl) treesEl.textContent = stats.treesEquivalent;

        // Render Active Pickup Widget
        const activeContainer = document.getElementById("dashActivePickupContainer");
        if (activeContainer) {
            const active = stats.activePickup;
            if (!active) {
                activeContainer.innerHTML = `
                    <div style="background:#fff;border-radius:16px;padding:24px;border:1px dashed var(--border-subtle);text-align:center;">
                        <span style="font-size:36px;display:block;margin-bottom:8px;">📦</span>
                        <h3 style="font-size:16px;font-weight:700;color:var(--forest-deep);margin-bottom:4px;">No Active Dispatches</h3>
                        <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">Schedule your household recyclables for doorstep pickup.</p>
                        <a href="sell-scrap.html" class="btn-primary" style="display:inline-flex;padding:10px 18px;font-size:13px;">Sell Scrap Now →</a>
                    </div>
                `;
            } else {
                const statusMap = {
                    requested: { text: "Pending Collector Acceptance", class: "status-pill warning" },
                    accepted: { text: "Pickup Confirmed", class: "status-pill info" },
                    on_the_way: { text: "Collector En Route 📍", class: "status-pill info" },
                    arrived: { text: "Collector at Gate 🔔", class: "status-pill warning" },
                    collecting: { text: "Weighing in Progress ⚖️", class: "status-pill warning" }
                };
                const st = statusMap[active.status] || { text: active.status, class: "status-pill info" };

                activeContainer.innerHTML = `
                    <div class="active-pickup-card" style="background:#fff;border-radius:16px;padding:22px;border:1.5px solid var(--forest);box-shadow:var(--shadow-sm);">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
                            <div>
                                <span class="${st.class}">${st.text}</span>
                                <h3 style="font-size:17px;font-weight:800;color:var(--forest-deep);margin-top:6px;">Order #${active.id}</h3>
                            </div>
                            <a href="tracking.html?id=${active.id}" class="btn-primary" style="padding:8px 14px;font-size:12px;">Live Track →</a>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;background:rgba(247,244,234,0.6);padding:12px;border-radius:10px;font-size:13px;margin-bottom:12px;">
                            <div><span style="color:var(--text-muted);display:block;font-size:11px;">Partner</span><strong>${active.collectorName}</strong></div>
                            <div><span style="color:var(--text-muted);display:block;font-size:11px;">Estimated Lot</span><strong>${active.estimatedWeight || 0} kg (${active.scrapType})</strong></div>
                            <div><span style="color:var(--text-muted);display:block;font-size:11px;">Expected Cash</span><strong style="color:var(--forest);">₹${active.estimatedValue || 0}</strong></div>
                            <div><span style="color:var(--text-muted);display:block;font-size:11px;">Slot</span><strong>${active.scheduledDate}</strong></div>
                        </div>
                    </div>
                `;
            }
        }
    }

    document.addEventListener("DOMContentLoaded", renderCitizenDashboard);
    window.addEventListener("ekabadi:statechange", renderCitizenDashboard);
})();
