import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const ASAAS_WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

Deno.serve(async (req) => {
    try {
        // 1. Verify Webhook Token (Security)
        const token = req.headers.get("asaas-access-token");
        if (token !== ASAAS_WEBHOOK_TOKEN) {
            return new Response("Unauthorized", { status: 401 });
        }

        const payload = await req.json();
        const { event, payment } = payload;

        console.log(`Webhook received: ${event} for payment ${payment.id}`);

        // 2. Handle PAYMENT_RECEIVED or PAYMENT_CONFIRMED
        if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
            const asaasPaymentId = payment.id;
            const amount = payment.value;
            const storeId = payment.externalReference;

            if (!storeId) {
                console.error("No storeId (externalReference) found in webhook payload");
                return new Response("No storeId found", { status: 400 });
            }

            // 3. Update Transaction Status using a transaction/RPC or simple update
            // First, check if already processed to avoid double balance updates
            const { data: tx, error: txFetchError } = await supabaseAdmin
                .from("wallet_transactions")
                .select("status")
                .eq("asaas_payment_id", asaasPaymentId)
                .single();

            if (txFetchError || !tx) {
                console.error("Transaction not found in DB:", asaasPaymentId);
                return new Response("Transaction not found", { status: 404 });
            }

            if (tx.status === "CONFIRMED") {
                console.log("Transaction already confirmed:", asaasPaymentId);
                return new Response("Already processed", { status: 200 });
            }

            // 4. Update Balance and Transaction Status
            // We use Supabase RPC to ensure atomicity (requires a Postgres function)
            // For now, doing it sequentially (in production use a stored procedure)

            // Update transaction status
            const { error: txUpdateError } = await supabaseAdmin
                .from("wallet_transactions")
                .update({ status: "CONFIRMED" })
                .eq("asaas_payment_id", asaasPaymentId);

            if (txUpdateError) throw txUpdateError;

            // Update store balance
            const { data: store, error: storeFetchError } = await supabaseAdmin
                .from("stores")
                .select("wallet_balance")
                .eq("id", storeId)
                .single();

            if (storeFetchError) throw storeFetchError;

            const newBalance = (store.wallet_balance || 0) + amount;

            const { error: balanceUpdateError } = await supabaseAdmin
                .from("stores")
                .update({ wallet_balance: newBalance })
                .eq("id", storeId);

            if (balanceUpdateError) throw balanceUpdateError;

            console.log(`Balance updated for store ${storeId}. New balance: ${newBalance}`);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Webhook Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
