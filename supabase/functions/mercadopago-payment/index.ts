import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
const MP_API_URL = "https://api.mercadopago.com/v1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        const { amount, description } = await req.json();

        // 1. Get Store Data
        const { data: store, error: storeError } = await supabaseClient
            .from("stores")
            .select("*")
            .eq("id", user.id)
            .single();

        if (storeError || !store) throw new Error("Store not found");

        // 2. Create Mercado Pago Payment
        const paymentBody = {
            transaction_amount: amount,
            description: description || "Recarga de Saldo - Guepardo Delivery",
            payment_method_id: "pix",
            payer: {
                email: user.email,
                first_name: store.fantasy_name || store.company_name,
                last_name: "Lojista",
                identification: {
                    type: store.cnpj ? "CNPJ" : "CPF",
                    number: store.cnpj || store.cpf || "00000000000",
                },
            },
            external_reference: store.id,
            notification_url: "https://eviukbluwrwcblwhkzwz.supabase.co/functions/v1/mercadopago-webhook",
        };

        const paymentResp = await fetch(`${MP_API_URL}/payments`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(paymentBody),
        });

        const paymentData = await paymentResp.json();
        
        if (paymentData.status === 400 || !paymentData.id) {
            throw new Error(`Mercado Pago Payment Error: ${JSON.stringify(paymentData)}`);
        }

        // 3. Register Transaction in DB
        // NOTE: We assume 'mercadopago_payment_id' column exists or will be added.
        // If not, we fall back to a generic field if available, or just asaas_payment_id with a prefix (not recommended).
        const { error: txError } = await supabaseClient.from("wallet_transactions").insert({
            store_id: store.id,
            amount: amount,
            type: 'RECHARGE',
            status: 'PENDING',
            payment_method: 'PIX',
            mercadopago_payment_id: String(paymentData.id),
            description: paymentBody.description
        });

        if (txError) {
            console.error("Error saving transaction:", txError);
            // If the column doesn't exist, we might want to know.
        }

        const point_of_interaction = paymentData.point_of_interaction || {};
        const transaction_data = point_of_interaction.transaction_data || {};

        return new Response(JSON.stringify({
            success: true,
            paymentId: paymentData.id,
            qrCode: transaction_data.qr_code_base64,
            qrCodePayload: transaction_data.qr_code,
            ticket_url: transaction_data.ticket_url
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
