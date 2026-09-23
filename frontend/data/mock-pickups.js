/* =========================================================
   E-KABAADI PLATFORM
   Centralized Mock Pickups (State Machine Seed)
   File: frontend/data/mock-pickups.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.MOCK_PICKUPS = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    return [
        {
            id: "PK-9481",
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            citizenName: "Aarav Sharma",
            collectorName: "Ramesh Kumar",
            date: "2026-09-17",
            scheduledDate: "2026-09-17",
            timeSlot: "18:00 - 20:00",
            scheduledTime: "18:00 - 20:00",
            address: "Flat B-402, Green Valley Apartments, Sector 62, Noida",
            status: "completed",
            createdAt: "2026-09-17T14:22:00Z",
            acceptedAt: "2026-09-17T14:35:00Z",
            enrouteAt: "2026-09-17T18:15:00Z",
            arrivedAt: "2026-09-17T18:30:00Z",
            completedAt: "2026-09-17T18:47:00Z",
            paidAt: "2026-09-17T18:48:00Z",
            items: [
                {
                    category: "Paper",
                    type: "Old Newspaper & Books",
                    estimatedWeight: 15.0,
                    verifiedWeight: 15.0,
                    rate: 14.0
                },
                {
                    category: "Cardboard",
                    type: "Corrugated Cardboard (Patti)",
                    estimatedWeight: 10.5,
                    verifiedWeight: 10.5,
                    rate: 11.5
                }
            ],
            scrapType: "Paper & Cardboard",
            estimatedWeight: 25.5,
            estimatedValue: 330.75,
            finalWeight: 25.5,
            finalValue: 330.75,
            paymentStatus: "paid",
            paymentMethod: "UPI",
            ecoCoinsAwarded: 51,
            notes: "Please call upon arrival at gate"
        },
        {
            id: "PK-9482",
            citizenId: "CIT-1002",
            collectorId: "COL-2002",
            citizenName: "Priya Verma",
            collectorName: "Suresh Yadav",
            date: "2026-09-22",
            scheduledDate: "2026-09-22",
            timeSlot: "14:00 - 16:00",
            scheduledTime: "14:00 - 16:00",
            address: "House 24, Sector 18, Noida",
            status: "completed",
            createdAt: "2026-09-22T10:15:00Z",
            acceptedAt: "2026-09-22T10:25:00Z",
            enrouteAt: "2026-09-22T14:10:00Z",
            arrivedAt: "2026-09-22T14:30:00Z",
            completedAt: "2026-09-22T14:50:00Z",
            paidAt: "2026-09-22T14:52:00Z",
            items: [
                {
                    category: "Plastic",
                    type: "PET Bottles & Containers",
                    estimatedWeight: 8.0,
                    verifiedWeight: 8.2,
                    rate: 18.0
                },
                {
                    category: "Metal",
                    type: "Mixed Aluminium Scrap",
                    estimatedWeight: 2.0,
                    verifiedWeight: 2.1,
                    rate: 145.0
                }
            ],
            scrapType: "Plastic & Metal",
            estimatedWeight: 10.0,
            estimatedValue: 434.0,
            finalWeight: 10.3,
            finalValue: 452.1,
            paymentStatus: "paid",
            paymentMethod: "UPI",
            ecoCoinsAwarded: 21,
            notes: "Scrap is kept in garage"
        },
        {
            id: "PK-9483",
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            citizenName: "Aarav Sharma",
            collectorName: "Ramesh Kumar",
            date: "2026-09-23",
            scheduledDate: "2026-09-23",
            timeSlot: "11:30 AM - 01:30 PM",
            scheduledTime: "11:30 AM - 01:30 PM",
            address: "Flat B-402, Green Valley Apartments, Sector 62, Noida",
            status: "accepted",
            createdAt: "2026-09-23T08:00:00Z",
            acceptedAt: "2026-09-23T08:15:00Z",
            items: [
                {
                    category: "Paper",
                    type: "Textbooks & Office Paper",
                    estimatedWeight: 12.0,
                    verifiedWeight: null,
                    rate: 14.0
                },
                {
                    category: "E-waste",
                    type: "Old Keyboards & Cables",
                    estimatedWeight: 2.0,
                    verifiedWeight: null,
                    rate: 45.0
                }
            ],
            scrapType: "Paper & E-waste",
            estimatedWeight: 14.0,
            estimatedValue: 258.0,
            finalWeight: null,
            finalValue: null,
            paymentStatus: "pending",
            paymentMethod: "UPI",
            ecoCoinsAwarded: 0,
            notes: "Ring bell twice, cartons near balcony"
        },
        {
            id: "PKP-1001",
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            citizenName: "Aarav Sharma",
            collectorName: "Ramesh Kumar",
            date: "2026-09-24",
            scheduledDate: "2026-09-24",
            timeSlot: "10:00 AM - 12:00 PM",
            scheduledTime: "10:00 AM - 12:00 PM",
            address: "Flat B-402, Green Valley Apartments, Sector 62, Noida",
            status: "requested",
            createdAt: "2026-09-23T09:00:00Z",
            items: [
                { category: "Paper", type: "Newspaper & Notebooks", estimatedWeight: 12.0, rate: 14.0 }
            ],
            scrapType: "Paper",
            estimatedWeight: 12.0,
            estimatedValue: 168.0,
            paymentStatus: "pending",
            paymentMethod: "UPI",
            ecoCoinsAwarded: 0
        },
        {
            id: "PKP-1002",
            citizenId: "CIT-1002",
            collectorId: "COL-2001",
            citizenName: "Priya Verma",
            collectorName: "Ramesh Kumar",
            date: "2026-09-23",
            scheduledDate: "2026-09-23",
            timeSlot: "02:00 PM - 04:00 PM",
            scheduledTime: "02:00 PM - 04:00 PM",
            address: "House 24, Sector 18, Noida",
            status: "completed",
            createdAt: "2026-09-23T07:00:00Z",
            acceptedAt: "2026-09-23T07:15:00Z",
            enrouteAt: "2026-09-23T14:00:00Z",
            arrivedAt: "2026-09-23T14:15:00Z",
            completedAt: "2026-09-23T14:40:00Z",
            paidAt: "2026-09-23T14:41:00Z",
            items: [
                { category: "Plastic", type: "PET Bottles & Rigid Plastics", estimatedWeight: 10.0, verifiedWeight: 10.0, rate: 18.0 },
                { category: "Metal", type: "Aluminium & Beverage Cans", estimatedWeight: 2.0, verifiedWeight: 2.0, rate: 100.0 }
            ],
            scrapType: "Plastic & Metal",
            estimatedWeight: 12.0,
            estimatedValue: 380.0,
            finalWeight: 12.0,
            finalValue: 380.0,
            paymentStatus: "paid",
            paymentMethod: "UPI",
            ecoCoinsAwarded: 24
        },
        {
            id: "PKP-1003",
            citizenId: "CIT-1003",
            collectorId: "COL-2002",
            citizenName: "Rohit Malhotra",
            collectorName: "Suresh Yadav",
            date: "2026-09-24",
            scheduledDate: "2026-09-24",
            timeSlot: "04:00 PM - 06:00 PM",
            scheduledTime: "04:00 PM - 06:00 PM",
            address: "Villa 9, Sector 44, Noida",
            status: "accepted",
            createdAt: "2026-09-23T08:30:00Z",
            acceptedAt: "2026-09-23T08:45:00Z",
            items: [
                { category: "E-waste", type: "Electronic Waste & Peripherals", estimatedWeight: 5.0, rate: 45.0 }
            ],
            scrapType: "E-waste",
            estimatedWeight: 5.0,
            estimatedValue: 225.0,
            paymentStatus: "pending",
            paymentMethod: "UPI",
            ecoCoinsAwarded: 0
        }
    ];
}));
