/* =========================================================
   E-KABAADI PLATFORM
   Centralized Mock Citizens
   File: frontend/data/mock-citizens.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.MOCK_CITIZENS = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    return [
        {
            id: "CIT-1001",
            userId: "USR-CIT-001",
            name: "Aarav Sharma",
            phone: "+91 98765 43210",
            email: "citizen@ekabadi.demo",
            avatar: "AS",
            joinedDate: "2026-01-14",
            status: "active",
            kycStatus: "verified",
            maskedAadhaar: "XXXX-XXXX-4821",
            payoutMethod: "UPI",
            upiId: "aarav.sharma@okhdfcbank",
            addresses: [
                {
                    id: "ADDR-1",
                    label: "Home",
                    address: "Flat B-402, Green Valley Apartments, Sector 62",
                    city: "Noida",
                    state: "Uttar Pradesh",
                    pincode: "201309",
                    isDefault: true
                },
                {
                    id: "ADDR-2",
                    label: "Office",
                    address: "Tower 3, Logix Cyber Park, Sector 62",
                    city: "Noida",
                    state: "Uttar Pradesh",
                    pincode: "201309",
                    isDefault: false
                }
            ],
            location: {
                address: "Sector 62, Noida",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201309",
                lat: 28.6208,
                lng: 77.3639
            },
            totalPickups: 18,
            completedPickups: 16,
            totalWasteSold: 42.6,
            totalEarnings: 3240,
            ecoCoins: 860,
            rating: 4.8,
            lastActive: "2026-09-23T10:00:00"
        },
        {
            id: "CIT-1002",
            userId: "USR-CIT-002",
            name: "Priya Verma",
            phone: "+91 98111 22445",
            email: "priya.verma@email.com",
            avatar: "PV",
            joinedDate: "2026-02-03",
            status: "active",
            kycStatus: "verified",
            maskedAadhaar: "XXXX-XXXX-6632",
            payoutMethod: "UPI",
            upiId: "priya.verma@okaxis",
            addresses: [
                {
                    id: "ADDR-3",
                    label: "Residence",
                    address: "House 24, Sector 18",
                    city: "Noida",
                    state: "Uttar Pradesh",
                    pincode: "201301",
                    isDefault: true
                }
            ],
            location: {
                address: "Sector 18, Noida",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201301",
                lat: 28.5708,
                lng: 77.3219
            },
            totalPickups: 24,
            completedPickups: 23,
            totalWasteSold: 61.4,
            totalEarnings: 4875,
            ecoCoins: 1240,
            rating: 4.9,
            lastActive: "2026-09-23T09:15:00"
        },
        {
            id: "CIT-1007",
            userId: "USR-CIT-007",
            name: "Vikas Malhotra",
            phone: "+91 98199 44321",
            email: "vikas.applicant@email.com",
            avatar: "VM",
            joinedDate: "2026-09-21",
            status: "pending_approval",
            kycStatus: "pending",
            maskedAadhaar: "XXXX-XXXX-9901",
            payoutMethod: "UPI",
            upiId: "vikas@paytm",
            addresses: [
                {
                    id: "ADDR-4",
                    label: "Home",
                    address: "C-12, Sector 52",
                    city: "Noida",
                    state: "Uttar Pradesh",
                    pincode: "201307",
                    isDefault: true
                }
            ],
            location: {
                address: "Sector 52, Noida",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201307",
                lat: 28.5910,
                lng: 77.3680
            },
            totalPickups: 0,
            completedPickups: 0,
            totalWasteSold: 0,
            totalEarnings: 0,
            ecoCoins: 0,
            rating: 5.0,
            lastActive: "2026-09-21T15:20:00"
        }
    ];
}));
