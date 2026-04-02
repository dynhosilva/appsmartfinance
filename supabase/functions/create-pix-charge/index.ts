import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateChargeRequest {
  planId: string;
  billingPeriod: "monthly" | "yearly";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const wooviAppId = Deno.env.get("WOOVI_APP_ID");

    if (!wooviAppId) {
      throw new Error("WOOVI_APP_ID not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateChargeRequest = await req.json();
    const { planId, billingPeriod } = body;

    if (!planId || !billingPeriod) {
      return new Response(
        JSON.stringify({ error: "planId and billingPeriod are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get amount (already stored in cents in the database)
    const amountInCents = billingPeriod === "yearly" ? plan.price_yearly : plan.price_monthly;

    // Generate unique correlation ID
    const correlationID = `sf_${user.id.slice(0, 8)}_${Date.now()}`;

    // Create charge in Woovi/OpenPix
    console.log(`Creating Woovi charge for user ${user.id}, plan ${plan.name}, amount ${amountInCents}`);

    const wooviResponse = await fetch("https://api.openpix.com.br/api/v1/charge", {
      method: "POST",
      headers: {
        "Authorization": wooviAppId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        correlationID,
        value: amountInCents,
        comment: `Smart Finance - Plano ${plan.name} (${billingPeriod === "yearly" ? "Anual" : "Mensal"})`,
        expiresIn: 3600, // 1 hour
      }),
    });

    if (!wooviResponse.ok) {
      const errorText = await wooviResponse.text();
      console.error("Woovi API error:", errorText);
      throw new Error(`Woovi API error: ${wooviResponse.status}`);
    }

    const wooviData = await wooviResponse.json();
    console.log("Woovi charge created:", wooviData);

    const charge = wooviData.charge;

    // Create or get existing subscription
    let subscriptionId: string;

    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingSub) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          plan_id: planId,
          billing_period: billingPeriod,
          status: "pending",
        })
        .eq("id", existingSub.id);

      if (updateError) throw updateError;
      subscriptionId = existingSub.id;
    } else {
      // Create new subscription
      const { data: newSub, error: createError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan_id: planId,
          billing_period: billingPeriod,
          status: "pending",
        })
        .select("id")
        .single();

      if (createError) throw createError;
      subscriptionId = newSub.id;
    }

    // Create payment record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        subscription_id: subscriptionId,
        woovi_charge_id: correlationID,
        amount: amountInCents,
        status: "pending",
        qr_code: charge.qrCodeImage,
        br_code: charge.brCode,
        payment_link: charge.paymentLinkUrl,
        expires_at: expiresAt.toISOString(),
      });

    if (paymentError) throw paymentError;

    return new Response(
      JSON.stringify({
        success: true,
        charge: {
          correlationID,
          qrCode: charge.qrCodeImage,
          brCode: charge.brCode,
          paymentLink: charge.paymentLinkUrl,
          value: amountInCents,
          expiresAt: expiresAt.toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error creating Woovi charge:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
