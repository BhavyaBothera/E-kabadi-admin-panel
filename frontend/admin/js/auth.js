/* =========================================================
   E-KABADI COMMAND CENTER
   AUTHENTICATION SYSTEM
   ========================================================= */

/*
   FRONTEND PROTOTYPE AUTHENTICATION

   This is NOT production authentication.

   For the hackathon prototype:
       Login Form
            ↓
       Validate Credentials
            ↓
       Create Session
            ↓
       localStorage
            ↓
       Dashboard

   Later this can be replaced with:
       Supabase Auth
       Firebase Auth
       Custom Backend / JWT
*/


/* =========================================================
   AUTH CONFIGURATION
   ========================================================= */

const AUTH_CONFIG = {

    /* Demo administrator */

    demoAdmin: {
        email: "admin@ekabadi.demo",
        password: "admin123",

        name: "Bhavya Bothera",
        role: "Super Admin",

        avatar: "BB"
    },

    sessionDuration:
        24 * 60 * 60 * 1000
};


function isSupabaseAdminMode() {
    return !!(window.EKABADI_ENV && window.EKABADI_ENV.isSupabaseMode && window.EKABADI_ENV.isSupabaseMode());
}
function getSupabaseClient() {
    return window.EKABADI_SUPABASE && window.EKABADI_SUPABASE.getClient
        ? window.EKABADI_SUPABASE.getClient() : null;
}

/* =========================================================
   AUTH ERROR MESSAGES
   ========================================================= */

const AUTH_ERRORS = {

    EMPTY_EMAIL:
        "Please enter your email address.",

    EMPTY_PASSWORD:
        "Please enter your password.",

    INVALID_EMAIL:
        "Please enter a valid email address.",

    INVALID_CREDENTIALS:
        "Invalid email or password.",

    SESSION_EXPIRED:
        "Your session has expired. Please login again."
};


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function isValidEmail(email) {

    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return pattern.test(
        String(email).trim()
    );
}


/* =========================================================
   LOGIN VALIDATION
   ========================================================= */

function validateLoginCredentials(
    email,
    password
) {

    email =
        String(email || "")
            .trim()
            .toLowerCase();

    password =
        String(password || "");


    if (!email) {

        return {
            valid: false,
            error: AUTH_ERRORS.EMPTY_EMAIL
        };
    }


    if (!password) {

        return {
            valid: false,
            error: AUTH_ERRORS.EMPTY_PASSWORD
        };
    }


    if (!isValidEmail(email)) {

        return {
            valid: false,
            error: AUTH_ERRORS.INVALID_EMAIL
        };
    }


    if (isSupabaseAdminMode()) return { valid: true };

    if (
        email !== AUTH_CONFIG.demoAdmin.email.toLowerCase() ||
        password !== AUTH_CONFIG.demoAdmin.password
    ) {
        return { valid: false, error: AUTH_ERRORS.INVALID_CREDENTIALS };
    }

    return { valid: true };
}


/* =========================================================
   CREATE SESSION
   ========================================================= */

