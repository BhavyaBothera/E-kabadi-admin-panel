/* =========================================================
   E-KABADI COMMAND CENTER
   LOCAL STORAGE / FRONTEND DATABASE
   ========================================================= */

/*
   This file provides persistence for the prototype.

   Flow:

   data.js
       ↓
   storage.js
       ↓
   localStorage
       ↓
   Every admin page

   This means actions performed by the admin can persist
   while navigating around the prototype.

   Later, these functions can be replaced with API calls
   to Supabase / Firebase / Node.js without redesigning
   the entire frontend.
*/


/* =========================================================
   STORAGE CONFIGURATION
   ========================================================= */

const STORAGE_KEY = "ekabadi_unified_db_v2";

const SESSION_KEY = "ekabadi_platform_session_v2";

const SETTINGS_KEY = "ekabadi_admin_settings_v2";

const NOTIFICATION_KEY = "ekabadi_admin_notifications_v2";


/* =========================================================
   INTERNAL HELPERS
   ========================================================= */


/**
 * Safely clone an object.
 *
 * This prevents accidental modification of the original
 * mock database object in data.js.
 */
function cloneData(data) {

    return JSON.parse(
        JSON.stringify(data)
    );
}


/**
 * Safely parse JSON from localStorage.
 */
function parseStorageValue(key, fallback = null) {

    try {

        const value =
            localStorage.getItem(key);

        if (!value) {
            return fallback;
        }

        return JSON.parse(value);

    } catch (error) {

        console.error(
            `Storage read error for ${key}:`,
            error
        );

        return fallback;
    }
}


/**
 * Safely write JSON to localStorage.
 */
function writeStorageValue(key, value) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("ekabadi:statechange", { detail: { key, value } }));
        }

        return true;

    } catch (error) {

        console.error(
            `Storage write error for ${key}:`,
            error
        );

        return false;
    }
}


/* =========================================================
   DATABASE INITIALIZATION
   ========================================================= */


/**
 * Initialize the frontend database.
 *
 * On the first visit:
 * data.js → localStorage
 *
 * On later visits:
 * localStorage → application
 */
function initializeDatabase() {

    const existingDatabase =
        parseStorageValue(
            STORAGE_KEY
        );

    if (!existingDatabase) {

        const database =
            cloneData(EKABADI_DATA);

        writeStorageValue(
            STORAGE_KEY,
            database
        );

        return database;
    }

    return existingDatabase;
}


/**
 * Get the complete database.
 */
function getDatabase() {

    const database =
        parseStorageValue(
            STORAGE_KEY
        );

    if (!database) {
        return initializeDatabase();
    }

    return database;
}


/**
 * Replace the complete database.
 */
function saveDatabase(database) {

    return writeStorageValue(
        STORAGE_KEY,
        database
    );
}


/* =========================================================
   COLLECTION ACCESS
   ========================================================= */


/**
 * Get a collection from the database.
 *
 * Example:
 *
 * getCollection("citizens")
 */
function getCollection(collectionName) {

    const database =
        getDatabase();

    if (
        !database ||
        !Array.isArray(
            database[collectionName]
        )
    ) {
        return [];
    }

    return database[collectionName];
}


/**
 * Replace a complete collection.
 */
function saveCollection(
    collectionName,
    collection
) {

    const database =
        getDatabase();

    database[collectionName] =
        collection;

    return saveDatabase(
        database
    );
}


/* =========================================================
   GENERIC CRUD
   ========================================================= */


/**
 * Find item by ID.
 */
function storageFindById(
    collectionName,
    id
) {

    const collection =
        getCollection(
            collectionName
        );

    return collection.find(
        item => item.id === id
    ) || null;
}


/**
 * Add an item.
 */
function storageAdd(
    collectionName,
    item
) {

    const collection =
        getCollection(
            collectionName
        );

    collection.push(item);

    saveCollection(
        collectionName,
        collection
    );

    return item;
}


/**
 * Update an item.
 *
 * Example:
 *
 * storageUpdate(
 *     "citizens",
 *     "CIT-1001",
 *     {
 *         status: "suspended"
 *     }
 * );
 */
