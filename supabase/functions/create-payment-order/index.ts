// =========================================================
// E-KABAADI PLATFORM — Supabase Edge Function
// Phase 4F: Create Payment Order (Razorpay Gateway)
// Path: supabase/functions/create-payment-order/index.ts
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
      return new Response(JSON.stringify({ error: "Server configuration missing: Supabase URL/Key" }), {
        status: 500,
        headers: CORS_HEADERS
      });
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(JSON.stringify({
        error: "Payment provider credentials not configured on server (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)."
      }), {
        status: 503,
        headers: CORS_HEADERS
      });
    }

    // 1. Authenticate user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: CORS_HEADERS
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired token" }), {
        status: 401,
        headers: CORS_HEADERS
      });
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const pickupId = body.pickupId;
    if (!pickupId) {
      return new Response(JSON.stringify({ error: "Missing required field: pickupId" }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    // 3. Fetch pickup record
    const { data: pickup, error: pickupError } = await supabase
      .from("pickups")
      .select("*")
      .eq("id", pickupId)
      .single();

    if (pickupError || !pickup) {
      return new Response(JSON.stringify({ error: "Pickup not found: " + pickupId }), {
        status: 404,
        headers: CORS_HEADERS
      });
    }

    // 4. Verify pickup state & authorization
    if (pickup.status === "paid" || pickup.payment_status === "paid") {
      return new Response(JSON.stringify({ error: "This pickup has already been finalized and settled." }), {
        status: 409,
        headers: CORS_HEADERS
      });
    }

    // 5. Authoritative calculation from final scale weight & database rate
    const categoryName = pickup.scrap_type || "Mixed Recyclables";
    const { data: categoryData } = await supabase
      .from("scrap_categories")
      .select("rate_per_kg")
      .ilike("name", `%${categoryName}%`)
      .limit(1);

    const trustedRate = (categoryData && categoryData[0] && categoryData[0].rate_per_kg) || 14.00;
    const finalWeight = Number(pickup.final_weight || pickup.estimated_weight || 1.0);
    const finalAmountRupees = +(finalWeight * trustedRate).toFixed(2);
    const finalAmountPaise = Math.round(finalAmountRupees * 100);

    // 6. Check existing payment order (Idempotency)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("*")
      .eq("pickup_id", pickupId)
      .single();

    if (existingPayment && existingPayment.provider_order_id && existingPayment.status === "order_created") {
      return new Response(JSON.stringify({
        success: true,
        reused: true,
        orderId: existingPayment.provider_order_id,
        amount: existingPayment.amount,
        amountPaise: existingPayment.amount_paise,
        currency: existingPayment.currency || "INR",
        keyId: razorpayKeyId
      }), {
        status: 200,
        headers: CORS_HEADERS
      });
    }

    // 7. Create order on Razorpay Orders API
    const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: finalAmountPaise,
        currency: "INR",
        receipt: pickupId,
        notes: {
          pickupId: pickupId,
          citizenId: pickup.citizen_id,
          collectorId: pickup.collector_id
        }
      })
    });

    const rzpData = await rzpResponse.json();
    if (!rzpResponse.ok || !rzpData.id) {
      return new Response(JSON.stringify({
        error: "Failed to create order on payment gateway.",
        providerError: rzpData.error
      }), {
        status: 502,
        headers: CORS_HEADERS
      });
    }

    // 8. Atomically persist payment record via database RPC
    await supabase.rpc("create_payment_order_atomic", {
      p_pickup_id: pickupId,
      p_provider: "razorpay",
      p_provider_order_id: rzpData.id
    });

    // 9. Return safe client payload (Zero secrets returned)
    return new Response(JSON.stringify({
      success: true,
      orderId: rzpData.id,
      amount: finalAmountRupees,
      amountPaise: finalAmountPaise,
      currency: "INR",
      keyId: razorpayKeyId
    }), {
      status: 200,
      headers: CORS_HEADERS
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
});
