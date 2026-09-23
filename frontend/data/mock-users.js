/* =========================================================
   E-KABAADI PLATFORM
   Centralized User & Demo Accounts
   File: frontend/data/mock-users.js
   
   ISOLATION NOTICE:
   This file provides development & demo authentication credentials.
   All personal/sensitive details use simulated mock strings.
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.MOCK_USERS = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    return [
        {
            id: "USR-ADMIN-001",
            role: "admin",
            email: "admin@ekabadi.demo",
            phone: "+91 99999 00000",
            password: "admin123",
            firstName: "Bhavya",
            lastName: "Bothera",
            name: "Bhavya Bothera",
            avatar: "BB",
            status: "active",
            applicationStatus: "approved",
            phoneVerified: true,
            emailVerified: true,
            createdAt: "2025-10-01T08:00:00Z"
        },
        {
            id: "USR-CIT-001",
            role: "citizen",
            citizenId: "CIT-1001",
            email: "citizen@ekabadi.demo",
            phone: "+91 98765 43210",
            password: "citizen123",
            firstName: "Aarav",
            lastName: "Sharma",
            name: "Aarav Sharma",
            avatar: "AS",
            status: "active",
            applicationStatus: "approved",
            phoneVerified: true,
            emailVerified: true,
            maskedAadhaar: "XXXX-XXXX-4821",
            createdAt: "2026-01-14T10:30:00Z"
        },
        {
            id: "USR-COL-001",
            role: "collector",
            collectorId: "COL-2001",
            email: "collector@ekabadi.demo",
            phone: "+91 98765 11223",
            password: "collector123",
            firstName: "Ramesh",
            lastName: "Kumar",
            name: "Ramesh Kumar",
            avatar: "RK",
            businessName: "Ramesh Recycling Services",
            status: "active",
            applicationStatus: "approved",
            phoneVerified: true,
            emailVerified: true,
            maskedAadhaar: "XXXX-XXXX-8912",
            createdAt: "2025-12-11T09:15:00Z"
        },
        {
            id: "USR-CIT-002",
            role: "citizen",
            citizenId: "CIT-1002",
            email: "priya.verma@email.com",
            phone: "+91 98111 22445",
            password: "password123",
            firstName: "Priya",
            lastName: "Verma",
            name: "Priya Verma",
            avatar: "PV",
            status: "active",
            applicationStatus: "approved",
            phoneVerified: true,
            emailVerified: true,
            maskedAadhaar: "XXXX-XXXX-6632",
            createdAt: "2026-02-03T11:20:00Z"
        },
        {
            id: "USR-COL-002",
            role: "collector",
            collectorId: "COL-2002",
            email: "suresh.y@email.com",
            phone: "+91 98100 88776",
            password: "password123",
            firstName: "Suresh",
            lastName: "Yadav",
            name: "Suresh Yadav",
            avatar: "SY",
            businessName: "Green Waste Solutions",
            status: "active",
            applicationStatus: "approved",
            phoneVerified: true,
            emailVerified: true,
            maskedAadhaar: "XXXX-XXXX-3341",
            createdAt: "2026-01-06T14:45:00Z"
        },
        {
            id: "USR-CIT-007",
            role: "citizen",
            citizenId: "CIT-1007",
            email: "vikas.applicant@email.com",
            phone: "+91 98199 44321",
            password: "password123",
            firstName: "Vikas",
            lastName: "Malhotra",
            name: "Vikas Malhotra",
            avatar: "VM",
            status: "pending_approval",
            applicationStatus: "pending_approval",
            phoneVerified: true,
            emailVerified: true,
            maskedAadhaar: "XXXX-XXXX-9901",
            createdAt: "2026-09-21T15:20:00Z"
        },
        {
            id: "USR-COL-007",
            role: "collector",
            collectorId: "COL-2007",
            email: "manoj.scrap@email.com",
            phone: "+91 98222 77112",
            password: "password123",
            firstName: "Manoj",
            lastName: "Tiwari",
            name: "Manoj Tiwari",
            avatar: "MT",
            businessName: "Tiwari Eco Haulers",
            status: "pending_approval",
            applicationStatus: "pending_approval",
            phoneVerified: true,
            emailVerified: true,
            maskedAadhaar: "XXXX-XXXX-1288",
            createdAt: "2026-09-22T09:40:00Z"
        }
    ];
}));
