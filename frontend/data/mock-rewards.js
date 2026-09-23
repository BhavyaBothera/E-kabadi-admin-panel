/* =========================================================
   E-KABAADI PLATFORM
   Centralized Mock Rewards & Catalog
   File: frontend/data/mock-rewards.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.MOCK_REWARDS = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    return {
        catalog: [
            { id: "RWD-001", name: "Plant a Sapling in Noida City", description: "Verified tree planted via Swachh Noida initiative", cost: 100, icon: "🌳", category: "environment" },
            { id: "RWD-002", name: "₹50 Direct UPI Cashback", description: "Direct credit to your linked UPI address", cost: 200, icon: "💰", category: "cashback" },
            { id: "RWD-003", name: "Eco Champion Bronze Badge", description: "Digital verifiable green certificate", cost: 500, icon: "🥉", category: "badge" },
            { id: "RWD-004", name: "₹100 Direct UPI Cashback", description: "Instant transfer to your linked bank UPI", cost: 400, icon: "💰", category: "cashback" },
            { id: "RWD-005", name: "Eco Champion Silver Badge", description: "Top 5% sustainable household recognition", cost: 1000, icon: "🥈", category: "badge" },
            { id: "RWD-006", name: "Eco Champion Gold Badge", description: "Verified net-zero consumer recycler certification", cost: 2500, icon: "🥇", category: "badge" },
            { id: "RWD-007", name: "Donate ₹75 to Swachh Bharat Mission", description: "Support local sanitation workers welfare fund", cost: 150, icon: "🇮🇳", category: "donation" }
        ],
        transactions: [
            { id: "RWD-TXN-101", userId: "USR-CIT-001", type: "earned_pickup", points: 51, pickupId: "PK-9481", description: "Eco Coins earned from Pickup PK-9481", createdAt: "2026-09-17T18:48:00Z" },
            { id: "RWD-TXN-102", userId: "USR-CIT-002", type: "earned_pickup", points: 21, pickupId: "PK-9482", description: "Eco Coins earned from Pickup PK-9482", createdAt: "2026-09-22T14:52:00Z" }
        ]
    };
}));
