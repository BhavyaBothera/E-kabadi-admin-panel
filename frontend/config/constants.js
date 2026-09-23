/* =========================================================
   E-KABAADI PLATFORM
   Configuration & Business Constants
   File: frontend/config/constants.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_CONSTANTS = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    return Object.freeze({
        APP_NAME: "E-Kabaadi",
        APP_VERSION: "2.0.0",
        CURRENCY: "INR",
        CURRENCY_SYMBOL: "₹",
        CITY: "Noida",
        STATE: "Uttar Pradesh",

        // Storage Database Keys
        STORAGE_KEYS: {
            DB: "ekabadi_unified_db_v2",
            SESSION: "ekabadi_platform_session_v2",
            SETTINGS: "ekabadi_admin_settings_v2",
            ACTIVE_BOOKING: "ekabadi_booking_context_v2"
        },

        // Pickup State Machine Constants
        PICKUP_STATUS: {
            REQUESTED: "requested",
            ACCEPTED: "accepted",
            ON_THE_WAY: "on_the_way",
            ARRIVED: "arrived",
            COLLECTING: "collecting",
            COMPLETED: "completed",
            PAID: "paid",
            PAYMENT_PENDING: "payment_pending",
            CANCELLED: "cancelled"
        },

        // Allowed transitions for state machine
        ALLOWED_PICKUP_TRANSITIONS: {
            requested: ["accepted", "cancelled"],
            accepted: ["on_the_way", "cancelled"],
            on_the_way: ["arrived", "cancelled"],
            arrived: ["collecting"],
            collecting: ["completed"],
            completed: ["paid", "payment_pending"],
            payment_pending: ["paid"],
            paid: [],
            cancelled: []
        },

        // User & Application Roles
        ROLES: {
            ADMIN: "admin",
            CITIZEN: "citizen",
            COLLECTOR: "collector"
        },

        // Application Verification Statuses
        APPLICATION_STATUS: {
            DRAFT: "draft",
            PENDING_APPROVAL: "pending_approval",
            APPROVED: "approved",
            REJECTED: "rejected",
            CORRECTION_REQUIRED: "correction_required"
        },

        // Account Statuses
        ACCOUNT_STATUS: {
            ACTIVE: "active",
            PENDING_APPROVAL: "pending_approval",
            REJECTED: "rejected",
            SUSPENDED: "suspended"
        },

        // Complaint Statuses
        COMPLAINT_STATUS: {
            OPEN: "open",
            UNDER_REVIEW: "under_review",
            RESOLVED: "resolved",
            CLOSED: "closed"
        },

        // Eco Coins Reward Calculation Rules
        REWARDS_CONFIG: {
            COINS_PER_KG: 2,           // 2 Eco Coins per kg of scrap
            BONUS_FIRST_PICKUP: 50,    // 50 bonus coins for first order
            COIN_VALUE_INR: 0.5        // 1 Eco Coin = ₹0.50 equivalent value
        },

        // Standard Environmental Formulas
        ENVIRONMENTAL_FACTORS: {
            CO2_SAVED_PER_KG: 2.3,     // 2.3 kg CO2 saved per kg recycled
            WATER_SAVED_PER_KG: 14.5,  // 14.5 liters water conserved per kg paper
            TREES_EQUIVALENT_PER_KG: 0.05
        }
    });
}));
