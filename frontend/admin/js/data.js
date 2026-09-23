/* =========================================================
   E-KABADI COMMAND CENTER
   MOCK DATABASE
   ========================================================= */

/*
   This file acts as our temporary frontend database.

   Later:
   - Supabase / Firebase / Node.js API can replace this.
   - The rest of the dashboard can continue using the
     same data structure.

   IMPORTANT:
   This is prototype data only.
*/


const EKABADI_DATA = {

    /* =====================================================
       PLATFORM
       ===================================================== */

    platform: {
        name: "E-Kabadi",
        adminName: "Bhavya Bothera",
        adminRole: "Super Admin",

        city: "Noida",
        state: "Uttar Pradesh",

        currency: "INR",

        platformFeePercentage: 5,

        totalWasteProcessed: 18420,
        totalCO2Saved: 42860,
        totalWaterSaved: 72600,

        activeCitizens: 1248,
        activeCollectors: 86,

        version: "1.0.0 Prototype"
    },


    /* =====================================================
       CITIZENS
       ===================================================== */

    citizens: [

        {
            id: "CIT-1001",
            name: "Aarav Sharma",
            phone: "+91 98765 43210",
            email: "aarav.sharma@email.com",

            location: {
                address: "Sector 62",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201309",
                lat: 28.6208,
                lng: 77.3639
            },

            joinedDate: "2026-01-14",

            status: "active",
            verified: true,

            totalPickups: 18,
            completedPickups: 16,

            totalWasteSold: 42.6,
            totalEarnings: 3240,

            ecoCoins: 860,

            rating: 4.8,

            lastActive: "2026-09-17T20:42:00",

            preferredPayment: "UPI",

            avatar: "AS"
        },

        {
            id: "CIT-1002",
            name: "Priya Verma",
            phone: "+91 98111 22445",
            email: "priya.verma@email.com",

            location: {
                address: "Sector 18",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201301",
                lat: 28.5708,
                lng: 77.3219
            },

            joinedDate: "2026-02-03",

            status: "active",
            verified: true,

            totalPickups: 24,
            completedPickups: 23,

            totalWasteSold: 61.4,
            totalEarnings: 4875,

            ecoCoins: 1240,

            rating: 4.9,

            lastActive: "2026-09-17T21:08:00",

            preferredPayment: "UPI",

            avatar: "PV"
        },

        {
            id: "CIT-1003",
            name: "Rohan Mehta",
            phone: "+91 98990 11223",
            email: "rohan.mehta@email.com",

            location: {
                address: "Sector 76",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201304",
                lat: 28.5651,
                lng: 77.3837
            },

            joinedDate: "2026-03-21",

            status: "active",
            verified: true,

            totalPickups: 11,
            completedPickups: 10,

            totalWasteSold: 28.9,
            totalEarnings: 2150,

            ecoCoins: 570,

            rating: 4.6,

            lastActive: "2026-09-17T18:31:00",

            preferredPayment: "UPI",

            avatar: "RM"
        },

        {
            id: "CIT-1004",
            name: "Ananya Gupta",
            phone: "+91 97654 77881",
            email: "ananya.g@email.com",

            location: {
                address: "Sector 137",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201305",
                lat: 28.5049,
                lng: 77.4076
            },

            joinedDate: "2026-04-09",

            status: "active",
            verified: true,

            totalPickups: 32,
            completedPickups: 31,

            totalWasteSold: 89.2,
            totalEarnings: 7120,

            ecoCoins: 1980,

            rating: 5.0,

            lastActive: "2026-09-17T20:17:00",

            preferredPayment: "Bank Transfer",

            avatar: "AG"
        },

        {
            id: "CIT-1005",
            name: "Kabir Singh",
            phone: "+91 99887 66554",
            email: "kabir.s@email.com",

            location: {
                address: "Sector 50",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201301",
                lat: 28.5703,
                lng: 77.3663
            },

            joinedDate: "2026-05-12",

            status: "suspended",
            verified: true,

            totalPickups: 7,
            completedPickups: 5,

            totalWasteSold: 16.8,
            totalEarnings: 1280,

            ecoCoins: 290,

            rating: 3.8,

            lastActive: "2026-08-29T14:20:00",

            preferredPayment: "UPI",

            avatar: "KS"
        },

        {
            id: "CIT-1006",
            name: "Neha Kapoor",
            phone: "+91 98712 33445",
            email: "neha.k@email.com",

            location: {
                address: "Sector 15",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201301",
                lat: 28.5825,
                lng: 77.3114
            },

            joinedDate: "2026-06-04",

            status: "active",
            verified: true,

            totalPickups: 14,
            completedPickups: 14,

            totalWasteSold: 36.7,
            totalEarnings: 2920,

            ecoCoins: 745,

            rating: 4.7,

            lastActive: "2026-09-17T19:54:00",

            preferredPayment: "UPI",

            avatar: "NK"
        },

        {
            id: "CIT-1007",
            name: "Vikram Joshi",
            phone: "+91 99581 22334",
            email: "vikram.j@email.com",

            location: {
                address: "Sector 51",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201301",
                lat: 28.5705,
                lng: 77.3725
            },

            joinedDate: "2026-06-17",

            status: "pending",
            verified: false,

            totalPickups: 0,
            completedPickups: 0,

            totalWasteSold: 0,
            totalEarnings: 0,

            ecoCoins: 0,

            rating: 0,

            lastActive: "2026-09-17T16:10:00",

            preferredPayment: "UPI",

            avatar: "VJ"
        },

        {
            id: "CIT-1008",
            name: "Meera Jain",
            phone: "+91 98222 55667",
            email: "meera.j@email.com",

            location: {
                address: "Sector 44",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201303",
                lat: 28.5518,
                lng: 77.3378
            },

            joinedDate: "2026-07-22",

            status: "active",
            verified: true,

            totalPickups: 9,
            completedPickups: 8,

            totalWasteSold: 22.3,
            totalEarnings: 1785,

            ecoCoins: 430,

            rating: 4.5,

            lastActive: "2026-09-17T21:12:00",

            preferredPayment: "UPI",

            avatar: "MJ"
        }
    ],


    /* =====================================================
       COLLECTORS
       ===================================================== */

    collectors: [

        {
            id: "COL-2001",

            name: "Ramesh Kumar",
            phone: "+91 98765 11223",
            email: "ramesh.k@email.com",

            businessName: "Ramesh Recycling Services",

            location: {
                address: "Sector 62",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201309",
                lat: 28.6215,
                lng: 77.3645
            },

            joinedDate: "2025-12-11",

            status: "active",
            verified: true,

            verificationStatus: "verified",

            vehicleType: "Mini Truck",
            vehicleNumber: "UP16 AB 4521",

            serviceRadius: 8,

            totalPickups: 482,
            completedPickups: 468,

            pendingPickups: 4,

            totalWasteCollected: 1842.7,

            totalPayout: 146820,

            rating: 4.8,

            completionRate: 97.1,

            ecoCoins: 4820,

            lastActive: "2026-09-17T21:15:00",

            avatar: "RK"
        },

        {
            id: "COL-2002",

            name: "Suresh Yadav",
            phone: "+91 98100 88776",
            email: "suresh.y@email.com",

            businessName: "Green Waste Solutions",

            location: {
                address: "Sector 18",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201301",
                lat: 28.5712,
                lng: 77.3224
            },

            joinedDate: "2026-01-06",

            status: "active",
            verified: true,

            verificationStatus: "verified",

            vehicleType: "Three Wheeler",
            vehicleNumber: "UP16 T 8891",

            serviceRadius: 6,

            totalPickups: 361,
            completedPickups: 349,

            pendingPickups: 3,

            totalWasteCollected: 1264.3,

            totalPayout: 101420,

            rating: 4.7,

            completionRate: 96.7,

            ecoCoins: 3610,

            lastActive: "2026-09-17T20:58:00",

            avatar: "SY"
        },

        {
            id: "COL-2003",

            name: "Imran Khan",
            phone: "+91 99580 33445",
            email: "imran.k@email.com",

            businessName: "EcoCollect Noida",

            location: {
                address: "Sector 76",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201304",
                lat: 28.5655,
                lng: 77.3842
            },

            joinedDate: "2026-02-18",

            status: "active",
            verified: true,

            verificationStatus: "verified",

            vehicleType: "Pickup Van",
            vehicleNumber: "UP16 C 2219",

            serviceRadius: 10,

            totalPickups: 297,
            completedPickups: 281,

            pendingPickups: 5,

            totalWasteCollected: 987.8,

            totalPayout: 79540,

            rating: 4.6,

            completionRate: 94.6,

            ecoCoins: 2970,

            lastActive: "2026-09-17T20:44:00",

            avatar: "IK"
        },

        {
            id: "COL-2004",

            name: "Mohan Lal",
            phone: "+91 98911 44556",
            email: "mohan.l@email.com",

            businessName: "Mohan Scrap Centre",

            location: {
                address: "Sector 50",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201301",
                lat: 28.5707,
                lng: 77.3668
            },

            joinedDate: "2026-03-04",

            status: "pending",
            verified: false,

            verificationStatus: "documents_pending",

            vehicleType: "Three Wheeler",
            vehicleNumber: "UP16 X 7712",

            serviceRadius: 5,

            totalPickups: 0,
            completedPickups: 0,

            pendingPickups: 0,

            totalWasteCollected: 0,

            totalPayout: 0,

            rating: 0,

            completionRate: 0,

            ecoCoins: 0,

            lastActive: "2026-09-16T18:22:00",

            avatar: "ML"
        },

        {
            id: "COL-2005",

            name: "Deepak Verma",
            phone: "+91 97654 11223",
            email: "deepak.v@email.com",

            businessName: "Clean Earth Recyclers",

            location: {
                address: "Sector 137",
                city: "Noida",
                state: "Uttar Pradesh",
                pincode: "201305",
                lat: 28.5053,
                lng: 77.4081
            },

            joinedDate: "2026-04-11",

            status: "active",
            verified: true,

            verificationStatus: "verified",

            vehicleType: "Mini Truck",
            vehicleNumber: "UP16 M 6644",

            serviceRadius: 12,

            totalPickups: 419,
            completedPickups: 407,

            pendingPickups: 2,

            totalWasteCollected: 1576.4,

            totalPayout: 125700,

            rating: 4.9,

            completionRate: 97.1,

            ecoCoins: 4190,

            lastActive: "2026-09-17T21:04:00",

            avatar: "DV"
        }
    ],


    /* =====================================================
       PICKUPS
       ===================================================== */

    pickups: [

        {
            id: "PK-9481",

            citizenId: "CIT-1001",
            collectorId: "COL-2001",

            citizenName: "Aarav Sharma",
            collectorName: "Ramesh Kumar",

            date: "2026-09-17",
            timeSlot: "18:00 - 20:00",

            address: "Sector 62, Noida",

            status: "completed",

            createdAt: "2026-09-17T14:22:00",
            scheduledAt: "2026-09-17T18:30:00",
            completedAt: "2026-09-17T18:47:00",

            items: [
                {
                    category: "Plastic",
                    type: "PET Bottles",
                    estimatedWeight: 4.2,
                    verifiedWeight: 4.0,
                    rate: 24
                },
                {
                    category: "Paper",
                    type: "Cardboard",
                    estimatedWeight: 3.0,
                    verifiedWeight: 2.8,
                    rate: 12
                }
            ],

            estimatedAmount: 118,
            finalAmount: 130,

            paymentStatus: "paid",
            paymentMethod: "UPI",

            verification: {
                aiEstimateUsed: true,
                collectorVerified: true,
                citizenConfirmed: true
            },

            rating: 5
        },


        {
            id: "PK-9482",

            citizenId: "CIT-1002",
            collectorId: "COL-2002",

            citizenName: "Priya Verma",
            collectorName: "Suresh Yadav",

            date: "2026-09-17",
            timeSlot: "19:00 - 21:00",

            address: "Sector 18, Noida",

            status: "in_progress",

            createdAt: "2026-09-17T16:10:00",
            scheduledAt: "2026-09-17T19:30:00",

            items: [
                {
                    category: "Plastic",
                    type: "Mixed Plastic",
                    estimatedWeight: 5.5,
                    verifiedWeight: null,
                    rate: 18
                },
                {
                    category: "Metal",
                    type: "Aluminium",
                    estimatedWeight: 2.1,
                    verifiedWeight: null,
                    rate: 145
                }
            ],

            estimatedAmount: 404,
            finalAmount: null,

            paymentStatus: "pending",
            paymentMethod: "UPI",

            verification: {
                aiEstimateUsed: true,
                collectorVerified: false,
                citizenConfirmed: false
            },

            rating: null
        },


        {
            id: "PK-9483",

            citizenId: "CIT-1003",
            collectorId: "COL-2003",

            citizenName: "Rohan Mehta",
            collectorName: "Imran Khan",

            date: "2026-09-17",
            timeSlot: "20:00 - 22:00",

            address: "Sector 76, Noida",

            status: "collector_assigned",

            createdAt: "2026-09-17T18:05:00",
            scheduledAt: "2026-09-17T20:30:00",

            items: [
                {
                    category: "E-Waste",
                    type: "Small Electronics",
                    estimatedWeight: 3.4,
                    verifiedWeight: null,
                    rate: 85
                }
            ],

            estimatedAmount: 289,
            finalAmount: null,

            paymentStatus: "pending",
            paymentMethod: "Bank Transfer",

            verification: {
                aiEstimateUsed: true,
                collectorVerified: false,
                citizenConfirmed: false
            },

            rating: null
        },


        {
            id: "PK-9484",

            citizenId: "CIT-1004",
            collectorId: null,

            citizenName: "Ananya Gupta",
            collectorName: null,

            date: "2026-09-18",
            timeSlot: "10:00 - 12:00",

            address: "Sector 137, Noida",

            status: "pending",

            createdAt: "2026-09-17T20:31:00",
            scheduledAt: "2026-09-18T10:30:00",

            items: [
                {
                    category: "Paper",
                    type: "Newspaper",
                    estimatedWeight: 8.2,
                    verifiedWeight: null,
                    rate: 16
                }
            ],

            estimatedAmount: 131,
            finalAmount: null,

            paymentStatus: "pending",
            paymentMethod: "UPI",

            verification: {
                aiEstimateUsed: true,
                collectorVerified: false,
                citizenConfirmed: false
            },

            rating: null
        },


        {
            id: "PK-9485",

            citizenId: "CIT-1006",
            collectorId: "COL-2005",

            citizenName: "Neha Kapoor",
            collectorName: "Deepak Verma",

            date: "2026-09-17",
            timeSlot: "16:00 - 18:00",

            address: "Sector 15, Noida",

            status: "completed",

            createdAt: "2026-09-17T11:20:00",
            scheduledAt: "2026-09-17T16:30:00",
            completedAt: "2026-09-17T17:05:00",

            items: [
                {
                    category: "Glass",
                    type: "Glass Bottles",
                    estimatedWeight: 6.5,
                    verifiedWeight: 6.2,
                    rate: 10
                },
                {
                    category: "Paper",
                    type: "Cardboard",
                    estimatedWeight: 4.1,
                    verifiedWeight: 4.0,
                    rate: 12
                }
            ],

            estimatedAmount: 114,
            finalAmount: 110,

            paymentStatus: "paid",
            paymentMethod: "UPI",

            verification: {
                aiEstimateUsed: true,
                collectorVerified: true,
                citizenConfirmed: true
            },

            rating: 4
        },


        {
            id: "PK-9486",

            citizenId: "CIT-1008",
            collectorId: "COL-2001",

            citizenName: "Meera Jain",
            collectorName: "Ramesh Kumar",

            date: "2026-09-16",
            timeSlot: "17:00 - 19:00",

            address: "Sector 44, Noida",

            status: "completed",

            createdAt: "2026-09-16T12:30:00",
            scheduledAt: "2026-09-16T17:30:00",
            completedAt: "2026-09-16T18:01:00",

            items: [
                {
                    category: "Metal",
                    type: "Iron",
                    estimatedWeight: 7.5,
                    verifiedWeight: 7.7,
                    rate: 32
                }
            ],

            estimatedAmount: 240,
            finalAmount: 246,

            paymentStatus: "paid",
            paymentMethod: "UPI",

            verification: {
                aiEstimateUsed: true,
                collectorVerified: true,
                citizenConfirmed: true
            },

            rating: 5
        }
    ],


    /* =====================================================
       SCRAP MATERIALS
       ===================================================== */

    scrapMaterials: [

        {
            id: "MAT-001",
            name: "PET Bottles",
            category: "Plastic",
            icon: "bottle",

            rate: 24,
            unit: "kg",

            previousRate: 22,

            status: "active",

            recyclable: true,

            description:
                "Clean PET plastic bottles suitable for recycling.",

            environmentalImpact: {
                co2SavedPerKg: 1.5,
                waterSavedPerKg: 3.2
            }
        },

        {
            id: "MAT-002",
            name: "Mixed Plastic",
            category: "Plastic",
            icon: "package",

            rate: 18,
            unit: "kg",

            previousRate: 18,

            status: "active",

            recyclable: true,

            description:
                "Household plastic packaging and containers.",

            environmentalImpact: {
                co2SavedPerKg: 1.2,
                waterSavedPerKg: 2.5
            }
        },

        {
            id: "MAT-003",
            name: "Cardboard",
            category: "Paper",
            icon: "box",

            rate: 12,
            unit: "kg",

            previousRate: 11,

            status: "active",

            recyclable: true,

            description:
                "Corrugated cardboard and clean packaging material.",

            environmentalImpact: {
                co2SavedPerKg: 0.9,
                waterSavedPerKg: 2.1
            }
        },

        {
            id: "MAT-004",
            name: "Newspaper",
            category: "Paper",
            icon: "newspaper",

            rate: 16,
            unit: "kg",

            previousRate: 15,

            status: "active",

            recyclable: true,

            description:
                "Newspapers and clean printed paper.",

            environmentalImpact: {
                co2SavedPerKg: 1.1,
                waterSavedPerKg: 4.0
            }
        },

        {
            id: "MAT-005",
            name: "Iron",
            category: "Metal",
            icon: "cylinder",

            rate: 32,
            unit: "kg",

            previousRate: 30,

            status: "active",

            recyclable: true,

            description:
                "Iron scrap, rods, utensils and household metal.",

            environmentalImpact: {
                co2SavedPerKg: 2.0,
                waterSavedPerKg: 5.2
            }
        },

        {
            id: "MAT-006",
            name: "Aluminium",
            category: "Metal",
            icon: "layers",

            rate: 145,
            unit: "kg",

            previousRate: 138,

            status: "active",

            recyclable: true,

            description:
                "Aluminium cans, sheets and household aluminium.",

            environmentalImpact: {
                co2SavedPerKg: 9.0,
                waterSavedPerKg: 8.0
            }
        },

        {
            id: "MAT-007",
            name: "Glass Bottles",
            category: "Glass",
            icon: "glass-water",

            rate: 10,
            unit: "kg",

            previousRate: 10,

            status: "active",

            recyclable: true,

            description:
                "Glass bottles and recyclable glass containers.",

            environmentalImpact: {
                co2SavedPerKg: 0.6,
                waterSavedPerKg: 1.4
            }
        },

        {
            id: "MAT-008",
            name: "E-Waste",
            category: "E-Waste",
            icon: "cpu",

            rate: 85,
            unit: "kg",

            previousRate: 80,

            status: "active",

            recyclable: true,

            description:
                "Small electronic devices and recyclable electronic components.",

            environmentalImpact: {
                co2SavedPerKg: 4.5,
                waterSavedPerKg: 7.0
            }
        }
    ],


    /* =====================================================
       PAYMENTS
       ===================================================== */

    payments: [

        {
            id: "PAY-7001",
            pickupId: "PK-9481",
            citizenId: "CIT-1001",
            collectorId: "COL-2001",

            citizenName: "Aarav Sharma",
            collectorName: "Ramesh Kumar",

            amount: 130,

            platformFee: 6.5,

            collectorPayout: 123.5,

            method: "UPI",

            status: "completed",

            transactionId: "UPI2609179481",

            createdAt: "2026-09-17T18:50:00"
        },

        {
            id: "PAY-7002",
            pickupId: "PK-9485",
            citizenId: "CIT-1006",
            collectorId: "COL-2005",

            citizenName: "Neha Kapoor",
            collectorName: "Deepak Verma",

            amount: 110,

            platformFee: 5.5,

            collectorPayout: 104.5,

            method: "UPI",

            status: "completed",

            transactionId: "UPI2609179485",

            createdAt: "2026-09-17T17:10:00"
        },

        {
            id: "PAY-7003",
            pickupId: "PK-9486",
            citizenId: "CIT-1008",
            collectorId: "COL-2001",

            citizenName: "Meera Jain",
            collectorName: "Ramesh Kumar",

            amount: 246,

            platformFee: 12.3,

            collectorPayout: 233.7,

            method: "UPI",

            status: "completed",

            transactionId: "UPI2609169486",

            createdAt: "2026-09-16T18:05:00"
        },

        {
            id: "PAY-7004",
            pickupId: "PK-9482",
            citizenId: "CIT-1002",
            collectorId: "COL-2002",

            citizenName: "Priya Verma",
            collectorName: "Suresh Yadav",

            amount: 404,

            platformFee: 20.2,

            collectorPayout: 383.8,

            method: "UPI",

            status: "pending",

            transactionId: null,

            createdAt: "2026-09-17T16:15:00"
        }
    ],


    /* =====================================================
       REWARDS
       ===================================================== */

    rewards: [

        {
            id: "REW-001",

            name: "Plastic Warrior",
            description:
                "Recycle more than 25 kg of plastic.",

            type: "milestone",

            target: 25,
            rewardCoins: 250,

            status: "active",

            icon: "recycle",

            unlockedBy: 186
        },

        {
            id: "REW-002",

            name: "Eco Starter",
            description:
                "Complete your first successful recycling pickup.",

            type: "milestone",

            target: 1,
            rewardCoins: 50,

            status: "active",

            icon: "leaf",

            unlockedBy: 742
        },

        {
            id: "REW-003",

            name: "Green Champion",
            description:
                "Complete 25 recycling pickups.",

            type: "milestone",

            target: 25,
            rewardCoins: 500,

            status: "active",

            icon: "trophy",

            unlockedBy: 91
        },

        {
            id: "REW-004",

            name: "E-Waste Hero",
            description:
                "Recycle 10 kg of electronic waste.",

            type: "category",

            target: 10,
            rewardCoins: 300,

            status: "active",

            icon: "cpu",

            unlockedBy: 64
        },

        {
            id: "REW-005",

            name: "Community Recycler",
            description:
                "Recycle with E-Kabadi for 6 consecutive months.",

            type: "streak",

            target: 6,
            rewardCoins: 750,

            status: "paused",

            icon: "users",

            unlockedBy: 28
        }
    ],


    /* =====================================================
       ISSUES / SUPPORT TICKETS
       ===================================================== */

    issues: [

        {
            id: "ISS-4001",

            type: "payment",
            priority: "high",

            citizenId: "CIT-1002",
            pickupId: "PK-9482",

            raisedBy: "Priya Verma",

            title: "Payment not received",

            description:
                "Pickup completed but payment is still showing as pending.",

            status: "open",

            assignedTo: "Finance Team",

            createdAt: "2026-09-17T19:02:00",

            updatedAt: "2026-09-17T19:20:00"
        },

        {
            id: "ISS-4002",

            type: "pickup",
            priority: "medium",

            citizenId: "CIT-1003",
            pickupId: "PK-9483",

            raisedBy: "Rohan Mehta",

            title: "Collector is delayed",

            description:
                "Collector has not reached the pickup location yet.",

            status: "investigating",

            assignedTo: "Operations Team",

            createdAt: "2026-09-17T20:41:00",

            updatedAt: "2026-09-17T20:52:00"
        },

        {
            id: "ISS-4003",

            type: "verification",
            priority: "low",

            citizenId: "CIT-1004",
            pickupId: null,

            raisedBy: "Ananya Gupta",

            title: "AI weight estimate seems incorrect",

            description:
                "Citizen requested manual verification of the AI estimated weight.",

            status: "resolved",

            assignedTo: "Verification Team",

            createdAt: "2026-09-15T11:32:00",

            updatedAt: "2026-09-16T14:12:00"
        }
    ],


    /* =====================================================
       NOTIFICATIONS
       ===================================================== */

    notifications: [

        {
            id: "NOT-001",

            type: "pickup",
            title: "New pickup request",

            message:
                "A new pickup request has been created in Sector 137.",

            time: "2 min ago",

            read: false
        },

        {
            id: "NOT-002",

            type: "collector",
            title: "Collector verification pending",

            message:
                "Mohan Lal submitted documents for verification.",

            time: "18 min ago",

            read: false
        },

        {
            id: "NOT-003",

            type: "payment",
            title: "Payment requires attention",

            message:
                "PAY-7004 is still pending.",

            time: "35 min ago",

            read: false
        },

        {
            id: "NOT-004",

            type: "system",
            title: "Daily recycling target achieved",

            message:
                "Today's recycling volume crossed the daily target.",

            time: "1 hour ago",

            read: true
        }
    ],


    /* =====================================================
       ANALYTICS
       ===================================================== */

    analytics: {

        dailyPickups: [
            34,
            41,
            38,
            52,
            47,
            61,
            68,
            73,
            69,
            81,
            78,
            92,
            88,
            96
        ],

        dailyWaste: [
            112,
            128,
            121,
            157,
            143,
            184,
            201,
            224,
            215,
            246,
            239,
            271,
            264,
            289
        ],

        dailyRevenue: [
            8420,
            9310,
            8870,
            10920,
            10240,
            13250,
            14580,
            15720,
            14960,
            17240,
            16890,
            19420,
            18760,
            21340
        ],

        materialDistribution: {
            Plastic: 34,
            Paper: 27,
            Metal: 16,
            Glass: 10,
            "E-Waste": 8,
            Other: 5
        },

        pickupStatusDistribution: {
            Completed: 68,
            "In Progress": 12,
            Assigned: 9,
            Pending: 7,
            Cancelled: 4
        },

        areaPerformance: [
            {
                area: "Sector 62",
                pickups: 184,
                waste: 612,
                growth: 14.2
            },
            {
                area: "Sector 18",
                pickups: 167,
                waste: 548,
                growth: 11.8
            },
            {
                area: "Sector 76",
                pickups: 142,
                waste: 471,
                growth: 9.4
            },
            {
                area: "Sector 137",
                pickups: 198,
                waste: 703,
                growth: 18.7
            },
            {
                area: "Sector 50",
                pickups: 121,
                waste: 398,
                growth: 7.6
            }
        ],

        monthlyWaste: [
            {
                month: "Apr",
                waste: 1240
            },
            {
                month: "May",
                waste: 1510
            },
            {
                month: "Jun",
                waste: 1790
            },
            {
                month: "Jul",
                waste: 2130
            },
            {
                month: "Aug",
                waste: 2650
            },
            {
                month: "Sep",
                waste: 3120
            }
        ]
    },


    /* =====================================================
       SYSTEM SETTINGS
       ===================================================== */

    settings: {

        platformName: "E-Kabadi",

        supportEmail: "support@ekabadi.demo",

        supportPhone: "+91 1800 123 4567",

        defaultPickupRadius: 10,

        autoAssignCollectors: true,

        requireCitizenConfirmation: true,

        requireCollectorVerification: true,

        enableAIAnalysis: true,

        enableRewards: true,

        enableNotifications: true,

        paymentAutoRelease: true,

        minimumPickupWeight: 1,

        maxPickupDistance: 15
    }
};


