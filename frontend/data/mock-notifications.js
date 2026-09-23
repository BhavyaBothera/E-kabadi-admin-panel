/* =========================================================
   E-KABAADI PLATFORM
   Centralized Mock Notifications
   File: frontend/data/mock-notifications.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.MOCK_NOTIFICATIONS = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    return [
        {
            id: "NOTIF-001",
            userId: "USR-CIT-001",
            role: "citizen",
            type: "pickup",
            title: "Collector Partner Dispatched",
            message: "Ramesh Kumar has accepted your pickup request and scheduled for today.",
            read: false,
            createdAt: "2026-09-23T08:15:00Z"
        },
        {
            id: "NOTIF-002",
            userId: "USR-CIT-001",
            role: "citizen",
            type: "payment",
            title: "Payment Received",
            message: "₹330.75 has been credited to your UPI ID for Pickup #PK-9481.",
            read: true,
            createdAt: "2026-09-17T18:48:00Z"
        },
        {
            id: "NOTIF-003",
            userId: "USR-COL-001",
            role: "collector",
            type: "pickup",
            title: "New Dispatch Request",
            message: "Aarav Sharma requested pickup in Sector 62 (1.2 km away).",
            read: false,
            createdAt: "2026-09-23T08:00:00Z"
        },
        {
            id: "NOTIF-004",
            userId: "USR-ADMIN-001",
            role: "admin",
            type: "verification",
            title: "New Citizen Registration",
            message: "Vikas Malhotra submitted KYC documents requiring verification.",
            read: false,
            createdAt: "2026-09-21T15:20:00Z"
        },
        {
            id: "NOTIF-005",
            userId: "USR-ADMIN-001",
            role: "admin",
            type: "verification",
            title: "New Collector Application",
            message: "Manoj Tiwari applied for collector onboarding in Sector 50-70 zone.",
            read: false,
            createdAt: "2026-09-22T09:40:00Z"
        }
    ];
}));
