/* =========================================================
   E-KABAADI PLATFORM — NOTIFICATION & EVENT INTELLIGENCE ENGINE
   File: frontend/shared/js/notification-engine.js

   Event-Driven, Secure, Role-Isolated Architecture:
   BUSINESS EVENT → DISPATCHER → POLICY ENGINE → CHANNEL ADAPTERS
   - In-App (Primary)
   - Email / SMS / Push (Secondary / Mockable)
   - Transactional Outbox Pattern
   - Idempotency & Replay Protection
   - Strict Location & Financial Privacy
   - Zero Frontend Secrets
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_NOTIFICATION_ENGINE = factory();
        root.notificationEngine = root.EKABADI_NOTIFICATION_ENGINE;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // ── 1. Standardized Business Event Catalog ──
    const EVENT_TYPES = Object.freeze({
        // Auth / Verification
        USER_REGISTERED: "USER_REGISTERED",
        USER_PHONE_VERIFIED: "USER_PHONE_VERIFIED",
        USER_EMAIL_VERIFIED: "USER_EMAIL_VERIFIED",
        ACCOUNT_PENDING_APPROVAL: "ACCOUNT_PENDING_APPROVAL",
        ACCOUNT_APPROVED: "ACCOUNT_APPROVED",
        ACCOUNT_REJECTED: "ACCOUNT_REJECTED",
        ACCOUNT_CORRECTION_REQUIRED: "ACCOUNT_CORRECTION_REQUIRED",
        ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
        ACCOUNT_DEACTIVATED: "ACCOUNT_DEACTIVATED",

        // Pickup Lifecycle
        PICKUP_CREATED: "PICKUP_CREATED",
        PICKUP_ACCEPTED: "PICKUP_ACCEPTED",
        PICKUP_REJECTED: "PICKUP_REJECTED",
        PICKUP_ON_THE_WAY: "PICKUP_ON_THE_WAY",
        PICKUP_ARRIVED: "PICKUP_ARRIVED",
        PICKUP_COLLECTING: "PICKUP_COLLECTING",
        PICKUP_COMPLETED: "PICKUP_COMPLETED",
        PICKUP_CANCELLED: "PICKUP_CANCELLED",

        // Payment Lifecycle
        PAYMENT_CREATED: "PAYMENT_CREATED",
        PAYMENT_PENDING: "PAYMENT_PENDING",
        PAYMENT_VERIFIED: "PAYMENT_VERIFIED",
        PAYMENT_FAILED: "PAYMENT_FAILED",
        PAYMENT_SETTLED: "PAYMENT_SETTLED",
        PAYMENT_REFUNDED: "PAYMENT_REFUNDED",
        PAYMENT_RECONCILIATION_REQUIRED: "PAYMENT_RECONCILIATION_REQUIRED",

        // Rewards
        REWARD_CREDITED: "REWARD_CREDITED",

        // Support / Disputes
        ISSUE_CREATED: "ISSUE_CREATED",
        ISSUE_UPDATED: "ISSUE_UPDATED",
        ISSUE_RESOLVED: "ISSUE_RESOLVED",

        // Fleet / Operations
        COLLECTOR_AVAILABILITY_CHANGED: "COLLECTOR_AVAILABILITY_CHANGED",
        COLLECTOR_LOCATION_ACTIVE: "COLLECTOR_LOCATION_ACTIVE",
        COLLECTOR_LOCATION_STALE: "COLLECTOR_LOCATION_STALE",
        COLLECTOR_LOCATION_UNAVAILABLE: "COLLECTOR_LOCATION_UNAVAILABLE",
        ETA_UPDATED: "ETA_UPDATED",
        ROUTE_DEVIATION_DETECTED: "ROUTE_DEVIATION_DETECTED",
        COLLECTOR_NEAR_DESTINATION: "COLLECTOR_NEAR_DESTINATION",
        ROUTING_PROVIDER_FAILURE: "ROUTING_PROVIDER_FAILURE",
        SYSTEM_ALERT: "SYSTEM_ALERT"
    });

    // ── 2. Priorities & Channels ──
    const PRIORITIES = Object.freeze({
        LOW: "low",
        NORMAL: "normal",
        HIGH: "high",
        CRITICAL: "critical"
    });

    const CHANNELS = Object.freeze({
        IN_APP: "in_app",
        EMAIL: "email",
        SMS: "sms",
        PUSH: "push"
    });

    // ── 3. Security & Privacy Sanitization Helpers ──
    function escapeHtml(str) {
        if (str === null || str === undefined) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // Mask specific street/flat numbers, showing only neighborhood/locality
    function sanitizeLocationForNotification(addressOrLocality) {
        if (!addressOrLocality) return "your locality";
        var str = String(addressOrLocality).trim();
        // If locality contains Sector or Area or City
        var localityMatch = str.match(/(Sector\s*\d+|Block\s*[A-Za-z0-9]+|Phase\s*\d+|[A-Za-z\s]+(?:Noida|Delhi|Gurgaon|Ghaziabad|Faridabad|Indirapuram|Vaishali))/i);
        if (localityMatch && localityMatch[0]) {
            return localityMatch[0].trim();
        }
        // Fallback: strip numbers and apartment prefixes
        var cleaned = str.replace(/^(Flat|House|Plot|Tower|Villa|Room|Unit)\s*[^,]+,\s*/i, "");
        var parts = cleaned.split(",");
        if (parts.length > 1) {
            return parts[parts.length - 2].trim() + ", " + parts[parts.length - 1].trim();
        }
        return parts[0].trim();
    }

    // Safe monetary formatting
    function formatSafePayout(amount) {
        var num = Number(amount);
        if (isNaN(num)) return "₹0.00";
        return "₹" + num.toFixed(2);
    }

    // Generate unique idempotency key for events
    function generateIdempotencyKey(eventType, entityId, recipientId, extra) {
        return ["idmp", eventType, entityId || "gen", recipientId || "all", extra || ""].filter(Boolean).join(":");
    }

    // Safe internal deep link validator (prevents open redirects)
    function sanitizeActionUrl(url) {
        if (!url) return "";
        var cleanUrl = String(url).trim();
        // Only allow relative internal routes
        if (/^(https?:|\/\/|javascript:|data:)/i.test(cleanUrl)) {
            return "";
        }
        return cleanUrl;
    }

    // ── 4. Centralized Notification Templates ──
    const TEMPLATES = {
        [EVENT_TYPES.PICKUP_CREATED]: {
            citizen: {
                title: "Pickup Request Scheduled",
                body: "Your pickup #{{pickupId}} has been booked with {{collectorName}} for {{scheduledDate}}.",
                type: "pickup",
                priority: PRIORITIES.NORMAL,
                actionUrl: "tracking.html"
            },
            collector: {
                title: "New Pickup Request! 🚛",
                body: "New pickup request in {{locality}} ({{scrapType}}, ~{{weight}} kg).",
                type: "pickup",
                priority: PRIORITIES.HIGH,
                actionUrl: "requests.html"
            },
            admin: {
                title: "Pickup Order Placed",
                body: "Citizen {{citizenName}} booked pickup #{{pickupId}} with {{collectorName}}.",
                type: "pickup",
                priority: PRIORITIES.LOW,
                actionUrl: "pickups.html"
            }
        },

        [EVENT_TYPES.PICKUP_ACCEPTED]: {
            citizen: {
                title: "Collector Accepted Request! 🚛",
                body: "{{collectorName}} confirmed your pickup slot for {{scheduledDate}}.",
                type: "pickup",
                priority: PRIORITIES.NORMAL,
                actionUrl: "tracking.html"
            }
        },

        [EVENT_TYPES.PICKUP_REJECTED]: {
            citizen: {
                title: "Collector Declined Pickup",
                body: "Your selected collector is currently unavailable. You may choose another certified partner.",
                type: "pickup",
                priority: PRIORITIES.HIGH,
                actionUrl: "collectors.html"
            }
        },

        [EVENT_TYPES.PICKUP_ON_THE_WAY]: {
            citizen: {
                title: "Collector is En Route! 📍",
                body: "{{collectorName}} is heading towards {{locality}}.",
                type: "pickup",
                priority: PRIORITIES.NORMAL,
                actionUrl: "tracking.html"
            }
        },

        [EVENT_TYPES.PICKUP_ARRIVED]: {
            citizen: {
                title: "Collector Has Arrived! 🔔",
                body: "{{collectorName}} has reached your doorstep with digital scale.",
                type: "pickup",
                priority: PRIORITIES.HIGH,
                actionUrl: "tracking.html"
            }
        },

        [EVENT_TYPES.PICKUP_COLLECTING]: {
            citizen: {
                title: "Weighing In Progress ⚖️",
                body: "Certified digital scale measurement is underway.",
                type: "pickup",
                priority: PRIORITIES.NORMAL,
                actionUrl: "tracking.html"
            }
        },

        [EVENT_TYPES.PICKUP_COMPLETED]: {
            citizen: {
                title: "Collection Completed! ✅",
                body: "Final certified weight: {{finalWeight}} kg. Payout calculation ready.",
                type: "pickup",
                priority: PRIORITIES.HIGH,
                actionUrl: "payments.html"
            }
        },

        [EVENT_TYPES.PICKUP_CANCELLED]: {
            citizen: {
                title: "Pickup Cancelled",
                body: "Pickup #{{pickupId}} has been cancelled. Reason: {{reason}}.",
                type: "pickup",
                priority: PRIORITIES.NORMAL,
                actionUrl: "history.html"
            },
            collector: {
                title: "Pickup #{{pickupId}} Cancelled",
                body: "Pickup in {{locality}} was cancelled by the citizen. Reason: {{reason}}.",
                type: "pickup",
                priority: PRIORITIES.HIGH,
                actionUrl: "requests.html"
            }
        },

        [EVENT_TYPES.PAYMENT_SETTLED]: {
            citizen: {
                title: "Payout Credited! 💰",
                body: "Your payout of {{amount}} for pickup #{{pickupId}} has been settled.",
                type: "payment",
                priority: PRIORITIES.HIGH,
                actionUrl: "payments.html"
            },
            collector: {
                title: "Pickup Settlement Completed",
                body: "Payment settled for pickup #{{pickupId}} ({{amount}}).",
                type: "payment",
                priority: PRIORITIES.NORMAL,
                actionUrl: "earnings.html"
            }
        },

        [EVENT_TYPES.PAYMENT_FAILED]: {
            citizen: {
                title: "Payment Processing Notice ⚠️",
                body: "Payment settlement for pickup #{{pickupId}} encountered an issue. You can retry securely.",
                type: "payment",
                priority: PRIORITIES.HIGH,
                actionUrl: "payments.html"
            },
            admin: {
                title: "Payment Settlement Alert ⚠️",
                body: "Payment attempt failed for pickup #{{pickupId}}. Reason: {{reason}}.",
                type: "payment",
                priority: PRIORITIES.HIGH,
                actionUrl: "payments.html"
            }
        },

        [EVENT_TYPES.PAYMENT_REFUNDED]: {
            citizen: {
                title: "Payment Refund Processed",
                body: "Refund of {{amount}} processed for pickup #{{pickupId}}. Adjustment recorded.",
                type: "payment",
                priority: PRIORITIES.HIGH,
                actionUrl: "payments.html"
            }
        },

        [EVENT_TYPES.PAYMENT_RECONCILIATION_REQUIRED]: {
            admin: {
                title: "Payment Reconciliation Required ⚠️",
                body: "Payment #{{paymentId}} requires manual administrative reconciliation.",
                type: "payment",
                priority: PRIORITIES.CRITICAL,
                actionUrl: "payments.html"
            }
        },

        [EVENT_TYPES.REWARD_CREDITED]: {
            citizen: {
                title: "+{{coins}} Eco Coins Credited! 🪙",
                body: "{{coins}} Eco Coins have been added to your green wallet.",
                type: "reward",
                priority: PRIORITIES.NORMAL,
                actionUrl: "rewards.html"
            }
        },

        [EVENT_TYPES.ACCOUNT_APPROVED]: {
            citizen: {
                title: "Citizen Account Approved! 🎉",
                body: "Your identity verification is complete. You can now schedule waste pickups.",
                type: "verification",
                priority: PRIORITIES.HIGH,
                actionUrl: "dashboard.html"
            },
            collector: {
                title: "Collector Partner Approved! 🎉",
                body: "Your vehicle & scale verification has been approved. You are ready to receive dispatch requests.",
                type: "verification",
                priority: PRIORITIES.HIGH,
                actionUrl: "dashboard.html"
            }
        },

        [EVENT_TYPES.ACCOUNT_REJECTED]: {
            citizen: {
                title: "Account Verification Update ℹ️",
                body: "Your registration could not be approved. Reason: {{reason}}.",
                type: "verification",
                priority: PRIORITIES.HIGH,
                actionUrl: "profile.html"
            },
            collector: {
                title: "Partner Verification Update ℹ️",
                body: "Your application requires correction. Reason: {{reason}}.",
                type: "verification",
                priority: PRIORITIES.HIGH,
                actionUrl: "profile.html"
            }
        },

        [EVENT_TYPES.ISSUE_CREATED]: {
            admin: {
                title: "New Support Ticket: {{issueTitle}}",
                body: "Ticket #{{issueId}} submitted by {{raisedBy}} (Priority: {{priority}}).",
                type: "issue",
                priority: PRIORITIES.HIGH,
                actionUrl: "issues.html"
            },
            citizen: {
                title: "Support Ticket Registered",
                body: "Your ticket #{{issueId}} has been received. Our team will review shortly.",
                type: "issue",
                priority: PRIORITIES.NORMAL,
                actionUrl: "support.html"
            }
        },

        [EVENT_TYPES.ISSUE_RESOLVED]: {
            citizen: {
                title: "Support Ticket Resolved ✅",
                body: "Your ticket #{{issueId}} has been marked resolved: {{resolution}}.",
                type: "issue",
                priority: PRIORITIES.NORMAL,
                actionUrl: "support.html"
            }
        },

        [EVENT_TYPES.COLLECTOR_NEAR_DESTINATION]: {
            citizen: {
                title: "Collector Approaching Doorstep! 📍",
                body: "{{collectorName}} is within 150m of your location. Please ensure scrap is accessible.",
                type: "pickup",
                priority: PRIORITIES.HIGH,
                actionUrl: "tracking.html"
            }
        },

        [EVENT_TYPES.ROUTE_DEVIATION_DETECTED]: {
            admin: {
                title: "Fleet Route Deviation Alert",
                body: "Collector {{collectorName}} on pickup #{{pickupId}} reported an unexpected route deviation.",
                type: "fleet",
                priority: PRIORITIES.NORMAL,
                actionUrl: "collectors.html"
            }
        },

        [EVENT_TYPES.ROUTING_PROVIDER_FAILURE]: {
            admin: {
                title: "Routing Service Warning",
                body: "External routing provider failure reported: {{error}}.",
                type: "system",
                priority: PRIORITIES.HIGH,
                actionUrl: "settings.html"
            }
        }
    };

    function renderTemplate(templateStr, params) {
        if (!templateStr) return "";
        return templateStr.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, function (_, key) {
            return escapeHtml(params[key] !== undefined ? params[key] : "");
        });
    }

    // ── 5. Notification Policy Engine ──
    const policyEngine = {
        // Resolve target recipients based on business event
        resolveRecipients(event) {
            var recipients = [];
            var payload = event.payload || event.metadata || {};

            switch (event.eventType) {
                case EVENT_TYPES.PICKUP_CREATED:
                    // Citizen confirmation
                    if (event.recipientId || payload.citizenId) {
                        recipients.push({
                            userId: event.recipientId || payload.citizenId,
                            role: "citizen",
                            targetRole: "citizen",
                            priority: PRIORITIES.NORMAL
                        });
                    }
                    // SELECTED COLLECTOR ONLY (Do NOT broadcast to all collectors)
                    if (payload.selectedCollectorId) {
                        recipients.push({
                            userId: payload.selectedCollectorId,
                            role: "collector",
                            targetRole: "collector",
                            priority: PRIORITIES.HIGH
                        });
                    }
                    break;

                case EVENT_TYPES.PICKUP_ACCEPTED:
                case EVENT_TYPES.PICKUP_REJECTED:
                case EVENT_TYPES.PICKUP_ON_THE_WAY:
                case EVENT_TYPES.PICKUP_ARRIVED:
                case EVENT_TYPES.PICKUP_COLLECTING:
                case EVENT_TYPES.PICKUP_COMPLETED:
                    if (event.recipientId || payload.citizenId) {
                        recipients.push({
                            userId: event.recipientId || payload.citizenId,
                            role: "citizen",
                            targetRole: "citizen",
                            priority: PRIORITIES.NORMAL
                        });
                    }
                    break;

                case EVENT_TYPES.PICKUP_CANCELLED:
                    if (event.recipientId || payload.citizenId) {
                        recipients.push({
                            userId: event.recipientId || payload.citizenId,
                            role: "citizen",
                            targetRole: "citizen",
                            priority: PRIORITIES.NORMAL
                        });
                    }
                    if (payload.selectedCollectorId || payload.collectorId) {
                        recipients.push({
                            userId: payload.selectedCollectorId || payload.collectorId,
                            role: "collector",
                            targetRole: "collector",
                            priority: PRIORITIES.HIGH
                        });
                    }
                    break;

                case EVENT_TYPES.PAYMENT_SETTLED:
                    if (event.recipientId || payload.citizenId) {
                        recipients.push({
                            userId: event.recipientId || payload.citizenId,
                            role: "citizen",
                            targetRole: "citizen",
                            priority: PRIORITIES.HIGH
                        });
                    }
                    if (payload.collectorId) {
                        recipients.push({
                            userId: payload.collectorId,
                            role: "collector",
                            targetRole: "collector",
                            priority: PRIORITIES.NORMAL
                        });
                    }
                    break;

                case EVENT_TYPES.PAYMENT_FAILED:
                    if (event.recipientId || payload.citizenId) {
                        recipients.push({
                            userId: event.recipientId || payload.citizenId,
                            role: "citizen",
                            targetRole: "citizen",
                            priority: PRIORITIES.HIGH
                        });
                    }
                    recipients.push({
                        userId: "USR-ADMIN-001",
                        role: "admin",
                        targetRole: "admin",
                        priority: PRIORITIES.HIGH
                    });
                    break;

                case EVENT_TYPES.PAYMENT_REFUNDED:
                    if (event.recipientId || payload.citizenId) {
                        recipients.push({
                            userId: event.recipientId || payload.citizenId,
                            role: "citizen",
                            targetRole: "citizen",
                            priority: PRIORITIES.HIGH
                        });
                    }
                    break;

                case EVENT_TYPES.PAYMENT_RECONCILIATION_REQUIRED:
                    recipients.push({
                        userId: "USR-ADMIN-001",
                        role: "admin",
                        targetRole: "admin",
                        priority: PRIORITIES.CRITICAL
                    });
                    break;

                case EVENT_TYPES.REWARD_CREDITED:
                    if (event.recipientId || payload.citizenId) {
                        recipients.push({
                            userId: event.recipientId || payload.citizenId,
                            role: "citizen",
                            targetRole: "citizen",
                            priority: PRIORITIES.NORMAL
                        });
                    }
                    break;

                case EVENT_TYPES.ACCOUNT_APPROVED:
                case EVENT_TYPES.ACCOUNT_REJECTED:
                    if (event.recipientId || payload.userId) {
                        recipients.push({
                            userId: event.recipientId || payload.userId,
                            role: payload.role || "citizen",
                            targetRole: payload.role || "citizen",
                            priority: PRIORITIES.HIGH
                        });
                    }
                    break;

                case EVENT_TYPES.ISSUE_CREATED:
                    recipients.push({
                        userId: "USR-ADMIN-001",
                        role: "admin",
                        targetRole: "admin",
                        priority: PRIORITIES.HIGH
                    });
                    if (payload.userId || payload.citizenId) {
                        recipients.push({
                            userId: payload.userId || payload.citizenId,
                            role: "citizen",
                            targetRole: "citizen",
                            priority: PRIORITIES.NORMAL
                        });
                    }
                    break;

                case EVENT_TYPES.ISSUE_RESOLVED:
                    if (payload.userId || payload.citizenId) {
                        recipients.push({
                            userId: payload.userId || payload.citizenId,
                            role: "citizen",
                            targetRole: "citizen",
                            priority: PRIORITIES.NORMAL
                        });
                    }
                    break;

                case EVENT_TYPES.COLLECTOR_NEAR_DESTINATION:
                    if (event.recipientId || payload.citizenId) {
                        recipients.push({
                            userId: event.recipientId || payload.citizenId,
                            role: "citizen",
                            targetRole: "citizen",
                            priority: PRIORITIES.HIGH
                        });
                    }
                    break;

                case EVENT_TYPES.ROUTE_DEVIATION_DETECTED:
                case EVENT_TYPES.ROUTING_PROVIDER_FAILURE:
                    recipients.push({
                        userId: "USR-ADMIN-001",
                        role: "admin",
                        targetRole: "admin",
                        priority: PRIORITIES.HIGH
                    });
                    break;

                default:
                    if (event.recipientId) {
                        recipients.push({
                            userId: event.recipientId,
                            role: event.actorRole || "citizen",
                            targetRole: event.actorRole || "citizen",
                            priority: PRIORITIES.NORMAL
                        });
                    }
            }

            return recipients;
        },

        // Check if event is transactional (cannot be opted-out)
        isTransactional(eventType) {
            return eventType !== "MARKETING_PROMOTION" && eventType !== "WEEKLY_TIP";
        },

        // Check quiet hours
        isInQuietHours(preferences, date = new Date()) {
            if (!preferences || !preferences.quietHoursEnabled) return false;
            var currentHour = date.getHours();
            var currentMin = date.getMinutes();
            var curTotal = currentHour * 60 + currentMin;

            var startParts = (preferences.quietHoursStart || "22:00").split(":");
            var endParts = (preferences.quietHoursEnd || "07:00").split(":");
            var startTotal = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1] || 0, 10);
            var endTotal = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1] || 0, 10);

            if (startTotal > endTotal) {
                // Overnight quiet hours, e.g. 22:00 to 07:00
                return curTotal >= startTotal || curTotal < endTotal;
            }
            return curTotal >= startTotal && curTotal < endTotal;
        }
    };

    // ── 6. Deterministic Mock Channel Providers ──
    class MockEmailProvider {
        constructor() {
            this.mode = "SUCCESS";
            this.sentEmails = [];
        }
        setMode(mode) { this.mode = mode; }
        async send(emailData) {
            if (this.mode === "FAILURE") {
                return { success: false, channel: "email", error: "Simulated SMTP gateway failure", queued: false };
            }
            if (this.mode === "TIMEOUT") {
                return { success: false, channel: "email", error: "SMTP gateway timeout (504)", queued: false };
            }
            const record = {
                id: "msg_email_" + Math.random().toString(36).slice(2, 9),
                recipient: emailData.to || emailData.recipient,
                subject: emailData.subject,
                body: emailData.body,
                status: "sent",
                timestamp: new Date().toISOString()
            };
            this.sentEmails.push(record);
            return { success: true, channel: "email", provider: "mock", messageId: record.id, status: "sent" };
        }
    }

    class MockSmsProvider {
        constructor() {
            this.mode = "SUCCESS";
            this.sentSms = [];
        }
        setMode(mode) { this.mode = mode; }
        async send(smsData) {
            if (this.mode === "FAILURE") {
                return { success: false, channel: "sms", error: "Simulated Telecom carrier failure", queued: false };
            }
            if (this.mode === "TIMEOUT") {
                return { success: false, channel: "sms", error: "SMS carrier connection timeout", queued: false };
            }
            const record = {
                id: "msg_sms_" + Math.random().toString(36).slice(2, 9),
                phoneNumber: smsData.phoneNumber,
                text: smsData.text || smsData.message,
                status: "sent",
                timestamp: new Date().toISOString()
            };
            this.sentSms.push(record);
            return { success: true, channel: "sms", provider: "mock", messageId: record.id, status: "sent" };
        }
    }

    class MockPushProvider {
        constructor() {
            this.mode = "SUCCESS";
            this.sentPush = [];
        }
        setMode(mode) { this.mode = mode; }
        async send(pushData) {
            if (this.mode === "FAILURE") {
                return { success: false, channel: "push", error: "Simulated Push notification service failure", queued: false };
            }
            if (this.mode === "TIMEOUT") {
                return { success: false, channel: "push", error: "FCM / APNs gateway timeout", queued: false };
            }
            const record = {
                id: "msg_push_" + Math.random().toString(36).slice(2, 9),
                userId: pushData.userId,
                title: pushData.title,
                body: pushData.body,
                status: "sent",
                timestamp: new Date().toISOString()
            };
            this.sentPush.push(record);
            return { success: true, channel: "push", provider: "mock", messageId: record.id, status: "sent" };
        }
    }

    // Singletons
    const mockEmail = new MockEmailProvider();
    const mockSms = new MockSmsProvider();
    const mockPush = new MockPushProvider();

    // ── 7. Notification Engine Controller ──
    const notificationEngine = {
        EVENT_TYPES,
        PRIORITIES,
        CHANNELS,
        mockEmail,
        mockSms,
        mockPush,
        policyEngine,

        escapeHtml,
        sanitizeLocationForNotification,
        formatSafePayout,
        generateIdempotencyKey,
        sanitizeActionUrl,

        // Create normalized event object
        createBusinessEvent(eventType, aggregateType, aggregateId, payload = {}, actorId = "system", actorRole = "system") {
            if (!EVENT_TYPES[eventType]) {
                throw new Error("Invalid business event type: " + eventType);
            }
            return {
                id: "EVT-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
                eventType,
                aggregateType,
                aggregateId,
                actorId,
                actorRole,
                payload: { ...payload },
                createdAt: new Date().toISOString()
            };
        },

        // Build notification object from event & recipient
        buildNotification(event, recipientConfig) {
            var eventType = event.eventType;
            var targetRole = recipientConfig.targetRole || recipientConfig.role || "citizen";
            var eventTemplates = TEMPLATES[eventType] || {};
            var template = eventTemplates[targetRole] || eventTemplates.citizen || {
                title: "System Update",
                body: "You have a new update regarding " + (event.aggregateType || "your account") + ".",
                type: "info",
                priority: PRIORITIES.NORMAL,
                actionUrl: ""
            };

            var params = { ...event.payload };
            // Auto sanitize location
            if (params.pickupAddress || params.address || params.locality) {
                params.locality = sanitizeLocationForNotification(params.locality || params.pickupAddress || params.address);
            }
            // Auto format payout
            if (params.amount !== undefined) {
                params.amount = formatSafePayout(params.amount);
            }

            var title = renderTemplate(template.title, params);
            var message = renderTemplate(template.body, params);
            var actionUrl = sanitizeActionUrl(template.actionUrl);
            var idempotencyKey = generateIdempotencyKey(eventType, event.aggregateId, recipientConfig.userId);

            return {
                id: "NOTIF-" + Math.floor(Math.random() * 900000 + 100000),
                userId: recipientConfig.userId,
                role: targetRole,
                type: template.type || "pickup",
                eventType,
                entityType: event.aggregateType,
                entityId: event.aggregateId,
                pickupId: params.pickupId || (event.aggregateType === "pickups" ? event.aggregateId : ""),
                title,
                message,
                read: false,
                priority: recipientConfig.priority || template.priority || PRIORITIES.NORMAL,
                channel: CHANNELS.IN_APP,
                status: "unread",
                actionUrl,
                idempotencyKey,
                metadata: {
                    aggregateType: event.aggregateType,
                    aggregateId: event.aggregateId,
                    eventType
                },
                createdAt: new Date().toISOString()
            };
        },

        // Dispatch an event through policies to in-app & channels
        async dispatchEvent(event, storageService, externalChannels = false) {
            if (!event || !event.eventType) {
                throw new Error("Cannot dispatch invalid event.");
            }

            const recipients = policyEngine.resolveRecipients(event);
            const notificationsCreated = [];
            const channelDispatches = [];

            for (const recipient of recipients) {
                const notif = this.buildNotification(event, recipient);

                // Deduplication check: verify idempotencyKey doesn't already exist
                if (storageService) {
                    const existing = storageService.getCollection("notifications").find(n => n.idempotencyKey === notif.idempotencyKey);
                    if (existing) {
                        notificationsCreated.push({ ...existing, duplicate: true });
                        continue;
                    }

                    // Insert authoritative in-app notification
                    storageService.insert("notifications", notif);
                    notificationsCreated.push(notif);
                }

                // If external channels enabled (e.g. email / SMS / push)
                if (externalChannels) {
                    // Email
                    const emailPromise = mockEmail.send({
                        to: recipient.userId + "@demo.ekabadi",
                        subject: notif.title,
                        body: notif.message
                    });
                    channelDispatches.push(emailPromise);

                    // SMS for high/critical pickup and payment alerts
                    if (notif.priority === PRIORITIES.HIGH || notif.priority === PRIORITIES.CRITICAL) {
                        const smsPromise = mockSms.send({
                            phoneNumber: "+919876543210",
                            message: notif.title + ": " + notif.message
                        });
                        channelDispatches.push(smsPromise);
                    }
                }
            }

            if (channelDispatches.length > 0) {
                await Promise.allSettled(channelDispatches);
            }

            return {
                eventId: event.id,
                eventType: event.eventType,
                notificationsCreated
            };
        },

        resolveRecipients(event) {
            return policyEngine.resolveRecipients(event);
        }
    };

    return notificationEngine;
}));
