import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");

    if (!reference) {
      return new Response("Missing reference", { status: 400 });
    }

    const PAYSTACK_SECRET_KEY = Deno.env.get("Live_Secret_Key");
    if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack secret key not configured");

    // Verify transaction with Paystack
    const verifyResp = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyResp.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (verifyData.status && verifyData.data.status === "success") {
      const userId = verifyData.data.metadata?.user_id;

      // Update payment status
      await supabaseAdmin
        .from("payments")
        .update({ status: "success", paid_at: new Date().toISOString() })
        .eq("paystack_reference", reference);

      // Redirect back to app with success
      const appUrl = Deno.env.get("APP_URL") || "https://id-preview--309cf47d-8bcb-4fb5-bcbc-62733d9669b3.lovable.app";
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/chat?payment=success` },
      });
    } else {
      await supabaseAdmin
        .from("payments")
        .update({ status: "failed" })
        .eq("paystack_reference", reference);

      const appUrl = Deno.env.get("APP_URL") || "https://id-preview--309cf47d-8bcb-4fb5-bcbc-62733d9669b3.lovable.app";
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/chat?payment=failed` },
      });
    }
  } catch (e) {
    console.error("Callback error:", e);
    return new Response("Error processing payment", { status: 500 });
  }
});
