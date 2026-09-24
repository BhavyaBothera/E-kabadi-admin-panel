/* =========================================================
   E-KABAADI PLATFORM
   Supabase Data Adapter
   File: frontend/shared/js/supabase-adapter.js

   Implements the same interface as the localStorage StateAdapter
   but routes all operations through Supabase PostgreSQL + RLS.
   
   This adapter returns Promises for all data operations.
   The service layer handles the sync/async bridging.

   Collection name mapping:
     localStorage key  →  Supabase table
     ─────────────────────────────────────
     users             →  profiles
     citizens          →  citizens
     collectors        →  collectors
     pickups           →  pickups
     payments          →  payments
     rewards           →  reward_catalog + reward_transactions
     notifications     →  notifications
     scrapCategories   →  scrap_categories
     issues            →  issues
     approvalAuditTrail → approval_audit_trail
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(["./supabase-client"], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory(require("./supabase-client"));
    } else {
        root.EKABADI_SUPABASE_ADAPTER = factory(root.EKABADI_SUPABASE);
    }
}(typeof self !== "undefined" ? self : this, function (supabaseModule) {
    "use strict";

    var supabase = supabaseModule || (typeof self !== "undefined" ? self.EKABADI_SUPABASE : null);

    // ── Collection name → Supabase table mapping ──
    var TABLE_MAP = {
        users: "profiles",
        citizens: "citizens",
        collectors: "collectors",
        pickups: "pickups",
        payments: "payments",
        rewards: "reward_catalog",
        rewardTransactions: "reward_transactions",
        notifications: "notifications",
        scrapCategories: "scrap_categories",
        issues: "issues",
        approvalAuditTrail: "approval_audit_trail",
        aiAnalyses: "ai_analyses",
        citizenSavedLocations: "citizen_saved_locations",
        financialLedger: "financial_ledger",
        paymentProviderEvents: "payment_provider_events",
        paymentAdjustments: "payment_adjustments",
        notificationPreferences: "notification_preferences",
        notificationOutbox: "notification_outbox"
    };

    // ── Column name mapping (camelCase → snake_case) ──
    function toSnakeCase(str) {
        return str.replace(/[A-Z]/g, function (letter) {
            return "_" + letter.toLowerCase();
        });
    }

    function toCamelCase(str) {
        return str.replace(/_([a-z])/g, function (match, letter) {
            return letter.toUpperCase();
        });
    }

    function mapKeysToSnake(obj) {
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
        var result = {};
        Object.keys(obj).forEach(function (key) {
            var snakeKey = toSnakeCase(key);
            result[snakeKey] = obj[key];
        });
        return result;
    }

    function mapKeysToCamel(obj) {
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
        var result = {};
        Object.keys(obj).forEach(function (key) {
            var camelKey = toCamelCase(key);
            result[camelKey] = obj[key];
        });
        return result;
    }

    function mapArrayToCamel(arr) {
        if (!Array.isArray(arr)) return [];
        return arr.map(mapKeysToCamel);
    }

    function getTableName(collectionName) {
        return TABLE_MAP[collectionName] || toSnakeCase(collectionName);
    }

    // ── Error handling wrapper ──
    function handleError(operation, error) {
        var userMessage = "Unable to " + operation + ". Please try again.";
        
        if (error) {
            console.error("[E-Kabaadi Supabase] " + operation + " failed:", error.message || error);
            
            // Map known Supabase/PostgreSQL errors to user-friendly messages
            if (error.code === "PGRST301" || error.message && error.message.includes("JWT")) {
                userMessage = "Your session has expired. Please log in again.";
            } else if (error.code === "42501" || error.message && error.message.includes("policy")) {
                userMessage = "You don't have permission to perform this action.";
            } else if (error.code === "23505") {
                userMessage = "This record already exists.";
            } else if (error.code === "23503") {
                userMessage = "Referenced record not found.";
            } else if (error.message && error.message.includes("Invalid pickup transition")) {
                userMessage = "This status change is not allowed.";
            }
        }

        return { success: false, error: userMessage, _rawError: error };
    }

    function dispatchStateChange(entity, action, payload) {
        if (typeof window !== "undefined") {
            var event = new CustomEvent("ekabadi:statechange", {
                detail: { entity: entity, action: action, payload: payload, timestamp: new Date().toISOString() }
            });
            window.dispatchEvent(event);
        }
    }

    // ── In-Memory & LocalStorage Session Cache ──
    var SESSION_STORAGE_KEY = "ekabadi_supabase_cached_session_v1";
    var _cachedSession = null;

    function safeParse(str, fallback) {
        try { return str ? JSON.parse(str) : fallback; } catch (e) { return fallback; }
    }

    function safeStringify(obj) {
        try { return JSON.stringify(obj); } catch (e) { return ""; }
    }

    function sanitizeSessionForStorage(session) {
        if (!session) return null;
        return {
            loggedIn: !!session.loggedIn,
            role: session.role,
            status: session.status,
            userId: session.userId || (session.user && session.user.id),
            user: session.user ? {
                id: session.user.id,
                role: session.user.role,
                email: session.user.email,
                phone: session.user.phone,
                name: session.user.name,
                avatar: session.user.avatar,
                citizenId: session.user.citizenId,
                collectorId: session.user.collectorId,
                status: session.user.status || session.status
            } : null,
            loginTime: session.loginTime,
            expiresAt: session.expiresAt
        };
    }

    function saveCachedSession(session) {
        _cachedSession = session;
        if (typeof window !== "undefined" && window.localStorage) {
            if (session) {
                var sanitized = sanitizeSessionForStorage(session);
                window.localStorage.setItem(SESSION_STORAGE_KEY, safeStringify(sanitized));
            } else {
                window.localStorage.removeItem(SESSION_STORAGE_KEY);
            }
        }
    }

    function loadCachedSession() {
        if (_cachedSession) {
            if (_cachedSession.expiresAt && Date.now() > new Date(_cachedSession.expiresAt).getTime()) {
                saveCachedSession(null);
                return null;
            }
            return _cachedSession;
        }
        if (typeof window !== "undefined" && window.localStorage) {
            _cachedSession = safeParse(window.localStorage.getItem(SESSION_STORAGE_KEY), null);
            if (_cachedSession) {
                if (_cachedSession.expiresAt && Date.now() > new Date(_cachedSession.expiresAt).getTime()) {
                    saveCachedSession(null);
                    return null;
                }
            }
        }
        return _cachedSession;
    }

    // Auto-listen to auth state changes to keep session cache updated
    if (supabase && typeof supabase.onAuthStateChange === "function") {
        try {
            supabase.onAuthStateChange(function (event, session) {
                if (event === "SIGNED_OUT") {
                    saveCachedSession(null);
                    dispatchStateChange("session", "logout", null);
                } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                    if (session && session.user) {
                        SupabaseAdapter.fetchSession();
                    }
                }
            });
        } catch (e) {}
    }

    // =========================================================
    // SUPABASE STATE ADAPTER
    // Same interface as localStorage StateAdapter, but async-ready
    // =========================================================

    var SupabaseAdapter = {
        // ── Read all records from a collection ──
        getCollection: function (name) {
            var client = supabase.getClient();
            if (!client) return Promise.resolve([]);

            var table = getTableName(name);

            // Special handling for rewards (composite of catalog + transactions)
            if (name === "rewards") {
                return client.from("reward_catalog").select("*").then(function (result) {
                    if (result.error) throw result.error;
                    return mapArrayToCamel(result.data || []);
                }).catch(function (err) {
                    console.error("[SupabaseAdapter] getCollection rewards:", err);
                    return [];
                });
            }

            return client.from(table).select("*").then(function (result) {
                if (result.error) throw result.error;
                return mapArrayToCamel(result.data || []);
            }).catch(function (err) {
                console.error("[SupabaseAdapter] getCollection " + name + ":", err);
                return [];
            });
        },

        // ── Find a single record by ID ──
        findById: function (collectionName, id) {
            var client = supabase.getClient();
            if (!client) return Promise.resolve(null);

            var table = getTableName(collectionName);

            return client.from(table).select("*").eq("id", id).maybeSingle().then(function (result) {
                if (result.error) throw result.error;
                return result.data ? mapKeysToCamel(result.data) : null;
            }).catch(function (err) {
                console.error("[SupabaseAdapter] findById " + collectionName + "/" + id + ":", err);
                return null;
            });
        },

        // ── Insert a new record ──
        insert: function (collectionName, item) {
            var client = supabase.getClient();
            if (!client) return Promise.resolve(item);

            var table = getTableName(collectionName);
            var snakeItem = mapKeysToSnake(item);

            return client.from(table).insert(snakeItem).select().single().then(function (result) {
                if (result.error) throw result.error;
                var inserted = mapKeysToCamel(result.data);
                dispatchStateChange(collectionName, "insert", inserted);
                return inserted;
            }).catch(function (err) {
                return handleError("create " + collectionName + " record", err);
            });
        },

        // ── Update an existing record ──
        update: function (collectionName, id, updates) {
            var client = supabase.getClient();
            if (!client) return Promise.resolve(null);

            var table = getTableName(collectionName);
            var snakeUpdates = mapKeysToSnake(updates);
            snakeUpdates.updated_at = new Date().toISOString();

            return client.from(table).update(snakeUpdates).eq("id", id).select().single().then(function (result) {
                if (result.error) throw result.error;
                var updated = mapKeysToCamel(result.data);
                dispatchStateChange(collectionName, "update", updated);
                return updated;
            }).catch(function (err) {
                return handleError("update " + collectionName + " record", err);
            });
        },

        // ── Delete a record ──
        delete: function (collectionName, id) {
            var client = supabase.getClient();
            if (!client) return Promise.resolve(true);

            var table = getTableName(collectionName);

            return client.from(table).delete().eq("id", id).then(function (result) {
                if (result.error) throw result.error;
                dispatchStateChange(collectionName, "delete", { id: id });
                return true;
            }).catch(function (err) {
                return handleError("delete " + collectionName + " record", err);
            });
        },

        // ── Save entire collection (batch upsert) ──
        saveCollection: function (name, items, action) {
            var client = supabase.getClient();
            if (!client) return Promise.resolve(items);

            var table = getTableName(name);
            var snakeItems = items.map(mapKeysToSnake);

            return client.from(table).upsert(snakeItems, { onConflict: "id" }).then(function (result) {
                if (result.error) throw result.error;
                dispatchStateChange(name, action || "update", items);
                return items;
            }).catch(function (err) {
                console.error("[SupabaseAdapter] saveCollection " + name + ":", err);
                return items;
            });
        },

        // ── Session Management (Synchronous Cache + Live Auth) ──
        getSession: function () {
            // Returns synchronously from cache so route guards execute without delay
            return loadCachedSession();
        },

        fetchSession: function () {
            var client = supabase.getClient();
            if (!client) return Promise.resolve(null);

            return client.auth.getSession().then(function (result) {
                if (!result.data || !result.data.session) {
                    saveCachedSession(null);
                    return null;
                }
                
                var session = result.data.session;
                return client.from("profiles").select("*").eq("id", session.user.id).single().then(function (profileResult) {
                    if (profileResult.error || !profileResult.data) {
                        saveCachedSession(null);
                        return null;
                    }
                    
                    var profile = mapKeysToCamel(profileResult.data);
                    var appSession = {
                        loggedIn: true,
                        user: {
                            id: session.user.id,
                            role: profile.role,
                            email: profile.email || session.user.email,
                            phone: profile.phone,
                            name: ((profile.firstName || "") + " " + (profile.lastName || "")).trim() || "User",
                            avatar: profile.avatar || "U",
                            citizenId: null,
                            collectorId: null
                        },
                        role: profile.role,
                        status: profile.status,
                        loginTime: new Date().toISOString(),
                        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
                        _supabaseSession: session
                    };

                    if (appSession.role === "citizen") {
                        return client.from("citizens").select("id").eq("user_id", appSession.user.id).maybeSingle().then(function (r) {
                            if (r && r.data) appSession.user.citizenId = r.data.id;
                            saveCachedSession(appSession);
                            return appSession;
                        });
                    } else if (appSession.role === "collector") {
                        return client.from("collectors").select("id").eq("user_id", appSession.user.id).maybeSingle().then(function (r) {
                            if (r && r.data) appSession.user.collectorId = r.data.id;
                            saveCachedSession(appSession);
                            return appSession;
                        });
                    }

                    saveCachedSession(appSession);
                    return appSession;
                });
            }).catch(function (err) {
                console.error("[SupabaseAdapter] fetchSession error:", err);
                return null;
            });
        },

        setSession: function (session) {
            saveCachedSession(session);
            if (session) {
                dispatchStateChange("session", "login", session);
            }
            return Promise.resolve();
        },

        clearSession: function () {
            saveCachedSession(null);
            var client = supabase.getClient();
            if (!client) {
                dispatchStateChange("session", "logout", null);
                return Promise.resolve();
            }

            return client.auth.signOut().then(function () {
                dispatchStateChange("session", "logout", null);
            }).catch(function (err) {
                console.error("[SupabaseAdapter] signOut error:", err);
                dispatchStateChange("session", "logout", null);
            });
        },

        // ── Active Collector Directory (Public Safe Filter) ──
        getActiveCollectors: function () {
            var client = supabase.getClient();
            if (!client) return Promise.resolve([]);

            return client.from("collectors")
                .select("id, name, business_name, vehicle_type, vehicle_number, service_area, service_radius, service_radius_km, service_area_locality, approx_latitude, approx_longitude, rating, response_time, accepted_materials, scrap_categories, total_pickups, completed_pickups, is_online, status, queue_length")
                .eq("status", "active")
                .then(function (result) {
                    if (result.error) throw result.error;
                    return mapArrayToCamel(result.data || []);
                }).catch(function (err) {
                    console.error("[SupabaseAdapter] getActiveCollectors:", err);
                    return [];
                });
        },

        // ── Private KYC Storage Helpers ──
        uploadKycDocument: function (userId, file, docType, fileName) {
            if (supabase && typeof supabase.uploadKycDoc === "function") {
                return supabase.uploadKycDoc(userId, file, fileName, (file && file.type) || "application/octet-stream").then(function (res) {
                    var client = supabase.getClient();
                    if (!client) return res;

                    var docRecord = {
                        id: "DOC-" + Math.floor(1000 + Math.random() * 9000),
                        user_id: userId,
                        document_type: docType || "address_proof",
                        file_path: res.path,
                        file_name: fileName || res.path.split("/").pop(),
                        mime_type: (file && file.type) || "application/octet-stream",
                        file_size: (file && file.size) || 0,
                        verification_status: "pending"
                    };

                    return client.from("kyc_documents").insert(mapKeysToSnake(docRecord)).then(function () {
                        return { success: true, path: res.path, record: docRecord };
                    });
                });
            }
            return Promise.resolve(handleError("upload KYC document", { message: "Storage client unavailable" }));
        },

        getKycSignedUrl: function (filePath, expiresInSeconds) {
            if (supabase && typeof supabase.createSignedKycUrl === "function") {
                return supabase.createSignedKycUrl(filePath, expiresInSeconds || 60);
            }
            return Promise.resolve({ success: false, error: "Storage client unavailable" });
        },

        // ── Live Health Check ──
        ping: function () {
            if (supabase && typeof supabase.checkConnection === "function") {
                return supabase.checkConnection();
            }
            return Promise.resolve({ connected: false, error: "Supabase module not available" });
        },

        // ── RPC call helper (for atomic operations) ──
        rpc: function (fnName, params) {
            var client = supabase.getClient();
            if (!client) return Promise.resolve(null);

            return client.rpc(fnName, params).then(function (result) {
                if (result.error) throw result.error;
                return result.data;
            }).catch(function (err) {
                return handleError("execute " + fnName, err);
            });
        },

        // ── Supabase Auth wrappers with Auto-Profile Linking ──
        signUp: function (email, password, metadata) {
            var client = supabase.getClient();
            if (!client) return Promise.resolve(handleError("sign up", { message: "Supabase not configured" }));

            var selfAdapter = this;
            return client.auth.signUp({
                email: email,
                password: password,
                options: { data: metadata || {} }
            }).then(function (result) {
                if (result.error) throw result.error;
                var user = result.data.user;
                if (!user) return { success: false, error: "User registration failed" };

                var role = (metadata && metadata.role) || "citizen";
                var firstName = (metadata && metadata.firstName) || (metadata && metadata.name ? metadata.name.split(" ")[0] : "New");
                var lastName = (metadata && metadata.lastName) || (metadata && metadata.name ? metadata.name.split(" ").slice(1).join(" ") : "User");
                var phone = (metadata && metadata.phone) || "";

                // 1. Insert into profiles
                var profileRecord = {
                    id: user.id,
                    role: role,
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone: phone,
                    status: "pending_approval",
                    application_status: "pending_approval",
                    phone_verified: !!(metadata && metadata.phoneVerified),
                    email_verified: !!(metadata && metadata.emailVerified),
                    masked_aadhaar: (metadata && metadata.maskedAadhaar) || ("XXXX-XXXX-" + Math.floor(1000 + Math.random() * 9000))
                };

                return client.from("profiles").insert(profileRecord).then(function (profRes) {
                    if (profRes.error) {
                        console.warn("[SupabaseAdapter] Profile insert notice:", profRes.error.message);
                    }

                    // 2. Insert into role table
                    if (role === "citizen") {
                        var citizenId = (metadata && metadata.citizenId) || ("CIT-" + Math.floor(1000 + Math.random() * 9000));
                        var citizenRecord = {
                            id: citizenId,
                            user_id: user.id,
                            name: (metadata && metadata.name) || (firstName + " " + lastName).trim(),
                            phone: phone,
                            email: email,
                            addresses: (metadata && metadata.location) ? [metadata.location] : [],
                            status: "pending_approval",
                            kyc_status: "pending"
                        };
                        return client.from("citizens").insert(citizenRecord).then(function () {
                            return { success: true, user: user, citizenId: citizenId };
                        });
                    } else if (role === "collector") {
                        var collectorId = (metadata && metadata.collectorId) || ("COL-" + Math.floor(1000 + Math.random() * 9000));
                        var collectorRecord = {
                            id: collectorId,
                            user_id: user.id,
                            name: (metadata && metadata.name) || (firstName + " " + lastName).trim(),
                            business_name: (metadata && (metadata.businessName || metadata.collectorType)) || "Certified Partner",
                            phone: phone,
                            email: email,
                            vehicle_type: (metadata && metadata.vehicleType) || "Electric Auto",
                            vehicle_number: (metadata && metadata.vehicleNumber) || "UP-16-EK-1000",
                            service_area: (metadata && metadata.serviceArea) || "Noida & Greater Noida",
                            service_radius: (metadata && metadata.serviceRadius) || 8,
                            scrap_categories: (metadata && metadata.scrapCategories) || ["Paper", "Plastic", "Metal"],
                            status: "pending_approval",
                            verification_status: "pending",
                            is_online: false
                        };
                        return client.from("collectors").insert(collectorRecord).then(function () {
                            return { success: true, user: user, collectorId: collectorId };
                        });
                    }
                    return { success: true, user: user };
                });
            }).catch(function (err) {
                return handleError("sign up", err);
            });
        },

        signIn: function (email, password) {
            var client = supabase.getClient();
            if (!client) return Promise.resolve(handleError("sign in", { message: "Supabase not configured" }));

            return client.auth.signInWithPassword({
                email: email,
                password: password
            }).then(function (result) {
                if (result.error) throw result.error;
                var authUser = result.data.user;
                var authSession = result.data.session;

                // Immediately fetch profile and cache session
                return client.from("profiles").select("*").eq("id", authUser.id).single().then(function (profRes) {
                    var profile = profRes.data ? mapKeysToCamel(profRes.data) : { role: "citizen", status: "pending_approval" };

                    var appSession = {
                        loggedIn: true,
                        user: {
                            id: authUser.id,
                            role: profile.role,
                            email: profile.email || authUser.email,
                            phone: profile.phone,
                            name: ((profile.firstName || "") + " " + (profile.lastName || "")).trim() || "User",
                            avatar: profile.avatar || "U",
                            citizenId: null,
                            collectorId: null
                        },
                        role: profile.role,
                        status: profile.status,
                        loginTime: new Date().toISOString(),
                        expiresAt: authSession && authSession.expires_at ? new Date(authSession.expires_at * 1000).toISOString() : null,
                        _supabaseSession: authSession
                    };

                    var roleQuery = Promise.resolve(appSession);
                    if (profile.role === "citizen") {
                        roleQuery = client.from("citizens").select("id").eq("user_id", authUser.id).maybeSingle().then(function (r) {
                            if (r && r.data) appSession.user.citizenId = r.data.id;
                            return appSession;
                        });
                    } else if (profile.role === "collector") {
                        roleQuery = client.from("collectors").select("id").eq("user_id", authUser.id).maybeSingle().then(function (r) {
                            if (r && r.data) appSession.user.collectorId = r.data.id;
                            return appSession;
                        });
                    }

                    return roleQuery.then(function (finalSession) {
                        if (finalSession.status === "deactivated") {
                            saveCachedSession(null);
                            return {
                                success: false,
                                error: "This account has been deactivated. Please contact support.",
                                status: "deactivated"
                            };
                        }
                        saveCachedSession(finalSession);
                        dispatchStateChange("session", "login", finalSession);
                        return {
                            success: true,
                            user: finalSession.user,
                            session: finalSession,
                            role: finalSession.role,
                            status: finalSession.status
                        };
                    });
                });
            }).catch(function (err) {
                var errResult = handleError("sign in", err);
                if (err && err.message && err.message.includes("Invalid login")) {
                    errResult.error = "Invalid email or password. Please check your credentials.";
                }
                return errResult;
            });
        },

        signOut: function () {
            return this.clearSession();
        },

        // ── Phase 4C State Machine & Admin Hardened RPCs ──
        pickupAccept: function (pickupId, collectorId) {
            return this.rpc("pickup_accept", {
                p_pickup_id: pickupId,
                p_collector_id: collectorId
            });
        },

        pickupCancel: function (pickupId, reason) {
            return this.rpc("pickup_cancel", {
                p_pickup_id: pickupId,
                p_reason: reason || "Cancelled by user"
            });
        },

        adminProcessApplication: function (entityType, entityId, action, reason) {
            return this.rpc("admin_process_application", {
                p_entity_type: entityType,
                p_entity_id: entityId,
                p_action: action,
                p_reason: reason || ""
            });
        },

        resetPassword: function (email) {
            var client = supabase.getClient();
            if (!client) return Promise.resolve({ success: false, error: "Supabase not configured" });

            var redirectUrl = typeof window !== "undefined" ? (window.location.origin + "/frontend/auth/forgot-password.html") : "";
            return client.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl }).then(function (res) {
                if (res.error) throw res.error;
                return { success: true };
            }).catch(function (err) {
                // Return neutral success even on error to prevent account enumeration
                console.warn("[SupabaseAdapter] resetPassword note:", err && err.message);
                return { success: true };
            });
        },

        updatePassword: function (newPassword) {
            var client = supabase.getClient();
            if (!client) return Promise.resolve({ success: false, error: "Supabase not configured" });

            return client.auth.updateUser({ password: newPassword }).then(function (res) {
                if (res.error) throw res.error;
                return { success: true, user: res.data.user };
            }).catch(function (err) {
                return handleError("update password", err);
            });
        },

        // ── Query helpers ──
        query: function (tableName) {
            var client = supabase.getClient();
            if (!client) return null;
            return client.from(tableName);
        },

        TABLE_MAP: TABLE_MAP
    };

    return SupabaseAdapter;
}));
