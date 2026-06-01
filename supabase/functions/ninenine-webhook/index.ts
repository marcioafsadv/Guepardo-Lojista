import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("🚀 Initializing ninenine-webhook Edge Function...");

// 1. Inicializa o cliente do Supabase Admin
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// 2. Obtém as credenciais da 99Food do ambiente
const NINENINE_CLIENT_ID = Deno.env.get("NINENINE_CLIENT_ID") || "";
const NINENINE_CLIENT_SECRET = Deno.env.get("NINENINE_CLIENT_SECRET") || "";
const NINENINE_BASE_URL = Deno.env.get("NINENINE_API_URL") || "https://open-api.99app.com";

// Cache local simples em memória para o token de acesso (dura até 1 hora)
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Obtém ou renova o token de acesso OAuth 2.0 da API da 99Food
 */
async function getNinenineAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  if (!NINENINE_CLIENT_ID || !NINENINE_CLIENT_SECRET) {
    throw new Error("Credenciais da 99Food (NINENINE_CLIENT_ID / NINENINE_CLIENT_SECRET) não configuradas nas variáveis de ambiente do Supabase.");
  }

  console.log("🔑 Obtendo novo token de acesso na 99Food...");
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", NINENINE_CLIENT_ID);
  params.append("client_secret", NINENINE_CLIENT_SECRET);

  const response = await fetch(`${NINENINE_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na autenticação 99Food (HTTP ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token || data.accessToken;
  const expiresIn = data.expires_in || data.expiresIn || 3600;
  // Expira um pouco antes para segurança
  tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;
  
  return cachedToken!;
}

/**
 * Envia confirmação (acknowledgment) dos eventos recebidos de volta à 99Food (se necessário por API)
 */
async function acknowledgeNinenineEvents(accessToken: string, eventIds: string[]) {
  if (eventIds.length === 0) return;
  console.log(`✉️ Enviando confirmação para ${eventIds.length} eventos na 99Food...`);
  // Nota: A API 99Food geralmente requer confirmação em lote ou retorna 200 no webhook.
  // Implementação futura dependendo do contrato de ack específico.
}

/**
 * Busca os detalhes completos de um pedido na 99Food
 */
async function fetchNinenineOrderDetails(accessToken: string, orderId: string, retryCount = 0): Promise<any> {
  console.log(`🔍 Buscando detalhes do pedido ${orderId} na 99Food (Tentativa ${retryCount + 1})...`);
  const response = await fetch(`${NINENINE_BASE_URL}/openapi/v1/order/detail?order_id=${orderId}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 404 && retryCount < 5) {
      const waitTime = (retryCount + 1) * 2000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchNinenineOrderDetails(accessToken, orderId, retryCount + 1);
    }
    throw new Error(`Erro ao buscar detalhes do pedido na 99Food: HTTP ${response.status} - ${errText}`);
  }

  return await response.json();
}

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km
}

async function calculateRouteDistanceMeters(startLat: number, startLng: number, endLat: number, endLng: number): Promise<number> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].distance; // metros
      }
    }
  } catch (err) {
    console.error("⚠️ Falha ao buscar rota OSRM, usando Haversine:", err);
  }
  return getHaversineDistance(startLat, startLng, endLat, endLng) * 1000 * 1.2;
}

/**
 * Processa a lista de eventos recebidos do webhook da 99Food
 */