function storageUpdate(
    collectionName,
    id,
    updates
) {

    const collection =
        getCollection(
            collectionName
        );

    const index =
        collection.findIndex(
            item => item.id === id
        );

    if (index === -1) {
        return null;
    }

    collection[index] = {
        ...collection[index],
        ...updates
    };

    saveCollection(
        collectionName,
        collection
    );

    return collection[index];
}


/**
 * Delete an item.
 */
function storageDelete(
    collectionName,
    id
) {

    const collection =
        getCollection(
            collectionName
        );

    const newCollection =
        collection.filter(
            item => item.id !== id
        );

    if (
        newCollection.length ===
        collection.length
    ) {
        return false;
    }

    saveCollection(
        collectionName,
        newCollection
    );

    return true;
}


/* =========================================================
   CITIZEN OPERATIONS
   ========================================================= */


/**
 * Get current citizens.
 */
function storageGetCitizens() {

    return getCollection(
        "citizens"
    );
}


/**
 * Get one citizen.
 */
function storageGetCitizen(id) {

    return storageFindById(
        "citizens",
        id
    );
}


/**
 * Update citizen.
 */
function storageUpdateCitizen(
    id,
    updates
) {

    return storageUpdate(
        "citizens",
        id,
        updates
    );
}


/**
 * Change citizen status.
 */
function storageSetCitizenStatus(
    id,
    status
) {

    return storageUpdateCitizen(
        id,
        {
            status,
            updatedAt:
                new Date().toISOString()
        }
    );
}


/**
 * Suspend citizen.
 */
function suspendCitizen(id) {

    return storageSetCitizenStatus(
        id,
        "suspended"
    );
}


/**
 * Activate citizen.
 */
function activateCitizen(id) {

    return storageSetCitizenStatus(
        id,
        "active"
    );
}


/* =========================================================
   COLLECTOR OPERATIONS
   ========================================================= */


/**
 * Get collectors.
 */
function storageGetCollectors() {

    return getCollection(
        "collectors"
    );
}


/**
 * Get collector.
 */
function storageGetCollector(id) {

    return storageFindById(
        "collectors",
        id
    );
}


/**
 * Update collector.
 */
function storageUpdateCollector(
    id,
    updates
) {

    return storageUpdate(
        "collectors",
        id,
        updates
    );
}


/**
 * Record action in approval audit trail.
 */
function recordApprovalAudit(
    entityType,
    entityId,
    action,
    reason,
    reviewerName
) {
    const db = getDatabase();
    if (!db.approvalAuditTrail) {
        db.approvalAuditTrail = [];
    }

    // Idempotency check: produce exactly ONE audit record for the same entity and action
    const existing = db.approvalAuditTrail.find(a => a.entityId === entityId && a.action === action);
    if (existing) {
        return existing;
    }

    const auditEntry = {
        id: "AUD-" + Math.floor(1000 + Math.random() * 9000),
        entityType,
        entityId,
        reviewerName: reviewerName || "Bhavya Bothera (Super Admin)",
        action,
        reason: reason || (action === "APPROVE" ? "Verified documents and credentials" : "Application review decision"),
        createdAt: new Date().toISOString()
    };

    db.approvalAuditTrail.unshift(auditEntry);
    saveDatabase(db);
    return auditEntry;
}

/**
 * Approve citizen KYC / registration.
 */
function approveCitizen(id, reason) {
    recordApprovalAudit("citizen", id, "APPROVE", reason, "Bhavya Bothera (Super Admin)");
    const citizen = storageGetCitizen(id);
    if (citizen && citizen.userId) {
        storageUpdate("users", citizen.userId, { status: "active", applicationStatus: "approved" });
    }
    return storageUpdateCitizen(id, {
        status: "active",
        kycStatus: "verified",
        applicationStatus: "approved",
        verifiedAt: new Date().toISOString()
    });
}

/**
 * Reject citizen KYC / registration.
 */
function rejectCitizen(id, reason) {
    recordApprovalAudit("citizen", id, "REJECT", reason, "Bhavya Bothera (Super Admin)");
    const citizen = storageGetCitizen(id);
    if (citizen && citizen.userId) {
        storageUpdate("users", citizen.userId, { status: "rejected", applicationStatus: "rejected" });
    }
    return storageUpdateCitizen(id, {
        status: "rejected",
        kycStatus: "rejected",
        applicationStatus: "rejected",
        rejectionReason: reason || "Document verification failed"
    });
}

