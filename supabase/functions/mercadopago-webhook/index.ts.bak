import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

Deno.serve(async (req: Request) => {
    try {
        const payload = await req.json();
        const { action, data, type } = payload;

        console.log(`Webhook received: ${action} for type ${type} with id ${data?.id}`);

        // 1. Handle payment.updated or payment.created
        if (type === "payment" && (action === "payment.updated" || action === "payment.created" || !action)) {
            const paymentId = data.id;

            // 2. Fetch payment details from Mercado Pago to verify status
            const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    "Authorization": `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
                },
            });
            const mpPayment = await mpResp.json();

            if (mpPayment.status === "approved") {
                const amount = mpPayment.transaction_amount;
                const storeId = mpPayment.external_reference;

                if (!storeId) {
                    console.error("No storeId (external_reference) found in MP payload");
                    return new Response("No storeId found", { status: 400 });
                }

                // 3. Update Transaction Status
                const { data: tx, error: txFetchError } = await supabaseAdmin
                    .from("wallet_transactions")
                    .select("status")
                    .eq("mercadopago_payment_id", String(paymentId))
                    .single();

                if (txFetchError || !tx) {
                    console.error("Transaction not found in DB:", paymentId);
                    return new Response("Transaction not found", { status: 404 });
                }

                if (tx.status === "CONFIRMED") {
                    console.log("Transaction already confirmed:", paymentId);
                    return new Response("Already processed", { status: 200 });
                }

                // 4. Update Balance and Transaction Status
                const { error: txUpdateError } = await supabaseAdmin
                    .from("wallet_transactions")
                    .update({ status: "CONFIRMED" })
                    .eq("mercadopago_payment_id", String(paymentId));

                if (txUpdateError) throw txUpdateError;

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

                console.log(`Balance updated for store ${storeId} via Mercado Pago. New balance: ${newBalance}`);
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