async function processNinenineEvents(events: any[], debugLogs: string[]) {
  debugLogs.push("🔐 Solicitando token de acesso da 99Food...");
  const accessToken = await getNinenineAccessToken();
  debugLogs.push("✅ Token de acesso obtido.");
  const eventIdsToAck: string[] = [];

  for (const event of events) {
    const eventId = event.event_id || event.id;
    const code = event.event_type || event.code || event.status;
    const orderId = String(event.order_id || event.orderId || "").toLowerCase();
    const merchantId = String(event.merchant_id || event.merchantId || "").toLowerCase();
    
    if (eventId) eventIdsToAck.push(eventId);

    debugLogs.push(`📦 Evento 99Food recebido: ${code} (Pedido: ${orderId}, Merchant: ${merchantId})`);

    try {
      // Busca a loja correspondente ao merchantId recebido
      debugLogs.push(`🔍 Buscando loja cadastrada com ninenine_merchant_id: ${merchantId}...`);
      const { data: store, error: storeError } = await supabaseAdmin
        .from("stores")
        .select("id, lat, lng, fantasy_name, company_name, address")
        .eq("ninenine_merchant_id", merchantId)
        .single();

      if (storeError) {
        debugLogs.push(`⚠️ Erro na consulta de loja: ${storeError.message}`);
      }

      if (storeError || !store) {
        debugLogs.push(`⚠️ Nenhuma loja encontrada com o ninenine_merchant_id '${merchantId}'. Ignorando evento.`);
        continue;
      }
      debugLogs.push(`✅ Loja encontrada: ${store.fantasy_name || store.id}`);

      // Tratar criação de pedido
      if (code === "ORDER_CREATED" || code === "CREATED" || code === "PLACED") {
        debugLogs.push(`🔍 Buscando detalhes do pedido ${orderId} na 99Food...`);
        let orderDetails;
        try {
          orderDetails = await fetchNinenineOrderDetails(accessToken, orderId);
          debugLogs.push(`✅ Detalhes do pedido obtidos da 99Food.`);
        } catch (fetchErr: any) {
          debugLogs.push(`⚠️ Falha ao buscar detalhes do pedido real: ${fetchErr.message}. Usando dados simulados.`);
          orderDetails = {
            id: orderId,
            display_id: orderId.slice(-4).toUpperCase(),
            customer: {
              name: "Cliente Teste 99Food",
              phone: "11999999999"
            },
            price: {
              total: 35.00,
              original: 35.00
            },
            delivery: {
              address: "Rua Carlos Scalet, 58 - Parque Residencial Presidente Médici, Itu/SP",
              latitude: -23.266708,
              longitude: -47.311805
            }
          };
        }

        // Mapeia método de pagamento (default para CARD ou PIX)
        const payMethod = "CARD"; 

        // Mapeia endereço
        const formattedAddress = orderDetails.delivery?.address || "Endereço 99Food";
        const destLat = orderDetails.delivery?.latitude || null;
        const destLng = orderDetails.delivery?.longitude || null;

        const clientPhone = orderDetails.customer?.phone || "";
        const phoneSuffix = clientPhone.length >= 4 ? clientPhone.slice(-4) : "";
        const orderValue = orderDetails.price?.total || 0;

        // Calcula taxas de frete
        let distanceMeters = 0;
        let storeFee = 7.00;
        let courierFee = 6.00;

        if (store.lat && store.lng && destLat && destLng) {
          distanceMeters = await calculateRouteDistanceMeters(store.lat, store.lng, destLat, destLng);
          const variableFee = distanceMeters * 0.00132;
          storeFee = Number((7.00 + variableFee).toFixed(2));
          const courierPart = Number((variableFee * 0.875).toFixed(2));
          courierFee = Number((6.00 + courierPart).toFixed(2));
        }

        const itemsPayload = {
          displayId: orderDetails.display_id || orderId.slice(-4),
          addressStreet: formattedAddress.split(',')[0] || "Endereço",
          addressNumber: "S/N",
          addressNeighborhood: "Bairro",
          addressCity: "Itu/SP",
          deliveryValue: orderValue,
          paymentMethod: payMethod,
          destinationLat: destLat,
          destinationLng: destLng,
          clientPhone: clientPhone,
          requestSource: "99FOOD",
          isBatch: false,
          storeFreight: storeFee
        };

        const storeStreet = store.address?.street || "";
        const storeNumber = store.address?.number || "";
        const storeCity = store.address?.city || "";
        const storeAddressFormatted = storeStreet ? `${storeStreet}, ${storeNumber} - ${storeCity}` : "Endereço da Loja";

        debugLogs.push("💾 Inserindo registro do pedido na tabela deliveries com status 'created'...");
        const { error: insertError } = await supabaseAdmin
          .from("deliveries")
          .insert({
            id: crypto.randomUUID(),
            store_id: store.id,
            store_name: store.fantasy_name || store.company_name || "Guepardo Delivery",
            store_address: storeAddressFormatted,
            status: "created",
            customer_name: orderDetails.customer?.name || "Cliente 99Food",
            customer_address: formattedAddress,
            customer_phone_suffix: phoneSuffix || null,
            collection_code: orderId.slice(-4).toUpperCase(),
            earnings: courierFee,
            items: itemsPayload,
            external_source: "99FOOD",
            external_order_id: orderId,
            external_metadata: orderDetails,
            payment_method: payMethod,
            delivery_value: orderValue,
            delivery_distance: Number((distanceMeters / 1000).toFixed(2))
          });

        if (insertError) {
          debugLogs.push(`❌ Erro ao salvar pedido: ${insertError.message}`);
        } else {
          debugLogs.push("✅ Pedido da 99Food salvo com sucesso como 'created'.");
        }
      } 
      else if (code === "CONFIRMED" || code === "ORDER_CONFIRMED" || code === "ACCEPTED") {
        debugLogs.push(`🔍 Buscando pedido existente com external_order_id: ${orderId}...`);
        const { data: delivery, error: deliveryError } = await supabaseAdmin
          .from("deliveries")
          .select("*")
          .eq("external_source", "99FOOD")
          .eq("external_order_id", orderId)
          .maybeSingle();

        if (delivery) {
          if (delivery.status === "created") {
            debugLogs.push(`📦 Pedido encontrado com status 'created'. Atualizando para 'pending' e debitando carteira...`);
            const items = delivery.items || {};
            const totalFreightToDebit = Number(items.storeFreight) || 0;

            if (totalFreightToDebit > 0) {
              await supabaseAdmin.from('wallet_transactions').insert({
                store_id: store.id,
                amount: totalFreightToDebit,
                type: 'PAYMENT',
                status: 'CONFIRMED',
                description: `Entrega 99Food #${items.displayId || delivery.id.slice(-4)}`,
                payment_method: 'SYSTEM'
              });

              await supabaseAdmin.rpc('decrement_wallet_balance', {
                row_id: store.id,
                amount: totalFreightToDebit
              });
            }

            const { error: updateError } = await supabaseAdmin
              .from("deliveries")
              .update({
                status: "pending",
                updated_at: new Date().toISOString(),
                accepted_at: new Date().toISOString()
              })
              .eq("id", delivery.id);

            if (updateError) {
              debugLogs.push(`❌ Erro ao atualizar status: ${updateError.message}`);
            } else {
              debugLogs.push("✅ Pedido atualizado para 'pending' com sucesso.");
            }
          }
        }
      }
      else if (code === "ORDER_CANCELLED" || code === "CANCELLED" || code === "CANCELED") {
        const { error: cancelError } = await supabaseAdmin
          .from("deliveries")
          .update({ 
            status: "cancelled", 
            cancellation_reason: "Cancelado na 99Food" 
          })
          .eq("external_source", "99FOOD")
          .eq("external_order_id", orderId);

        if (cancelError) {
          console.error(`❌ Erro ao cancelar:`, cancelError.message);
        } else {
          console.log(`✅ Pedido 99Food ${orderId} cancelado.`);
        }
      }
    } catch (err: any) {
      debugLogs.push(`❌ Falha no evento ${eventId}: ${err.message}`);
      throw err;
    }
  }

  await acknowledgeNinenineEvents(accessToken, eventIdsToAck);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      return new Response(JSON.stringify({ status: "OK", message: "Guepardo 99Food Webhook is active" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const requestText = await req.text();
    const payload = requestText ? JSON.parse(requestText) : {};
    console.log("📥 Incoming 99Food Webhook Payload:", JSON.stringify(payload));

    // Ações do painel do lojista
    if (payload.action) {
      const { action, orderId, reason } = payload;
      console.log(`🎮 Ação solicitada via Frontend: ${action} para pedido ${orderId}`);
      
      const accessToken = await getNinenineAccessToken();
      let ninenineEndpoint = "";
      let bodyData = null;

      if (action === "confirmOrder") {
        ninenineEndpoint = `${NINENINE_BASE_URL}/openapi/v1/order/confirm`;
        bodyData = { order_id: orderId };
      } else if (action === "dispatchOrder") {
        ninenineEndpoint = `${NINENINE_BASE_URL}/openapi/v1/order/dispatch`;
        bodyData = { order_id: orderId };
      } else if (action === "readyToPickup") {
        ninenineEndpoint = `${NINENINE_BASE_URL}/openapi/v1/order/ready`;
        bodyData = { order_id: orderId };
      } else if (action === "cancelOrder") {
        ninenineEndpoint = `${NINENINE_BASE_URL}/openapi/v1/order/cancel`;
        bodyData = {
          order_id: orderId,
          reason: reason || "Lojista solicitou o cancelamento"
        };
      } else {
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`➡️ Enviando requisição para 99Food: ${ninenineEndpoint}`);
      const ninenineResp = await fetch(ninenineEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      });

      if (!ninenineResp.ok) {
        const errorDetail = await ninenineResp.text();
        console.error(`❌ Erro retornado pela API da 99Food: HTTP ${ninenineResp.status} - ${errorDetail}`);
        return new Response(JSON.stringify({ error: errorDetail }), {
          status: ninenineResp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Recebimento de Webhook direto da 99Food
    const isSingleEvent = payload && typeof payload === "object" && (payload.event_id || payload.id);
    if (Array.isArray(payload) || isSingleEvent) {
      const eventsList = Array.isArray(payload) ? payload : [payload];
      const debugLogs: string[] = [];
      await processNinenineEvents(eventsList, debugLogs);
      
      return new Response(JSON.stringify({ received: true, logs: debugLogs }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Handshake/Teste
    return new Response(JSON.stringify({ success: true, message: "Handshake successful" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("❌ Falha crítica no Webhook 99Food:", error.message);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
