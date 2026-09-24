/* =========================================================
   E-KABAADI PLATFORM — SECURITY UTILITIES
   File: frontend/shared/js/security-utils.js

   Defense-in-depth utilities for:
   - XSS sanitization & HTML entity escaping
   - Input cleaning & control-character stripping
   - PII Masking: Aadhaar (XXXX-XXXX-1234) & Bank (••••••••1234)
   - Open Redirect defense with internal route whitelist
   - Session validity & expiration verification
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_SECURITY = factory();
        root.escapeHtml = root.EKABADI_SECURITY.escapeHtml;
        root.sanitizeInput = root.EKABADI_SECURITY.sanitizeInput;
        root.maskAadhaar = root.EKABADI_SECURITY.maskAadhaar;
        root.maskBankAccount = root.EKABADI_SECURITY.maskBankAccount;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var HTML_ESCAPE_MAP = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "/": "&#x2F;",
        "`": "&#x60;",
        "=": "&#x3D;"
    };

    var ALLOWED_INTERNAL_ROUTES = [
        "/",
        "/index.html",
        "/public/index.html",
        "/public/rates.html",
        "/public/tracking.html",
        "/auth/login.html",
        "/auth/signup.html",
        "/auth/citizen-signup.html",
        "/auth/collector-signup.html",
        "/auth/forgot-password.html",
        "/auth/pending.html",
        "/auth/rejected.html",
        "/citizen/dashboard.html",
        "/citizen/book-pickup.html",
        "/citizen/scrap.html",
        "/citizen/collectors.html",
        "/citizen/history.html",
        "/citizen/tracking.html",
        "/citizen/wallet.html",
        "/citizen/rewards.html",
        "/citizen/payments.html",
        "/citizen/support.html",
        "/citizen/notifications.html",
        "/citizen/profile.html",
        "/collector/dashboard.html",
        "/collector/requests.html",
        "/collector/transit.html",
        "/collector/collection.html",
        "/collector/radar.html",
        "/collector/history.html",
        "/collector/earnings.html",
        "/collector/scale.html",
        "/collector/notifications.html",
        "/collector/profile.html",
        "/admin/dashboard.html",
        "/admin/citizens.html",
        "/admin/collectors.html",
        "/admin/pickups.html",
        "/admin/scrap.html",
        "/admin/payments.html",
        "/admin/rewards.html",
        "/admin/analytics.html",
        "/admin/issues.html",
        "/admin/settings.html"
    ];

    var SecurityUtils = {
        /**
         * Defensive HTML entity escaping to prevent stored and reflected XSS.
         * Safe for user-generated strings inserted into HTML containers.
         */
        escapeHtml: function (str) {
            if (str === null || str === undefined) return "";
            return String(str).replace(/[&<>"'`=\/]/g, function (char) {
                return HTML_ESCAPE_MAP[char] || char;
            });
        },

        /**
         * Strips control characters, null bytes, and trims whitespace.
         */
        sanitizeInput: function (str) {
            if (typeof str !== "string") return "";
            // Remove NULL bytes and non-printable control characters (except newline and tab)
            return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
        },

        /**
         * Masks 12-digit Aadhaar number, preserving only the last 4 digits.
         * Formats as: XXXX-XXXX-1234
         */
        maskAadhaar: function (aadhaar) {
            if (!aadhaar) return "XXXX-XXXX-XXXX";
            var clean = String(aadhaar).replace(/\D/g, "");
            if (clean.length < 4) return "XXXX-XXXX-XXXX";
            var last4 = clean.slice(-4);
            return "XXXX-XXXX-" + last4;
        },

        /**
         * Masks bank account number, preserving only the last 4 digits.
         * Formats as: ••••••••1234
         */
        maskBankAccount: function (accountNo) {
            if (!accountNo) return "••••••••••••";
            var clean = String(accountNo).replace(/\s/g, "");
            if (clean.length < 4) return "••••••••••••";
            var last4 = clean.slice(-4);
            return "••••••••" + last4;
        },

        /**
         * Validates internal redirect paths against the allowed internal routes.
         * Prevents open redirect attacks (e.g. redirecting to malicious external sites).
         */
        validateInternalRoute: function (targetUrl, fallback) {
            var defaultFallback = "../public/index.html";
            var safeFallback = fallback || defaultFallback;
            if (!targetUrl || typeof targetUrl !== "string") return safeFallback;

            var cleanUrl = targetUrl.trim();

            // Disallow protocol-relative URLs (//evil.com) and absolute URLs with schemes (http:, javascript:)
            if (cleanUrl.indexOf("//") === 0 || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cleanUrl)) {
                return safeFallback;
            }

            // Normalize path for lookup
            var normalized = cleanUrl.split("?")[0].split("#")[0].replace(/\\/g, "/");
            if (normalized.indexOf("../") === 0) {
                normalized = normalized.replace(/^\.\.\//, "/");
            } else if (normalized.indexOf("./") === 0) {
                normalized = normalized.replace(/^\.\//, "/");
            }
            if (normalized.charAt(0) !== "/") {
                normalized = "/" + normalized;
            }

            // Check if normalized matches any known route ending
            var isAllowed = ALLOWED_INTERNAL_ROUTES.some(function (route) {
                return normalized === route || normalized.indexOf(route) !== -1 || route.indexOf(normalized) !== -1;
            });

            return isAllowed ? cleanUrl : safeFallback;
        },

        /**
         * Validates session freshness, expiration timestamp, and account status.
         */
        isSessionValid: function (session) {
            if (!session || typeof session !== "object") return false;
            if (session.loggedIn === false) return false;

            // Check expiration if present
            if (session.expiresAt) {
                var exp = new Date(session.expiresAt).getTime();
                if (!isNaN(exp) && Date.now() > exp) {
                    return false;
                }
            }

            // Inactive account statuses
            var status = session.status || (session.user && session.user.status);
            if (status === "suspended" || status === "deactivated") {
                return false;
            }

            return true;
        }
    };

    return SecurityUtils;
}));
