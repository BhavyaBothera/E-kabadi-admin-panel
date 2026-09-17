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


        document
            .getElementById(
                "resetSettings"
            )
            ?.addEventListener(
                "click",
                resetSettings
            );

    }


    /* =====================================================
       COLLECT FORM DATA
       ===================================================== */

    function collectSettings() {

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


            defaultPickupRadius:
                Number(
                    getValue(
                        "defaultPickupRadius"
                    )
                ) || 1,


            maxPickupDistance:
                Number(
                    getValue(
                        "maxPickupDistance"
                    )
                ) || 1,


            minimumPickupWeight:
                Number(
                    getValue(
                        "minimumPickupWeight"
                    )
                ) || 0.1,


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

        const settings =
            collectSettings();


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


        originalSettings =
            JSON.parse(
                JSON.stringify(
                    settings
                )
            );


        showToast(
            "Settings saved successfully.",
            "success"
        );

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


                if (
                    typeof storageUpdateSettings ===
                    "function"
                ) {

                    storageUpdateSettings(
                        defaults
                    );

                }


                loadSettings();


                showToast(
                    "Settings reset to defaults.",
                    "success"
                );

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