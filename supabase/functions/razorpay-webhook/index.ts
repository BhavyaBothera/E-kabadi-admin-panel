// =========================================================
// E-KABAADI PLATFORM — Supabase Edge Function
// Phase 4F: Razorpay Webhook Handler & Idempotent Event Processor
// Path: supabase/functions/razorpay-webhook/index.ts
// =========================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-razorpay-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

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
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration missing" }), { status: 500, headers: CORS_HEADERS });
    }

    if (!webhookSecret) {
      return new Response(JSON.stringify({ error: "RAZORPAY_WEBHOOK_SECRET is not configured on server" }), { status: 503, headers: CORS_HEADERS });
    }

    // 1. Verify Webhook Signature
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing x-razorpay-signature header" }), { status: 400, headers: CORS_HEADERS });
    }

    const rawBody = await req.text();
    const expectedSignature = await computeHmacSha256(rawBody, webhookSecret);

    if (expectedSignature !== signature) {
      return new Response(JSON.stringify({ error: "Security violation: Invalid webhook signature" }), { status: 401, headers: CORS_HEADERS });
    }

    // 2. Parse event payload
    const event = JSON.parse(rawBody);
    const eventId = event.event_id || event.id || ("evt_" + Date.now());
    const eventType = event.event;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Webhook Idempotency: Check if event was already processed
    const { data: existingEvent } = await supabase
      .from("payment_provider_events")
      .select("id")
      .eq("provider", "razorpay")
      .eq("provider_event_id", eventId)
      .single();

    if (existingEvent) {
      // Return 200 OK immediately without re-processing (Idempotent delivery)
      return new Response(JSON.stringify({ status: "acknowledged", duplicate: true }), {
        status: 200,
        headers: CORS_HEADERS
      });
    }

    // 4. Process event
    const payloadEntity = (event.payload && event.payload.payment && event.payload.payment.entity) ||
                          (event.payload && event.payload.order && event.payload.order.entity) || {};

    const orderId = payloadEntity.order_id || (event.payload && event.payload.order && event.payload.order.entity && event.payload.order.entity.id);
    const paymentId = payloadEntity.id;
    const pickupId = payloadEntity.notes && payloadEntity.notes.pickupId;

    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (pickupId) {
        // Trigger atomic settlement
        await supabase.rpc("verify_and_settle_payment_atomic", {
          p_pickup_id: pickupId,
          p_payment_id: "TXN-" + (paymentId || orderId),
          p_provider_payment_id: paymentId || "",
          p_provider_signature: signature
        });
      }
    } else if (eventType === "payment.failed") {
      if (pickupId) {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            failure_reason: (payloadEntity.error_description || "Payment failed at bank gateway")
          })
          .eq("pickup_id", pickupId);
      }
    }

    // 5. Record processed event in payment_provider_events
    await supabase.from("payment_provider_events").insert({
      id: "EVT-" + floor(Math.random() * 900000 + 100000),
      provider: "razorpay",
      provider_event_id: eventId,
      event_type: eventType,
      order_id: orderId || null,
      payment_id: paymentId || null,
      processing_status: "processed"
    });

    return new Response(JSON.stringify({ status: "processed", event: eventType }), {
      status: 200,
      headers: CORS_HEADERS
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Webhook processing error" }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
});

function floor(n: number): string {
  return Math.floor(n).toString();
}
