/* =========================================================
   E-KABAADI PLATFORM — Collector Partner
   Partner Profile & Fleet Settings Controller
   File: frontend/collector/js/profile.js
   ========================================================= */

(function () {
    "use strict";

    function getActiveCollectorId() {
        const currentUser = (typeof authService !== "undefined" ? authService.getCurrentUser() : null);
        if (currentUser && currentUser.collectorId) return currentUser.collectorId;
        const currentCollector = window.currentCollector || (typeof storageService !== "undefined" ? storageService.get("current_collector") : null);
        if (currentCollector && currentCollector.id) return currentCollector.id;
        return "COL-2001";
    }

    function populateCollectorProfile() {
        if (typeof collectorService === "undefined") return;

        const collectorId = getActiveCollectorId();
        const profile = collectorService.getProfile(collectorId);
        if (!profile) return;

        const displayName = document.getElementById("colDisplayName");
        if (displayName) displayName.textContent = profile.name || "Ramesh Kumar";

        const vehicleBadge = document.getElementById("colVehicleBadge");
        if (vehicleBadge) {
            const vType = profile.vehicleType || profile.vehicleModel || "Three-Wheeler Auto";
            const vNum = profile.vehicleNumber || "UP 16 AB 1234";
            vehicleBadge.textContent = `${vType} (${vNum})`;
        }

        const vehicleModel = document.getElementById("colVehicleModel");
        if (vehicleModel) vehicleModel.value = profile.vehicleType || profile.vehicleModel || "Three-Wheeler Auto / Tempo";

        const vehicleNumber = document.getElementById("colVehicleNumber");
        if (vehicleNumber) vehicleNumber.value = profile.vehicleNumber || "UP 16 AB 1234";

        const scaleId = document.getElementById("colScaleId");
        if (scaleId) scaleId.value = profile.scaleId ? `Essae DS-215 (Scale #${profile.scaleId})` : "Essae DS-215 (Scale #EKB-402)";

        const radius = document.getElementById("colRadius");
        if (radius) radius.value = String(profile.serviceRadius || "10");
    }

    window.saveCollectorProfile = function () {
        if (typeof collectorService === "undefined") return;
        const collectorId = getActiveCollectorId();

        const vehicleModel = document.getElementById("colVehicleModel")?.value;
        const vehicleNumber = document.getElementById("colVehicleNumber")?.value;
        const scaleId = document.getElementById("colScaleId")?.value;
        const radius = Number(document.getElementById("colRadius")?.value) || 10;

        collectorService.updateProfile(collectorId, {
            vehicleType: vehicleModel,
            vehicleModel: vehicleModel,
            vehicleNumber: vehicleNumber,
            scaleId: scaleId,
            serviceRadius: radius
        });

        const vehicleBadge = document.getElementById("colVehicleBadge");
        if (vehicleBadge && vehicleModel && vehicleNumber) {
            vehicleBadge.textContent = `${vehicleModel} (${vehicleNumber})`;
        }

        if (typeof showToast === "function") {
            showToast("Collector profile & fleet preferences updated successfully!", "success");
        }
    };

    document.addEventListener("DOMContentLoaded", populateCollectorProfile);
})();
