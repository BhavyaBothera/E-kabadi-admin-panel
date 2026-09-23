/* =========================================================
   E-KABAADI PLATFORM — Collector Partner
   Support & Roadside Incident Controller
   File: frontend/collector/js/support.js
   
   RULE: Connects partner roadside issues directly to Admin issues
   ========================================================= */

(function () {
    "use strict";

    window.triggerSos = function () {
        showToast("Connecting to 24/7 Fleet Emergency SOS Desk (+91 99999 11222)...", "info");
    };

    let isSubmittingIncident = false;
    window.submitPartnerTicket = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (isSubmittingIncident) return;

        const cat = document.getElementById("pCat")?.value;
        const order = document.getElementById("pOrder")?.value;
        const desc = document.getElementById("pDesc")?.value;

        if (!cat || !desc) {
            showToast("Please select incident category and enter description.", "warning");
            return;
        }

        isSubmittingIncident = true;
        const collector = window.currentCollector || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { id: "USR-COL-001", name: "Ramesh Kumar" };

        if (typeof supportService !== "undefined") {
            const ticket = supportService.createTicket({
                raisedBy: collector.name || "Ramesh Kumar",
                userId: collector.id || "USR-COL-001",
                role: "collector",
                pickupId: order ? order.replace("#", "") : null,
                category: cat,
                title: `${cat} - ${order || "General"}`,
                description: desc,
                priority: "high"
            });

            document.getElementById("pDesc").value = "";
            showToast(`Incident #${ticket.id} transmitted to Fleet Control & Super Admin!`, "success");
        }
        setTimeout(() => { isSubmittingIncident = false; }, 800);
    };
})();