function createAdminSession() {

    const now =
        Date.now();

    const session = {

        loggedIn: true,

        user: {

            name:
                AUTH_CONFIG.demoAdmin.name,

            email:
                AUTH_CONFIG.demoAdmin.email,

            role:
                AUTH_CONFIG.demoAdmin.role,

            avatar:
                AUTH_CONFIG.demoAdmin.avatar
        },

        loginTime:
            new Date(now).toISOString(),

        expiresAt:
            new Date(
                now +
                AUTH_CONFIG.sessionDuration
            ).toISOString()
    };


    saveAdminSession(session);

    return session;
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginAdmin(email, password) {
    const validation = validateLoginCredentials(email, password);
    if (!validation.valid) return { success: false, error: validation.error };

    if (isSupabaseAdminMode()) {
        const client = getSupabaseClient();
        if (!client) return { success: false, error: "Supabase is not configured correctly." };

        try {
            const result = await client.auth.signInWithPassword({
                email: String(email).trim().toLowerCase(),
                password: String(password)
            });
            if (result.error || !result.data || !result.data.user) {
                return { success: false, error: result.error ? result.error.message : AUTH_ERRORS.INVALID_CREDENTIALS };
            }

            const profileResult = await client.from("profiles").select("*").eq("id", result.data.user.id).single();
            if (profileResult.error || !profileResult.data) {
                await client.auth.signOut();
                return { success: false, error: "Admin profile was not found for this account." };
            }
            if (profileResult.data.role !== "admin") {
                await client.auth.signOut();
                return { success: false, error: "This account does not have administrator access." };
            }

            const profile = profileResult.data;
            const now = Date.now();
            const session = {
                loggedIn: true,
                user: {
                    id: result.data.user.id,
                    name: ((profile.first_name || "") + " " + (profile.last_name || "")).trim() || result.data.user.email,
                    email: profile.email || result.data.user.email,
                    role: "Super Admin",
                    avatar: profile.avatar || "SA"
                },
                role: "admin",
                loginTime: new Date(now).toISOString(),
                expiresAt: result.data.session && result.data.session.expires_at
                    ? new Date(result.data.session.expires_at * 1000).toISOString()
                    : new Date(now + AUTH_CONFIG.sessionDuration).toISOString()
            };

            saveAdminSession(session);
            if (window.EKABADI_SUPABASE_ADAPTER && window.EKABADI_SUPABASE_ADAPTER.setSession) {
                await window.EKABADI_SUPABASE_ADAPTER.setSession(session);
            }
            return { success: true, session: session };
        } catch (error) {
            console.error("[E-Kabaadi Auth] Supabase login failed:", error);
            return { success: false, error: error.message || AUTH_ERRORS.INVALID_CREDENTIALS };
        }
    }

    return { success: true, session: createAdminSession() };
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logoutAdmin(
    redirect = true
) {

    if (isSupabaseAdminMode()) {
        const client = getSupabaseClient();
        if (client) client.auth.signOut().catch(console.error);
        if (window.EKABADI_SUPABASE_ADAPTER && window.EKABADI_SUPABASE_ADAPTER.clearSession) {
            window.EKABADI_SUPABASE_ADAPTER.clearSession();
        }
    }

    clearAdminSession();


    if (
        redirect &&
        window.location.pathname
            .toLowerCase()
            .includes("index.html") === false
    ) {

        window.location.replace(
            "index.html"
        );
    }
}


/* =========================================================
   SESSION VALIDATION
   ========================================================= */

function validateAdminSession() {

    const session =
        getAdminSession();


    if (!session) {

        return {
            valid: false,
            reason: "missing"
        };
    }


    if (
        session.loggedIn !== true
    ) {

        clearAdminSession();

        return {
            valid: false,
            reason: "invalid"
        };
    }


    if (
        !session.expiresAt
    ) {

        clearAdminSession();

        return {
            valid: false,
            reason: "invalid"
        };
    }


    const expiration =
        new Date(
            session.expiresAt
        ).getTime();


    if (
        Date.now() >= expiration
    ) {

        clearAdminSession();

        return {
            valid: false,
            reason: "expired"
        };
    }

    /* Role verification: Reject non-admin roles without clearing their citizen/collector session */
    const role = session.role || (session.user && session.user.role);
    const isAdmin = (role === "admin" || role === "Super Admin" || (session.user && session.user.email === AUTH_CONFIG.demoAdmin.email));

    if (!isAdmin) {
        return {
            valid: false,
            reason: "unauthorized_role",
            userRole: role
        };
    }


    return {

        valid: true,

        session
    };
}


/* =========================================================
   REQUIRE LOGIN
   ========================================================= */

/**
 * Call this on protected pages.
 *
 * Example:
 *
 * requireAdminAuth();
 */

function requireAdminAuth() {

    const result =
        validateAdminSession();


    if (!result.valid) {

        /*
           Prevent redirect loops.
        */

        if (
            !window.location.pathname
                .toLowerCase()
                .includes("index.html")
        ) {
            if (result.reason === "unauthorized_role") {
                if (result.userRole === "citizen") {
                    window.location.replace("../citizen/dashboard.html");
                    return false;
                } else if (result.userRole === "collector") {
                    window.location.replace("../collector/dashboard.html");
                    return false;
                }
            }

            window.location.replace(
                "index.html"
            );
        }

        return false;
    }


    return true;
}



/* =========================================================
   REDIRECT IF ALREADY LOGGED IN
   ========================================================= */

function redirectIfAuthenticated() {

    const result =
        validateAdminSession();


    if (
        result.valid &&
        isLoginPage()
    ) {

        window.location.href =
            "dashboard.html";

        return true;
    }


    return false;
}


/* =========================================================
   DETECT LOGIN PAGE
   ========================================================= */

function isLoginPage() {

    const path =
        window.location.pathname
            .toLowerCase();


    return (
        path.endsWith("/") ||
        path.endsWith("index.html")
    );
}


/* =========================================================
   GET CURRENT ADMIN
   ========================================================= */

function getCurrentAdmin() {

    const result =
        validateAdminSession();


    if (!result.valid) {
        return null;
    }


    return result.session.user;
}


/* =========================================================
   GET ADMIN NAME
   ========================================================= */

function getCurrentAdminName() {

    const admin =
        getCurrentAdmin();


    if (!admin) {
        return "Administrator";
    }


    return admin.name;
}


/* =========================================================
   GET ADMIN ROLE
   ========================================================= */

function getCurrentAdminRole() {

    const admin =
        getCurrentAdmin();


    if (!admin) {
        return "Admin";
    }


    return admin.role;
}


/* =========================================================
   SESSION REFRESH
   ========================================================= */

/*
   Extend the session whenever the admin performs
   meaningful activity.

   This makes the prototype feel more realistic.
*/

function refreshAdminSession() {

    const session =
        getAdminSession();


    if (!session) {
        return false;
    }


    if (
        session.loggedIn !== true
    ) {
        return false;
    }


    const now =
        Date.now();


    session.expiresAt =
        new Date(
            now +
            AUTH_CONFIG.sessionDuration
        ).toISOString();


    saveAdminSession(
        session
    );


    return true;
}


/* =========================================================
   LOGIN ACTIVITY
   ========================================================= */

function recordAdminActivity(
    action = "activity"
) {

    const session =
        getAdminSession();


    if (!session) {
        return;
    }


    session.lastActivity =
        new Date()
            .toISOString();


    session.lastAction =
        action;


    saveAdminSession(
        session
    );
}


/* =========================================================
   AUTO SESSION REFRESH
   ========================================================= */

function initializeSessionActivityTracking() {

    const events = [

        "click",
        "keydown",
        "mousemove",
        "scroll",
        "touchstart"
    ];


    let lastRefresh =
        0;


    events.forEach(
        eventName => {

            document.addEventListener(
                eventName,
                () => {

                    const now =
                        Date.now();


                    /*
                       Don't write to localStorage
                       on every mouse movement.
                    */

                    if (
                        now -
                        lastRefresh <
                        60000
                    ) {
                        return;
                    }


                    lastRefresh =
                        now;


                    refreshAdminSession();

                },
                {
                    passive: true
                }
            );
        }
    );
}


/* =========================================================
   AUTH GUARD
   ========================================================= */

function initializeAuthGuard() {

    /*
       If this is a protected page,
       require authentication.
    */

    if (!isLoginPage()) {

        const authenticated =
            requireAdminAuth();


        if (!authenticated) {
            return false;
        }
    }


    /*
       If already authenticated and
       currently on login page,
       go to dashboard.
    */

    if (isLoginPage()) {

        redirectIfAuthenticated();
    }


    return true;
}


/* =========================================================
   LOGIN FORM HANDLER
   ========================================================= */

function initializeLoginForm() {

    const form =
        document.querySelector(
            "#loginForm"
        );


    if (!form) {
        return;
    }


    const emailInput =
        document.querySelector(
            "#email"
        );


    const passwordInput =
        document.querySelector(
            "#password"
        );


    const errorElement =
        document.querySelector(
            "#loginError"
        );


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const email =
                emailInput
                    ? emailInput.value
                    : "";


            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            /*
               Clear previous error.
            */

            if (errorElement) {

                errorElement.textContent =
                    "";

                errorElement.classList.add(
                    "hidden"
                );
            }


            /*
               Loading state.
            */

            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.dataset
                    .originalText =
                    submitButton.textContent;

                submitButton.textContent =
                    "Signing in...";
            }


            /*
               Small delay to make the
               prototype feel like a real
               authentication request.
            */

            setTimeout(async () => {

                    const result =
                        await loginAdmin(
                            email,
                            password
                        );


                    if (result.success) {

                        recordAdminActivity(
                            "login"
                        );


                        /*
                           Redirect to
                           dashboard.
                        */

                        window.location.href =
                            "dashboard.html";

                        return;
                    }


                    /*
                       Show error.
                    */

                    if (errorElement) {

                        errorElement.textContent =
                            result.error;

                        errorElement.classList
                            .remove(
                                "hidden"
                            );
                    }


                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        submitButton.textContent =
                            submitButton.dataset
                                .originalText ||
                            "Sign In";
                    }

                },
                450
            );
        }
    );
}