/**
 * Approve collector partner.
 */
function approveCollector(id, reason) {
    recordApprovalAudit("collector", id, "APPROVE", reason, "Bhavya Bothera (Super Admin)");
    const col = storageGetCollector(id);
    if (col && col.userId) {
        storageUpdate("users", col.userId, { status: "active", applicationStatus: "approved" });
    }
    return storageUpdateCollector(
        id,
        {
            status: "active",
            verified: true,
            verificationStatus: "verified",
            applicationStatus: "approved",
            verifiedAt: new Date().toISOString()
        }
    );
}

/**
 * Reject collector partner.
 */
function rejectCollector(id, reason) {
    recordApprovalAudit("collector", id, "REJECT", reason, "Bhavya Bothera (Super Admin)");
    const col = storageGetCollector(id);
    if (col && col.userId) {
        storageUpdate("users", col.userId, { status: "rejected", applicationStatus: "rejected" });
    }
    return storageUpdateCollector(
        id,
        {
            status: "rejected",
            verified: false,
            verificationStatus: "rejected",
            applicationStatus: "rejected",
            rejectionReason: reason || "Commercial vehicle or scale verification failed"
        }
    );
}

/**
 * Suspend collector.
 */
function suspendCollector(id) {

    return storageUpdateCollector(
        id,
        {
            status: "suspended"
        }
    );
}


/**
 * Activate collector.
 */
function activateCollector(id) {

    return storageUpdateCollector(
        id,
        {
            status: "active"
        }
    );
}


/* =========================================================
   PICKUP OPERATIONS
   ========================================================= */


/**
 * Get pickups.
 */
function storageGetPickups() {

    return getCollection(
        "pickups"
    );
}


/**
 * Get pickup.
 */
function storageGetPickup(id) {

    return storageFindById(
        "pickups",
        id
    );
}


/**
 * Update pickup.
 */
function storageUpdatePickup(
    id,
    updates
) {

    return storageUpdate(
        "pickups",
        id,
        updates
    );
}


/**
 * Assign collector to pickup.
 */
function assignCollectorToPickup(
    pickupId,
    collectorId
) {

    const collector =
        storageGetCollector(
            collectorId
        );

    if (!collector) {
        return null;
    }

    return storageUpdatePickup(
        pickupId,
        {
            collectorId:
                collector.id,

            collectorName:
                collector.name,

            status:
                "collector_assigned",

            assignedAt:
                new Date().toISOString()
        }
    );
}


/**
 * Update pickup status.
 */
function updatePickupStatus(
    pickupId,
    status
) {

    const updates = {
        status,
        updatedAt:
            new Date().toISOString()
    };

    if (status === "completed") {

        updates.completedAt =
            new Date().toISOString();
    }

    return storageUpdatePickup(
        pickupId,
        updates
    );
}


/* =========================================================
   PAYMENT OPERATIONS
   ========================================================= */


/**
 * Get payments.
 */
function storageGetPayments() {

    return getCollection(
        "payments"
    );
}


/**
 * Get payment.
 */
function storageGetPayment(id) {

    return storageFindById(
        "payments",
        id
    );
}


/**
 * Update payment.
 */
function storageUpdatePayment(
    id,
    updates
) {

    return storageUpdate(
        "payments",
        id,
        updates
    );
}


/**
 * Mark payment as completed.
 */
function completePayment(id) {

    const payment =
        storageGetPayment(id);

    if (!payment) {
        return null;
    }

    return storageUpdatePayment(
        id,
        {
            status: "completed",

            transactionId:
                payment.transactionId ||
                `UPI${Date.now()}`,

            completedAt:
                new Date().toISOString()
        }
    );
}


/* =========================================================
   SCRAP MATERIAL OPERATIONS
   ========================================================= */


/**
 * Get scrap materials.
 */
function storageGetMaterials() {

    return getCollection(
        "scrapMaterials"
    );
}


/**
 * Get material.
 */
function storageGetMaterial(id) {

    return storageFindById(
        "scrapMaterials",
        id
    );
}


