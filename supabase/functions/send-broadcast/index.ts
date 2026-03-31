import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import {
  Html, Head, Body, Container, Heading, Text, Preview, Hr, Section,
} from "npm:@react-email/components@0.0.22";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_NAME = "Sekani";
const SENDER_DOMAIN = "notify.cueaai.space";
const FROM_DOMAIN = "notify.cueaai.space";
const LOGO_URL = "https://yqjorkcibfdxmuqrcpnn.supabase.co/storage/v1/object/public/email-assets/sekani-logo.png";

// ---------- Broadcast Email Template ----------
interface BroadcastEmailProps {
  subject: string;
  message: string;
  broadcastType: string;
}

const BroadcastEmail = ({ subject, message, broadcastType }: BroadcastEmailProps) => {
  const isDowntime = broadcastType === "downtime";
  const isBackOnline = broadcastType === "back_online";
  const icon = isDowntime ? "⚠️" : isBackOnline ? "✅" : "📢";

  return React.createElement(Html, { lang: "en", dir: "ltr" },
    React.createElement(Head, null),
    React.createElement(Preview, null, `${icon} ${subject}`),
    React.createElement(Body, { style: main },
      React.createElement(Container, { style: container },
        React.createElement("img", { src: LOGO_URL, alt: SITE_NAME, width: 140, height: "auto", style: logo }),
        React.createElement(Hr, { style: hr }),
        React.createElement(Heading, { style: h1 }, subject),
        React.createElement(Text, { style: text }, message),
        React.createElement(Hr, { style: hr }),
        React.createElement(Text, { style: footer }, `This is an automated notification from ${SITE_NAME}. You are receiving this because you have an account on our platform.`),
      )
    )
  );
};

const main = { backgroundColor: "#ffffff", fontFamily: "'DM Sans', Arial, sans-serif" };
const container = { padding: "30px 25px", maxWidth: "560px", margin: "0 auto" };
const logo = { display: "block", margin: "0 auto 16px" };
const hr = { borderColor: "#e5e7eb", margin: "20px 0" };
const h1 = { fontSize: "22px", fontWeight: "bold" as const, color: "#1C2939", margin: "0 0 16px", textAlign: "center" as const };
const text = { fontSize: "15px", color: "#374151", lineHeight: "1.6", margin: "0 0 20px" };
const footer = { fontSize: "12px", color: "#9ca3af", margin: "0", textAlign: "center" as const };

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller identity
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Verify admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const { subject, message, broadcastType, recipientEmails } = await req.json();

    if (!subject || !message) {
      return new Response(JSON.stringify({ error: "Subject and message are required" }), { status: 400, headers: corsHeaders });
    }

    // Only store active broadcast for "all" sends (not targeted)
    if (!recipientEmails) {
      await supabase.from("system_settings").upsert({
        key: "active_broadcast",
        value: {
          subject,
          message,
          broadcastType,
          sentAt: new Date().toISOString(),
          sentBy: user.id,
          active: true,
        },
        updated_at: new Date().toISOString(),
      });
    }

    let uniqueEmails: string[];

    if (recipientEmails && Array.isArray(recipientEmails) && recipientEmails.length > 0) {
      // Targeted send — use provided emails
      uniqueEmails = [...new Set(recipientEmails.filter(Boolean))];
    } else {
      // Broadcast to all
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("email")
        .neq("email", "");

      if (profilesError) {
        console.error("Failed to fetch profiles", profilesError);
        return new Response(JSON.stringify({ error: "Failed to fetch users" }), { status: 500, headers: corsHeaders });
      }

      uniqueEmails = [...new Set((profiles || []).map((p: any) => p.email).filter(Boolean))];
    }

    if (uniqueEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No users to email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Render the broadcast email template
    const html = await renderAsync(
      React.createElement(BroadcastEmail, { subject, message, broadcastType })
    );
    const plainText = await renderAsync(
      React.createElement(BroadcastEmail, { subject, message, broadcastType }),
      { plainText: true }
    );

    // Enqueue an email for each user
    let enqueued = 0;
    let failed = 0;
    const broadcastId = crypto.randomUUID();

    for (const email of uniqueEmails) {
      const messageId = crypto.randomUUID();

      // Log pending
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "broadcast",
        recipient_email: email,
        status: "pending",
      });

      const { error: enqueueError } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: messageId,
          to: email,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text: plainText,
          purpose: "transactional",
          idempotency_key: `broadcast-${broadcastId}-${email}`,
          label: "broadcast",
          queued_at: new Date().toISOString(),
        },
      });

      if (enqueueError) {
        console.error(`Failed to enqueue email for ${email}`, enqueueError);
        failed++;
      } else {
        enqueued++;
      }
    }

    console.log(`Broadcast complete: ${enqueued} enqueued, ${failed} failed out of ${uniqueEmails.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: enqueued,
        failed,
        total: uniqueEmails.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Broadcast error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