/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */


/**
 * Get all citizens
 */
function getCitizens() {
    return EKABADI_DATA.citizens;
}


/**
 * Get all collectors
 */
function getCollectors() {
    return EKABADI_DATA.collectors;
}


/**
 * Get all pickups
 */
function getPickups() {
    return EKABADI_DATA.pickups;
}


/**
 * Get all payments
 */
function getPayments() {
    return EKABADI_DATA.payments;
}


/**
 * Get all scrap materials
 */
function getScrapMaterials() {
    return EKABADI_DATA.scrapMaterials;
}


/**
 * Get all rewards
 */
function getRewards() {
    return EKABADI_DATA.rewards;
}


/**
 * Get all issues
 */
function getIssues() {
    return EKABADI_DATA.issues;
}


/**
 * Find citizen by ID
 */
function getCitizenById(id) {
    return EKABADI_DATA.citizens.find(
        citizen => citizen.id === id
    );
}


/**
 * Find collector by ID
 */
function getCollectorById(id) {
    return EKABADI_DATA.collectors.find(
        collector => collector.id === id
    );
}


/**
 * Find pickup by ID
 */
function getPickupById(id) {
    return EKABADI_DATA.pickups.find(
        pickup => pickup.id === id
    );
}


/**
 * Find payment by ID
 */