/**
 * Update material.
 */
function storageUpdateMaterial(
    id,
    updates
) {

    return storageUpdate(
        "scrapMaterials",
        id,
        updates
    );
}


/**
 * Update material price.
 *
 * Automatically stores previous price.
 */
function updateMaterialRate(
    id,
    newRate
) {

    const material =
        storageGetMaterial(id);

    if (!material) {
        return null;
    }

    const rate =
        Number(newRate);

    if (
        Number.isNaN(rate) ||
        rate < 0
    ) {
        return null;
    }

    return storageUpdateMaterial(
        id,
        {
            previousRate:
                material.rate,

            rate,

            rateUpdatedAt:
                new Date().toISOString()
        }
    );
}


/**
 * Activate/deactivate material.
 */
function toggleMaterialStatus(id) {

    const material =
        storageGetMaterial(id);

    if (!material) {
        return null;
    }

    const newStatus =
        material.status === "active"
            ? "inactive"
            : "active";

    return storageUpdateMaterial(
        id,
        {
            status: newStatus
        }
    );
}


/* =========================================================
   REWARD OPERATIONS
   ========================================================= */


/**
 * Get rewards.
 */
function storageGetRewards() {

    return getCollection(
        "rewards"
    );
}


/**
 * Get reward.
 */
function storageGetReward(id) {

    return storageFindById(
        "rewards",
        id
    );
}


/**
 * Update reward.
 */
function storageUpdateReward(
    id,
    updates
) {

    return storageUpdate(
        "rewards",
        id,
        updates
    );
}


/**
 * Toggle reward status.
 */
function toggleRewardStatus(id) {

    const reward =
        storageGetReward(id);

    if (!reward) {
        return null;
    }

    const newStatus =
        reward.status === "active"
            ? "paused"
            : "active";

    return storageUpdateReward(
        id,
        {
            status: newStatus
        }
    );
}


/* =========================================================
   ISSUE OPERATIONS
   ========================================================= */


/**
 * Get issues.
 */
function storageGetIssues() {

    return getCollection(
        "issues"
    );
}


/**
 * Get issue.
 */
function storageGetIssue(id) {

    return storageFindById(
        "issues",
        id
    );
}


/**
 * Update issue.
 */
function storageUpdateIssue(
    id,
    updates
) {

    return storageUpdate(
        "issues",
        id,
        {
            ...updates,

            updatedAt:
                new Date().toISOString()
        }
    );
}


/**
 * Resolve issue.
 */
function resolveIssue(id) {

    return storageUpdateIssue(
        id,
        {
            status: "resolved",
            resolvedAt:
                new Date().toISOString()
        }
    );
}


/**
 * Start investigating issue.
 */
