/* =========================================================
   E-KABAADI PLATFORM — Collector Partner
   Perks & Fuel Rewards Controller
   File: frontend/collector/js/rewards.js
   ========================================================= */

(function () {
    "use strict";

    function renderCollectorRewards() {
        const collector = window.currentCollector || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { collectorId: "COL-2001", ecoCoins: 2400 };
        const balEl = document.getElementById("colCoinBalance");
        if (balEl) balEl.textContent = (collector.ecoCoins || 2400).toLocaleString("en-IN");
    }

    window.claimCollectorPerk = function (title, cost, code) {
        const collector = window.currentCollector || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { collectorId: "COL-2001", ecoCoins: 2400, id: "USR-COL-001" };
        let colCoins = collector.ecoCoins || 2400;

        if (colCoins < cost) {
            showToast("Insufficient Eco Coins.", "error");
            return;
        }

        colCoins -= cost;
        collector.ecoCoins = colCoins;

        if (typeof collectorService !== "undefined") {
            collectorService.updateProfile(collector.collectorId || "COL-2001", { ecoCoins: colCoins });
        }

        if (typeof rewardService !== "undefined") {
            rewardService.addTransaction({
                userId: collector.id || "USR-COL-001",
                points: -cost,
                description: `Claimed Partner Perk: ${title}`,
                category: "partner_perk",
                metadata: { voucherCode: code }
            });
        }

        const balEl = document.getElementById("colCoinBalance");
        if (balEl) balEl.textContent = colCoins.toLocaleString("en-IN");

        const titleEl = document.getElementById("claimTitle");
        if (titleEl) titleEl.textContent = title + " Claimed!";

        const codeEl = document.getElementById("couponCodeDisplay");
        if (codeEl) codeEl.textContent = code;

        const modal = document.getElementById("claimModal");
        if (modal) modal.classList.add("open");

        showToast(`Deducted ${cost} Coins. Voucher ready!`, "success");
    };

    window.copyCode = function () {
        const code = document.getElementById("couponCodeDisplay")?.textContent.trim();
        if (code) {
            navigator.clipboard.writeText(code);
            showToast("Voucher code copied: " + code, "success");
        }
    };

    window.closeModal = function () {
        document.getElementById("claimModal")?.classList.remove("open");
    };

    document.addEventListener("DOMContentLoaded", renderCollectorRewards);
    window.addEventListener("ekabadi:statechange", renderCollectorRewards);
})();