/* =========================================================
   PASSWORD VISIBILITY
   ========================================================= */

function initializePasswordToggle() {

    const toggle =
        document.querySelector(
            "#togglePassword"
        );


    const passwordInput =
        document.querySelector(
            "#password"
        );


    if (
        !toggle ||
        !passwordInput
    ) {
        return;
    }


    toggle.addEventListener(
        "click",
        () => {

            const isPassword =
                passwordInput.type ===
                "password";


            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";


            toggle.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );


            toggle.innerHTML =
                isPassword
                    ? "◉"
                    : "○";
        }
    );
}


/* =========================================================
   DEMO CREDENTIALS
   ========================================================= */

function initializeDemoCredentials() {

    const demoButton =
        document.querySelector(
            "#demoLogin"
        );


    if (!demoButton) {
        return;
    }


    demoButton.addEventListener(
        "click",
        () => {

            const emailInput =
                document.querySelector(
                    "#email"
                );


            const passwordInput =
                document.querySelector(
                    "#password"
                );


            if (emailInput) {

                emailInput.value =
                    AUTH_CONFIG
                        .demoAdmin
                        .email;
            }


            if (passwordInput) {

                passwordInput.value =
                    AUTH_CONFIG
                        .demoAdmin
                        .password;
            }


            /*
               Automatically submit after
               filling demo credentials.
            */

            const form =
                document.querySelector(
                    "#loginForm"
                );


            if (form) {

                form.requestSubmit();
            }
        }
    );
}


