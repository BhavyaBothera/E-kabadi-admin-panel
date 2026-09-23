/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Eco Coins & Rewards Controller
   File: frontend/citizen/js/rewards.js
   ========================================================= */

(function () {
    "use strict";

    function renderRewardsPage() {
        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001", ecoCoins: 860 };
        const citizenId = citizen.citizenId || "CIT-1001";

        if (typeof citizenService === "undefined" || typeof rewardService === "undefined") return;

        const profile = citizenService.getProfile(citizenId) || citizen;
        const currentCoins = profile.ecoCoins || 0;

        const balanceEl = document.getElementById("rewardsCoinBalance");
        if (balanceEl) balanceEl.textContent = currentCoins;

        const inrValueEl = document.getElementById("rewardsInrValue");
        if (inrValueEl) inrValueEl.textContent = "₹" + (currentCoins * 0.5).toFixed(2);

        // Render Catalog
        const catalogContainer = document.getElementById("rewardsCatalogGrid");
        if (catalogContainer) {
            const catalog = rewardService.getCatalog();
            catalogContainer.innerHTML = catalog.map(item => {
                const canAfford = currentCoins >= item.cost;
                return `
                    <div class="ui-card" style="display:flex;flex-direction:column;justify-content:space-between;border:1px solid var(--border-subtle);">
                        <div>
                            <div style="font-size:36px;margin-bottom:8px;">${item.icon || "🎁"}</div>
                            <h3 style="font-size:16px;font-weight:700;color:var(--forest-deep);margin-bottom:4px;">${item.name}</h3>
                            <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">${item.description}</p>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px dashed var(--border-subtle);">
                            <strong style="color:var(--forest);font-size:15px;">🪙 ${item.cost} Coins</strong>
                            <button type="button" class="${canAfford ? "btn-primary" : "btn-secondary"}" 
                                onclick="window.redeemRewardItem('${item.id}')"
                                style="padding:6px 14px;font-size:12px;" ${!canAfford ? "disabled title='Insufficient coins'" : ""}>
                                ${canAfford ? "Redeem" : "Locked"}
                            </button>
                        </div>
                    </div>
                `;
            }).join("");
        }

        // Render Transaction History
        const txnsContainer = document.getElementById("rewardsHistoryContainer");
        if (txnsContainer) {
            const txns = rewardService.getUserTransactions(profile.userId || "USR-CIT-001");
            if (txns.length === 0) {
                txnsContainer.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">No coins transactions yet. Complete scrap pickups to earn!</div>`;
            } else {
                txnsContainer.innerHTML = txns.map(t => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-subtle);font-size:13px;">
                        <div>
                            <strong style="color:var(--forest-deep);display:block;">${t.description}</strong>
                            <span style="font-size:11px;color:var(--text-muted);">${new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                        <strong style="color:${t.points > 0 ? "var(--forest)" : "var(--danger)"};font-size:15px;">
                            ${t.points > 0 ? "+" : ""}${t.points} 🪙
                        </strong>
                    </div>
                `).join("");
            }
        }
    }

    let isRedeeming = false;
    window.redeemRewardItem = function (rewardId) {
        if (isRedeeming) return;
        isRedeeming = true;

        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001" };
        const citizenId = citizen.citizenId || "CIT-1001";

        if (typeof rewardService === "undefined") {
            isRedeeming = false;
            return;
        }

        const res = rewardService.redeemReward(citizenId, rewardId);
        if (res && res.success) {
            showToast(`Redeemed ${res.reward ? res.reward.name : "perk"}! ${res.remainingCoins} Eco Coins remaining.`, "success");
            renderRewardsPage();
        } else {
            showToast((res && res.error) || "Could not redeem reward.", "danger");
        }
        setTimeout(() => { isRedeeming = false; }, 600);
    };

    document.addEventListener("DOMContentLoaded", renderRewardsPage);
    window.addEventListener("ekabadi:statechange", renderRewardsPage);
})();
