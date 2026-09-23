/* =========================================================
   E-KABAADI PLATFORM
   Shared Utilities & Formatters
   File: frontend/shared/js/utilities.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_UTILS = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const utils = {
        formatCurrency(amount) {
            return "₹" + Number(amount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },

        formatWeight(kg) {
            return Number(kg || 0).toFixed(1) + " kg";
        },

        formatDate(isoString) {
            if (!isoString) return "-";
            const d = new Date(isoString);
            return d.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
            });
        },

        formatTime(isoString) {
            if (!isoString) return "-";
            const d = new Date(isoString);
            return d.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });
        },

        formatDateTime(isoString) {
            if (!isoString) return "-";
            return `${this.formatDate(isoString)} at ${this.formatTime(isoString)}`;
        },

        timeAgo(isoString) {
            if (!isoString) return "";
            const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
            if (diff < 60) return "Just now";
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
            return `${Math.floor(diff / 86400)}d ago`;
        },

        debounce(func, wait = 250) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        },

        maskString(str, visibleStart = 2, visibleEnd = 2) {
            if (!str) return "";
            if (str.length <= visibleStart + visibleEnd) return str;
            const start = str.slice(0, visibleStart);
            const end = str.slice(-visibleEnd);
            const masked = "X".repeat(str.length - visibleStart - visibleEnd);
            return `${start}${masked}${end}`;
        },

        maskAadhaar(aadhaar) {
            if (!aadhaar) return "XXXX-XXXX-XXXX";
            const cleaned = String(aadhaar).replace(/\D/g, "");
            if (cleaned.length < 4) return "XXXX-XXXX-XXXX";
            return `XXXX-XXXX-${cleaned.slice(-4)}`;
        },

        maskBankAccount(acct) {
            if (!acct) return "••••••••••••";
            const cleaned = String(acct).replace(/\s/g, "");
            if (cleaned.length < 4) return "••••••••••••";
            return `••••••••${cleaned.slice(-4)}`;
        }
    };

    return utils;
}));
