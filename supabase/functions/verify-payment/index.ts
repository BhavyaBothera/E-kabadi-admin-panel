// =========================================================
// E-KABAADI PLATFORM — Supabase Edge Function
// Phase 4F: Verify Payment & Atomic Settlement
// Path: supabase/functions/verify-payment/index.ts
// =========================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

// Helper to compute HMAC-SHA256 in Deno Web Crypto
async function computeHmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration missing" }), {
        status: 500,
        headers: CORS_HEADERS
      });
    }

    if (!razorpayKeySecret) {
      return new Response(JSON.stringify({ error: "RAZORPAY_KEY_SECRET is not configured on server" }), {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: CORS_HEADERS
      });
    }

    // 2. Parse payload
    const body = await req.json().catch(() => ({}));
    const { pickupId, orderId, paymentId, signature } = body;

    if (!pickupId || !orderId || !paymentId || !signature) {
      return new Response(JSON.stringify({
        error: "Missing required verification parameters (pickupId, orderId, paymentId, signature)"
      }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    // 3. Verify HMAC-SHA256 signature
    // Razorpay checkout signature contract: HMAC_SHA256(orderId + "|" + paymentId, secret)
    const expectedSignature = await computeHmacSha256(`${orderId}|${paymentId}`, razorpayKeySecret);

    if (expectedSignature !== signature) {
      return new Response(JSON.stringify({
        verified: false,
        error: "Security violation: Invalid or forged payment signature."
      }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    // 4. Trigger atomic settlement via database RPC
    const { data: settleResult, error: settleError } = await supabase.rpc("verify_and_settle_payment_atomic", {
      p_pickup_id: pickupId,
      p_payment_id: "TXN-" + paymentId,
      p_provider_payment_id: paymentId,
      p_provider_signature: signature
    });

    if (settleError) {
      return new Response(JSON.stringify({
        verified: true,
        settled: false,
        error: "Database settlement error: " + settleError.message
      }), {
        status: 500,
        headers: CORS_HEADERS
      });
    }

    return new Response(JSON.stringify({
      success: true,
      verified: true,
      settled: true,
      pickupId: pickupId,
      paymentId: paymentId,
      settlementDetails: settleResult
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
