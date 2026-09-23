/* =========================================================
   E-KABAADI PLATFORM
   Centralized Scrap Categories & Benchmark Rates
   File: frontend/data/mock-scrap.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.MOCK_SCRAP = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    return [
        {
            id: "SCRAP-01",
            category: "Paper",
            name: "Newspaper & Notebooks",
            code: "PPR-NEWS",
            icon: "📄",
            ratePerKg: 14.0,
            unit: "kg",
            description: "Old newspapers, magazines, notebooks, and office printing papers.",
            recyclability: "100% Recyclable",
            co2SavedPerKg: 2.1
        },
        {
            id: "SCRAP-02",
            category: "Cardboard",
            name: "Corrugated Cardboard (Patti)",
            code: "PPR-CART",
            icon: "📦",
            ratePerKg: 11.5,
            unit: "kg",
            description: "Clean dry cardboard packaging, cartons, brown shipping boxes.",
            recyclability: "100% Recyclable",
            co2SavedPerKg: 1.8
        },
        {
            id: "SCRAP-03",
            category: "Plastic",
            name: "PET Bottles & Rigid Plastics",
            code: "PLS-PET",
            icon: "♻️",
            ratePerKg: 18.0,
            unit: "kg",
            description: "Beverage bottles, milk pouches, plastic tubs, shampoo bottles.",
            recyclability: "Grade 1 & 2 Polyethylene",
            co2SavedPerKg: 2.8
        },
        {
            id: "SCRAP-04",
            category: "Metal",
            name: "Iron & Heavy Steel Scrap",
            code: "MTL-IRON",
            icon: "🔩",
            ratePerKg: 32.0,
            unit: "kg",
            description: "Pipes, rods, utensils, broken furniture frames, sheet metal.",
            recyclability: "Indefinitely Recyclable",
            co2SavedPerKg: 4.2
        },
        {
            id: "SCRAP-05",
            category: "Metal",
            name: "Aluminium & Beverage Cans",
            code: "MTL-ALUM",
            icon: "🥫",
            ratePerKg: 145.0,
            unit: "kg",
            description: "Drink cans, aluminium foils, cookware, frames.",
            recyclability: "95% Energy Saving",
            co2SavedPerKg: 9.1
        },
        {
            id: "SCRAP-06",
            category: "Metal",
            name: "Brass / Pital Scrap",
            code: "MTL-BRSS",
            icon: "🟨",
            ratePerKg: 380.0,
            unit: "kg",
            description: "Pooja utensils, taps, locks, brass valves, decorative hardware.",
            recyclability: "High Value Alloy",
            co2SavedPerKg: 5.5
        },
        {
            id: "SCRAP-07",
            category: "E-waste",
            name: "Electronic Waste & Peripherals",
            code: "EWS-PERI",
            icon: "💻",
            ratePerKg: 45.0,
            unit: "kg",
            description: "Keyboards, chargers, cables, circuit boards, old adapters, CPU parts.",
            recyclability: "Certified Formal Recycler",
            co2SavedPerKg: 6.8
        },
        {
            id: "SCRAP-08",
            category: "Glass",
            name: "Glass Bottles & Jars",
            code: "GLS-BOTT",
            icon: "🫙",
            ratePerKg: 4.5,
            unit: "kg",
            description: "Beer bottles, pickle jars, beverage glass (unbroken).",
            recyclability: "100% Recyclable",
            co2SavedPerKg: 0.9
        }
    ];
}));
