/* =========================================================
   E-KABADI COMMAND CENTER
   PICKUP MANAGEMENT
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
       ===================================================== */

    let pickups = [];
    let filteredPickups = [];

    let currentPage = 1;
    const pageSize = 7;

    let filters = {
        search: "",
        status: "all",
        collector: "all",
        area: "all",
        sort: "newest"
    };


    /* =====================================================
       INIT
       ===================================================== */

    document.addEventListener("DOMContentLoaded", initPickupsPage);


    function initPickupsPage() {

        if (
            typeof requireAdminAuth === "function" &&
            !requireAdminAuth()
        ) {
            return;
        }

        loadPickups();
        populateCollectorFilter();
        bindEvents();
        renderPage();

    }


    /* =====================================================
       LOAD DATA
       ===================================================== */

    function loadPickups() {

        if (typeof storageGetPickups === "function") {
            pickups = storageGetPickups() || [];
        } else if (
            typeof window.getPickups === "function"
        ) {
            pickups = window.getPickups() || [];
        } else {
            pickups = [];
        }

        filteredPickups = [...pickups];

    }


    /* =====================================================
       EVENTS
       ===================================================== */

    function bindEvents() {

        const search = document.getElementById("pickupSearch");
        const status = document.getElementById("statusFilter");
        const collector = document.getElementById("collectorFilter");
        const area = document.getElementById("areaFilter");
        const sort = document.getElementById("sortFilter");

        if (search) {
            search.addEventListener(
                "input",
                debounce(function () {

                    filters.search = search.value.trim().toLowerCase();
                    currentPage = 1;
                    applyFilters();

                }, 250)
            );
        }


        if (status) {

            status.addEventListener("change", function () {

                filters.status = this.value;
                currentPage = 1;
                applyFilters();

            });

        }


        if (collector) {

            collector.addEventListener("change", function () {

                filters.collector = this.value;
                currentPage = 1;
                applyFilters();

            });

        }


        if (area) {

            area.addEventListener("change", function () {

                filters.area = this.value;
                currentPage = 1;
                applyFilters();

            });

        }


        if (sort) {

            sort.addEventListener("change", function () {

                filters.sort = this.value;
                currentPage = 1;
                applyFilters();

            });

        }


        document
            .getElementById("clearFiltersBtn")
            ?.addEventListener("click", clearFilters);


        document
            .getElementById("refreshPickupsBtn")
            ?.addEventListener("click", refreshPickups);


        document
            .getElementById("exportPickupsBtn")
            ?.addEventListener("click", exportPickups);


        document
            .getElementById("addPickupBtn")
            ?.addEventListener("click", openAddPickupModal);


        document
            .getElementById("emptyAddPickupBtn")
            ?.addEventListener("click", openAddPickupModal);

    }


    /* =====================================================
       FILTERING
       ===================================================== */

    function applyFilters() {

        filteredPickups = pickups.filter(function (pickup) {

            const citizen = getCitizen(pickup.citizenId);
            const collector = getCollector(pickup.collectorId);

            const searchableText = [
                pickup.id,
                pickup.pickupId,
                citizen?.name,
                collector?.name,
                pickup.address,
                pickup.area
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            const matchesSearch =
                !filters.search ||
                searchableText.includes(filters.search);


            const matchesStatus =
                filters.status === "all" ||
                pickup.status === filters.status;


            const matchesCollector =
                filters.collector === "all" ||
                pickup.collectorId === filters.collector;


            const matchesArea =
                filters.area === "all" ||
                pickup.area === filters.area;


            return (
                matchesSearch &&
                matchesStatus &&
                matchesCollector &&
                matchesArea
            );

        });


        sortPickups();

        renderTable();
        renderPagination();
        updateResultCount();

    }


    /* =====================================================
       SORTING
       ===================================================== */

    function sortPickups() {

        filteredPickups.sort(function (a, b) {

            switch (filters.sort) {

                case "oldest":
                    return getDateValue(a) - getDateValue(b);


                case "weight_high":
                    return (
                        Number(b.weight || 0) -
                        Number(a.weight || 0)
                    );


                case "weight_low":
                    return (
                        Number(a.weight || 0) -
                        Number(b.weight || 0)
                    );


                case "amount_high":
                    return (
                        Number(b.amount || b.estimatedAmount || 0) -
                        Number(a.amount || a.estimatedAmount || 0)
                    );


                case "newest":
                default:
                    return getDateValue(b) - getDateValue(a);

            }

        });

    }


    function getDateValue(pickup) {

        const date =
            pickup.scheduledAt ||
            pickup.scheduledDate ||
            pickup.createdAt ||
            pickup.date;

        const value = new Date(date).getTime();

        return Number.isNaN(value) ? 0 : value;

    }


    /* =====================================================
       RENDER PAGE
       ===================================================== */

    function renderPage() {

        updateStats();
        applyFilters();

    }


    /* =====================================================
       STATS
       ===================================================== */

    function updateStats() {

        const total = pickups.length;

        const pending = pickups.filter(
            p => p.status === "pending"
        ).length;

        const active = pickups.filter(
            p =>
                p.status === "collector_assigned" ||
                p.status === "in_progress"
        ).length;

        const completed = pickups.filter(
            p => p.status === "completed"
        ).length;


        setText("totalPickupsStat", total);
        setText("pendingPickupsStat", pending);
        setText("activePickupsStat", active);
        setText("completedPickupsStat", completed);


        setText("pipelinePending", pending);

        setText(
            "pipelineAssigned",
            pickups.filter(
                p => p.status === "collector_assigned"
            ).length
        );

        setText(
            "pipelineProgress",
            pickups.filter(
                p => p.status === "in_progress"
            ).length
        );

        setText("pipelineCompleted", completed);

    }


    /* =====================================================
       TABLE
       ===================================================== */

    function renderTable() {

        const tbody =
            document.getElementById("pickupsTableBody");

        const empty =
            document.getElementById("pickupEmptyState");

        if (!tbody) return;


        const start =
            (currentPage - 1) * pageSize;

        const pageItems =
            filteredPickups.slice(
                start,
                start + pageSize
            );


        tbody.innerHTML = "";


        if (!pageItems.length) {

            empty?.classList.remove("hidden");

            return;

        }


        empty?.classList.add("hidden");


        pageItems.forEach(function (pickup) {

            tbody.insertAdjacentHTML(
                "beforeend",
                createPickupRow(pickup)
            );

        });

    }


    function createPickupRow(pickup) {

        const citizen =
            getCitizen(pickup.citizenId);

        const collector =
            getCollector(pickup.collectorId);


        const citizenName =
            citizen?.name || "Unknown Citizen";


        const collectorName =
            collector?.name || null;


        const area =
            pickup.area ||
            citizen?.area ||
            citizen?.location ||
            "—";


        const weight =
            pickup.weight ??
            pickup.estimatedWeight ??
            0;


        const amount =
            pickup.amount ??
            pickup.estimatedAmount ??
            0;


        const schedule =
            formatPickupSchedule(pickup);


        const status =
            pickup.status || "pending";


        return `
            <tr>

                <td>
                    <div class="pickup-id-cell">
                        <strong>
                            ${escapeHTML(
                                pickup.id ||
                                pickup.pickupId ||
                                "—"
                            )}
                        </strong>

                        <span class="table-subtext">
                            ${escapeHTML(
                                pickup.type ||
                                "Waste Pickup"
                            )}
                        </span>
                    </div>
                </td>


                <td>
                    <div class="person-cell">

                        <div class="avatar avatar-sm">
                            ${escapeHTML(
                                getInitials(
                                    citizenName
                                )
                            )}
                        </div>

                        <div>
                            <strong>
                                ${escapeHTML(
                                    citizenName
                                )}
                            </strong>

                            <span class="table-subtext">
                                ${escapeHTML(
                                    citizen?.id || ""
                                )}
                            </span>
                        </div>

                    </div>
                </td>


                <td>
                    <span class="area-cell">
                        ${escapeHTML(area)}
                    </span>
                </td>


                <td>

                    ${
                        collector
                            ? `
                                <div class="person-cell">

                                    <div class="avatar avatar-sm collector-avatar">
                                        ${escapeHTML(
                                            getInitials(
                                                collectorName
                                            )
                                        )}
                                    </div>

                                    <div>
                                        <strong>
                                            ${escapeHTML(
                                                collectorName
                                            )}
                                        </strong>

                                        <span class="table-subtext">
                                            ${escapeHTML(
                                                collector.id || ""
                                            )}
                                        </span>
                                    </div>

                                </div>
                            `
                            : `
                                <button
                                    class="assign-inline-btn"
                                    onclick="window.pickupAssign('${escapeAttribute(
                                        pickup.id ||
                                        pickup.pickupId
                                    )}')"
                                >
                                    + Assign
                                </button>
                            `
                    }

                </td>


                <td>
                    <div class="schedule-cell">

                        <strong>
                            ${escapeHTML(
                                schedule.date
                            )}
                        </strong>

                        <span class="table-subtext">
                            ${escapeHTML(
                                schedule.time
                            )}
                        </span>

                    </div>
                </td>


                <td>
                    <strong>
                        ${formatWeight(weight)}
                    </strong>
                </td>


                <td>
                    <strong class="amount-cell">
                        ${formatCurrency(amount)}
                    </strong>
                </td>


                <td>
                    ${statusBadge(status)}
                </td>


                <td class="text-right">

                    <div class="table-actions">

                        <button
                            class="icon-btn"
                            title="View pickup"
                            onclick="window.pickupView('${escapeAttribute(
                                pickup.id ||
                                pickup.pickupId
                            )}')"
                        >
                            👁
                        </button>

                        <button
                            class="icon-btn"
                            title="Manage pickup"
                            onclick="window.pickupManage('${escapeAttribute(
                                pickup.id ||
                                pickup.pickupId
                            )}')"
                        >
                            ⋮
                        </button>

                    </div>

                </td>

            </tr>
        `;

    }


    /* =====================================================
       PAGINATION
       ===================================================== */

    function renderPagination() {

        const container =
            document.getElementById(
                "pickupPagination"
            );

        if (!container) return;


        const totalPages =
            Math.ceil(
                filteredPickups.length /
                pageSize
            );


        if (totalPages <= 1) {

            container.innerHTML = "";
            return;

        }


        let html = `

            <div class="pagination-info">
                Showing
                ${Math.min(
                    (currentPage - 1) * pageSize + 1,
                    filteredPickups.length
                )}
                –
                ${Math.min(
                    currentPage * pageSize,
                    filteredPickups.length
                )}
                of ${filteredPickups.length}
            </div>

            <div class="pagination-controls">

                <button
                    class="pagination-btn"
                    ${
                        currentPage === 1
                            ? "disabled"
                            : ""
                    }
                    onclick="window.pickupPage(${
                        currentPage - 1
                    })"
                >
                    ‹
                </button>
        `;


        for (
            let i = 1;
            i <= totalPages;
            i++
        ) {

            html += `
                <button
                    class="pagination-btn ${
                        i === currentPage
                            ? "active"
                            : ""
                    }"
                    onclick="window.pickupPage(${i})"
                >
                    ${i}
                </button>
            `;

        }


        html += `

                <button
                    class="pagination-btn"
                    ${
                        currentPage === totalPages
                            ? "disabled"
                            : ""
                    }
                    onclick="window.pickupPage(${
                        currentPage + 1
                    })"
                >
                    ›
                </button>

            </div>
        `;


        container.innerHTML = html;

    }


    window.pickupPage = function (page) {

        const totalPages =
            Math.ceil(
                filteredPickups.length /
                pageSize
            );

        if (
            page < 1 ||
            page > totalPages
        ) {
            return;
        }

        currentPage = page;

        renderTable();
        renderPagination();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    };


    /* =====================================================
       COLLECTOR FILTER
       ===================================================== */

    function populateCollectorFilter() {

        const select =
            document.getElementById(
                "collectorFilter"
            );

        if (!select) return;


        const collectors =
            typeof storageGetCollectors === "function"
                ? storageGetCollectors()
                : [];


        collectors
            .filter(
                collector =>
                    collector.status === "active"
            )
            .forEach(function (collector) {

                const option =
                    document.createElement("option");

                option.value = collector.id;

                option.textContent =
                    collector.name;

                select.appendChild(option);

            });

    }


    /* =====================================================
       VIEW PICKUP
       ===================================================== */

    window.pickupView = function (id) {

        const pickup =
            findPickup(id);

        if (!pickup) return;


        const citizen =
            getCitizen(pickup.citizenId);

        const collector =
            getCollector(pickup.collectorId);


        const schedule =
            formatPickupSchedule(pickup);


        const modalHTML = `

            <div class="pickup-detail">

                <div class="pickup-detail-header">

                    <div>

                        <span class="pickup-detail-label">
                            PICKUP REQUEST
                        </span>

                        <h2>
                            ${escapeHTML(
                                pickup.id ||
                                pickup.pickupId ||
                                "—"
                            )}
                        </h2>

                    </div>

                    ${statusBadge(
                        pickup.status ||
                        "pending"
                    )}

                </div>


                <div class="pickup-detail-grid">

                    <div class="detail-box">

                        <span>Citizen</span>

                        <strong>
                            ${escapeHTML(
                                citizen?.name ||
                                "Unknown"
                            )}
                        </strong>

                    </div>


                    <div class="detail-box">

                        <span>Collector</span>

                        <strong>
                            ${escapeHTML(
                                collector?.name ||
                                "Not Assigned"
                            )}
                        </strong>

                    </div>


                    <div class="detail-box">

                        <span>Area</span>

                        <strong>
                            ${escapeHTML(
                                pickup.area ||
                                citizen?.area ||
                                "—"
                            )}
                        </strong>

                    </div>


                    <div class="detail-box">

                        <span>Scheduled</span>

                        <strong>
                            ${escapeHTML(
                                schedule.date
                            )}
                            <br>
                            <small>
                                ${escapeHTML(
                                    schedule.time
                                )}
                            </small>
                        </strong>

                    </div>


                    <div class="detail-box">

                        <span>Estimated Weight</span>

                        <strong>
                            ${formatWeight(
                                pickup.weight ||
                                pickup.estimatedWeight ||
                                0
                            )}
                        </strong>

                    </div>


                    <div class="detail-box">

                        <span>Estimated Amount</span>

                        <strong class="amount-cell">
                            ${formatCurrency(
                                pickup.amount ||
                                pickup.estimatedAmount ||
                                0
                            )}
                        </strong>

                    </div>

                </div>


                <div class="pickup-address-box">

                    <span>Pickup Address</span>

                    <strong>
                        ${escapeHTML(
                            pickup.address ||
                            "Address not available"
                        )}
                    </strong>

                </div>


                <div class="pickup-timeline">

                    <h3>Pickup Timeline</h3>

                    ${createPickupTimeline(pickup)}

                </div>


                <div class="modal-actions">

                    <button
                        class="btn btn-secondary"
                        onclick="closeModal()"
                    >
                        Close
                    </button>

                    ${
                        !collector
                            ? `
                                <button
                                    class="btn btn-primary"
                                    onclick="closeModal(); window.pickupAssign('${escapeAttribute(
                                        pickup.id ||
                                        pickup.pickupId
                                    )}')"
                                >
                                    Assign Collector
                                </button>
                            `
                            : `
                                <button
                                    class="btn btn-primary"
                                    onclick="closeModal(); window.pickupManage('${escapeAttribute(
                                        pickup.id ||
                                        pickup.pickupId
                                    )}')"
                                >
                                    Manage Pickup
                                </button>
                            `
                    }

                </div>

            </div>
        `;


        openModal(
            "Pickup Details",
            modalHTML
        );

    };


    /* =====================================================
       TIMELINE
       ===================================================== */

    function createPickupTimeline(pickup) {

        const status =
            pickup.status || "pending";


        const steps = [

            {
                key: "pending",
                title: "Pickup Requested",
                description: "Citizen created pickup request."
            },

            {
                key: "collector_assigned",
                title: "Collector Assigned",
                description: "A verified collector was assigned."
            },

            {
                key: "in_progress",
                title: "Collection In Progress",
                description: "Collector is handling the pickup."
            },

            {
                key: "completed",
                title: "Pickup Completed",
                description: "Waste was collected successfully."
            }

        ];


        const statusOrder = {
            pending: 0,
            collector_assigned: 1,
            in_progress: 2,
            completed: 3
        };


        const current =
            statusOrder[status] ?? 0;


        return steps.map(
            function (step, index) {

                const stepOrder =
                    statusOrder[step.key];


                let className = "";


                if (stepOrder < current) {
                    className = "completed";
                }

                if (stepOrder === current) {
                    className = "current";
                }


                return `

                    <div class="timeline-item ${className}">

                        <div class="timeline-marker">
                            ${
                                stepOrder < current
                                    ? "✓"
                                    : index + 1
                            }
                        </div>

                        <div class="timeline-content">

                            <strong>
                                ${step.title}
                            </strong>

                            <span>
                                ${step.description}
                            </span>

                        </div>

                    </div>

                `;

            }
        ).join("");

    }


    /* =====================================================
       ASSIGN COLLECTOR
       ===================================================== */

    window.pickupAssign = function (id) {

        const pickup =
            findPickup(id);

        if (!pickup) return;


        const collectors =
            typeof storageGetCollectors === "function"
                ? storageGetCollectors()
                : [];


        const availableCollectors =
            collectors.filter(
                collector =>
                    collector.status === "active" &&
                    (
                        collector.verified === true ||
                        collector.verificationStatus === "verified"
                    )
            );


        const options =
            availableCollectors.map(
                collector => `
                    <option value="${escapeAttribute(
                        collector.id
                    )}">
                        ${escapeHTML(
                            collector.name
                        )}
                        — ${escapeHTML(
                            collector.area ||
                            collector.location ||
                            ""
                        )}
                    </option>
                `
            ).join("");


        const html = `

            <div class="assign-pickup-modal">

                <div class="assign-summary">

                    <div class="assign-icon">
                        ♻
                    </div>

                    <div>

                        <span>
                            Assigning pickup
                        </span>

                        <strong>
                            ${escapeHTML(
                                pickup.id ||
                                pickup.pickupId
                            )}
                        </strong>

                    </div>

                </div>


                ${
                    availableCollectors.length
                        ? `
                            <div class="form-group">

                                <label for="assignCollectorSelect">
                                    Select Collector
                                </label>

                                <select
                                    id="assignCollectorSelect"
                                    class="form-control"
                                >

                                    <option value="">
                                        Choose a verified collector
                                    </option>

                                    ${options}

                                </select>

                            </div>

                            <div class="assignment-note">
                                Only active and verified collectors
                                are available for assignment.
                            </div>
                        `
                        : `
                            <div class="alert alert-warning">
                                No active verified collectors
                                are currently available.
                            </div>
                        `
                }


                <div class="modal-actions">

                    <button
                        class="btn btn-secondary"
                        onclick="closeModal()"
                    >
                        Cancel
                    </button>

                    ${
                        availableCollectors.length
                            ? `
                                <button
                                    class="btn btn-primary"
                                    id="confirmAssignBtn"
                                    onclick="window.confirmPickupAssignment('${escapeAttribute(
                                        pickup.id ||
                                        pickup.pickupId
                                    )}')"
                                >
                                    Assign Collector
                                </button>
                            `
                            : ""
                    }

                </div>

            </div>

        `;


        openModal(
            "Assign Collector",
            html
        );

    };


    /* =====================================================
       CONFIRM ASSIGNMENT
       ===================================================== */

    window.confirmPickupAssignment = function (id) {

        const select =
            document.getElementById(
                "assignCollectorSelect"
            );


        if (!select || !select.value) {

            showToast(
                "Please select a collector.",
                "warning"
            );

            return;

        }


        let success = false;


        if (
            typeof assignCollectorToPickup ===
            "function"
        ) {

            success =
                assignCollectorToPickup(
                    id,
                    select.value
                );

        } else if (
            typeof storageUpdatePickup ===
            "function"
        ) {

            success =
                storageUpdatePickup(
                    id,
                    {
                        collectorId: select.value,
                        status: "collector_assigned",
                        assignedAt:
                            new Date().toISOString()
                    }
                );

        }


        if (!success) {

            showToast(
                "Unable to assign collector.",
                "error"
            );

            return;

        }


        closeModal();

        showToast(
            "Collector assigned successfully.",
            "success"
        );


        refreshDataOnly();

    };


    /* =====================================================
       MANAGE PICKUP
       ===================================================== */

    window.pickupManage = function (id) {

        const pickup =
            findPickup(id);

        if (!pickup) return;


        const collector =
            getCollector(
                pickup.collectorId
            );


        const currentStatus =
            pickup.status || "pending";


        const html = `

            <div class="manage-pickup-modal">

                <div class="manage-header">

                    <div>

                        <span class="pickup-detail-label">
                            PICKUP
                        </span>

                        <h2>
                            ${escapeHTML(
                                pickup.id ||
                                pickup.pickupId
                            )}
                        </h2>

                    </div>

                    ${statusBadge(currentStatus)}

                </div>


                <div class="manage-info">

                    <div>
                        <span>Citizen</span>
                        <strong>
                            ${escapeHTML(
                                getCitizen(
                                    pickup.citizenId
                                )?.name ||
                                "Unknown"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Collector</span>
                        <strong>
                            ${escapeHTML(
                                collector?.name ||
                                "Not assigned"
                            )}
                        </strong>
                    </div>

                </div>


                <div class="form-group">

                    <label for="pickupStatusSelect">
                        Update Status
                    </label>

                    <select
                        id="pickupStatusSelect"
                        class="form-control"
                    >

                        <option
                            value="pending"
                            ${currentStatus === "pending" ? "selected" : ""}
                        >
                            Pending
                        </option>

                        <option
                            value="collector_assigned"
                            ${currentStatus === "collector_assigned" ? "selected" : ""}
                        >
                            Collector Assigned
                        </option>

                        <option
                            value="in_progress"
                            ${currentStatus === "in_progress" ? "selected" : ""}
                        >
                            In Progress
                        </option>

                        <option
                            value="completed"
                            ${currentStatus === "completed" ? "selected" : ""}
                        >
                            Completed
                        </option>

                        <option
                            value="cancelled"
                            ${currentStatus === "cancelled" ? "selected" : ""}
                        >
                            Cancelled
                        </option>

                    </select>

                </div>


                <div class="form-group">

                    <label for="pickupWeightInput">
                        Actual / Final Weight (kg)
                    </label>

                    <input
                        type="number"
                        id="pickupWeightInput"
                        class="form-control"
                        min="0"
                        step="0.1"
                        value="${escapeAttribute(
                            pickup.weight ||
                            pickup.estimatedWeight ||
                            ""
                        )}"
                        placeholder="Enter final weight"
                    >

                </div>


                <div class="form-group">

                    <label for="pickupAmountInput">
                        Final Amount (₹)
                    </label>

                    <input
                        type="number"
                        id="pickupAmountInput"
                        class="form-control"
                        min="0"
                        step="1"
                        value="${escapeAttribute(
                            pickup.amount ||
                            pickup.estimatedAmount ||
                            ""
                        )}"
                        placeholder="Enter amount"
                    >

                </div>


                <div class="modal-actions">

                    <button
                        class="btn btn-secondary"
                        onclick="closeModal()"
                    >
                        Cancel
                    </button>

                    <button
                        class="btn btn-primary"
                        onclick="window.savePickupChanges('${escapeAttribute(
                            pickup.id ||
                            pickup.pickupId
                        )}')"
                    >
                        Save Changes
                    </button>

                </div>

            </div>

        `;


        openModal(
            "Manage Pickup",
            html
        );

    };


    /* =====================================================
       SAVE PICKUP
       ===================================================== */

    window.savePickupChanges = function (id) {

        const status =
            document.getElementById(
                "pickupStatusSelect"
            )?.value;


        const weight =
            Number(
                document.getElementById(
                    "pickupWeightInput"
                )?.value || 0
            );


        const amount =
            Number(
                document.getElementById(
                    "pickupAmountInput"
                )?.value || 0
            );


        const updates = {

            status: status,
            weight: weight,
            amount: amount,
            updatedAt:
                new Date().toISOString()

        };


        let success = false;


        if (
            typeof storageUpdatePickup ===
            "function"
        ) {

            success =
                storageUpdatePickup(
                    id,
                    updates
                );

        } else if (
            typeof updatePickupStatus ===
            "function"
        ) {

            success =
                updatePickupStatus(
                    id,
                    status
                );

        }


        if (!success) {

            showToast(
                "Unable to update pickup.",
                "error"
            );

            return;

        }


        closeModal();

        showToast(
            "Pickup updated successfully.",
            "success"
        );


        refreshDataOnly();

    };


    /* =====================================================
       ADD PICKUP
       ===================================================== */

    function openAddPickupModal() {

        const citizens =
            typeof storageGetCitizens ===
            "function"
                ? storageGetCitizens()
                : [];


        const activeCitizens =
            citizens.filter(
                citizen =>
                    citizen.status === "active"
            );


        const citizenOptions =
            activeCitizens.map(
                citizen => `
                    <option value="${escapeAttribute(
                        citizen.id
                    )}">
                        ${escapeHTML(
                            citizen.name
                        )}
                        — ${escapeHTML(
                            citizen.area ||
                            citizen.location ||
                            ""
                        )}
                    </option>
                `
            ).join("");


        const html = `

            <div class="add-pickup-modal">

                <div class="form-group">

                    <label for="newPickupCitizen">
                        Citizen
                    </label>

                    <select
                        id="newPickupCitizen"
                        class="form-control"
                    >

                        <option value="">
                            Select citizen
                        </option>

                        ${citizenOptions}

                    </select>

                </div>


                <div class="form-row">

                    <div class="form-group">

                        <label for="newPickupDate">
                            Pickup Date
                        </label>

                        <input
                            type="date"
                            id="newPickupDate"
                            class="form-control"
                        >

                    </div>


                    <div class="form-group">

                        <label for="newPickupTime">
                            Pickup Time
                        </label>

                        <input
                            type="time"
                            id="newPickupTime"
                            class="form-control"
                            value="10:00"
                        >

                    </div>

                </div>


                <div class="form-group">

                    <label for="newPickupAddress">
                        Pickup Address
                    </label>

                    <input
                        type="text"
                        id="newPickupAddress"
                        class="form-control"
                        placeholder="Enter pickup address"
                    >

                </div>


                <div class="form-row">

                    <div class="form-group">

                        <label for="newPickupWeight">
                            Estimated Weight (kg)
                        </label>

                        <input
                            type="number"
                            id="newPickupWeight"
                            class="form-control"
                            min="0"
                            step="0.1"
                            placeholder="e.g. 5"
                        >

                    </div>


                    <div class="form-group">

                        <label for="newPickupAmount">
                            Estimated Amount (₹)
                        </label>

                        <input
                            type="number"
                            id="newPickupAmount"
                            class="form-control"
                            min="0"
                            step="1"
                            placeholder="e.g. 120"
                        >

                    </div>

                </div>


                <div class="modal-actions">

                    <button
                        class="btn btn-secondary"
                        onclick="closeModal()"
                    >
                        Cancel
                    </button>

                    <button
                        class="btn btn-primary"
                        onclick="window.createPickup()"
                    >
                        Create Pickup
                    </button>

                </div>

            </div>

        `;


        openModal(
            "Create New Pickup",
            html
        );

    }


    /* =====================================================
       CREATE PICKUP
       ===================================================== */

    window.createPickup = function () {

        const citizenId =
            document.getElementById(
                "newPickupCitizen"
            )?.value;


        const date =
            document.getElementById(
                "newPickupDate"
            )?.value;


        const time =
            document.getElementById(
                "newPickupTime"
            )?.value;


        const address =
            document.getElementById(
                "newPickupAddress"
            )?.value.trim();


        const weight =
            Number(
                document.getElementById(
                    "newPickupWeight"
                )?.value || 0
            );


        const amount =
            Number(
                document.getElementById(
                    "newPickupAmount"
                )?.value || 0
            );


        if (!citizenId) {

            showToast(
                "Please select a citizen.",
                "warning"
            );

            return;

        }


        if (!date) {

            showToast(
                "Please select a pickup date.",
                "warning"
            );

            return;

        }


        const citizen =
            getCitizen(citizenId);


        const pickup = {

            id:
                typeof generateId === "function"
                    ? generateId("PK")
                    : `PK-${Date.now()}`,

            citizenId: citizenId,

            collectorId: null,

            area:
                citizen?.area ||
                citizen?.location ||
                "Unknown",

            address:
                address ||
                citizen?.address ||
                "",

            scheduledAt:
                `${date}T${time || "10:00"}:00`,

            weight: weight,

            estimatedWeight: weight,

            amount: amount,

            estimatedAmount: amount,

            status: "pending",

            createdAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()

        };


        let success = false;


        if (
            typeof storageAdd ===
            "function"
        ) {

            success =
                storageAdd(
                    "pickups",
                    pickup
                );

        }


        if (!success) {

            showToast(
                "Unable to create pickup.",
                "error"
            );

            return;

        }


        closeModal();

        showToast(
            "New pickup created successfully.",
            "success"
        );


        refreshDataOnly();

    };


    /* =====================================================
       REFRESH
       ===================================================== */

    function refreshPickups() {

        const button =
            document.getElementById(
                "refreshPickupsBtn"
            );


        if (button) {

            button.disabled = true;

            button.innerHTML =
                "<span>↻</span> Refreshing...";

        }


        setTimeout(function () {

            refreshDataOnly();


            if (button) {

                button.disabled = false;

                button.innerHTML =
                    "<span>↻</span> Refresh";

            }

            showToast(
                "Pickup data refreshed.",
                "success"
            );

        }, 450);

    }


    function refreshDataOnly() {

        loadPickups();

        populateCollectorFilter();

        updateStats();

        applyFilters();

    }


    /* =====================================================
       CLEAR FILTERS
       ===================================================== */

    function clearFilters() {

        filters = {

            search: "",
            status: "all",
            collector: "all",
            area: "all",
            sort: "newest"

        };


        document.getElementById(
            "pickupSearch"
        ).value = "";


        document.getElementById(
            "statusFilter"
        ).value = "all";


        document.getElementById(
            "collectorFilter"
        ).value = "all";


        document.getElementById(
            "areaFilter"
        ).value = "all";


        document.getElementById(
            "sortFilter"
        ).value = "newest";


        currentPage = 1;

        applyFilters();


        showToast(
            "Filters cleared.",
            "success"
        );

    }


    /* =====================================================
       EXPORT CSV
       ===================================================== */

    function exportPickups() {

        if (!filteredPickups.length) {

            showToast(
                "No pickup data to export.",
                "warning"
            );

            return;

        }


        const rows = [

            [
                "Pickup ID",
                "Citizen",
                "Collector",
                "Area",
                "Scheduled",
                "Weight (kg)",
                "Amount (INR)",
                "Status"
            ]

        ];


        filteredPickups.forEach(
            function (pickup) {

                const citizen =
                    getCitizen(
                        pickup.citizenId
                    );


                const collector =
                    getCollector(
                        pickup.collectorId
                    );


                rows.push([

                    pickup.id ||
                    pickup.pickupId ||
                    "",

                    citizen?.name ||
                    "",

                    collector?.name ||
                    "Unassigned",

                    pickup.area ||
                    "",

                    pickup.scheduledAt ||
                    "",

                    pickup.weight ||
                    0,

                    pickup.amount ||
                    pickup.estimatedAmount ||
                    0,

                    pickup.status ||
                    ""

                ]);

            }
        );


        const csv =
            rows
                .map(
                    row =>
                        row
                            .map(
                                value =>
                                    `"${String(value)
                                        .replace(/"/g, '""')}"`
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
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href = url;

        link.download =
            `ekabadi-pickups-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;


        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);


        showToast(
            "Pickup CSV exported.",
            "success"
        );

    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function findPickup(id) {

        return pickups.find(
            pickup =>
                pickup.id === id ||
                pickup.pickupId === id
        );

    }


    function getCitizen(id) {

        if (!id) return null;

        if (
            typeof storageGetCitizen ===
            "function"
        ) {

            return storageGetCitizen(id);

        }


        if (
            typeof getCitizenById ===
            "function"
        ) {

            return getCitizenById(id);

        }


        return null;

    }


    function getCollector(id) {

        if (!id) return null;

        if (
            typeof storageGetCollector ===
            "function"
        ) {

            return storageGetCollector(id);

        }


        if (
            typeof getCollectorById ===
            "function"
        ) {

            return getCollectorById(id);

        }


        return null;

    }


    function formatPickupSchedule(pickup) {

        const raw =
            pickup.scheduledAt ||
            pickup.scheduledDate ||
            pickup.date;


        if (!raw) {

            return {
                date: "Not scheduled",
                time: "—"
            };

        }


        const date =
            new Date(raw);


        if (Number.isNaN(date.getTime())) {

            return {
                date: String(raw),
                time: "—"
            };

        }


        return {

            date:
                date.toLocaleDateString(
                    "en-IN",
                    {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    }
                ),

            time:
                date.toLocaleTimeString(
                    "en-IN",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )

        };

    }


    function updateResultCount() {

        const element =
            document.getElementById(
                "pickupResultCount"
            );


        if (!element) return;


        element.textContent =
            `${filteredPickups.length} ${
                filteredPickups.length === 1
                    ? "pickup"
                    : "pickups"
            }`;

    }


    function setText(id, value) {

        const element =
            document.getElementById(id);

        if (element) {

            element.textContent = value;

        }

    }


    function escapeHTML(value) {

        if (typeof window.escapeHTML === "function") {

            return window.escapeHTML(value);

        }

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function escapeAttribute(value) {

        return escapeHTML(value);

    }


    function debounce(fn, delay) {

        if (typeof window.debounce === "function") {

            return window.debounce(fn, delay);

        }


        let timer;

        return function () {

            clearTimeout(timer);

            const args = arguments;

            timer = setTimeout(
                () => fn.apply(this, args),
                delay
            );

        };

    }


    function getInitials(name) {

        if (
            typeof window.getInitials ===
            "function"
        ) {

            return window.getInitials(name);

        }


        return String(name || "NA")
            .split(" ")
            .map(
                word =>
                    word.charAt(0)
            )
            .slice(0, 2)
            .join("")
            .toUpperCase();

    }


    function statusBadge(status) {

        if (
            typeof window.statusBadge ===
            "function"
        ) {

            return window.statusBadge(status);

        }


        const labels = {

            pending: "Pending",

            collector_assigned:
                "Collector Assigned",

            in_progress:
                "In Progress",

            completed:
                "Completed",

            cancelled:
                "Cancelled"

        };


        return `
            <span class="status-badge status-${escapeHTML(
                status
            )}">
                ${escapeHTML(
                    labels[status] ||
                    status
                )}
            </span>
        `;

    }


    function formatCurrency(value) {

        if (
            typeof window.formatCurrency ===
            "function"
        ) {

            return window.formatCurrency(value);

        }


        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }
        ).format(value || 0);

    }


    function formatWeight(value) {

        if (
            typeof window.formatWeight ===
            "function"
        ) {

            return window.formatWeight(value);

        }


        return `${Number(value || 0).toFixed(1)} kg`;

    }


})();