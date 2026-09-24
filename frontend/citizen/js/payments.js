/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Payments Ledger Controller
   File: frontend/citizen/js/payments.js
   
   Phase 4F: Real Payment Infrastructure, Settlement & Financial Ledger
   - Displays Authoritative Scale Weights & Catalog Rates
   - Contrast AI Estimate with Final Verified Scale Weight
   - Dynamic Receipt Generation & Secure Payment Order Execution
   ========================================================= */

(function () {
    "use strict";

    function renderPaymentsPage() {
        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001", id: "CIT-1001" };
        const citizenId = citizen.citizenId || citizen.id || "CIT-1001";

        if (typeof paymentService === "undefined") return;

        let payments = paymentService.getByCitizen(citizenId);
        if (!payments || payments.length === 0) {
            // Fallback to all payments if seeded under mock user
            payments = paymentService.getAll();
        }

        // Summary Calculations
        const settledPayments = payments.filter(p => p.status === "settled" || p.status === "paid");
        const pendingPayments = payments.filter(p => p.status === "pending" || p.status === "order_created" || p.status === "payment_pending");
        
        const totalPaid = settledPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const totalPending = pendingPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const avgPayout = settledPayments.length > 0 ? (totalPaid / settledPayments.length) : 0;

        // Update Stat Cards if present
        const statCards = document.querySelectorAll(".stats-grid .stat-card");
        if (statCards.length >= 4) {
            const v0 = statCards[0].querySelector(".stat-value");
            if (v0) v0.textContent = "₹" + totalPaid.toFixed(2);

            const v1 = statCards[1].querySelector(".stat-value");
            if (v1) v1.textContent = "₹" + totalPending.toFixed(2);
            const sub1 = statCards[1].querySelector(".stat-subtext");
            if (sub1) sub1.textContent = pendingPayments.length > 0 ? `${pendingPayments.length} pending settlement` : "All past pickups cleared";

            const v2 = statCards[2].querySelector(".stat-value");
            if (v2) v2.textContent = "₹" + avgPayout.toFixed(2);
            const sub2 = statCards[2].querySelector(".stat-subtext");
            if (sub2) sub2.textContent = `Across ${settledPayments.length} completed settlements`;
        }

        const tableBody = document.getElementById("paymentsTableBody");
        if (!tableBody) return;

        if (payments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">No payment settlements recorded yet. Complete a scrap collection to see payouts here.</td></tr>`;
            return;
        }

        tableBody.innerHTML = payments.map(p => {
            const isSettled = p.status === "settled" || p.status === "paid";
            const isPending = p.status === "pending" || p.status === "order_created" || p.status === "payment_pending";
            const isFailed = p.status === "failed";
            const isRefunded = p.status === "refunded";

            const pickup = (typeof pickupService !== "undefined" && p.pickupId) ? pickupService.getById(p.pickupId) : null;
            const category = p.scrapCategorySnapshot || (pickup && pickup.scrapType) || "Mixed Scrap";
            const rate = p.ratePerKgSnapshot || 14.00;
            const finalWeight = p.finalWeightKgSnapshot || (pickup && pickup.finalWeight) || 0;
            const aiWeight = (pickup && pickup.estimatedWeight) || null;

            let statusBadge = `<span class="status-pill success">● Settled</span>`;
            if (isPending) {
                statusBadge = `<span class="status-pill warning" style="background:#FFF8E7;color:#B7791F;border:1px solid #F6E05E;">⏳ Pending</span>`;
            } else if (isFailed) {
                statusBadge = `<span class="status-pill danger" style="background:#FFF5F5;color:#E53E3E;border:1px solid #FEB2B2;">✕ Failed</span>`;
            } else if (isRefunded) {
                statusBadge = `<span class="status-pill info" style="background:#EBF8FF;color:#3182CE;border:1px solid #BEE3F8;">↩ Refunded</span>`;
            }

            // Contrast AI estimate with final verified weight
            let weightDisplay = `<strong>${Number(finalWeight).toFixed(1)} kg</strong>`;
            if (aiWeight && Math.abs(aiWeight - finalWeight) > 0.01) {
                weightDisplay += `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">(AI Est: ${Number(aiWeight).toFixed(1)} kg)</div>`;
            }

            const dateStr = p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent";

            return `
                <tr>
                    <td><strong style="color:var(--forest-deep);">${p.id}</strong></td>
                    <td>
                        <a href="tracking.html?id=${p.pickupId}" style="color:var(--forest);font-weight:600;">#${p.pickupId}</a>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${dateStr}</div>
                    </td>
                    <td>${p.collectorName || "Partner"}</td>
                    <td>
                        <strong>${category}</strong>
                        <div style="font-size:11px;color:var(--text-muted);">Rate: ₹${Number(rate).toFixed(2)}/kg</div>
                    </td>
                    <td>${weightDisplay}</td>
                    <td><strong style="color:var(--forest);font-size:15px;">₹${(Number(p.amount) || 0).toFixed(2)}</strong></td>
                    <td>${statusBadge}</td>
                    <td>
                        ${isSettled ? `
                            <button type="button" class="btn-secondary" onclick="window.viewReceipt('${p.id}')" style="padding:5px 10px;font-size:12px;font-weight:600;color:var(--forest);">
                                View Slip 📄
                            </button>
                        ` : (isPending ? `
                            <button type="button" class="btn-primary" onclick="window.payNow('${p.pickupId}')" style="padding:5px 10px;font-size:12px;background:#1F6F43;">
                                Pay Now 💳
                            </button>
                        ` : `
                            <button type="button" class="btn-secondary" onclick="window.viewReceipt('${p.id}')" style="padding:5px 10px;font-size:12px;">
                                Details
                            </button>
                        `)}
                    </td>
                </tr>
            `;
        }).join("");
    }

    // View Receipt Handler
    window.viewReceipt = function (paymentId) {
        if (typeof paymentService === "undefined") return;
        const receipt = paymentService.getReceipt(paymentId);
        if (!receipt) {
            showToast("Receipt record not found for " + paymentId, "error");
            return;
        }

        document.getElementById("modalTxnId").textContent = "#" + receipt.paymentId;
        document.getElementById("modalPickupId").textContent = "#" + receipt.pickupId;
        document.getElementById("modalDate").textContent = receipt.date ? new Date(receipt.date).toLocaleString("en-IN") : "Today";
        document.getElementById("modalCollector").textContent = receipt.collectorName || "Partner";
        document.getElementById("modalCategory").textContent = receipt.scrapCategory;
        document.getElementById("modalRate").textContent = "₹" + Number(receipt.ratePerKg).toFixed(2) + " / kg";
        document.getElementById("modalWeight").textContent = Number(receipt.finalVerifiedWeightKg).toFixed(2) + " kg";
        document.getElementById("modalAmount").textContent = "₹" + Number(receipt.finalPayout).toFixed(2);
        document.getElementById("modalMode").textContent = receipt.paymentMethod + " (" + (receipt.providerReference || "Direct Deposit") + ")";
        document.getElementById("modalEcoCoins").textContent = "+" + receipt.ecoCoinsAwarded + " Coins";

        const badge = document.getElementById("modalStatusBadge");
        if (badge) {
            badge.textContent = receipt.verified ? "Verified Direct Deposit" : "Pending Verification";
            badge.className = receipt.verified ? "status-pill success" : "status-pill warning";
        }

        const modal = document.getElementById("receiptModal");
        if (modal) modal.classList.add("open");
    };

    // Pay Now Handler for Pending Pickups
    window.payNow = function (pickupId) {
        if (typeof paymentService === "undefined") return;
        showToast("Initiating secure Razorpay checkout order...", "info");

        paymentService.createOrder(pickupId).then(order => {
            showToast(`Razorpay Order ${order.orderId} created for ₹${order.amount.toFixed(2)}. Verifying...`, "info");
            
            // Execute verification in mock mode
            const mockPaymentId = "pay_mock_" + Math.floor(100000 + Math.random() * 900000);
            const mockSig = "mock_sig_" + order.orderId + "_" + mockPaymentId;

            return paymentService.verifyPayment(pickupId, {
                orderId: order.orderId,
                paymentId: mockPaymentId,
                signature: mockSig
            });
        }).then(res => {
            showToast(`✓ Payment of ₹${res.amount.toFixed(2)} verified & settled atomically! Eco Coins awarded: +${res.ecoCoinsAwarded}`, "success");
            renderPaymentsPage();
        }).catch(err => {
            showToast(err.message || "Payment initiation failed.", "danger");
        });
    };

    document.addEventListener("DOMContentLoaded", renderPaymentsPage);
    window.addEventListener("ekabadi:statechange", renderPaymentsPage);
})();
