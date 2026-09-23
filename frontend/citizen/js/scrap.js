/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Scrap Estimation & AI Vision Controller
   File: frontend/citizen/js/scrap.js
   ========================================================= */

(function () {
    "use strict";

    let currentAnalysis = null;
    let basket = [
        { category: "Paper", name: "Newspaper & Books", weight: 15.0, rate: 14.0, subtotal: 210.0 }
    ];

    function calculateBasketTotal() {
        const totalWeight = basket.reduce((s, i) => s + (Number(i.weight) || 0), 0);
        const totalCash = basket.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);

        const wEl = document.getElementById("basketTotalWeight");
        if (wEl) wEl.textContent = "~" + totalWeight.toFixed(1) + " kg";

        const cEl = document.getElementById("basketTotalCash");
        if (cEl) cEl.textContent = "₹" + totalCash.toFixed(2);

        // Save into session for checkout
        try {
            sessionStorage.setItem("ekabadi_scrap_basket", JSON.stringify({
                weight: totalWeight.toFixed(1),
                amount: "₹" + totalCash.toFixed(2),
                items: basket
            }));
        } catch (e) {}

        return { totalWeight, totalCash };
    }

    function renderBasketTable() {
        const container = document.getElementById("scrapBasketItems");
        if (!container) return;

        if (basket.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">No scrap items added yet. Analyze an image or select below.</div>`;
            calculateBasketTotal();
            return;
        }

        container.innerHTML = basket.map((item, index) => `
            <div class="basket-item-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-subtle);font-size:14px;">
                <div>
                    <strong style="color:var(--forest-deep);">${item.name}</strong>
                    <div style="font-size:12px;color:var(--text-muted);">@ ₹${item.rate.toFixed(2)}/kg</div>
                </div>
                <div style="display:flex;align-items:center;gap:12px;">
                    <input type="number" step="0.5" min="0.5" value="${item.weight}" onchange="window.updateScrapWeight(${index}, this.value)" style="width:70px;padding:6px;border:1px solid #e4e9e6;border-radius:6px;text-align:center;font-weight:700;">
                    <span style="font-size:13px;color:var(--text-muted);">kg</span>
                    <strong style="color:var(--forest);min-width:60px;text-align:right;">₹${item.subtotal.toFixed(2)}</strong>
                    <button type="button" onclick="window.removeScrapItem(${index})" style="color:#e5484d;padding:4px;cursor:pointer;">✕</button>
                </div>
            </div>
        `).join("");

        calculateBasketTotal();
    }

    window.updateScrapWeight = function (index, newWeight) {
        if (!basket[index]) return;
        const w = Math.max(0.1, Number(newWeight) || 0.1);
        basket[index].weight = w;
        basket[index].subtotal = +(w * basket[index].rate).toFixed(2);
        renderBasketTable();
    };

    window.removeScrapItem = function (index) {
        basket.splice(index, 1);
        renderBasketTable();
    };

    window.addManualCategory = function (categoryName, rate) {
        const existing = basket.find(i => i.name === categoryName);
        if (existing) {
            existing.weight += 5.0;
            existing.subtotal = +(existing.weight * existing.rate).toFixed(2);
        } else {
            basket.push({
                category: categoryName,
                name: categoryName,
                weight: 5.0,
                rate: Number(rate),
                subtotal: +(5.0 * Number(rate)).toFixed(2)
            });
        }
        renderBasketTable();
        showToast(`Added ${categoryName} (5.0 kg) to scrap lot.`, "success");
    };

    // AI Scanner Simulation
    window.runAiAnalysis = function () {
        const scanBox = document.getElementById("aiScanningCard");
        const resultsBox = document.getElementById("aiResultsCard");
        const btn = document.getElementById("triggerScanBtn");

        if (btn) { btn.disabled = true; btn.textContent = "Scanning Scrap Image..."; }
        if (scanBox) scanBox.style.display = "block";
        if (resultsBox) resultsBox.style.display = "none";

        if (typeof scrapAnalysisService !== "undefined") {
            scrapAnalysisService.analyze().then(result => {
                currentAnalysis = result;
                if (scanBox) scanBox.style.display = "none";
                if (resultsBox) {
                    resultsBox.style.display = "block";
                    document.getElementById("aiDetectedMaterial").textContent = result.material;
                    document.getElementById("aiDetectedWeight").textContent = result.estimatedWeight + " kg";
                    document.getElementById("aiDetectedConfidence").textContent = Math.round(result.confidence * 100) + "% Match";
                    document.getElementById("aiDetectedValue").textContent = "₹" + result.estimatedValue.toFixed(2);
                }
                if (btn) { btn.disabled = false; btn.textContent = "Re-analyze Image"; }
                showToast(`AI Identified: ${result.material} (~${result.estimatedWeight} kg)`, "success");
            });
        }
    };

    window.addAiResultToBasket = function () {
        if (!currentAnalysis) return;
        basket.push({
            category: currentAnalysis.material,
            name: currentAnalysis.name,
            weight: currentAnalysis.estimatedWeight,
            rate: currentAnalysis.ratePerKg,
            subtotal: currentAnalysis.estimatedValue
        });
        renderBasketTable();
        showToast("Added AI analyzed item to scrap basket!", "success");
    };

    document.addEventListener("DOMContentLoaded", () => {
        renderBasketTable();
    });
})();
