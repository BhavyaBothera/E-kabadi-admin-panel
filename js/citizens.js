/* ============================================================
   E-KABADI COMMAND CENTER
   Citizens Management
   File: js/citizens.js
   ============================================================ */

(function () {

    "use strict";


    /* =========================================================
       STATE
       ========================================================= */

    const state = {

        citizens: [],

        filtered: [],

        currentPage: 1,

        pageSize: 7,

        search: "",

        status: "all",

        verification: "all",

        sort: "newest"

    };


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function initializeCitizens() {

        loadCitizens();

        bindEvents();

        updateStats();

        renderTable();

    }


    /* =========================================================
       LOAD DATA
       ========================================================= */

    function loadCitizens() {

        if (
            typeof storageGetCitizens ===
            "function"
        ) {

            state.citizens =
                storageGetCitizens() || [];

        } else {

            state.citizens =
                window.EKABADI_DATA?.citizens ||
                [];

        }

    }


    /* =========================================================
       FILTERING
       ========================================================= */

    function filterCitizens() {

        const query =
            state.search
                .toLowerCase()
                .trim();


        state.filtered =
            state.citizens.filter(citizen => {

                const searchable = [

                    citizen.name,

                    citizen.id,

                    citizen.email,

                    citizen.phone,

                    citizen.area,

                    citizen.city,

                    citizen.address

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !query ||
                    searchable.includes(query);


                const matchesStatus =
                    state.status === "all" ||
                    String(
                        citizen.status ||
                        ""
                    ).toLowerCase() ===
                    state.status;


                const verificationStatus =
                    citizen.verified === true ||
                    citizen.verificationStatus ===
                        "verified"
                        ? "verified"
                        : "unverified";


                const matchesVerification =
                    state.verification ===
                        "all" ||
                    verificationStatus ===
                        state.verification;


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesVerification
                );

            });


        sortCitizens();

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
       SORTING
       ========================================================= */

    function sortCitizens() {

        switch (state.sort) {

            case "name":

                state.filtered.sort(
                    (a, b) =>
                        String(a.name || "")
                            .localeCompare(
                                String(
                                    b.name || ""
                                )
                            )
                );

                break;


            case "waste":

                state.filtered.sort(
                    (a, b) =>
                        Number(
                            b.totalWasteSold ||
                            b.wasteRecycled ||
                            b.totalWaste ||
                            0
                        ) -
                        Number(
                            a.totalWasteSold ||
                            a.wasteRecycled ||
                            a.totalWaste ||
                            0
                        )
                );

                break;


            case "earnings":

                state.filtered.sort(
                    (a, b) =>
                        Number(
                            b.totalEarnings ||
                            b.earnings ||
                            0
                        ) -
                        Number(
                            a.totalEarnings ||
                            a.earnings ||
                            0
                        )
                );

                break;


            default:

                state.filtered.sort(
                    (a, b) =>
                        new Date(
                            b.createdAt ||
                            b.joinedAt ||
                            0
                        ) -
                        new Date(
                            a.createdAt ||
                            a.joinedAt ||
                            0
                        )
                );

        }

    }


    /* =========================================================
       TABLE
       ========================================================= */

    function renderTable() {

        filterCitizens();


        const tbody =
            document.getElementById(
                "citizensTableBody"
            );


        if (!tbody) return;


        const start =
            (
                state.currentPage -
                1
            ) *
            state.pageSize;


        const end =
            start +
            state.pageSize;


        const pageItems =
            state.filtered.slice(
                start,
                end
            );


        if (!pageItems.length) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        class="table-empty-cell">

                        <div class="empty-state">

                            <div class="empty-state-icon">
                                ♟
                            </div>

                            <h3>
                                No citizens found
                            </h3>

                            <p>
                                Try changing your
                                search or filters.
                            </p>

                        </div>

                    </td>

                </tr>

            `;

            updateResultsText();

            renderPagination();

            return;
        }


        tbody.innerHTML =
            pageItems
                .map(renderCitizenRow)
                .join("");


        updateResultsText();

        renderPagination();

        bindRowEvents();
    }


    function renderCitizenRow(citizen) {

        const name =
            citizen.name ||
            "Unknown Citizen";


        const initials =
            typeof getInitials ===
            "function"
                ? getInitials(name)
                : name
                    .substring(0, 2)
                    .toUpperCase();


        const location = getCitizenLocation(citizen);


        const pickups =
            citizen.completedPickups ??
            citizen.totalPickups ??
            citizen.pickups ??
            0;


        const waste =
            citizen.totalWasteSold ??
            citizen.wasteRecycled ??
            citizen.totalWaste ??
            0;


        const earnings =
            citizen.totalEarnings ??
            citizen.earnings ??
            0;


        const verified =
            citizen.verified === true ||
            citizen.verificationStatus ===
                "verified";


        const status =
            citizen.status ||
            "active";


        return `

            <tr data-id="${escapeHTML(
                citizen.id
            )}">

                <td>

                    <div class="table-user">

                        <div class="table-avatar">
                            ${initials}
                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(name)}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    citizen.id ||
                                    "No ID"
                                )}
                            </span>

                        </div>

                    </div>

                </td>


                <td>

                    <div class="location-cell">

                        <strong>
                            ${escapeHTML(location)}
                        </strong>

                        <span>
                            ${
                                citizen.city
                                    ? escapeHTML(
                                        citizen.city
                                    )
                                    : "Noida"
                            }
                        </span>

                    </div>

                </td>


                <td>

                    <strong>
                        ${pickups}
                    </strong>

                </td>


                <td>

                    <strong>
                        ${Number(waste).toFixed(1)} kg
                    </strong>

                </td>


                <td>

                    <strong>
                        ${formatCurrency(earnings)}
                    </strong>

                </td>


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


                <td>

                    ${
                        typeof statusBadge ===
                        "function"
                            ? statusBadge(
                                status
                            )
                            : `<span>
                                ${status}
                               </span>`
                    }

                </td>


                <td>

                    <div class="table-actions">

                        <button
                            type="button" class="icon-action view-citizen"
                            data-id="${escapeAttribute(
                                citizen.id
                            )}"
                            title="View">

                            👁

                        </button>

                        <button
                            type="button" class="icon-action more-citizen"
                            data-id="${escapeAttribute(
                                citizen.id
                            )}"
                            title="More">

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

        const citizens =
            state.citizens;


        const total =
            citizens.length;


        const verified =
            citizens.filter(
                citizen =>
                    citizen.verified === true ||
                    citizen.verificationStatus ===
                        "verified"
            ).length;


        const pending =
            citizens.filter(
                citizen =>
                    citizen.status ===
                    "pending"
            ).length;


        const totalWaste =
            citizens.reduce(
                (sum, citizen) =>
                    sum +
                    Number(
                        citizen.totalWasteSold ||
                        citizen.wasteRecycled ||
                        citizen.totalWaste ||
                        0
                    ),
                0
            );


        setText(
            "citizenTotal",
            formatNumber(total)
        );


        setText(
            "citizenVerified",
            formatNumber(verified)
        );


        setText(
            "citizenPending",
            formatNumber(pending)
        );


        setText(
            "citizenWaste",
            `${totalWaste.toFixed(1)} kg`
        );
    }


    /* =========================================================
       PAGINATION
       ========================================================= */

    function renderPagination() {

        const container =
            document.getElementById(
                "citizenPagination"
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
            let page = 1;
            page <= totalPages;
            page++
        ) {

            html += `

                <button
                    class="
                        pagination-btn
                        ${
                            page ===
                            state.currentPage
                                ? "active"
                                : ""
                        }
                    "
                    data-page="${page}">

                    ${page}

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


    function updateResultsText() {

        const element =
            document.getElementById(
                "citizenResults"
            );


        if (!element) return;


        const total =
            state.filtered.length;


        const start =
            total === 0
                ? 0
                : (
                    (
                        state.currentPage -
                        1
                    ) *
                    state.pageSize
                ) + 1;


        const end =
            Math.min(
                state.currentPage *
                state.pageSize,
                total
            );


        element.textContent =
            `Showing ${start}-${end} of ${total} citizens`;
    }


    /* =========================================================
       ROW EVENTS
       ========================================================= */

    function bindRowEvents() {

        document
            .querySelectorAll(
                ".view-citizen"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        viewCitizen(
                            button.dataset.id
                        );

                    }
                );

            });


        document
            .querySelectorAll(
                ".more-citizen"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        openCitizenActions(
                            button.dataset.id
                        );

                    }
                );

            });
    }


    /* =========================================================
       VIEW CITIZEN
       ========================================================= */

    function viewCitizen(id) {

        const citizen =
            findCitizen(id);


        if (!citizen) {

            showToast(
                "Citizen could not be found.",
                "error",
                "Error"
            );

            return;
        }


        const name =
            citizen.name ||
            "Citizen";


        const waste =
            Number(
                citizen.totalWasteSold ||
                citizen.wasteRecycled ||
                0
            );


        const earnings =
            Number(
                citizen.totalEarnings ||
                citizen.earnings ||
                0
            );


        const pickups =
            citizen.completedPickups ??
            citizen.totalPickups ??
            0;


        const coins =
            citizen.ecoCoins ||
            citizen.coins ||
            0;


        openModal({

            title: name,

            eyebrow:
                citizen.id ||
                "CITIZEN PROFILE",

            description:
                "Citizen activity and account overview.",

            size: "medium",

            content: `

                <div class="citizen-profile">

                    <div class="profile-hero">

                        <div class="profile-avatar">
                            ${
                                typeof getInitials ===
                                "function"
                                    ? getInitials(name)
                                    : name
                                        .substring(0,2)
                                        .toUpperCase()
                            }
                        </div>

                        <div>

                            <h3>
                                ${escapeHTML(name)}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    citizen.email ||
                                    "No email available"
                                )}
                            </p>

                            <div class="profile-statuses">

                                ${
                                    statusBadge(
                                        citizen.status ||
                                        "active"
                                    )
                                }

                                ${
                                    citizen.verified
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
                                                ● Unverified
                                            </span>
                                          `
                                }

                            </div>

                        </div>

                    </div>


                    <div class="profile-stats">

                        <div>
                            <strong>
                                ${pickups}
                            </strong>
                            <span>
                                Pickups
                            </span>
                        </div>

                        <div>
                            <strong>
                                ${waste.toFixed(1)} kg
                            </strong>
                            <span>
                                Waste recycled
                            </span>
                        </div>

                        <div>
                            <strong>
                                ${formatCurrency(
                                    earnings
                                )}
                            </strong>
                            <span>
                                Earnings
                            </span>
                        </div>

                        <div>
                            <strong>
                                ${coins}
                            </strong>
                            <span>
                                EcoCoins
                            </span>
                        </div>

                    </div>


                    <div class="profile-details">

                        <div class="profile-detail">

                            <span>Phone</span>

                            <strong>
                                ${
                                    escapeHTML(
                                        citizen.phone ||
                                        "Not provided"
                                    )
                                }
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span>Location</span>

                            <strong>
                                ${
                                    escapeHTML(
                                        citizen.area ||
                                        citizen.location ||
                                        "Not provided"
                                    )
                                }
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span>Rating</span>

                            <strong>
                                ⭐ ${
                                    citizen.rating ||
                                    "—"
                                }
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span>Member Since</span>

                            <strong>
                                ${
                                    formatDate(
                                        citizen.createdAt ||
                                        citizen.joinedAt
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
                    id="profileActionBtn">
                    Manage Account
                </button>

            `,

            onOpen: () => {

                const action =
                    document.getElementById(
                        "profileActionBtn"
                    );


                if (action) {

                    action.addEventListener(
                        "click",
                        () => {

                            closeModal();

                            openCitizenActions(
                                citizen.id
                            );

                        }
                    );
                }

            }

        });
    }


    /* =========================================================
       CITIZEN ACTIONS
       ========================================================= */

    function openCitizenActions(id) {

        const citizen =
            findCitizen(id);


        if (!citizen) return;


        const isSuspended =
            citizen.status ===
            "suspended";


        openModal({

            title:
                `Manage ${citizen.name}`,

            eyebrow:
                citizen.id,

            size: "small",

            content: `

                <div class="action-menu">

                    <button
                        class="action-menu-item"
                        id="actionView">

                        <span>👁</span>

                        <div>
                            <strong>
                                View Profile
                            </strong>
                            <small>
                                See complete citizen details
                            </small>
                        </div>

                    </button>


                    ${
                        isSuspended
                            ? `
                                <button
                                    class="action-menu-item"
                                    id="actionActivate">

                                    <span>✓</span>

                                    <div>
                                        <strong>
                                            Activate Account
                                        </strong>
                                        <small>
                                            Restore citizen access
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
                                    id="actionSuspend">

                                    <span>⊘</span>

                                    <div>
                                        <strong>
                                            Suspend Account
                                        </strong>
                                        <small>
                                            Temporarily block access
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
                        "actionView"
                    );


                if (view) {

                    view.addEventListener(
                        "click",
                        () => {

                            closeModal();

                            setTimeout(
                                () =>
                                    viewCitizen(id),
                                220
                            );

                        }
                    );
                }


                const suspend =
                    document.getElementById(
                        "actionSuspend"
                    );


                if (suspend) {

                    suspend.addEventListener(
                        "click",
                        () => {

                            closeModal();

                            setTimeout(
                                () =>
                                    suspendCitizen(
                                        id
                                    ),
                                220
                            );

                        }
                    );
                }


                const activate =
                    document.getElementById(
                        "actionActivate"
                    );


                if (activate) {

                    activate.addEventListener(
                        "click",
                        () => {

                            activateCitizen(
                                id
                            );

                        }
                    );
                }

            }

        });
    }


    /* =========================================================
       SUSPEND
       ========================================================= */

    async function suspendCitizen(id) {

        const citizen =
            findCitizen(id);


        if (!citizen) return;


        const confirmed =
            await confirmAction({

                title:
                    "Suspend citizen?",

                message:
                    `${citizen.name} will no longer be able to use the E-Kabadi platform until the account is reactivated.`,

                confirmText:
                    "Suspend Account",

                cancelText:
                    "Keep Active",

                danger: true

            });


        if (!confirmed) return;


        if (
            typeof suspendCitizen ===
            "function"
        ) {
            // Prevent accidental recursive implementation.
        }


        let updated = null;


        if (
            typeof storageSetCitizenStatus ===
            "function"
        ) {

            updated =
                storageSetCitizenStatus(
                    id,
                    "suspended"
                );

        } else if (
            typeof storageUpdateCitizen ===
            "function"
        ) {

            updated =
                storageUpdateCitizen(
                    id,
                    {
                        status: "suspended"
                    }
                );

        }


        if (updated) {

            loadCitizens();

            updateStats();

            renderTable();


            showToast(
                `${citizen.name} has been suspended.`,
                "success",
                "Account Updated"
            );

        } else {

            // Prototype fallback.

            citizen.status =
                "suspended";

            saveLocalFallback();

            updateStats();

            renderTable();

        }
    }


    /* =========================================================
       ACTIVATE
       ========================================================= */

    function activateCitizen(id) {

        const citizen =
            findCitizen(id);


        if (!citizen) return;


        let updated = null;


        if (
            typeof storageSetCitizenStatus ===
            "function"
        ) {

            updated =
                storageSetCitizenStatus(
                    id,
                    "active"
                );

        } else if (
            typeof storageUpdateCitizen ===
            "function"
        ) {

            updated =
                storageUpdateCitizen(
                    id,
                    {
                        status: "active"
                    }
                );

        }


        closeModal();


        setTimeout(() => {

            if (updated) {

                loadCitizens();

            } else {

                citizen.status =
                    "active";

                saveLocalFallback();
            }


            updateStats();

            renderTable();


            showToast(
                `${citizen.name} has been activated.`,
                "success",
                "Account Activated"
            );

        }, 220);
    }


    /* =========================================================
       ADD CITIZEN
       ========================================================= */

    function openAddCitizenModal() {

        openModal({

            title: "Add Citizen",

            eyebrow: "NEW ACCOUNT",

            description:
                "Create a citizen account for the E-Kabadi platform.",

            size: "medium",

            content: `

                <form
                    id="addCitizenForm"
                    class="admin-form">

                    <div class="form-grid">

                        <div class="form-group">

                            <label>
                                Full Name
                            </label>

                            <input
                                type="text"
                                id="newCitizenName"
                                required
                                placeholder="Enter full name"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Email
                            </label>

                            <input
                                type="email"
                                id="newCitizenEmail"
                                required
                                placeholder="citizen@email.com"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Phone
                            </label>

                            <input
                                type="tel"
                                id="newCitizenPhone"
                                placeholder="+91 XXXXX XXXXX"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Area
                            </label>

                            <input
                                type="text"
                                id="newCitizenArea"
                                placeholder="e.g. Sector 62"
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
                    id="saveCitizenBtn">
                    Create Citizen
                </button>

            `,

            onOpen: () => {

                const button =
                    document.getElementById(
                        "saveCitizenBtn"
                    );


                if (button) {

                    button.addEventListener(
                        "click",
                        createCitizen
                    );

                }

            }

        });
    }


    function createCitizen() {

        const name =
            document.getElementById(
                "newCitizenName"
            )?.value.trim();


        const email =
            document.getElementById(
                "newCitizenEmail"
            )?.value.trim();


        const phone =
            document.getElementById(
                "newCitizenPhone"
            )?.value.trim();


        const area =
            document.getElementById(
                "newCitizenArea"
            )?.value.trim();


        if (!name || !email) {

            showToast(
                "Name and email are required.",
                "warning",
                "Missing Information"
            );

            return;
        }


        if (!isValidEmail(email)) {
            showToast(
                "Please enter a valid email address.",
                "warning",
                "Invalid Email"
            );
            return;
        }

        const duplicate = state.citizens.some(
            citizen =>
                String(citizen.email || "").toLowerCase() ===
                email.toLowerCase()
        );

        if (duplicate) {
            showToast(
                "A citizen with this email already exists.",
                "warning",
                "Duplicate Email"
            );
            return;
        }

        const newCitizen = {

            id:
                generateCitizenId(),

            name,

            email,

            phone,

            area:
                area ||
                "Not assigned",

            city: "Noida",

            status: "active",

            verified: false,

            verificationStatus:
                "unverified",

            totalPickups: 0,

            completedPickups: 0,

            totalWasteSold: 0,

            totalEarnings: 0,

            ecoCoins: 0,

            rating: 0,

            createdAt:
                new Date().toISOString()

        };


        let saved = false;


        if (
            typeof storageAdd ===
            "function"
        ) {

            const result =
                storageAdd(
                    "citizens",
                    newCitizen
                );

            saved =
                Boolean(result);

        }


        if (!saved) {

            state.citizens.push(
                newCitizen
            );

            saveLocalFallback();

        }


        closeModal();


        setTimeout(() => {

            loadCitizens();

            updateStats();

            renderTable();


            showToast(
                `${name} has been added successfully.`,
                "success",
                "Citizen Created"
            );

        }, 220);
    }


    function generateCitizenId() {

        const numbers =
            state.citizens
                .map(citizen =>
                    parseInt(
                        String(
                            citizen.id ||
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
            numbers.length
                ? Math.max(...numbers)
                : 1000;


        return `CIT-${max + 1}`;
    }


    /* =========================================================
       EXPORT
       ========================================================= */

    function exportCitizens() {

        const data =
            state.filtered.map(
                citizen => ({
                    ID:
                        citizen.id,

                    Name:
                        citizen.name,

                    Email:
                        citizen.email,

                    Phone:
                        citizen.phone,

                    Area:
                        citizen.area,

                    Status:
                        citizen.status,

                    Verified:
                        citizen.verified
                            ? "Yes"
                            : "No",

                    Pickups:
                        citizen.totalPickups ||
                        0,

                    WasteKg:
                        citizen.totalWasteSold ||
                        0,

                    Earnings:
                        citizen.totalEarnings ||
                        0
                })
            );


        if (!data.length) {

            showToast(
                "There is no citizen data to export.",
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

            ...data.map(row =>
                headers
                    .map(header =>
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
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href = url;

        link.download =
            `ekabadi-citizens-${new Date()
                .toISOString()
                .slice(0,10)}.csv`;


        link.click();


        URL.revokeObjectURL(url);


        showToast(
            `${data.length} citizen records exported.`,
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
                "citizenSearch"
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
                "statusFilter"
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
                "verificationFilter"
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


        const resetFilters =
            document.getElementById("resetCitizenFilters");

        if (resetFilters) {
            resetFilters.addEventListener("click", () => {
                state.search = "";
                state.status = "all";
                state.verification = "all";
                state.sort = "newest";
                state.currentPage = 1;

                const searchInput = document.getElementById("citizenSearch");
                const statusInput = document.getElementById("statusFilter");
                const verificationInput = document.getElementById("verificationFilter");
                const sortInput = document.getElementById("sortFilter");

                if (searchInput) searchInput.value = "";
                if (statusInput) statusInput.value = "all";
                if (verificationInput) verificationInput.value = "all";
                if (sortInput) sortInput.value = "newest";

                renderTable();
            });
        }

        const sort =
            document.getElementById(
                "sortFilter"
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
                "addCitizenBtn"
            );


        if (add) {

            add.addEventListener(
                "click",
                openAddCitizenModal
            );

        }


        const exportButton =
            document.getElementById(
                "exportCitizensBtn"
            );


        if (exportButton) {

            exportButton.addEventListener(
                "click",
                exportCitizens
            );

        }


        document.addEventListener(
            "ekabadi:data-refresh",
            () => {

                loadCitizens();

                updateStats();

                renderTable();

            }
        );
    }


    /* =========================================================
       HELPERS
       ========================================================= */

    function findCitizen(id) {

        return state.citizens.find(
            citizen =>
                String(citizen.id) ===
                String(id)
        );
    }

    function getCitizenLocation(citizen) {
        if (!citizen) return "—";

        const location = citizen.location;

        if (typeof location === "string" && location.trim()) {
            return location.trim();
        }

        if (location && typeof location === "object") {
            return location.area ||
                location.name ||
                location.address ||
                location.city ||
                citizen.area ||
                citizen.city ||
                "—";
        }

        return citizen.area || citizen.city || "—";
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }



    function saveLocalFallback() {

        try {

            localStorage.setItem(
                "ekabadi_admin_citizens_fallback",
                JSON.stringify(
                    state.citizens
                )
            );

        } catch (error) {

            console.error(
                "Fallback save failed:",
                error
            );

        }
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


    function formatCurrency(value) {

        return (
            Number(value) || 0
        ).toLocaleString(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }
        );
    }


    function formatDate(value) {

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


    /* =========================================================
       EXPOSE API
       ========================================================= */

    window.EKABADI_CITIZENS = {

        state,

        loadCitizens,

        renderTable,

        viewCitizen,

        openAddCitizenModal,

        exportCitizens

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
            initializeCitizens
        );

    } else {

        initializeCitizens();

    }

})();