/* =========================================================
   LOGOUT BUTTONS
   ========================================================= */

function initializeLogoutButtons() {

    const buttons =
        document.querySelectorAll(
            "[data-action='logout']"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    logoutAdmin(true);
                }
            );
        }
    );
}


/* =========================================================
   AUTH INITIALIZATION
   ========================================================= */

function initializeAuth() {

    /*
       First protect the current page.
    */

    const allowed =
        initializeAuthGuard();


    if (!allowed) {
        return;
    }


    /*
       Initialize login page.
    */

    initializeLoginForm();

    initializePasswordToggle();

    initializeDemoCredentials();


    /*
       Initialize protected page
       logout controls.
    */

    initializeLogoutButtons();


    /*
       Keep session alive while the
       administrator is active.
    */

    if (!isLoginPage()) {

        initializeSessionActivityTracking();
    }
}


/* =========================================================
   GLOBAL EXPORTS
   ========================================================= */

window.AUTH_CONFIG =
    AUTH_CONFIG;

window.AUTH_ERRORS =
    AUTH_ERRORS;

window.isValidEmail =
    isValidEmail;

window.validateLoginCredentials =
    validateLoginCredentials;

window.createAdminSession =
    createAdminSession;

window.loginAdmin =
    loginAdmin;

window.logoutAdmin =
    logoutAdmin;

window.validateAdminSession =
    validateAdminSession;

window.requireAdminAuth =
    requireAdminAuth;

window.redirectIfAuthenticated =
    redirectIfAuthenticated;

window.isLoginPage =
    isLoginPage;

window.getCurrentAdmin =
    getCurrentAdmin;

window.getCurrentAdminName =
    getCurrentAdminName;

window.getCurrentAdminRole =
    getCurrentAdminRole;

window.refreshAdminSession =
    refreshAdminSession;

window.recordAdminActivity =
    recordAdminActivity;

window.initializeAuth =
    initializeAuth;


/* =========================================================
   AUTO START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeAuth();

    }
);