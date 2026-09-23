/* =========================================================
   E-KABADI COMMAND CENTER
   SETTINGS MODULE
   ========================================================= */

(function () {

    "use strict";


    let originalSettings = {};


    document.addEventListener(
        "DOMContentLoaded",
        initializeSettings
    );


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initializeSettings() {

        loadSettings();
        setupTabs();
        setupActions();
        setupFieldListeners();
        setupInputGuards();
        updateNotificationUI();
        updateSaveState(false);
        window.addEventListener("beforeunload", handleBeforeUnload);

    }


    /* =====================================================
       LOAD SETTINGS
       ===================================================== */

    function loadSettings() {

        const settings =
            typeof storageGetSettings ===
            "function"
                ? storageGetSettings()
                : EKABADI_DATA.settings || {};


        originalSettings =
            JSON.parse(
                JSON.stringify(
                    settings
                )
            );


        setValue(
            "platformName",
            settings.platformName
        );

        setValue(
            "supportEmail",
            settings.supportEmail
        );

        setValue(
            "supportPhone",
            settings.supportPhone
        );


        setValue(
            "defaultPickupRadius",
            settings.defaultPickupRadius
        );

        setValue(
            "maxPickupDistance",
            settings.maxPickupDistance
        );

        setValue(
            "minimumPickupWeight",
            settings.minimumPickupWeight
        );


        setChecked(
            "autoAssignCollectors",
            settings.autoAssignCollectors
        );

        setChecked(
            "requireCitizenConfirmation",
            settings.requireCitizenConfirmation
        );

        setChecked(
            "requireCollectorVerification",
            settings.requireCollectorVerification
        );


        setChecked(
            "enableAIAnalysis",
            settings.enableAIAnalysis
        );

        setChecked(
            "enableRewards",
            settings.enableRewards
        );

        setChecked(
            "enableNotifications",
            settings.enableNotifications
        );


        setChecked(
            "paymentAutoRelease",
            settings.paymentAutoRelease
        );

    }


    /* =====================================================
       TABS
       ===================================================== */

    function setupTabs() {

        document
            .querySelectorAll(
                ".settings-tab"
            )
            .forEach(
                tab => {

                    tab.addEventListener(
                        "click",
                        function () {

                            const section =
                                this.dataset.section;


                            document
                                .querySelectorAll(
                                    ".settings-tab"
                                )
                                .forEach(
                                    item =>
                                        item.classList.remove(
                                            "active"
                                        )
                                );


                            if (JSON.stringify(collectSettings()) !== JSON.stringify(originalSettings)) {
                                if (!window.confirm("You have unsaved settings changes. Switch sections without saving?")) {
                                    return;
                                }
                            }

                            document
                                .querySelectorAll(
                                    ".settings-section"
                                )
                                .forEach(
                                    item =>
                                        item.classList.remove(
                                            "active"
                                        )
                                );


                            this.classList.add(
                                "active"
                            );


                            document
                                .querySelector(
                                    `[data-content="${section}"]`
                                )
                                ?.classList.add(
                                    "active"
                                );

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
                "saveSettings"
            )
            ?.addEventListener(
                "click",
                saveSettings
            );


        document.getElementById("resetSettings")?.addEventListener("click", resetSettings);
        document.querySelectorAll("#securityInfoButton").forEach(button => {
            button.addEventListener("click", showSecurityInfo);
        });

    }


    function setupInputGuards() {
        const phone = document.getElementById("supportPhone");
        phone?.addEventListener("input", event => {
            const digits = event.target.value.replace(/\D/g, "").replace(/^91/, "").slice(0, 10);
            event.target.value = digits ? "+91 " + digits : "";
        });

        ["defaultPickupRadius", "maxPickupDistance", "minimumPickupWeight"].forEach(id => {
            const field = document.getElementById(id);
            field?.addEventListener("input", () => {
                if (field.value !== "" && Number(field.value) < 0) field.value = "0";
            });
        });
    }

    function handleBeforeUnload(event) {
        if (JSON.stringify(collectSettings()) !== JSON.stringify(originalSettings)) {
            event.preventDefault();
            event.returnValue = "";
        }
    }


    function setupFieldListeners() {
        document.querySelectorAll(".settings-section input, .settings-section select, .settings-section textarea").forEach(field => {
            field.addEventListener("input", () => { updateNotificationUI(); updateSaveState(true); });
            field.addEventListener("change", () => { updateNotificationUI(); updateSaveState(true); });
        });
    }

    function updateSaveState(dirty) {
        const root = document.getElementById("settingsSaveState");
        const text = document.getElementById("settingsSaveStateText");
        if (!root || !text) return;
        const current = collectSettings();
        const isDirty = dirty || JSON.stringify(current) !== JSON.stringify(originalSettings);
        root.classList.toggle("is-dirty", isDirty);
        text.textContent = isDirty ? "Unsaved changes" : "All changes saved";
        document.getElementById("saveSettings")?.classList.toggle("settings-save-pulse", isDirty);
    }

    function updateNotificationUI() {
        const enabled = getChecked("enableNotifications");
        document.querySelectorAll("[data-notification-status=\"enabled\"]").forEach(badge => {
            badge.className = "status-badge " + (enabled ? "status-active" : "status-pending");
            badge.textContent = enabled ? "Enabled" : "Paused";
        });
    }

    function showSecurityInfo() {
        const admin = typeof getCurrentAdmin === "function" ? getCurrentAdmin() : {name:"Demo Administrator",email:"admin@ekabadi.demo",role:"Super Admin"};
        const content = `<div class="security-detail-list"><div><span>Administrator</span><strong>${escapeHTML(admin?.name || "Demo Administrator")}</strong></div><div><span>Login email</span><strong>${escapeHTML(admin?.email || "admin@ekabadi.demo")}</strong></div><div><span>Role</span><strong>${escapeHTML(admin?.role || "Super Admin")}</strong></div><div><span>Session</span><strong>Local browser session · 24 hours</strong></div><div><span>Storage</span><strong>Browser localStorage</strong></div></div><p class="settings-prototype-note">This is a frontend prototype. Use production authentication before deployment.</p>`;
        if (typeof openModal === "function") openModal({title:"Login & Security Details",description:"Current authentication configuration.",size:"small",content});
    }

    /* =====================================================
       COLLECT FORM DATA
       ===================================================== */

    function collectSettings() {

        const radius = Number(getValue("defaultPickupRadius"));
        const maxDistance = Number(getValue("maxPickupDistance"));
        const minWeight = Number(getValue("minimumPickupWeight"));

        return {

            platformName:
                getValue(
                    "platformName"
                ),

            supportEmail:
                getValue(
                    "supportEmail"
                ),

            supportPhone:
                getValue(
                    "supportPhone"
                ),


            defaultPickupRadius: Number.isFinite(radius) ? radius : 0,
            maxPickupDistance: Number.isFinite(maxDistance) ? maxDistance : 0,
            minimumPickupWeight: Number.isFinite(minWeight) ? minWeight : 0,


            autoAssignCollectors:
                getChecked(
                    "autoAssignCollectors"
                ),


            requireCitizenConfirmation:
                getChecked(
                    "requireCitizenConfirmation"
                ),


            requireCollectorVerification:
                getChecked(
                    "requireCollectorVerification"
                ),


            enableAIAnalysis:
                getChecked(
                    "enableAIAnalysis"
                ),


            enableRewards:
                getChecked(
                    "enableRewards"
                ),


            enableNotifications:
                getChecked(
                    "enableNotifications"
                ),


            paymentAutoRelease:
                getChecked(
                    "paymentAutoRelease"
                )

        };

    }


    /* =====================================================
       SAVE
       ===================================================== */

    function saveSettings() {
        const settings = collectSettings();
        const email = String(settings.supportEmail || "").trim();
        const phoneDigits = String(settings.supportPhone || "").replace(/\D/g, "");
        settings.platformName = settings.platformName.replace(/\s+/g, " ").trim();
        settings.supportEmail = email;
        settings.supportPhone = phoneDigits ? "+91 " + phoneDigits.slice(-10) : "";

        if (!settings.platformName || settings.platformName.length < 2) {
            showToast("Platform name must contain at least 2 characters.", "warning", "Check Settings");
            document.getElementById("platformName")?.focus();
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast("Enter a valid support email address.", "warning", "Check Settings");
            document.getElementById("supportEmail")?.focus();
            return;
        }
        if (phoneDigits.length !== 10) {
            showToast("Support phone must contain exactly 10 digits.", "warning", "Check Settings");
            document.getElementById("supportPhone")?.focus();
            return;
        }
        if (settings.maxPickupDistance < settings.defaultPickupRadius) {
            showToast("Maximum pickup distance cannot be smaller than the default pickup radius.", "warning", "Check Pickup Rules");
            document.getElementById("maxPickupDistance")?.focus();
            return;
        }
        if (settings.defaultPickupRadius <= 0 || settings.maxPickupDistance <= 0 || settings.minimumPickupWeight <= 0) {
            showToast("Pickup limits must all be greater than zero.", "warning", "Check Pickup Rules");
            return;
        }


        let success = false;


        if (
            typeof storageUpdateSettings ===
            "function"
        ) {

            success =
                storageUpdateSettings(
                    settings
                );

        }


        if (!success) {

            try {

                localStorage.setItem(
                    "ekabadi_admin_settings_v1",
                    JSON.stringify(
                        settings
                    )
                );

                success = true;

            } catch (error) {

                console.error(
                    error
                );

            }

        }


        if (!success) {

            showToast(
                "Unable to save settings.",
                "error"
            );

            return;

        }


        setValue("platformName", settings.platformName);
        setValue("supportEmail", settings.supportEmail);
        setValue("supportPhone", settings.supportPhone);

        originalSettings = JSON.parse(JSON.stringify(settings));
        updateNotificationUI();
        updateSaveState(false);
        showToast("Settings saved successfully.", "success", "Settings Updated");

    }


    /* =====================================================
       RESET
       ===================================================== */

    function resetSettings() {

        const execute =
            function () {

                const defaults =
                    EKABADI_DATA.settings ||
                    {};


                let success = false;

                if (typeof storageUpdateSettings === "function") {
                    success = storageUpdateSettings(JSON.parse(JSON.stringify(defaults)));
                }

                if (!success) {
                    try {
                        localStorage.setItem(
                            "ekabadi_admin_settings_v1",
                            JSON.stringify(defaults)
                        );
                        success = true;
                    } catch (error) {
                        console.error(error);
                    }
                }

                if (!success) {
                    showToast("Unable to reset settings.", "error", "Reset Failed");
                    return;
                }

                loadSettings();


                updateNotificationUI();
                updateSaveState(false);
                showToast("Settings reset to defaults.", "success", "Defaults Restored");

            };


        if (
            typeof confirmAction ===
            "function"
        ) {

            confirmAction(
                "Reset all settings to their default values?",
                execute
            );

        } else if (
            window.confirm(
                "Reset all settings to their default values?"
            )
        ) {

            execute();

        }

    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function getValue(id) {

        return (
            document.getElementById(id)
                ?.value || ""
        ).trim();

    }


    function setValue(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.value =
                value ?? "";

        }

    }


    function getChecked(id) {

        return Boolean(
            document.getElementById(
                id
            )?.checked
        );

    }


    function setChecked(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.checked =
                Boolean(
                    value
                );

        }

    }


})();