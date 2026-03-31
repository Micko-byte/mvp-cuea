import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SignupEmail } from "../_shared/email-templates/signup.tsx";
import { InviteEmail } from "../_shared/email-templates/invite.tsx";
import { MagicLinkEmail } from "../_shared/email-templates/magic-link.tsx";
import { RecoveryEmail } from "../_shared/email-templates/recovery.tsx";
import { EmailChangeEmail } from "../_shared/email-templates/email-change.tsx";
import { ReauthenticationEmail } from "../_shared/email-templates/reauthentication.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: "Confirm your email",
  invite: "You've been invited",
  magiclink: "Your login link",
  recovery: "Reset your password",
  email_change: "Confirm your new email",
  reauthentication: "Your verification code",
};

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
};

// Configuration
const SITE_NAME = "Sekani";
const SENDER_DOMAIN = "notifyai.org";
const ROOT_DOMAIN = "cueaai.space";
const FROM_DOMAIN = "notifyai.org";

const SAMPLE_PROJECT_URL = "https://mvp-cuea.lovable.app";
const SAMPLE_EMAIL = "user@example.test";
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: "123456",
  },
};

// ---------------------------------------------------------------------------
// Preview handler — returns rendered HTML without sending email.
// Called by GET/POST to /preview with Bearer RESEND_API_KEY header.
// ---------------------------------------------------------------------------
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: previewCorsHeaders });
  }

  // Protect preview endpoint with Resend API key
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...previewCorsHeaders, "Content-Type": "application/json" },
    });
  }

  let type: string;
  try {
    const body = await req.json();
    type = body.type;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
      status: 400,
      headers: { ...previewCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const EmailTemplate = EMAIL_TEMPLATES[type];
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const sampleData = SAMPLE_DATA[type] || {};
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData));

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

// ---------------------------------------------------------------------------
// Webhook handler — receives Supabase Auth Hook POST and enqueues email.
//
// Supabase Auth Hooks send a JSON body shaped like:
// {
//   "user": { "email": "...", ... },
//   "email_data": {
//     "token": "...",
//     "token_hash": "...",
//     "redirect_to": "...",
//     "email_action_type": "signup" | "recovery" | "magiclink" | ...
//     "site_url": "...",
//     "token_new": "...",
//     "token_hash_new": "..."
//   }
// }
//
// We verify the request using a shared HOOK_SECRET set in both this function
// and the Supabase Auth Hook configuration in the dashboard.
// ---------------------------------------------------------------------------
async function handleWebhook(req: Request): Promise<Response> {
  // ── 1. Verify shared secret ──────────────────────────────────────────────
  const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!hookSecret) {
    console.error("SEND_EMAIL_HOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Supabase sends the secret as a Bearer token in the Authorization header
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${hookSecret}`) {
    console.error("Invalid hook secret");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const emailData = body?.email_data;
  const user = body?.user;

  if (!emailData || !user) {
    console.error("Missing email_data or user in hook payload", { body });
    return new Response(JSON.stringify({ error: "Invalid hook payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 3. Resolve email type ────────────────────────────────────────────────
  // Supabase uses "email_action_type" — map to our template keys
  const ACTION_TYPE_MAP: Record<string, string> = {
    signup: "signup",
    recovery: "recovery",
    magiclink: "magiclink",
    invite: "invite",
    email_change: "email_change",
    reauthentication: "reauthentication",
  };

  const rawType: string = emailData.email_action_type ?? "";
  const emailType = ACTION_TYPE_MAP[rawType];

  if (!emailType) {
    console.error("Unknown email_action_type", { rawType });
    return new Response(JSON.stringify({ error: `Unknown email type: ${rawType}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const EmailTemplate = EMAIL_TEMPLATES[emailType];
  if (!EmailTemplate) {
    console.error("No template found for email type", { emailType });
    return new Response(JSON.stringify({ error: `No template for: ${emailType}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("Received auth hook event", { emailType, email: user.email });

  // ── 4. Build template props ──────────────────────────────────────────────
  // confirmation_url = site_url + token_hash link (Supabase constructs it for us)
  // For reauthentication, we just pass the OTP token directly.
  const confirmationUrl =
    emailData.redirect_to ?? `https://${ROOT_DOMAIN}/auth/confirm?token_hash=${emailData.token_hash}&type=${rawType}`;

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: user.email,
    confirmationUrl,
    token: emailData.token,
    email: user.email,
    newEmail: user.new_email ?? "",
  };

  // ── 5. Render email ──────────────────────────────────────────────────────
  const html = await renderAsync(React.createElement(EmailTemplate, templateProps));
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
    plainText: true,
  });

  // ── 6. Enqueue for process-email-queue (which sends via Resend) ──────────
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const messageId = crypto.randomUUID();

  // Log pending BEFORE enqueue so we have a record even if enqueue crashes
  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: user.email,
    status: "pending",
  });

  const { error: enqueueError } = await supabase.rpc("enqueue_email", {
    queue_name: "auth_emails",
    payload: {
      message_id: messageId,
      to: user.email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: EMAIL_SUBJECTS[emailType] || "Notification",
      html,
      text,
      purpose: "transactional",
      label: emailType,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    console.error("Failed to enqueue auth email", { error: enqueueError, emailType });
    await supabase
      .from("email_send_log")
      .update({
        status: "failed",
        error_message: "Failed to enqueue email",
      })
      .eq("message_id", messageId);

    return new Response(JSON.stringify({ error: "Failed to enqueue email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("Auth email enqueued", { emailType, email: user.email, messageId });

  return new Response(JSON.stringify({ success: true, queued: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (url.pathname.endsWith("/preview")) {
    return handlePreview(req);
  }

  try {
    return await handleWebhook(req);
  } catch (error) {
    console.error("Webhook handler error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
