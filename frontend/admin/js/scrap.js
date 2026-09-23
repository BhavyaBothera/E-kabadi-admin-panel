/* =========================================================
   E-KABADI COMMAND CENTER
   SCRAP MATERIAL MANAGEMENT
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
       ===================================================== */

    let materials = [];
    let filteredMaterials = [];

    let currentPage = 1;
    const pageSize = 8;

    let filters = {
        search: "",
        type: "all",
        status: "all",
        sort: "name"
    };


    /* =====================================================
       INIT
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initScrapPage
    );


    function initScrapPage() {

        if (
            typeof requireAdminAuth === "function" &&
            !requireAdminAuth()
        ) {
            return;
        }

        loadMaterials();
        bindEvents();
        renderPage();

    }


    /* =====================================================
       DATA
       ===================================================== */

    function loadMaterials() {

        if (
            typeof storageGetMaterials === "function"
        ) {

            materials =
                storageGetMaterials() || [];

        } else {

            materials = [];

        }

        filteredMaterials =
            [...materials];

    }


    /* =====================================================
       EVENTS
       ===================================================== */

    function bindEvents() {

        const search =
            document.getElementById(
                "scrapSearch"
            );

        const type =
            document.getElementById(
                "materialTypeFilter"
            );

        const status =
            document.getElementById(
                "materialStatusFilter"
            );

        const sort =
            document.getElementById(
                "materialSortFilter"
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
                "clearScrapFiltersBtn"
            )
            ?.addEventListener(
                "click",
                clearFilters
            );


        document
            .getElementById(
                "refreshScrapBtn"
            )
            ?.addEventListener(
                "click",
                refreshMaterials
            );


        document
            .getElementById(
                "exportScrapBtn"
            )
            ?.addEventListener(
                "click",
                exportMaterials
            );


        document
            .getElementById(
                "addMaterialBtn"
            )
            ?.addEventListener(
                "click",
                openAddMaterialModal
            );


        document
            .getElementById(
                "emptyAddMaterialBtn"
            )
            ?.addEventListener(
                "click",
                openAddMaterialModal
            );

    }


    /* =====================================================
       FILTERS
       ===================================================== */

    function applyFilters() {

        filteredMaterials =
            materials.filter(
                function (material) {

                    const name =
                        String(
                            material.name || ""
                        ).toLowerCase();


                    const category =
                        String(
                            material.category ||
                            material.type ||
                            ""
                        ).toLowerCase();


                    const matchesSearch =
                        !filters.search ||
                        name.includes(
                            filters.search
                        ) ||
                        category.includes(
                            filters.search
                        );


                    const materialType =
                        normalizeType(
                            material
                        );


                    const matchesType =
                        filters.type === "all" ||
                        materialType ===
                            filters.type;


                    const materialStatus =
                        material.active === false ||
                        material.status === "inactive"
                            ? "inactive"
                            : "active";


                    const matchesStatus =
                        filters.status === "all" ||
                        materialStatus ===
                            filters.status;


                    return (
                        matchesSearch &&
                        matchesType &&
                        matchesStatus
                    );

                }
            );


        sortMaterials();

        renderTable();
        renderPagination();
        updateResultCount();

    }


    /* =====================================================
       SORT
       ===================================================== */

    function sortMaterials() {

        filteredMaterials.sort(
            function (a, b) {

                const currentA =
                    Number(
                        a.rate ??
                        a.currentRate ??
                        a.price ??
                        0
                    );


                const currentB =
                    Number(
                        b.rate ??
                        b.currentRate ??
                        b.price ??
                        0
                    );


                switch (filters.sort) {

                    case "rate_high":
                        return (
                            currentB -
                            currentA
                        );


                    case "rate_low":
                        return (
                            currentA -
                            currentB
                        );


                    case "change":

                        return (
                            Math.abs(
                                getRateChange(
                                    b
                                )
                            ) -
                            Math.abs(
                                getRateChange(
                                    a
                                )
                            )
                        );


                    case "name":

                    default:

                        return String(
                            a.name || ""
                        ).localeCompare(
                            String(
                                b.name || ""
                            )
                        );

                }

            }
        );

    }


    /* =====================================================
       RENDER
       ===================================================== */

    function renderPage() {

        updateStats();

        applyFilters();

    }


    /* =====================================================
       STATS
       ===================================================== */

    function updateStats() {

        const total =
            materials.length;


        const active =
            materials.filter(
                function (material) {

                    return !(
                        material.active === false ||
                        material.status === "inactive"
                    );

                }
            ).length;


        const rates =
            materials
                .map(
                    material =>
                        Number(
                            material.rate ??
                            material.currentRate ??
                            material.price ??
                            0
                        )
                )
                .filter(
                    rate => rate > 0
                );


        const average =
            rates.length
                ? rates.reduce(
                    (sum, rate) =>
                        sum + rate,
                    0
                ) / rates.length
                : 0;


        const changes =
            materials.filter(
                material =>
                    getRateChange(material) !== 0
            ).length;


        setText(
            "totalMaterialsStat",
            total
        );


        setText(
            "activeMaterialsStat",
            active
        );


        setText(
            "averageRateStat",
            formatCurrency(
                average
            )
        );


        setText(
            "rateChangesStat",
            changes
        );

    }


    /* =====================================================
       TABLE
       ===================================================== */

    function renderTable() {

        const tbody =
            document.getElementById(
                "scrapTableBody"
            );

        const empty =
            document.getElementById(
                "scrapEmptyState"
            );


        if (!tbody) return;


        const start =
            (currentPage - 1) *
            pageSize;


        const pageItems =
            filteredMaterials.slice(
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
            function (material) {

                tbody.insertAdjacentHTML(
                    "beforeend",
                    createMaterialRow(
                        material
                    )
                );

            }
        );

    }


    function createMaterialRow(material) {

        const currentRate =
            getCurrentRate(
                material
            );


        const previousRate =
            getPreviousRate(
                material
            );


        const change =
            currentRate -
            previousRate;


        const changePercent =
            previousRate
                ? (
                    change /
                    previousRate
                ) * 100
                : 0;


        const active =
            !(
                material.active === false ||
                material.status === "inactive"
            );


        const type =
            normalizeType(
                material
            );


        const category =
            material.category ||
            getReadableType(type);


        const impact =
            material.environmentalImpact ||
            material.impact ||
            "Recyclable material";


        return `

            <tr>

                <td>

                    <div class="material-cell">

                        <div class="material-icon material-${escapeHTML(type)}">
                            ${getMaterialIcon(type)}
                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(
                                    material.name ||
                                    "Unnamed Material"
                                )}
                            </strong>

                            <span class="table-subtext">
                                ${escapeHTML(
                                    material.id ||
                                    ""
                                )}
                            </span>

                        </div>

                    </div>

                </td>


                <td>

                    <span class="material-category">
                        ${escapeHTML(
                            category
                        )}
                    </span>

                </td>


                <td>

                    <div class="rate-cell">

                        <strong>
                            ${formatCurrency(
                                currentRate
                            )}
                        </strong>

                        <span>
                            / kg
                        </span>

                    </div>

                </td>


                <td>

                    <span class="previous-rate">
                        ${formatCurrency(
                            previousRate
                        )}
                    </span>

                </td>


                <td>

                    ${
                        change > 0
                            ? `
                                <span class="rate-change rate-up">
                                    ↑ ${Math.abs(
                                        changePercent
                                    ).toFixed(1)}%
                                </span>
                            `
                            : change < 0
                            ? `
                                <span class="rate-change rate-down">
                                    ↓ ${Math.abs(
                                        changePercent
                                    ).toFixed(1)}%
                                </span>
                            `
                            : `
                                <span class="rate-change rate-neutral">
                                    —
                                </span>
                            `
                    }

                </td>


                <td>

                    ${
                        material.recyclable !== false
                            ? `
                                <span class="recyclable-pill">
                                    ✓ Recyclable
                                </span>
                            `
                            : `
                                <span class="non-recyclable-pill">
                                    Not recyclable
                                </span>
                            `
                    }

                </td>


                <td>

                    <span class="impact-cell">
                        ${escapeHTML(
                            impact
                        )}
                    </span>

                </td>


                <td>

                    <button
                        class="status-toggle ${
                            active
                                ? "is-active"
                                : "is-inactive"
                        }"
                        onclick="window.toggleMaterial('${escapeAttribute(
                            material.id
                        )}')"
                        title="Toggle material status"
                    >

                        <span class="status-toggle-dot"></span>

                        ${
                            active
                                ? "Active"
                                : "Inactive"
                        }

                    </button>

                </td>


                <td class="text-right">

                    <div class="table-actions">

                        <button
                            class="icon-btn"
                            title="Edit material"
                            onclick="window.editMaterial('${escapeAttribute(
                                material.id
                            )}')"
                        >
                            ✎
                        </button>

                        <button
                            class="icon-btn"
                            title="View details"
                            onclick="window.viewMaterial('${escapeAttribute(
                                material.id
                            )}')"
                        >
                            👁
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
                "scrapPagination"
            );


        if (!container) return;


        const totalPages =
            Math.ceil(
                filteredMaterials.length /
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
                    filteredMaterials.length
                )}
                –
                ${Math.min(
                    currentPage *
                        pageSize,
                    filteredMaterials.length
                )}

                of
                ${filteredMaterials.length}

            </div>


            <div class="pagination-controls">

                <button
                    class="pagination-btn"
                    ${
                        currentPage === 1
                            ? "disabled"
                            : ""
                    }
                    onclick="window.scrapPage(${
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
                    onclick="window.scrapPage(${i})"
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
                    onclick="window.scrapPage(${
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


    window.scrapPage =
        function (page) {

            const totalPages =
                Math.ceil(
                    filteredMaterials.length /
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
       VIEW MATERIAL
       ===================================================== */

    window.viewMaterial =
        function (id) {

            const material =
                findMaterial(id);


            if (!material) return;


            const currentRate =
                getCurrentRate(
                    material
                );


            const previousRate =
                getPreviousRate(
                    material
                );


            const change =
                currentRate -
                previousRate;


            const changePercent =
                previousRate
                    ? (
                        change /
                        previousRate
                    ) * 100
                    : 0;


            const html = `

                <div class="material-detail">

                    <div class="material-detail-header">

                        <div class="material-detail-icon material-${escapeHTML(
                            normalizeType(
                                material
                            )
                        )}">
                            ${getMaterialIcon(
                                normalizeType(
                                    material
                                )
                            )}
                        </div>

                        <div>

                            <span class="pickup-detail-label">
                                MATERIAL
                            </span>

                            <h2>
                                ${escapeHTML(
                                    material.name ||
                                    "Material"
                                )}
                            </h2>

                        </div>

                        ${
                            !(
                                material.active === false ||
                                material.status === "inactive"
                            )
                                ? `
                                    <span class="status-badge status-active">
                                        Active
                                    </span>
                                `
                                : `
                                    <span class="status-badge status-inactive">
                                        Inactive
                                    </span>
                                `
                        }

                    </div>


                    <div class="material-detail-grid">

                        <div class="detail-box">

                            <span>
                                Current Rate
                            </span>

                            <strong>
                                ${formatCurrency(
                                    currentRate
                                )}
                                / kg
                            </strong>

                        </div>


                        <div class="detail-box">

                            <span>
                                Previous Rate
                            </span>

                            <strong>
                                ${formatCurrency(
                                    previousRate
                                )}
                                / kg
                            </strong>

                        </div>


                        <div class="detail-box">

                            <span>
                                Rate Change
                            </span>

                            <strong>
                                ${
                                    change > 0
                                        ? `↑ ${Math.abs(changePercent).toFixed(1)}%`
                                        : change < 0
                                        ? `↓ ${Math.abs(changePercent).toFixed(1)}%`
                                        : "No change"
                                }
                            </strong>

                        </div>


                        <div class="detail-box">

                            <span>
                                Category
                            </span>

                            <strong>
                                ${escapeHTML(
                                    material.category ||
                                    getReadableType(
                                        normalizeType(
                                            material
                                        )
                                    )
                                )}
                            </strong>

                        </div>

                    </div>


                    <div class="material-impact-box">

                        <span>
                            Environmental Impact
                        </span>

                        <strong>
                            ${escapeHTML(
                                material.environmentalImpact ||
                                material.impact ||
                                "Recyclable material"
                            )}
                        </strong>

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
                            onclick="closeModal(); window.editMaterial('${escapeAttribute(
                                material.id
                            )}')"
                        >
                            Edit Rate
                        </button>

                    </div>

                </div>

            `;


            openModal(
                "Material Details",
                html
            );

        };


    /* =====================================================
       EDIT MATERIAL
       ===================================================== */

    window.editMaterial =
        function (id) {

            const material =
                findMaterial(id);


            if (!material) return;


            const currentRate =
                getCurrentRate(
                    material
                );


            const previousRate =
                getPreviousRate(
                    material
                );


            const html = `

                <div class="edit-material-modal">

                    <div class="rate-edit-summary">

                        <div class="material-detail-icon material-${escapeHTML(
                            normalizeType(
                                material
                            )
                        )}">
                            ${getMaterialIcon(
                                normalizeType(
                                    material
                                )
                            )}
                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(
                                    material.name
                                )}
                            </strong>

                            <span>
                                Current:
                                ${formatCurrency(
                                    currentRate
                                )}/kg
                            </span>

                        </div>

                    </div>


                    <div class="form-group">

                        <label for="materialRateInput">
                            New Rate (₹ / kg)
                        </label>

                        <input
                            type="number"
                            id="materialRateInput"
                            class="form-control"
                            min="0"
                            step="0.5"
                            value="${escapeAttribute(
                                currentRate
                            )}"
                        >

                    </div>


                    <div class="rate-preview">

                        <div>

                            <span>
                                Previous
                            </span>

                            <strong>
                                ${formatCurrency(
                                    previousRate
                                )}
                            </strong>

                        </div>

                        <div class="rate-arrow">
                            →
                        </div>

                        <div>

                            <span>
                                New
                            </span>

                            <strong id="newRatePreview">
                                ${formatCurrency(
                                    currentRate
                                )}
                            </strong>

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
                            onclick="window.saveMaterialRate('${escapeAttribute(
                                material.id
                            )}')"
                        >
                            Update Rate
                        </button>

                    </div>

                </div>

            `;


            openModal(
                "Update Material Rate",
                html
            );


            setTimeout(function () {

                const input =
                    document.getElementById(
                        "materialRateInput"
                    );

                const preview =
                    document.getElementById(
                        "newRatePreview"
                    );


                if (
                    input &&
                    preview
                ) {

                    input.addEventListener(
                        "input",
                        function () {

                            preview.textContent =
                                formatCurrency(
                                    Number(
                                        this.value ||
                                        0
                                    )
                                );

                        }
                    );

                }

            }, 50);

        };


    /* =====================================================
       SAVE RATE
       ===================================================== */

    window.saveMaterialRate =
        function (id) {

            const input =
                document.getElementById(
                    "materialRateInput"
                );


            const rate =
                Number(
                    input?.value || 0
                );


            if (
                !Number.isFinite(rate) ||
                rate < 0
            ) {

                showToast(
                    "Enter a valid material rate.",
                    "warning"
                );

                return;

            }


            let success = false;


            if (
                typeof updateMaterialRate ===
                "function"
            ) {

                success =
                    updateMaterialRate(
                        id,
                        rate
                    );

            } else if (
                typeof storageUpdateMaterial ===
                "function"
            ) {

                success =
                    storageUpdateMaterial(
                        id,
                        {
                            previousRate:
                                getCurrentRate(
                                    findMaterial(
                                        id
                                    )
                                ),

                            rate: rate,

                            updatedAt:
                                new Date()
                                    .toISOString()
                        }
                    );

            }


            if (!success) {

                showToast(
                    "Unable to update material rate.",
                    "error"
                );

                return;

            }


            closeModal();

            showToast(
                "Material rate updated successfully.",
                "success"
            );


            refreshDataOnly();

        };


    /* =====================================================
       TOGGLE MATERIAL
       ===================================================== */

    window.toggleMaterial =
        function (id) {

            const material =
                findMaterial(id);


            if (!material) return;


            const currentlyActive =
                !(
                    material.active === false ||
                    material.status === "inactive"
                );


            const action =
                currentlyActive
                    ? "deactivate"
                    : "activate";


            const message =
                currentlyActive
                    ? "Deactivate this material?"
                    : "Activate this material?";


            const execute =
                function () {

                    let success =
                        false;


                    if (
                        typeof toggleMaterialStatus ===
                        "function"
                    ) {

                        success =
                            toggleMaterialStatus(
                                id
                            );

                    } else if (
                        typeof storageUpdateMaterial ===
                        "function"
                    ) {

                        success =
                            storageUpdateMaterial(
                                id,
                                {
                                    active:
                                        !currentlyActive,

                                    status:
                                        currentlyActive
                                            ? "inactive"
                                            : "active",

                                    updatedAt:
                                        new Date()
                                            .toISOString()
                                }
                            );

                    }


                    if (success) {

                        showToast(
                            `Material ${action}d successfully.`,
                            "success"
                        );

                        refreshDataOnly();

                    } else {

                        showToast(
                            "Unable to update material status.",
                            "error"
                        );

                    }

                };


            if (
                typeof confirmAction ===
                "function"
            ) {

                confirmAction(
                    message,
                    execute
                );

            } else {

                if (
                    window.confirm(
                        message
                    )
                ) {

                    execute();

                }

            }

        };


    /* =====================================================
       ADD MATERIAL
       ===================================================== */

    function openAddMaterialModal() {

        const html = `

            <div class="add-material-modal">

                <div class="form-group">

                    <label for="newMaterialName">
                        Material Name
                    </label>

                    <input
                        type="text"
                        id="newMaterialName"
                        class="form-control"
                        placeholder="e.g. Copper"
                    >

                </div>


                <div class="form-row">

                    <div class="form-group">

                        <label for="newMaterialType">
                            Category
                        </label>

                        <select
                            id="newMaterialType"
                            class="form-control"
                        >

                            <option value="plastic">
                                Plastic
                            </option>

                            <option value="paper">
                                Paper
                            </option>

                            <option value="metal">
                                Metal
                            </option>

                            <option value="glass">
                                Glass
                            </option>

                            <option value="ewaste">
                                E-Waste
                            </option>

                        </select>

                    </div>


                    <div class="form-group">

                        <label for="newMaterialRate">
                            Rate (₹ / kg)
                        </label>

                        <input
                            type="number"
                            id="newMaterialRate"
                            class="form-control"
                            min="0"
                            step="0.5"
                            placeholder="e.g. 50"
                        >

                    </div>

                </div>


                <div class="form-group">

                    <label for="newMaterialImpact">
                        Environmental Impact
                    </label>

                    <input
                        type="text"
                        id="newMaterialImpact"
                        class="form-control"
                        placeholder="e.g. Saves landfill space"
                    >

                </div>


                <div class="toggle-row">

                    <div>

                        <strong>
                            Recyclable
                        </strong>

                        <span>
                            Allow citizens to submit this material.
                        </span>

                    </div>

                    <label class="toggle">

                        <input
                            type="checkbox"
                            id="newMaterialRecyclable"
                            checked
                        >

                        <span class="toggle-slider"></span>

                    </label>

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
                        onclick="window.createMaterial()"
                    >
                        Add Material
                    </button>

                </div>

            </div>

        `;


        openModal(
            "Add Material",
            html
        );

    }


    /* =====================================================
       CREATE MATERIAL
       ===================================================== */

    window.createMaterial =
        function () {

            const name =
                document.getElementById(
                    "newMaterialName"
                )?.value.trim();


            const type =
                document.getElementById(
                    "newMaterialType"
                )?.value;


            const rate =
                Number(
                    document.getElementById(
                        "newMaterialRate"
                    )?.value || 0
                );


            const impact =
                document.getElementById(
                    "newMaterialImpact"
                )?.value.trim();


            const recyclable =
                document.getElementById(
                    "newMaterialRecyclable"
                )?.checked;


            if (!name) {

                showToast(
                    "Please enter a material name.",
                    "warning"
                );

                return;

            }


            if (
                !Number.isFinite(rate) ||
                rate <= 0
            ) {

                showToast(
                    "Please enter a valid rate.",
                    "warning"
                );

                return;

            }


            const material = {

                id:
                    typeof generateId ===
                    "function"
                        ? generateId("MAT")
                        : `MAT-${Date.now()}`,

                name: name,

                category:
                    getReadableType(
                        type
                    ),

                type: type,

                rate: rate,

                currentRate: rate,

                previousRate: rate,

                recyclable:
                    recyclable,

                active: true,

                status: "active",

                environmentalImpact:
                    impact ||
                    "Recyclable material",

                createdAt:
                    new Date()
                        .toISOString(),

                updatedAt:
                    new Date()
                        .toISOString()

            };


            let success = false;


            if (
                typeof storageAdd ===
                "function"
            ) {

                success =
                    storageAdd(
                        "scrapMaterials",
                        material
                    );

            }


            if (!success) {

                showToast(
                    "Unable to create material.",
                    "error"
                );

                return;

            }


            closeModal();

            showToast(
                "Material added successfully.",
                "success"
            );


            refreshDataOnly();

        };


    /* =====================================================
       REFRESH
       ===================================================== */

    function refreshMaterials() {

        const button =
            document.getElementById(
                "refreshScrapBtn"
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
                    "Material data refreshed.",
                    "success"
                );

            },
            400
        );

    }


    function refreshDataOnly() {

        loadMaterials();

        updateStats();

        applyFilters();

    }


    /* =====================================================
       CLEAR FILTERS
       ===================================================== */

    function clearFilters() {

        filters = {

            search: "",
            type: "all",
            status: "all",
            sort: "name"

        };


        document.getElementById(
            "scrapSearch"
        ).value = "";


        document.getElementById(
            "materialTypeFilter"
        ).value = "all";


        document.getElementById(
            "materialStatusFilter"
        ).value = "all";


        document.getElementById(
            "materialSortFilter"
        ).value = "name";


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

    function exportMaterials() {

        if (!filteredMaterials.length) {

            showToast(
                "No materials to export.",
                "warning"
            );

            return;

        }


        const rows = [

            [
                "Material ID",
                "Material",
                "Category",
                "Current Rate",
                "Previous Rate",
                "Rate Change %",
                "Recyclable",
                "Environmental Impact",
                "Status"
            ]

        ];


        filteredMaterials.forEach(
            function (material) {

                const current =
                    getCurrentRate(
                        material
                    );


                const previous =
                    getPreviousRate(
                        material
                    );


                const change =
                    previous
                        ? (
                            (
                                current -
                                previous
                            ) /
                            previous
                        ) * 100
                        : 0;


                const active =
                    !(
                        material.active === false ||
                        material.status === "inactive"
                    );


                rows.push([

                    material.id || "",

                    material.name || "",

                    material.category ||
                        material.type ||
                        "",

                    current,

                    previous,

                    change.toFixed(2),

                    material.recyclable !== false
                        ? "Yes"
                        : "No",

                    material.environmentalImpact ||
                        material.impact ||
                        "",

                    active
                        ? "Active"
                        : "Inactive"

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
            `ekabadi-materials-${new Date()
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
            "Material CSV exported.",
            "success"
        );

    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function findMaterial(id) {

        return materials.find(
            material =>
                material.id === id
        );

    }


    function getCurrentRate(material) {

        if (!material) return 0;


        return Number(
            material.rate ??
            material.currentRate ??
            material.price ??
            0
        );

    }


    function getPreviousRate(material) {

        if (!material) return 0;


        return Number(
            material.previousRate ??
            getCurrentRate(material)
        );

    }


    function getRateChange(material) {

        return (
            getCurrentRate(material) -
            getPreviousRate(material)
        );

    }


    function normalizeType(material) {

        const value =
            String(
                material?.type ||
                material?.category ||
                material?.name ||
                ""
            ).toLowerCase();


        if (
            value.includes("plastic") ||
            value.includes("pet")
        ) {
            return "plastic";
        }


        if (
            value.includes("paper") ||
            value.includes("cardboard") ||
            value.includes("newspaper")
        ) {
            return "paper";
        }


        if (
            value.includes("iron") ||
            value.includes("aluminium") ||
            value.includes("metal") ||
            value.includes("copper")
        ) {
            return "metal";
        }


        if (
            value.includes("glass")
        ) {
            return "glass";
        }


        if (
            value.includes("e-waste") ||
            value.includes("ewaste") ||
            value.includes("electronic")
        ) {
            return "ewaste";
        }


        return "other";

    }


    function getReadableType(type) {

        const names = {

            plastic: "Plastic",

            paper: "Paper",

            metal: "Metal",

            glass: "Glass",

            ewaste: "E-Waste",

            other: "Other"

        };


        return (
            names[type] ||
            "Other"
        );

    }


    function getMaterialIcon(type) {

        const icons = {

            plastic: "♻",

            paper: "▤",

            metal: "◆",

            glass: "◇",

            ewaste: "⌘",

            other: "♻"

        };


        return (
            icons[type] ||
            "♻"
        );

    }


    function setText(id, value) {

        const element =
            document.getElementById(id);


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


})();