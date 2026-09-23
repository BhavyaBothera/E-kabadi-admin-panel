/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Support & Dispute Controller
   File: frontend/citizen/js/support.js
   
   RULE: Connects directly to Admin Issues via supportService.createTicket()
   ========================================================= */

(function () {
    "use strict";

    function renderTicketsList() {
        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001", id: "USR-CIT-001" };
        const userId = citizen.userId || citizen.id || "USR-CIT-001";

        if (typeof supportService === "undefined") return;

        const tickets = supportService.getTicketsByUser(userId);
        const container = document.getElementById("ticketsList") || document.getElementById("citizenTicketsList");
        if (!container) return;

        if (tickets.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">No active support tickets. Need help? Submit a ticket using the form.</div>`;
            return;
        }

        const statusMap = {
            open: { label: "Under Review", class: "status-pill warning" },
            investigating: { label: "Investigating", class: "status-pill warning" },
            resolved: { label: "Resolved", class: "status-pill success" },
            closed: { label: "Closed", class: "status-pill neutral" }
        };

        container.innerHTML = tickets.map(t => {
            const st = statusMap[t.status] || { label: t.status, class: "status-pill warning" };
            return `
                <div style="background:rgba(247,244,234,0.6);border-radius:10px;padding:14px;border:1px solid var(--border-subtle);margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:6px;">
                        <strong style="color:var(--forest-deep);font-size:14px;">#${t.id}: ${t.title}</strong>
                        <span class="${st.class}">${st.label}</span>
                    </div>
                    <p style="font-size:12px;color:var(--text-muted);line-height:1.4;">
                        ${t.description}
                    </p>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:11px;color:var(--text-muted);">
                        <span>Category: <strong>${t.category}</strong></span>
                        <span>Assigned: <strong>${t.assignedTo || "Operations Desk"}</strong></span>
                    </div>
                </div>
            `;
        }).join("");
    }

    let isSubmittingTicket = false;
    function handleTicketSubmit(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (isSubmittingTicket) return;

        const order = (document.getElementById("ticketOrder")?.value || "").trim();
        const cat = document.getElementById("ticketCategory")?.value || "General Inquiry";
        const subj = (document.getElementById("ticketSubject")?.value || "").trim();
        const body = (document.getElementById("ticketBody")?.value || "").trim();

        if (!subj || !body) {
            showToast("Please provide both subject and explanation.", "warning");
            return;
        }

        isSubmittingTicket = true;
        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001", name: "Aarav Sharma" };

        if (typeof supportService !== "undefined") {
            const ticket = supportService.createTicket({
                raisedBy: citizen.name || "Aarav Sharma",
                citizenId: citizen.citizenId || "CIT-1001",
                userId: citizen.userId || citizen.id || "USR-CIT-001",
                role: "citizen",
                category: cat,
                title: subj,
                description: order ? `[Order ${order}] ${body}` : body,
                priority: "medium"
            });

            const form = document.getElementById("supportTicketForm");
            if (form) form.reset();

            showToast(`Ticket #${ticket.id} raised successfully! Tracked by Admin Command Center.`, "success");
            renderTicketsList();
        }
        setTimeout(() => { isSubmittingTicket = false; }, 800);
    }

    window.submitTicket = handleTicketSubmit;
    window.toggleFaq = function (el) {
        if (el) el.classList.toggle("open");
    };

    document.addEventListener("DOMContentLoaded", () => {
        const form = document.getElementById("supportTicketForm") || document.getElementById("citizenComplaintForm");
        if (form) form.addEventListener("submit", handleTicketSubmit);
        renderTicketsList();
    });

    window.addEventListener("ekabadi:statechange", renderTicketsList);
})();
