/* =========================================================
   E-KABAADI — Citizen Portal Shared Architecture & Navigation
   File: citizen/js/citizen-app.js
   ========================================================= */

(function () {
    "use strict";

    /* ── Guard Citizen Route ── */
    if (typeof EKABADI_ROUTER !== "undefined" && typeof EKABADI_ROUTER.requireRole === "function") {
        if (!EKABADI_ROUTER.requireRole("citizen")) {
            return;
        }
    } else if (typeof requireRole === "function") {
        if (!requireRole("citizen")) {
            return;
        }
    }

    function getCitizenData() {
        if (typeof authService !== "undefined") {
            const user = authService.getCurrentUser();
            if (user) {
                if (typeof citizenService !== "undefined" && user.citizenId) {
                    const prof = citizenService.getProfile(user.citizenId);
                    if (prof) return { ...user, ...prof };
                }
                return user;
            }
        }
        if (typeof citizenService !== "undefined") {
            const prof = citizenService.getProfile("CIT-1001");
            if (prof) return prof;
        }
        return {
            id: "USR-CIT-001",
            citizenId: "CIT-1001",
            name: "Aarav Sharma",
            email: "citizen@ekabadi.demo",
            phone: "+91 98765 43210",
            avatar: "AS",
            ecoCoins: 860,
            location: { address: "Sector 62, Noida", city: "Noida", pin: "201309" }
        };
    }

    let citizen = getCitizenData();
    window.currentCitizen = citizen;

    window.addEventListener("ekabadi:statechange", function () {
        citizen = getCitizenData();
        window.currentCitizen = citizen;
        const pill = document.querySelector(".eco-pill span:last-child");
        if (pill) pill.textContent = `${citizen.ecoCoins || 0} Coins`;
    });

    /* ── Navigation Structure ── */
    const NAV_ITEMS = [
        {
            group: "Overview",
            links: [
                { href: "dashboard.html", label: "Dashboard", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>` }
            ]
        },
        {
            group: "Scrap & Pickup",
            links: [
                { href: "sell-scrap.html", label: "Sell Scrap & AI Estimate", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 7 3-4 3 4M10 3v7M17 10h5l-3 5M22 10l-6-1M7 17l-4 4M3 21l2-6M7 17h7a4 4 0 0 0 3-7M10 10a4 4 0 0 0-3 7"/></svg>` },
                { href: "collectors.html", label: "Nearby Collectors", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
                { href: "pickup.html", label: "Book Pickup", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
                { href: "tracking.html", label: "Live Tracking", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`, badge: "Live" },
                { href: "history.html", label: "Pickup History", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>` }
            ]
        },
        {
            group: "Wallet & Benefits",
            links: [
                { href: "payments.html", label: "Payments & Receipts", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>` },
                { href: "rewards.html", label: "Eco Coins & Rewards", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>` }
            ]
        },
        {
            group: "Account & Support",
            links: [
                { href: "notifications.html", label: "Notifications", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`, badge: "3" },
                { href: "support.html", label: "Help & Disputes", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
                { href: "profile.html", label: "Profile Settings", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` }
            ]
        }
    ];

    /* ── Render Sidebar ── */
    function renderSidebar() {
        const sidebarContainer = document.getElementById("citizenSidebar");
        if (!sidebarContainer) return;

        const currentPath = window.location.pathname.split("/").pop() || "dashboard.html";

        let navHtml = "";
        NAV_ITEMS.forEach(group => {
            navHtml += `<div class="nav-group"><div class="nav-group-title">${group.group}</div>`;
            group.links.forEach(link => {
                const isActive = currentPath === link.href;
                navHtml += `
                    <a href="${link.href}" class="nav-item ${isActive ? "active" : ""}">
                        ${link.icon}
                        <span>${link.label}</span>
                        ${link.badge ? `<span class="nav-badge">${link.badge}</span>` : ""}
                    </a>
                `;
            });
            navHtml += `</div>`;
        });

        sidebarContainer.className = "citizen-sidebar";
        sidebarContainer.innerHTML = `
            <div class="sidebar-brand">
                <a href="../public/index.html" style="display:flex;align-items:center;gap:10px;">
                    <div class="sidebar-logo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 7 3-4 3 4M10 3v7M17 10h5l-3 5M22 10l-6-1M7 17l-4 4M3 21l2-6M7 17h7a4 4 0 0 0 3-7M10 10a4 4 0 0 0-3 7"/></svg>
                    </div>
                    <span>E-Kabaadi</span>
                </a>
                <span class="sidebar-role-badge">Citizen</span>
            </div>

            <nav class="sidebar-nav">
                ${navHtml}
            </nav>

            <div class="sidebar-user">
                <div class="sidebar-avatar">${citizen.avatar || "AS"}</div>
                <div class="sidebar-user-info">
                    <div class="sidebar-user-name">${citizen.name || "Aarav Sharma"}</div>
                    <div class="sidebar-user-meta">${(citizen.location && citizen.location.city) || "Noida"} • Verified ✓</div>
                </div>
                <button type="button" id="sidebarLogoutBtn" title="Logout" style="color:#e5484d;padding:6px;border-radius:6px;cursor:pointer;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                </button>
            </div>
        `;

        document.getElementById("sidebarLogoutBtn")?.addEventListener("click", () => {
            if (confirm("Are you sure you want to log out of E-Kabaadi?")) {
                if (typeof authService !== "undefined") authService.logout();
                window.location.replace("../auth/login.html");
            }
        });
    }

    /* ── Render Topbar ── */
    function renderTopbar() {
        const topbarContainer = document.getElementById("citizenTopbar");
        if (!topbarContainer) return;

        const currentPath = window.location.pathname.split("/").pop() || "dashboard.html";
        let title = "Citizen Dashboard";
        NAV_ITEMS.forEach(g => {
            g.links.forEach(l => {
                if (l.href === currentPath) title = l.label;
            });
        });

        topbarContainer.className = "citizen-topbar";
        topbarContainer.innerHTML = `
            <div class="topbar-left">
                <button type="button" class="mobile-nav-toggle" id="mobileNavToggle" aria-label="Toggle menu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
                <div class="topbar-breadcrumb">
                    <span>Citizen Portal</span>
                    <strong>${title}</strong>
                </div>
            </div>

            <div class="topbar-right">
                <a href="rewards.html" class="eco-pill" title="View Eco Rewards">
                    <span class="eco-pill-icon">🪙</span>
                    <span>${citizen.ecoCoins || 860} Coins</span>
                </a>

                <a href="notifications.html" class="icon-btn ${(typeof notificationService !== 'undefined' && citizen && notificationService.getUnreadCount(citizen.userId || citizen.id) > 0) ? 'has-badge' : ''}" style="position:relative;" title="Notifications">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    ${(typeof notificationService !== 'undefined' && citizen && notificationService.getUnreadCount(citizen.userId || citizen.id) > 0) ? `<span style="position:absolute;top:0;right:0;width:8px;height:8px;background:#e53e3e;border-radius:50%;border:2px solid #fff;"></span>` : ''}
                </a>

                <a href="profile.html" class="sidebar-avatar" style="width:38px;height:38px;font-size:14px;text-decoration:none;" title="My Profile">
                    ${citizen.avatar || "AS"}
                </a>
            </div>
        `;

        // Mobile drawer toggle
        const toggleBtn = document.getElementById("mobileNavToggle");
        const sidebar = document.getElementById("citizenSidebar");
        let overlay = document.querySelector(".sidebar-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "sidebar-overlay";
            document.body.appendChild(overlay);
        }

        toggleBtn?.addEventListener("click", () => {
            sidebar?.classList.toggle("open");
            overlay.classList.toggle("active");
        });
        overlay.addEventListener("click", () => {
            sidebar?.classList.remove("open");
            overlay.classList.remove("active");
        });
    }

    /* ── Global Toast ── */
    window.showToast = function (message, type = "info") {
        let root = document.getElementById("toastRoot");
        if (!root) {
            root = document.createElement("div");
            root.id = "toastRoot";
            root.className = "toast-container";
            document.body.appendChild(root);
        }
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        root.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add("show"));
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    };

    // Auto-mount components when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            renderSidebar();
            renderTopbar();
        });
    } else {
        renderSidebar();
        renderTopbar();
    }
})();
