/* =========================================================
   E-KABAADI PLATFORM — Citizen Portal
   Profile Settings Controller
   File: frontend/citizen/js/profile.js
   
   RULE: Profile changes persist across all pages and views.
   ========================================================= */

(function () {
    "use strict";

    function populateProfileForm() {
        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001" };
        const citizenId = citizen.citizenId || "CIT-1001";

        if (typeof citizenService === "undefined") return;

        const profile = citizenService.getProfile(citizenId);
        if (!profile) return;

        const nameInp = document.getElementById("inputName") || document.getElementById("profileNameInput");
        if (nameInp) nameInp.value = profile.name || "";

        const emailInp = document.getElementById("inputEmail") || document.getElementById("profileEmailInput");
        if (emailInp) emailInp.value = profile.email || "";

        const phoneInp = document.getElementById("inputPhone") || document.getElementById("profilePhoneInput");
        if (phoneInp) phoneInp.value = profile.phone || "";

        const upiInp = document.getElementById("inputUpi") || document.getElementById("profileUpiInput");
        if (upiInp) upiInp.value = profile.upiId || "";

        const nameDisplay = document.getElementById("profileDisplayName");
        if (nameDisplay) nameDisplay.textContent = profile.name || "Aarav Sharma";
    }

    function saveProfile() {
        const citizen = window.currentCitizen || (typeof authService !== "undefined" ? authService.getCurrentUser() : null) || { citizenId: "CIT-1001" };
        const citizenId = citizen.citizenId || "CIT-1001";

        if (typeof citizenService === "undefined") return;

        const name = (document.getElementById("inputName") || document.getElementById("profileNameInput"))?.value.trim();
        const email = (document.getElementById("inputEmail") || document.getElementById("profileEmailInput"))?.value.trim();
        const phone = (document.getElementById("inputPhone") || document.getElementById("profilePhoneInput"))?.value.trim();
        const upiId = (document.getElementById("inputUpi") || document.getElementById("profileUpiInput"))?.value.trim();

        const updates = { name, email, phone, upiId };

        citizenService.updateProfile(citizenId, updates);

        if (name) {
            const disp = document.getElementById("profileDisplayName");
            if (disp) disp.textContent = name;
            const navName = document.querySelector(".sidebar-user-name");
            if (navName) navName.textContent = name;
        }

        showToast("Profile & payout preferences saved successfully!", "success");
    }

    window.saveProfileChanges = saveProfile;
    window.saveCitizenProfile = saveProfile;

    document.addEventListener("DOMContentLoaded", () => {
        populateProfileForm();
    });

    window.addEventListener("ekabadi:statechange", populateProfileForm);
})();
