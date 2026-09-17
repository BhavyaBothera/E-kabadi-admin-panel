/* ============================================================
   E-KABADI COMMAND CENTER
   Dashboard Controller
   File: js/dashboard.js
   ============================================================ */

(function () {

    "use strict";


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function initializeDashboard() {

        loadDashboardStats();

        renderAreaPerformance();

        renderRecentPickups();

        renderPendingActions();

        loadEnvironmentalImpact();

        initializeCharts();

        bindDashboardEvents();

        updateLastUpdated();
    }


    /* =========================================================
       DASHBOARD STATS
       ========================================================= */

    function loadDashboardStats() {

        let stats = null;


        if (
            typeof calculateDashboardStats ===
            "function"
        ) {

            stats =
                calculateDashboardStats();
        }


        if (!stats) {

            stats = {
                totalWasteProcessed: 18420,
                activeCitizens: 1248,
                activeCollectors: 86,
                revenue: 48600
            };
        }


        const waste =
            stats.totalWasteProcessed ||
            stats.waste ||
            18420;


        const citizens =
            stats.activeCitizens ||
            stats.citizens ||
            1248;


        const collectors =
            stats.activeCollectors ||
            stats.collectors ||
            86;


        const revenue =
            stats.revenue ||
            stats.platformRevenue ||
            48600;


        setText(
            "statWaste",
            `${formatNumber(waste)} kg`
        );


        setText(
            "statCitizens",
            formatNumber(citizens)
        );


        setText(
            "statCollectors",
            formatNumber(collectors)
        );


        setText(
            "statRevenue",
            formatCurrencyShort(revenue)
        );


        const target =
            20000;


        const progress =
            Math.min(
                100,
                (Number(waste) / target) * 100
            );


        const progressElement =
            document.getElementById(
                "wasteProgress"
            );


        if (progressElement) {
            progressElement.style.width =
                `${progress}%`;
        }
    }


    /* =========================================================
       AREA PERFORMANCE
       ========================================================= */

    function renderAreaPerformance() {

        const container =
            document.getElementById(
                "areaPerformance"
            );

        if (!container) return;


        let areas = [];


        const analytics =
            window.EKABADI_DATA?.analytics;


        if (
            analytics &&
            Array.isArray(
                analytics.areaPerformance
            )
        ) {

            areas =
                analytics.areaPerformance;
        }


        if (!areas.length) {

            areas = [

                {
                    area: "Sector 62",
                    efficiency: 94
                },

                {
                    area: "Sector 18",
                    efficiency: 89
                },

                {
                    area: "Sector 76",
                    efficiency: 85
                },

                {
                    area: "Sector 137",
                    efficiency: 78
                },

                {
                    area: "Sector 50",
                    efficiency: 71
                }
            ];
        }


        areas =
            areas
                .map(item => ({

                    name:
                        item.area ||
                        item.name ||
                        item.zone ||
                        "Unknown",

                    value:
                        Number(
                            item.efficiency ||
                            item.completionRate ||
                            item.value ||
                            0
                        )

                }))
                .slice(0, 5);


        container.innerHTML =
            areas.map(item => `

                <div class="area-item">

                    <span class="area-name">
                        ${escapeHTML(item.name)}
                    </span>

                    <div class="area-bar">

                        <span
                            style="
                                width:${Math.min(
                                    100,
                                    item.value
                                )}%;
                            ">
                        </span>

                    </div>

                    <strong class="area-value">
                        ${item.value}%
                    </strong>

                </div>

            `).join("");
    }


    /* =========================================================
       RECENT PICKUPS
       ========================================================= */

    function renderRecentPickups() {

        const container =
            document.getElementById(
                "recentPickups"
            );

        if (!container) return;


        let pickups = [];


        if (
            typeof storageGetPickups ===
            "function"
        ) {

            pickups =
                storageGetPickups();
        }


        if (!pickups.length) {

            container.innerHTML =
                `<div class="dashboard-empty">
                    No recent pickups.
                 </div>`;

            return;
        }


        pickups =
            pickups
                .sort(
                    (a, b) =>
                        new Date(
                            b.createdAt ||
                            b.date ||
                            0
                        ) -
                        new Date(
                            a.createdAt ||
                            a.date ||
                            0
                        )
                )
                .slice(0, 5);


        container.innerHTML =
            pickups.map(pickup => {

                const citizen =
                    getCitizenName(
                        pickup.citizenId ||
                        pickup.userId
                    );


                const weight =
                    pickup.weight ||
                    pickup.estimatedWeight ||
                    0;


                const status =
                    pickup.status ||
                    "pending";


                const initials =
                    getInitials(
                        citizen
                    );


                return `

                    <div class="pickup-row">

                        <div class="pickup-avatar">
                            ${initials}
                        </div>

                        <div class="pickup-user">

                            <strong>
                                ${escapeHTML(citizen)}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    pickup.id ||
                                    "Pickup"
                                )}
                            </span>

                        </div>

                        <div class="pickup-weight">
                            ${weight} kg
                        </div>

                        <div class="pickup-status">

                            ${
                                typeof statusBadge ===
                                "function"
                                    ? statusBadge(status)
                                    : status
                            }

                        </div>

                    </div>

                `;

            }).join("");
    }


    /* =========================================================
       PENDING ACTIONS
       ========================================================= */

    function renderPendingActions() {

        const container =
            document.getElementById(
                "pendingActions"
            );

        if (!container) return;


        const actions = [];


        if (
            typeof getPendingCollectorVerifications ===
            "function"
        ) {

            const pendingCollectors =
                getPendingCollectorVerifications();

            if (
                pendingCollectors &&
                pendingCollectors.length
            ) {

                actions.push({

                    type: "warning",

                    icon: "👤",

                    title:
                        "Collector verifications",

                    description:
                        "Collectors waiting for approval",

                    count:
                        pendingCollectors.length,

                    href:
                        "collectors.html"
                });
            }
        }


        if (
            typeof getPendingPayments ===
            "function"
        ) {

            const pendingPayments =
                getPendingPayments();

            if (
                pendingPayments &&
                pendingPayments.length
            ) {

                actions.push({

                    type: "danger",

                    icon: "₹",

                    title:
                        "Pending payments",

                    description:
                        "Payments require processing",

                    count:
                        pendingPayments.length,

                    href:
                        "payments.html"
                });
            }
        }


        if (
            typeof getOpenIssues ===
            "function"
        ) {

            const openIssues =
                getOpenIssues();

            if (
                openIssues &&
                openIssues.length
            ) {

                actions.push({

                    type: "info",

                    icon: "!",

                    title:
                        "Open issues",

                    description:
                        "Support issues need attention",

                    count:
                        openIssues.length,

                    href:
                        "issues.html"
                });
            }
        }


        // Always show a pickup action for the prototype.

        const pickups =
            typeof storageGetPickups ===
            "function"
                ? storageGetPickups()
                : [];


        const pendingPickups =
            pickups.filter(
                pickup =>
                    pickup.status === "pending"
            );


        if (pendingPickups.length) {

            actions.push({

                type: "info",

                icon: "♻",

                title:
                    "Unassigned pickups",

                description:
                    "Pickups waiting for collectors",

                count:
                    pendingPickups.length,

                href:
                    "pickups.html"
            });
        }


        if (!actions.length) {

            container.innerHTML =
                `<div class="dashboard-empty">
                    Everything is up to date.
                 </div>`;

            return;
        }


        container.innerHTML =
            actions
                .slice(0, 4)
                .map(action => `

                    <a
                        href="${action.href}"
                        class="pending-item">

                        <div
                            class="
                                pending-icon
                                ${action.type}
                            ">
                            ${action.icon}
                        </div>

                        <div class="pending-content">

                            <strong>
                                ${escapeHTML(
                                    action.title
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    action.description
                                )}
                            </span>

                        </div>

                        <div class="pending-count">
                            ${action.count}
                        </div>

                    </a>

                `)
                .join("");
    }


    /* =========================================================
       ENVIRONMENTAL IMPACT
       ========================================================= */

    function loadEnvironmentalImpact() {

        const platform =
            window.EKABADI_DATA?.platform;


        const co2 =
            platform?.totalCO2Saved ||
            42860;


        const water =
            platform?.totalWaterSaved ||
            72600;


        setText(
            "co2Saved",
            formatCompactNumber(co2)
        );


        setText(
            "waterSaved",
            formatCompactNumber(water)
        );
    }


    /* =========================================================
       CHARTS
       ========================================================= */

    function initializeCharts() {

        setTimeout(() => {

            if (
                typeof createWasteChart ===
                "function"
            ) {
                createWasteChart(7);
            }


            if (
                typeof createPickupStatusChart ===
                "function"
            ) {
                createPickupStatusChart();
            }


            if (
                typeof createMaterialChart ===
                "function"
            ) {
                createMaterialChart();
            }

        }, 50);
    }


    /* =========================================================
       EVENTS
       ========================================================= */

    function bindDashboardEvents() {

        const refreshButton =
            document.getElementById(
                "refreshDashboard"
            );


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                () => {

                    setButtonLoading(
                        refreshButton,
                        true,
                        "Refreshing..."
                    );


                    setTimeout(() => {

                        loadDashboardStats();

                        renderAreaPerformance();

                        renderRecentPickups();

                        renderPendingActions();

                        loadEnvironmentalImpact();

                        initializeCharts();

                        updateLastUpdated();


                        setButtonLoading(
                            refreshButton,
                            false
                        );


                        if (
                            typeof showToast ===
                            "function"
                        ) {

                            showToast(
                                "Dashboard data has been refreshed.",
                                "success",
                                "Updated"
                            );

                        }

                    }, 600);

                }
            );
        }


        const quickAction =
            document.getElementById(
                "quickActionBtn"
            );


        if (quickAction) {

            quickAction.addEventListener(
                "click",
                openQuickActions
            );

        }


        const period =
            document.getElementById(
                "wasteChartPeriod"
            );


        if (period) {

            period.addEventListener(
                "change",
                event => {

                    if (
                        typeof createWasteChart ===
                        "function"
                    ) {

                        createWasteChart(
                            Number(
                                event.target.value
                            )
                        );
                    }

                }
            );

        }


        document.addEventListener(
            "ekabadi:data-refresh",
            () => {

                loadDashboardStats();

                renderAreaPerformance();

                renderRecentPickups();

                renderPendingActions();

                loadEnvironmentalImpact();

            }
        );
    }


    /* =========================================================
       QUICK ACTIONS
       ========================================================= */

    function openQuickActions() {

        if (
            typeof openModal !==
            "function"
        ) {
            return;
        }


        openModal({

            title: "Quick Actions",

            eyebrow: "COMMAND CENTER",

            description:
                "Jump directly to a common admin operation.",

            size: "small",

            content: `

                <div class="quick-actions-grid">

                    <a
                        href="pickups.html"
                        class="quick-action">

                        <span>♻</span>

                        <div>
                            <strong>
                                Manage Pickups
                            </strong>

                            <small>
                                Assign and update pickups
                            </small>
                        </div>

                    </a>


                    <a
                        href="collectors.html"
                        class="quick-action">

                        <span>🚚</span>

                        <div>
                            <strong>
                                Verify Collector
                            </strong>

                            <small>
                                Review pending partners
                            </small>
                        </div>

                    </a>


                    <a
                        href="scrap.html"
                        class="quick-action">

                        <span>₹</span>

                        <div>
                            <strong>
                                Update Scrap Rates
                            </strong>

                            <small>
                                Manage market prices
                            </small>
                        </div>

                    </a>


                    <a
                        href="payments.html"
                        class="quick-action">

                        <span>💳</span>

                        <div>
                            <strong>
                                Process Payments
                            </strong>

                            <small>
                                Review pending payouts
                            </small>
                        </div>

                    </a>

                </div>

            `,

            footer: `

                <button
                    class="btn btn-secondary"
                    onclick="closeModal()">
                    Close
                </button>

            `
        });
    }


    /* =========================================================
       HELPERS
       ========================================================= */

    function getCitizenName(id) {

        if (!id) return "Unknown Citizen";


        if (
            typeof getCitizenById ===
            "function"
        ) {

            const citizen =
                getCitizenById(id);

            if (citizen) {
                return citizen.name;
            }
        }


        const citizens =
            typeof storageGetCitizens ===
            "function"
                ? storageGetCitizens()
                : [];


        const citizen =
            citizens.find(
                item =>
                    item.id === id
            );


        return citizen?.name ||
            "Unknown Citizen";
    }


    function setText(id, value) {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }


    function formatNumber(value) {

        const number =
            Number(value) || 0;

        return number.toLocaleString(
            "en-IN"
        );
    }


    function formatCurrencyShort(value) {

        const number =
            Number(value) || 0;


        if (number >= 100000) {

            return `₹${(
                number / 100000
            ).toFixed(1)}L`;
        }


        if (number >= 1000) {

            return `₹${(
                number / 1000
            ).toFixed(1)}K`;
        }


        return `₹${number}`;
    }


    function formatCompactNumber(value) {

        const number =
            Number(value) || 0;


        if (number >= 1000000) {

            return `${(
                number / 1000000
            ).toFixed(1)}M`;
        }


        if (number >= 1000) {

            return `${(
                number / 1000
            ).toFixed(1)}K`;
        }


        return formatNumber(number);
    }


    function updateLastUpdated() {

        const element =
            document.getElementById(
                "lastUpdated"
            );

        if (!element) return;


        element.textContent =
            "Just now";
    }


    /* =========================================================
       START
       ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeDashboard
        );

    } else {

        initializeDashboard();

    }


})();