import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("🚀 Inicializando Anota AI Webhook Edge Function...");

// 1. Inicializa o cliente do Supabase Admin
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Mapbox Token para cálculo preciso de rotas (se disponível)
const MAPBOX_ACCESS_TOKEN = Deno.env.get("MAPBOX_ACCESS_TOKEN") || Deno.env.get("MAPBOX_TOKEN") || "";

/**
 * Cálculo de distância em linha reta via fórmula Haversine (fallback)
 */
function getHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calcula a distância da rota em metros usando Mapbox Directions com fallback para Haversine
 */
async function calculateRouteDistanceMeters(startLat: number, startLng: number, endLat: number, endLng: number): Promise<number> {
  if (MAPBOX_ACCESS_TOKEN) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson&overview=simplified`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data.routes && data.routes.length > 0) {
          return Math.round(data.routes[0].distance);
        }
      }
    } catch (e: any) {
      console.warn("⚠️ Falha na API do Mapbox, usando Haversine:", e.message);
    }
  }
  return getHaversineDistanceMeters(startLat, startLng, endLat, endLng);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-page-id, x-token",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // 1. Healthcheck / Handshake (GET)
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "OK",
          message: "Guepardo Anota AI Webhook está online e pronto para receber pedidos",
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 2. Processa Payload Recebido (POST)
    const requestText = await req.text();
    const payload = requestText ? JSON.parse(requestText) : {};
    console.log("📥 [Anota AI] Webhook recebido:", JSON.stringify(payload));

    // Identificação do token da loja (x-page-id header, query parameter ?token= ou no corpo do payload)
    const storeToken = 
      req.headers.get("x-page-id") || 
      req.headers.get("x-token") || 
      url.searchParams.get("token") || 
      payload.pageId || 
      payload.pageToken || 
      payload.storeToken ||
      payload.merchantId;

    // Busca loja correspondente no Supabase
    let storeQuery = supabaseAdmin
      .from("stores")
      .select("id, lat, lng, fantasy_name, company_name, address, is_open_mode, anotaai_token, anotaai_receiving_orders");

    if (storeToken) {
      storeQuery = storeQuery.eq("anotaai_token", storeToken);
    } else {
      // Se não enviou token específico, busca a primeira loja com anotaai_receiving_orders ativo
      storeQuery = storeQuery.eq("anotaai_receiving_orders", true);
    }

    const { data: stores, error: storeError } = await storeQuery;

    if (storeError || !stores || stores.length === 0) {
      console.warn(`⚠️ [Anota AI] Nenhuma loja encontrada para o token: '${storeToken}'. Ignorando webhook.`);
      return new Response(
        JSON.stringify({ 
          error: "Store not found or token not configured", 
          receivedToken: storeToken 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const store = stores[0];

    if (store.anotaai_receiving_orders === false) {
      console.log(`ℹ️ [Anota AI] Loja ${store.fantasy_name} está com recebimento Anota AI desativado.`);
      return new Response(
        JSON.stringify({ message: "Store has disabled Anota AI orders receiving" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extrai dados do pedido da estrutura da Anota AI
    // Suporta tanto o payload puro de pedido quanto eventos { event: 'orderAccept', order: { ... } }
    const orderData = payload.order || payload;
    const orderId = String(orderData.id || orderData._id || orderData.orderId || `anota-${Date.now()}`);
    const shortRef = String(orderData.shortReference || orderData.displayId || orderId.slice(-4).toUpperCase());

    // Verifica idempotência: se o pedido já existe, não duplica
    const { data: existingDelivery } = await supabaseAdmin
      .from("deliveries")
      .select("id, status")
      .eq("external_source", "ANOTA_AI")
      .eq("external_order_id", orderId)
      .maybeSingle();

    if (existingDelivery) {
      console.log(`ℹ️ [Anota AI] Pedido ${orderId} já existe no banco (ID: ${existingDelivery.id}).`);
      return new Response(
        JSON.stringify({ success: true, message: "Order already registered", deliveryId: existingDelivery.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente
    const customer = orderData.customer || {};
    const clientName = customer.name || "Cliente Anota AI";
    const clientPhone = String(customer.phone || customer.mobile || "");

    // Endereço de Entrega
    const addr = orderData.deliveryAddress || {};
    const street = addr.streetName || addr.street || "Endereço Externo";
    const number = addr.streetNumber || addr.number || "S/N";
    const complement = addr.complement || "";
    const neighborhood = addr.neighborhood || addr.district || "";
    const city = addr.city || "Itu";
    const state = addr.state || "SP";
    const cep = addr.postalCode || addr.zipCode || "";
    const formattedAddress = addr.formattedAddress || `${street}, ${number}${complement ? ` - ${complement}` : ''} - ${neighborhood}, ${city}/${state}`;

    // Coordenadas
    let destLat: number | null = null;
    let destLng: number | null = null;
    if (addr.coordinates) {
      if (typeof addr.coordinates.latitude === "number") {
        destLat = addr.coordinates.latitude;
        destLng = addr.coordinates.longitude;
      } else if (Array.isArray(addr.coordinates) && addr.coordinates.length >= 2) {
        destLng = addr.coordinates[0];
        destLat = addr.coordinates[1];
      }
    }

    // Valor total do pedido
    const orderValue = Number(orderData.total || orderData.orderAmount || orderData.value || 0);

    // Forma de Pagamento
    let payMethod: "PIX" | "CARD" | "CASH" = "PIX";
    let changeFor: number | null = null;
    if (orderData.payments && Array.isArray(orderData.payments) && orderData.payments.length > 0) {
      const p = orderData.payments[0];
      const mStr = String(p.method || p.type || "").toUpperCase();
      if (mStr.includes("MONEY") || mStr.includes("CASH") || mStr.includes("DINHEIRO")) {
        payMethod = "CASH";
        changeFor = p.changeFor ? Number(p.changeFor) : null;
      } else if (mStr.includes("CARD") || mStr.includes("CARTAO") || mStr.includes("CREDIT") || mStr.includes("DEBIT")) {
        payMethod = "CARD";
      }
    }

    // Código de retirada / validação (últimos 4 dígitos do telefone ou da referência)
    const pickupCode = clientPhone.length >= 4 ? clientPhone.slice(-4) : shortRef.slice(-4);

    // Cálculo de Distância e Frete
    let distanceMeters = 0;
    let storeFee = 7.00;
    let courierFee = 6.00;

    if (store.lat && store.lng && destLat && destLng) {
      distanceMeters = await calculateRouteDistanceMeters(store.lat, store.lng, destLat, destLng);
      const variableFee = distanceMeters * 0.00132;
      storeFee = Number((7.00 + variableFee).toFixed(2));

      let returnFee = 0;
      let returnCourierEarnings = 0;
      if (payMethod === "CARD") {
        const returnVariableFee = distanceMeters * 0.00132;
        returnFee = Number(returnVariableFee.toFixed(2));
        returnCourierEarnings = Number((returnVariableFee * 0.875).toFixed(2));
      }

      const courierPart = Number((variableFee * 0.875).toFixed(2));
      courierFee = Number((6.00 + courierPart + returnCourierEarnings).toFixed(2));
      storeFee = Number((storeFee + returnFee).toFixed(2));
    }

    if (store.is_open_mode === true) {
      storeFee = 0;
      courierFee = 0;
    }

    // Itens formatados para o Guepardo Lojista
    const itemsPayload = {
      displayId: shortRef,
      addressStreet: street,
      addressNumber: number,
      addressComplement: complement,
      addressNeighborhood: neighborhood,
      addressCity: `${city}/${state}`,
      addressCep: cep,
      orderSource: "ANOTA_AI",
      customerPhone: clientPhone,
      clientName: clientName,
      items: orderData.items || [],
      receivedAt: new Date().toISOString()
    };

    // Cria a entrega na tabela deliveries do Supabase
    const { data: newDelivery, error: insertError } = await supabaseAdmin
      .from("deliveries")
      .insert({
        store_id: store.id,
        status: "pending",
        destination: formattedAddress,
        destination_lat: destLat,
        destination_lng: destLng,
        client_name: clientName,
        client_phone: clientPhone,
        delivery_value: orderValue,
        payment_method: payMethod,
        change_for: changeFor,
        pickup_code: pickupCode,
        external_source: "ANOTA_AI",
        external_order_id: orderId,
        distance_km: Number((distanceMeters / 1000).toFixed(2)),
        estimated_price: courierFee,
        store_freight: storeFee,
        items: itemsPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ [Anota AI] Erro ao cadastrar entrega no banco:", insertError.message);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ [Anota AI] Pedido #${shortRef} (${orderId}) cadastrado com sucesso para ${store.fantasy_name}!`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order successfully imported to Guepardo Delivery",
        deliveryId: newDelivery.id,
        displayId: shortRef,
        store: store.fantasy_name
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("💥 [Anota AI] Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
