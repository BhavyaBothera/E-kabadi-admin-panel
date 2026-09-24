/* =========================================================
   E-KABAADI PLATFORM — PAYMENT PROVIDER ABSTRACTION
   Phase 4F: Real Payment Infrastructure, Settlement & Financial Ledger
   File: frontend/shared/js/payment-provider.js
   
   Provider Architecture:
   - IPaymentProvider Interface Contract
   - MockPaymentProvider: Deterministic offline engine for tests & demo
   - RazorpayPaymentProvider: Production gateway calling secure Edge Functions
   - Key Principle: Zero Razorpay secrets in frontend (Server-Side verification)
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_PAYMENT_PROVIDER = factory();
        root.MockPaymentProvider = root.EKABADI_PAYMENT_PROVIDER.MockPaymentProvider;
        root.RazorpayPaymentProvider = root.EKABADI_PAYMENT_PROVIDER.RazorpayPaymentProvider;
        root.getPaymentProvider = root.EKABADI_PAYMENT_PROVIDER.getPaymentProvider;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // ─────────────────────────────────────────────
    // 1. MONEY & CURRENCY UTILITIES (INR / PAISE)
    // ─────────────────────────────────────────────

    /**
     * Converts Rupee decimal amount to integer Paise (smallest unit).
     * Prevents floating-point drift (e.g. ₹172.20 -> 17220 paise).
     */
    function toPaise(rupees) {
        var num = Number(rupees);
        if (isNaN(num) || !isFinite(num) || num < 0) return 0;
        return Math.round(num * 100);
    }

    /**
     * Converts integer Paise back to standard Rupee decimal.
     */
    function toRupees(paise) {
        var num = Number(paise);
        if (isNaN(num) || !isFinite(num) || num < 0) return 0;
        return +(num / 100).toFixed(2);
    }

    /**
     * Computes authoritative final payout from verified scale weight and catalog rate.
     */
    function calculateAuthoritativeAmount(finalWeightKg, ratePerKg) {
        var weight = Number(finalWeightKg);
        var rate = Number(ratePerKg);
        if (isNaN(weight) || weight <= 0 || isNaN(rate) || rate <= 0) {
            return { valid: false, error: "Invalid weight or rate" };
        }
        var totalRupees = +(weight * rate).toFixed(2);
        var totalPaise = Math.round(totalRupees * 100);
        return {
            valid: true,
            finalWeightKg: weight,
            ratePerKg: rate,
            amount: totalRupees,
            amountPaise: totalPaise,
            formatted: "₹" + totalRupees.toFixed(2)
        };
    }

    // ─────────────────────────────────────────────
    // 2. MOCK PAYMENT PROVIDER (DETERMINISTIC OFFLINE)
    // ─────────────────────────────────────────────

    function MockPaymentProvider(options) {
        this.name = "mock";
        this.options = Object.assign({
            scenario: "SUCCESS", // SUCCESS, FAILURE, TIMEOUT, DUPLICATE, ALREADY_PAID
            simulateLatencyMs: 0
        }, options || {});
        this.activeOrders = {};
        this.processedPayments = {};
    }

    MockPaymentProvider.prototype.setScenario = function (scenario) {
        this.options.scenario = scenario;
    };

    MockPaymentProvider.prototype.createOrder = function (params) {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (!params || !params.pickupId) {
                return reject(new Error("Missing pickupId for order creation."));
            }

            if (self.options.scenario === "ALREADY_PAID") {
                return reject(new Error("Pickup has already been paid and settled."));
            }

            if (self.options.scenario === "TIMEOUT") {
                return reject(new Error("Payment provider gateway timeout. Please retry."));
            }

            var amount = Number(params.amount) || 0;
            var paise = toPaise(amount);
            var orderId = "order_mock_" + params.pickupId.replace(/[^a-zA-Z0-9]/g, "") + "_" + Math.floor(1000 + Math.random() * 9000);

            var order = {
                orderId: orderId,
                pickupId: params.pickupId,
                amount: amount,
                amountPaise: paise,
                currency: params.currency || "INR",
                status: "created",
                provider: "mock",
                keyId: "rzp_test_mock_public_key",
                createdAt: new Date().toISOString()
            };

            self.activeOrders[orderId] = order;
            resolve(order);
        });
    };

    MockPaymentProvider.prototype.verifyPayment = function (params) {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (!params || !params.orderId || !params.paymentId) {
                return reject(new Error("Incomplete payment verification payload."));
            }

            if (self.options.scenario === "FAILURE") {
                return reject(new Error("Payment failed at bank / UPI gateway."));
            }

            // Expected signature format for mock verification: mock_sig_<orderId>_<paymentId>
            var expectedSignature = "mock_sig_" + params.orderId + "_" + params.paymentId;
            if (params.signature && params.signature !== expectedSignature) {
                return reject(new Error("Payment signature verification failed. Forged or mismatched signature."));
            }

            var paymentRecord = {
                verified: true,
                settled: true,
                orderId: params.orderId,
                paymentId: params.paymentId,
                signature: params.signature || expectedSignature,
                provider: "mock",
                verifiedAt: new Date().toISOString()
            };

            self.processedPayments[params.paymentId] = paymentRecord;
            resolve(paymentRecord);
        });
    };

    MockPaymentProvider.prototype.refundPayment = function (paymentId, options) {
        return new Promise(function (resolve, reject) {
            if (!paymentId) return reject(new Error("Missing paymentId for refund."));
            var refundId = "rfnd_mock_" + Math.floor(100000 + Math.random() * 900000);
            resolve({
                success: true,
                refundId: refundId,
                paymentId: paymentId,
                status: "processed",
                amount: (options && options.amount) || null,
                processedAt: new Date().toISOString()
            });
        });
    };

    MockPaymentProvider.prototype.handleWebhook = function (payload, signature) {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (!payload || !payload.event) {
                return reject(new Error("Invalid webhook payload."));
            }
            if (signature && signature === "invalid_sig") {
                return reject(new Error("Webhook signature validation failed."));
            }

            var eventId = payload.id || ("evt_mock_" + Math.floor(1000 + Math.random() * 9000));
            resolve({
                acknowledged: true,
                duplicate: false,
                eventId: eventId,
                event: payload.event,
                processedAt: new Date().toISOString()
            });
        });
    };

    MockPaymentProvider.prototype.getPaymentStatus = function (paymentId) {
        var rec = this.processedPayments[paymentId];
        return Promise.resolve(rec ? "settled" : "not_found");
    };

    // ─────────────────────────────────────────────
    // 3. REAL RAZORPAY PAYMENT PROVIDER (BACKEND BOUNDARY)
    // ─────────────────────────────────────────────

    function RazorpayPaymentProvider(config) {
        this.name = "razorpay";
        this.config = config || {};
        this.publicKey = this.config.RAZORPAY_KEY_ID || "";
        this.supabaseClient = (typeof window !== "undefined" && window.EKABADI_SUPABASE) ? window.EKABADI_SUPABASE : null;
    }

    /**
     * Calls Supabase Edge Function 'create-payment-order'.
     * The Edge Function calculates authoritative amount and calls Razorpay API server-side.
     */
    RazorpayPaymentProvider.prototype.createOrder = function (params) {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (!self.publicKey) {
                // Return clear configuration state rather than pretending live payment worked
                return reject(new Error("Razorpay provider is not configured. Missing public key."));
            }

            var client = self.supabaseClient ? self.supabaseClient.getClient() : null;
            if (!client || !client.functions) {
                return reject(new Error("Supabase backend client unavailable for secure order creation."));
            }

            client.functions.invoke("create-payment-order", {
                body: { pickupId: params.pickupId }
            }).then(function (res) {
                if (res.error) throw res.error;
                var data = res.data;
                if (!data || !data.orderId) throw new Error("Invalid response from payment order service.");
                resolve({
                    orderId: data.orderId,
                    pickupId: params.pickupId,
                    amount: data.amount,
                    amountPaise: data.amountPaise,
                    currency: data.currency || "INR",
                    keyId: self.publicKey,
                    status: "order_created"
                });
            }).catch(function (err) {
                reject(err);
            });
        });
    };

    /**
     * Calls Supabase Edge Function 'verify-payment'.
     * The Edge Function verifies Razorpay HMAC-SHA256 signature server-side.
     */
    RazorpayPaymentProvider.prototype.verifyPayment = function (params) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var client = self.supabaseClient ? self.supabaseClient.getClient() : null;
            if (!client || !client.functions) {
                return reject(new Error("Supabase backend client unavailable for payment verification."));
            }

            client.functions.invoke("verify-payment", {
                body: {
                    pickupId: params.pickupId,
                    orderId: params.orderId,
                    paymentId: params.paymentId,
                    signature: params.signature
                }
            }).then(function (res) {
                if (res.error) throw res.error;
                var data = res.data;
                if (!data || !data.verified) {
                    throw new Error((data && data.error) || "Payment signature verification failed.");
                }
                resolve(data);
            }).catch(function (err) {
                reject(err);
            });
        });
    };

    /**
     * Opens Razorpay Checkout modal if loaded in browser.
     */
    RazorpayPaymentProvider.prototype.openCheckout = function (orderData, userCallbacks) {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (typeof window === "undefined" || !window.Razorpay) {
                return reject(new Error("Razorpay Checkout SDK not loaded in browser."));
            }

            var options = {
                key: self.publicKey,
                amount: orderData.amountPaise,
                currency: orderData.currency || "INR",
                name: "E-Kabaadi Waste Management",
                description: "Certified Scrap Payout / Settlement",
                order_id: orderData.orderId,
                prefill: {
                    name: (userCallbacks && userCallbacks.citizenName) || "",
                    email: (userCallbacks && userCallbacks.citizenEmail) || "",
                    contact: (userCallbacks && userCallbacks.citizenPhone) || ""
                },
                theme: {
                    color: "#1F6F43" // Eco Forest brand primary
                },
                handler: function (response) {
                    // Send received provider response to backend verification
                    self.verifyPayment({
                        pickupId: orderData.pickupId,
                        orderId: response.razorpay_order_id,
                        paymentId: response.razorpay_payment_id,
                        signature: response.razorpay_signature
                    }).then(resolve).catch(reject);
                },
                modal: {
                    ondismiss: function () {
                        reject(new Error("Payment cancelled by user. Pickup remains ready for retry."));
                    }
                }
            };

            var rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (resp) {
                reject(new Error((resp && resp.error && resp.error.description) || "Payment failed at gateway."));
            });
            rzp.open();
        });
    };

    RazorpayPaymentProvider.prototype.refundPayment = function (paymentId, options) {
        var self = this;
        var client = self.supabaseClient ? self.supabaseClient.getClient() : null;
        if (!client || !client.functions) {
            return Promise.reject(new Error("Supabase backend client unavailable for refund processing."));
        }
        return client.functions.invoke("reconcile-payment", {
            body: { action: "refund", paymentId: paymentId, amount: options && options.amount }
        }).then(function (res) {
            if (res.error) throw res.error;
            return res.data;
        });
    };

    RazorpayPaymentProvider.prototype.handleWebhook = function () {
        return Promise.reject(new Error("Webhooks must be delivered directly to the secure backend endpoint."));
    };

    RazorpayPaymentProvider.prototype.getPaymentStatus = function (paymentId) {
        var self = this;
        var client = self.supabaseClient ? self.supabaseClient.getClient() : null;
        if (!client) return Promise.resolve("unknown");
        return client.from("payments").select("status").eq("id", paymentId).single().then(function (res) {
            return (res.data && res.data.status) || "not_found";
        });
    };

    // ─────────────────────────────────────────────
    // 4. PROVIDER FACTORY & REGISTRATION
    // ─────────────────────────────────────────────

    function getPaymentProvider(mode, options) {
        var envMode = mode;
        if (!envMode) {
            if (typeof window !== "undefined" && window.__EKABADI_CONFIG__) {
                envMode = window.__EKABADI_CONFIG__.DATA_MODE || "mock";
            } else {
                envMode = "mock";
            }
        }

        if (envMode === "supabase") {
            var config = (typeof window !== "undefined" && window.__EKABADI_CONFIG__) || {};
            return new RazorpayPaymentProvider(config);
        } else {
            return new MockPaymentProvider(options);
        }
    }

    return {
        toPaise: toPaise,
        toRupees: toRupees,
        calculateAuthoritativeAmount: calculateAuthoritativeAmount,
        MockPaymentProvider: MockPaymentProvider,
        RazorpayPaymentProvider: RazorpayPaymentProvider,
        getPaymentProvider: getPaymentProvider
    };
}));
