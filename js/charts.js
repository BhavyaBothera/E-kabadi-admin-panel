/* ============================================================
   E-KABADI COMMAND CENTER
   Shared Chart Helpers
   ============================================================ */

(function () {
    "use strict";

    const chartInstances = {};

    function getChartData() {
        return window.EKABADI_DATA?.analytics || {};
    }

    function getLiveCollection(name) {
        if (typeof getCollection === "function") {
            return getCollection(name) || [];
        }
        if (typeof getDatabase === "function") {
            const db = getDatabase();
            return Array.isArray(db?.[name]) ? db[name] : [];
        }
        return Array.isArray(window.EKABADI_DATA?.[name])
            ? window.EKABADI_DATA[name]
            : [];
    }

    function destroyChart(name) {
        if (chartInstances[name]) {
            chartInstances[name].destroy();
            delete chartInstances[name];
        }
    }

    function ensureChartJS(callback) {
        if (typeof Chart !== "undefined") {
            callback();
            return;
        }

        let loader = document.querySelector(
            'script[data-ekabadi-chartjs="true"]'
        );

        if (!loader) {
            loader = document.createElement("script");
            loader.src = "https://cdn.jsdelivr.net/npm/chart.js";
            loader.dataset.ekabadiChartjs = "true";
            loader.onload = callback;
            loader.onerror = () =>
                console.warn("E-Kabadi: Chart.js could not be loaded.");
            document.head.appendChild(loader);
            return;
        }

        loader.addEventListener("load", callback, { once: true });
    }

    function numericArray(values) {
        return (Array.isArray(values) ? values : []).map(value => {
            if (typeof value === "number") return value;
            if (value && typeof value === "object") {
                return Number(
                    value.value ?? value.weight ?? value.waste ?? 0
                ) || 0;
            }
            return Number(value) || 0;
        });
    }

    function labelsFor(values, prefix = "Day") {
        return values.map((_, index) => `${prefix} ${index + 1}`);
    }

    function commonOptions(yCallback) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "rgba(15,23,42,.055)" },
                    border: { display: false },
                    ticks: { callback: yCallback }
                }
            }
        };
    }

    function syncDashboardStats() {
        const dashboard = document.getElementById("statWaste");
        if (!dashboard) return;

        const citizens = getLiveCollection("citizens");
        const collectors = getLiveCollection("collectors");
        const pickups = getLiveCollection("pickups");
        const payments = getLiveCollection("payments");

        const activeCitizens = citizens.filter(
            item => item.status === "active"
        ).length;

        const activeCollectors = collectors.filter(
            item => item.status === "active"
        ).length;

        const completed = pickups.filter(
            item => item.status === "completed"
        );

        const waste = completed.reduce((sum, pickup) => {
            return sum + (pickup.items || []).reduce((itemSum, item) => {
                return itemSum + Number(
                    item.verifiedWeight ??
                    item.estimatedWeight ??
                    0
                );
            }, 0);
        }, 0);

        const revenue = payments
            .filter(item => item.status === "completed")
            .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        const formatNumber = value =>
            Number(value || 0).toLocaleString("en-IN");

        const formatCurrency = value => {
            const number = Number(value || 0);
            if (number >= 100000) return `₹${(number / 100000).toFixed(1)}L`;
            if (number >= 1000) return `₹${(number / 1000).toFixed(1)}K`;
            return `₹${number}`;
        };

        dashboard.textContent = `${formatNumber(waste)} kg`;

        const citizensEl = document.getElementById("statCitizens");
        const collectorsEl = document.getElementById("statCollectors");
        const revenueEl = document.getElementById("statRevenue");

        if (citizensEl) citizensEl.textContent = formatNumber(activeCitizens);
        if (collectorsEl) collectorsEl.textContent = formatNumber(activeCollectors);
        if (revenueEl) revenueEl.textContent = formatCurrency(revenue);

        const progress = document.getElementById("wasteProgress");
        if (progress) {
            progress.style.width = `${Math.min(100, (waste / 20000) * 100)}%`;
        }
    }

    function createWasteChart(days = 7) {
        const canvas = document.getElementById("wasteChart");
        if (!canvas) return;

        ensureChartJS(function () {
            syncDashboardStats();
            destroyChart("waste");

            const source = numericArray(getChartData().dailyWaste);
            const values = source.slice(
                Math.max(0, source.length - Number(days || 7))
            );
            const safeValues = values.length
                ? values
                : [142, 168, 151, 205, 176, 198, 244];

            chartInstances.waste = new Chart(canvas, {
                type: "line",
                data: {
                    labels: labelsFor(safeValues),
                    datasets: [{
                        label: "Waste collected",
                        data: safeValues,
                        borderColor: "#16a34a",
                        backgroundColor: "rgba(34,197,94,.09)",
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        tension: .4,
                        fill: true
                    }]
                },
                options: {
                    ...commonOptions(value => `${value}kg`),
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            displayColors: false,
                            callbacks: {
                                label: context => `${context.raw} kg`
                            }
                        }
                    }
                }
            });

            updateWasteSummary(safeValues);
        });
    }

    function updateWasteSummary(values) {
        const element = document.getElementById("chartWasteTotal");
        if (!element) return;

        const total = values.reduce(
            (sum, value) => sum + Number(value || 0),
            0
        );

        element.textContent = `${total.toLocaleString("en-IN")} kg`;
    }

    function createPickupStatusChart() {
        const canvas = document.getElementById("pickupStatusChart");
        if (!canvas) return;

        ensureChartJS(function () {
            destroyChart("pickup");

            let counts = {
                pending: 0,
                collector_assigned: 0,
                in_progress: 0,
                completed: 0,
                cancelled: 0
            };

            if (typeof getPickupStatusCounts === "function") {
                counts = { ...counts, ...getPickupStatusCounts() };
            } else {
                getLiveCollection("pickups").forEach(pickup => {
                    if (counts[pickup.status] !== undefined) {
                        counts[pickup.status]++;
                    }
                });
            }

            const labels = [
                "Completed",
                "In Progress",
                "Assigned",
                "Pending"
            ];

            const values = [
                Number(counts.completed) || 0,
                Number(counts.in_progress) || 0,
                Number(counts.collector_assigned) || 0,
                Number(counts.pending) || 0
            ];

            const totalElement = document.getElementById("totalPickups");
            if (totalElement) {
                totalElement.textContent = values.reduce(
                    (sum, value) => sum + value,
                    0
                );
            }

            chartInstances.pickup = new Chart(canvas, {
                type: "doughnut",
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            "#16a34a",
                            "#f59e0b",
                            "#3b82f6",
                            "#cbd5e1"
                        ],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "73%",
                    plugins: { legend: { display: false } }
                }
            });

            renderPickupLegend(labels, values);
        });
    }

    function renderPickupLegend(labels, values) {
        const container = document.getElementById("pickupLegend");
        if (!container) return;

        const colors = [
            "#16a34a",
            "#f59e0b",
            "#3b82f6",
            "#cbd5e1"
        ];

        container.innerHTML = labels.map((label, index) => `
            <div class="legend-item">
                <span class="legend-dot" style="background:${colors[index]}"></span>
                <span class="legend-label">${label}</span>
                <strong class="legend-value">${values[index]}</strong>
            </div>
        `).join("");
    }

    function createMaterialChart() {
        const canvas = document.getElementById("materialChart");
        if (!canvas) return;

        ensureChartJS(function () {
            destroyChart("material");

            let totals = {};

            getLiveCollection("pickups").forEach(pickup => {
                (pickup.items || []).forEach(item => {
                    const category = item.category || "Other";
                    const weight = Number(
                        item.verifiedWeight ??
                        item.estimatedWeight ??
                        0
                    ) || 0;
                    totals[category] =
                        (totals[category] || 0) + weight;
                });
            });

            if (!Object.keys(totals).length) {
                totals = getChartData().materialDistribution || {
                    Plastic: 34,
                    Paper: 27,
                    Metal: 16,
                    Glass: 10,
                    "E-Waste": 8,
                    Other: 5
                };
            }

            const labels = Object.keys(totals);
            const values = Object.values(totals).map(Number);

            chartInstances.material = new Chart(canvas, {
                type: "doughnut",
                data: {
                    labels,
                    datasets: [{
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
                        borderColor: "#ffffff",
                        hoverOffset: 5
                    }]
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
                                padding: 13,
                                font: { size: 9 }
                            }
                        }
                    }
                }
            });
        });
    }

    window.EKABADI_CHARTS = {
        createWasteChart,
        createPickupStatusChart,
        createMaterialChart,
        destroyChart
    };

    window.createWasteChart = createWasteChart;
    window.createPickupStatusChart = createPickupStatusChart;
    window.createMaterialChart = createMaterialChart;
})();