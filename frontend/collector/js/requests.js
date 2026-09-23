/* =========================================================
   E-KABAADI PLATFORM — Collector Partner
   Pickup Requests Queue Controller
   File: frontend/collector/js/requests.js
   ========================================================= */

(function () {
    "use strict";

    function renderRequests() {
        const collector = window.currentCollector || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { collectorId: "COL-2001" };
        const collectorId = collector.collectorId || "COL-2001";

        if (typeof pickupService === "undefined") return;

        const allPickups = pickupService.getAll();
        // Pickups requested that are either specifically for this collector or unassigned in the sector
        const requested = allPickups.filter(p => p.status === "requested" && (!p.collectorId || p.collectorId === collectorId));
        const container = document.getElementById("requestsListContainer");
        if (!container) return;

        if (requested.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;background:#fff;border-radius:12px;border:1.5px dashed var(--border-subtle);">
                    <span style="font-size:48px;display:block;margin-bottom:12px;">📡</span>
                    <h3 style="font-size:18px;font-weight:800;color:var(--forest-deep);">No Pending Requests in Zone</h3>
                    <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">
                        Radar scanner active. You will receive an instant audio and visual alert when a citizen books scrap collection.
                    </p>
                    <div style="margin-top:20px;">
                        <a href="dashboard.html" class="btn-secondary">Return to Cockpit</a>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = requested.map((p, idx) => {
            const weight = p.estimatedWeight || 0;
            const value = p.estimatedValue || 0;
            const items = (p.items || []).map(i => `${i.categoryName || i.name} (${i.estimatedWeight || 0} kg)`).join(", ") || "Recyclables";
            const slot = p.timeSlot || p.time || "Immediate / Today";
            const address = p.pickupAddress || p.address || "Sector 62, Noida";

            return `
                <div class="request-card" id="reqCard_${p.id}">
                    <div class="request-header">
                        <div>
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                <span class="status-pill warning">High Match Route</span>
                                <span style="font-size:13px;font-weight:700;color:var(--text-muted);">#${p.id}</span>
                            </div>
                            <h2 style="font-size:18px;font-weight:800;color:var(--forest-deep);">${p.citizenName}</h2>
                            <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">
                                📍 ${address} • Near Electronic City Zone
                            </div>
                        </div>
                        <div class="timer-badge">
                            <span>⏳</span> Respond within: <strong>${45 - (idx * 10)}s</strong>
                        </div>
                    </div>

                    <div class="lot-breakdown-row">
                        <div>
                            <span style="font-size:12px;color:var(--text-muted);display:block;">Estimated Material</span>
                            <strong style="color:var(--forest-deep);font-size:14px;">📦 ${items}</strong>
                        </div>
                        <div>
                            <span style="font-size:12px;color:var(--text-muted);display:block;">Estimated Weight</span>
                            <strong style="color:var(--forest-deep);font-size:14px;">~${weight} kg</strong>
                        </div>
                        <div>
                            <span style="font-size:12px;color:var(--text-muted);display:block;">Expected Payout</span>
                            <strong style="color:var(--forest);font-size:16px;">₹${Number(value).toFixed(2)}</strong>
                        </div>
                        <div>
                            <span style="font-size:12px;color:var(--text-muted);display:block;">Requested Slot</span>
                            <strong style="color:var(--forest-deep);font-size:14px;">${slot}</strong>
                        </div>
                    </div>

                    <div style="display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap;">
                        <button type="button" class="btn-danger" onclick="window.declineReq('${p.id}')">Decline Request</button>
                        <button type="button" class="btn-primary" onclick="window.acceptReq('${p.id}', '${p.citizenName}', '${address}')">
                            Accept & Add to Route →
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    }

    let isAccepting = false;
    window.acceptReq = function (pickupId, name, location) {
        if (isAccepting) return;
        isAccepting = true;

        if (typeof pickupService === "undefined") {
            isAccepting = false;
            return;
        }

        const collector = window.currentCollector || { collectorId: "COL-2001" };
        const res = pickupService.acceptPickup(pickupId, collector.collectorId || "COL-2001");
        if (res && res.success) {
            showToast(`Accepted pickup #${pickupId} for ${name}! Moving to Active Dispatch.`, "success");
            setTimeout(() => {
                window.location.href = `active-pickup.html?id=${pickupId}`;
            }, 900);
        } else {
            isAccepting = false;
            showToast((res && res.error) || "Could not accept pickup.", "danger");
        }
    };

    window.declineReq = function (pickupId) {
        const el = document.getElementById(`reqCard_${pickupId}`);
        if (el) el.style.display = "none";
        showToast("Request passed to next partner.", "info");
    };

    document.addEventListener("DOMContentLoaded", renderRequests);
    window.addEventListener("ekabadi:statechange", renderRequests);
})();
