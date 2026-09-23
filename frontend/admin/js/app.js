/* ============================================================
   E-KABADI COMMAND CENTER
   Global Application Controller
   File: js/app.js
   ============================================================ */

(function () {
    "use strict";

    const APP_CONFIG = {
        name: "E-Kabadi Command Center",
        version: "1.0.0",
        prototype: true,

        animationDuration: 250,

        searchDebounce: 250,

        autoRefreshInterval: 30000
    };


    /* =========================================================
       APPLICATION STATE
       ========================================================= */

    const APP_STATE = {
        initialized: false,
        lastRefresh: null,
        activePage: null,
        sidebarOpen: false,
        isOnline: navigator.onLine
    };


    /* =========================================================
       PAGE DETECTION
       ========================================================= */

    function getCurrentPage() {

        let page =
            window.location.pathname
                .split("/")
                .pop();

        if (!page || page === "/") {
            return "dashboard.html";
        }

        return page;
    }


    /* =========================================================
       AUTHENTICATION
       ========================================================= */

    function checkAuthentication() {

        const page = getCurrentPage();

        // Login page does not require authentication.

        if (
            page === "index.html" ||
            page === ""
        ) {
            return true;
        }


        if (
            typeof requireAdminAuth === "function"
        ) {

            return requireAdminAuth();
        }


        return true;
    }


    /* =========================================================
       DATABASE INITIALIZATION
       ========================================================= */

    function initializeDatabase() {

        try {

            if (
                typeof initializeDatabase === "function"
            ) {
                // This block intentionally does not call itself.
                return;
            }

            if (
                typeof getDatabase === "function"
            ) {
                getDatabase();
            }

        } catch (error) {

            console.error(
                "Database initialization error:",
                error
            );

        }
    }


    /* =========================================================
       BODY / PAGE CLASSES
       ========================================================= */

    function setupPageClasses() {

        const page =
            getCurrentPage();

        APP_STATE.activePage = page;

        document.body.dataset.page = page;

        document.body.dataset.app =
            "ekabadi-command-center";


        if (page === "index.html") {
            document.body.classList.add("login-page");
        } else {
            document.body.classList.add("dashboard-page");
        }
    }


    /* =========================================================
       PAGE TRANSITION
       ========================================================= */

    function setupPageTransitions() {

        document
            .querySelectorAll(
                'a[href$=".html"]'
            )
            .forEach(link => {

                link.addEventListener(
                    "click",
                    function (event) {

                        const href =
                            this.getAttribute("href");

                        if (
                            !href ||
                            href.startsWith("#") ||
                            href.startsWith("http")
                        ) {
                            return;
                        }


                        if (
                            event.ctrlKey ||
                            event.metaKey ||
                            event.shiftKey ||
                            event.altKey
                        ) {
                            return;
                        }


                        if (
                            href ===
                            window.location
                                .pathname
                                .split("/")
                                .pop()
                        ) {
                            return;
                        }


                        event.preventDefault();


                        document.body.classList.add(
                            "page-exit"
                        );


                        setTimeout(() => {

                            window.location.href =
                                href;

                        }, APP_CONFIG.animationDuration);

                    }
                );

            });


        window.addEventListener(
            "pageshow",
            () => {

                document.body.classList.remove(
                    "page-exit"
                );

                document.body.classList.add(
                    "page-enter"
                );

            }
        );
    }


    /* =========================================================
       ONLINE / OFFLINE DETECTION
       ========================================================= */

    function setupNetworkDetection() {

        window.addEventListener(
            "online",
            () => {

                APP_STATE.isOnline = true;

                showNetworkToast(true);

            }
        );


        window.addEventListener(
            "offline",
            () => {

                APP_STATE.isOnline = false;

                showNetworkToast(false);

            }
        );
    }


    function showNetworkToast(isOnline) {

        if (
            typeof showToast !== "function"
        ) {
            return;
        }


        if (isOnline) {

            showToast(
                "Connection restored.",
                "success",
                "Back Online"
            );

        } else {

            showToast(
                "You're offline. Changes will remain stored locally.",
                "warning",
                "Offline Mode"
            );

        }
    }


    /* =========================================================
       GLOBAL SEARCH ENHANCEMENT
       ========================================================= */

    function setupSearch() {

        const search =
            document.getElementById(
                "globalSearch"
            );

        if (!search) return;


        search.setAttribute(
            "autocomplete",
            "off"
        );


        search.addEventListener(
            "input",
            debounceSearch
        );
    }


    const debounceSearch =
        typeof debounce === "function"
            ? debounce(handleSearchInput, 250)
            : handleSearchInput;


    function handleSearchInput(event) {

        const query =
            event.target.value.trim();


        if (!query) {

            removeSearchSuggestions();

            return;
        }


        // Suggestions are intentionally lightweight.
        // Actual filtering is handled by each page.

        showSearchSuggestions(query);
    }


    function showSearchSuggestions(query) {

        removeSearchSuggestions();


        const search =
            document.getElementById(
                "globalSearch"
            );

        if (!search) return;


        const normalized =
            query.toLowerCase();


        const suggestions = [

            {
                label: "Dashboard",
                keywords: ["dashboard", "home"],
                page: "dashboard.html",
                icon: "dashboard"
            },

            {
                label: "Citizens",
                keywords: ["citizen", "user", "users"],
                page: "citizens.html",
                icon: "users"
            },

            {
                label: "Collectors",
                keywords: ["collector", "driver"],
                page: "collectors.html",
                icon: "collector"
            },

            {
                label: "Pickup Operations",
                keywords: ["pickup", "booking"],
                page: "pickups.html",
                icon: "pickup"
            },

            {
                label: "Scrap & Rates",
                keywords: ["scrap", "material", "rate", "price"],
                page: "scrap.html",
                icon: "recycle"
            },

            {
                label: "Payments",
                keywords: ["payment", "money", "transaction"],
                page: "payments.html",
                icon: "wallet"
            },

            {
                label: "Rewards",
                keywords: ["reward", "coin"],
                page: "rewards.html",
                icon: "gift"
            },

            {
                label: "Analytics",
                keywords: ["analytics", "stats", "report"],
                page: "analytics.html",
                icon: "chart"
            },

            {
                label: "Issues & Support",
                keywords: ["issue", "support", "complaint"],
                page: "issues.html",
                icon: "alert"
            },

            {
                label: "Settings",
                keywords: ["settings", "configuration"],
                page: "settings.html",
                icon: "settings"
            }
        ];


        const matches =
            suggestions.filter(item =>
                item.label
                    .toLowerCase()
                    .includes(normalized) ||
                item.keywords.some(keyword =>
                    keyword.includes(normalized) ||
                    normalized.includes(keyword)
                )
            );


        if (!matches.length) return;


        const wrapper =
            search.closest(".global-search");

        if (!wrapper) return;


        const dropdown =
            document.createElement("div");

        dropdown.id =
            "globalSearchSuggestions";

        dropdown.className =
            "global-search-suggestions";


        dropdown.innerHTML =
            matches
                .slice(0, 5)
                .map(item => `

                    <a
                        href="${item.page}"
                        class="search-suggestion">

                        ${
                            typeof icon === "function"
                                ? icon(
                                    item.icon,
                                    "search-result-icon"
                                )
                                : ""
                        }

                        <span>
                            ${escapeHTML(
                                item.label
                            )}
                        </span>

                        <small>
                            Go to section
                        </small>

                    </a>

                `)
                .join("");


        wrapper.appendChild(dropdown);
    }


    function removeSearchSuggestions() {

        const dropdown =
            document.getElementById(
                "globalSearchSuggestions"
            );

        if (dropdown) {
            dropdown.remove();
        }
    }


    document.addEventListener(
        "click",
        event => {

            const searchWrapper =
                document.querySelector(
                    ".global-search"
                );

            if (
                searchWrapper &&
                !searchWrapper.contains(
                    event.target
                )
            ) {
                removeSearchSuggestions();
            }

        }
    );


    /* =========================================================
       AUTO REFRESH
       ========================================================= */

    function setupAutoRefresh() {

        if (
            APP_CONFIG.autoRefreshInterval <= 0
        ) {
            return;
        }


        setInterval(() => {

            if (
                document.hidden ||
                !APP_STATE.isOnline
            ) {
                return;
            }


            refreshApplicationData();

        }, APP_CONFIG.autoRefreshInterval);
    }


    function refreshApplicationData() {

        APP_STATE.lastRefresh =
            new Date();


        // Refresh notifications if available.

        if (
            typeof renderTopbar === "function"
        ) {
            renderTopbar();
        }


        // Let page-specific modules refresh
        // themselves if they expose a hook.

        const page =
            getCurrentPage();


        const refreshEvent =
            new CustomEvent(
                "ekabadi:data-refresh",
                {
                    detail: {
                        page,
                        timestamp:
                            APP_STATE.lastRefresh
                    }
                }
            );


        document.dispatchEvent(
            refreshEvent
        );
    }


    /* =========================================================
       STORAGE EVENT
       ========================================================= */

    function setupStorageSync() {

        window.addEventListener(
            "storage",
            event => {

                if (
                    !event.key ||
                    event.key.includes(
                        "ekabadi"
                    )
                ) {

                    refreshApplicationData();

                }

            }
        );
    }


    /* =========================================================
       TAB VISIBILITY
       ========================================================= */

    function setupVisibilityRefresh() {

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    !document.hidden
                ) {

                    refreshApplicationData();

                }

            }
        );
    }


    /* =========================================================
       NOTIFICATION HELPERS
       ========================================================= */

    function refreshNotificationBadge() {

        if (
            typeof renderTopbar === "function"
        ) {
            renderTopbar();
        }
    }


    /* =========================================================
       DEMO DATA HELPERS
       ========================================================= */

    function seedDemoActivity() {

        if (
            typeof storageGetNotifications !==
            "function"
        ) {
            return;
        }


        const existing =
            storageGetNotifications();


        if (existing && existing.length > 0) {
            return;
        }


        const demoNotifications = [

            {
                id: "NOT-1001",
                type: "pickup",
                title: "New pickup request",
                message:
                    "A new pickup request has been created in Sector 62.",
                read: false,
                createdAt:
                    new Date(
                        Date.now() - 8 * 60 * 1000
                    ).toISOString()
            },

            {
                id: "NOT-1002",
                type: "collector",
                title: "Collector verification pending",
                message:
                    "Mohan Lal has submitted documents for verification.",
                read: false,
                createdAt:
                    new Date(
                        Date.now() - 42 * 60 * 1000
                    ).toISOString()
            },

            {
                id: "NOT-1003",
                type: "payment",
                title: "Payment requires attention",
                message:
                    "A payment of ₹404 is awaiting processing.",
                read: false,
                createdAt:
                    new Date(
                        Date.now() - 90 * 60 * 1000
                    ).toISOString()
            },

            {
                id: "NOT-1004",
                type: "success",
                title: "Daily target achieved",
                message:
                    "Today's waste collection target has been achieved.",
                read: true,
                createdAt:
                    new Date(
                        Date.now() - 4 * 60 * 60 * 1000
                    ).toISOString()
            }
        ];


        if (
            typeof markNotificationRead ===
            "function"
        ) {
            // Do nothing.
        }


        try {

            localStorage.setItem(
                "ekabadi_admin_notifications_v1",
                JSON.stringify(
                    demoNotifications
                )
            );

        } catch (error) {

            console.error(
                "Could not seed notifications:",
                error
            );

        }
    }


    /* =========================================================
       ERROR HANDLING
       ========================================================= */

    window.addEventListener(
        "error",
        event => {

            console.error(
                "E-Kabadi Application Error:",
                event.error ||
                event.message
            );

        }
    );


    window.addEventListener(
        "unhandledrejection",
        event => {

            console.error(
                "E-Kabadi Promise Error:",
                event.reason
            );

        }
    );


    /* =========================================================
       DEMO / PROTOTYPE INDICATOR
       ========================================================= */

    function setupPrototypeIndicator() {

        if (
            !APP_CONFIG.prototype
        ) {
            return;
        }


        // We don't inject a large banner.
        // The sidebar already contains the version label.

        document.body.dataset.prototype =
            "true";
    }


    /* =========================================================
       SMOOTH SCROLL
       ========================================================= */

    function setupSmoothScroll() {

        document.addEventListener(
            "click",
            event => {

                const link =
                    event.target.closest(
                        'a[href^="#"]'
                    );

                if (!link) return;


                const targetID =
                    link.getAttribute("href");


                if (
                    !targetID ||
                    targetID === "#"
                ) {
                    return;
                }


                const target =
                    document.querySelector(
                        targetID
                    );


                if (!target) return;


                event.preventDefault();


                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }
        );
    }


    /* =========================================================
       FORM SUBMISSION PROTECTION
       ========================================================= */

    function setupFormProtection() {

        document.addEventListener(
            "submit",
            event => {

                const form =
                    event.target;

                if (
                    !form ||
                    !form.matches("form")
                ) {
                    return;
                }


                // Forms with explicit data-allow-submit
                // are controlled by their page JS.

                if (
                    form.dataset.allowSubmit ===
                    "true"
                ) {
                    return;
                }


                // Never interfere with login.

                if (
                    form.id === "loginForm"
                ) {
                    return;
                }

            }
        );
    }


    /* =========================================================
       DOUBLE CLICK PROTECTION
       ========================================================= */

    function setupButtonProtection() {

        document.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "button[data-loading]"
                    );

                if (!button) return;


                if (
                    button.dataset.loading ===
                    "true"
                ) {
                    event.preventDefault();
                    event.stopPropagation();
                }

            },
            true
        );
    }


    function setButtonLoading(
        button,
        loading = true,
        text = "Processing..."
    ) {

        if (!button) return;


        if (loading) {

            if (
                !button.dataset.originalText
            ) {
                button.dataset.originalText =
                    button.innerHTML;
            }


            button.dataset.loading =
                "true";

            button.disabled =
                true;


            button.innerHTML = `

                <span class="button-spinner"></span>

                <span>
                    ${escapeHTML(text)}
                </span>

            `;

        } else {

            button.dataset.loading =
                "false";

            button.disabled =
                false;


            if (
                button.dataset.originalText
            ) {

                button.innerHTML =
                    button.dataset.originalText;

            }

        }
    }


    /* =========================================================
       PAGE LOADING HELPERS
       ========================================================= */

    function showPageLoader() {

        let loader =
            document.getElementById(
                "pageLoader"
            );


        if (loader) {
            loader.classList.add("show");
            return;
        }


        loader =
            document.createElement("div");

        loader.id =
            "pageLoader";

        loader.className =
            "page-loader";


        loader.innerHTML = `

            <div class="page-loader-spinner">

                <div class="loader-ring"></div>

                <strong>
                    Loading Command Center
                </strong>

            </div>

        `;


        document.body.appendChild(loader);


        requestAnimationFrame(() => {
            loader.classList.add("show");
        });
    }


    function hidePageLoader() {

        const loader =
            document.getElementById(
                "pageLoader"
            );


        if (!loader) return;


        loader.classList.remove("show");


        setTimeout(() => {

            if (loader.parentNode) {
                loader.remove();
            }

        }, 250);
    }


    /* =========================================================
       DATA UTILITIES
       ========================================================= */

    function getCollectionSafe(
        collection
    ) {

        try {

            if (
                typeof getCollection ===
                "function"
            ) {

                return getCollection(
                    collection
                ) || [];

            }

        } catch (error) {

            console.error(
                `Failed loading ${collection}:`,
                error
            );

        }


        return [];
    }


    function getQuickStats() {

        try {

            if (
                typeof calculateDashboardStats ===
                "function"
            ) {

                return calculateDashboardStats();

            }

        } catch (error) {

            console.error(
                "Dashboard stats error:",
                error
            );

        }


        return {
            citizens: 0,
            collectors: 0,
            pickups: 0,
            waste: 0,
            revenue: 0
        };
    }


    /* =========================================================
       CUSTOM EVENTS
       ========================================================= */

    function emit(eventName, detail = {}) {

        document.dispatchEvent(
            new CustomEvent(
                `ekabadi:${eventName}`,
                {
                    detail
                }
            )
        );
    }


    /* =========================================================
       GLOBAL API
       ========================================================= */

    window.EKABADI_APP = {

        config: APP_CONFIG,

        state: APP_STATE,

        getCurrentPage,

        checkAuthentication,

        refreshApplicationData,

        refreshNotificationBadge,

        getCollectionSafe,

        getQuickStats,

        setButtonLoading,

        showPageLoader,

        hidePageLoader,

        emit
    };


    window.getCurrentPage =
        getCurrentPage;

    window.refreshApplicationData =
        refreshApplicationData;

    window.setButtonLoading =
        setButtonLoading;


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function initializeApp() {

        if (
            APP_STATE.initialized
        ) {
            return;
        }


        APP_STATE.initialized =
            true;


        setupPageClasses();

        setupNetworkDetection();

        setupStorageSync();

        setupVisibilityRefresh();

        setupPageTransitions();

        setupSearch();

        setupAutoRefresh();

        setupPrototypeIndicator();

        setupSmoothScroll();

        setupFormProtection();

        setupButtonProtection();


        APP_STATE.lastRefresh =
            new Date();


        console.log(
            `%cE-Kabadi Command Center v${APP_CONFIG.version}`,
            "font-weight:bold;"
        );

        console.log(
            "Prototype mode:",
            APP_CONFIG.prototype
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeApp
        );

    } else {

        initializeApp();

    }

})();