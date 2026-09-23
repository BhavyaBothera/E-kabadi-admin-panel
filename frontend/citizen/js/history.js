/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Pickup History Controller
   File: frontend/citizen/js/history.js
   ========================================================= */

(function () {
    "use strict";

    function renderHistoryPage() {
        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001" };
        const citizenId = citizen.citizenId || "CIT-1001";

        if (typeof pickupService === "undefined") return;

        const pickups = pickupService.getByCitizen(citizenId);
        const tbody = document.querySelector("#historyTable tbody");
        const listContainer = document.getElementById("historyListContainer");

        const statusStyleMap = {
            requested: { label: "Requested", class: "status-pill warning" },
            accepted: { label: "Accepted", class: "status-pill info" },
            on_the_way: { label: "En Route", class: "status-pill info" },
            arrived: { label: "Arrived", class: "status-pill warning" },
            collecting: { label: "Weighing", class: "status-pill warning" },
            completed: { label: "Completed", class: "status-pill success" },
            paid: { label: "Paid", class: "status-pill success" },
            cancelled: { label: "Cancelled", class: "status-pill neutral" }
        };

        if (tbody) {
            if (pickups.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">No pickups found. Book your first scrap pickup!</td></tr>`;
                return;
            }

            tbody.innerHTML = pickups.map(p => {
                const st = statusStyleMap[p.status] || { label: p.status, class: "status-pill info" };
                const weight = p.finalWeight || p.estimatedWeight || 0;
                const value = p.finalValue || p.estimatedValue || 0;
                const dateStr = p.scheduledDate ? new Date(p.scheduledDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : (p.date || "Today");
                const itemsSummary = (p.items || []).map(i => i.categoryName || i.name).join(", ") || "Recyclables";

                let actionLink = `<a href="tracking.html?id=${p.id}" style="color:var(--forest);font-weight:700;">Live Track →</a>`;
                if (p.status === "completed" || p.status === "paid") {
                    actionLink = `<a href="payments.html?id=${p.id}" style="color:var(--forest);font-weight:600;">Receipt 📄</a>`;
                } else if (p.status === "cancelled") {
                    actionLink = `<a href="sell-scrap.html" style="color:var(--forest);font-weight:600;">Re-book ↻</a>`;
                }

                return `
                    <tr data-status="${p.status}">
                        <td><strong style="color:var(--forest-deep);">#${p.id}</strong></td>
                        <td>${dateStr}</td>
                        <td>${p.collectorName || "Partner"}</td>
                        <td>${itemsSummary}</td>
                        <td>${weight} kg</td>
                        <td><strong>₹${Number(value).toFixed(2)}</strong></td>
                        <td><span class="${st.class}">${st.label}</span></td>
                        <td>${actionLink}</td>
                    </tr>
                `;
            }).join("");
        }

        if (listContainer) {
            if (pickups.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align:center;padding:48px 20px;background:#fff;border-radius:12px;border:1px dashed var(--border-subtle);">
                        <span style="font-size:36px;display:block;margin-bottom:8px;">📦</span>
                        <h3 style="font-size:16px;font-weight:700;color:var(--forest-deep);">No Past Pickups</h3>
                        <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">Schedule your first recyclables pickup today.</p>
                        <a href="sell-scrap.html" class="btn-primary" style="display:inline-flex;padding:10px 18px;font-size:13px;">Sell Scrap Now →</a>
                    </div>
                `;
                return;
            }

            listContainer.innerHTML = pickups.map(p => {
                const st = statusStyleMap[p.status] || { label: p.status, class: "status-pill info" };
                return `
                    <div class="ui-card" style="margin-bottom:16px;border:1px solid var(--border-subtle);">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                            <div>
                                <span class="${st.class}">${st.label}</span>
                                <h3 style="font-size:16px;font-weight:800;color:var(--forest-deep);margin-top:4px;">Order #${p.id}</h3>
                            </div>
                            <strong style="color:var(--forest);font-size:18px;">₹${(p.finalValue || p.estimatedValue || 0).toFixed(2)}</strong>
                        </div>
                    </div>
                `;
            }).join("");
        }
    }

    window.filterHistory = function(status, btn) {
        if (btn && btn.parentElement) {
            btn.parentElement.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
        }

        const rows = document.querySelectorAll("#historyTable tbody tr");
        rows.forEach(r => {
            if (status === "all" || r.dataset.status === status) {
                r.style.display = "";
            } else {
                r.style.display = "none";
            }
        });
    };

    document.addEventListener("DOMContentLoaded", renderHistoryPage);
    window.addEventListener("ekabadi:statechange", renderHistoryPage);
})();
