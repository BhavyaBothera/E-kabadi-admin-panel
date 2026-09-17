/* =========================================================
   E-KABADI COMMAND CENTER
   ISSUES & SUPPORT
   ========================================================= */

(function () {

    "use strict";


    let issues = [];

    let filteredIssues = [];

    let currentPage = 1;

    const pageSize = 7;


    const priorityOrder = {
        high: 1,
        medium: 2,
        low: 3
    };


    document.addEventListener(
        "DOMContentLoaded",
        initializeIssues
    );


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initializeIssues() {

        loadIssues();

        setupFilters();

        setupActions();

        renderIssues();

    }


    /* =====================================================
       LOAD
       ===================================================== */

    function loadIssues() {

        if (
            typeof storageGetIssues ===
            "function"
        ) {

            issues =
                storageGetIssues();

        } else {

            issues =
                EKABADI_DATA.issues || [];

        }

        filteredIssues =
            [...issues];

    }


    /* =====================================================
       FILTERS
       ===================================================== */

    function setupFilters() {

        const search =
            document.getElementById(
                "issueSearch"
            );

        const status =
            document.getElementById(
                "issueStatusFilter"
            );

        const priority =
            document.getElementById(
                "issuePriorityFilter"
            );

        const type =
            document.getElementById(
                "issueTypeFilter"
            );

        const sort =
            document.getElementById(
                "issueSort"
            );


        [
            search,
            status,
            priority,
            type,
            sort
        ].forEach(
            element => {

                if (!element) return;

                element.addEventListener(
                    "input",
                    function () {

                        currentPage = 1;

                        renderIssues();

                    }
                );

                element.addEventListener(
                    "change",
                    function () {

                        currentPage = 1;

                        renderIssues();

                    }
                );

            }
        );

    }


    /* =====================================================
       ACTIONS
       ===================================================== */

    function setupActions() {

        document
            .getElementById(
                "refreshIssues"
            )
            ?.addEventListener(
                "click",
                function () {

                    loadIssues();

                    renderIssues();

                    showToast(
                        "Issues refreshed.",
                        "success"
                    );

                }
            );


        document
            .getElementById(
                "exportIssues"
            )
            ?.addEventListener(
                "click",
                exportIssues
            );

    }


    /* =====================================================
       RENDER
       ===================================================== */

    function renderIssues() {

        updateStats();

        updateAlert();

        applyFilters();

        renderTable();

        renderPagination();

    }


    /* =====================================================
       STATS
       ===================================================== */

    function updateStats() {

        const total =
            issues.length;


        const open =
            issues.filter(
                issue =>
                    normalizeStatus(
                        issue.status
                    ) === "open"
            ).length;


        const investigating =
            issues.filter(
                issue =>
                    normalizeStatus(
                        issue.status
                    ) === "investigating"
            ).length;


        const resolved =
            issues.filter(
                issue =>
                    normalizeStatus(
                        issue.status
                    ) === "resolved"
            ).length;


        setText(
            "totalIssues",
            total
        );

        setText(
            "openIssues",
            open
        );

        setText(
            "investigatingIssues",
            investigating
        );

        setText(
            "resolvedIssues",
            resolved
        );

    }


    /* =====================================================
       ALERT
       ===================================================== */

    function updateAlert() {

        const highPriority =
            issues.filter(
                issue => {

                    const priority =
                        normalizeStatus(
                            issue.priority
                        );

                    const status =
                        normalizeStatus(
                            issue.status
                        );

                    return (
                        priority === "high" &&
                        status !== "resolved"
                    );

                }
            ).length;


        const alert =
            document.getElementById(
                "issueAlert"
            );


        if (!alert) return;


        if (highPriority === 0) {

            alert.classList.add(
                "issue-alert-success"
            );

            setText(
                "issueAlertTitle",
                "No high priority issues"
            );

            setText(
                "issueAlertText",
                "The current support queue has no unresolved high priority issues."
            );

        } else {

            alert.classList.remove(
                "issue-alert-success"
            );

            setText(
                "issueAlertTitle",
                `${highPriority} high priority issue${highPriority > 1 ? "s" : ""} need attention`
            );

            setText(
                "issueAlertText",
                "Review unresolved high-priority tickets and take appropriate action."
            );

        }

    }


    /* =====================================================
       FILTER
       ===================================================== */

    function applyFilters() {

        const search =
            (
                document.getElementById(
                    "issueSearch"
                )?.value || ""
            )
                .trim()
                .toLowerCase();


        const status =
            document.getElementById(
                "issueStatusFilter"
            )?.value || "all";


        const priority =
            document.getElementById(
                "issuePriorityFilter"
            )?.value || "all";


        const type =
            document.getElementById(
                "issueTypeFilter"
            )?.value || "all";


        const sort =
            document.getElementById(
                "issueSort"
            )?.value || "newest";


        filteredIssues =
            issues.filter(
                issue => {

                    const searchable =
                        [
                            issue.id,
                            issue.title,
                            issue.description,
                            issue.reportedBy,
                            issue.userName,
                            issue.citizenName
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();


                    if (
                        search &&
                        !searchable.includes(
                            search
                        )
                    ) {
                        return false;
                    }


                    if (
                        status !== "all" &&
                        normalizeStatus(
                            issue.status
                        ) !== status
                    ) {
                        return false;
                    }


                    if (
                        priority !== "all" &&
                        normalizeStatus(
                            issue.priority
                        ) !== priority
                    ) {
                        return false;
                    }


                    if (
                        type !== "all" &&
                        normalizeStatus(
                            issue.type
                        ) !== type
                    ) {
                        return false;
                    }


                    return true;

                }
            );


        filteredIssues.sort(
            (a, b) => {

                if (
                    sort === "priority"
                ) {

                    return (
                        (
                            priorityOrder[
                                normalizeStatus(
                                    a.priority
                                )
                            ] || 99
                        ) -
                        (
                            priorityOrder[
                                normalizeStatus(
                                    b.priority
                                )
                            ] || 99
                        )
                    );

                }


                const dateA =
                    new Date(
                        a.createdAt ||
                        a.date ||
                        0
                    );


                const dateB =
                    new Date(
                        b.createdAt ||
                        b.date ||
                        0
                    );


                return sort === "oldest"
                    ? dateA - dateB
                    : dateB - dateA;

            }
        );

    }


    /* =====================================================
       TABLE
       ===================================================== */

    function renderTable() {

        const tbody =
            document.getElementById(
                "issuesTableBody"
            );


        if (!tbody) return;


        const start =
            (
                currentPage - 1
            ) * pageSize;


        const pageItems =
            filteredIssues.slice(
                start,
                start + pageSize
            );


        setText(
            "issueResultCount",
            `${filteredIssues.length} issue${filteredIssues.length !== 1 ? "s" : ""}`
        );


        if (!pageItems.length) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        class="table-empty">

                        <div class="empty-state">

                            <div class="empty-icon">
                                ✓
                            </div>

                            <h3>
                                No issues found
                            </h3>

                            <p>
                                Try changing your filters.
                            </p>

                        </div>

                    </td>

                </tr>

            `;

            return;

        }


        tbody.innerHTML =
            pageItems
                .map(
                    issue =>
                        renderIssueRow(
                            issue
                        )
                )
                .join("");

    }


    function renderIssueRow(
        issue
    ) {

        const status =
            normalizeStatus(
                issue.status
            );


        const priority =
            normalizeStatus(
                issue.priority
            );


        const type =
            normalizeStatus(
                issue.type
            );


        const reporter =
            issue.reportedBy ||
            issue.userName ||
            issue.citizenName ||
            "Unknown User";


        const initials =
            getInitials(
                reporter
            );


        return `

            <tr>

                <td>

                    <div class="issue-cell">

                        <div class="issue-ticket-icon">
                            !
                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(
                                    issue.title ||
                                    "Untitled Issue"
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    issue.id ||
                                    "ISS-0000"
                                )}
                            </span>

                        </div>

                    </div>

                </td>


                <td>

                    <div class="reporter-cell">

                        <div class="avatar avatar-sm">
                            ${escapeHTML(
                                initials
                            )}
                        </div>

                        <span>
                            ${escapeHTML(
                                reporter
                            )}
                        </span>

                    </div>

                </td>


                <td>
                    <span class="issue-type">
                        ${formatLabel(type)}
                    </span>
                </td>


                <td>
                    ${priorityBadge(
                        priority
                    )}
                </td>


                <td>
                    <span class="table-subtext">
                        ${formatDate(
                            issue.createdAt ||
                            issue.date
                        )}
                    </span>
                </td>


                <td>
                    ${statusBadge(
                        status
                    )}
                </td>


                <td>

                    <div class="table-actions">

                        <button
                            class="table-action"
                            onclick="viewIssue('${escapeAttribute(issue.id)}')">
                            View
                        </button>

                        ${
                            status !== "resolved"
                                ? `
                                    <button
                                        class="table-action primary"
                                        onclick="manageIssue('${escapeAttribute(issue.id)}')">
                                        Manage
                                    </button>
                                `
                                : ""
                        }

                    </div>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       VIEW ISSUE
       ===================================================== */

    window.viewIssue =
        function (id) {

            const issue =
                findIssue(id);

            if (!issue) return;


            const reporter =
                issue.reportedBy ||
                issue.userName ||
                issue.citizenName ||
                "Unknown";


            openModal(
                `
                    <div class="modal-header">

                        <div>

                            <span class="modal-eyebrow">
                                Support Ticket
                            </span>

                            <h2>
                                ${escapeHTML(
                                    issue.title ||
                                    "Issue Details"
                                )}
                            </h2>

                        </div>

                        <button
                            class="modal-close"
                            onclick="closeModal()">
                            ×
                        </button>

                    </div>


                    <div class="issue-detail-body">

                        <div class="issue-detail-top">

                            <div>
                                ${priorityBadge(
                                    normalizeStatus(
                                        issue.priority
                                    )
                                )}
                            </div>

                            <div>
                                ${statusBadge(
                                    normalizeStatus(
                                        issue.status
                                    )
                                )}
                            </div>

                        </div>


                        <div class="detail-grid">

                            <div class="detail-item">

                                <span>
                                    Issue ID
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        issue.id
                                    )}
                                </strong>

                            </div>


                            <div class="detail-item">

                                <span>
                                    Reported By
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        reporter
                                    )}
                                </strong>

                            </div>


                            <div class="detail-item">

                                <span>
                                    Issue Type
                                </span>

                                <strong>
                                    ${formatLabel(
                                        issue.type
                                    )}
                                </strong>

                            </div>


                            <div class="detail-item">

                                <span>
                                    Date
                                </span>

                                <strong>
                                    ${formatDateTime(
                                        issue.createdAt ||
                                        issue.date
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div class="issue-description">

                            <span>
                                Description
                            </span>

                            <p>
                                ${escapeHTML(
                                    issue.description ||
                                    "No description provided."
                                )}
                            </p>

                        </div>

                    </div>


                    <div class="modal-footer">

                        <button
                            class="btn btn-secondary"
                            onclick="closeModal()">
                            Close
                        </button>

                        ${
                            normalizeStatus(
                                issue.status
                            ) !== "resolved"
                                ? `
                                    <button
                                        class="btn btn-primary"
                                        onclick="manageIssue('${escapeAttribute(issue.id)}')">
                                        Manage Issue
                                    </button>
                                `
                                : ""
                        }

                    </div>
                `
            );

        };


    /* =====================================================
       MANAGE
       ===================================================== */

    window.manageIssue =
        function (id) {

            const issue =
                findIssue(id);

            if (!issue) return;


            const currentStatus =
                normalizeStatus(
                    issue.status
                );


            openModal(
                `
                    <div class="modal-header">

                        <div>

                            <span class="modal-eyebrow">
                                Support Management
                            </span>

                            <h2>
                                Manage Issue
                            </h2>

                        </div>

                        <button
                            class="modal-close"
                            onclick="closeModal()">
                            ×
                        </button>

                    </div>


                    <form
                        id="manageIssueForm"
                        class="modal-form">

                        <div class="form-group">

                            <label>
                                Issue Status
                            </label>

                            <select
                                id="manageIssueStatus"
                                class="form-control">

                                <option
                                    value="open"
                                    ${
                                        currentStatus === "open"
                                            ? "selected"
                                            : ""
                                    }>
                                    Open
                                </option>

                                <option
                                    value="investigating"
                                    ${
                                        currentStatus === "investigating"
                                            ? "selected"
                                            : ""
                                    }>
                                    Investigating
                                </option>

                                <option
                                    value="resolved"
                                    ${
                                        currentStatus === "resolved"
                                            ? "selected"
                                            : ""
                                    }>
                                    Resolved
                                </option>

                            </select>

                        </div>


                        <div class="form-group">

                            <label>
                                Priority
                            </label>

                            <select
                                id="manageIssuePriority"
                                class="form-control">

                                <option
                                    value="high"
                                    ${
                                        normalizeStatus(
                                            issue.priority
                                        ) === "high"
                                            ? "selected"
                                            : ""
                                    }>
                                    High
                                </option>

                                <option
                                    value="medium"
                                    ${
                                        normalizeStatus(
                                            issue.priority
                                        ) === "medium"
                                            ? "selected"
                                            : ""
                                    }>
                                    Medium
                                </option>

                                <option
                                    value="low"
                                    ${
                                        normalizeStatus(
                                            issue.priority
                                        ) === "low"
                                            ? "selected"
                                            : ""
                                    }>
                                    Low
                                </option>

                            </select>

                        </div>


                        <div class="form-group">

                            <label>
                                Admin Resolution Note
                            </label>

                            <textarea
                                id="issueResolutionNote"
                                class="form-control"
                                rows="4"
                                placeholder="Add an internal resolution note...">${escapeHTML(
                                    issue.resolutionNote ||
                                    ""
                                )}</textarea>

                        </div>


                        <div class="modal-footer">

                            <button
                                type="button"
                                class="btn btn-secondary"
                                onclick="closeModal()">
                                Cancel
                            </button>

                            <button
                                type="submit"
                                class="btn btn-primary">
                                Save Changes
                            </button>

                        </div>

                    </form>
                `
            );


            document
                .getElementById(
                    "manageIssueForm"
                )
                ?.addEventListener(
                    "submit",
                    function (event) {

                        event.preventDefault();

                        saveIssueChanges(
                            id
                        );

                    }
                );

        };


    /* =====================================================
       SAVE
       ===================================================== */

    function saveIssueChanges(
        id
    ) {

        const status =
            document.getElementById(
                "manageIssueStatus"
            )?.value;


        const priority =
            document.getElementById(
                "manageIssuePriority"
            )?.value;


        const note =
            document.getElementById(
                "issueResolutionNote"
            )?.value.trim();


        const update = {

            status,

            priority,

            resolutionNote:
                note,

            updatedAt:
                new Date().toISOString()

        };


        let success = false;


        if (
            typeof storageUpdateIssue ===
            "function"
        ) {

            success =
                storageUpdateIssue(
                    id,
                    update
                );

        }


        if (!success) {

            const index =
                issues.findIndex(
                    issue =>
                        issue.id === id
                );


            if (index !== -1) {

                issues[index] =
                    {
                        ...issues[index],
                        ...update
                    };

                success = true;

            }

        }


        if (!success) {

            showToast(
                "Unable to update issue.",
                "error"
            );

            return;

        }


        closeModal();

        loadIssues();

        renderIssues();


        showToast(
            status === "resolved"
                ? "Issue resolved successfully."
                : "Issue updated successfully.",
            "success"
        );

    }


    /* =====================================================
       PAGINATION
       ===================================================== */

    function renderPagination() {

        const container =
            document.getElementById(
                "issuesPagination"
            );


        if (!container) return;


        const totalPages =
            Math.ceil(
                filteredIssues.length /
                pageSize
            );


        if (
            totalPages <= 1
        ) {

            container.innerHTML = "";

            return;

        }


        let html = `

            <button
                class="pagination-btn"
                ${
                    currentPage === 1
                        ? "disabled"
                        : ""
                }
                onclick="changeIssuePage(${currentPage - 1})">
                ‹
            </button>

        `;


        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {

            html += `

                <button
                    class="pagination-btn ${
                        page === currentPage
                            ? "active"
                            : ""
                    }"
                    onclick="changeIssuePage(${page})">
                    ${page}
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
                onclick="changeIssuePage(${currentPage + 1})">
                ›
            </button>

        `;


        container.innerHTML =
            html;

    }


    window.changeIssuePage =
        function (page) {

            const totalPages =
                Math.ceil(
                    filteredIssues.length /
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

        };


    /* =====================================================
       EXPORT
       ===================================================== */

    function exportIssues() {

        if (!filteredIssues.length) {

            showToast(
                "No issues to export.",
                "warning"
            );

            return;

        }


        const rows = [

            [
                "Issue ID",
                "Title",
                "Reported By",
                "Type",
                "Priority",
                "Status",
                "Date"
            ]

        ];


        filteredIssues.forEach(
            issue => {

                rows.push([
                    issue.id || "",
                    issue.title || "",
                    issue.reportedBy ||
                        issue.userName ||
                        issue.citizenName ||
                        "",
                    issue.type || "",
                    issue.priority || "",
                    issue.status || "",
                    issue.createdAt ||
                        issue.date ||
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
                                    `"${String(
                                        value
                                    ).replace(
                                        /"/g,
                                        '""'
                                    )}"`
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
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href = url;

        link.download =
            `ekabadi-issues-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;


        document.body.appendChild(
            link
        );

        link.click();

        link.remove();


        URL.revokeObjectURL(
            url
        );


        showToast(
            "Issues exported successfully.",
            "success"
        );

    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function findIssue(id) {

        return issues.find(
            issue =>
                issue.id === id
        );

    }


    function normalizeStatus(
        value
    ) {

        return String(
            value || ""
        )
            .toLowerCase()
            .trim()
            .replace(
                /\s+/g,
                "_"
            );

    }


    function formatLabel(
        value
    ) {

        return String(
            value || "Other"
        )
            .replace(
                /_/g,
                " "
            )
            .replace(
                /\b\w/g,
                letter =>
                    letter.toUpperCase()
            );

    }


    function priorityBadge(
        priority
    ) {

        const label =
            formatLabel(
                priority
            );


        return `

            <span
                class="priority-badge priority-${priority}">

                <span class="priority-dot"></span>

                ${escapeHTML(
                    label
                )}

            </span>

        `;

    }


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );

        if (element) {

            element.textContent =
                value;

        }

    }


    function formatDate(
        value
    ) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";

        }


        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    }


    function formatDateTime(
        value
    ) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";

        }


        return date.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


})();