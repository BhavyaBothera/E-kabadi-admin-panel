/* ============================================================
   E-KABADI COMMAND CENTER
   Charts
   File: js/charts.js
   ============================================================ */

(function () {

    "use strict";


    if (typeof Chart === "undefined") {

        console.warn(
            "Chart.js is not loaded."
        );

        return;
    }


    const chartInstances = {};


    /* =========================================================
       COMMON OPTIONS
       ========================================================= */

    const commonFont = {
        family: "Inter, system-ui, sans-serif",
        size: 10
    };


    const gridColor =
        "rgba(15, 23, 42, 0.055)";


    function destroyChart(name) {

        if (chartInstances[name]) {

            chartInstances[name].destroy();

            delete chartInstances[name];
        }
    }


    /* =========================================================
       WASTE LINE CHART
       ========================================================= */

    function createWasteChart(days = 7) {

        const canvas =
            document.getElementById(
                "wasteChart"
            );

        if (!canvas) return;


        destroyChart("waste");


        const analytics =
            window.EKABADI_DATA?.analytics;


        let labels = [];
        let values = [];


        if (
            analytics &&
            analytics.dailyWaste
        ) {

            const source =
                analytics.dailyWaste;

            const selected =
                source.slice(
                    Math.max(
                        0,
                        source.length - days
                    )
                );

            labels =
                selected.map(item =>
                    item.date || item.day
                );

            values =
                selected.map(item =>
                    Number(
                        item.value ||
                        item.weight ||
                        item.waste ||
                        0
                    )
                );

        }


        if (!values.length) {

            labels = [
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
                "Sun"
            ];

            values = [
                142,
                168,
                151,
                205,
                176,
                198,
                244
            ];
        }


        chartInstances.waste =
            new Chart(
                canvas,
                {
                    type: "line",

                    data: {
                        labels,

                        datasets: [
                            {
                                label:
                                    "Waste collected",

                                data: values,

                                borderColor:
                                    "#16a34a",

                                backgroundColor:
                                    "rgba(34,197,94,.09)",

                                borderWidth: 2,

                                pointRadius: 0,

                                pointHoverRadius: 5,

                                tension: .4,

                                fill: true
                            }
                        ]
                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        interaction: {
                            intersect: false,
                            mode: "index"
                        },

                        plugins: {

                            legend: {
                                display: false
                            },

                            tooltip: {
                                backgroundColor:
                                    "#0f172a",

                                padding: 10,

                                titleFont: {
                                    size: 10
                                },

                                bodyFont: {
                                    size: 11
                                },

                                displayColors: false,

                                callbacks: {

                                    label: context =>
                                        `${context.raw} kg`
                                }
                            }

                        },

                        scales: {

                            x: {

                                grid: {
                                    display: false
                                },

                                border: {
                                    display: false
                                },

                                ticks: {
                                    font: commonFont,
                                    color: "#94a3b8"
                                }
                            },

                            y: {

                                beginAtZero: true,

                                grid: {
                                    color: gridColor
                                },

                                border: {
                                    display: false
                                },

                                ticks: {

                                    font: commonFont,

                                    color: "#94a3b8",

                                    callback: value =>
                                        `${value}kg`
                                }
                            }

                        }
                    }
                }
            );


        updateWasteSummary(values);
    }


    function updateWasteSummary(values) {

        const total =
            values.reduce(
                (sum, value) =>
                    sum + Number(value || 0),
                0
            );


        const element =
            document.getElementById(
                "chartWasteTotal"
            );


        if (element) {

            element.textContent =
                `${formatNumber(total)} kg`;
        }
    }


    /* =========================================================
       PICKUP DONUT
       ========================================================= */

    function createPickupStatusChart() {

        const canvas =
            document.getElementById(
                "pickupStatusChart"
            );

        if (!canvas) return;


        destroyChart("pickup");


        let counts = {

            completed: 0,

            in_progress: 0,

            collector_assigned: 0,

            pending: 0
        };


        if (
            typeof getPickupStatusCounts ===
            "function"
        ) {

            const result =
                getPickupStatusCounts();

            counts = {
                ...counts,
                ...result
            };
        }


        const labels = [
            "Completed",
            "In Progress",
            "Assigned",
            "Pending"
        ];


        const values = [
            counts.completed || 0,
            counts.in_progress || 0,
            counts.collector_assigned || 0,
            counts.pending || 0
        ];


        const total =
            values.reduce(
                (sum, value) =>
                    sum + value,
                0
            );


        const totalElement =
            document.getElementById(
                "totalPickups"
            );


        if (totalElement) {
            totalElement.textContent =
                total;
        }


        chartInstances.pickup =
            new Chart(
                canvas,
                {
                    type: "doughnut",

                    data: {

                        labels,

                        datasets: [
                            {
                                data: values,

                                backgroundColor: [
                                    "#16a34a",
                                    "#f59e0b",
                                    "#3b82f6",
                                    "#cbd5e1"
                                ],

                                borderWidth: 0,

                                hoverOffset: 4
                            }
                        ]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        cutout: "73%",

                        plugins: {

                            legend: {
                                display: false
                            },

                            tooltip: {
                                backgroundColor:
                                    "#0f172a",

                                displayColors: false,

                                callbacks: {

                                    label: context =>
                                        `${context.label}: ${context.raw}`
                                }
                            }
                        }
                    }
                }
            );


        renderPickupLegend(
            labels,
            values
        );
    }


    function renderPickupLegend(
        labels,
        values
    ) {

        const container =
            document.getElementById(
                "pickupLegend"
            );

        if (!container) return;


        const classes = [
            "completed",
            "progress",
            "assigned",
            "pending"
        ];


        const colors = [
            "#16a34a",
            "#f59e0b",
            "#3b82f6",
            "#cbd5e1"
        ];


        container.innerHTML =
            labels.map(
                (label, index) => `

                    <div class="legend-item">

                        <span
                            class="legend-dot"
                            style="
                                background:${colors[index]};
                            ">
                        </span>

                        <span class="legend-label">
                            ${label}
                        </span>

                        <strong class="legend-value">
                            ${values[index]}
                        </strong>

                    </div>
                `
            ).join("");
    }


    /* =========================================================
       MATERIAL DOUGHNUT
       ========================================================= */

    function createMaterialChart() {

        const canvas =
            document.getElementById(
                "materialChart"
            );

        if (!canvas) return;


        destroyChart("material");


        let materialData = [];


        if (
            typeof getMaterialTotals ===
            "function"
        ) {

            materialData =
                getMaterialTotals() || [];
        }


        if (
            !Array.isArray(materialData) ||
            !materialData.length
        ) {

            materialData = [

                {
                    name: "Plastic",
                    value: 32
                },

                {
                    name: "Paper",
                    value: 24
                },

                {
                    name: "Metal",
                    value: 19
                },

                {
                    name: "Glass",
                    value: 13
                },

                {
                    name: "E-Waste",
                    value: 12
                }

            ];
        }


        const labels =
            materialData.map(
                item =>
                    item.name ||
                    item.material ||
                    "Other"
            );


        const values =
            materialData.map(
                item =>
                    Number(
                        item.value ||
                        item.total ||
                        item.weight ||
                        0
                    )
            );


        chartInstances.material =
            new Chart(
                canvas,
                {
                    type: "doughnut",

                    data: {

                        labels,

                        datasets: [
                            {
                                data: values,

                                backgroundColor: [
                                    "#16a34a",
                                    "#3b82f6",
                                    "#f59e0b",
                                    "#8b5cf6",
                                    "#06b6d4",
                                    "#f43f5e",
                                    "#64748b"
                                ],

                                borderWidth: 2,

                                borderColor:
                                    "#ffffff",

                                hoverOffset: 5
                            }
                        ]
                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        cutout: "58%",

                        plugins: {

                            legend: {

                                position: "bottom",

                                labels: {

                                    usePointStyle: true,

                                    pointStyle: "circle",

                                    padding: 13,

                                    font: {
                                        size: 9
                                    }
                                }
                            },

                            tooltip: {

                                backgroundColor:
                                    "#0f172a",

                                callbacks: {

                                    label: context => {

                                        const total =
                                            values.reduce(
                                                (a,b) =>
                                                    a + b,
                                                0
                                            );

                                        const percentage =
                                            total
                                                ? (
                                                    context.raw /
                                                    total *
                                                    100
                                                ).toFixed(1)
                                                : 0;

                                        return `${context.label}: ${percentage}%`;
                                    }

                                }
                            }
                        }
                    }
                }
            );
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.EKABADI_CHARTS = {

        createWasteChart,

        createPickupStatusChart,

        createMaterialChart,

        destroyChart

    };


    window.createWasteChart =
        createWasteChart;

    window.createPickupStatusChart =
        createPickupStatusChart;

    window.createMaterialChart =
        createMaterialChart;


})();