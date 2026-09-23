/* =========================================================
   E-KABAADI PLATFORM — Collector Partner
   Active Pickup & Route Dispatch Controller
   File: frontend/collector/js/active-pickup.js
   
   State Flow:
   ACCEPTED → ON_THE_WAY → ARRIVED → COLLECTING → collection.html
   ========================================================= */

(function () {
    "use strict";

    let currentPickupId = null;

    function getActivePickup() {
        const urlParams = new URLSearchParams(window.location.search);
        const qId = urlParams.get("id");

        if (typeof pickupService === "undefined") return null;

        if (qId) {
            const p = pickupService.getById(qId);
            if (p) return p;
        }

        const collector = window.currentCollector || { collectorId: "COL-2001" };
        const collectorId = collector.collectorId || "COL-2001";
        const all = pickupService.getAll();

        // Find active pickup for this partner
        return all.find(p => p.collectorId === collectorId && ["accepted", "on_the_way", "arrived", "collecting"].includes(p.status)) ||
               all.find(p => ["accepted", "on_the_way", "arrived"].includes(p.status)) ||
               all[0];
    }

    function renderActivePickup() {
        const pickup = getActivePickup();
        if (!pickup) {
            const layout = document.querySelector(".active-layout");
            if (layout) {
                layout.innerHTML = `
                    <div style="grid-column: 1 / -1;text-align:center;padding:60px 20px;background:#fff;border-radius:12px;border:1px dashed var(--border-subtle);">
                        <span style="font-size:48px;display:block;margin-bottom:12px;">🚚</span>
                        <h3 style="font-size:18px;font-weight:800;color:var(--forest-deep);">No Active Pickup In Transit</h3>
                        <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">You are currently idle and ready for new dispatch requests.</p>
                        <div style="margin-top:20px;">
                            <a href="requests.html" class="btn-primary">View Dispatch Queue →</a>
                        </div>
                    </div>
                `;
            }
            return;
        }

        currentPickupId = pickup.id;

        // Update header
        const titleEl = document.querySelector(".page-title");
        if (titleEl) titleEl.textContent = `Active Pickup Dispatch #${pickup.id}`;

        const subtitleEl = document.querySelector(".page-subtitle");
        if (subtitleEl) subtitleEl.textContent = `Navigating to Citizen ${pickup.citizenName} at ${pickup.pickupAddress || pickup.address || "Sector 62, Noida"}.`;

        // Update citizen card
        const citizenNameEl = document.querySelector(".profile-sidebar-card strong, .ui-card strong[style*='font-size:16px']");
        if (citizenNameEl) citizenNameEl.textContent = pickup.citizenName;

        const addressEl = document.querySelector(".ui-card div[style*='background:rgba(247,244,234,0.6)']");
        if (addressEl) {
            addressEl.innerHTML = `📍 <strong>Address:</strong> ${pickup.pickupAddress || pickup.address || "Sector 62, Noida"}`;
        }

        const noteEl = document.querySelector(".ui-card div[style*='background:#fff8eb']");
        if (noteEl) {
            noteEl.innerHTML = `🔔 <strong>Citizen Instruction:</strong> ${pickup.notes || "Please call before arrival."}`;
        }

        // Update lot breakdown
        const lotCard = document.querySelectorAll(".ui-card")[2];
        if (lotCard) {
            const items = pickup.items || [
                { categoryName: "Newspaper & Books", estimatedWeight: 15.0, ratePerKg: 14 },
                { categoryName: "Corrugated Cardboard", estimatedWeight: 10.5, ratePerKg: 11.5 }
            ];

            let itemsHtml = `<div class="ui-card-title" style="margin-bottom:12px;">Declared Scrap Lot Breakdown</div>`;
            items.forEach(it => {
                itemsHtml += `
                    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle);font-size:14px;">
                        <span>📦 ${it.categoryName || it.name}</span>
                        <strong>~${it.estimatedWeight || it.weight || 0} kg (@ ₹${it.ratePerKg || 12}/kg)</strong>
                    </div>
                `;
            });
            const estVal = pickup.estimatedValue || pickup.finalValue || 0;
            itemsHtml += `
                <div style="display:flex;justify-content:space-between;padding:12px 0 4px;font-size:15px;">
                    <strong style="color:var(--forest-deep);">Estimated Payout</strong>
                    <strong style="color:var(--forest);font-size:18px;">₹${Number(estVal).toFixed(2)}</strong>
                </div>
            `;
            lotCard.innerHTML = itemsHtml;
        }

        // Action controls based on status
        renderControls(pickup);
    }

    function renderControls(pickup) {
        const controlsCard = document.querySelector(".ui-card:has(#arrivedBtn)") || document.querySelector(".ui-card .ui-card-title:contains('Doorstep')")?.parentElement;
        const container = document.getElementById("actionControlsContainer") || document.querySelector(".ui-card:has(#arrivedBtn)");
        if (!container) return;

        let btnsHtml = "";

        if (pickup.status === "accepted") {
            btnsHtml = `
                <button type="button" class="btn-primary" onclick="window.transitionPickupState('on_the_way')" style="flex:1;justify-content:center;padding:14px;">
                    🚀 Depart Towards Citizen (Start Transit)
                </button>
                <button type="button" class="btn-danger" onclick="window.cancelActivePickup()" style="padding:14px;">
                    Cancel Dispatch
                </button>
            `;
        } else if (pickup.status === "on_the_way") {
            btnsHtml = `
                <button type="button" class="btn-primary" id="arrivedBtn" onclick="window.transitionPickupState('arrived')" style="flex:1;justify-content:center;padding:14px;">
                    📍 I Have Arrived at Society Gate
                </button>
                <a href="navigation.html?id=${pickup.id}" class="btn-secondary" style="display:inline-flex;align-items:center;padding:14px;">
                    Radar Map 🛰️
                </a>
                <button type="button" class="btn-danger" onclick="window.cancelActivePickup()" style="padding:14px;">
                    Cancel
                </button>
            `;
        } else if (pickup.status === "arrived") {
            btnsHtml = `
                <button type="button" class="btn-primary" onclick="window.startWeighing()" style="flex:1;justify-content:center;padding:14px;background:linear-gradient(135deg,#16a05d,#4F8F45);">
                    ⚖️ Connect Scale & Weigh Scrap (Begin Collection) →
                </button>
            `;
        } else if (pickup.status === "collecting") {
            btnsHtml = `
                <a href="collection.html?id=${pickup.id}" class="btn-primary" style="flex:1;justify-content:center;padding:14px;background:linear-gradient(135deg,#16a05d,#4F8F45);">
                    ⚖️ Continue Digital Scale Weighing & Billing →
                </a>
            `;
        } else {
            btnsHtml = `
                <div style="padding:8px 0;color:var(--forest);font-weight:700;">
                    Pickup is in status: ${pickup.status.toUpperCase()}
                </div>
                <a href="collection.html?id=${pickup.id}" class="btn-secondary" style="padding:10px 16px;">View Slip</a>
            `;
        }

        container.innerHTML = `
            <div class="ui-card-title" style="margin-bottom:14px;">Doorstep Execution & Transit Controls (Status: <span style="text-transform:uppercase;color:var(--forest);">${pickup.status}</span>)</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
                ${btnsHtml}
            </div>
        `;
    }

    window.transitionPickupState = function (newStatus) {
        if (!currentPickupId || typeof pickupService === "undefined") return;

        const res = pickupService.updateStatus(currentPickupId, newStatus, "Collector partner updated transit stage");
        if (res.success) {
            showToast(`Status updated to ${newStatus.replace(/_/g, " ").toUpperCase()}! Citizen notified.`, "success");
            renderActivePickup();
        } else {
            showToast(res.error || "Cannot change status.", "danger");
        }
    };

    window.startWeighing = function () {
        if (!currentPickupId || typeof pickupService === "undefined") return;
        pickupService.updateStatus(currentPickupId, "collecting", "Digital scale connected at doorstep");
        window.location.href = `collection.html?id=${currentPickupId}`;
    };

    window.cancelActivePickup = function () {
        if (!currentPickupId || typeof pickupService === "undefined") return;
        const reason = prompt("Please provide reason for cancellation:", "Citizen not reachable / Gate locked");
        if (!reason) return;

        const res = pickupService.cancelPickup(currentPickupId, reason, "collector");
        if (res.success) {
            showToast("Pickup cancelled. Route cleared.", "info");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 800);
        } else {
            showToast(res.error || "Could not cancel.", "danger");
        }
    };

    document.addEventListener("DOMContentLoaded", renderActivePickup);
    window.addEventListener("ekabadi:statechange", renderActivePickup);
})();