function investigateIssue(id) {

    return storageUpdateIssue(
        id,
        {
            status: "investigating"
        }
    );
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */


/**
 * Get notifications.
 */
function storageGetNotifications() {

    const stored =
        parseStorageValue(
            NOTIFICATION_KEY
        );

    if (stored) {
        return stored;
    }

    const initial =
        cloneData(
            EKABADI_DATA.notifications
        );

    writeStorageValue(
        NOTIFICATION_KEY,
        initial
    );

    return initial;
}


/**
 * Save notifications.
 */
function storageSaveNotifications(
    notifications
) {

    return writeStorageValue(
        NOTIFICATION_KEY,
        notifications
    );
}


/**
 * Mark notification as read.
 */
function markNotificationRead(id) {

    const notifications =
        storageGetNotifications();

    const notification =
        notifications.find(
            item => item.id === id
        );

    if (!notification) {
        return null;
    }

    notification.read = true;

    storageSaveNotifications(
        notifications
    );

    return notification;
}


/**
 * Mark all notifications as read.
 */
function markAllNotificationsRead() {

    const notifications =
        storageGetNotifications();

    notifications.forEach(
        notification => {
            notification.read = true;
        }
    );

    storageSaveNotifications(
        notifications
    );

    return notifications;
}


/**
 * Count unread notifications.
 */
function getUnreadNotificationCount() {

    return storageGetNotifications()
        .filter(
            notification =>
                !notification.read
        )
        .length;
}


/* =========================================================
   PLATFORM SETTINGS
   ========================================================= */


/**
 * Get settings.
 */
function storageGetSettings() {

    const stored =
        parseStorageValue(
            SETTINGS_KEY
        );

    if (stored) {
        return stored;
    }

    const settings =
        cloneData(
            EKABADI_DATA.settings
        );

    writeStorageValue(
        SETTINGS_KEY,
        settings
    );

    return settings;
}


/**
 * Update settings.
 */
function storageUpdateSettings(
    updates
) {

    const current =
        storageGetSettings();

    const updated = {
        ...current,
        ...updates
    };

    writeStorageValue(
        SETTINGS_KEY,
        updated
    );

    return updated;
}


/* =========================================================
   SESSION STORAGE
   ========================================================= */


/**
 * Save admin session.
 */
function saveAdminSession(
    session
) {

    return writeStorageValue(
        SESSION_KEY,
        session
    );
}


/**
 * Get admin session.
 */
function getAdminSession() {

    return parseStorageValue(
        SESSION_KEY
    );
}


/**
 * Clear admin session.
 */
function clearAdminSession() {

    try {

        localStorage.removeItem(
            SESSION_KEY
        );

        return true;

    } catch (error) {

        console.error(
            "Unable to clear session:",
            error
        );

        return false;
    }
}


/**
 * Check if admin is logged in.
 */
function isAdminLoggedIn() {

    const session =
        getAdminSession();

    return Boolean(
        session &&
        session.loggedIn === true
    );
}


/* =========================================================
   DATABASE RESET
   ========================================================= */


/**
 * Reset entire prototype database.
 *
 * Useful during hackathon demo preparation.
 */
function resetDatabase() {

    const freshDatabase =
        cloneData(EKABADI_DATA);

    saveDatabase(
        freshDatabase
    );

    const freshNotifications =
        cloneData(
            EKABADI_DATA.notifications
        );

    storageSaveNotifications(
        freshNotifications
    );

    storageUpdateSettings(
        cloneData(
            EKABADI_DATA.settings
        )
    );

    console.log(
        "E-Kabadi database reset successfully."
    );

    return freshDatabase;
}


/* =========================================================
   DATABASE EXPORT
   ========================================================= */


/**
 * Export database as JSON.
 *
 * Useful if we later add an "Export Data" button
 * inside Settings.
 */
function exportDatabase() {

    const database =
        getDatabase();

    const json =
        JSON.stringify(
            database,
            null,
            2
        );

    const blob =
        new Blob(
            [json],
            {
                type: "application/json"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const anchor =
        document.createElement("a");

    anchor.href = url;

    anchor.download =
        `ekabadi-backup-${Date.now()}.json`;

    document.body.appendChild(
        anchor
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);
}


/* =========================================================
   DATABASE IMPORT
   ========================================================= */


/**
 * Import database from JSON file.
 *
 * Usage:
 *
 * importDatabase(file)
 */
function importDatabase(file) {

    return new Promise(
        (resolve, reject) => {

            if (!file) {

                reject(
                    new Error(
                        "No file selected."
                    )
                );

                return;
            }

            const reader =
                new FileReader();

            reader.onload =
                event => {

                    try {

                        const imported =
                            JSON.parse(
                                event.target.result
                            );

                        if (
                            typeof imported !==
                            "object"
                        ) {
                            throw new Error(
                                "Invalid database format."
                            );
                        }

                        saveDatabase(
                            imported
                        );

                        resolve(
                            imported
                        );

                    } catch (error) {

                        reject(error);
                    }
                };

            reader.onerror =
                () => {

                    reject(
                        new Error(
                            "Unable to read file."
                        )
                    );
                };

            reader.readAsText(file);
        }
    );
}


/* =========================================================
   DATABASE STATISTICS
   ========================================================= */


/**
 * Get current database size.
 */
function getDatabaseStats() {

    const database =
        getDatabase();

    return {

        citizens:
            Array.isArray(
                database.citizens
            )
                ? database.citizens.length
                : 0,

        collectors:
            Array.isArray(
                database.collectors
            )
                ? database.collectors.length
                : 0,

        pickups:
            Array.isArray(
                database.pickups
            )
                ? database.pickups.length
                : 0,

        payments:
            Array.isArray(
                database.payments
            )
                ? database.payments.length
                : 0,

        materials:
            Array.isArray(
                database.scrapMaterials
            )
                ? database.scrapMaterials.length
                : 0,

        rewards:
            Array.isArray(
                database.rewards
            )
                ? database.rewards.length
                : 0,

        issues:
            Array.isArray(
                database.issues
            )
                ? database.issues.length
                : 0
    };
}


/* =========================================================
   INITIALIZE
   ========================================================= */

initializeDatabase();


/* =========================================================
   GLOBAL EXPORTS
   ========================================================= */

window.STORAGE_KEY =
    STORAGE_KEY;

window.initializeDatabase =
    initializeDatabase;

window.getDatabase =
    getDatabase;

window.saveDatabase =
    saveDatabase;

window.getCollection =
    getCollection;

window.saveCollection =
    saveCollection;

window.storageFindById =
    storageFindById;

window.storageAdd =
    storageAdd;

window.storageUpdate =
    storageUpdate;

window.storageDelete =
    storageDelete;


/* Citizens */

window.storageGetCitizens =
    storageGetCitizens;

window.storageGetCitizen =
    storageGetCitizen;

window.storageUpdateCitizen =
    storageUpdateCitizen;

window.suspendCitizen =
    suspendCitizen;

window.activateCitizen =
    activateCitizen;

window.approveCitizen =
    approveCitizen;

window.rejectCitizen =
    rejectCitizen;


/* Collectors */

window.storageGetCollectors =
    storageGetCollectors;

window.storageGetCollector =
    storageGetCollector;

window.storageUpdateCollector =
    storageUpdateCollector;

window.approveCollector =
    approveCollector;

window.rejectCollector =
    rejectCollector;

window.suspendCollector =
    suspendCollector;

window.activateCollector =
    activateCollector;

window.recordApprovalAudit =
    recordApprovalAudit;


/* Pickups */

window.storageGetPickups =
    storageGetPickups;

window.storageGetPickup =
    storageGetPickup;

window.storageUpdatePickup =
    storageUpdatePickup;

window.assignCollectorToPickup =
    assignCollectorToPickup;

window.updatePickupStatus =
    updatePickupStatus;


/* Payments */

window.storageGetPayments =
    storageGetPayments;

window.storageGetPayment =
    storageGetPayment;

window.storageUpdatePayment =
    storageUpdatePayment;

window.completePayment =
    completePayment;


/* Materials */

window.storageGetMaterials =
    storageGetMaterials;

window.storageGetMaterial =
    storageGetMaterial;

window.storageUpdateMaterial =
    storageUpdateMaterial;

window.updateMaterialRate =
    updateMaterialRate;

window.toggleMaterialStatus =
    toggleMaterialStatus;


/* Rewards */

window.storageGetRewards =
    storageGetRewards;

window.storageGetReward =
    storageGetReward;

window.storageUpdateReward =
    storageUpdateReward;

window.toggleRewardStatus =
    toggleRewardStatus;


/* Issues */

window.storageGetIssues =
    storageGetIssues;

window.storageGetIssue =
    storageGetIssue;

window.storageUpdateIssue =
    storageUpdateIssue;

window.resolveIssue =
    resolveIssue;

window.investigateIssue =
    investigateIssue;


/* Notifications */

window.storageGetNotifications =
    storageGetNotifications;

window.storageSaveNotifications =
    storageSaveNotifications;

window.markNotificationRead =
    markNotificationRead;

window.markAllNotificationsRead =
    markAllNotificationsRead;

window.getUnreadNotificationCount =
    getUnreadNotificationCount;


/* Settings */

window.storageGetSettings =
    storageGetSettings;

window.storageUpdateSettings =
    storageUpdateSettings;


/* Session */

window.saveAdminSession =
    saveAdminSession;

window.getAdminSession =
    getAdminSession;

window.clearAdminSession =
    clearAdminSession;

window.isAdminLoggedIn =
    isAdminLoggedIn;


/* Database */

window.resetDatabase =
    resetDatabase;

window.exportDatabase =
    exportDatabase;

window.importDatabase =
    importDatabase;

window.getDatabaseStats =
    getDatabaseStats;