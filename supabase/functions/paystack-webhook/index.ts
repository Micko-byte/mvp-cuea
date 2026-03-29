import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("Live_Secret_Key");
    if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack secret key not configured");

    const body = await req.text();
    
    // Verify Paystack signature
    const signature = req.headers.get("x-paystack-signature");
    if (signature) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(PAYSTACK_SECRET_KEY),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const hash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (hash !== signature) {
        console.error("Invalid Paystack signature");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const event = JSON.parse(body);
    
    if (event.event === "charge.success") {
      const { reference, metadata, customer } = event.data;
      const userId = metadata?.user_id;

      if (!userId) {
        console.error("No user_id in payment metadata");
        return new Response("OK", { status: 200 });
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Update payment status
      await supabaseAdmin
        .from("payments")
        .update({ status: "success", paid_at: new Date().toISOString() })
        .eq("paystack_reference", reference);

      console.log(`Payment successful for user ${userId}, reference: ${reference}`);

      // Send welcome email to paying user
      const userEmail = customer?.email || metadata?.email;
      if (userEmail) {
        try {
          const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
          // Simple welcome email via Paystack (or log for now)
          console.log(`Welcome email would be sent to: ${userEmail}`);
          
          // Store a welcome notification in student_memory
          await supabaseAdmin.from("student_memory").insert({
            user_id: userId,
            memory_type: "system",
            subject: "Premium Welcome",
            content: `Welcome to Sekani Premium! 🎓 You now have unlimited tokens. Thank you for upgrading.`,
          });
        } catch (emailErr) {
          console.error("Welcome notification error:", emailErr);
        }
      }

      // Handle group plan: activate group members
      const planType = metadata?.plan || "individual";
      const groupEmails: string[] = metadata?.group_emails || [];

      if (planType === "group" && groupEmails.length > 0) {
        console.log(`Group payment: activating ${groupEmails.length} members`);
        for (const memberEmail of groupEmails) {
          // Look up user by email in profiles
          const { data: memberProfile } = await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .eq("email", memberEmail)
            .single();

          if (memberProfile) {
            // Create a payment record for each group member
            await supabaseAdmin.from("payments").insert({
              user_id: memberProfile.user_id,
              amount: 0,
              currency: "KES",
              status: "success",
              paid_at: new Date().toISOString(),
              email: memberEmail,
              plan_type: "group_member",
              group_emails: [],
              paystack_reference: `${reference}_group_${memberEmail}`,
            });

            // Send welcome notification to group member
            await supabaseAdmin.from("student_memory").insert({
              user_id: memberProfile.user_id,
              memory_type: "system",
              subject: "Premium Welcome",
              content: `Welcome to Sekani Premium! 🎓 You've been added to a group plan. You now have unlimited tokens.`,
            });

            console.log(`Activated group member: ${memberEmail}`);
          } else {
            console.log(`Group member not found (not yet registered): ${memberEmail}`);
          }
        }
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("OK", { status: 200 });
  }
});
