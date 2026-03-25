import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const PAYSTACK_SECRET_KEY = Deno.env.get("Live_Secret_Key");
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("Paystack secret key not configured");
    }

    const body = await req.json();
    const { phone: rawPhone, method, plan, groupEmails } = body;

    const email = user.email;

    // Determine amount based on plan
    let amount: number;
    let planType: string;

    if (plan === "group") {
      amount = 49900; // 499 KES in kobo/cents
      planType = "group";

      // Validate group emails
      if (!groupEmails || !Array.isArray(groupEmails) || groupEmails.length !== 5) {
        return new Response(JSON.stringify({ error: "Group plan requires exactly 5 email addresses" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate email formats
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const ge of groupEmails) {
        if (!emailRegex.test(ge)) {
          return new Response(JSON.stringify({ error: `Invalid email: ${ge}` }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else {
      amount = 12900; // 129 KES in kobo/cents
      planType = "individual";
    }

    // ── CARD PAYMENT (redirect flow) ──
    if (method === "card") {
      const appUrl = Deno.env.get("APP_URL") || "https://mvp-cuea.lovable.app";
      const paystackResp = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount,
          currency: "KES",
          callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/paystack-callback`,
          metadata: { user_id: user.id, plan: planType, group_emails: planType === "group" ? groupEmails : [] },
        }),
      });
      const paystackData = await paystackResp.json();
      console.log("Paystack card response:", JSON.stringify(paystackData));
      if (!paystackData.status) {
        throw new Error(paystackData.message || "Failed to initialize payment");
      }
      const reference = paystackData.data.reference;
      await supabaseAdmin.from("payments").insert({
        user_id: user.id,
        amount: planType === "group" ? 499 : 129,
        currency: "KES",
        status: "pending",
        paystack_reference: reference,
        paystack_access_code: paystackData.data.access_code,
        email,
        plan_type: planType,
        group_emails: planType === "group" ? groupEmails : [],
      });
      return new Response(JSON.stringify({ authorization_url: paystackData.data.authorization_url, reference }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── M-PESA PAYMENT (no redirect) ──
    if (!rawPhone) {
      return new Response(JSON.stringify({ error: "Phone number is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let phone = String(rawPhone).replace(/\s+/g, "").replace(/-/g, "");
    if (phone.startsWith("0")) {
      phone = "+254" + phone.slice(1);
    } else if (phone.startsWith("254")) {
      phone = "+" + phone;
    } else if (!phone.startsWith("+")) {
      phone = "+254" + phone;
    }

    const paystackResp = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email, amount, currency: "KES",
        mobile_money: { phone, provider: "mpesa" },
        metadata: { user_id: user.id, plan: planType, group_emails: planType === "group" ? groupEmails : [] },
      }),
    });

    const paystackData = await paystackResp.json();
    console.log("Paystack charge response:", JSON.stringify(paystackData));

    if (!paystackData.status) {
      throw new Error(paystackData.message || "Failed to initialize payment");
    }

    const reference = paystackData.data.reference;

    await supabaseAdmin.from("payments").insert({
      user_id: user.id,
      amount: planType === "group" ? 499 : 129,
      currency: "KES",
      status: "pending",
      paystack_reference: reference,
      email,
      plan_type: planType,
      group_emails: planType === "group" ? groupEmails : [],
    });

    return new Response(JSON.stringify({ reference }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Payment init error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Payment initialization failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
