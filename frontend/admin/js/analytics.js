/* =========================================================
   E-KABADI COMMAND CENTER
   ANALYTICS MODULE
   ========================================================= */

(function () {

    "use strict";


    let selectedRange = 7;

    let charts = {};


    /* ---------------------------------------------------------
       DOM READY
       --------------------------------------------------------- */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            initializeAnalytics();

            window.addEventListener(
                "chartjsready",
                renderAnalytics
            );

        }
    );


    function initializeAnalytics() {

        setupFilters();

        setupActions();

        renderAnalytics();

    }


    /* ---------------------------------------------------------
       FILTERS
       --------------------------------------------------------- */

    function setupFilters() {

        document
            .querySelectorAll(".analytics-range")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    function () {

                        document
                            .querySelectorAll(
                                ".analytics-range"
                            )
                            .forEach(btn =>
                                btn.classList.remove(
                                    "active"
                                )
                            );

                        this.classList.add("active");

                        selectedRange =
                            Number(
                                this.dataset.range
                            );

                        renderAnalytics();

                    }
                );

            });


        const areaFilter =
            document.getElementById(
                "analyticsArea"
            );

        if (areaFilter) {

            areaFilter.addEventListener(
                "change",
                renderAnalytics
            );

        }

    }


    /* ---------------------------------------------------------
       ACTIONS
       --------------------------------------------------------- */

    function setupActions() {

        const refresh =
            document.getElementById(
                "refreshAnalytics"
            );

        if (refresh) {

            refresh.addEventListener(
                "click",
                function () {

                    renderAnalytics();

                    if (
                        typeof showToast ===
                        "function"
                    ) {

                        showToast(
                            "Analytics refreshed.",
                            "success"
                        );

                    }

                }
            );

        }


        const exportButton =
            document.getElementById(
                "exportAnalytics"
            );

        if (exportButton) {

            exportButton.addEventListener(
                "click",
                exportAnalyticsReport
            );

        }

    }


    /* ---------------------------------------------------------
       MAIN RENDER
       --------------------------------------------------------- */

    function renderAnalytics() {

        const data =
            getAnalyticsData();

        renderKPIs(data);

        renderEnvironmentalImpact(data);

        renderCharts(data);

        renderInsights(data);

    }


    /* ---------------------------------------------------------
       DATA
       --------------------------------------------------------- */

    function getAnalyticsData() {

        let analytics =
            EKABADI_DATA.analytics || {};

        let database =
            typeof getDatabase === "function"
                ? getDatabase()
                : EKABADI_DATA;


        const pickups =
            database.pickups ||
            EKABADI_DATA.pickups ||
            [];

        const payments =
            database.payments ||
            EKABADI_DATA.payments ||
            [];

        const materials =
            database.scrapMaterials ||
            EKABADI_DATA.scrapMaterials ||
            [];


        const area =
            document.getElementById(
                "analyticsArea"
            )?.value || "all";


        let filteredPickups =
            pickups.slice();


        if (area !== "all") {

            filteredPickups =
                filteredPickups.filter(
                    pickup => {

                        const location =
                            String(
                                pickup.location ||
                                pickup.address ||
                                pickup.area ||
                                ""
                            ).toLowerCase();

                        return location.includes(
                            area.replace(
                                "sector",
                                "sector "
                            )
                        );

                    }
                );

        }


        const completed =
            filteredPickups.filter(
                p =>
                    normalizeStatus(
                        p.status
                    ) === "completed"
            ).length;


        const completionRate =
            filteredPickups.length
                ? Math.round(
                    (
                        completed /
                        filteredPickups.length
                    ) * 100
                )
                : 0;


        const totalWaste =
            Number(
                analytics.totalWasteProcessed ||
                calculateWaste(
                    filteredPickups
                )
            );


        const totalRevenue =
            payments.reduce(
                (sum, payment) => {

                    if (
                        normalizeStatus(
                            payment.status
                        ) === "completed"
                    ) {

                        return sum +
                            Number(
                                payment.amount || 0
                            );

                    }

                    return sum;

                },
                0
            );


        return {

            pickups:
                filteredPickups,

            payments,

            materials,

            analytics,

            totalWaste,

            totalRevenue,

            completionRate,

            completed

        };

    }


    function calculateWaste(pickups) {

        return pickups.reduce(
            (sum, pickup) => {

                return sum +
                    Number(
                        pickup.weight ||
                        pickup.estimatedWeight ||
                        0
                    );

            },
            0
        );

    }


    /* ---------------------------------------------------------
       KPI
       --------------------------------------------------------- */

    function renderKPIs(data) {

        setText(
            "analyticsWaste",
            formatWeightValue(
                data.totalWaste
            )
        );


        const co2 =
            Number(
                data.analytics.totalCO2Saved ||
                data.totalWaste * 2.3
            );


        setText(
            "analyticsCO2",
            `${formatNumber(co2)} kg`
        );


        setText(
            "analyticsRevenue",
            formatCurrencyValue(
                data.totalRevenue
            )
        );


        setText(
            "analyticsCompletion",
            `${data.completionRate}%`
        );


        const trend =
            document.getElementById(
                "wasteTrend"
            );

        if (trend) {

            trend.textContent =
                selectedRange === 7
                    ? "↑ 12.4% vs previous period"
                    : selectedRange === 30
                        ? "↑ 18.7% vs previous period"
                        : "↑ 24.2% vs previous period";

        }

    }


    /* ---------------------------------------------------------
       ENVIRONMENT
       --------------------------------------------------------- */

    function renderEnvironmentalImpact(data) {

        const co2 =
            Number(
                data.analytics.totalCO2Saved ||
                data.totalWaste * 2.3
            );


        const water =
            Number(
                data.analytics.totalWaterSaved ||
                data.totalWaste * 3.9
            );


        const trees =
            Math.max(
                1,
                Math.round(
                    co2 / 21
                )
            );


        setText(
            "impactCO2",
            `${formatNumber(co2)} kg`
        );


        setText(
            "impactWater",
            `${formatNumber(water)} L`
        );


        setText(
            "impactTrees",
            formatNumber(trees)
        );


        setText(
            "impactWaste",
            formatWeightValue(
                data.totalWaste
            )
        );

    }


    /* ---------------------------------------------------------
       CHARTS
       --------------------------------------------------------- */

    function renderCharts(data) {

        destroyCharts();


        if (
            typeof Chart === "undefined"
        ) {

            console.warn(
                "Chart.js is not available."
            );

            return;

        }


        createPickupChart(data);

        createWasteChart(data);

        createRevenueChart(data);

        createMaterialChart(data);

        createStatusChart(data);

        createAreaChart(data);

    }


    function createPickupChart(data) {

        const canvas =
            document.getElementById(
                "pickupTrendChart"
            );

        if (!canvas) return;


        const source =
            data.analytics.dailyPickups ||
            [];


        const labels =
            createLabels(
                source.length
            );


        charts.pickups =
            new Chart(
                canvas,
                {
                    type: "line",

                    data: {

                        labels,

                        datasets: [
                            {
                                label:
                                    "Pickups",

                                data:
                                    source,

                                tension:
                                    0.4,

                                fill:
                                    true,

                                borderWidth:
                                    2
                            }
                        ]

                    },

                    options:
                        baseChartOptions(
                            "Pickups"
                        )

                }
            );

    }


    function createWasteChart(data) {

        const canvas =
            document.getElementById(
                "wasteTrendChart"
            );

        if (!canvas) return;


        const source =
            data.analytics.dailyWaste ||
            [];


        charts.waste =
            new Chart(
                canvas,
                {
                    type: "bar",

                    data: {

                        labels:
                            createLabels(
                                source.length
                            ),

                        datasets: [
                            {
                                label:
                                    "Waste (kg)",

                                data:
                                    source,

                                borderRadius:
                                    6,

                                borderWidth:
                                    0
                            }
                        ]

                    },

                    options:
                        baseChartOptions(
                            "Waste (kg)"
                        )

                }
            );

    }


    function createRevenueChart(data) {

        const canvas =
            document.getElementById(
                "revenueTrendChart"
            );

        if (!canvas) return;


        const source =
            data.analytics.dailyRevenue ||
            [];


        charts.revenue =
            new Chart(
                canvas,
                {
                    type: "line",

                    data: {

                        labels:
                            createLabels(
                                source.length
                            ),

                        datasets: [
                            {
                                label:
                                    "Revenue",

                                data:
                                    source,

                                tension:
                                    0.4,

                                borderWidth:
                                    2
                            }
                        ]

                    },

                    options:
                        baseChartOptions(
                            "Revenue"
                        )

                }
            );

    }


    function createMaterialChart(data) {

        const canvas =
            document.getElementById(
                "materialDistributionChart"
            );

        if (!canvas) return;


        const distribution =
            data.analytics.materialDistribution ||
            {};


        const labels =
            Object.keys(
                distribution
            );


        const values =
            Object.values(
                distribution
            );


        charts.material =
            new Chart(
                canvas,
                {
                    type: "doughnut",

                    data: {

                        labels,

                        datasets: [
                            {
                                data:
                                    values,

                                borderWidth:
                                    0
                            }
                        ]

                    },

                    options:
                        doughnutOptions()

                }
            );

    }


    function createStatusChart(data) {

        const canvas =
            document.getElementById(
                "pickupStatusChart"
            );

        if (!canvas) return;


        const counts =
            getStatusDistribution(
                data.pickups
            );


        charts.status =
            new Chart(
                canvas,
                {
                    type: "doughnut",

                    data: {

                        labels: [
                            "Completed",
                            "In Progress",
                            "Assigned",
                            "Pending"
                        ],

                        datasets: [
                            {
                                data: [
                                    counts.completed,
                                    counts.in_progress,
                                    counts.collector_assigned,
                                    counts.pending
                                ],

                                borderWidth:
                                    0
                            }
                        ]

                    },

                    options:
                        doughnutOptions()

                }
            );

    }


    function createAreaChart(data) {

        const canvas =
            document.getElementById(
                "areaPerformanceChart"
            );

        if (!canvas) return;


        const areaData =
            data.analytics.areaPerformance ||
            {};


        charts.area =
            new Chart(
                canvas,
                {
                    type: "bar",

                    data: {

                        labels:
                            Object.keys(
                                areaData
                            ),

                        datasets: [
                            {
                                label:
                                    "Waste (kg)",

                                data:
                                    Object.values(
                                        areaData
                                    ),

                                borderRadius:
                                    6,

                                borderWidth:
                                    0
                            }
                        ]

                    },

                    options:
                        baseChartOptions(
                            "Waste (kg)"
                        )

                }
            );

    }


    /* ---------------------------------------------------------
       CHART HELPERS
       --------------------------------------------------------- */

    function baseChartOptions(label) {

        return {

            responsive: true,

            maintainAspectRatio:
                false,

            plugins: {

                legend: {
                    display: false
                }

            },

            scales: {

                y: {

                    beginAtZero: true,

                    grid: {
                        drawBorder: false
                    }

                },

                x: {

                    grid: {
                        display: false
                    }

                }

            }

        };

    }


    function doughnutOptions() {

        return {

            responsive: true,

            maintainAspectRatio:
                false,

            cutout:
                "68%",

            plugins: {

                legend: {

                    position:
                        "bottom",

                    labels: {

                        usePointStyle:
                            true,

                        padding:
                            18

                    }

                }

            }

        };

    }


    function createLabels(length) {

        const labels = [];

        for (
            let i = 1;
            i <= length;
            i++
        ) {

            labels.push(
                `Day ${i}`
            );

        }

        return labels;

    }


    function getStatusDistribution(
        pickups
    ) {

        const result = {

            completed: 0,

            in_progress: 0,

            collector_assigned: 0,

            pending: 0

        };


        pickups.forEach(
            pickup => {

                const status =
                    normalizeStatus(
                        pickup.status
                    );


                if (
                    result[
                        status
                    ] !== undefined
                ) {

                    result[
                        status
                    ]++;

                }

            }
        );


        return result;

    }


    function destroyCharts() {

        Object.values(
            charts
        ).forEach(
            chart => {

                if (
                    chart &&
                    typeof chart.destroy ===
                    "function"
                ) {

                    chart.destroy();

                }

            }
        );


        charts = {};

    }


    /* ---------------------------------------------------------
       SMART INSIGHTS
       --------------------------------------------------------- */

    function renderInsights(data) {

        const container =
            document.getElementById(
                "analyticsInsights"
            );

        if (!container) return;

        const settings = typeof storageGetSettings === "function" ? storageGetSettings() : (window.EKABADI_DATA?.settings || {});
        const aiBadge = document.querySelector(".ai-badge");

        if (settings && settings.enableAIAnalysis === false) {
            if (aiBadge) {
                aiBadge.textContent = "✦ AI Analysis Paused";
                aiBadge.style.opacity = "0.6";
            }
            container.innerHTML = `
                <div class="insight-item warning">
                    <div class="insight-icon">ℹ</div>
                    <div class="insight-content">
                        <strong>AI Waste Analysis Paused</strong>
                        <p>AI-assisted insights and predictive trend generation are currently paused in System Settings. Re-enable them anytime under Settings &gt; Platform Features.</p>
                    </div>
                </div>
            `;
            return;
        }

        if (aiBadge) {
            aiBadge.textContent = "✦ AI Assisted";
            aiBadge.style.opacity = "1";
        }

        const insights = [];


        if (
            data.completionRate >= 90
        ) {

            insights.push({
                icon: "✓",
                title:
                    "Strong pickup completion",
                text:
                    `The current completion rate is ${data.completionRate}%, indicating efficient collector operations.`,
                type: "success"
            });

        } else {

            insights.push({
                icon: "!",
                title:
                    "Pickup completion needs attention",
                text:
                    `Only ${data.completionRate}% of current pickups are completed. Review collector allocation and pending requests.`,
                type: "warning"
            });

        }


        if (
            data.totalWaste > 1000
        ) {

            insights.push({
                icon: "♻",
                title:
                    "High recycling activity",
                text:
                    `${formatWeightValue(data.totalWaste)} of waste has been processed in the selected dataset.`,
                type: "success"
            });

        }


        const pending =
            data.pickups.filter(
                p =>
                    normalizeStatus(
                        p.status
                    ) === "pending"
            ).length;


        if (pending > 0) {

            insights.push({
                icon: "!",
                title:
                    `${pending} pickup request${pending > 1 ? "s" : ""} pending`,
                text:
                    "Consider assigning available collectors to reduce waiting time.",
                type: "warning"
            });

        }


        insights.push({
            icon: "✦",
            title:
                "AI-powered waste intelligence",
            text:
                "Future production integration can use historical collection data to predict demand, optimize routes and identify high-recovery zones.",
            type: "info"
        });


        container.innerHTML =
            insights.map(
                insight => `

                    <div class="insight-item ${insight.type}">

                        <div class="insight-icon">
                            ${insight.icon}
                        </div>

                        <div class="insight-content">

                            <strong>
                                ${escapeHTML(
                                    insight.title
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    insight.text
                                )}
                            </p>

                        </div>

                    </div>

                `
            ).join("");

    }


    /* ---------------------------------------------------------
       EXPORT
       --------------------------------------------------------- */

    function exportAnalyticsReport() {

        const data =
            getAnalyticsData();


        const rows = [

            [
                "Metric",
                "Value"
            ],

            [
                "Waste Processed",
                data.totalWaste
            ],

            [
                "CO2 Saved",
                data.analytics.totalCO2Saved ||
                data.totalWaste * 2.3
            ],

            [
                "Revenue",
                data.totalRevenue
            ],

            [
                "Pickup Completion",
                `${data.completionRate}%`
            ],

            [
                "Completed Pickups",
                data.completed
            ],

            [
                "Total Pickups",
                data.pickups.length
            ]

        ];


        const csv =
            rows
                .map(
                    row =>
                        row
                            .map(
                                value =>
                                    `"${String(
                                        value
                                    ).replace(
                                        /"/g,
                                        '""'
                                    )}"`
                            )
                            .join(",")
                )
                .join("\n");


        const blob =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href = url;

        link.download =
            `ekabadi-analytics-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;


        link.click();


        URL.revokeObjectURL(
            url
        );


        if (
            typeof showToast ===
            "function"
        ) {

            showToast(
                "Analytics report exported.",
                "success"
            );

        }

    }


    /* ---------------------------------------------------------
       HELPERS
       --------------------------------------------------------- */

    function normalizeStatus(
        status
    ) {

        return String(
            status || ""
        )
            .toLowerCase()
            .replace(
                /\s+/g,
                "_"
            );

    }


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );

        if (element) {

            element.textContent =
                value;

        }

    }


    function formatNumber(
        value
    ) {

        return Number(
            value || 0
        ).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits:
                    1
            }
        );

    }


    function formatWeightValue(
        value
    ) {

        return `${formatNumber(value)} kg`;

    }


    function formatCurrencyValue(
        value
    ) {

        return `₹${Number(
            value || 0
        ).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits:
                    0
            }
        )}`;

    }


})();