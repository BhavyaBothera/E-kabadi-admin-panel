/* =========================================================
   E-KABAADI PLATFORM
   Centralized Mock Collectors
   File: frontend/data/mock-collectors.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.MOCK_COLLECTORS = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    return [
        {
            id: "COL-2001",
            userId: "USR-COL-001",
            name: "Ramesh Kumar",
            phone: "+91 98765 11223",
            email: "collector@ekabadi.demo",
            avatar: "RK",
            businessName: "Ramesh Recycling Services",
            vehicleType: "Three-Wheeler Tempo",
            vehicleNumber: "UP 16 AB 1234",
            serviceRadius: 8,
            serviceArea: "Sector 15-65, Noida",
            location: {
                address: "Sector 62, Noida",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201309",
                lat: 28.6215,
                lng: 77.3645
            },
            distance: 1.2,
            joinedDate: "2025-12-11",
            status: "active",
            verificationStatus: "verified",
            scaleStatus: "certified",
            scaleId: "EKB-402",
            acceptedMaterials: ["Paper", "Plastic", "Metal", "E-waste", "Cardboard"],
            scrapCategories: ["Paper", "Plastic", "Metal", "E-waste", "Cardboard"],
            rating: 4.8,
            totalPickups: 342,
            completedPickups: 342,
            pendingPickups: 1,
            queueLength: 1,
            responseTime: "~15 min",
            totalWasteCollected: 1842.7,
            totalEarnings: 128500,
            ecoCoins: 2400,
            isOnline: true,
            maskedBank: "State Bank of India (A/C: XXXXXX4412)",
            lastActive: "2026-09-23T10:15:00"
        },
        {
            id: "COL-2002",
            userId: "USR-COL-002",
            name: "Suresh Yadav",
            phone: "+91 98100 88776",
            email: "suresh.y@email.com",
            avatar: "SY",
            businessName: "Green Waste Solutions",
            vehicleType: "Pickup Truck",
            vehicleNumber: "UP 16 T 8891",
            serviceRadius: 6,
            serviceArea: "Sector 1-30, Noida",
            location: {
                address: "Sector 18, Noida",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201301",
                lat: 28.5712,
                lng: 77.3224
            },
            distance: 2.5,
            joinedDate: "2026-01-06",
            status: "active",
            verificationStatus: "verified",
            scaleStatus: "certified",
            scaleId: "EKB-108",
            acceptedMaterials: ["Metal", "Cardboard", "Glass", "Plastic"],
            scrapCategories: ["Metal", "Cardboard", "Glass", "Plastic"],
            rating: 4.6,
            totalPickups: 218,
            completedPickups: 218,
            pendingPickups: 0,
            queueLength: 0,
            responseTime: "~20 min",
            totalWasteCollected: 1264.3,
            totalEarnings: 101420,
            ecoCoins: 1800,
            isOnline: true,
            maskedBank: "Punjab National Bank (A/C: XXXXXX9931)",
            lastActive: "2026-09-23T09:45:00"
        },
        {
            id: "COL-2003",
            userId: "USR-COL-003",
            name: "Mohan Lal",
            phone: "+91 98990 44556",
            email: "mohan.lal@email.com",
            avatar: "ML",
            businessName: "Mohan Scrap Hub",
            vehicleType: "Three-Wheeler Tempo",
            vehicleNumber: "UP 16 CD 5678",
            serviceRadius: 10,
            serviceArea: "Sector 40-80, Noida",
            location: {
                address: "Sector 45, Noida",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201303",
                lat: 28.5520,
                lng: 77.3420
            },
            distance: 3.8,
            joinedDate: "2025-11-20",
            status: "active",
            verificationStatus: "verified",
            scaleStatus: "certified",
            scaleId: "EKB-304",
            acceptedMaterials: ["Paper", "Plastic", "Metal", "Cardboard", "Glass", "E-waste"],
            scrapCategories: ["Paper", "Plastic", "Metal", "Cardboard", "Glass", "E-waste"],
            rating: 4.9,
            totalPickups: 561,
            completedPickups: 561,
            pendingPickups: 0,
            queueLength: 0,
            responseTime: "~10 min",
            totalWasteCollected: 3120.5,
            totalEarnings: 245000,
            ecoCoins: 4200,
            isOnline: true,
            maskedBank: "HDFC Bank (A/C: XXXXXX1122)",
            lastActive: "2026-09-23T10:30:00"
        },
        {
            id: "COL-2007",
            userId: "USR-COL-007",
            name: "Manoj Tiwari",
            phone: "+91 98222 77112",
            email: "manoj.scrap@email.com",
            avatar: "MT",
            businessName: "Tiwari Eco Haulers",
            vehicleType: "Mini Truck",
            vehicleNumber: "UP 16 EF 9012",
            serviceRadius: 8,
            serviceArea: "Sector 50-70, Noida",
            location: {
                address: "Sector 55, Noida",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201307",
                lat: 28.5980,
                lng: 77.3510
            },
            distance: 4.5,
            joinedDate: "2026-09-22",
            status: "pending_approval",
            verificationStatus: "pending",
            scaleStatus: "pending_calibration",
            scaleId: "EKB-990",
            acceptedMaterials: ["Metal", "E-waste"],
            scrapCategories: ["Metal", "E-waste"],
            rating: 5.0,
            totalPickups: 0,
            completedPickups: 0,
            pendingPickups: 0,
            queueLength: 0,
            responseTime: "~25 min",
            totalWasteCollected: 0,
            totalEarnings: 0,
            ecoCoins: 0,
            isOnline: false,
            maskedBank: "ICICI Bank (A/C: XXXXXX7781)",
            lastActive: "2026-09-22T09:40:00"
        }
    ];
}));
