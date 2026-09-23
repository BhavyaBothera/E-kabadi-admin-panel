/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Notifications Center Controller
   File: frontend/citizen/js/notifications.js
   ========================================================= */

(function () {
    "use strict";

    function renderNotificationsPage() {
        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001", id: "USR-CIT-001" };
        const userId = citizen.userId || citizen.id || "USR-CIT-001";

        if (typeof notificationService === "undefined") return;

        const notifs = notificationService.getForUser(userId);
        const container = document.getElementById("notifsContainer") || document.getElementById("notificationsListContainer");
        if (!container) return;

        if (notifs.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:48px 20px;background:#fff;border-radius:12px;border:1px dashed var(--border-subtle);">
                    <span style="font-size:36px;display:block;margin-bottom:8px;">🔔</span>
                    <h3 style="font-size:16px;font-weight:700;color:var(--forest-deep);">No Notifications</h3>
                    <p style="font-size:13px;color:var(--text-muted);">You're all caught up with your pickups and rewards!</p>
                </div>
            `;
            return;
        }

        const iconMap = {
            pickup: "🛺",
            order: "📦",
            payment: "💰",
            reward: "🪙",
            verification: "🛡️",
            dispute: "💬"
        };

        const iconClassMap = {
            pickup: "stat-icon-green",
            order: "stat-icon-green",
            payment: "stat-icon-gold",
            reward: "stat-icon-lime",
            verification: "stat-icon-blue",
            dispute: "stat-icon-gold"
        };

        container.innerHTML = notifs.map(n => {
            const timeAgo = formatTimeAgo(n.createdAt);
            const icon = iconMap[n.type] || "ℹ️";
            const iconClass = iconClassMap[n.type] || "stat-icon-green";
            const cat = n.type || "order";
            const isUnread = !n.read;

            return `
                <div class="notif-card ${isUnread ? "unread" : ""}" data-category="${cat}" data-status="${isUnread ? "unread" : "read"}">
                    <div class="notif-icon ${iconClass}">${icon}</div>
                    <div class="notif-main">
                        <div class="notif-title">
                            <span>${n.title}</span>
                            ${isUnread ? `<span class="status-pill warning" style="font-size:11px;">NEW</span>` : ""}
                        </div>
                        <div class="notif-desc">${n.message}</div>
                        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                            ${n.actionUrl ? `<a href="${n.actionUrl}" style="font-size:13px;color:var(--forest);font-weight:700;">View Details →</a>` : ""}
                            <span class="notif-time">${timeAgo}</span>
                            ${isUnread ? `
                                <button type="button" onclick="window.markNotifRead('${n.id}')" style="background:none;border:none;color:var(--forest);font-size:12px;font-weight:600;cursor:pointer;padding:0;">
                                    Mark as read
                                </button>
                            ` : ""}
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    function formatTimeAgo(dateStr) {
        if (!dateStr) return "Recent";
        const diffMs = Date.now() - new Date(dateStr).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} minutes ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;
        return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    }

    window.markNotifRead = function (id) {
        if (typeof notificationService !== "undefined") {
            notificationService.markAsRead(id);
            renderNotificationsPage();
        }
    };

    window.markAllRead = function () {
        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001", id: "USR-CIT-001" };
        const userId = citizen.userId || citizen.id || "USR-CIT-001";
        if (typeof notificationService !== "undefined") {
            notificationService.markAllAsRead(userId);
            showToast("All notifications marked as read.", "success");
            renderNotificationsPage();
            const bell = document.querySelector(".has-badge");
            if (bell) bell.classList.remove("has-badge");
        }
    };

    window.filterNotifs = function (cat, btn) {
        if (btn && btn.parentElement) {
            btn.parentElement.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
        }

        const cards = document.querySelectorAll(".notif-card");
        cards.forEach(card => {
            const matchesCat = cat === "all" || 
                (cat === "unread" && card.dataset.status === "unread") ||
                (card.dataset.category === cat);
            card.style.display = matchesCat ? "flex" : "none";
        });
    };

    document.addEventListener("DOMContentLoaded", renderNotificationsPage);
    window.addEventListener("ekabadi:statechange", renderNotificationsPage);
})();