function getPaymentById(id) {
    return EKABADI_DATA.payments.find(
        payment => payment.id === id
    );
}


/**
 * Find material by ID
 */
function getMaterialById(id) {
    return EKABADI_DATA.scrapMaterials.find(
        material => material.id === id
    );
}


/**
 * Find issue by ID
 */
function getIssueById(id) {
    return EKABADI_DATA.issues.find(
        issue => issue.id === id
    );
}


/* =========================================================
   CALCULATIONS
   ========================================================= */


/**
 * Calculate dashboard statistics
 */
function calculateDashboardStats() {

    const citizens = EKABADI_DATA.citizens;
    const collectors = EKABADI_DATA.collectors;
    const pickups = EKABADI_DATA.pickups;
    const payments = EKABADI_DATA.payments;

    const activeCitizens =
        citizens.filter(
            citizen => citizen.status === "active"
        ).length;

    const activeCollectors =
        collectors.filter(
            collector => collector.status === "active"
        ).length;

    const completedPickups =
        pickups.filter(
            pickup => pickup.status === "completed"
        ).length;

    const activePickups =
        pickups.filter(
            pickup =>
                pickup.status === "in_progress" ||
                pickup.status === "collector_assigned"
        ).length;

    const pendingPickups =
        pickups.filter(
            pickup => pickup.status === "pending"
        ).length;

    const completedPayments =
        payments.filter(
            payment => payment.status === "completed"
        );

    const totalRevenue =
        completedPayments.reduce(
            (sum, payment) =>
                sum + payment.amount,
            0
        );

    const totalWaste =
        pickups
            .filter(
                pickup =>
                    pickup.status === "completed"
            )
            .reduce(
                (sum, pickup) => {

                    const weight =
                        pickup.items.reduce(
                            (itemSum, item) =>
                                itemSum +
                                (item.verifiedWeight || 0),
                            0
                        );

                    return sum + weight;
                },
                0
            );

    return {

        activeCitizens,

        activeCollectors,

        totalPickups: pickups.length,

        completedPickups,

        activePickups,

        pendingPickups,

        totalRevenue,

        totalWaste,

        co2Saved:
            totalWaste * 2.3,

        waterSaved:
            totalWaste * 4.8
    };
}


