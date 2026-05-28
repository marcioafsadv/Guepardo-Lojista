import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("🚀 Initializing ifood-webhook Edge Function...");

// 1. Inicializa o cliente do Supabase Admin
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// 2. Obtém as credenciais do iFood do ambiente
const IFOOD_CLIENT_ID = Deno.env.get("IFOOD_CLIENT_ID") || "";
const IFOOD_CLIENT_SECRET = Deno.env.get("IFOOD_CLIENT_SECRET") || "";
const IFOOD_BASE_URL = Deno.env.get("IFOOD_API_URL") || "https://merchant-api.ifood.com.br";

// Cache local simples em memória para o token de acesso iFood (dura até 1 hora)
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Obtém ou renova o token de acesso OAuth 2.0 da API do iFood
 */
async function getIFoodAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  if (!IFOOD_CLIENT_ID || !IFOOD_CLIENT_SECRET) {
    throw new Error("Credenciais do iFood (IFOOD_CLIENT_ID / IFOOD_CLIENT_SECRET) não configuradas nas variáveis de ambiente do Supabase.");
  }

  console.log("🔑 Obtendo novo token de acesso no iFood...");
  const params = new URLSearchParams();
  params.append("grantType", "client_credentials");
  params.append("clientId", IFOOD_CLIENT_ID);
  params.append("clientSecret", IFOOD_CLIENT_SECRET);

  const response = await fetch(`${IFOOD_BASE_URL}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na autenticação iFood (HTTP ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.accessToken;
  // Expira um pouco antes dos 3600s para segurança (ex: 55 minutos)
  tokenExpiresAt = Date.now() + (data.expiresIn - 300) * 1000;
  
  return cachedToken!;
}

/**
 * Envia confirmação (acknowledgment) dos eventos recebidos de volta ao iFood
 */
async function acknowledgeEvents(accessToken: string, eventIds: string[]) {
  if (eventIds.length === 0) return;
  
  console.log(`✉️ Enviando confirmação (ack) para ${eventIds.length} eventos no iFood...`);
  try {
    const ackResp = await fetch(`${IFOOD_BASE_URL}/order/v1.0/events/acknowledgment`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventIds.map(id => ({ id }))),
    });
    
    if (!ackResp.ok) {
      console.error(`⚠️ Erro ao enviar confirmação de eventos para o iFood: HTTP ${ackResp.status}`);
    }
  } catch (err) {
    console.error("❌ Falha na conexão de confirmação de eventos:", err);
  }
}

/**
 * Busca os detalhes completos de um pedido no iFood
 */
async function fetchIFoodOrderDetails(accessToken: string, orderId: string): Promise<any> {
  console.log(`🔍 Buscando detalhes do pedido ${orderId} no iFood...`);
  const response = await fetch(`${IFOOD_BASE_URL}/order/v1.0/orders/${orderId}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao buscar detalhes do pedido no iFood: HTTP ${response.status} - ${errText}`);
  }

  return await response.json();
}

/**
 * Processa a lista de eventos recebidos do webhook do iFood
 */
async function processIFoodEvents(events: any[], debugLogs: string[]) {
  debugLogs.push("🔐 Solicitando token de acesso do iFood...");
  const accessToken = await getIFoodAccessToken();
  debugLogs.push("✅ Token de acesso obtido.");
  const eventIdsToAck: string[] = [];

  for (const event of events) {
    const { id: eventId, code, correlationId: orderId, merchantId } = event;
    eventIdsToAck.push(eventId);

    debugLogs.push(`📦 Evento iFood recebido: ${code} (Pedido: ${orderId}, Merchant: ${merchantId})`);

    try {
      debugLogs.push(`🔍 Buscando loja com ifood_merchant_id: ${merchantId}...`);
      const { data: store, error: storeError } = await supabaseAdmin
        .from("stores")
        .select("id, lat, lng, fantasy_name")
        .eq("ifood_merchant_id", merchantId)
        .single();

      if (storeError) {
        debugLogs.push(`⚠️ Erro na consulta de loja: ${storeError.message}`);
      }

      if (storeError || !store) {
        debugLogs.push(`⚠️ Nenhuma loja encontrada com o ifood_merchant_id '${merchantId}'. Ignorando evento.`);
        continue;
      }
      debugLogs.push(`✅ Loja encontrada: ${store.fantasy_name || store.id}`);

      // 2. Tratar eventos específicos
      if (code === "ORDER_CREATED" || code === "PLACED") {
        debugLogs.push(`🔍 Buscando detalhes do pedido ${orderId} no iFood...`);
        const orderDetails = await fetchIFoodOrderDetails(accessToken, orderId);
        debugLogs.push(`✅ Detalhes do pedido obtidos do iFood.`);

        // Mapeia método de pagamento
        let payMethod: "PIX" | "CARD" | "CASH" = "PIX";
        let changeAmount = null;
        if (orderDetails.payments && orderDetails.payments.methods && orderDetails.payments.methods.length > 0) {
          const methodObj = orderDetails.payments.methods[0];
          const methodStr = String(methodObj.method).toUpperCase();
          if (methodStr.includes("CASH") || methodStr.includes("MONEY") || methodStr.includes("DINHEIRO")) {
            payMethod = "CASH";
            changeAmount = methodObj.changeFor || null;
          } else if (methodStr.includes("CARD") || methodStr.includes("CREDIT") || methodStr.includes("DEBIT") || methodStr.includes("CARTAO")) {
            payMethod = "CARD";
          }
        }

        // Mapeia endereço
        const addr = orderDetails.delivery?.deliveryAddress || {};
        const street = addr.streetName || "Endereço Externo";
        const number = addr.streetNumber || "S/N";
        const complement = addr.complement || "";
        const neighborhood = addr.neighborhood || "";
        const city = addr.city || "";
        const state = addr.state || "";
        const cep = addr.postalCode || "";
        const formattedAddress = addr.formattedAddress || `${street}, ${number} - ${neighborhood}, ${city}/${state}`;

        // Mapeia coordenadas
        const destLat = addr.coordinates?.latitude || null;
        const destLng = addr.coordinates?.longitude || null;

        // Mapeia telefone do cliente (iFood mascara, salvamos o que vier)
        const clientPhone = orderDetails.customer?.phone?.number || "";
        const phoneSuffix = clientPhone.length >= 4 ? clientPhone.slice(-4) : "";

        // Valor total e valor cobrado na porta
        const orderValue = orderDetails.payments?.pending || orderDetails.payments?.value || 0;

        // Constrói objeto de items compatível com o Guepardo Lojista
        const itemsPayload = {
          displayId: orderDetails.displayId || orderId.slice(-4),
          addressStreet: street,
          addressNumber: number,
          addressComplement: complement,
          addressNeighborhood: neighborhood,
          addressCity: `${city}/${state}`,
          addressCep: cep,
          deliveryValue: orderValue,
          paymentMethod: payMethod,
          changeFor: changeAmount,
          destinationLat: destLat,
          destinationLng: destLng,
          clientPhone: clientPhone,
          requestSource: "IFOOD",
          isBatch: false,
          scheduledAt: orderDetails.delivery?.deliveredBy ? new Date(orderDetails.delivery.deliveredBy).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null
        };

        // Insere o pedido como Pendente
        debugLogs.push("💾 Inserindo registro do pedido na tabela deliveries...");
        const { error: insertError } = await supabaseAdmin
          .from("deliveries")
          .insert({
            store_id: store.id,
            status: "pending", // Pedido entra como Pendente para aceite manual
            customer_name: orderDetails.customer?.name || "Cliente iFood",
            customer_address: formattedAddress,
            customer_phone_suffix: phoneSuffix || null,
            collection_code: orderDetails.delivery?.pickupCode || orderId.slice(-4),
            earnings: 0, // Será recalculado ao chamar entregador Guepardo
            items: itemsPayload,
            external_source: "IFOOD",
            external_order_id: orderId,
            external_metadata: orderDetails
          });

        if (insertError) {
          debugLogs.push(`❌ Erro ao salvar pedido no Supabase: ${insertError.message}`);
          console.error(`❌ Erro ao salvar pedido do iFood no Supabase:`, insertError.message);
        } else {
          debugLogs.push("✅ Pedido do iFood salvo com sucesso no banco.");
          console.log(`✅ Pedido do iFood ${orderId} salvo com sucesso no banco.`);
        }
      } 
      else if (code === "ORDER_CANCELLED" || code === "CANCELLED" || code === "CANCELLATION_REQUESTED") {
        // Pedido cancelado no iFood
        const { error: cancelError } = await supabaseAdmin
          .from("deliveries")
          .update({ 
            status: "cancelled", 
            cancellation_reason: "Cancelado pelo cliente no iFood" 
          })
          .eq("external_source", "IFOOD")
          .eq("external_order_id", orderId);

        if (cancelError) {
          console.error(`❌ Erro ao cancelar pedido no banco:`, cancelError.message);
        } else {
          console.log(`✅ Pedido do iFood ${orderId} marcado como cancelado.`);
        }
      }
    } catch (err: any) {
      debugLogs.push(`❌ Falha interna no loop do evento ${eventId}: ${err.message}`);
      console.error(`❌ Falha no processamento do evento ${eventId}:`, err.message);
      throw new Error(`Falha no evento ${eventId} (${code}): ${err.message} - Stack: ${err.stack}`);
    }
  }

  // Envia confirmação (Acknowledge) para que o iFood remova esses eventos da fila
  debugLogs.push(`✉️ Confirmando recebimento de ${eventIdsToAck.length} eventos no iFood...`);
  await acknowledgeEvents(accessToken, eventIdsToAck);
  debugLogs.push("✅ Confirmação enviada.");
}

// 3. Servidor HTTP do Deno serve a Edge Function
Deno.serve(async (req: Request) => {
  // Configuração básica do CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Permite requisições GET para verificação de status (health check)
    if (req.method === "GET") {
      return new Response(JSON.stringify({ status: "OK", message: "Guepardo iFood Webhook is active" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Lê o corpo da requisição de forma segura para evitar erros com JSON vazio
    const requestText = await req.text();
    const payload = requestText ? JSON.parse(requestText) : {};

    // Se o payload for vazio (teste de conexão do iFood), retorna 200 OK
    if (Object.keys(payload).length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Connection test successful" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verificação 1: É uma ação originada do Frontend Guepardo Lojista?
    if (payload.action) {
      const { action, orderId, reason } = payload;
      console.log(`🎮 Ação solicitada via Frontend: ${action} para pedido ${orderId}`);
      
      const accessToken = await getIFoodAccessToken();
      let ifoodEndpoint = "";
      let bodyData = null;

      if (action === "confirmOrder") {
        ifoodEndpoint = `${IFOOD_BASE_URL}/order/v1.0/orders/${orderId}/confirm`;
      } else if (action === "dispatchOrder") {
        ifoodEndpoint = `${IFOOD_BASE_URL}/order/v1.0/orders/${orderId}/dispatch`;
      } else if (action === "readyToPickup") {
        ifoodEndpoint = `${IFOOD_BASE_URL}/order/v1.0/orders/${orderId}/readyToPickup`;
      } else if (action === "cancelOrder") {
        ifoodEndpoint = `${IFOOD_BASE_URL}/order/v1.0/orders/${orderId}/requestCancellation`;
        bodyData = {
          reason: reason || "Lojista solicitou o cancelamento",
          cancellationCode: "501" // Código iFood padrão para problemas operacionais / solicitação do lojista
        };
      } else {
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`➡️ Enviando requisição para iFood: ${ifoodEndpoint}`);
      const ifoodResp = await fetch(ifoodEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: bodyData ? JSON.stringify(bodyData) : undefined,
      });

      if (!ifoodResp.ok) {
        const errorDetail = await ifoodResp.text();
        console.error(`❌ Erro retornado pela API do iFood: HTTP ${ifoodResp.status} - ${errorDetail}`);
        return new Response(JSON.stringify({ error: errorDetail }), {
          status: ifoodResp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verificação 2: É um webhook recebido diretamente do iFood?
    // O iFood envia um Array de eventos no body
    if (Array.isArray(payload)) {
      const debugLogs: string[] = [];
      // Processa os eventos e aguarda a conclusão antes de retornar
      await processIFoodEvents(payload, debugLogs);
      
      return new Response(JSON.stringify({ received: true, logs: debugLogs }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Se o payload não é uma ação e nem um array de eventos, assumimos que é uma requisição de teste/handshake do iFood
    console.log("ℹ️ Recebida requisição genérica de handshake/teste. Retornando HTTP 200 OK.");
    return new Response(JSON.stringify({ success: true, message: "Handshake successful" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("❌ Falha crítica no Webhook iFood:", error.message);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
