/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Live Pickup Tracking Controller
   File: frontend/citizen/js/tracking.js
   
   State Machine:
   REQUESTED -> ACCEPTED -> ON_THE_WAY -> ARRIVED -> COLLECTING -> COMPLETED -> PAID
   ========================================================= */

(function () {
    "use strict";

    function getTrackedPickupId() {
        const params = new URLSearchParams(window.location.search);
        if (params.get("id")) return params.get("id");
        try {
            const stored = JSON.parse(sessionStorage.getItem("ekabadi_active_pickup") || "{}");
            if (stored.id) return stored.id;
        } catch (e) {}
        return "PK-9481"; // fallback seed
    }

    function renderTrackingView() {
        const pickupId = getTrackedPickupId();
        if (typeof pickupService === "undefined") return;

        const pickup = pickupService.getById(pickupId) || pickupService.getAll()[0];
        if (!pickup) return;

        const idEl = document.getElementById("trackingOrderId");
        if (idEl) idEl.textContent = "#" + pickup.id;

        const colNameEl = document.getElementById("trackingColName");
        if (colNameEl) colNameEl.textContent = pickup.collectorName;

        const colAvatarEl = document.getElementById("trackingColAvatar");
        if (colAvatarEl) colAvatarEl.textContent = pickup.collectorName.split(" ").map(w => w[0]).join("");

        const addrEl = document.getElementById("trackingAddressText");
        if (addrEl) addrEl.textContent = pickup.address;

        const totalAmountEl = document.getElementById("totalSettlementAmount");
        if (totalAmountEl) totalAmountEl.textContent = "₹" + (pickup.finalValue || pickup.estimatedValue || 0).toFixed(2);

        // Update Timeline Nodes & Badges
        updateTimelineUI(pickup.status);
    }

    function updateTimelineUI(status) {
        const badge = document.getElementById("orderStatusBadge");
        const bar = document.getElementById("timelineBar");
        const n1 = document.getElementById("node1");
        const n2 = document.getElementById("node2");
        const n3 = document.getElementById("node3");
        const n4 = document.getElementById("node4");
        const n5 = document.getElementById("node5");
        const receiptBadge = document.getElementById("receiptStatusBadge");
        const successNotice = document.getElementById("paymentSuccessNotice");
        const colPin = document.getElementById("mapCollectorPin");
        const bubble = document.getElementById("colDistanceBubble");
        const hudDist = document.getElementById("hudDist");
        const hudEta = document.getElementById("hudEta");

        if (!badge || !bar) return;

        if (status === "requested") {
            bar.style.width = "10%";
            badge.className = "pickup-badge assigned";
            badge.textContent = "● Dispatch Pending • Waiting for Partner Acceptance";
            if (n1) n1.className = "tracking-node done";
            if (n2) n2.className = "tracking-node current";
            if (receiptBadge) { receiptBadge.className = "status-pill neutral"; receiptBadge.textContent = "Pending Acceptance"; }
            if (successNotice) successNotice.style.display = "none";
        } else if (status === "accepted") {
            bar.style.width = "30%";
            badge.className = "pickup-badge assigned";
            badge.textContent = "● Partner Assigned • Preparing for Departure";
            if (n1) n1.className = "tracking-node done";
            if (n2) n2.className = "tracking-node done";
            if (n3) n3.className = "tracking-node current";
            if (receiptBadge) { receiptBadge.className = "status-pill warning"; receiptBadge.textContent = "Dispatched"; }
            if (successNotice) successNotice.style.display = "none";
        } else if (status === "on_the_way") {
            bar.style.width = "55%";
            badge.className = "pickup-badge enroute active-pulse";
            badge.textContent = "● Out for Pickup • ETA ~14 mins";
            if (n1) n1.className = "tracking-node done";
            if (n2) n2.className = "tracking-node done";
            if (n3) n3.className = "tracking-node current";
            if (colPin) colPin.style.left = "40%";
            if (bubble) bubble.textContent = "Partner (1.2 km away)";
            if (hudDist) hudDist.textContent = "1.2 km";
            if (hudEta) hudEta.textContent = "ETA ~14 mins";
            if (receiptBadge) { receiptBadge.className = "status-pill warning"; receiptBadge.textContent = "Transit Active"; }
            if (successNotice) successNotice.style.display = "none";
        } else if (status === "arrived" || status === "collecting") {
            bar.style.width = "78%";
            badge.className = "pickup-badge assigned active-pulse";
            badge.textContent = status === "arrived" ? "● Arrived at Gate • Weighing Starting" : "● Digital Scale Weighing in Progress ⚖️";
            if (n1) n1.className = "tracking-node done";
            if (n2) n2.className = "tracking-node done";
            if (n3) n3.className = "tracking-node done";
            if (n4) n4.className = "tracking-node current";
            if (colPin) colPin.style.left = "75%";
            if (bubble) bubble.textContent = "Partner at Society Gate";
            if (hudDist) hudDist.textContent = "0.0 km";
            if (hudEta) hudEta.textContent = "Arrived";
            if (receiptBadge) { receiptBadge.className = "status-pill warning"; receiptBadge.textContent = "Weighing Verified ✓"; }
            if (successNotice) successNotice.style.display = "none";
        } else if (status === "completed" || status === "paid") {
            bar.style.width = "100%";
            badge.className = "pickup-badge completed";
            badge.textContent = "✓ Completed & Settled via UPI";
            if (n1) n1.className = "tracking-node done";
            if (n2) n2.className = "tracking-node done";
            if (n3) n3.className = "tracking-node done";
            if (n4) n4.className = "tracking-node done";
            if (n5) n5.className = "tracking-node done";
            if (colPin) colPin.style.left = "80%";
            if (receiptBadge) { receiptBadge.className = "status-pill success"; receiptBadge.textContent = "Settled (UPI)"; }
            if (successNotice) successNotice.style.display = "block";
        } else if (status === "cancelled") {
            bar.style.width = "100%";
            badge.className = "pickup-badge cancelled";
            badge.textContent = "✕ Pickup Cancelled";
            if (receiptBadge) { receiptBadge.className = "status-pill danger"; receiptBadge.textContent = "Cancelled"; }
            if (successNotice) successNotice.style.display = "none";
        }
    }

    // Manual Stage Switcher for Live Evaluation
    window.simulateStage = function (stageNum) {
        const id = getTrackedPickupId();
        const stageStatusMap = {
            1: "requested",
            2: "accepted",
            3: "on_the_way",
            4: "arrived",
            5: "paid"
        };
        const st = stageStatusMap[stageNum] || "on_the_way";
        if (typeof pickupService !== "undefined") {
            pickupService.updateStatus(id, st);
            showToast(`Tracking updated: ${st.replace(/_/g, " ").toUpperCase()}`, "info");
        }
    };

    window.cancelPickupOrder = function () {
        const id = getTrackedPickupId();
        if (confirm("Are you sure you want to cancel this pickup request?")) {
            if (typeof pickupService !== "undefined") {
                const res = pickupService.cancelPickup(id, "Citizen", "Citizen cancelled prior to doorstep weighing");
                if (res.success) {
                    showToast("Pickup order cancelled.", "warning");
                    renderTrackingView();
                } else {
                    showToast(res.error, "danger");
                }
            }
        }
    };

    document.addEventListener("DOMContentLoaded", renderTrackingView);
    window.addEventListener("ekabadi:statechange", renderTrackingView);
})();
