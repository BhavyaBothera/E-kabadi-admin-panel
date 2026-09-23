/* =========================================================
   E-KABAADI PLATFORM
   Centralized Route Definitions
   File: frontend/config/routes.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_ROUTES = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    return Object.freeze({
        PUBLIC: {
            HOME: "../public/index.html"
        },
        AUTH: {
            LOGIN: "../auth/login.html",
            SIGNUP: "../auth/signup.html",
            CITIZEN_SIGNUP: "../auth/citizen-signup.html",
            COLLECTOR_SIGNUP: "../auth/collector-signup.html",
            PENDING: "../auth/pending.html",
            REJECTED: "../auth/rejected.html",
            FORGOT_PASSWORD: "../auth/forgot-password.html"
        },
        CITIZEN: {
            DASHBOARD: "../citizen/dashboard.html",
            SELL_SCRAP: "../citizen/sell-scrap.html",
            SCRAP_ANALYSIS: "../citizen/scrap-analysis.html",
            COLLECTORS: "../citizen/collectors.html",
            PICKUP: "../citizen/pickup.html",
            TRACKING: "../citizen/tracking.html",
            PAYMENTS: "../citizen/payments.html",
            REWARDS: "../citizen/rewards.html",
            HISTORY: "../citizen/history.html",
            NOTIFICATIONS: "../citizen/notifications.html",
            SUPPORT: "../citizen/support.html",
            PROFILE: "../citizen/profile.html"
        },
        COLLECTOR: {
            DASHBOARD: "../collector/dashboard.html",
            REQUESTS: "../collector/requests.html",
            ACTIVE_PICKUP: "../collector/active-pickup.html",
            NAVIGATION: "../collector/navigation.html",
            COLLECTION: "../collector/collection.html",
            HISTORY: "../collector/history.html",
            EARNINGS: "../collector/earnings.html",
            REWARDS: "../collector/rewards.html",
            NOTIFICATIONS: "../collector/notifications.html",
            SUPPORT: "../collector/support.html",
            PROFILE: "../collector/profile.html"
        },
        ADMIN: {
            DASHBOARD: "../admin/dashboard.html",
            CITIZENS: "../admin/citizens.html",
            COLLECTORS: "../admin/collectors.html",
            PICKUPS: "../admin/pickups.html",
            SCRAP: "../admin/scrap.html",
            PAYMENTS: "../admin/payments.html",
            REWARDS: "../admin/rewards.html",
            ANALYTICS: "../admin/analytics.html",
            ISSUES: "../admin/issues.html",
            SETTINGS: "../admin/settings.html"
        }
    });
}));
