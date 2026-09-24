// =========================================================
// E-KABAADI PLATFORM — Supabase Edge Function
// Phase 4F: Reconcile Payment & Admin Financial Operations
// Path: supabase/functions/reconcile-payment/index.ts
// =========================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration missing" }), { status: 500, headers: CORS_HEADERS });
    }

    // 1. Authenticate admin user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: CORS_HEADERS });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
    }

    // Verify user role is admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin role required for reconciliation" }), { status: 403, headers: CORS_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { action, paymentId, reason } = body;

    if (!paymentId) {
      return new Response(JSON.stringify({ error: "Missing paymentId parameter" }), { status: 400, headers: CORS_HEADERS });
    }

    const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404, headers: CORS_HEADERS });
    }

    if (action === "reconcile") {
      // Query Razorpay API if provider_order_id exists
      if (razorpayKeyId && razorpayKeySecret && payment.provider_order_id) {
        const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
        const rzpRes = await fetch(`https://api.razorpay.com/v1/orders/${payment.provider_order_id}/payments`, {
          headers: { "Authorization": `Basic ${credentials}` }
        });
        const rzpPayments = await rzpRes.json();

        if (rzpPayments && rzpPayments.items && rzpPayments.items.length > 0) {
          const capturedPayment = rzpPayments.items.find((p: any) => p.status === "captured");
          if (capturedPayment) {
            // Settle payment atomically
            await supabase.rpc("verify_and_settle_payment_atomic", {
              p_pickup_id: payment.pickup_id,
              p_payment_id: payment.id,
              p_provider_payment_id: capturedPayment.id,
              p_provider_signature: "reconciled_via_admin"
            });
            return new Response(JSON.stringify({ success: true, reconciled: true, status: "settled" }), {
              status: 200,
              headers: CORS_HEADERS
            });
          }
        }
      }

      return new Response(JSON.stringify({ success: true, reconciled: false, status: payment.status }), {
        status: 200,
        headers: CORS_HEADERS
      });
    }

    if (action === "refund") {
      if (payment.status !== "settled" && payment.status !== "paid") {
        return new Response(JSON.stringify({ error: "Only settled payments can be refunded." }), { status: 400, headers: CORS_HEADERS });
      }

      // Record adjustment and update payment status
      await supabase.from("payment_adjustments").insert({
        id: "ADJ-" + Math.floor(1000 + Math.random() * 9000),
        payment_id: payment.id,
        pickup_id: payment.pickup_id,
        adjustment_type: "refund",
        amount_delta: -payment.amount,
        reason: reason || "Admin processed refund",
        actor_id: user.id,
        actor_role: "admin"
      });

      await supabase.from("payments").update({
        status: "refunded",
        refund_status: "refunded",
        refunded_amount: payment.amount,
        updated_at: new Date().toISOString()
      }).eq("id", payment.id);

      return new Response(JSON.stringify({ success: true, refunded: true, amount: payment.amount }), {
        status: 200,
        headers: CORS_HEADERS
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action: " + action }), { status: 400, headers: CORS_HEADERS });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Reconciliation error" }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
});
