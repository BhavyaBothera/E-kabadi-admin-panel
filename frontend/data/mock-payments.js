/* =========================================================
   E-KABAADI PLATFORM
   Centralized Mock Payments
   File: frontend/data/mock-payments.js
   
   RULE: Payments originate exclusively from completed pickups.
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.MOCK_PAYMENTS = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    return [
        {
            id: "TXN-9481",
            pickupId: "PK-9481",
            citizenId: "CIT-1001",
            citizenName: "Aarav Sharma",
            collectorId: "COL-2001",
            collectorName: "Ramesh Kumar",
            amount: 330.75,
            method: "UPI",
            status: "paid",
            transactionId: "UPI-9024-88412",
            createdAt: "2026-09-17T18:48:00Z"
        },
        {
            id: "TXN-9482",
            pickupId: "PK-9482",
            citizenId: "CIT-1002",
            citizenName: "Priya Verma",
            collectorId: "COL-2002",
            collectorName: "Suresh Yadav",
            amount: 452.10,
            method: "UPI",
            status: "paid",
            transactionId: "UPI-9025-99211",
            createdAt: "2026-09-22T14:52:00Z"
        }
    ];
}));
