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
        if (typeof getCollection === "function") return getCollection(name) || [];
        if (typeof getDatabase === "function") {
            const db = getDatabase();
            return Array.isArray(db?.[name]) ? db[name] : [];
        }
        return Array.isArray(window.EKABADI_DATA?.[name]) ? window.EKABADI_DATA[name] : [];
    }

    function destroyChart(name) {
        if (chartInstances[name]) {
            chartInstances[name].destroy();
            delete chartInstances[name];
        }
    }

    function ensureChartJS(callback) {
        if (typeof Chart !== "undefined") return callback();
        let loader = document.querySelector('script[data-ekabadi-chartjs="true"]');
        if (!loader) {
            loader = document.createElement("script");
            loader.src = "https://cdn.jsdelivr.net/npm/chart.js";
            loader.dataset.ekabadiChartjs = "true";
            loader.onload = callback;
            loader.onerror = () => console.warn("E-Kabadi: Chart.js could not be loaded.");
            document.head.appendChild(loader);
        } else {
            loader.addEventListener("load", callback, { once: true });
        }
    }

    function numericArray(values) {
        return (Array.isArray(values) ? values : []).map(value => {
            if (typeof value === "number") return value;
            if (value && typeof value === "object") return Number(value.value ?? value.weight ?? value.waste ?? 0) || 0;
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
            interaction: { intersect: false, mode: "index" },
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, border: { display: false } },
                y: { beginAtZero: true, grid: { color: "rgba(15,23,42,.055)" }, border: { display: false }, ticks: { callback: yCallback } }
            }
        };
    }

    function syncDashboardStats() {
        if (!document.getElementById("statWaste")) return;
        const citizens = getLiveCollection("citizens");
        const collectors = getLiveCollection("collectors");
        const pickups = getLiveCollection("pickups");
        const payments = getLiveCollection("payments");
        const activeCitizens = citizens.filter(x => x.status === "active").length;
        const activeCollectors = collectors.filter(x => x.status === "active").length;
        const completed = pickups.filter(x => x.status === "completed");
        const waste = completed.reduce((sum, p) => sum + (p.items || []).reduce((s, i) => s + Number(i.verifiedWeight ?? i.estimatedWeight ?? 0), 0), 0);
        const revenue = payments.filter(x => x.status === "completed").reduce((s, x) => s + (Number(x.amount) || 0), 0);
        const num = x => Number(x || 0).toLocaleString("en-IN");
        const money = x => x >= 100000 ? `₹${(x / 100000).toFixed(1)}L` : x >= 1000 ? `₹${(x / 1000).toFixed(1)}K` : `₹${x}`;
        document.getElementById("statWaste").textContent = `${num(waste)} kg`;
        const c = document.getElementById("statCitizens"), col = document.getElementById("statCollectors"), r = document.getElementById("statRevenue");
        if (c) c.textContent = num(activeCitizens);
        if (col) col.textContent = num(activeCollectors);
        if (r) r.textContent = money(revenue);
        const progress = document.getElementById("wasteProgress");
        if (progress) progress.style.width = `${Math.min(100, waste / 200)}%`;
    }

    function createWasteChart(days = 7) {
        const canvas = document.getElementById("wasteChart");
        if (!canvas) return;
        ensureChartJS(() => {
            syncDashboardStats();
            destroyChart("waste");
            const source = numericArray(getChartData().dailyWaste);
            const values = source.slice(Math.max(0, source.length - Number(days || 7)));
            const safe = values.length ? values : [142, 168, 151, 205, 176, 198, 244];
            chartInstances.waste = new Chart(canvas, {
                type: "line",
                data: { labels: labelsFor(safe), datasets: [{ label: "Waste collected", data: safe, borderColor: "#16a34a", backgroundColor: "rgba(34,197,94,.09)", borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: .4, fill: true }] },
                options: { ...commonOptions(v => `${v}kg`), plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: c => `${c.raw} kg` } } } }
            });
            const total = safe.reduce((s, v) => s + Number(v || 0), 0);
            const summary = document.getElementById("chartWasteTotal");
            if (summary) summary.textContent = `${total.toLocaleString("en-IN")} kg`;
        });
    }

    function createPickupStatusChart() {
        const canvas = document.getElementById("pickupStatusChart");
        if (!canvas) return;
        ensureChartJS(() => {
            destroyChart("pickup");
            const counts = { pending: 0, collector_assigned: 0, in_progress: 0, completed: 0 };
            getLiveCollection("pickups").forEach(p => {
                if (counts[p.status] !== undefined) counts[p.status]++;
            });
            const labels = ["Completed", "In Progress", "Assigned", "Pending"];
            const values = [counts.completed, counts.in_progress, counts.collector_assigned, counts.pending];
            const total = values.reduce((s, v) => s + v, 0);
            const totalEl = document.getElementById("totalPickups");
            if (totalEl) totalEl.textContent = total;
            chartInstances.pickup = new Chart(canvas, {
                type: "doughnut",
                data: { labels, datasets: [{ data: values, backgroundColor: ["#16a34a", "#f59e0b", "#3b82f6", "#cbd5e1"], borderWidth: 0, hoverOffset: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: "73%", plugins: { legend: { display: false } } }
            });
            renderPickupLegend(labels, values);
        });
    }

    function renderPickupLegend(labels, values) {
        const container = document.getElementById("pickupLegend");
        if (!container) return;
        const colors = ["#16a34a", "#f59e0b", "#3b82f6", "#cbd5e1"];
        container.innerHTML = labels.map((label, i) => `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span><span class="legend-label">${label}</span><strong class="legend-value">${values[i]}</strong></div>`).join("");
    }

    function createMaterialChart() {
        const canvas = document.getElementById("materialChart");
        if (!canvas) return;
        ensureChartJS(() => {
            destroyChart("material");
            const totals = {};
            getLiveCollection("pickups").forEach(p => (p.items || []).forEach(i => {
                const category = i.category || "Other";
                const weight = Number(i.verifiedWeight ?? i.estimatedWeight ?? 0) || 0;
                totals[category] = (totals[category] || 0) + weight;
            }));
            const data = Object.keys(totals).length ? totals : (getChartData().materialDistribution || { Plastic: 34, Paper: 27, Metal: 16, Glass: 10, "E-Waste": 8, Other: 5 });
            const labels = Object.keys(data), values = Object.values(data).map(Number);
            chartInstances.material = new Chart(canvas, {
                type: "doughnut",
                data: { labels, datasets: [{ data: values, backgroundColor: ["#16a34a", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4", "#f43f5e", "#64748b"], borderWidth: 2, borderColor: "#ffffff", hoverOffset: 5 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: "58%", plugins: { legend: { position: "bottom", labels: { usePointStyle: true, padding: 13, font: { size: 9 } } } } }
            });
        });
    }

    window.EKABADI_CHARTS = { createWasteChart, createPickupStatusChart, createMaterialChart, destroyChart };
    window.createWasteChart = createWasteChart;
    window.createPickupStatusChart = createPickupStatusChart;
    window.createMaterialChart = createMaterialChart;
})();