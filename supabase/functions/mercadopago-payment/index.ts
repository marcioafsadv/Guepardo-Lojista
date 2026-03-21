import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
const MP_API_URL = "https://api.mercadopago.com/v1";

const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("Function invoked");
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) throw new Error("Unauthorized");

        const body = await req.json();
        const { amount, description } = body;
        console.log("Request body:", body);

        // 1. Get Store Data
        const { data: store, error: storeError } = await supabaseClient
            .from("stores")
            .select("*")
            .eq("id", user.id)
            .single();

        if (storeError || !store) {
            console.error("Store error:", storeError);
            throw new Error("Store not found");
        }
        console.log("Store found:", store.id, store.fantasy_name);

        const idNumber = (store.cnpj || store.cpf || "").replace(/\D/g, "");
        if (!idNumber || (idNumber.length !== 11 && idNumber.length !== 14)) {
            throw new Error(`CPF ou CNPJ inválido ou não cadastrado (Encontrado: ${idNumber || 'nada'}). Por favor, verifique seu perfil.`);
        }
        const idType = idNumber.length === 14 ? "CNPJ" : "CPF";

        // 2. Create Mercado Pago Payment
        const paymentBody = {
            transaction_amount: amount,
            description: description || "Recarga de Saldo - Guepardo Delivery",
            payment_method_id: "pix",
            payer: {
                email: user.email,
                first_name: store.fantasy_name || store.company_name || "Lojista",
                last_name: "Guepardo",
                identification: {
                    type: idType,
                    number: idNumber,
                },
            },
            external_reference: store.id,
            notification_url: "https://eviukbluwrwcblwhkzwz.supabase.co/functions/v1/mercadopago-webhook",
        };
        console.log("Sending to Mercado Pago (sanitized):", JSON.stringify({ ...paymentBody, payer: { ...paymentBody.payer, identification: { ...paymentBody.payer.identification, number: "XXX" } } }));

        const paymentResp = await fetch(`${MP_API_URL}/payments`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
                "X-Idempotency-Key": crypto.randomUUID(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(paymentBody),
        });

        const paymentData = await paymentResp.json();
        console.log("Mercado Pago response status:", paymentResp.status);
        
        if (paymentResp.status >= 400 || !paymentData.id) {
            console.error("Mercado Pago Error Details:", paymentData);
            const mpMessage = paymentData.message || (paymentData.cause && paymentData.cause[0] && paymentData.cause[0].description) || 'Erro desconhecido no Mercado Pago';
            throw new Error(`MP Error: ${mpMessage}`);
        }

        const point_of_interaction = paymentData.point_of_interaction || {};
        const transaction_data = point_of_interaction.transaction_data || {};

        // 3. Register Transaction in DB (Using Admin Client to bypass RLS)
        const { data: txRecord, error: txError } = await supabaseAdmin.from("wallet_transactions").insert({
            store_id: store.id,
            amount: amount,
            type: 'RECHARGE',
            status: 'PENDING',
            payment_method: 'PIX',
            mercadopago_payment_id: String(paymentData.id),
            pix_qr_code: transaction_data.qr_code_base64,
            pix_copy_paste: transaction_data.qr_code,
            description: paymentBody.description
        }).select('id').single();

        if (txError) {
            console.error("Error saving transaction to DB:", txError);
        }

        return new Response(JSON.stringify({
            success: true,
            payment_id: paymentData.id,
            transaction_id: txRecord?.id,
            pix_qr_code: transaction_data.qr_code_base64,
            pix_copy_paste: transaction_data.qr_code,
            ticket_url: transaction_data.ticket_url
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Caught error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
