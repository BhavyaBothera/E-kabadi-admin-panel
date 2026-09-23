/* =========================================================
   E-KABADI COMMAND CENTER
   REWARDS & ECOCOINS
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
       ===================================================== */

    let rewards = [];
    let filteredRewards = [];

    let currentPage = 1;
    const pageSize = 7;

    let filters = {
        search: "",
        status: "all",
        type: "all",
        sort: "cost_low"
    };


    /* =====================================================
       INIT
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initRewardsPage
    );


    function initRewardsPage() {

        if (
            typeof requireAdminAuth === "function" &&
            !requireAdminAuth()
        ) {
            return;
        }

        loadRewards();
        bindEvents();
        renderPage();

    }


    /* =====================================================
       LOAD
       ===================================================== */

    function loadRewards() {

        if (
            typeof storageGetRewards === "function"
        ) {

            rewards =
                storageGetRewards() || [];

        } else {

            rewards = [];

        }

        filteredRewards =
            [...rewards];

    }


    /* =====================================================
       EVENTS
       ===================================================== */

    function bindEvents() {

        const search =
            document.getElementById(
                "rewardSearch"
            );

        const status =
            document.getElementById(
                "rewardStatusFilter"
            );

        const type =
            document.getElementById(
                "rewardTypeFilter"
            );

        const sort =
            document.getElementById(
                "rewardSortFilter"
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


        if (type) {

            type.addEventListener(
                "change",
                function () {

                    filters.type =
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
                "clearRewardFiltersBtn"
            )
            ?.addEventListener(
                "click",
                clearFilters
            );


        document
            .getElementById(
                "refreshRewardsBtn"
            )
            ?.addEventListener(
                "click",
                refreshRewards
            );


        document
            .getElementById(
                "exportRewardsBtn"
            )
            ?.addEventListener(
                "click",
                exportRewards
            );


        document
            .getElementById(
                "addRewardBtn"
            )
            ?.addEventListener(
                "click",
                openAddRewardModal
            );


        document
            .getElementById(
                "emptyAddRewardBtn"
            )
            ?.addEventListener(
                "click",
                openAddRewardModal
            );

    }


    /* =====================================================
       FILTER
       ===================================================== */

    function applyFilters() {

        filteredRewards =
            rewards.filter(
                function (reward) {

                    const name =
                        String(
                            reward.name ||
                            reward.title ||
                            ""
                        ).toLowerCase();


                    const description =
                        String(
                            reward.description ||
                            ""
                        ).toLowerCase();


                    const matchesSearch =
                        !filters.search ||
                        name.includes(
                            filters.search
                        ) ||
                        description.includes(
                            filters.search
                        );


                    const status =
                        normalizeStatus(
                            reward
                        );


                    const matchesStatus =
                        filters.status === "all" ||
                        status ===
                            filters.status;


                    const type =
                        normalizeType(
                            reward
                        );


                    const matchesType =
                        filters.type === "all" ||
                        type ===
                            filters.type;


                    return (
                        matchesSearch &&
                        matchesStatus &&
                        matchesType
                    );

                }
            );


        sortRewards();

        renderTable();
        renderPagination();
        updateResultCount();

    }


    /* =====================================================
       SORT
       ===================================================== */

    function sortRewards() {

        filteredRewards.sort(
            function (a, b) {

                const costA =
                    getCost(a);

                const costB =
                    getCost(b);


                switch (filters.sort) {

                    case "cost_high":
                        return costB - costA;


                    case "name":
                        return String(
                            a.name ||
                            a.title ||
                            ""
                        ).localeCompare(
                            String(
                                b.name ||
                                b.title ||
                                ""
                            )
                        );


                    case "cost_low":
                    default:
                        return costA - costB;

                }

            }
        );

    }


    /* =====================================================
       PAGE
       ===================================================== */

    function renderPage() {

        updateStats();

        updateRewardProgramStatus();

        applyFilters();

    }

    function updateRewardProgramStatus() {
        const settings = typeof storageGetSettings === "function" ? storageGetSettings() : (window.EKABADI_DATA?.settings || {});
        const heroStrong = document.querySelector(".reward-hero-content strong");
        const heroSpan = document.querySelector(".reward-hero-content span");
        if (settings && settings.enableRewards === false) {
            if (heroStrong) heroStrong.textContent = "⚠️ EcoCoin Rewards Program Paused";
            if (heroSpan) heroSpan.textContent = "The EcoCoin reward redemption program is currently disabled in System Settings. You can enable it under Settings > Platform Features.";
        }
    }


    /* =====================================================
       STATS
       ===================================================== */

    function updateStats() {

        const total =
            rewards.length;


        const active =
            rewards.filter(
                reward =>
                    normalizeStatus(
                        reward
                    ) === "active"
            ).length;


        const costs =
            rewards
                .map(
                    reward =>
                        getCost(
                            reward
                        )
                )
                .filter(
                    value =>
                        value > 0
                );


        const average =
            costs.length
                ? costs.reduce(
                    (
                        total,
                        value
                    ) =>
                        total + value,
                    0
                ) / costs.length
                : 0;


        setText(
            "totalRewardsStat",
            total
        );


        setText(
            "activeRewardsStat",
            active
        );


        setText(
            "averageRewardCostStat",
            Math.round(
                average
            ).toLocaleString(
                "en-IN"
            )
        );

    }


    /* =====================================================
       TABLE
       ===================================================== */

    function renderTable() {

        const tbody =
            document.getElementById(
                "rewardsTableBody"
            );


        const empty =
            document.getElementById(
                "rewardEmptyState"
            );


        if (!tbody) return;


        const start =
            (currentPage - 1) *
            pageSize;


        const pageItems =
            filteredRewards.slice(
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
            function (reward) {

                tbody.insertAdjacentHTML(
                    "beforeend",
                    createRewardRow(
                        reward
                    )
                );

            }
        );

    }


    function createRewardRow(reward) {

        const status =
            normalizeStatus(
                reward
            );


        const type =
            normalizeType(
                reward
            );


        const cost =
            getCost(
                reward
            );


        const requirement =
            reward.requirement ||
            reward.requirements ||
            reward.condition ||
            "Complete eco activities";


        const redemptions =
            Number(
                reward.redemptions ||
                reward.redeemed ||
                reward.claimed ||
                0
            );


        return `

            <tr>

                <td>

                    <div class="reward-cell">

                        <div class="reward-icon reward-icon-${escapeHTML(
                            type
                        )}">
                            ${getRewardIcon(
                                type
                            )}
                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(
                                    reward.name ||
                                    reward.title ||
                                    "Reward"
                                )}
                            </strong>

                            <span class="table-subtext">
                                ${escapeHTML(
                                    reward.description ||
                                    "Eco-friendly achievement"
                                )}
                            </span>

                        </div>

                    </div>

                </td>


                <td>

                    <span class="reward-type">
                        ${escapeHTML(
                            getReadableType(
                                type
                            )
                        )}
                    </span>

                </td>


                <td>

                    <div class="ecoin-cost">

                        <span>
                            ◎
                        </span>

                        <strong>
                            ${cost.toLocaleString(
                                "en-IN"
                            )}
                        </strong>

                        <small>
                            EcoCoins
                        </small>

                    </div>

                </td>


                <td>

                    <span class="reward-requirement">
                        ${escapeHTML(
                            requirement
                        )}
                    </span>

                </td>


                <td>

                    <strong>
                        ${redemptions.toLocaleString(
                            "en-IN"
                        )}
                    </strong>

                </td>


                <td>

                    <button
                        class="reward-status-toggle reward-status-${escapeHTML(
                            status
                        )}"
                        onclick="window.toggleRewardStatus('${escapeAttribute(
                            reward.id
                        )}')"
                    >

                        <span class="reward-status-dot"></span>

                        ${escapeHTML(
                            getReadableStatus(
                                status
                            )
                        )}

                    </button>

                </td>


                <td class="text-right">

                    <div class="table-actions">

                        <button
                            class="icon-btn"
                            title="View reward"
                            onclick="window.viewReward('${escapeAttribute(
                                reward.id
                            )}')"
                        >
                            👁
                        </button>

                        <button
                            class="icon-btn"
                            title="Edit reward"
                            onclick="window.editReward('${escapeAttribute(
                                reward.id
                            )}')"
                        >
                            ✎
                        </button>

                    </div>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       VIEW
       ===================================================== */

    window.viewReward =
        function (id) {

            const reward =
                findReward(id);


            if (!reward) return;


            const type =
                normalizeType(
                    reward
                );


            const status =
                normalizeStatus(
                    reward
                );


            const html = `

                <div class="reward-detail">

                    <div class="reward-detail-header">

                        <div class="reward-detail-icon reward-icon-${escapeHTML(
                            type
                        )}">
                            ${getRewardIcon(
                                type
                            )}
                        </div>

                        <div>

                            <span class="pickup-detail-label">
                                REWARD
                            </span>

                            <h2>
                                ${escapeHTML(
                                    reward.name ||
                                    reward.title ||
                                    "Reward"
                                )}
                            </h2>

                        </div>

                        <span class="reward-status-toggle reward-status-${escapeHTML(
                            status
                        )}">
                            <span class="reward-status-dot"></span>
                            ${escapeHTML(
                                getReadableStatus(
                                    status
                                )
                            )}
                        </span>

                    </div>


                    <div class="reward-description-box">

                        <span>
                            Description
                        </span>

                        <strong>
                            ${escapeHTML(
                                reward.description ||
                                "Environmental achievement reward."
                            )}
                        </strong>

                    </div>


                    <div class="reward-detail-grid">

                        <div class="detail-box">

                            <span>
                                EcoCoin Cost
                            </span>

                            <strong>
                                ◎ ${getCost(
                                    reward
                                ).toLocaleString(
                                    "en-IN"
                                )}
                            </strong>

                        </div>


                        <div class="detail-box">

                            <span>
                                Type
                            </span>

                            <strong>
                                ${escapeHTML(
                                    getReadableType(
                                        type
                                    )
                                )}
                            </strong>

                        </div>


                        <div class="detail-box">

                            <span>
                                Requirement
                            </span>

                            <strong>
                                ${escapeHTML(
                                    reward.requirement ||
                                    reward.requirements ||
                                    reward.condition ||
                                    "Eco activity"
                                )}
                            </strong>

                        </div>


                        <div class="detail-box">

                            <span>
                                Redemptions
                            </span>

                            <strong>
                                ${Number(
                                    reward.redemptions ||
                                    reward.redeemed ||
                                    reward.claimed ||
                                    0
                                ).toLocaleString(
                                    "en-IN"
                                )}
                            </strong>

                        </div>

                    </div>


                    <div class="modal-actions">

                        <button
                            class="btn btn-secondary"
                            onclick="closeModal()"
                        >
                            Close
                        </button>

                        <button
                            class="btn btn-primary"
                            onclick="closeModal(); window.editReward('${escapeAttribute(
                                reward.id
                            )}')"
                        >
                            Edit Reward
                        </button>

                    </div>

                </div>

            `;


            openModal(
                "Reward Details",
                html
            );

        };


    /* =====================================================
       EDIT
       ===================================================== */

    window.editReward =
        function (id) {

            const reward =
                findReward(id);


            if (!reward) return;


            const html = `

                <div class="edit-reward-modal">

                    <div class="form-group">

                        <label for="editRewardName">
                            Reward Name
                        </label>

                        <input
                            type="text"
                            id="editRewardName"
                            class="form-control"
                            value="${escapeAttribute(
                                reward.name ||
                                reward.title ||
                                ""
                            )}"
                        >

                    </div>


                    <div class="form-group">

                        <label for="editRewardDescription">
                            Description
                        </label>

                        <textarea
                            id="editRewardDescription"
                            class="form-control"
                            rows="3"
                        >${escapeHTML(
                            reward.description ||
                            ""
                        )}</textarea>

                    </div>


                    <div class="form-row">

                        <div class="form-group">

                            <label for="editRewardCost">
                                EcoCoin Cost
                            </label>

                            <input
                                type="number"
                                id="editRewardCost"
                                class="form-control"
                                min="0"
                                value="${escapeAttribute(
                                    getCost(
                                        reward
                                    )
                                )}"
                            >

                        </div>


                        <div class="form-group">

                            <label for="editRewardRequirement">
                                Requirement
                            </label>

                            <input
                                type="text"
                                id="editRewardRequirement"
                                class="form-control"
                                value="${escapeAttribute(
                                    reward.requirement ||
                                    ""
                                )}"
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
                            onclick="window.saveReward('${escapeAttribute(
                                reward.id
                            )}')"
                        >
                            Save Changes
                        </button>

                    </div>

                </div>

            `;


            openModal(
                "Edit Reward",
                html
            );

        };


    /* =====================================================
       SAVE EDIT
       ===================================================== */

    window.saveReward =
        function (id) {

            const name =
                document.getElementById(
                    "editRewardName"
                )?.value.trim();


            const description =
                document.getElementById(
                    "editRewardDescription"
                )?.value.trim();


            const cost =
                Number(
                    document.getElementById(
                        "editRewardCost"
                    )?.value || 0
                );


            const requirement =
                document.getElementById(
                    "editRewardRequirement"
                )?.value.trim();


            if (!name) {

                showToast(
                    "Reward name is required.",
                    "warning"
                );

                return;

            }


            if (cost < 0) {

                showToast(
                    "EcoCoin cost cannot be negative.",
                    "warning"
                );

                return;

            }


            let success =
                false;


            if (
                typeof storageUpdateReward ===
                "function"
            ) {

                success =
                    storageUpdateReward(
                        id,
                        {
                            name:
                                name,

                            title:
                                name,

                            description:
                                description,

                            cost:
                                cost,

                            ecoCoins:
                                cost,

                            requirement:
                                requirement,

                            updatedAt:
                                new Date()
                                    .toISOString()
                        }
                    );

            }


            if (!success) {

                showToast(
                    "Unable to update reward.",
                    "error"
                );

                return;

            }


            closeModal();

            showToast(
                "Reward updated successfully.",
                "success"
            );


            refreshDataOnly();

        };


    /* =====================================================
       TOGGLE STATUS
       ===================================================== */

    window.toggleRewardStatus =
    function (id) {

        const reward =
            findReward(id);

        if (!reward) return;

        const current =
            normalizeStatus(reward);

        const next =
            current === "active"
                ? "paused"
                : "active";

        const execute = function () {

            let success = false;

            if (
                typeof storageUpdateReward ===
                "function"
            ) {

                success =
                    storageUpdateReward(
                        id,
                        {
                            status: next,
                            active: next === "active",
                            updatedAt:
                                new Date().toISOString()
                        }
                    );

            }

            if (!success) {

                showToast(
                    "Unable to update reward status.",
                    "error"
                );

                return;
            }

            showToast(
                `Reward ${
                    next === "active"
                        ? "activated"
                        : "paused"
                } successfully.`,
                "success"
            );

            refreshDataOnly();

        };


        if (
            typeof confirmAction ===
            "function"
        ) {

            confirmAction(
                `${
                    next === "active"
                        ? "Activate"
                        : "Pause"
                } this reward?`,
                execute
            );

        } else if (
            window.confirm(
                `${
                    next === "active"
                        ? "Activate"
                        : "Pause"
                } this reward?`
            )
        ) {

            execute();

        }

    };


    /* =====================================================
       ADD
       ===================================================== */

    function openAddRewardModal() {

        const html = `

            <div class="add-reward-modal">

                <div class="reward-form-icon">
                    ★
                </div>


                <div class="form-group">

                    <label for="newRewardName">
                        Reward Name
                    </label>

                    <input
                        type="text"
                        id="newRewardName"
                        class="form-control"
                        placeholder="e.g. Green Champion"
                    >

                </div>


                <div class="form-group">

                    <label for="newRewardDescription">
                        Description
                    </label>

                    <textarea
                        id="newRewardDescription"
                        class="form-control"
                        rows="3"
                        placeholder="Describe the reward..."
                    ></textarea>

                </div>


                <div class="form-row">

                    <div class="form-group">

                        <label for="newRewardType">
                            Type
                        </label>

                        <select
                            id="newRewardType"
                            class="form-control"
                        >

                            <option value="badge">
                                Badge
                            </option>

                            <option value="coupon">
                                Coupon
                            </option>

                            <option value="eco">
                                Eco Reward
                            </option>

                            <option value="challenge">
                                Challenge
                            </option>

                        </select>

                    </div>


                    <div class="form-group">

                        <label for="newRewardCost">
                            EcoCoin Cost
                        </label>

                        <input
                            type="number"
                            id="newRewardCost"
                            class="form-control"
                            min="0"
                            value="100"
                        >

                    </div>

                </div>


                <div class="form-group">

                    <label for="newRewardRequirement">
                        Requirement
                    </label>

                    <input
                        type="text"
                        id="newRewardRequirement"
                        class="form-control"
                        placeholder="e.g. Recycle 10 kg"
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
                        onclick="window.createReward()"
                    >
                        Create Reward
                    </button>

                </div>

            </div>

        `;


        openModal(
            "Create Reward",
            html
        );

    }


    /* =====================================================
       CREATE
       ===================================================== */

    window.createReward =
        function () {

            const name =
                document.getElementById(
                    "newRewardName"
                )?.value.trim();


            const description =
                document.getElementById(
                    "newRewardDescription"
                )?.value.trim();


            const type =
                document.getElementById(
                    "newRewardType"
                )?.value;


            const cost =
                Number(
                    document.getElementById(
                        "newRewardCost"
                    )?.value || 0
                );


            const requirement =
                document.getElementById(
                    "newRewardRequirement"
                )?.value.trim();


            if (!name) {

                showToast(
                    "Reward name is required.",
                    "warning"
                );

                return;

            }


            const reward = {

                id:
                    typeof generateId ===
                    "function"
                        ? generateId("REW")
                        : `REW-${Date.now()}`,

                name:
                    name,

                title:
                    name,

                description:
                    description,

                type:
                    type,

                cost:
                    cost,

                ecoCoins:
                    cost,

                requirement:
                    requirement ||
                    "Complete eco activities",

                redemptions:
                    0,

                status:
                    "active",

                active:
                    true,

                createdAt:
                    new Date()
                        .toISOString(),

                updatedAt:
                    new Date()
                        .toISOString()

            };


            let success =
                false;


            if (
                typeof storageAdd ===
                "function"
            ) {

                success =
                    storageAdd(
                        "rewards",
                        reward
                    );

            }


            if (!success) {

                showToast(
                    "Unable to create reward.",
                    "error"
                );

                return;

            }


            closeModal();

            showToast(
                "Reward created successfully.",
                "success"
            );


            refreshDataOnly();

        };


    /* =====================================================
       PAGINATION
       ===================================================== */

    function renderPagination() {

        const container =
            document.getElementById(
                "rewardPagination"
            );


        if (!container) return;


        const totalPages =
            Math.ceil(
                filteredRewards.length /
                pageSize
            );


        if (totalPages <= 1) {

            container.innerHTML =
                "";

            return;

        }


        let html = `

            <div class="pagination-info">

                Showing
                ${Math.min(
                    (currentPage - 1) *
                        pageSize + 1,
                    filteredRewards.length
                )}
                –
                ${Math.min(
                    currentPage *
                        pageSize,
                    filteredRewards.length
                )}

                of
                ${filteredRewards.length}

            </div>


            <div class="pagination-controls">

                <button
                    class="pagination-btn"
                    ${
                        currentPage === 1
                            ? "disabled"
                            : ""
                    }
                    onclick="window.rewardPage(${
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
                    onclick="window.rewardPage(${i})"
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
                    onclick="window.rewardPage(${
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


    window.rewardPage =
        function (page) {

            const totalPages =
                Math.ceil(
                    filteredRewards.length /
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

    function refreshRewards() {

        const button =
            document.getElementById(
                "refreshRewardsBtn"
            );


        if (button) {

            button.disabled =
                true;

            button.innerHTML =
                "<span>↻</span> Refreshing...";

        }


        setTimeout(
            function () {

                refreshDataOnly();


                if (button) {

                    button.disabled =
                        false;

                    button.innerHTML =
                        "<span>↻</span> Refresh";

                }


                showToast(
                    "Reward data refreshed.",
                    "success"
                );

            },
            400
        );

    }


    function refreshDataOnly() {

        loadRewards();

        updateStats();

        applyFilters();

    }


    /* =====================================================
       CLEAR
       ===================================================== */

    function clearFilters() {

        filters = {

            search: "",
            status: "all",
            type: "all",
            sort: "cost_low"

        };


        document.getElementById(
            "rewardSearch"
        ).value = "";


        document.getElementById(
            "rewardStatusFilter"
        ).value = "all";


        document.getElementById(
            "rewardTypeFilter"
        ).value = "all";


        document.getElementById(
            "rewardSortFilter"
        ).value = "cost_low";


        currentPage =
            1;


        applyFilters();


        showToast(
            "Filters cleared.",
            "success"
        );

    }


    /* =====================================================
       EXPORT
       ===================================================== */

    function exportRewards() {

        if (!filteredRewards.length) {

            showToast(
                "No rewards to export.",
                "warning"
            );

            return;

        }


        const rows = [

            [
                "Reward ID",
                "Reward",
                "Type",
                "EcoCoin Cost",
                "Requirement",
                "Redemptions",
                "Status"
            ]

        ];


        filteredRewards.forEach(
            function (reward) {

                rows.push([

                    reward.id ||
                        "",

                    reward.name ||
                        reward.title ||
                        "",

                    getReadableType(
                        normalizeType(
                            reward
                        )
                    ),

                    getCost(
                        reward
                    ),

                    reward.requirement ||
                        "",

                    reward.redemptions ||
                        reward.redeemed ||
                        0,

                    normalizeStatus(
                        reward
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


        link.href =
            url;


        link.download =
            `ekabadi-rewards-${new Date()
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
            "Rewards CSV exported.",
            "success"
        );

    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function findReward(id) {

        return rewards.find(
            reward =>
                reward.id === id
        );

    }


    function getCost(reward) {

        return Number(
            reward?.cost ??
            reward?.ecoCoins ??
            reward?.coinCost ??
            reward?.points ??
            0
        );

    }


    function normalizeStatus(reward) {

        const raw =
            String(
                reward?.status ||
                (
                    reward?.active === false
                        ? "inactive"
                        : "active"
                )
            )
                .toLowerCase()
                .replace(
                    /\s+/g,
                    "_"
                );


        if (
            raw === "paused"
        ) {
            return "paused";
        }


        if (
            raw === "inactive" ||
            raw === "disabled"
        ) {
            return "inactive";
        }


        return "active";

    }


    function normalizeType(reward) {

        const value =
            String(
                reward?.type ||
                reward?.category ||
                reward?.name ||
                ""
            )
                .toLowerCase();


        if (
            value.includes("coupon") ||
            value.includes("voucher")
        ) {
            return "coupon";
        }


        if (
            value.includes("challenge")
        ) {
            return "challenge";
        }


        if (
            value.includes("eco") ||
            value.includes("environment")
        ) {
            return "eco";
        }


        return "badge";

    }


    function getReadableType(type) {

        const labels = {

            badge:
                "Badge",

            coupon:
                "Coupon",

            eco:
                "Eco Reward",

            challenge:
                "Challenge"

        };


        return (
            labels[type] ||
            "Reward"
        );

    }


    function getReadableStatus(status) {

        const labels = {

            active:
                "Active",

            paused:
                "Paused",

            inactive:
                "Inactive"

        };


        return (
            labels[status] ||
            "Active"
        );

    }


    function getRewardIcon(type) {

        const icons = {

            badge:
                "★",

            coupon:
                "🎁",

            eco:
                "♻",

            challenge:
                "⚡"

        };


        return (
            icons[type] ||
            "★"
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