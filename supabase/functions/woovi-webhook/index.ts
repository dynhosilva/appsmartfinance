import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WooviWebhookPayload {
  event: string;
  charge?: {
    correlationID: string;
    status: string;
    value: number;
    transactionID?: string;
    paidAt?: string;
  };
  pix?: {
    charge: {
      correlationID: string;
      status: string;
      value: number;
      transactionID?: string;
    };
    payer?: {
      name?: string;
      taxID?: {
        taxID?: string;
      };
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WooviWebhookPayload = await req.json();
    
    console.log("Woovi webhook received:", JSON.stringify(payload));

    const event = payload.event;
    
    // Handle test webhook from Woovi (for registration)
    if ((payload as any).evento === "teste_webhook" || event === "test") {
      console.log("Test webhook received - returning 200");
      return new Response(
        JSON.stringify({ success: true, message: "Webhook test successful" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Handle different webhook events
    if (event === "OPENPIX:CHARGE_COMPLETED" || event === "OPENPIX:TRANSACTION_RECEIVED") {
      const charge = payload.charge || payload.pix?.charge;
      
      if (!charge?.correlationID) {
        console.log("No correlationID in webhook payload - might be a test");
        return new Response(
          JSON.stringify({ success: true, message: "Acknowledged" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Processing payment for correlationID: ${charge.correlationID}`);

      // Find the payment by woovi_charge_id (correlationID)
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("*, subscriptions(*)")
        .eq("woovi_charge_id", charge.correlationID)
        .single();

      if (paymentError || !payment) {
        console.error("Payment not found:", paymentError);
        return new Response(
          JSON.stringify({ error: "Payment not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update payment status
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          status: "completed",
          paid_at: charge.paidAt || new Date().toISOString(),
          woovi_transaction_id: charge.transactionID || payload.pix?.charge?.transactionID,
        })
        .eq("id", payment.id);

      if (updateError) {
        console.error("Error updating payment:", updateError);
        throw updateError;
      }

      console.log(`Payment ${payment.id} marked as completed`);

      // If this payment is linked to a subscription, activate it
      if (payment.subscription_id) {
        const billingPeriod = payment.subscriptions?.billing_period || "monthly";
        const periodEnd = new Date();
        
        if (billingPeriod === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const { error: subError } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq("id", payment.subscription_id);

        if (subError) {
          console.error("Error activating subscription:", subError);
          throw subError;
        }

        console.log(`Subscription ${payment.subscription_id} activated until ${periodEnd.toISOString()}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Payment processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle charge expired
    if (event === "OPENPIX:CHARGE_EXPIRED") {
      const charge = payload.charge;
      
      if (charge?.correlationID) {
        await supabase
          .from("payments")
          .update({ status: "expired" })
          .eq("woovi_charge_id", charge.correlationID);

        console.log(`Payment for ${charge.correlationID} marked as expired`);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Charge expired handled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For other events, just acknowledge
    console.log(`Unhandled event type: ${event}`);
    return new Response(
      JSON.stringify({ success: true, message: "Event received" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing Woovi webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
