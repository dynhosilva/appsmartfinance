import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  message: string;
  messageType?: string;
  reminderId?: string;
  targetUserId?: string; // For system/cron calls
}

async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get centralized Evolution API config from environment
    let apiUrl = Deno.env.get("EVOLUTION_API_URL");
    const apiKey = Deno.env.get("EVOLUTION_API_KEY");
    const instanceName = Deno.env.get("EVOLUTION_INSTANCE_NAME");

    if (!apiUrl || !apiKey || !instanceName) {
      console.error("Evolution API not configured in environment");
      return { success: false, error: "WhatsApp service not configured" };
    }

    // Ensure URL has protocol
    if (!apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) {
      apiUrl = `https://${apiUrl}`;
    }

    // Format phone number (remove non-digits and ensure country code)
    const phone = phoneNumber.replace(/\D/g, "");
    const formattedPhone = phone.startsWith("55") ? phone : `55${phone}`;

    // Evolution API endpoint
    const url = `${apiUrl.replace(/\/$/, "")}/message/sendText/${instanceName}`;

    console.log(`Sending message to ${formattedPhone} via Evolution API`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API error:", errorText);
      return { success: false, error: `API Error: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    console.log("Message sent successfully:", result);
    return { success: true };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendMessageRequest = await req.json();
    const { message, messageType = "manual", reminderId, targetUserId } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string;
    let phoneNumber: string;

    // Check if this is a system call (from cron/process-reminders) with targetUserId
    if (targetUserId) {
      // System call - get phone from profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("phone_number, whatsapp_notifications_enabled")
        .eq("id", targetUserId)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "User profile not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!profile.whatsapp_notifications_enabled) {
        return new Response(
          JSON.stringify({ error: "WhatsApp notifications disabled for this user" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!profile.phone_number) {
        return new Response(
          JSON.stringify({ error: "User has no phone number configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = targetUserId;
      phoneNumber = profile.phone_number;
    } else {
      // User call - verify auth and get phone from profile
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

      // Get user's phone number from profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("phone_number, whatsapp_notifications_enabled")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.phone_number) {
        return new Response(
          JSON.stringify({ error: "Configure seu número de WhatsApp primeiro" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = user.id;
      phoneNumber = profile.phone_number;
    }

    // Send the message using centralized Evolution API
    const result = await sendWhatsAppMessage(phoneNumber, message);

    // Log the message
    await supabase.from("whatsapp_messages_log").insert({
      user_id: userId,
      reminder_id: reminderId || null,
      message_type: messageType,
      message_content: message,
      status: result.success ? "sent" : "failed",
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Message sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
