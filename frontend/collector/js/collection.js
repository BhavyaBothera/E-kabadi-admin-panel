/* =========================================================
   E-KABAADI PLATFORM — Collector Partner
   Digital Scale Weighing & Settlement Controller
   File: frontend/collector/js/collection.js
   
   State Flow:
   COLLECTING → COMPLETED → PAID
   Auto-generates Payment Transaction & Credits Citizen Eco Coins
   ========================================================= */

(function () {
    "use strict";

    let activePickup = null;
    let itemsList = [];

    function initCollection() {
        const urlParams = new URLSearchParams(window.location.search);
        const qId = urlParams.get("id");

        if (typeof pickupService === "undefined") return;

        if (qId) {
            activePickup = pickupService.getById(qId);
        }

        if (!activePickup) {
            const all = pickupService.getAll();
            activePickup = all.find(p => ["collecting", "arrived", "on_the_way", "accepted"].includes(p.status)) || all[0];
        }

        if (!activePickup) return;

        // Ensure status is collecting
        if (activePickup.status !== "collecting" && activePickup.status !== "completed" && activePickup.status !== "paid") {
            pickupService.updateStatus(activePickup.id, "collecting", "Doorstep scale verification started");
        }

        // Render Header & Context
        const subTitle = document.querySelector(".page-subtitle");
        if (subTitle) {
            subTitle.textContent = `Order #${activePickup.id} • Citizen: ${activePickup.citizenName} • Scale #EKB-402 (Zero Calibrated)`;
        }

        // Initialize items from pickup or standard defaults
        if (activePickup.items && activePickup.items.length > 0) {
            itemsList = activePickup.items.map(it => ({
                name: it.categoryName || it.name,
                weight: it.estimatedWeight || it.weight || 5.0,
                rate: it.ratePerKg || it.rate || 14.0
            }));
        } else {
            itemsList = [
                { name: "Newspaper & Books", weight: 15.0, rate: 14.0 },
                { name: "Cardboard / Patti", weight: 10.5, rate: 11.5 }
            ];
        }

        renderItems();
        recalcTotals();
    }

    function renderItems() {
        const container = document.getElementById("itemsContainer");
        if (!container) return;

        const categories = (typeof scrapAnalysisService !== "undefined" && scrapAnalysisService.getCategories) ? 
            scrapAnalysisService.getCategories() : [
                { name: "Newspaper & Books", ratePerKg: 14.0 },
                { name: "Cardboard / Patti", ratePerKg: 11.5 },
                { name: "PET Plastics", ratePerKg: 18.0 },
                { name: "Iron Scrap", ratePerKg: 32.0 },
                { name: "Brass / Pital", ratePerKg: 380.0 },
                { name: "Copper Scrap", ratePerKg: 580.0 }
            ];

        container.innerHTML = itemsList.map((item, idx) => {
            const options = categories.map(c => `
                <option value="${c.ratePerKg}" ${c.name === item.name || c.ratePerKg === item.rate ? "selected" : ""}>
                    ${c.name} (₹${c.ratePerKg}/kg)
                </option>
            `).join("");

            const sub = (item.weight * item.rate).toFixed(2);

            return `
                <div class="item-row" id="itemRow_${idx}">
                    <div>
                        <select class="item-cat" onchange="window.updateItemCategory(${idx}, this)" style="width:100%;padding:8px 10px;border:1px solid #e4e9e6;border-radius:8px;font-size:13px;">
                            ${options}
                        </select>
                    </div>
                    <div>
                        <input type="number" class="item-weight" value="${item.weight}" step="0.1" min="0.1" 
                            oninput="window.updateItemWeight(${idx}, this)" 
                            style="width:100%;padding:8px;border:1px solid #e4e9e6;border-radius:8px;font-size:13px;text-align:center;">
                    </div>
                    <div style="font-size:13px;color:var(--text-muted);text-align:center;" class="item-rate">@ ₹${Number(item.rate).toFixed(2)}</div>
                    <div style="font-size:14px;font-weight:700;color:var(--forest);text-align:right;" class="item-subtotal">₹${sub}</div>
                    <button type="button" onclick="window.removeItemRow(${idx})" style="color:#e5484d;font-size:16px;text-align:center;background:none;border:none;cursor:pointer;">✕</button>
                </div>
            `;
        }).join("");
    }

    window.updateItemCategory = function (idx, selectEl) {
        if (itemsList[idx]) {
            itemsList[idx].rate = parseFloat(selectEl.value);
            const selectedText = selectEl.options[selectEl.selectedIndex].text;
            itemsList[idx].name = selectedText.split("(")[0].trim();
            recalcTotals();
        }
    };

    window.updateItemWeight = function (idx, inputEl) {
        if (itemsList[idx]) {
            itemsList[idx].weight = parseFloat(inputEl.value) || 0;
            recalcTotals();
        }
    };

    window.addNewItemRow = function () {
        itemsList.push({ name: "PET Plastics", weight: 5.0, rate: 18.0 });
        renderItems();
        recalcTotals();
        showToast("Added category item to weighing manifest.", "info");
    };

    window.removeItemRow = function (idx) {
        if (itemsList.length <= 1) {
            showToast("At least one scrap item required.", "warning");
            return;
        }
        itemsList.splice(idx, 1);
        renderItems();
        recalcTotals();
    };

    function recalcTotals() {
        let totalW = 0;
        let totalC = 0;

        itemsList.forEach((it, idx) => {
            const sub = it.weight * it.rate;
            totalW += it.weight;
            totalC += sub;
            const row = document.getElementById(`itemRow_${idx}`);
            if (row) {
                const rateEl = row.querySelector(".item-rate");
                const subEl = row.querySelector(".item-subtotal");
                if (rateEl) rateEl.textContent = `@ ₹${it.rate.toFixed(2)}`;
                if (subEl) subEl.textContent = `₹${sub.toFixed(2)}`;
            }
        });

        const totalWEl = document.getElementById("finalTotalWeight");
        const totalCEl = document.getElementById("finalTotalCash");
        if (totalWEl) totalWEl.textContent = totalW.toFixed(1) + " kg";
        if (totalCEl) totalCEl.textContent = "₹" + totalC.toFixed(2);

        // Update top scale digits to total weight
        const scaleDigits = document.getElementById("scaleDigits");
        if (scaleDigits) scaleDigits.innerHTML = `${totalW.toFixed(2)} <span style="font-size:24px;letter-spacing:1px;">kg</span>`;
    }
    window.recalcTotals = recalcTotals;

    window.zeroScale = function () {
        const scaleDigits = document.getElementById("scaleDigits");
        if (scaleDigits) scaleDigits.innerHTML = `00.00 <span style="font-size:24px;letter-spacing:1px;">kg</span>`;
        showToast("Scale zero calibrated (Tare: 0.00 kg).", "info");
    };

    window.captureScaleWeight = function () {
        const reading = (8 + Math.random() * 14).toFixed(1);
        const scaleDigits = document.getElementById("scaleDigits");
        if (scaleDigits) scaleDigits.innerHTML = `${reading} <span style="font-size:24px;letter-spacing:1px;">kg</span>`;
        if (itemsList.length > 0) {
            itemsList[0].weight = parseFloat(reading);
            renderItems();
            recalcTotals();
        }
        showToast(`Captured ${reading} kg from scale into manifest line 1.`, "success");
    };

    let isSettling = false;
    window.settlePayment = function () {
        if (isSettling) return;
        if (!activePickup) {
            showToast("No active pickup found to settle.", "error");
            return;
        }

        if (activePickup.status === "completed" || activePickup.paymentStatus === "paid") {
            showToast("This collection has already been finalized and settled.", "info");
            return;
        }

        isSettling = true;
        const btn = document.getElementById("settleBtn");
        if (btn) {
            btn.disabled = true;
            btn.textContent = "Processing Instant Settlement...";
        }

        let totalWeight = 0;
        let totalValue = 0;
        itemsList.forEach(i => {
            totalWeight += i.weight;
            totalValue += i.weight * i.rate;
        });

        showToast("Transmitting certified scale weight to NPCI payment gateway...", "info");

        setTimeout(() => {
            if (typeof pickupService !== "undefined") {
                const res = pickupService.completeCollection(activePickup.id, {
                    finalWeight: Number(totalWeight.toFixed(2)),
                    finalValue: Number(totalValue.toFixed(2)),
                    items: itemsList.map(it => ({
                        categoryName: it.name,
                        weight: it.weight,
                        ratePerKg: it.rate,
                        subtotal: it.weight * it.rate
                    })),
                    paymentMethod: "UPI"
                });

                if (res && (res.success || res.status === "completed")) {
                    showToast(`✓ Payment of ₹${totalValue.toFixed(2)} settled to citizen ${activePickup.citizenName}! Receipt #${res.payment ? res.payment.id : "PAID"} generated.`, "success");
                    setTimeout(() => {
                        window.location.href = `history.html?settled=${activePickup.id}`;
                    }, 1400);
                } else {
                    isSettling = false;
                    showToast((res && res.error) || "Could not complete collection.", "danger");
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = "✓ Authorize Payment & Print Receipt";
                    }
                }
            }
        }, 1200);
    };

    document.addEventListener("DOMContentLoaded", initCollection);
    window.addEventListener("ekabadi:statechange", initCollection);
})();
