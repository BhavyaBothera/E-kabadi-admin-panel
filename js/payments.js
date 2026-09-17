/* =========================================================
   E-KABADI COMMAND CENTER
   PAYMENT MANAGEMENT
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
       ===================================================== */

    let payments = [];
    let filteredPayments = [];

    let currentPage = 1;
    const pageSize = 8;

    let filters = {
        search: "",
        status: "all",
        method: "all",
        sort: "newest"
    };


    /* =====================================================
       INIT
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initPaymentsPage
    );


    function initPaymentsPage() {

        if (
            typeof requireAdminAuth === "function" &&
            !requireAdminAuth()
        ) {
            return;
        }

        loadPayments();
        bindEvents();
        renderPage();

    }


    /* =====================================================
       LOAD
       ===================================================== */

    function loadPayments() {

        if (
            typeof storageGetPayments === "function"
        ) {

            payments =
                storageGetPayments() || [];

        } else {

            payments = [];

        }

        filteredPayments =
            [...payments];

    }


    /* =====================================================
       EVENTS
       ===================================================== */

    function bindEvents() {

        const search =
            document.getElementById(
                "paymentSearch"
            );

        const status =
            document.getElementById(
                "paymentStatusFilter"
            );

        const method =
            document.getElementById(
                "paymentMethodFilter"
            );

        const sort =
            document.getElementById(
                "paymentSortFilter"
            );


        if (search) {

            search.addEventListener(
                "input",
                debounce(function () {

                    filters.search =
                        search.value
                            .trim()
                            .toLowerCase();

                    currentPage = 1;

                    applyFilters();

                }, 250)
            );

        }


        if (status) {

            status.addEventListener(
                "change",
                function () {

                    filters.status =
                        this.value;

                    currentPage = 1;

                    applyFilters();

                }
            );

        }


        if (method) {

            method.addEventListener(
                "change",
                function () {

                    filters.method =
                        this.value;

                    currentPage = 1;

                    applyFilters();

                }
            );

        }


        if (sort) {

            sort.addEventListener(
                "change",
                function () {

                    filters.sort =
                        this.value;

                    currentPage = 1;

                    applyFilters();

                }
            );

        }


        document
            .getElementById(
                "clearPaymentFiltersBtn"
            )
            ?.addEventListener(
                "click",
                clearFilters
            );


        document
            .getElementById(
                "refreshPaymentsBtn"
            )
            ?.addEventListener(
                "click",
                refreshPayments
            );


        document
            .getElementById(
                "exportPaymentsBtn"
            )
            ?.addEventListener(
                "click",
                exportPayments
            );


        document
            .getElementById(
                "reviewPendingBtn"
            )
            ?.addEventListener(
                "click",
                function () {

                    document.getElementById(
                        "paymentStatusFilter"
                    ).value = "pending";

                    filters.status = "pending";

                    currentPage = 1;

                    applyFilters();

                    document
                        .querySelector(
                            ".filters-card"
                        )
                        ?.scrollIntoView({
                            behavior: "smooth"
                        });

                }
            );

    }


    /* =====================================================
       FILTER
       ===================================================== */

    function applyFilters() {

        filteredPayments =
            payments.filter(
                function (payment) {

                    const citizen =
                        getCitizen(
                            payment.citizenId
                        );


                    const searchable =
                        [
                            payment.id,
                            payment.paymentId,
                            payment.transactionId,
                            citizen?.name,
                            payment.method,
                            payment.upiId
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();


                    const matchesSearch =
                        !filters.search ||
                        searchable.includes(
                            filters.search
                        );


                    const matchesStatus =
                        filters.status === "all" ||
                        normalizeStatus(
                            payment
                        ) === filters.status;


                    const matchesMethod =
                        filters.method === "all" ||
                        normalizeMethod(
                            payment
                        ) === filters.method;


                    return (
                        matchesSearch &&
                        matchesStatus &&
                        matchesMethod
                    );

                }
            );


        sortPayments();

        renderTable();
        renderPagination();
        updateResultCount();

    }


    /* =====================================================
       SORT
       ===================================================== */

    function sortPayments() {

        filteredPayments.sort(
            function (a, b) {

                const amountA =
                    getAmount(a);

                const amountB =
                    getAmount(b);


                const dateA =
                    getDateValue(a);

                const dateB =
                    getDateValue(b);


                switch (filters.sort) {

                    case "oldest":
                        return dateA - dateB;


                    case "amount_high":
                        return amountB - amountA;


                    case "amount_low":
                        return amountA - amountB;


                    case "newest":
                    default:
                        return dateB - dateA;

                }

            }
        );

    }


    /* =====================================================
       RENDER
       ===================================================== */

    function renderPage() {

        updateStats();

        updatePendingAlert();

        applyFilters();

    }


    /* =====================================================
       STATS
       ===================================================== */

    function updateStats() {

        const completedPayments =
            payments.filter(
                p =>
                    normalizeStatus(p) ===
                    "completed"
            );


        const pendingPayments =
            payments.filter(
                p =>
                    normalizeStatus(p) ===
                    "pending"
            );


        const totalPaid =
            completedPayments.reduce(
                (
                    total,
                    payment
                ) =>
                    total +
                    getAmount(payment),
                0
            );


        const pendingAmount =
            pendingPayments.reduce(
                (
                    total,
                    payment
                ) =>
                    total +
                    getAmount(payment),
                0
            );


        const transactionCount =
            payments.length;


        const successRate =
            transactionCount
                ? (
                    completedPayments.length /
                    transactionCount
                ) * 100
                : 0;


        setText(
            "totalPaidStat",
            formatCurrency(
                totalPaid
            )
        );


        setText(
            "pendingAmountStat",
            formatCurrency(
                pendingAmount
            )
        );


        setText(
            "transactionCountStat",
            transactionCount
        );


        setText(
            "paymentSuccessRateStat",
            `${successRate.toFixed(0)}%`
        );

    }


    /* =====================================================
       PENDING ALERT
       ===================================================== */

    function updatePendingAlert() {

        const alert =
            document.getElementById(
                "pendingPaymentAlert"
            );


        const text =
            document.getElementById(
                "pendingPaymentAlertText"
            );


        const pending =
            payments.filter(
                p =>
                    normalizeStatus(p) ===
                    "pending"
            );


        if (!pending.length) {

            alert?.classList.add(
                "hidden"
            );

            return;

        }


        alert?.classList.remove(
            "hidden"
        );


        const amount =
            pending.reduce(
                (
                    total,
                    payment
                ) =>
                    total +
                    getAmount(payment),
                0
            );


        if (text) {

            text.textContent =
                `${pending.length} payment${
                    pending.length === 1
                        ? ""
                        : "s"
                } worth ${formatCurrency(
                    amount
                )} ${
                    pending.length === 1
                        ? "is"
                        : "are"
                } awaiting release.`;

        }

    }


    /* =====================================================
       TABLE
       ===================================================== */

    function renderTable() {

        const tbody =
            document.getElementById(
                "paymentsTableBody"
            );


        const empty =
            document.getElementById(
                "paymentEmptyState"
            );


        if (!tbody) return;


        const start =
            (currentPage - 1) *
            pageSize;


        const pageItems =
            filteredPayments.slice(
                start,
                start + pageSize
            );


        tbody.innerHTML = "";


        if (!pageItems.length) {

            empty?.classList.remove(
                "hidden"
            );

            return;

        }


        empty?.classList.add(
            "hidden"
        );


        pageItems.forEach(
            function (payment) {

                tbody.insertAdjacentHTML(
                    "beforeend",
                    createPaymentRow(
                        payment
                    )
                );

            }
        );

    }


    function createPaymentRow(payment) {

        const citizen =
            getCitizen(
                payment.citizenId
            );


        const pickup =
            getPickup(
                payment.pickupId
            );


        const status =
            normalizeStatus(
                payment
            );


        const method =
            normalizeMethod(
                payment
            );


        const citizenName =
            citizen?.name ||
            payment.citizenName ||
            "Unknown Citizen";


        const transactionId =
            payment.id ||
            payment.paymentId ||
            payment.transactionId ||
            "—";


        const date =
            formatPaymentDate(
                payment
            );


        return `

            <tr>

                <td>

                    <div class="transaction-cell">

                        <div class="transaction-icon">
                            ₹
                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(
                                    transactionId
                                )}
                            </strong>

                            <span class="table-subtext">
                                ${
                                    payment.reference ||
                                    "Payout"
                                }
                            </span>

                        </div>

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
                                    citizen?.id ||
                                    ""
                                )}
                            </span>

                        </div>

                    </div>

                </td>


                <td>

                    ${
                        pickup
                            ? `
                                <div class="pickup-reference">

                                    <strong>
                                        ${escapeHTML(
                                            pickup.id ||
                                            pickup.pickupId ||
                                            "—"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHTML(
                                            pickup.area ||
                                            ""
                                        )}
                                    </span>

                                </div>
                            `
                            : `
                                <span class="table-subtext">
                                    Not linked
                                </span>
                            `
                    }

                </td>


                <td>

                    <strong class="payment-amount">
                        ${formatCurrency(
                            getAmount(
                                payment
                            )
                        )}
                    </strong>

                </td>


                <td>

                    <span class="payment-method">
                        ${getMethodIcon(method)}
                        ${getReadableMethod(method)}
                    </span>

                </td>


                <td>

                    <div class="payment-date">

                        <strong>
                            ${escapeHTML(
                                date.date
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                date.time
                            )}
                        </span>

                    </div>

                </td>


                <td>
                    ${paymentStatusBadge(
                        status
                    )}
                </td>


                <td class="text-right">

                    <div class="table-actions">

                        <button
                            class="icon-btn"
                            title="View transaction"
                            onclick="window.paymentView('${escapeAttribute(
                                transactionId
                            )}')"
                        >
                            👁
                        </button>

                        ${
                            status === "pending"
                                ? `
                                    <button
                                        class="icon-btn payment-release-btn"
                                        title="Release payment"
                                        onclick="window.releasePayment('${escapeAttribute(
                                            transactionId
                                        )}')"
                                    >
                                        ✓
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
       VIEW PAYMENT
       ===================================================== */

    window.paymentView =
        function (id) {

            const payment =
                findPayment(id);


            if (!payment) return;


            const citizen =
                getCitizen(
                    payment.citizenId
                );


            const pickup =
                getPickup(
                    payment.pickupId
                );


            const status =
                normalizeStatus(
                    payment
                );


            const method =
                normalizeMethod(
                    payment
                );


            const amount =
                getAmount(
                    payment
                );


            const transactionId =
                payment.id ||
                payment.paymentId ||
                payment.transactionId ||
                "—";


            const html = `

                <div class="payment-detail">

                    <div class="payment-detail-header">

                        <div class="transaction-detail-icon">
                            ₹
                        </div>

                        <div>

                            <span class="pickup-detail-label">
                                TRANSACTION
                            </span>

                            <h2>
                                ${escapeHTML(
                                    transactionId
                                )}
                            </h2>

                        </div>

                        ${paymentStatusBadge(
                            status
                        )}

                    </div>


                    <div class="payment-amount-hero">

                        <span>
                            Transaction Amount
                        </span>

                        <strong>
                            ${formatCurrency(
                                amount
                            )}
                        </strong>

                    </div>


                    <div class="payment-detail-grid">

                        <div class="detail-box">

                            <span>
                                Citizen
                            </span>

                            <strong>
                                ${escapeHTML(
                                    citizen?.name ||
                                    payment.citizenName ||
                                    "Unknown"
                                )}
                            </strong>

                        </div>


                        <div class="detail-box">

                            <span>
                                Pickup
                            </span>

                            <strong>
                                ${escapeHTML(
                                    pickup?.id ||
                                    pickup?.pickupId ||
                                    payment.pickupId ||
                                    "—"
                                )}
                            </strong>

                        </div>


                        <div class="detail-box">

                            <span>
                                Payment Method
                            </span>

                            <strong>
                                ${getReadableMethod(
                                    method
                                )}
                            </strong>

                        </div>


                        <div class="detail-box">

                            <span>
                                Transaction Date
                            </span>

                            <strong>
                                ${escapeHTML(
                                    formatPaymentDate(
                                        payment
                                    ).date
                                )}
                            </strong>

                        </div>

                    </div>


                    ${
                        payment.upiId
                            ? `
                                <div class="payment-reference-box">

                                    <span>
                                        UPI ID
                                    </span>

                                    <strong>
                                        ${escapeHTML(
                                            payment.upiId
                                        )}
                                    </strong>

                                </div>
                            `
                            : ""
                    }


                    ${
                        payment.reference
                            ? `
                                <div class="payment-reference-box">

                                    <span>
                                        Payment Reference
                                    </span>

                                    <strong>
                                        ${escapeHTML(
                                            payment.reference
                                        )}
                                    </strong>

                                </div>
                            `
                            : ""
                    }


                    <div class="modal-actions">

                        <button
                            class="btn btn-secondary"
                            onclick="closeModal()"
                        >
                            Close
                        </button>

                        ${
                            status === "pending"
                                ? `
                                    <button
                                        class="btn btn-primary"
                                        onclick="closeModal(); window.releasePayment('${escapeAttribute(
                                            transactionId
                                        )}')"
                                    >
                                        Release Payment
                                    </button>
                                `
                                : ""
                        }

                    </div>

                </div>

            `;


            openModal(
                "Transaction Details",
                html
            );

        };


    /* =====================================================
       RELEASE PAYMENT
       ===================================================== */

    window.releasePayment =
        function (id) {

            const payment =
                findPayment(id);


            if (!payment) return;


            const amount =
                getAmount(
                    payment
                );


            const citizen =
                getCitizen(
                    payment.citizenId
                );


            const execute =
                function () {

                    let success =
                        false;


                    if (
                        typeof completePayment ===
                        "function"
                    ) {

                        success =
                            completePayment(
                                id
                            );

                    } else if (
                        typeof storageUpdatePayment ===
                        "function"
                    ) {

                        success =
                            storageUpdatePayment(
                                id,
                                {
                                    status:
                                        "completed",

                                    completedAt:
                                        new Date()
                                            .toISOString(),

                                    paidAt:
                                        new Date()
                                            .toISOString()
                                }
                            );

                    }


                    if (!success) {

                        showToast(
                            "Unable to release payment.",
                            "error"
                        );

                        return;

                    }


                    showToast(
                        `${formatCurrency(
                            amount
                        )} payment released successfully.`,
                        "success"
                    );


                    refreshDataOnly();

                };


            if (
                typeof confirmAction ===
                "function"
            ) {

                confirmAction(
                    `Release ${formatCurrency(
                        amount
                    )} to ${
                        citizen?.name ||
                        "the citizen"
                    }?`,
                    execute
                );

            } else {

                if (
                    window.confirm(
                        `Release ${formatCurrency(
                            amount
                        )} payment?`
                    )
                ) {

                    execute();

                }

            }

        };


    /* =====================================================
       PAGINATION
       ===================================================== */

    function renderPagination() {

        const container =
            document.getElementById(
                "paymentPagination"
            );


        if (!container) return;


        const totalPages =
            Math.ceil(
                filteredPayments.length /
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
                    (currentPage - 1) *
                        pageSize + 1,
                    filteredPayments.length
                )}
                –
                ${Math.min(
                    currentPage *
                        pageSize,
                    filteredPayments.length
                )}

                of
                ${filteredPayments.length}

            </div>


            <div class="pagination-controls">

                <button
                    class="pagination-btn"
                    ${
                        currentPage === 1
                            ? "disabled"
                            : ""
                    }
                    onclick="window.paymentPage(${
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
                    onclick="window.paymentPage(${i})"
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
                    onclick="window.paymentPage(${
                        currentPage + 1
                    })"
                >
                    ›
                </button>

            </div>

        `;


        container.innerHTML =
            html;

    }


    window.paymentPage =
        function (page) {

            const totalPages =
                Math.ceil(
                    filteredPayments.length /
                    pageSize
                );


            if (
                page < 1 ||
                page > totalPages
            ) {
                return;
            }


            currentPage =
                page;


            renderTable();
            renderPagination();


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        };


    /* =====================================================
       REFRESH
       ===================================================== */

    function refreshPayments() {

        const button =
            document.getElementById(
                "refreshPaymentsBtn"
            );


        if (button) {

            button.disabled = true;

            button.innerHTML =
                "<span>↻</span> Refreshing...";

        }


        setTimeout(
            function () {

                refreshDataOnly();


                if (button) {

                    button.disabled = false;

                    button.innerHTML =
                        "<span>↻</span> Refresh";

                }


                showToast(
                    "Payment data refreshed.",
                    "success"
                );

            },
            400
        );

    }


    function refreshDataOnly() {

        loadPayments();

        updateStats();

        updatePendingAlert();

        applyFilters();

    }


    /* =====================================================
       CLEAR
       ===================================================== */

    function clearFilters() {

        filters = {

            search: "",
            status: "all",
            method: "all",
            sort: "newest"

        };


        document.getElementById(
            "paymentSearch"
        ).value = "";


        document.getElementById(
            "paymentStatusFilter"
        ).value = "all";


        document.getElementById(
            "paymentMethodFilter"
        ).value = "all";


        document.getElementById(
            "paymentSortFilter"
        ).value = "newest";


        currentPage = 1;

        applyFilters();


        showToast(
            "Filters cleared.",
            "success"
        );

    }


    /* =====================================================
       EXPORT
       ===================================================== */

    function exportPayments() {

        if (!filteredPayments.length) {

            showToast(
                "No payments to export.",
                "warning"
            );

            return;

        }


        const rows = [

            [
                "Payment ID",
                "Citizen",
                "Pickup ID",
                "Amount",
                "Method",
                "Date",
                "Status"
            ]

        ];


        filteredPayments.forEach(
            function (payment) {

                const citizen =
                    getCitizen(
                        payment.citizenId
                    );


                rows.push([

                    payment.id ||
                        payment.paymentId ||
                        payment.transactionId ||
                        "",

                    citizen?.name ||
                        payment.citizenName ||
                        "",

                    payment.pickupId ||
                        "",

                    getAmount(
                        payment
                    ),

                    getReadableMethod(
                        normalizeMethod(
                            payment
                        )
                    ),

                    payment.createdAt ||
                        payment.date ||
                        payment.paidAt ||
                        "",

                    normalizeStatus(
                        payment
                    )

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
            `ekabadi-payments-${new Date()
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
            "Payment CSV exported.",
            "success"
        );

    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function findPayment(id) {

        return payments.find(
            payment =>
                payment.id === id ||
                payment.paymentId === id ||
                payment.transactionId === id
        );

    }


    function getCitizen(id) {

        if (!id) return null;


        if (
            typeof storageGetCitizen ===
            "function"
        ) {

            return storageGetCitizen(
                id
            );

        }


        return null;

    }


    function getPickup(id) {

        if (!id) return null;


        if (
            typeof storageGetPickup ===
            "function"
        ) {

            return storageGetPickup(
                id
            );

        }


        return null;

    }


    function getAmount(payment) {

        return Number(
            payment?.amount ??
            payment?.totalAmount ??
            payment?.value ??
            0
        );

    }


    function normalizeStatus(payment) {

        return String(
            payment?.status ||
            "pending"
        )
            .toLowerCase()
            .replace(
                /\s+/g,
                "_"
            );

    }


    function normalizeMethod(payment) {

        const value =
            String(
                payment?.method ||
                payment?.paymentMethod ||
                payment?.mode ||
                "upi"
            )
                .toLowerCase()
                .replace(
                    /[\s-]+/g,
                    "_"
                );


        if (
            value.includes("bank")
        ) {
            return "bank";
        }


        if (
            value.includes("wallet")
        ) {
            return "wallet";
        }


        if (
            value.includes("cash")
        ) {
            return "cash";
        }


        return "upi";

    }


    function getReadableMethod(method) {

        const labels = {

            upi: "UPI",

            bank: "Bank Transfer",

            wallet: "Wallet",

            cash: "Cash"

        };


        return (
            labels[method] ||
            "UPI"
        );

    }


    function getMethodIcon(method) {

        const icons = {

            upi: "⌁",

            bank: "▣",

            wallet: "▢",

            cash: "₹"

        };


        return (
            icons[method] ||
            "₹"
        );

    }


    function paymentStatusBadge(status) {

        const labels = {

            completed: "Completed",

            pending: "Pending",

            failed: "Failed"

        };


        return `

            <span class="payment-status payment-status-${escapeHTML(
                status
            )}">

                <span class="payment-status-dot"></span>

                ${escapeHTML(
                    labels[status] ||
                    status
                )}

            </span>

        `;

    }


    function getDateValue(payment) {

        const raw =
            payment?.createdAt ||
            payment?.paidAt ||
            payment?.date ||
            payment?.timestamp;


        if (!raw) return 0;


        const value =
            new Date(
                raw
            ).getTime();


        return Number.isNaN(
            value
        )
            ? 0
            : value;

    }


    function formatPaymentDate(payment) {

        const value =
            getDateValue(
                payment
            );


        if (!value) {

            return {
                date: "—",
                time: "—"
            };

        }


        const date =
            new Date(
                value
            );


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


    function getInitials(name) {

        if (
            typeof window.getInitials ===
            "function"
        ) {

            return window.getInitials(
                name
            );

        }


        return String(
            name || "NA"
        )
            .split(" ")
            .map(
                word =>
                    word.charAt(0)
            )
            .slice(0, 2)
            .join("")
            .toUpperCase();

    }


    function formatCurrency(value) {

        if (
            typeof window.formatCurrency ===
            "function"
        ) {

            return window.formatCurrency(
                value
            );

        }


        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }
        ).format(
            value || 0
        );

    }


    function setText(id, value) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                value;

        }

    }


    function escapeHTML(value) {

        if (
            typeof window.escapeHTML ===
            "function"
        ) {

            return window.escapeHTML(
                value
            );

        }


        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    function escapeAttribute(value) {

        return escapeHTML(
            value
        );

    }


    function debounce(fn, delay) {

        if (
            typeof window.debounce ===
            "function"
        ) {

            return window.debounce(
                fn,
                delay
            );

        }


        let timer;


        return function () {

            clearTimeout(
                timer
            );


            const args =
                arguments;


            timer =
                setTimeout(
                    () =>
                        fn.apply(
                            this,
                            args
                        ),
                    delay
                );

        };

    }


})();