import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
const ASAAS_API_URL = "https://sandbox.asaas.com/v3"; // Use https://api.asaas.com/v3 for production

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

        const { amount, method, description } = await req.json();

        // 1. Get Store Data
        const { data: store, error: storeError } = await supabaseClient
            .from("stores")
            .select("*")
            .eq("id", user.id)
            .single();

        if (storeError || !store) throw new Error("Store not found");

        // 2. Create/Get Asaas Customer
        let asaasCustomerId = store.asaas_customer_id;
        if (!asaasCustomerId) {
            const customerResp = await fetch(`${ASAAS_API_URL}/customers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "access_token": ASAAS_API_KEY!,
                },
                body: JSON.stringify({
                    name: store.fantasy_name || store.company_name,
                    email: user.email,
                    cpfCnpj: store.cnpj || "", // Assumes CNPJ is available or provided
                    externalReference: store.id,
                }),
            });
            const customerData = await customerResp.json();
            if (customerData.id) {
                asaasCustomerId = customerData.id;
                await supabaseClient.from("stores").update({ asaas_customer_id: asaasCustomerId }).eq("id", store.id);
            } else {
                throw new Error(`Failed to create Asaas customer: ${JSON.stringify(customerData)}`);
            }
        }

        // 3. Create Payment
        const paymentBody = {
            customer: asaasCustomerId,
            billingType: method, // PIX, BOLETO, CREDIT_CARD
            value: amount,
            dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
            description: description || "Recarga de Saldo - Guepardo Delivery",
            externalReference: store.id,
        };

        const paymentResp = await fetch(`${ASAAS_API_URL}/payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "access_token": ASAAS_API_KEY!,
            },
            body: JSON.stringify(paymentBody),
        });

        const paymentData = await paymentResp.json();
        if (!paymentData.id) {
            throw new Error(`Asaas Payment Error: ${JSON.stringify(paymentData)}`);
        }

        // 4. If PIX, get QR Code
        let pixData = null;
        if (method === "PIX") {
            const pixResp = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
                headers: { "access_token": ASAAS_API_KEY! },
            });
            pixData = await pixResp.json();
        }

        // 5. Register Transaction in DB
        const { error: txError } = await supabaseClient.from("wallet_transactions").insert({
            store_id: store.id,
            amount: amount,
            type: 'RECHARGE',
            status: 'PENDING',
            payment_method: method,
            asaas_payment_id: paymentData.id,
            asaas_invoice_url: paymentData.invoiceUrl,
            description: paymentBody.description
        });

        if (txError) console.error("Error saving transaction:", txError);

        return new Response(JSON.stringify({
            success: true,
            paymentId: paymentData.id,
            invoiceUrl: paymentData.invoiceUrl,
            pix: pixData
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
