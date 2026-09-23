/* =========================================================
   E-KABAADI PLATFORM — Collector Partner
   Dashboard & Cockpit Controller
   File: frontend/collector/js/dashboard.js
   ========================================================= */

(function () {
    "use strict";

    function renderCollectorDashboard() {
        const collector = window.currentCollector || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { collectorId: "COL-2001", id: "USR-COL-001" };
        const collectorId = collector.collectorId || "COL-2001";

        if (typeof pickupService === "undefined") return;

        const allPickups = pickupService.getAll();
        const myPickups = allPickups.filter(p => p.collectorId === collectorId);

        // Active pickups: accepted, on_the_way, arrived, collecting
        const activePickups = myPickups.filter(p => ["accepted", "on_the_way", "arrived", "collecting"].includes(p.status));
        const completedPickups = myPickups.filter(p => ["completed", "paid"].includes(p.status));

        // Incoming requests for this collector or in zone
        const requestedPickups = allPickups.filter(p => p.status === "requested" && (!p.collectorId || p.collectorId === collectorId));

        // Update stats counters
        const todayCountEl = document.querySelector(".stats-grid .stat-card:nth-child(1) .stat-value");
        if (todayCountEl) todayCountEl.textContent = `${completedPickups.length} / ${completedPickups.length + activePickups.length + requestedPickups.length}`;

        const scrapMass = completedPickups.reduce((sum, p) => sum + (p.finalWeight || p.estimatedWeight || 0), 0) + 142.5; // include baseline
        const massEl = document.querySelector(".stats-grid .stat-card:nth-child(2) .stat-value");
        if (massEl) massEl.textContent = `${scrapMass.toFixed(1)} kg`;

        const revenue = completedPickups.reduce((sum, p) => sum + (p.finalValue || p.estimatedValue || 0), 0) + 1840;
        const revEl = document.querySelector(".stats-grid .stat-card:nth-child(3) .stat-value");
        if (revEl) revEl.textContent = `₹${revenue.toLocaleString("en-IN")}`;

        const coinsEl = document.querySelector(".stats-grid .stat-card:nth-child(4) .stat-value");
        if (coinsEl) coinsEl.textContent = (collector.ecoCoins || 2400).toLocaleString("en-IN");

        // Active Pickup Banner
        const activeBanner = document.getElementById("activePickupBanner") || document.querySelector(".ui-card[style*='border:2px solid var(--forest)']");
        if (activeBanner) {
            if (activePickups.length > 0) {
                const current = activePickups[0];
                const weight = current.estimatedWeight || current.finalWeight || 0;
                const value = current.estimatedValue || current.finalValue || 0;
                activeBanner.style.display = "block";
                activeBanner.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
                        <div>
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                                <span class="status-pill warning" style="animation:blink 1.4s infinite;">● Active Dispatch: ${current.status.toUpperCase()}</span>
                                <span style="font-size:13px;color:var(--text-muted);font-weight:700;">Order #${current.id}</span>
                            </div>
                            <h2 style="font-size:18px;font-weight:800;color:var(--forest-deep);">Citizen: ${current.citizenName}</h2>
                            <p style="font-size:13px;color:var(--text-muted);margin-top:2px;">
                                ${current.pickupAddress || current.address || "Sector 62, Noida"} • ~${weight} kg • Est: ₹${Number(value).toFixed(2)}
                            </p>
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            <button type="button" class="btn-secondary" onclick="showToast('Calling citizen ${current.citizenName}...', 'info')">
                                📞 Call Citizen
                            </button>
                            <a href="active-pickup.html?id=${current.id}" class="btn-primary">
                                Open Controls & Transit →
                            </a>
                            <a href="collection.html?id=${current.id}" class="btn-secondary">
                                Digital Scale →
                            </a>
                        </div>
                    </div>
                `;
            } else {
                activeBanner.style.display = "block";
                activeBanner.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;">
                        <div>
                            <strong style="color:var(--forest-deep);font-size:15px;">No Active Pickup In Transit</strong>
                            <p style="font-size:13px;color:var(--text-muted);margin-top:2px;">Check incoming dispatch requests below to accept your next pickup assignment.</p>
                        </div>
                        <a href="requests.html" class="btn-primary" style="padding:8px 16px;font-size:13px;">View Requests Queue →</a>
                    </div>
                `;
            }
        }

        // Live Requests Queue
        const reqQueueContainer = document.getElementById("requestsQueueContainer") || document.querySelector(".ui-card:has(.ui-card-title)");
        const queueHeader = document.querySelector(".ui-card-header .ui-card-title");
        if (queueHeader && queueHeader.textContent.includes("Queue")) {
            const queueCard = queueHeader.closest(".ui-card");
            const queueItems = queueCard.querySelectorAll("[id^='dashReq']");
            // If we have actual requested pickups in storage, let's render them
            if (requestedPickups.length > 0) {
                let html = `
                    <div class="ui-card-header">
                        <div>
                            <div class="ui-card-title">Live Dispatch Queue</div>
                            <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">New pickups requested in your service area (${requestedPickups.length} Available)</div>
                        </div>
                        <a href="requests.html" style="font-size:13px;color:var(--forest);font-weight:700;">View All (${requestedPickups.length}) →</a>
                    </div>
                `;

                requestedPickups.slice(0, 3).forEach((p, idx) => {
                    const weight = p.estimatedWeight || 0;
                    const value = p.estimatedValue || 0;
                    const itemsDesc = (p.items || []).map(i => i.categoryName || i.name).join(", ") || "Mixed Recyclables";

                    html += `
                        <div id="dashReq_${p.id}" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;background:#fff;border:1px solid var(--border-subtle);border-radius:12px;padding:16px;margin-bottom:12px;">
                            <div style="display:flex;align-items:center;gap:14px;">
                                <div class="sidebar-avatar" style="background:linear-gradient(135deg,#c48b00,#e6a500);">
                                    ${p.citizenName ? p.citizenName.split(" ").map(w=>w[0]).join("") : "CZ"}
                                </div>
                                <div>
                                    <strong style="color:var(--forest-deep);font-size:15px;display:block;">${p.citizenName}</strong>
                                    <span style="font-size:13px;color:var(--text-muted);">${p.pickupAddress || p.address || "Sector 62, Noida"} • Requested</span>
                                    <div style="font-size:12px;color:var(--forest);font-weight:700;margin-top:2px;">
                                        📦 ~${weight} kg ${itemsDesc} • Est. ₹${Number(value).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex;gap:10px;">
                                <button type="button" class="btn-danger" onclick="window.declineDashReq('${p.id}')">Decline</button>
                                <button type="button" class="btn-primary" onclick="window.acceptDashReq('${p.id}', '${p.citizenName}')">Accept & Queue</button>
                            </div>
                        </div>
                    `;
                });

                queueCard.innerHTML = html;
            }
        }
    }

    window.acceptDashReq = function (pickupId, citizenName) {
        if (typeof pickupService === "undefined") return;
        const collector = window.currentCollector || { collectorId: "COL-2001" };
        const res = pickupService.acceptPickup(pickupId, collector.collectorId || "COL-2001");
        if (res.success) {
            showToast(`Accepted pickup #${pickupId} for ${citizenName}! Route queued.`, "success");
            renderCollectorDashboard();
        } else {
            showToast(res.error || "Could not accept pickup.", "danger");
        }
    };

    window.declineDashReq = function (pickupId) {
        const el = document.getElementById(`dashReq_${pickupId}`) || document.getElementById(pickupId);
        if (el) el.style.display = "none";
        showToast("Request passed to next nearest partner in zone.", "info");
    };

    document.addEventListener("DOMContentLoaded", renderCollectorDashboard);
    window.addEventListener("ekabadi:statechange", renderCollectorDashboard);
})();
