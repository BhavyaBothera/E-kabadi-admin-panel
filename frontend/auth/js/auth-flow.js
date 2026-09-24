/* =========================================================
   E-KABAADI — Authentication Flow Logic
   ========================================================= */

(function () {
    "use strict";

    /* ── Toast helper ── */
    function showToast(message, type = "info") {
        const root = document.getElementById("toastRoot") || (() => {
            const r = document.createElement("div"); r.id = "toastRoot";
            r.className = "toast-container"; document.body.appendChild(r); return r;
        })();
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        root.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add("show"));
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    /* ═════════════════════════════════════
       LOGIN PAGE
       ═════════════════════════════════════ */
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        // Redirect if already authenticated
        if (typeof authService !== "undefined" && authService.isAuthenticated()) {
            const role = authService.getRole();
            if (role === "admin") window.location.href = "../admin/dashboard.html";
            else if (role === "citizen") window.location.href = "../citizen/dashboard.html";
            else if (role === "collector") window.location.href = "../collector/dashboard.html";
        }

        const emailInput = document.getElementById("loginEmail");
        const passInput = document.getElementById("loginPassword");
        const errorEl = document.getElementById("loginError");
        const submitBtn = document.getElementById("loginBtn");

        if (typeof window !== "undefined" && window.location.search) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get("error") === "suspended") {
                showError("Your account has been suspended by administration.");
            } else if (urlParams.get("error") === "deactivated") {
                showError("Your account has been deactivated. Please contact support.");
            }
        }

        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            errorEl.classList.remove("show");
            errorEl.textContent = "";

            const email = emailInput.value.trim();
            const password = passInput.value;

            if (!email) { showError("Please enter your email or phone."); return; }
            if (!password) { showError("Please enter your password."); return; }

            submitBtn.disabled = true;
            submitBtn.classList.add("loading");

            setTimeout(() => {
                if (typeof authService === "undefined") {
                    showError("Service unavailable. Please try again.");
                    submitBtn.disabled = false;
                    submitBtn.classList.remove("loading");
                    return;
                }

                Promise.resolve(authService.login(email, password)).then(result => {
                    if (!result) {
                        showError("Login failed. Please check credentials.");
                        submitBtn.disabled = false;
                        submitBtn.classList.remove("loading");
                        return;
                    }

                    if (result.success) {
                        showToast("Welcome back!", "success");
                        setTimeout(() => {
                            if (result.role === "admin") {
                                window.location.href = "../admin/dashboard.html";
                            } else if (result.role === "citizen") {
                                window.location.href = "../citizen/dashboard.html";
                            } else if (result.role === "collector") {
                                window.location.href = "../collector/dashboard.html";
                            }
                        }, 500);
                    } else {
                        showError(result.error || "Login failed");
                        submitBtn.disabled = false;
                        submitBtn.classList.remove("loading");

                        if (result.status === "pending" || result.status === "pending_approval") {
                            setTimeout(() => { window.location.href = "pending.html"; }, 1500);
                        }
                        if (result.status === "rejected") {
                            setTimeout(() => { window.location.href = "rejected.html"; }, 1500);
                        }
                    }
                }).catch(err => {
                    showError(err && err.message ? err.message : "An error occurred during login.");
                    submitBtn.disabled = false;
                    submitBtn.classList.remove("loading");
                });
            }, 600);
        });

        function showError(msg) {
            errorEl.textContent = msg;
            errorEl.classList.add("show");
        }

        // Password toggle
        const togglePw = document.getElementById("togglePassword");
        if (togglePw) {
            togglePw.addEventListener("click", () => {
                passInput.type = passInput.type === "password" ? "text" : "password";
            });
        }

        // Demo account quick login
        document.querySelectorAll(".demo-account").forEach(btn => {
            btn.addEventListener("click", () => {
                emailInput.value = btn.dataset.email;
                passInput.value = btn.dataset.password;
                loginForm.requestSubmit();
            });
        });
    }

    /* ═════════════════════════════════════
       CITIZEN SIGNUP — Multi-Step
       ═════════════════════════════════════ */
    const citizenForm = document.getElementById("citizenSignupForm");
    if (citizenForm) {
        let currentStep = 1;
        const totalSteps = 9;
        const formData = {};

        function updateStep() {
            document.querySelectorAll(".step-content").forEach(s => s.classList.remove("active"));
            const active = document.querySelector(`.step-content[data-step="${currentStep}"]`);
            if (active) active.classList.add("active");

            // Update stepper dots
            document.querySelectorAll(".step-dot").forEach((dot, i) => {
                dot.classList.remove("active", "completed");
                if (i + 1 === currentStep) dot.classList.add("active");
                else if (i + 1 < currentStep) dot.classList.add("completed");
            });

            // Update navigation buttons
            const backBtn = document.getElementById("stepBack");
            const nextBtn = document.getElementById("stepNext");
            if (backBtn) backBtn.style.display = currentStep === 1 ? "none" : "flex";
            if (nextBtn) {
                if (currentStep === totalSteps) {
                    nextBtn.textContent = "Submit Application";
                } else if (currentStep === 5) {
                    nextBtn.textContent = "Send OTP";
                } else if (currentStep === 6) {
                    nextBtn.textContent = "Send Verification Email";
                } else {
                    nextBtn.innerHTML = 'Continue <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
                }
            }
        }

        function collectStepData() {
            const step = document.querySelector(`.step-content[data-step="${currentStep}"]`);
            if (!step) return true;
            const inputs = step.querySelectorAll("input, select, textarea");
            let valid = true;
            inputs.forEach(input => {
                if (input.required && !input.value.trim()) {
                    input.style.borderColor = "#e5484d";
                    valid = false;
                } else {
                    input.style.borderColor = "";
                    formData[input.name] = input.value.trim();
                }
            });
            return valid;
        }

        document.getElementById("stepNext")?.addEventListener("click", () => {
            if (!collectStepData()) {
                showToast("Please fill in all required fields.", "error");
                return;
            }

            if (currentStep === 5) {
                // Verify OTP
                const otpInputs = document.querySelectorAll(".otp-input");
                const otp = Array.from(otpInputs).map(i => i.value).join("");
                formData.phoneVerified = true;
                showToast("Phone verified successfully!", "success");
                currentStep++;
                updateStep();
                return;
            }
            if (currentStep === 6) {
                // Mock email verification
                mockEmailVerification();
                return;
            }
            if (currentStep === 8) {
                // Populate review
                populateReview();
            }
            if (currentStep === totalSteps) {
                submitApplication("citizen");
                return;
            }

            if (currentStep < totalSteps) {
                currentStep++;
                updateStep();
                if (currentStep === 5) {
                    startOtpTimer();
                    showToast("OTP sent to " + (formData.phone || "your phone"), "info");
                }
            }
        });

        document.getElementById("stepBack")?.addEventListener("click", () => {
            if (currentStep > 1) {
                currentStep--;
                updateStep();
            }
        });

        function startOtpFlow() {
            showToast("OTP sent to " + (formData.phone || "your phone"), "success");
            startOtpTimer();
        }

        function startOtpTimer() {
            let seconds = 30;
            const timerEl = document.getElementById("otpTimer");
            const resendBtn = document.getElementById("otpResend");
            if (resendBtn) resendBtn.disabled = true;
            const interval = setInterval(() => {
                seconds--;
                if (timerEl) timerEl.textContent = `Resend in ${seconds}s`;
                if (seconds <= 0) {
                    clearInterval(interval);
                    if (timerEl) timerEl.textContent = "";
                    if (resendBtn) resendBtn.disabled = false;
                }
            }, 1000);

            // Auto-verify OTP for demo
            const otpInputs = document.querySelectorAll(".otp-input");
            otpInputs.forEach((input, i) => {
                input.addEventListener("input", () => {
                    if (input.value.length === 1 && i < otpInputs.length - 1) {
                        otpInputs[i + 1].focus();
                    }
                    const otp = Array.from(otpInputs).map(i => i.value).join("");
                    if (otp.length === 6) {
                        setTimeout(() => {
                            showToast("Phone verified successfully!", "success");
                            formData.phoneVerified = true;
                        }, 500);
                    }
                });
                input.addEventListener("keydown", (e) => {
                    if (e.key === "Backspace" && !input.value && i > 0) {
                        otpInputs[i - 1].focus();
                    }
                });
            });

            if (resendBtn) {
                resendBtn.addEventListener("click", () => {
                    showToast("OTP resent!", "success");
                    startOtpTimer();
                });
            }
        }

        function mockEmailVerification() {
            showToast("Verification email sent to " + (formData.email || "your email"), "success");
            setTimeout(() => {
                formData.emailVerified = true;
                showToast("Email verified!", "success");
                currentStep++;
                updateStep();
            }, 2000);
        }

        function populateReview() {
            const container = document.getElementById("reviewContent");
            if (!container) return;
            container.innerHTML = `
                <div class="review-section">
                    <div class="review-section-title">Personal Information</div>
                    <div class="review-row"><span class="review-label">Name</span><span class="review-value">${formData.firstName || ""} ${formData.surname || ""}</span></div>
                    <div class="review-row"><span class="review-label">Date of Birth</span><span class="review-value">${formData.dob || "—"}</span></div>
                    <div class="review-row"><span class="review-label">Gender</span><span class="review-value">${formData.gender || "—"}</span></div>
                </div>
                <div class="review-section">
                    <div class="review-section-title">Contact</div>
                    <div class="review-row"><span class="review-label">Phone</span><span class="review-value">${formData.phone || "—"} ${formData.phoneVerified ? "✓" : ""}</span></div>
                    <div class="review-row"><span class="review-label">Email</span><span class="review-value">${formData.email || "—"} ${formData.emailVerified ? "✓" : ""}</span></div>
                </div>
                <div class="review-section">
                    <div class="review-section-title">Address</div>
                    <div class="review-row"><span class="review-label">Address</span><span class="review-value">${formData.house || ""}, ${formData.street || ""}</span></div>
                    <div class="review-row"><span class="review-label">City</span><span class="review-value">${formData.city || "—"}, ${formData.state || "—"} ${formData.pin || ""}</span></div>
                </div>
            `;
        }

        function submitApplication(role) {
            const btn = document.getElementById("stepNext");
            if (btn) { btn.disabled = true; btn.classList.add("loading"); }

            setTimeout(() => {
                if (typeof authService !== "undefined") {
                    const userData = {
                        name: (formData.firstName || "") + " " + (formData.surname || ""),
                        firstName: formData.firstName || "New",
                        lastName: formData.surname || "User",
                        email: formData.email,
                        phone: formData.phone,
                        password: formData.password,
                        role: role,
                        location: {
                            address: `${formData.house || ""}, ${formData.street || ""}`,
                            city: formData.city,
                            state: formData.state,
                            pin: formData.pin
                        }
                    };

                    const handleSuccess = (result) => {
                        try {
                            sessionStorage.setItem("ekabadi_last_application", JSON.stringify({
                                applicationId: (result && result.applicationId) || "APP-CIT-78192",
                                name: (formData.firstName || "") + " " + (formData.surname || ""),
                                email: formData.email,
                                phone: formData.phone,
                                role: "citizen"
                            }));
                        } catch (e) {}
                        window.location.href = "pending.html";
                    };

                    const isSupabase = typeof authService.isSupabaseMode === "function" && authService.isSupabaseMode();
                    if (isSupabase && typeof authService.signupWithSupabase === "function") {
                        authService.signupWithSupabase(userData).then(res => {
                            if (res.success) {
                                handleSuccess(res);
                            } else {
                                showToast(res.error || "Registration failed", "error");
                                if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
                            }
                        }).catch(err => {
                            showToast(err.message || "Registration error", "error");
                            if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
                        });
                        return;
                    }

                    const result = authService.registerUser(userData);
                    if (result.success) {
                        handleSuccess(result);
                        return;
                    } else {
                        showToast(result.error || "Registration failed", "error");
                    }
                } else {
                    window.location.href = "pending.html";
                }
                if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
            }, 1500);
        }

        // File upload handler
        document.querySelectorAll(".file-upload-area").forEach(area => {
            const input = area.querySelector('input[type="file"]');
            const preview = area.querySelector(".upload-preview");
            const nameEl = area.querySelector(".upload-file-name");

            if (input) {
                area.addEventListener("click", () => input.click());
                area.addEventListener("dragover", (e) => { e.preventDefault(); area.classList.add("has-file"); });
                area.addEventListener("dragleave", () => { if (!input.files.length) area.classList.remove("has-file"); });
                area.addEventListener("drop", (e) => {
                    e.preventDefault();
                    input.files = e.dataTransfer.files;
                    handleFileSelect(input, area, preview, nameEl);
                });
                input.addEventListener("change", () => handleFileSelect(input, area, preview, nameEl));
            }
        });

        function handleFileSelect(input, area, preview, nameEl) {
            if (input.files.length) {
                area.classList.add("has-file");
                if (preview) preview.classList.add("show");
                if (nameEl) nameEl.textContent = input.files[0].name;
                formData[input.name] = input.files[0].name;
            }
        }

        // Remove file buttons
        document.querySelectorAll(".upload-remove").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const area = btn.closest(".file-upload-area");
                const input = area?.querySelector('input[type="file"]');
                const preview = area?.querySelector(".upload-preview");
                if (input) input.value = "";
                if (area) area.classList.remove("has-file");
                if (preview) preview.classList.remove("show");
            });
        });

        updateStep();
    }

    /* ═════════════════════════════════════
       COLLECTOR SIGNUP — Multi-Step
       ═════════════════════════════════════ */
    const collectorForm = document.getElementById("collectorSignupForm");
    if (collectorForm) {
        // Same multi-step logic, reused from citizen signup above
        let currentStep = 1;
        const totalSteps = 9;
        const formData = {};

        function updateStep() {
            document.querySelectorAll(".step-content").forEach(s => s.classList.remove("active"));
            const active = document.querySelector(`.step-content[data-step="${currentStep}"]`);
            if (active) active.classList.add("active");
            document.querySelectorAll(".step-dot").forEach((dot, i) => {
                dot.classList.remove("active", "completed");
                if (i + 1 === currentStep) dot.classList.add("active");
                else if (i + 1 < currentStep) dot.classList.add("completed");
            });
            const backBtn = document.getElementById("stepBack");
            const nextBtn = document.getElementById("stepNext");
            if (backBtn) backBtn.style.display = currentStep === 1 ? "none" : "flex";
            if (nextBtn) {
                if (currentStep === totalSteps) nextBtn.textContent = "Submit Application";
                else nextBtn.innerHTML = 'Continue <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
            }
        }

        function collectStepData() {
            const step = document.querySelector(`.step-content[data-step="${currentStep}"]`);
            if (!step) return true;
            const inputs = step.querySelectorAll("input:not([type='checkbox']):not([type='file']), select, textarea");
            let valid = true;
            inputs.forEach(input => {
                if (input.required && !input.value.trim()) {
                    input.style.borderColor = "#e5484d";
                    valid = false;
                } else {
                    input.style.borderColor = "";
                    formData[input.name] = input.value.trim();
                }
            });
            // Collect checkbox values
            const checkboxes = step.querySelectorAll("input[type='checkbox']:checked");
            if (checkboxes.length) {
                const name = checkboxes[0].name;
                formData[name] = Array.from(checkboxes).map(c => c.value);
            }
            return valid;
        }

        function populateCollectorReview() {
            const container = document.getElementById("collectorReviewContent");
            if (!container) return;
            const cats = Array.isArray(formData.scrapCategories) ? formData.scrapCategories.join(", ") : (formData.scrapCategories || "Paper, Plastic, Metal");
            container.innerHTML = `
                <div class="review-section">
                    <div class="review-section-title">Partner Identity</div>
                    <div class="review-row"><span class="review-label">Name</span><span class="review-value">${formData.firstName || ""} ${formData.surname || ""}</span></div>
                    <div class="review-row"><span class="review-label">Classification</span><span class="review-value">${formData.collectorType || "Individual Collector"}</span></div>
                    <div class="review-row"><span class="review-label">Phone</span><span class="review-value">${formData.phone || "—"}</span></div>
                    <div class="review-row"><span class="review-label">Email</span><span class="review-value">${formData.email || "—"}</span></div>
                </div>
                <div class="review-section">
                    <div class="review-section-title">Operations & Fleet</div>
                    <div class="review-row"><span class="review-label">Base Location</span><span class="review-value">${formData.address || ""}, ${formData.city || ""} (${formData.pin || ""})</span></div>
                    <div class="review-row"><span class="review-label">Service Radius</span><span class="review-value">Within ${formData.serviceRadius || 10} km</span></div>
                    <div class="review-row"><span class="review-label">Vehicle</span><span class="review-value">${formData.vehicleType || "Auto"} — ${formData.vehicleNumber || "Reg Pending"}</span></div>
                    <div class="review-row"><span class="review-label">Weighing Gear</span><span class="review-value">${formData.equipmentType || "Certified Digital Scale"}</span></div>
                </div>
                <div class="review-section">
                    <div class="review-section-title">Scrap Streams & Settlement</div>
                    <div class="review-row"><span class="review-label">Categories</span><span class="review-value">${cats}</span></div>
                    <div class="review-row"><span class="review-label">Settlement Bank</span><span class="review-value">${formData.bankName || "Bank"} (${formData.ifscCode || ""})</span></div>
                </div>
            `;
        }

        document.getElementById("stepNext")?.addEventListener("click", () => {
            if (!collectStepData()) {
                showToast("Please fill in all required fields.", "error");
                return;
            }
            if (currentStep === 8) {
                populateCollectorReview();
            }
            if (currentStep === totalSteps) {
                // Submit
                const btn = document.getElementById("stepNext");
                if (btn) { btn.disabled = true; btn.classList.add("loading"); }
                setTimeout(() => {
                    let appId = "APP-COL-" + Math.floor(10000 + Math.random() * 90000);
                    const collectorData = {
                        name: (formData.firstName || "") + " " + (formData.surname || ""),
                        firstName: formData.firstName || "New",
                        lastName: formData.surname || "Collector",
                        email: formData.email,
                        phone: formData.phone,
                        password: formData.password,
                        role: "collector",
                        collectorType: formData.collectorType,
                        vehicleType: formData.vehicleType,
                        vehicleNumber: formData.vehicleNumber,
                        scrapCategories: formData.scrapCategories,
                        serviceRadius: formData.serviceRadius
                    };

                    const handleCollectorSuccess = (res) => {
                        if (res && res.applicationId) appId = res.applicationId;
                        try {
                            sessionStorage.setItem("ekabadi_last_application", JSON.stringify({
                                applicationId: appId,
                                name: (formData.firstName || "") + " " + (formData.surname || ""),
                                email: formData.email,
                                phone: formData.phone,
                                role: "collector"
                            }));
                        } catch (e) {}
                        window.location.href = "pending.html";
                    };

                    if (typeof authService !== "undefined") {
                        const isSupabase = typeof authService.isSupabaseMode === "function" && authService.isSupabaseMode();
                        if (isSupabase && typeof authService.signupWithSupabase === "function") {
                            authService.signupWithSupabase(collectorData).then(res => {
                                if (res.success) {
                                    handleCollectorSuccess(res);
                                } else {
                                    showToast(res.error || "Registration failed", "error");
                                    if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
                                }
                            }).catch(err => {
                                showToast(err.message || "Registration error", "error");
                                if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
                            });
                            return;
                        }

                        const res = authService.registerUser(collectorData);
                        handleCollectorSuccess(res);
                        return;
                    }

                    try {
                        sessionStorage.setItem("ekabadi_last_application", JSON.stringify({
                            applicationId: appId,
                            name: (formData.firstName || "") + " " + (formData.surname || ""),
                            email: formData.email,
                            phone: formData.phone,
                            role: "collector"
                        }));
                    } catch (e) {}
                    window.location.href = "pending.html";
                }, 1500);
                return;
            }
            currentStep++;
            updateStep();
        });

        document.getElementById("stepBack")?.addEventListener("click", () => {
            if (currentStep > 1) { currentStep--; updateStep(); }
        });

        // Checkbox tag toggle
        document.querySelectorAll(".checkbox-tag").forEach(tag => {
            tag.addEventListener("click", () => {
                const cb = tag.querySelector("input[type='checkbox']");
                if (cb) { cb.checked = !cb.checked; tag.classList.toggle("selected", cb.checked); }
            });
        });

        // File upload (reuse pattern)
        document.querySelectorAll(".file-upload-area").forEach(area => {
            const input = area.querySelector('input[type="file"]');
            if (input) {
                area.addEventListener("click", () => input.click());
                input.addEventListener("change", () => {
                    if (input.files.length) {
                        area.classList.add("has-file");
                        const preview = area.querySelector(".upload-preview");
                        const nameEl = area.querySelector(".upload-file-name");
                        if (preview) preview.classList.add("show");
                        if (nameEl) nameEl.textContent = input.files[0].name;
                    }
                });
            }
        });

        updateStep();
    }

})();
