/* =========================================================
   E-KABAADI PLATFORM — Collector Partner
   Collection Records Ledger Controller
   File: frontend/collector/js/history.js
   ========================================================= */

(function () {
    "use strict";

    function renderCollectorHistory() {
        const collector = window.currentCollector || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { collectorId: "COL-2001" };
        const collectorId = collector.collectorId || "COL-2001";

        if (typeof pickupService === "undefined") return;

        const pickups = pickupService.getByCollector(collectorId);
        const completed = pickups.filter(p => ["completed", "paid"].includes(p.status));

        const tbody = document.querySelector(".ui-table tbody");
        if (!tbody) return;

        if (completed.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No completed collections yet today.</td></tr>`;
            return;
        }

        tbody.innerHTML = completed.map((p, idx) => {
            const timeStr = p.completedAt ? new Date(p.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (p.time || "09:30 AM");
            const weight = p.finalWeight || p.estimatedWeight || 0;
            const cash = p.finalValue || p.estimatedValue || 0;
            const items = (p.items || []).map(i => i.categoryName || i.name).join(", ") || "Recyclables";
            const method = p.paymentMethod || "UPI";

            return `
                <tr>
                    <td><strong style="color:var(--forest-deep);">#${p.id}</strong></td>
                    <td>${timeStr}</td>
                    <td>${p.citizenName} (${p.pickupAddress ? p.pickupAddress.slice(0, 18) : "Noida"}...)</td>
                    <td>${items}</td>
                    <td><strong>${weight} kg</strong></td>
                    <td>₹${Number(cash).toFixed(2)}</td>
                    <td><span class="status-pill success">${method}</span></td>
                    <td><a href="collection.html?id=${p.id}" style="color:var(--forest);font-weight:700;">Slip #${400 + idx}</a></td>
                </tr>
            `;
        }).join("");
    }

    document.addEventListener("DOMContentLoaded", renderCollectorHistory);
    window.addEventListener("ekabadi:statechange", renderCollectorHistory);
})();
