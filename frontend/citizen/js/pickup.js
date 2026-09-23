/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Pickup Creation Controller
   File: frontend/citizen/js/pickup.js
   
   RULE: Calls pickupService.createPickup() with citizen-chosen collector.
   Initial Status: REQUESTED
   ========================================================= */

(function () {
    "use strict";

    let selectedSlot = "08:00 AM - 11:30 AM";
    let selectedDate = "Today";
    let selectedAddress = "Flat B-402, Green Valley Apartments, Sector 62, Noida - 201309";
    let chosenCollector = {
        id: "COL-2001",
        name: "Ramesh Kumar",
        vehicle: "Three-Wheeler Tempo",
        number: "UP 16 AB 1234",
        rating: 4.8
    };
    let basketData = {
        weight: 25.5,
        amount: 330.75,
        items: [
            { category: "Paper", type: "Newspaper & Books", estimatedWeight: 15.0, rate: 14.0 },
            { category: "Cardboard", type: "Corrugated Cardboard", estimatedWeight: 10.5, rate: 11.5 }
        ]
    };

    function initPickupForm() {
        // Load chosen collector from session
        try {
            const col = JSON.parse(sessionStorage.getItem("ekabadi_selected_collector") || "null");
            if (col && col.id) chosenCollector = col;
        } catch (e) {}

        const colNameEl = document.getElementById("bookColName");
        if (colNameEl) colNameEl.textContent = chosenCollector.name;

        const colAvatarEl = document.getElementById("bookColAvatar");
        if (colAvatarEl) colAvatarEl.textContent = chosenCollector.avatar || chosenCollector.name.split(" ").map(w => w[0]).join("");

        const colMetaEl = document.getElementById("bookColMeta");
        if (colMetaEl) colMetaEl.textContent = `${chosenCollector.vehicle || "Three-Wheeler Tempo"} (${chosenCollector.number || "UP 16 AB 1234"}) • ⭐ ${chosenCollector.rating || 4.8}`;

        // Load scrap basket from session
        try {
            const basket = JSON.parse(sessionStorage.getItem("ekabadi_scrap_basket") || "null");
            if (basket) {
                if (basket.weight) basketData.weight = Number(basket.weight);
                if (basket.amount) basketData.amount = Number(basket.amount.replace("₹", "")) || 330.75;
                if (basket.items) basketData.items = basket.items;
            }
        } catch (e) {}

        const wEl = document.getElementById("summaryLotWeight");
        if (wEl) wEl.textContent = "~" + basketData.weight + " kg";

        const cEl = document.getElementById("summaryLotCash");
        if (cEl) cEl.textContent = "₹" + Number(basketData.amount).toFixed(2);
    }

    window.selectAddress = function (card) {
        document.querySelectorAll(".address-card").forEach(c => {
            c.classList.remove("selected");
            const inp = c.querySelector("input");
            if (inp) inp.checked = false;
        });
        card.classList.add("selected");
        const inp = card.querySelector("input");
        if (inp) inp.checked = true;

        const addrText = card.querySelector("div > div");
        if (addrText) selectedAddress = addrText.textContent.trim();
    };

    window.setDate = function (btn, date) {
        btn.parentElement.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        selectedDate = date;
        updateSummarySlot();
    };

    window.selectSlot = function (btn, slot) {
        document.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedSlot = slot;
        updateSummarySlot();
    };

    function updateSummarySlot() {
        const slotEl = document.getElementById("summarySlotText");
        if (slotEl) slotEl.textContent = selectedDate + " • " + selectedSlot.split(" ")[0];
    }

    window.confirmBooking = function () {
        const btn = document.getElementById("confirmBookingBtn");
        if (btn) {
            btn.disabled = true;
            btn.textContent = "Dispatching Collector Request...";
        }

        showToast("Booking request sent to collector partner...", "info");

        setTimeout(() => {
            if (typeof pickupService === "undefined") {
                showToast("Service unavailable.", "danger");
                if (btn) btn.disabled = false;
                return;
            }

            const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001", name: "Aarav Sharma" };

            const pickup = pickupService.createPickup({
                citizenId: citizen.citizenId || "CIT-1001",
                citizenName: citizen.name || "Aarav Sharma",
                collectorId: chosenCollector.id,
                collectorName: chosenCollector.name,
                address: selectedAddress,
                scheduledDate: selectedDate === "Today" ? new Date().toISOString().split("T")[0] : selectedDate,
                scheduledTime: selectedSlot,
                scrapType: basketData.items && basketData.items.length ? basketData.items.map(i => i.name || i.category).join(", ") : "Paper & Cardboard",
                items: basketData.items || [],
                estimatedWeight: basketData.weight,
                estimatedValue: basketData.amount,
                paymentMethod: "UPI"
            });

            try {
                sessionStorage.setItem("ekabadi_active_pickup", JSON.stringify(pickup));
            } catch (e) {}

            showToast(`Pickup ${pickup.id} confirmed! Dispatched to ${chosenCollector.name}.`, "success");

            setTimeout(() => {
                window.location.href = `tracking.html?id=${pickup.id}`;
            }, 800);
        }, 1000);
    };

    document.addEventListener("DOMContentLoaded", () => {
        initPickupForm();
    });
})();
