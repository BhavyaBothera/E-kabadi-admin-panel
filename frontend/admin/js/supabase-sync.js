(function () {
    "use strict";

    if (!window.EKABADI_ENV || !window.EKABADI_ENV.isSupabaseMode()) return;

    var adapter = window.EKABADI_SUPABASE_ADAPTER;
    if (!adapter || typeof adapter.fetchSession !== "function") return;

    var collections = [
        "users","citizens","collectors","pickups","payments","rewards",
        "notifications","scrapCategories","issues","approvalAuditTrail"
    ];

    window.EKABADI_SUPABASE_SYNC = (async function () {
        var session = await adapter.fetchSession();

        if (!session || session.role !== "admin") {
            console.warn("[E-Kabaadi] Live sync skipped: authenticated admin session not found.");
            return false;
        }

        var database = typeof getDatabase === "function" ? getDatabase() : {};

        await Promise.all(collections.map(async function (name) {
            try {
                var data = await adapter.getCollection(name);
                database[name] = Array.isArray(data) ? data : [];
            } catch (error) {
                console.error("[E-Kabaadi] Failed to load " + name, error);
            }
        }));

        if (typeof saveDatabase === "function") saveDatabase(database);

        window.dispatchEvent(new CustomEvent("ekabadi:supabase-sync-complete", {
            detail: { timestamp: new Date().toISOString() }
        }));

        if (sessionStorage.getItem("ekabadi_live_sync_bootstrap") !== "done") {
            sessionStorage.setItem("ekabadi_live_sync_bootstrap", "done");
            window.location.reload();
        }

        return true;
    })().catch(function (error) {
        console.error("[E-Kabaadi] Live data sync failed:", error);
        return false;
    });
})();
