/* ============================================================
   E-KABADI COMMAND CENTER
   Collector Management
   File: js/collectors.js
   ============================================================ */

(function () {

    "use strict";


    /* =========================================================
       STATE
       ========================================================= */

    const state = {

        collectors: [],

        filtered: [],

        currentPage: 1,

        pageSize: 7,

        search: "",

        status: "all",

        verification: "all",

        sort: "performance"

    };


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function initializeCollectors() {

        loadCollectors();

        updateStats();

        bindEvents();

        renderTable();

        updateVerificationAlert();

    }


    /* =========================================================
       LOAD
       ========================================================= */

    function loadCollectors() {

        if (
            typeof storageGetCollectors ===
            "function"
        ) {

            state.collectors =
                storageGetCollectors() || [];

        } else {

            state.collectors =
                window.EKABADI_DATA?.collectors ||
                [];

        }

    }


    /* =========================================================
       FILTER
       ========================================================= */

    function filterCollectors() {

        const query =
            state.search
                .toLowerCase()
                .trim();


        state.filtered =
            state.collectors.filter(
                collector => {

                    const searchable = [

                        collector.name,

                        collector.id,

                        collector.email,

                        collector.phone,

                        collector.company,

                        collector.businessName,

                        collector.area,

                        collector.location,

                        collector.vehicle,

                        collector.vehicleNumber

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    const matchesSearch =
                        !query ||
                        searchable.includes(
                            query
                        );


                    const matchesStatus =
                        state.status === "all" ||
                        String(
                            collector.status ||
                            ""
                        ).toLowerCase() ===
                        state.status;


                    const verified =
                        collector.verified === true ||
                        collector.verificationStatus ===
                            "verified";


                    const matchesVerification =
                        state.verification ===
                            "all" ||
                        (
                            state.verification ===
                                "verified"
                                ? verified
                                : !verified
                        );


                    return (
                        matchesSearch &&
                        matchesStatus &&
                        matchesVerification
                    );

                }
            );


        sortCollectors();


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    state.filtered.length /
                    state.pageSize
                )
            );


        if (
            state.currentPage >
            totalPages
        ) {

            state.currentPage =
                totalPages;

        }

    }


    /* =========================================================
       SORT
       ========================================================= */

    function sortCollectors() {

        switch (state.sort) {

            case "name":

                state.filtered.sort(
                    (a, b) =>
                        String(
                            a.name || ""
                        ).localeCompare(
                            String(
                                b.name || ""
                            )
                        )
                );

                break;


            case "rating":

                state.filtered.sort(
                    (a, b) =>
                        Number(
                            b.rating || 0
                        ) -
                        Number(
                            a.rating || 0
                        )
                );

                break;


            case "pickups":

                state.filtered.sort(
                    (a, b) =>
                        Number(
                            b.completedPickups ||
                            b.totalPickups ||
                            0
                        ) -
                        Number(
                            a.completedPickups ||
                            a.totalPickups ||
                            0
                        )
                );

                break;


            default:

                state.filtered.sort(
                    (a, b) =>
                        Number(
                            b.completionRate ||
                            b.completion ||
                            0
                        ) -
                        Number(
                            a.completionRate ||
                            a.completion ||
                            0
                        )
                );

        }

    }


    /* =========================================================
       RENDER TABLE
       ========================================================= */

    function renderTable() {

        filterCollectors();


        const tbody =
            document.getElementById(
                "collectorsTableBody"
            );


        if (!tbody) return;


        const start =
            (
                state.currentPage -
                1
            ) *
            state.pageSize;


        const pageItems =
            state.filtered.slice(
                start,
                start +
                    state.pageSize
            );


        if (!pageItems.length) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        class="table-empty-cell">

                        <div class="empty-state">

                            <div class="empty-state-icon">
                                🚚
                            </div>

                            <h3>
                                No collectors found
                            </h3>

                            <p>
                                Try changing your
                                search or filters.
                            </p>

                        </div>

                    </td>

                </tr>

            `;

            updateResults();

            renderPagination();

            return;
        }


        tbody.innerHTML =
            pageItems
                .map(
                    renderCollectorRow
                )
                .join("");


        updateResults();

        renderPagination();

        bindRowEvents();
    }


    function renderCollectorRow(
        collector
    ) {

        const name =
            collector.name ||
            "Unknown Collector";


        const initials =
            typeof getInitials ===
            "function"
                ? getInitials(name)
                : name
                    .substring(0, 2)
                    .toUpperCase();


        const company =
            collector.company ||
            collector.businessName ||
            "Independent Collector";


        const vehicle =
            collector.vehicle ||
            collector.vehicleType ||
            "Vehicle";


        const vehicleNumber =
            collector.vehicleNumber ||
            collector.registrationNumber ||
            "Not assigned";


        const totalPickups =
            Number(
                collector.totalPickups ||
                0
            );


        const completed =
            Number(
                collector.completedPickups ||
                collector.completed ||
                0
            );


        const completionRate =
            Number(
                collector.completionRate ||
                collector.completion ||
                (
                    totalPickups
                        ? (
                            completed /
                            totalPickups *
                            100
                        )
                        : 0
                )
            );


        const rating =
            Number(
                collector.rating ||
                0
            );


        const verified =
            collector.verified === true ||
            collector.verificationStatus ===
                "verified";


        const status =
            collector.status ||
            "active";


        return `

            <tr
                data-id="${escapeAttribute(
                    collector.id
                )}">

                <!-- Collector -->

                <td>

                    <div class="table-user">

                        <div class="table-avatar collector-avatar">
                            ${initials}
                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(name)}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    collector.id ||
                                    "No ID"
                                )}
                            </span>

                        </div>

                    </div>

                </td>


                <!-- Company -->

                <td>

                    <div class="location-cell">

                        <strong>
                            ${escapeHTML(company)}
                        </strong>

                        <span>
                            ${
                                escapeHTML(
                                    collector.area ||
                                    collector.location ||
                                    "No area"
                                )
                            }
                        </span>

                    </div>

                </td>


                <!-- Vehicle -->

                <td>

                    <div class="vehicle-cell">

                        <strong>
                            ${escapeHTML(vehicle)}
                        </strong>

                        <span>
                            ${escapeHTML(
                                vehicleNumber
                            )}
                        </span>

                    </div>

                </td>


                <!-- Pickups -->

                <td>

                    <strong>
                        ${formatNumber(
                            totalPickups
                        )}
                    </strong>

                    <span class="table-subtext">
                        ${
                            formatNumber(
                                completed
                            )
                        } completed
                    </span>

                </td>


                <!-- Completion -->

                <td>

                    <div class="completion-cell">

                        <div class="completion-header">

                            <strong>
                                ${completionRate.toFixed(
                                    1
                                )}%
                            </strong>

                        </div>

                        <div class="completion-bar">

                            <span
                                style="
                                    width:${Math.min(
                                        100,
                                        completionRate
                                    )}%;
                                ">
                            </span>

                        </div>

                    </div>

                </td>


                <!-- Rating -->

                <td>

                    <div class="rating-cell">

                        <span>
                            ★
                        </span>

                        <strong>
                            ${
                                rating
                                    ? rating.toFixed(1)
                                    : "—"
                            }
                        </strong>

                    </div>

                </td>


                <!-- Verification -->

                <td>

                    ${
                        verified
                            ? `
                                <span class="
                                    verification-badge
                                    verified
                                ">
                                    ✓ Verified
                                </span>
                              `
                            : `
                                <span class="
                                    verification-badge
                                    pending
                                ">
                                    ● Pending
                                </span>
                              `
                    }

                </td>


                <!-- Status -->

                <td>

                    ${
                        typeof statusBadge ===
                        "function"
                            ? statusBadge(
                                status
                            )
                            : status
                    }

                </td>


                <!-- Actions -->

                <td>

                    <div class="table-actions">

                        <button
                            class="icon-action view-collector"
                            data-id="${escapeAttribute(
                                collector.id
                            )}"
                            title="View collector">
                            👁
                        </button>

                        <button
                            class="icon-action more-collector"
                            data-id="${escapeAttribute(
                                collector.id
                            )}"
                            title="Manage collector">
                            ⋮
                        </button>

                    </div>

                </td>

            </tr>

        `;
    }


    /* =========================================================
       STATS
       ========================================================= */

    function updateStats() {

        const collectors =
            state.collectors;


        const total =
            collectors.length;


        const active =
            collectors.filter(
                collector =>
                    collector.status ===
                    "active"
            ).length;


        const pending =
            collectors.filter(
                collector =>
                    collector.status ===
                    "pending" ||
                    collector.verificationStatus ===
                    "pending"
            ).length;


        const ratings =
            collectors
                .map(
                    collector =>
                        Number(
                            collector.rating ||
                            0
                        )
                )
                .filter(
                    rating =>
                        rating > 0
                );


        const averageRating =
            ratings.length
                ? ratings.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) / ratings.length
                : 0;


        setText(
            "collectorTotal",
            formatNumber(total)
        );


        setText(
            "collectorActive",
            formatNumber(active)
        );


        setText(
            "collectorPending",
            formatNumber(pending)
        );


        setText(
            "collectorRating",
            averageRating.toFixed(1)
        );
    }


    /* =========================================================
       VERIFICATION ALERT
       ========================================================= */

    function updateVerificationAlert() {

        const alert =
            document.getElementById(
                "verificationAlert"
            );


        const text =
            document.getElementById(
                "verificationAlertText"
            );


        if (!alert) return;


        const pending =
            state.collectors.filter(
                collector =>
                    collector.status ===
                    "pending" ||
                    collector.verified ===
                    false
            ).length;


        if (!pending) {

            alert.style.display =
                "none";

            return;
        }


        alert.style.display =
            "flex";


        if (text) {

            text.textContent =
                `${pending} collector${
                    pending === 1
                        ? ""
                        : "s"
                } ${
                    pending === 1
                        ? "is"
                        : "are"
                } waiting for document verification.`;
        }
    }


    /* =========================================================
       PAGINATION
       ========================================================= */

    function renderPagination() {

        const container =
            document.getElementById(
                "collectorPagination"
            );


        if (!container) return;


        const totalPages =
            Math.ceil(
                state.filtered.length /
                state.pageSize
            );


        if (totalPages <= 1) {

            container.innerHTML = "";

            return;
        }


        let html = `

            <div class="pagination">

                <button
                    class="pagination-btn"
                    data-page="${
                        state.currentPage - 1
                    }"
                    ${
                        state.currentPage <= 1
                            ? "disabled"
                            : ""
                    }>
                    ←
                </button>

        `;


        for (
            let i = 1;
            i <= totalPages;
            i++
        ) {

            html += `

                <button
                    class="
                        pagination-btn
                        ${
                            i ===
                            state.currentPage
                                ? "active"
                                : ""
                        }
                    "
                    data-page="${i}">
                    ${i}
                </button>

            `;
        }


        html += `

                <button
                    class="pagination-btn"
                    data-page="${
                        state.currentPage + 1
                    }"
                    ${
                        state.currentPage >=
                        totalPages
                            ? "disabled"
                            : ""
                    }>
                    →
                </button>

            </div>

        `;


        container.innerHTML =
            html;


        container
            .querySelectorAll(
                "[data-page]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const page =
                            Number(
                                button.dataset.page
                            );


                        if (
                            page < 1 ||
                            page > totalPages
                        ) {
                            return;
                        }


                        state.currentPage =
                            page;

                        renderTable();

                    }
                );

            });
    }


    function updateResults() {

        const element =
            document.getElementById(
                "collectorResults"
            );


        if (!element) return;


        const total =
            state.filtered.length;


        if (!total) {

            element.textContent =
                "Showing 0 collectors";

            return;
        }


        const start =
            (
                state.currentPage -
                1
            ) *
            state.pageSize +
            1;


        const end =
            Math.min(
                state.currentPage *
                state.pageSize,
                total
            );


        element.textContent =
            `Showing ${start}-${end} of ${total} collectors`;
    }


    /* =========================================================
       VIEW COLLECTOR
       ========================================================= */

    function viewCollector(id) {

        const collector =
            findCollector(id);


        if (!collector) {

            showToast(
                "Collector could not be found.",
                "error",
                "Error"
            );

            return;
        }


        const name =
            collector.name ||
            "Collector";


        const completed =
            Number(
                collector.completedPickups ||
                collector.completed ||
                0
            );


        const total =
            Number(
                collector.totalPickups ||
                0
            );


        const completion =
            Number(
                collector.completionRate ||
                collector.completion ||
                (
                    total
                        ? completed /
                            total *
                            100
                        : 0
                )
            );


        const rating =
            Number(
                collector.rating ||
                0
            );


        const verified =
            collector.verified === true ||
            collector.verificationStatus ===
                "verified";


        openModal({

            title: name,

            eyebrow:
                collector.id ||
                "COLLECTOR PROFILE",

            description:
                "Collection partner profile and operational performance.",

            size: "medium",

            content: `

                <div class="collector-profile">

                    <div class="profile-hero">

                        <div class="
                            profile-avatar
                            collector-profile-avatar
                        ">
                            ${
                                getInitials(
                                    name
                                )
                            }
                        </div>

                        <div>

                            <h3>
                                ${escapeHTML(name)}
                            </h3>

                            <p>
                                ${
                                    escapeHTML(
                                        collector.company ||
                                        collector.businessName ||
                                        "Independent Collector"
                                    )
                                }
                            </p>

                            <div class="profile-statuses">

                                ${
                                    statusBadge(
                                        collector.status ||
                                        "active"
                                    )
                                }

                                ${
                                    verified
                                        ? `
                                            <span class="
                                                verification-badge
                                                verified
                                            ">
                                                ✓ Verified
                                            </span>
                                          `
                                        : `
                                            <span class="
                                                verification-badge
                                                pending
                                            ">
                                                ● Pending
                                            </span>
                                          `
                                }

                            </div>

                        </div>

                    </div>


                    <!-- Performance -->

                    <div class="profile-stats">

                        <div>

                            <strong>
                                ${completed}
                            </strong>

                            <span>
                                Completed
                            </span>

                        </div>


                        <div>

                            <strong>
                                ${total}
                            </strong>

                            <span>
                                Total pickups
                            </span>

                        </div>


                        <div>

                            <strong>
                                ${completion.toFixed(1)}%
                            </strong>

                            <span>
                                Completion
                            </span>

                        </div>


                        <div>

                            <strong>
                                ⭐ ${
                                    rating
                                        ? rating.toFixed(1)
                                        : "—"
                                }
                            </strong>

                            <span>
                                Rating
                            </span>

                        </div>

                    </div>


                    <!-- Details -->

                    <div class="profile-details">

                        <div class="profile-detail">

                            <span>
                                Company
                            </span>

                            <strong>
                                ${
                                    escapeHTML(
                                        collector.company ||
                                        collector.businessName ||
                                        "Independent"
                                    )
                                }
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span>
                                Area
                            </span>

                            <strong>
                                ${
                                    escapeHTML(
                                        collector.area ||
                                        collector.location ||
                                        "Not assigned"
                                    )
                                }
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span>
                                Vehicle
                            </span>

                            <strong>
                                ${
                                    escapeHTML(
                                        collector.vehicle ||
                                        collector.vehicleType ||
                                        "Not provided"
                                    )
                                }
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span>
                                Registration
                            </span>

                            <strong>
                                ${
                                    escapeHTML(
                                        collector.vehicleNumber ||
                                        collector.registrationNumber ||
                                        "Not provided"
                                    )
                                }
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span>
                                Phone
                            </span>

                            <strong>
                                ${
                                    escapeHTML(
                                        collector.phone ||
                                        "Not provided"
                                    )
                                }
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span>
                                Email
                            </span>

                            <strong>
                                ${
                                    escapeHTML(
                                        collector.email ||
                                        "Not provided"
                                    )
                                }
                            </strong>

                        </div>

                    </div>

                </div>

            `,

            footer: `

                <button
                    class="btn btn-secondary"
                    onclick="closeModal()">
                    Close
                </button>

                <button
                    class="btn btn-primary"
                    id="collectorManageBtn">
                    Manage Collector
                </button>

            `,

            onOpen: () => {

                const button =
                    document.getElementById(
                        "collectorManageBtn"
                    );


                if (button) {

                    button.addEventListener(
                        "click",
                        () => {

                            closeModal();

                            setTimeout(
                                () =>
                                    openCollectorActions(
                                        id
                                    ),
                                220
                            );

                        }
                    );
                }

            }

        });
    }


    /* =========================================================
       COLLECTOR ACTIONS
       ========================================================= */

    function openCollectorActions(id) {

        const collector =
            findCollector(id);


        if (!collector) return;


        const verified =
            collector.verified === true ||
            collector.verificationStatus ===
                "verified";


        const suspended =
            collector.status ===
            "suspended";


        openModal({

            title:
                `Manage ${collector.name}`,

            eyebrow:
                collector.id,

            size: "small",

            content: `

                <div class="action-menu">

                    <button
                        class="action-menu-item"
                        id="collectorViewAction">

                        <span>👁</span>

                        <div>

                            <strong>
                                View Profile
                            </strong>

                            <small>
                                See collector performance
                            </small>

                        </div>

                    </button>


                    ${
                        !verified
                            ? `
                                <button
                                    class="
                                        action-menu-item
                                        approve-action
                                    "
                                    id="approveCollectorAction">

                                    <span>✓</span>

                                    <div>

                                        <strong>
                                            Approve Collector
                                        </strong>

                                        <small>
                                            Verify documents and activate
                                        </small>

                                    </div>

                                </button>
                              `
                            : ""
                    }


                    ${
                        suspended
                            ? `
                                <button
                                    class="
                                        action-menu-item
                                        approve-action
                                    "
                                    id="activateCollectorAction">

                                    <span>✓</span>

                                    <div>

                                        <strong>
                                            Activate Collector
                                        </strong>

                                        <small>
                                            Restore collection access
                                        </small>

                                    </div>

                                </button>
                              `
                            : `
                                <button
                                    class="
                                        action-menu-item
                                        danger-action
                                    "
                                    id="suspendCollectorAction">

                                    <span>⊘</span>

                                    <div>

                                        <strong>
                                            Suspend Collector
                                        </strong>

                                        <small>
                                            Temporarily disable access
                                        </small>

                                    </div>

                                </button>
                              `
                    }

                </div>

            `,

            footer: `

                <button
                    class="btn btn-secondary"
                    onclick="closeModal()">
                    Cancel
                </button>

            `,

            onOpen: () => {

                const view =
                    document.getElementById(
                        "collectorViewAction"
                    );


                if (view) {

                    view.addEventListener(
                        "click",
                        () => {

                            closeModal();

                            setTimeout(
                                () =>
                                    viewCollector(
                                        id
                                    ),
                                220
                            );

                        }
                    );

                }


                const approve =
                    document.getElementById(
                        "approveCollectorAction"
                    );


                if (approve) {

                    approve.addEventListener(
                        "click",
                        () => {

                            approveCollector(
                                id
                            );

                        }
                    );

                }


                const suspend =
                    document.getElementById(
                        "suspendCollectorAction"
                    );


                if (suspend) {

                    suspend.addEventListener(
                        "click",
                        () => {

                            closeModal();

                            setTimeout(
                                () =>
                                    suspendCollector(
                                        id
                                    ),
                                220
                            );

                        }
                    );

                }


                const activate =
                    document.getElementById(
                        "activateCollectorAction"
                    );


                if (activate) {

                    activate.addEventListener(
                        "click",
                        () => {

                            activateCollector(
                                id
                            );

                        }
                    );

                }

            }

        });
    }


    /* =========================================================
       APPROVE
       ========================================================= */

    function approveCollector(id) {

        const collector =
            findCollector(id);


        if (!collector) return;


        let updated = null;


        if (
            typeof approveCollector ===
            "function"
        ) {
            // Storage function is intentionally
            // called below through its global name.
        }


        if (
            typeof window.approveCollector ===
            "function" &&
            window.approveCollector !==
                approveCollector
        ) {

            updated =
                window.approveCollector(
                    id
                );

        }


        if (!updated) {

            if (
                typeof storageUpdateCollector ===
                "function"
            ) {

                updated =
                    storageUpdateCollector(
                        id,
                        {
                            status: "active",
                            verified: true,
                            verificationStatus:
                                "verified"
                        }
                    );

            }

        }


        closeModal();


        setTimeout(() => {

            loadCollectors();

            updateStats();

            renderTable();

            updateVerificationAlert();


            showToast(
                `${collector.name} has been verified and activated.`,
                "success",
                "Collector Approved"
            );

        }, 220);
    }


    /* =========================================================
       SUSPEND
       ========================================================= */

    async function suspendCollector(id) {

        const collector =
            findCollector(id);


        if (!collector) return;


        const confirmed =
            await confirmAction({

                title:
                    "Suspend collector?",

                message:
                    `${collector.name} will be removed from active collection operations until reactivated.`,

                confirmText:
                    "Suspend Collector",

                cancelText:
                    "Keep Active",

                danger: true

            });


        if (!confirmed) return;


        let updated = null;


        if (
            typeof storageUpdateCollector ===
            "function"
        ) {

            updated =
                storageUpdateCollector(
                    id,
                    {
                        status:
                            "suspended"
                    }
                );

        }


        if (!updated) {

            collector.status =
                "suspended";

        }


        loadCollectors();

        updateStats();

        renderTable();

        updateVerificationAlert();


        showToast(
            `${collector.name} has been suspended.`,
            "success",
            "Collector Updated"
        );
    }


    /* =========================================================
       ACTIVATE
       ========================================================= */

    function activateCollector(id) {

        const collector =
            findCollector(id);


        if (!collector) return;


        let updated = null;


        if (
            typeof storageUpdateCollector ===
            "function"
        ) {

            updated =
                storageUpdateCollector(
                    id,
                    {
                        status:
                            "active"
                    }
                );

        }


        if (!updated) {

            collector.status =
                "active";

        }


        closeModal();


        setTimeout(() => {

            loadCollectors();

            updateStats();

            renderTable();

            updateVerificationAlert();


            showToast(
                `${collector.name} is active again.`,
                "success",
                "Collector Activated"
            );

        }, 220);
    }


    /* =========================================================
       ADD COLLECTOR
       ========================================================= */

    function openAddCollectorModal() {

        openModal({

            title:
                "Add Collector",

            eyebrow:
                "NEW PARTNER",

            description:
                "Register a new collection partner.",

            size:
                "medium",

            content: `

                <form
                    id="addCollectorForm"
                    class="admin-form">

                    <div class="form-grid">

                        <div class="form-group">

                            <label>
                                Full Name
                            </label>

                            <input
                                id="newCollectorName"
                                required
                                placeholder="Collector name"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Company / Business
                            </label>

                            <input
                                id="newCollectorCompany"
                                placeholder="Business name"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Phone
                            </label>

                            <input
                                id="newCollectorPhone"
                                type="tel"
                                placeholder="+91 XXXXX XXXXX"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Email
                            </label>

                            <input
                                id="newCollectorEmail"
                                type="email"
                                placeholder="collector@email.com"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Area
                            </label>

                            <input
                                id="newCollectorArea"
                                placeholder="e.g. Sector 62"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Vehicle
                            </label>

                            <input
                                id="newCollectorVehicle"
                                placeholder="Mini Truck"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Registration Number
                            </label>

                            <input
                                id="newCollectorRegistration"
                                placeholder="UP16 AB 1234"
                            >

                        </div>

                    </div>

                </form>

            `,

            footer: `

                <button
                    class="btn btn-secondary"
                    onclick="closeModal()">
                    Cancel
                </button>

                <button
                    class="btn btn-primary"
                    id="saveCollectorBtn">
                    Create Collector
                </button>

            `,

            onOpen: () => {

                const button =
                    document.getElementById(
                        "saveCollectorBtn"
                    );


                if (button) {

                    button.addEventListener(
                        "click",
                        createCollector
                    );

                }

            }

        });
    }


    function createCollector() {

        const name =
            valueOf(
                "newCollectorName"
            );


        const company =
            valueOf(
                "newCollectorCompany"
            );


        const phone =
            valueOf(
                "newCollectorPhone"
            );


        const email =
            valueOf(
                "newCollectorEmail"
            );


        const area =
            valueOf(
                "newCollectorArea"
            );


        const vehicle =
            valueOf(
                "newCollectorVehicle"
            );


        const registration =
            valueOf(
                "newCollectorRegistration"
            );


        if (!name) {

            showToast(
                "Collector name is required.",
                "warning",
                "Missing Information"
            );

            return;
        }


        const collector = {

            id:
                generateCollectorId(),

            name,

            company:
                company ||
                "Independent Collector",

            phone,

            email,

            area:
                area ||
                "Not assigned",

            vehicle:
                vehicle ||
                "Mini Truck",

            vehicleNumber:
                registration ||
                "Not assigned",

            status:
                "pending",

            verified:
                false,

            verificationStatus:
                "pending",

            totalPickups:
                0,

            completedPickups:
                0,

            rating:
                0,

            completionRate:
                0,

            createdAt:
                new Date().toISOString()

        };


        let saved = false;


        if (
            typeof storageAdd ===
            "function"
        ) {

            saved =
                Boolean(
                    storageAdd(
                        "collectors",
                        collector
                    )
                );

        }


        if (!saved) {

            state.collectors.push(
                collector
            );

        }


        closeModal();


        setTimeout(() => {

            loadCollectors();

            updateStats();

            renderTable();

            updateVerificationAlert();


            showToast(
                `${name} has been added for verification.`,
                "success",
                "Collector Created"
            );

        }, 220);
    }


    function generateCollectorId() {

        const ids =
            state.collectors
                .map(
                    collector =>
                        parseInt(
                            String(
                                collector.id ||
                                ""
                            ).replace(
                                /\D/g,
                                ""
                            ),
                            10
                        )
                )
                .filter(Boolean);


        const max =
            ids.length
                ? Math.max(...ids)
                : 2000;


        return `COL-${max + 1}`;
    }


    /* =========================================================
       EXPORT
       ========================================================= */

    function exportCollectors() {

        const data =
            state.filtered.map(
                collector => ({

                    ID:
                        collector.id,

                    Name:
                        collector.name,

                    Company:
                        collector.company ||
                        collector.businessName,

                    Phone:
                        collector.phone,

                    Area:
                        collector.area,

                    Vehicle:
                        collector.vehicle,

                    Registration:
                        collector.vehicleNumber,

                    Status:
                        collector.status,

                    Verified:
                        collector.verified
                            ? "Yes"
                            : "No",

                    TotalPickups:
                        collector.totalPickups ||
                        0,

                    Completed:
                        collector.completedPickups ||
                        0,

                    Rating:
                        collector.rating ||
                        0

                })
            );


        if (!data.length) {

            showToast(
                "There is no collector data to export.",
                "warning",
                "Export"
            );

            return;
        }


        const headers =
            Object.keys(
                data[0]
            );


        const csv = [

            headers.join(","),

            ...data.map(
                row =>
                    headers
                        .map(
                            header =>
                                csvEscape(
                                    row[header]
                                )
                        )
                        .join(",")
            )

        ].join("\n");


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


        link.href =
            url;


        link.download =
            `ekabadi-collectors-${
                new Date()
                    .toISOString()
                    .slice(0, 10)
            }.csv`;


        link.click();


        URL.revokeObjectURL(
            url
        );


        showToast(
            `${data.length} collector records exported.`,
            "success",
            "Export Complete"
        );
    }


    function csvEscape(value) {

        const text =
            String(
                value ??
                ""
            );


        if (
            text.includes(",") ||
            text.includes('"') ||
            text.includes("\n")
        ) {

            return `"${text.replace(
                /"/g,
                '""'
            )}"`;
        }


        return text;
    }


    /* =========================================================
       EVENTS
       ========================================================= */

    function bindEvents() {

        const search =
            document.getElementById(
                "collectorSearch"
            );


        if (search) {

            search.addEventListener(
                "input",
                debounce(
                    event => {

                        state.search =
                            event.target.value;

                        state.currentPage =
                            1;

                        renderTable();

                    },
                    200
                )
            );

        }


        const status =
            document.getElementById(
                "collectorStatusFilter"
            );


        if (status) {

            status.addEventListener(
                "change",
                event => {

                    state.status =
                        event.target.value;

                    state.currentPage =
                        1;

                    renderTable();

                }
            );

        }


        const verification =
            document.getElementById(
                "collectorVerificationFilter"
            );


        if (verification) {

            verification.addEventListener(
                "change",
                event => {

                    state.verification =
                        event.target.value;

                    state.currentPage =
                        1;

                    renderTable();

                }
            );

        }


        const sort =
            document.getElementById(
                "collectorSortFilter"
            );


        if (sort) {

            sort.addEventListener(
                "change",
                event => {

                    state.sort =
                        event.target.value;

                    state.currentPage =
                        1;

                    renderTable();

                }
            );

        }


        const add =
            document.getElementById(
                "addCollectorBtn"
            );


        if (add) {

            add.addEventListener(
                "click",
                openAddCollectorModal
            );

        }


        const exportButton =
            document.getElementById(
                "exportCollectorsBtn"
            );


        if (exportButton) {

            exportButton.addEventListener(
                "click",
                exportCollectors
            );

        }


        const pending =
            document.getElementById(
                "showPendingBtn"
            );


        if (pending) {

            pending.addEventListener(
                "click",
                () => {

                    state.status =
                        "pending";

                    state.verification =
                        "all";

                    state.currentPage =
                        1;


                    const statusFilter =
                        document.getElementById(
                            "collectorStatusFilter"
                        );


                    if (statusFilter) {
                        statusFilter.value =
                            "pending";
                    }


                    renderTable();

                }
            );

        }


        document.addEventListener(
            "ekabadi:data-refresh",
            () => {

                loadCollectors();

                updateStats();

                renderTable();

                updateVerificationAlert();

            }
        );

    }


    /* =========================================================
       ROW EVENTS
       ========================================================= */

    function bindRowEvents() {

        document
            .querySelectorAll(
                ".view-collector"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () =>
                        viewCollector(
                            button.dataset.id
                        )
                );

            });


        document
            .querySelectorAll(
                ".more-collector"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () =>
                        openCollectorActions(
                            button.dataset.id
                        )
                );

            });

    }


    /* =========================================================
       HELPERS
       ========================================================= */

    function findCollector(id) {

        return state.collectors.find(
            collector =>
                String(
                    collector.id
                ) ===
                String(id)
        );
    }


    function valueOf(id) {

        return (
            document.getElementById(id)
                ?.value ||
            ""
        ).trim();
    }


    function setText(id, value) {

        const element =
            document.getElementById(id);


        if (element) {
            element.textContent =
                value;
        }
    }


    function formatNumber(value) {

        return (
            Number(value) || 0
        ).toLocaleString(
            "en-IN"
        );
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.EKABADI_COLLECTORS = {

        state,

        loadCollectors,

        renderTable,

        viewCollector,

        openCollectorActions,

        approveCollector,

        exportCollectors

    };


    /* =========================================================
       START
       ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeCollectors
        );

    } else {

        initializeCollectors();

    }

})();