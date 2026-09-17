/* ============================================================
   E-KABADI COMMAND CENTER
   Shared UI Components
   File: js/components.js
   ============================================================ */

(function () {
    "use strict";

    /* ---------------------------------------------------------
       ICON SYSTEM
       --------------------------------------------------------- */

    const ICONS = {
        dashboard: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>`,

        users: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>`,

        collector: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 17h11V5H3z"/>
                <path d="M14 9h4l3 3v5h-7z"/>
                <circle cx="7" cy="18" r="2"/>
                <circle cx="18" cy="18" r="2"/>
                <path d="M14 13h7"/>
            </svg>`,

        pickup: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 17h2"/>
                <path d="M7 17h10"/>
                <path d="M19 17h2"/>
                <path d="M5 17V9l3-4h8l3 4v8"/>
                <path d="M8 9h8"/>
                <circle cx="7" cy="17" r="2"/>
                <circle cx="17" cy="17" r="2"/>
            </svg>`,

        recycle: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m7 7 3-4 3 4"/>
                <path d="M10 3v7"/>
                <path d="M17 10h5l-3 5"/>
                <path d="m22 10-6-1"/>
                <path d="m7 17-4 4"/>
                <path d="m3 21 2-6"/>
                <path d="M7 17h7a4 4 0 0 0 3-7"/>
                <path d="M10 10a4 4 0 0 0-3 7"/>
            </svg>`,

        wallet: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7h17a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14"/>
                <path d="M17 14h5"/>
                <circle cx="17" cy="14" r="1"/>
            </svg>`,

        gift: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="8" width="18" height="13" rx="1"/>
                <path d="M12 8v13"/>
                <path d="M3 12h18"/>
                <path d="M12 8H8.5a2.5 2.5 0 1 1 2.5-2.5V8Z"/>
                <path d="M12 8h3.5A2.5 2.5 0 1 0 13 5.5V8Z"/>
            </svg>`,

        chart: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19V5"/>
                <path d="M4 19h17"/>
                <path d="m7 15 4-4 3 2 5-6"/>
                <path d="M19 7v4h-4"/>
            </svg>`,

        alert: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.3 3.5 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z"/>
                <path d="M12 9v4"/>
                <path d="M12 17h.01"/>
            </svg>`,

        settings: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.8 1.8-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20h-2.55v-.11a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-1.8-1.8.06-.06A1.7 1.7 0 0 0 8.2 15a1.7 1.7 0 0 0-1.55-1H6.5v-2.55h.11a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.8-1.8.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1-1.55V5h2.55v.11a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.8 1.8-.06.06A1.7 1.7 0 0 0 19.8 10c.16.58.69 1 1.29 1h.11v2.55h-.11A1.7 1.7 0 0 0 19.4 15Z"/>
            </svg>`,

        search: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="7"/>
                <path d="m20 20-4-4"/>
            </svg>`,

        bell: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
                <path d="M10 21h4"/>
            </svg>`,

        menu: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round">
                <path d="M4 6h16"/>
                <path d="M4 12h16"/>
                <path d="M4 18h16"/>
            </svg>`,

        close: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round">
                <path d="m6 6 12 12"/>
                <path d="m18 6-12 12"/>
            </svg>`,

        chevron: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"/>
            </svg>`,

        logout: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <path d="m16 17 5-5-5-5"/>
                <path d="M21 12H9"/>
            </svg>`,

        user: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 21a8 8 0 0 1 16 0"/>
            </svg>`,

        help: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.75c-.9.85-1.8 1.25-1.8 2.75"/>
                <path d="M12 17h.01"/>
            </svg>`,

        leaf: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 4C10 4 4 9 4 16c0 2.2 1.8 4 4 4 7 0 12-6 12-16Z"/>
                <path d="M4 20c2-5 6-8 11-10"/>
            </svg>`,

        arrow: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"/>
                <path d="m13 6 6 6-6 6"/>
            </svg>`
    };

    function icon(name, className = "") {
        return `<span class="icon ${className}">${ICONS[name] || ""}</span>`;
    }


    /* ---------------------------------------------------------
       PAGE CONFIG
       --------------------------------------------------------- */

    const PAGE_CONFIG = {
        "dashboard.html": {
            title: "Dashboard",
            section: "Overview"
        },

        "citizens.html": {
            title: "Citizens",
            section: "Management"
        },

        "collectors.html": {
            title: "Collectors",
            section: "Management"
        },

        "pickups.html": {
            title: "Pickup Operations",
            section: "Operations"
        },

        "scrap.html": {
            title: "Scrap & Rates",
            section: "Operations"
        },

        "payments.html": {
            title: "Payments",
            section: "Operations"
        },

        "rewards.html": {
            title: "Rewards",
            section: "Engagement"
        },

        "analytics.html": {
            title: "Analytics",
            section: "Intelligence"
        },

        "issues.html": {
            title: "Issues & Support",
            section: "Intelligence"
        },

        "settings.html": {
            title: "Settings",
            section: "System"
        }
    };


    /* ---------------------------------------------------------
       NAVIGATION
       --------------------------------------------------------- */

    const NAVIGATION = [
        {
            section: "Overview",
            items: [
                {
                    href: "dashboard.html",
                    label: "Dashboard",
                    icon: "dashboard"
                }
            ]
        },

        {
            section: "Management",
            items: [
                {
                    href: "citizens.html",
                    label: "Citizens",
                    icon: "users"
                },
                {
                    href: "collectors.html",
                    label: "Collectors",
                    icon: "collector"
                }
            ]
        },

        {
            section: "Operations",
            items: [
                {
                    href: "pickups.html",
                    label: "Pickups",
                    icon: "pickup"
                },
                {
                    href: "scrap.html",
                    label: "Scrap & Rates",
                    icon: "recycle"
                },
                {
                    href: "payments.html",
                    label: "Payments",
                    icon: "wallet"
                }
            ]
        },

        {
            section: "Engagement",
            items: [
                {
                    href: "rewards.html",
                    label: "Rewards",
                    icon: "gift"
                }
            ]
        },

        {
            section: "Intelligence",
            items: [
                {
                    href: "analytics.html",
                    label: "Analytics",
                    icon: "chart"
                },
                {
                    href: "issues.html",
                    label: "Issues",
                    icon: "alert"
                }
            ]
        },

        {
            section: "System",
            items: [
                {
                    href: "settings.html",
                    label: "Settings",
                    icon: "settings"
                }
            ]
        }
    ];


    /* ---------------------------------------------------------
       CURRENT PAGE
       --------------------------------------------------------- */

    function getCurrentPage() {
        let page = window.location.pathname.split("/").pop();

        if (!page || page === "/") {
            page = "dashboard.html";
        }

        return page;
    }


    function getPageConfig() {
        return PAGE_CONFIG[getCurrentPage()] || {
            title: "E-Kabadi",
            section: "Command Center"
        };
    }


    /* ---------------------------------------------------------
       SIDEBAR
       --------------------------------------------------------- */

    function renderSidebar() {
        const container = document.getElementById("appSidebar");

        if (!container) return;

        const currentPage = getCurrentPage();

        let navHTML = "";

        NAVIGATION.forEach(group => {
            navHTML += `
                <div class="nav-section">
                    <div class="nav-section-title">
                        ${group.section}
                    </div>
            `;

            group.items.forEach(item => {
                const active = currentPage === item.href ? "active" : "";

                navHTML += `
                    <a href="${item.href}"
                       class="nav-link ${active}"
                       data-page="${item.href}">
                        ${icon(item.icon, "nav-icon")}
                        <span>${item.label}</span>
                    </a>
                `;
            });

            navHTML += `</div>`;
        });

        container.innerHTML = `
            <aside class="sidebar" id="mainSidebar">

                <div class="sidebar-brand">

                    <a href="dashboard.html" class="brand-link">

                        <div class="brand-logo">
                            ${icon("leaf")}
                        </div>

                        <div class="brand-text">
                            <strong>E-Kabadi</strong>
                            <span>Command Center</span>
                        </div>

                    </a>

                    <button
                        class="sidebar-close"
                        id="sidebarClose"
                        aria-label="Close menu">
                        ${icon("close")}
                    </button>

                </div>


                <div class="sidebar-status">

                    <span class="status-dot"></span>

                    <div>
                        <strong>System Online</strong>
                        <small>All services operational</small>
                    </div>

                </div>


                <nav class="sidebar-nav">
                    ${navHTML}
                </nav>


                <div class="sidebar-footer">

                    <div class="sidebar-help">

                        <div class="help-icon">
                            ${icon("help")}
                        </div>

                        <div>
                            <strong>Need help?</strong>
                            <span>Check system issues</span>
                        </div>

                    </div>

                    <button
                        class="sidebar-logout"
                        id="sidebarLogout">
                        ${icon("logout")}
                        <span>Sign out</span>
                    </button>

                    <div class="sidebar-version">
                        E-Kabadi v1.0.0 · Prototype
                    </div>

                </div>

            </aside>

            <div class="sidebar-overlay" id="sidebarOverlay"></div>
        `;

        bindSidebarEvents();
    }


    /* ---------------------------------------------------------
       TOPBAR
       --------------------------------------------------------- */

    function renderTopbar() {
        const container = document.getElementById("appTopbar");

        if (!container) return;

        const page = getPageConfig();

        const admin = typeof getCurrentAdmin === "function"
            ? getCurrentAdmin()
            : {
                name: "Admin",
                role: "Super Admin",
                avatar: "A"
            };

        const adminName = admin?.name || "Admin";
        const adminRole = admin?.role || "Super Admin";
        const adminAvatar = admin?.avatar || getInitials(adminName);

        const unreadCount =
            typeof getUnreadNotificationCount === "function"
                ? getUnreadNotificationCount()
                : 0;

        container.innerHTML = `

            <header class="topbar">

                <div class="topbar-left">

                    <button
                        class="mobile-menu-btn"
                        id="mobileMenuBtn"
                        aria-label="Open menu">
                        ${icon("menu")}
                    </button>

                    <div class="page-heading">

                        <div class="breadcrumb">
                            <span>Command Center</span>
                            <span class="breadcrumb-separator">/</span>
                            <strong>${page.title}</strong>
                        </div>

                        <h1>${page.title}</h1>

                    </div>

                </div>


                <div class="topbar-right">

                    <div class="global-search">

                        ${icon("search")}

                        <input
                            type="text"
                            id="globalSearch"
                            placeholder="Search anything..."
                            autocomplete="off"
                        />

                        <kbd>⌘ K</kbd>

                    </div>


                    <div class="notification-wrapper">

                        <button
                            class="topbar-icon-btn"
                            id="notificationBtn"
                            aria-label="Notifications">

                            ${icon("bell")}

                            ${
                                unreadCount > 0
                                    ? `<span class="notification-count">
                                        ${unreadCount > 9 ? "9+" : unreadCount}
                                       </span>`
                                    : ""
                            }

                        </button>

                        <div
                            class="notification-dropdown"
                            id="notificationDropdown">
                        </div>

                    </div>


                    <div class="topbar-divider"></div>


                    <div class="user-menu-wrapper">

                        <button
                            class="user-menu-btn"
                            id="userMenuBtn">

                            <div class="user-avatar">
                                ${adminAvatar}
                            </div>

                            <div class="user-info">

                                <strong>${adminName}</strong>

                                <span>${adminRole}</span>

                            </div>

                            ${icon("chevron", "user-chevron")}

                        </button>


                        <div
                            class="user-dropdown"
                            id="userDropdown">

                            <div class="user-dropdown-header">

                                <div class="user-avatar large">
                                    ${adminAvatar}
                                </div>

                                <div>
                                    <strong>${adminName}</strong>
                                    <span>${adminRole}</span>
                                </div>

                            </div>

                            <div class="dropdown-divider"></div>

                            <a href="settings.html">
                                ${icon("settings")}
                                <span>Settings</span>
                            </a>

                            <a href="issues.html">
                                ${icon("help")}
                                <span>Help & Support</span>
                            </a>

                            <div class="dropdown-divider"></div>

                            <button id="topbarLogout" class="danger">
                                ${icon("logout")}
                                <span>Sign out</span>
                            </button>

                        </div>

                    </div>

                </div>

            </header>
        `;

        renderNotifications();
        bindTopbarEvents();
    }


    /* ---------------------------------------------------------
       NOTIFICATIONS
       --------------------------------------------------------- */

    function renderNotifications() {
        const dropdown = document.getElementById("notificationDropdown");

        if (!dropdown) return;

        let notifications = [];

        if (typeof storageGetNotifications === "function") {
            notifications = storageGetNotifications();
        }

        notifications = notifications
            .sort((a, b) => {
                return new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0);
            })
            .slice(0, 6);

        let notificationHTML = "";

        if (!notifications.length) {

            notificationHTML = `
                <div class="notification-empty">
                    <div class="empty-icon">
                        ${icon("bell")}
                    </div>
                    <strong>No notifications</strong>
                    <span>You're all caught up.</span>
                </div>
            `;

        } else {

            notificationHTML = notifications.map(notification => {

                const isRead = notification.read ? "read" : "unread";

                return `
                    <button
                        class="notification-item ${isRead}"
                        data-notification-id="${notification.id}">

                        <div class="notification-icon ${notification.type || "info"}">
                            ${getNotificationIcon(notification.type)}
                        </div>

                        <div class="notification-content">

                            <strong>
                                ${escapeHTML(notification.title || "Notification")}
                            </strong>

                            <span>
                                ${escapeHTML(notification.message || "")}
                            </span>

                            <small>
                                ${formatNotificationTime(notification.createdAt)}
                            </small>

                        </div>

                    </button>
                `;

            }).join("");
        }

        dropdown.innerHTML = `

            <div class="notification-header">

                <div>
                    <strong>Notifications</strong>
                    <span>
                        ${getUnreadCount(notifications)} unread
                    </span>
                </div>

                <button id="markAllNotificationsRead">
                    Mark all read
                </button>

            </div>

            <div class="notification-list">
                ${notificationHTML}
            </div>

            <a href="issues.html" class="notification-footer">
                View all activity
                ${icon("arrow")}
            </a>
        `;

        bindNotificationEvents();
    }


    function getNotificationIcon(type) {

        switch (type) {

            case "pickup":
                return icon("pickup");

            case "collector":
            case "verification":
                return icon("collector");

            case "payment":
                return icon("wallet");

            case "success":
                return icon("leaf");

            case "issue":
                return icon("alert");

            default:
                return icon("bell");
        }
    }


    function getUnreadCount(notifications) {

        return notifications.filter(n => !n.read).length;
    }


    function formatNotificationTime(dateValue) {

        if (!dateValue) return "Recently";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Recently";
        }

        const now = new Date();

        const diff = Math.floor(
            (now.getTime() - date.getTime()) / 1000
        );

        if (diff < 60) return "Just now";

        if (diff < 3600) {
            return `${Math.floor(diff / 60)}m ago`;
        }

        if (diff < 86400) {
            return `${Math.floor(diff / 3600)}h ago`;
        }

        if (diff < 604800) {
            return `${Math.floor(diff / 86400)}d ago`;
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short"
        });
    }


    /* ---------------------------------------------------------
       EVENTS — SIDEBAR
       --------------------------------------------------------- */

    function bindSidebarEvents() {

        const mobileMenuBtn =
            document.getElementById("mobileMenuBtn");

        const sidebarClose =
            document.getElementById("sidebarClose");

        const overlay =
            document.getElementById("sidebarOverlay");

        const sidebarLogout =
            document.getElementById("sidebarLogout");


        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener(
                "click",
                openMobileSidebar
            );
        }

        if (sidebarClose) {
            sidebarClose.addEventListener(
                "click",
                closeMobileSidebar
            );
        }

        if (overlay) {
            overlay.addEventListener(
                "click",
                closeMobileSidebar
            );
        }

        if (sidebarLogout) {
            sidebarLogout.addEventListener(
                "click",
                handleLogout
            );
        }


        document
            .querySelectorAll(".nav-link")
            .forEach(link => {

                link.addEventListener("click", () => {
                    closeMobileSidebar();
                });

            });
    }


    function openMobileSidebar() {

        const sidebar =
            document.getElementById("mainSidebar");

        const overlay =
            document.getElementById("sidebarOverlay");

        if (sidebar) {
            sidebar.classList.add("mobile-open");
        }

        if (overlay) {
            overlay.classList.add("active");
        }

        document.body.classList.add("menu-open");
    }


    function closeMobileSidebar() {

        const sidebar =
            document.getElementById("mainSidebar");

        const overlay =
            document.getElementById("sidebarOverlay");

        if (sidebar) {
            sidebar.classList.remove("mobile-open");
        }

        if (overlay) {
            overlay.classList.remove("active");
        }

        document.body.classList.remove("menu-open");
    }


    /* ---------------------------------------------------------
       EVENTS — TOPBAR
       --------------------------------------------------------- */

    function bindTopbarEvents() {

        const notificationBtn =
            document.getElementById("notificationBtn");

        const notificationDropdown =
            document.getElementById("notificationDropdown");

        const userMenuBtn =
            document.getElementById("userMenuBtn");

        const userDropdown =
            document.getElementById("userDropdown");

        const topbarLogout =
            document.getElementById("topbarLogout");

        const globalSearch =
            document.getElementById("globalSearch");


        if (notificationBtn) {

            notificationBtn.addEventListener("click", event => {

                event.stopPropagation();

                closeUserDropdown();

                if (notificationDropdown) {
                    notificationDropdown.classList.toggle("show");
                }

            });
        }


        if (userMenuBtn) {

            userMenuBtn.addEventListener("click", event => {

                event.stopPropagation();

                closeNotificationDropdown();

                if (userDropdown) {
                    userDropdown.classList.toggle("show");
                }

            });
        }


        if (topbarLogout) {
            topbarLogout.addEventListener(
                "click",
                handleLogout
            );
        }


        if (globalSearch) {

            globalSearch.addEventListener(
                "keydown",
                handleGlobalSearch
            );

        }
    }


    function bindNotificationEvents() {

        const markAll =
            document.getElementById("markAllNotificationsRead");

        if (markAll) {

            markAll.addEventListener("click", () => {

                if (typeof markAllNotificationsRead === "function") {
                    markAllNotificationsRead();
                }

                renderTopbar();

                showToast(
                    "All notifications marked as read.",
                    "success",
                    "Notifications"
                );

            });
        }


        document
            .querySelectorAll(".notification-item")
            .forEach(item => {

                item.addEventListener("click", () => {

                    const id =
                        item.dataset.notificationId;

                    if (
                        id &&
                        typeof markNotificationRead === "function"
                    ) {
                        markNotificationRead(id);
                    }

                    renderTopbar();

                });

            });
    }


    function closeNotificationDropdown() {

        const dropdown =
            document.getElementById("notificationDropdown");

        if (dropdown) {
            dropdown.classList.remove("show");
        }
    }


    function closeUserDropdown() {

        const dropdown =
            document.getElementById("userDropdown");

        if (dropdown) {
            dropdown.classList.remove("show");
        }
    }


    /* ---------------------------------------------------------
       GLOBAL CLICK HANDLER
       --------------------------------------------------------- */

    document.addEventListener("click", event => {

        const notificationWrapper =
            document.querySelector(".notification-wrapper");

        const userWrapper =
            document.querySelector(".user-menu-wrapper");

        if (
            notificationWrapper &&
            !notificationWrapper.contains(event.target)
        ) {
            closeNotificationDropdown();
        }

        if (
            userWrapper &&
            !userWrapper.contains(event.target)
        ) {
            closeUserDropdown();
        }

    });


    /* ---------------------------------------------------------
       GLOBAL SEARCH
       --------------------------------------------------------- */

    function handleGlobalSearch(event) {

        if (event.key !== "Enter") return;

        const query =
            event.target.value.trim();

        if (!query) return;

        const normalized =
            query.toLowerCase();

        const routes = [

            {
                keywords: ["dashboard", "home", "overview"],
                page: "dashboard.html"
            },

            {
                keywords: ["citizen", "citizens", "user", "users"],
                page: "citizens.html"
            },

            {
                keywords: ["collector", "collectors", "driver"],
                page: "collectors.html"
            },

            {
                keywords: ["pickup", "pickups", "booking"],
                page: "pickups.html"
            },

            {
                keywords: ["scrap", "material", "rate", "price"],
                page: "scrap.html"
            },

            {
                keywords: ["payment", "payments", "money", "transaction"],
                page: "payments.html"
            },

            {
                keywords: ["reward", "rewards", "coin", "coins"],
                page: "rewards.html"
            },

            {
                keywords: ["analytics", "stats", "statistics", "report"],
                page: "analytics.html"
            },

            {
                keywords: ["issue", "issues", "support", "complaint"],
                page: "issues.html"
            },

            {
                keywords: ["setting", "settings", "configuration"],
                page: "settings.html"
            }
        ];


        const match = routes.find(route =>
            route.keywords.some(keyword =>
                normalized.includes(keyword)
            )
        );


        if (match) {

            window.location.href = match.page;

        } else {

            showToast(
                `No section found for "${query}".`,
                "info",
                "Search"
            );

        }
    }


    /* ---------------------------------------------------------
       LOGOUT
       --------------------------------------------------------- */

    function handleLogout(event) {

        if (event) {
            event.preventDefault();
        }

        const confirmed = window.confirm(
            "Are you sure you want to sign out?"
        );

        if (!confirmed) return;

        if (typeof logoutAdmin === "function") {
            logoutAdmin();
        } else {

            try {

                if (typeof clearAdminSession === "function") {
                    clearAdminSession();
                } else {
                    localStorage.removeItem(
                        "ekabadi_admin_session"
                    );
                }

            } catch (error) {
                console.error("Logout error:", error);
            }

            window.location.href = "index.html";
        }
    }


    /* ---------------------------------------------------------
       TOAST SYSTEM
       --------------------------------------------------------- */

    function ensureToastRoot() {

        let root =
            document.getElementById("toastRoot");

        if (!root) {

            root = document.createElement("div");

            root.id = "toastRoot";

            root.className = "toast-container";

            document.body.appendChild(root);
        }

        return root;
    }


    function showToast(
        message,
        type = "info",
        title = ""
    ) {

        const root = ensureToastRoot();

        const toast =
            document.createElement("div");

        toast.className =
            `toast toast-${type}`;


        const iconName =
            type === "success"
                ? "leaf"
                : type === "error"
                    ? "alert"
                    : type === "warning"
                        ? "alert"
                        : "bell";


        toast.innerHTML = `

            <div class="toast-icon">
                ${icon(iconName)}
            </div>

            <div class="toast-content">

                ${
                    title
                        ? `<strong>${escapeHTML(title)}</strong>`
                        : ""
                }

                <span>
                    ${escapeHTML(message)}
                </span>

            </div>

            <button class="toast-close" aria-label="Close">
                ${icon("close")}
            </button>

        `;


        root.appendChild(toast);


        requestAnimationFrame(() => {
            toast.classList.add("show");
        });


        const close =
            toast.querySelector(".toast-close");

        if (close) {
            close.addEventListener(
                "click",
                () => removeToast(toast)
            );
        }


        const timeout =
            setTimeout(() => {
                removeToast(toast);
            }, 4500);


        toast.dataset.timeout = timeout;
    }


    function removeToast(toast) {

        if (!toast) return;

        toast.classList.remove("show");

        setTimeout(() => {

            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }

        }, 250);
    }


    /* ---------------------------------------------------------
       MODAL SYSTEM
       --------------------------------------------------------- */

    function ensureModalRoot() {

        let root =
            document.getElementById("modalRoot");

        if (!root) {

            root = document.createElement("div");

            root.id = "modalRoot";

            document.body.appendChild(root);
        }

        return root;
    }


    function openModal(options = {}) {

        const root = ensureModalRoot();

        const title =
            options.title || "Modal";

        const content =
            options.content || "";

        const size =
            options.size || "medium";

        const showClose =
            options.showClose !== false;


        root.innerHTML = `

            <div class="modal-backdrop" id="modalBackdrop">

                <div
                    class="modal modal-${size}"
                    role="dialog"
                    aria-modal="true">

                    <div class="modal-header">

                        <div>
                            ${
                                options.eyebrow
                                    ? `<span class="modal-eyebrow">
                                        ${escapeHTML(options.eyebrow)}
                                       </span>`
                                    : ""
                            }

                            <h2>
                                ${escapeHTML(title)}
                            </h2>

                            ${
                                options.description
                                    ? `<p>
                                        ${escapeHTML(options.description)}
                                       </p>`
                                    : ""
                            }
                        </div>

                        ${
                            showClose
                                ? `<button
                                    class="modal-close"
                                    id="modalClose">
                                    ${icon("close")}
                                   </button>`
                                : ""
                        }

                    </div>


                    <div class="modal-body">
                        ${content}
                    </div>


                    ${
                        options.footer
                            ? `<div class="modal-footer">
                                ${options.footer}
                               </div>`
                            : ""
                    }

                </div>

            </div>
        `;


        const backdrop =
            document.getElementById("modalBackdrop");

        root.classList.add("active");

        document.body.classList.add("modal-open");


        requestAnimationFrame(() => {

            if (backdrop) {
                backdrop.classList.add("show");
            }

        });


        const closeButton =
            document.getElementById("modalClose");

        if (closeButton) {
            closeButton.addEventListener(
                "click",
                closeModal
            );
        }


        if (options.closeOnBackdrop !== false) {

            if (backdrop) {

                backdrop.addEventListener("click", event => {

                    if (event.target === backdrop) {
                        closeModal();
                    }

                });

            }
        }


        document.addEventListener(
            "keydown",
            handleModalEscape
        );


        if (typeof options.onOpen === "function") {
            options.onOpen();
        }
    }


    function closeModal() {

        const root =
            document.getElementById("modalRoot");

        const backdrop =
            document.getElementById("modalBackdrop");

        if (!root) return;

        if (backdrop) {
            backdrop.classList.remove("show");
        }

        setTimeout(() => {

            root.innerHTML = "";

            root.classList.remove("active");

            document.body.classList.remove("modal-open");

        }, 200);


        document.removeEventListener(
            "keydown",
            handleModalEscape
        );
    }


    function handleModalEscape(event) {

        if (event.key === "Escape") {
            closeModal();
        }
    }


    /* ---------------------------------------------------------
       CONFIRMATION MODAL
       --------------------------------------------------------- */

    function confirmAction(options = {}) {

        return new Promise(resolve => {

            const title =
                options.title || "Are you sure?";

            const message =
                options.message ||
                "This action cannot be undone.";

            const confirmText =
                options.confirmText || "Confirm";

            const cancelText =
                options.cancelText || "Cancel";

            const danger =
                options.danger !== false;


            openModal({

                title,
                description: message,

                size: "small",

                content: `

                    <div class="confirm-modal-content">

                        <div class="
                            confirm-icon
                            ${danger ? "danger" : "warning"}
                        ">
                            ${icon(danger ? "alert" : "help")}
                        </div>

                        <p>
                            ${escapeHTML(message)}
                        </p>

                    </div>
                `,

                footer: `

                    <button
                        class="btn btn-secondary"
                        id="cancelModalAction">
                        ${escapeHTML(cancelText)}
                    </button>

                    <button
                        class="btn ${danger ? "btn-danger" : "btn-primary"}"
                        id="confirmModalAction">
                        ${escapeHTML(confirmText)}
                    </button>
                `,

                onOpen: () => {

                    const confirmBtn =
                        document.getElementById(
                            "confirmModalAction"
                        );

                    const cancelBtn =
                        document.getElementById(
                            "cancelModalAction"
                        );


                    if (confirmBtn) {

                        confirmBtn.addEventListener(
                            "click",
                            () => {

                                closeModal();

                                resolve(true);

                            }
                        );

                    }


                    if (cancelBtn) {

                        cancelBtn.addEventListener(
                            "click",
                            () => {

                                closeModal();

                                resolve(false);

                            }
                        );

                    }

                }
            });

        });
    }


    /* ---------------------------------------------------------
       EMPTY STATE
       --------------------------------------------------------- */

    function renderEmptyState(options = {}) {

        const title =
            options.title || "Nothing here yet";

        const message =
            options.message ||
            "There is no data to display.";

        const iconName =
            options.icon || "recycle";

        const action =
            options.action || "";


        return `

            <div class="empty-state">

                <div class="empty-state-icon">
                    ${icon(iconName)}
                </div>

                <h3>
                    ${escapeHTML(title)}
                </h3>

                <p>
                    ${escapeHTML(message)}
                </p>

                ${action}

            </div>
        `;
    }


    /* ---------------------------------------------------------
       STATUS BADGE
       --------------------------------------------------------- */

    function statusBadge(status, label = null) {

        const normalized =
            String(status || "unknown")
                .toLowerCase()
                .replace(/\s+/g, "_");


        const displayLabel =
            label ||
            String(status || "Unknown")
                .replace(/_/g, " ")
                .replace(/\b\w/g, char =>
                    char.toUpperCase()
                );


        return `
            <span class="status-badge status-${normalized}">
                <span class="status-dot"></span>
                ${escapeHTML(displayLabel)}
            </span>
        `;
    }


    /* ---------------------------------------------------------
       AVATAR
       --------------------------------------------------------- */

    function avatar(name, image = null, size = "") {

        const initials =
            getInitials(name);


        if (image) {

            return `
                <div class="avatar ${size}">
                    <img
                        src="${escapeAttribute(image)}"
                        alt="${escapeAttribute(name)}"
                        onerror="this.style.display='none'; this.parentElement.classList.add('avatar-fallback');"
                    />
                    <span>${initials}</span>
                </div>
            `;
        }


        return `
            <div class="avatar ${size}">
                ${initials}
            </div>
        `;
    }


    function getInitials(name) {

        if (!name) return "A";

        const words =
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean);

        if (words.length === 1) {
            return words[0]
                .substring(0, 2)
                .toUpperCase();
        }

        return (
            words[0][0] +
            words[words.length - 1][0]
        ).toUpperCase();
    }


    /* ---------------------------------------------------------
       PAGINATION
       --------------------------------------------------------- */

    function renderPagination(
        currentPage,
        totalPages,
        onPageChange
    ) {

        if (totalPages <= 1) return "";


        let html = `
            <div class="pagination">
        `;


        html += `
            <button
                class="pagination-btn"
                data-page="${currentPage - 1}"
                ${currentPage <= 1 ? "disabled" : ""}>
                ←
            </button>
        `;


        const pages = [];


        if (totalPages <= 7) {

            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }

        } else {

            pages.push(1);

            if (currentPage > 4) {
                pages.push("...");
            }

            const start =
                Math.max(2, currentPage - 1);

            const end =
                Math.min(
                    totalPages - 1,
                    currentPage + 1
                );

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 3) {
                pages.push("...");
            }

            pages.push(totalPages);
        }


        pages.forEach(page => {

            if (page === "...") {

                html += `
                    <span class="pagination-ellipsis">
                        ...
                    </span>
                `;

            } else {

                html += `
                    <button
                        class="
                            pagination-btn
                            ${page === currentPage ? "active" : ""}
                        "
                        data-page="${page}">
                        ${page}
                    </button>
                `;
            }

        });


        html += `
            <button
                class="pagination-btn"
                data-page="${currentPage + 1}"
                ${currentPage >= totalPages ? "disabled" : ""}>
                →
            </button>
        `;


        html += `</div>`;


        return html;
    }


    /* ---------------------------------------------------------
       UTILITY HELPERS
       --------------------------------------------------------- */

    function escapeHTML(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function escapeAttribute(value) {
        return escapeHTML(value);
    }


    function debounce(fn, delay = 300) {

        let timeout;

        return function (...args) {

            clearTimeout(timeout);

            timeout = setTimeout(() => {
                fn.apply(this, args);
            }, delay);

        };
    }


    function throttle(fn, limit = 100) {

        let waiting = false;

        return function (...args) {

            if (waiting) return;

            fn.apply(this, args);

            waiting = true;

            setTimeout(() => {
                waiting = false;
            }, limit);

        };
    }


    /* ---------------------------------------------------------
       GLOBAL KEYBOARD SHORTCUTS
       --------------------------------------------------------- */

    document.addEventListener("keydown", event => {

        // Cmd/Ctrl + K → global search

        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "k"
        ) {

            event.preventDefault();

            const search =
                document.getElementById("globalSearch");

            if (search) {
                search.focus();
                search.select();
            }

        }


        // Escape → close menus

        if (event.key === "Escape") {

            closeNotificationDropdown();
            closeUserDropdown();

            closeMobileSidebar();

        }

    });


    /* ---------------------------------------------------------
       APP SHELL INITIALIZATION
       --------------------------------------------------------- */

    function initializeComponents() {

        renderSidebar();

        renderTopbar();

        ensureToastRoot();

        ensureModalRoot();

        // Small delay lets CSS/layout settle before animations.

        setTimeout(() => {

            document.body.classList.add(
                "app-ready"
            );

        }, 50);
    }


    /* ---------------------------------------------------------
       GLOBAL API
       --------------------------------------------------------- */

    window.EKABADI_COMPONENTS = {

        icon,

        renderSidebar,
        renderTopbar,
        renderNotifications,

        showToast,
        removeToast,

        openModal,
        closeModal,
        confirmAction,

        renderEmptyState,
        statusBadge,
        avatar,

        renderPagination,

        getInitials,
        escapeHTML,
        escapeAttribute,

        debounce,
        throttle,

        openMobileSidebar,
        closeMobileSidebar
    };


    // Make frequently used helpers globally accessible.

    window.icon = icon;
    window.showToast = showToast;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.confirmAction = confirmAction;
    window.renderEmptyState = renderEmptyState;
    window.statusBadge = statusBadge;
    window.avatar = avatar;
    window.renderPagination = renderPagination;
    window.getInitials = getInitials;
    window.escapeHTML = escapeHTML;
    window.debounce = debounce;
    window.throttle = throttle;


    /* ---------------------------------------------------------
       START
       --------------------------------------------------------- */

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initializeComponents
        );

    } else {

        initializeComponents();

    }

})();