/**
 * Get pickup counts by status
 */
function getPickupStatusCounts() {

    const counts = {
        pending: 0,
        collector_assigned: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
    };

    EKABADI_DATA.pickups.forEach(
        pickup => {

            if (counts[pickup.status] !== undefined) {
                counts[pickup.status]++;
            }
        }
    );

    return counts;
}


/**
 * Get material totals
 */
function getMaterialTotals() {

    const totals = {};

    EKABADI_DATA.pickups.forEach(
        pickup => {

            pickup.items.forEach(
                item => {

                    const weight =
                        item.verifiedWeight ??
                        item.estimatedWeight ??
                        0;

                    if (!totals[item.category]) {
                        totals[item.category] = 0;
                    }

                    totals[item.category] += weight;
                }
            );
        }
    );

    return totals;
}


/**
 * Get pending collector verifications
 */
function getPendingCollectorVerifications() {

    return EKABADI_DATA.collectors.filter(
        collector =>
            collector.verificationStatus !== "verified"
    );
}


/**
 * Get open issues
 */
function getOpenIssues() {

    return EKABADI_DATA.issues.filter(
        issue =>
            issue.status === "open" ||
            issue.status === "investigating"
    );
}


/**
 * Get pending payments
 */
function getPendingPayments() {

    return EKABADI_DATA.payments.filter(
        payment =>
            payment.status === "pending"
    );
}


