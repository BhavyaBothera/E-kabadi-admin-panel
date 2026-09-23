/* =========================================================
   E-KABAADI PLATFORM — Collector Partner
   Dispatch Alerts & Notifications Controller
   File: frontend/collector/js/notifications.js
   ========================================================= */

(function () {
    "use strict";

    function renderCollectorNotifications() {
        const collector = window.currentCollector || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { id: "USR-COL-001" };
        const userId = collector.id || "USR-COL-001";

        if (typeof notificationService === "undefined") return;

        const notifs = notificationService.getForUser(userId);
        const container = document.getElementById("collectorNotifsContainer") || document.querySelector("main .ui-card")?.parentElement;
        if (!container) return;

        if (notifs.length === 0) return; // Keep existing static notices if none

        container.innerHTML = notifs.map(n => {
            const isUnread = !n.read;
            return `
                <div class="ui-card" style="border-left:4px solid ${isUnread ? "var(--forest)" : "var(--border-subtle)"};display:flex;gap:16px;align-items:flex-start;margin-bottom:12px;">
                    <div class="stat-icon-wrapper stat-icon-green" style="flex-shrink:0;">📢</div>
                    <div style="flex:1;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:6px;">
                            <strong style="color:var(--forest-deep);font-size:15px;">${n.title}</strong>
                            ${isUnread ? `<span class="status-pill warning">New</span>` : ""}
                        </div>
                        <p style="font-size:13px;color:var(--text-muted);line-height:1.5;margin-bottom:8px;">
                            ${n.message}
                        </p>
                        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
                            ${n.actionUrl ? `<a href="${n.actionUrl}" style="font-size:13px;color:var(--forest);font-weight:700;">Open →</a>` : ""}
                            <span style="font-size:11px;color:#96a19b;">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            ${isUnread ? `
                                <button type="button" onclick="window.markNotifRead('${n.id}')" style="background:none;border:none;color:var(--forest);font-size:11px;font-weight:700;cursor:pointer;padding:0;">
                                    Mark as read
                                </button>
                            ` : ""}
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    window.markNotifRead = function (id) {
        if (typeof notificationService !== "undefined") {
            notificationService.markAsRead(id);
            renderCollectorNotifications();
        }
    };

    window.markAllCollectorNotifsRead = function () {
        const collector = window.currentCollector || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { id: "USR-COL-001" };
        if (typeof notificationService !== "undefined") {
            notificationService.markAllAsRead(collector.id || "USR-COL-001");
            showToast("All partner dispatch alerts marked as read.", "success");
            renderCollectorNotifications();
        }
    };

    document.addEventListener("DOMContentLoaded", renderCollectorNotifications);
    window.addEventListener("ekabadi:statechange", renderCollectorNotifications);
})();
