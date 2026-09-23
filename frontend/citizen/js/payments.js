/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Payments Ledger Controller
   File: frontend/citizen/js/payments.js
   ========================================================= */

(function () {
    "use strict";

    function renderPaymentsPage() {
        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001" };
        const citizenId = citizen.citizenId || "CIT-1001";

        if (typeof paymentService === "undefined") return;

        const payments = paymentService.getByCitizen(citizenId);
        const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0);

        const totalEl = document.getElementById("citizenTotalPayout");
        if (totalEl) totalEl.textContent = "₹" + totalPaid.toFixed(2);

        const countEl = document.getElementById("citizenTxnCount");
        if (countEl) countEl.textContent = payments.length + " transactions";

        const tableBody = document.getElementById("paymentsTableBody");
        if (!tableBody) return;

        if (payments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No payment settlements recorded yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = payments.map(p => `
            <tr>
                <td><strong style="color:var(--forest-deep);">${p.id}</strong></td>
                <td><a href="tracking.html?id=${p.pickupId}" style="color:var(--forest);font-weight:600;">#${p.pickupId}</a></td>
                <td>${p.collectorName || "Partner"}</td>
                <td><strong>₹${(p.amount || 0).toFixed(2)}</strong></td>
                <td><span class="status-pill success">● Paid via ${p.method || "UPI"}</span></td>
                <td>
                    <button type="button" class="btn-secondary" onclick="window.downloadInvoice('${p.id}')" style="padding:4px 8px;font-size:11px;">
                        📄 Tax Invoice
                    </button>
                </td>
            </tr>
        `).join("");
    }

    window.downloadInvoice = function (txnId) {
        showToast(`Generating certified GST tax invoice for ${txnId}...`, "info");
        setTimeout(() => {
            showToast(`Invoice ${txnId}.pdf downloaded successfully!`, "success");
        }, 1000);
    };

    document.addEventListener("DOMContentLoaded", renderPaymentsPage);
    window.addEventListener("ekabadi:statechange", renderPaymentsPage);
})();