/* =========================================================
   ID GENERATOR
   ========================================================= */


/**
 * Generate a simple unique ID.
 */
function generateId(prefix) {

    const timestamp =
        Date.now()
            .toString()
            .slice(-6);

    const random =
        Math.floor(
            Math.random() * 100
        )
        .toString()
        .padStart(2, "0");

    return `${prefix}-${timestamp}${random}`;
}


/* =========================================================
   DATE HELPERS
   ========================================================= */


/**
 * Format date for UI.
 */
function formatDate(dateString) {

    if (!dateString) {
        return "—";
    }

    const date =
        new Date(dateString);

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/**
 * Format date + time.
 */
function formatDateTime(dateString) {

    if (!dateString) {
        return "—";
    }

    const date =
        new Date(dateString);

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/**
 * Format Indian currency.
 */
function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(value || 0);
}


/**
 * Format numbers.
 */
function formatNumber(value) {

    return new Intl.NumberFormat(
        "en-IN"
    ).format(value || 0);
}


/**
 * Format weight.
 */
function formatWeight(value) {

    return `${Number(value || 0).toFixed(1)} kg`;
}


/* =========================================================
   EXPORT TO WINDOW
   ========================================================= */

/*
   Since this project uses normal browser JavaScript
   instead of modules, these functions are explicitly
   exposed globally.

   Every HTML page can therefore access them.
*/

window.EKABADI_DATA = EKABADI_DATA;

window.getCitizens = getCitizens;
window.getCollectors = getCollectors;
window.getPickups = getPickups;
window.getPayments = getPayments;
window.getScrapMaterials = getScrapMaterials;
window.getRewards = getRewards;
window.getIssues = getIssues;

window.getCitizenById = getCitizenById;
window.getCollectorById = getCollectorById;
window.getPickupById = getPickupById;
window.getPaymentById = getPaymentById;
window.getMaterialById = getMaterialById;
window.getIssueById = getIssueById;

window.calculateDashboardStats =
    calculateDashboardStats;

window.getPickupStatusCounts =
    getPickupStatusCounts;

window.getMaterialTotals =
    getMaterialTotals;

window.getPendingCollectorVerifications =
    getPendingCollectorVerifications;

window.getOpenIssues =
    getOpenIssues;

window.getPendingPayments =
    getPendingPayments;

window.generateId =
    generateId;

window.formatDate =
    formatDate;

window.formatDateTime =
    formatDateTime;

window.formatCurrency =
    formatCurrency;

window.formatNumber =
    formatNumber;

window.formatWeight =
    formatWeight;