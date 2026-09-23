/* =========================================================
   E-KABAADI PLATFORM
   Shared UI Notification Toast Helper
   File: frontend/shared/js/notifications.js
   ========================================================= */

(function (root) {
    "use strict";

    function showToast(message, type = "info", duration = 3500) {
        let container = document.getElementById("toastRoot");
        if (!container) {
            container = document.createElement("div");
            container.id = "toastRoot";
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;

        const iconMap = {
            success: "✓",
            warning: "⚠",
            danger: "✕",
            info: "ℹ"
        };

        toast.innerHTML = `
            <span style="font-weight:bold;font-size:16px;">${iconMap[type] || "ℹ"}</span>
            <div style="flex:1;line-height:1.4;">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = "all 0.3s ease";
            toast.style.opacity = "0";
            toast.style.transform = "translateX(50px)";
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    root.showToast = showToast;
})(typeof self !== "undefined" ? self : this);
