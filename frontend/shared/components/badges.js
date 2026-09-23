/* =========================================================
   E-KABAADI PLATFORM
   Shared Component Helpers (Badges, Empty States, Modals, Loader)
   File: frontend/shared/components/badges.js
   ========================================================= */

(function (root) {
    "use strict";

    const componentHelpers = {
        renderBadge(status) {
            const normalized = (status || "").toLowerCase();
            const map = {
                requested: { label: "Requested", class: "badge-warning" },
                accepted: { label: "Accepted", class: "badge-info" },
                on_the_way: { label: "En Route", class: "badge-info" },
                arrived: { label: "Arrived", class: "badge-warning" },
                collecting: { label: "Weighing", class: "badge-warning" },
                completed: { label: "Completed", class: "badge-success" },
                paid: { label: "Paid", class: "badge-success" },
                active: { label: "Active", class: "badge-success" },
                verified: { label: "Verified", class: "badge-success" },
                pending: { label: "Pending", class: "badge-warning" },
                pending_approval: { label: "Pending Approval", class: "badge-warning" },
                rejected: { label: "Rejected", class: "badge-danger" },
                suspended: { label: "Suspended", class: "badge-danger" },
                cancelled: { label: "Cancelled", class: "badge-danger" },
                open: { label: "Open", class: "badge-danger" },
                investigating: { label: "Investigating", class: "badge-warning" },
                resolved: { label: "Resolved", class: "badge-success" }
            };

            const item = map[normalized] || { label: status, class: "badge-neutral" };
            return `<span class="badge ${item.class}">${item.label}</span>`;
        },

        renderEmptyState(title, description, actionText = null, actionHref = null) {
            return `
                <div class="empty-state" style="text-align:center;padding:48px 24px;background:#fff;border-radius:12px;border:1px dashed var(--border-subtle);">
                    <div style="font-size:42px;margin-bottom:12px;">🍃</div>
                    <h3 style="font-size:18px;font-weight:700;color:var(--forest-deep);margin-bottom:6px;">${title}</h3>
                    <p style="font-size:14px;color:var(--text-muted);max-width:400px;margin:0 auto 18px;">${description}</p>
                    ${actionText && actionHref ? `<a href="${actionHref}" class="btn btn-primary">${actionText}</a>` : ""}
                </div>
            `;
        }
    };

    root.EKABADI_UI = componentHelpers;
})(typeof self !== "undefined" ? self : this);
