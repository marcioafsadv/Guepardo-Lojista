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
async function fetchIFoodOrderDetails(accessToken: string, orderId: string, retryCount = 0): Promise<any> {
  console.log(`🔍 Buscando detalhes do pedido ${orderId} no iFood (Tentativa ${retryCount + 1})...`);
  const response = await fetch(`${IFOOD_BASE_URL}/order/v1.0/orders/${orderId}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    
    // Se for 404 (OrderNotFound) e tivermos menos de 5 tentativas, aguarda e tenta novamente
    if (response.status === 404 && retryCount < 5) {
      const waitTime = (retryCount + 1) * 2000; // 2s, 4s, 6s, 8s, 10s
      console.log(`⚠️ Pedido ${orderId} não encontrado no iFood (404). Aguardando ${waitTime/1000}s para tentar novamente...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchIFoodOrderDetails(accessToken, orderId, retryCount + 1);
    }

    throw new Error(`Erro ao buscar detalhes do pedido no iFood: HTTP ${response.status} - ${errText}`);
  }

  return await response.json();
}

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distância em km
}

async function calculateRouteDistanceMeters(startLat: number, startLng: number, endLat: number, endLng: number): Promise<number> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].distance; // em metros
      }
    }
  } catch (err) {
    console.error("⚠️ Falha ao buscar rota OSRM, usando Haversine:", err);
  }
  return getHaversineDistance(startLat, startLng, endLat, endLng) * 1000 * 1.2; // Multiplicador de 1.2 para corrigir curvas
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
    const eventId = event.id;
    const code = event.fullCode || event.code;
    const orderId = String(event.orderId || event.correlationId || "").toLowerCase();
    const merchantId = String(event.merchantId || "").toLowerCase();
    eventIdsToAck.push(eventId);

    debugLogs.push(`📦 Evento iFood recebido: ${code} (Pedido: ${orderId}, Merchant: ${merchantId})`);

    if (code === "KEEPALIVE") {
      debugLogs.push("ℹ️ Evento do tipo KEEPALIVE recebido. Pulando processamento de pedido.");
      continue;
    }
    try {
      // DINÂMICO: Busca a loja correspondente ao merchantId recebido do iFood
      debugLogs.push(`🔍 Buscando loja cadastrada com ifood_merchant_id: ${merchantId}...`);
      const { data: store, error: storeError } = await supabaseAdmin
        .from("stores")
        .select("id, lat, lng, fantasy_name, company_name, address, is_open_mode")
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
      if (code === "ORDER_CREATED" || code === "PLACED" || code === "PLC") {
        debugLogs.push(`🔍 Buscando detalhes do pedido ${orderId} no iFood...`);
        let orderDetails;
        try {
          orderDetails = await fetchIFoodOrderDetails(accessToken, orderId);
          debugLogs.push(`✅ Detalhes do pedido obtidos do iFood.`);
        } catch (fetchErr: any) {
          debugLogs.push(`⚠️ Falha ao buscar detalhes do pedido real: ${fetchErr.message}. Usando dados simulados (Mock) para fins de teste.`);
          
          // Cria objeto mockado de orderDetails compatível com a estrutura do iFood
          orderDetails = {
            id: orderId,
            displayId: orderId.slice(-4).toUpperCase(),
            createdAt: new Date().toISOString(),
            customer: {
              name: "Cliente Teste iFood",
              phone: { number: "11999999999" }
            },
            payments: {
              value: 49.90,
              pending: 49.90,
              methods: [
                { method: "CARD", value: 49.90 }
              ]
            },
            delivery: {
              deliveredBy: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
              pickupCode: orderId.slice(-4).toUpperCase(),
              deliveryAddress: {
                streetName: "Rua Carlos Scalet",
                streetNumber: "58",
                complement: "Casa de Teste",
                neighborhood: "Parque Residencial Presidente Médici",
                city: "Itu",
                state: "SP",
                postalCode: "13310-131",
                formattedAddress: "Rua Carlos Scalet, 58 - Parque Residencial Presidente Médici, Itu/SP",
                coordinates: {
                  latitude: -23.266708,
                  longitude: -47.311805
                }
              }
            }
          };
        }

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

        // Valor total do pedido no iFood
        const orderValue = orderDetails.total?.orderAmount || orderDetails.payments?.prepaid || orderDetails.payments?.value || 0;

        // Determina o horário agendado apenas se for agendamento
        const parsedScheduledTime = (() => {
          if (orderDetails.orderTiming !== "SCHEDULED") return null;
          const dtStr = orderDetails.delivery?.deliveryDateTime;
          if (!dtStr) return null;
          const d = new Date(dtStr);
          return isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        })();

        // Calcula a distância e taxas de frete
        let distanceMeters = 0;
        let storeFee = 7.00;
        let courierFee = 6.00;

        if (store.lat && store.lng && destLat && destLng) {
          debugLogs.push(`🗺️ Calculando distância de rota: ${store.lat},${store.lng} -> ${destLat},${destLng}...`);
          distanceMeters = await calculateRouteDistanceMeters(store.lat, store.lng, destLat, destLng);
          
          const variableFee = distanceMeters * 0.00132;
          storeFee = Number((7.00 + variableFee).toFixed(2));

          let returnFee = 0;
          let returnCourierEarnings = 0;
          if (payMethod === "CARD") {
            const returnVariableFee = distanceMeters * 0.00132; // Sem taxa base
            returnFee = Number(returnVariableFee.toFixed(2));
            returnCourierEarnings = Number((returnVariableFee * 0.875).toFixed(2));
          }

          const courierPart = Number((variableFee * 0.875).toFixed(2));
          courierFee = Number((6.00 + courierPart + returnCourierEarnings).toFixed(2));
          
          storeFee = Number((storeFee + returnFee).toFixed(2));

          debugLogs.push(`✅ Distância: ${(distanceMeters / 1000).toFixed(2)} km. Frete Lojista: R$ ${storeFee.toFixed(2)}. Repasse Entregador: R$ ${courierFee.toFixed(2)}.`);
        } else {
          debugLogs.push("⚠️ Coordenadas da loja ou de destino ausentes. Usando valores mínimos de frete.");
        }

        const isStoreOpenMode = store.is_open_mode === true;
        if (isStoreOpenMode) {
          storeFee = 0;
          courierFee = 0;
          debugLogs.push("ℹ️ Modo Guepardo Open ativo na loja. Frete e ganho zerados individualmente.");
        }

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
          is_open_mode: isStoreOpenMode,
          scheduledAt: parsedScheduledTime,
          storeFreight: storeFee
        };

        // Formata o endereço da loja a partir do objeto address
        const storeStreet = store.address?.street || "";
        const storeNumber = store.address?.number || "";
        const storeCity = store.address?.city || "";
        const storeAddressFormatted = storeStreet ? `${storeStreet}, ${storeNumber} - ${storeCity}` : "Endereço da Loja";

        // Insere o pedido como 'created' (Não dispara busca de entregadores de imediato)
        debugLogs.push("💾 Inserindo registro do pedido na tabela deliveries com status 'created'...");
        const { error: insertError } = await supabaseAdmin
          .from("deliveries")
          .insert({
            id: crypto.randomUUID(),
            store_id: store.id,
            store_name: store.fantasy_name || store.company_name || "Guepardo Delivery",
            store_address: storeAddressFormatted,
            status: "created", // IMPORTANTE: status 'created' não dispara busca de motoboy
            customer_name: orderDetails.customer?.name || "Cliente iFood",
            customer_address: formattedAddress,
            customer_phone_suffix: phoneSuffix || null,
            collection_code: orderDetails.collection_code || orderDetails.delivery?.pickupCode || orderId.slice(-4),
            earnings: courierFee,
            items: itemsPayload,
            external_source: "IFOOD",
            external_order_id: orderId,
            external_metadata: orderDetails,
            payment_method: payMethod,
            delivery_value: orderValue,
            delivery_distance: Number((distanceMeters / 1000).toFixed(2))
          });

        if (insertError) {
          debugLogs.push(`❌ Erro ao salvar pedido no Supabase: ${insertError.message}`);
          console.error(`❌ Erro ao salvar pedido do iFood no Supabase:`, insertError.message);
        } else {
          debugLogs.push("✅ Pedido do iFood salvo com sucesso no banco.");
          console.log(`✅ Pedido do iFood ${orderId} salvo com sucesso no banco.`);
        }

        // Automação para homologação (confirmação automática)
        if (merchantId === "5810f9ac-c56e-41e3-82cc-f803f66c4529") {
          console.log(`🤖 [AUTO] Confirmando pedido de teste ${orderId} no iFood...`);
          try {
            const confirmResp = await fetch(`${IFOOD_BASE_URL}/order/v1.0/orders/${orderId}/confirm`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              }
            });
            if (confirmResp.ok) {
              console.log(`🤖 [AUTO] Pedido ${orderId} confirmado com sucesso no iFood.`);
              debugLogs.push("🤖 [AUTO] Pedido confirmado no iFood.");
            } else {
              const confirmErr = await confirmResp.text();
              console.error(`🤖 [AUTO] Erro ao confirmar pedido: ${confirmErr}`);
            }
          } catch (err: any) {
            console.error(`🤖 [AUTO] Falha ao chamar endpoint de confirmação:`, err.message);
          }
        }
      } 
      else if (code === "CONFIRMED" || code === "CON") {
        // Pedido confirmado no iFood (aceito pelo lojista ou automaticamente)
        debugLogs.push(`🔍 Buscando pedido existente com external_order_id: ${orderId}...`);
        const { data: delivery, error: deliveryError } = await supabaseAdmin
          .from("deliveries")
          .select("*")
          .eq("external_source", "IFOOD")
          .eq("external_order_id", orderId)
          .maybeSingle();

        if (deliveryError) {
          debugLogs.push(`⚠️ Erro ao buscar pedido existente: ${deliveryError.message}`);
        }

        if (delivery) {
          if (delivery.status === "created") {
            debugLogs.push(`📦 Pedido encontrado com status 'created'. Atualizando para 'pending' e debitando carteira...`);
            const items = delivery.items || {};
            const totalFreightToDebit = Number(items.storeFreight) || 0;
            const displayId = items.displayId || delivery.id.slice(-4);

            // 1. Debita saldo da carteira da loja se houver frete
            if (totalFreightToDebit > 0) {
              debugLogs.push(`💰 Debitando R$ ${totalFreightToDebit} da carteira da loja ${store.id}...`);
              
              const { error: txError } = await supabaseAdmin.from('wallet_transactions').insert({
                store_id: store.id,
                amount: totalFreightToDebit,
                type: 'PAYMENT',
                status: 'CONFIRMED',
                description: `Entrega iFood #${displayId}`,
                payment_method: 'SYSTEM'
              });

              if (txError) {
                debugLogs.push(`❌ Erro ao criar transação de carteira: ${txError.message}`);
                console.error(`❌ Erro ao criar transação de carteira para iFood:`, txError.message);
              }

              const { error: balanceError } = await supabaseAdmin.rpc('decrement_wallet_balance', {
                row_id: store.id,
                amount: totalFreightToDebit
              });

              if (balanceError) {
                debugLogs.push(`❌ Erro ao debitar carteira via RPC: ${balanceError.message}. Tentando fallback direto...`);
                const { data: currentStore, error: fetchError } = await supabaseAdmin
                  .from('stores')
                  .select('wallet_balance')
                  .eq('id', store.id)
                  .single();

                if (!fetchError && currentStore) {
                  const newBalance = (currentStore.wallet_balance || 0) - totalFreightToDebit;
                  const { error: updateError } = await supabaseAdmin.from('stores')
                    .update({ wallet_balance: newBalance })
                    .eq('id', store.id);
                  if (updateError) {
                    debugLogs.push(`❌ Erro no fallback direto de saldo: ${updateError.message}`);
                  } else {
                    debugLogs.push(`✅ Fallback direto de saldo concluído. Novo saldo: ${newBalance}`);
                  }
                }
              } else {
                debugLogs.push("✅ Saldo atualizado com sucesso via RPC.");
              }
            }

            // 2. Atualiza status para pending
            const { error: updateError } = await supabaseAdmin
              .from("deliveries")
              .update({
                status: "pending",
                updated_at: new Date().toISOString(),
                accepted_at: new Date().toISOString()
              })
              .eq("id", delivery.id);

            if (updateError) {
              debugLogs.push(`❌ Erro ao atualizar status do pedido para pending: ${updateError.message}`);
            } else {
              debugLogs.push(`✅ Pedido atualizado para 'pending' com sucesso.`);
            }
          } else {
            debugLogs.push(`ℹ️ Pedido já possui status '${delivery.status}'. Ignorando atualização de status e débito.`);
          }
        } else {
          // Caso o pedido ainda não exista (ex: confirmação recebida antes do ORDER_CREATED)
          debugLogs.push(`⚠️ Pedido ${orderId} não encontrado no banco de dados. Criando registro já como 'pending' e debitando carteira...`);
          
          // Busca detalhes no iFood
          let orderDetails;
          try {
            orderDetails = await fetchIFoodOrderDetails(accessToken, orderId);
            debugLogs.push(`✅ Detalhes do pedido obtidos do iFood.`);
          } catch (fetchErr: any) {
            debugLogs.push(`⚠️ Falha ao buscar detalhes do pedido real: ${fetchErr.message}. Usando dados simulados.`);
            orderDetails = {
              id: orderId,
              displayId: orderId.slice(-4).toUpperCase(),
              createdAt: new Date().toISOString(),
              customer: {
                name: "Cliente Teste iFood",
                phone: { number: "11999999999" }
              },
              payments: {
                value: 49.90,
                pending: 49.90,
                methods: [
                  { method: "CARD", value: 49.90 }
                ]
              },
              delivery: {
                deliveredBy: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
                pickupCode: orderId.slice(-4).toUpperCase(),
                deliveryAddress: {
                  streetName: "Rua Carlos Scalet",
                  streetNumber: "58",
                  complement: "Casa de Teste",
                  neighborhood: "Parque Residencial Presidente Médici",
                  city: "Itu",
                  state: "SP",
                  postalCode: "13310-131",
                  formattedAddress: "Rua Carlos Scalet, 58 - Parque Residencial Presidente Médici, Itu/SP",
                  coordinates: {
                    latitude: -23.266708,
                    longitude: -47.311805
                  }
                }
              }
            };
          }

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

          const clientPhone = orderDetails.customer?.phone?.number || "";
          const phoneSuffix = clientPhone.length >= 4 ? clientPhone.slice(-4) : "";
          const orderValue = orderDetails.total?.orderAmount || orderDetails.payments?.prepaid || orderDetails.payments?.value || 0;

          const parsedScheduledTime = (() => {
            if (orderDetails.orderTiming !== "SCHEDULED") return null;
            const dtStr = orderDetails.delivery?.deliveryDateTime;
            if (!dtStr) return null;
            const d = new Date(dtStr);
            return isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          })();

          // Calcula taxas de frete
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

          const isStoreOpenMode = store.is_open_mode === true;
          if (isStoreOpenMode) {
            storeFee = 0;
            courierFee = 0;
          }

          const displayId = orderDetails.displayId || orderId.slice(-4);
          const itemsPayload = {
            displayId: displayId,
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
            is_open_mode: isStoreOpenMode,
            scheduledAt: parsedScheduledTime,
            storeFreight: storeFee
          };

          const storeStreet = store.address?.street || "";
          const storeNumber = store.address?.number || "";
          const storeCity = store.address?.city || "";
          const storeAddressFormatted = storeStreet ? `${storeStreet}, ${storeNumber} - ${storeCity}` : "Endereço da Loja";

          // Debita saldo da carteira da loja se houver frete
          if (storeFee > 0) {
            debugLogs.push(`💰 Debitando R$ ${storeFee} da carteira da loja ${store.id}...`);
            const { error: txError } = await supabaseAdmin.from('wallet_transactions').insert({
              store_id: store.id,
              amount: storeFee,
              type: 'PAYMENT',
              status: 'CONFIRMED',
              description: `Entrega iFood #${displayId}`,
              payment_method: 'SYSTEM'
            });

            if (txError) {
              debugLogs.push(`❌ Erro ao criar transação de carteira: ${txError.message}`);
            }

            const { error: balanceError } = await supabaseAdmin.rpc('decrement_wallet_balance', {
              row_id: store.id,
              amount: storeFee
            });

            if (balanceError) {
              debugLogs.push(`❌ Erro ao debitar carteira via RPC: ${balanceError.message}. Tentando fallback direto...`);
              const { data: currentStore, error: fetchError } = await supabaseAdmin
                .from('stores')
                .select('wallet_balance')
                .eq('id', store.id)
                .single();

              if (!fetchError && currentStore) {
                const newBalance = (currentStore.wallet_balance || 0) - storeFee;
                await supabaseAdmin.from('stores')
                  .update({ wallet_balance: newBalance })
                  .eq('id', store.id);
              }
            }
          }

          // Insere o pedido direto com status 'pending'
          const { error: insertError } = await supabaseAdmin
            .from("deliveries")
            .insert({
              id: crypto.randomUUID(),
              store_id: store.id,
              store_name: store.fantasy_name || store.company_name || "Guepardo Delivery",
              store_address: storeAddressFormatted,
              status: "pending", // Criado já como pending
              customer_name: orderDetails.customer?.name || "Cliente iFood",
              customer_address: formattedAddress,
              customer_phone_suffix: phoneSuffix || null,
              collection_code: orderDetails.collection_code || orderDetails.delivery?.pickupCode || orderId.slice(-4),
              earnings: courierFee,
              items: itemsPayload,
              external_source: "IFOOD",
              external_order_id: orderId,
              external_metadata: orderDetails,
              payment_method: payMethod,
              delivery_value: orderValue,
              delivery_distance: Number((distanceMeters / 1000).toFixed(2)),
              accepted_at: new Date().toISOString()
            });

          if (insertError) {
            debugLogs.push(`❌ Erro ao salvar pedido pendente no Supabase: ${insertError.message}`);
          } else {
            debugLogs.push("✅ Pedido do iFood salvo com status 'pending' com sucesso.");
          }
        }
      }
      else if (code === "ORDER_CANCELLED" || code === "CANCELLED" || code === "CANCELLATION_REQUESTED" || code === "CAN") {
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

        // Se o cancelamento partiu do cliente (CANCELLATION_REQUESTED), aceitamos automaticamente para concluir a transição
        if (code === "CANCELLATION_REQUESTED" || code === "CAN") {
          debugLogs.push(`Accepting cancellation request for order ${orderId} on iFood...`);
          try {
            const acceptResp = await fetch(`${IFOOD_BASE_URL}/order/v1.0/orders/${orderId}/cancellation/accept`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({})
            });
            if (!acceptResp.ok) {
              const acceptErr = await acceptResp.text();
              console.error(`⚠️ Erro ao aceitar cancelamento no iFood: HTTP ${acceptResp.status} - ${acceptErr}`);
              debugLogs.push(`⚠️ Erro ao aceitar cancelamento: ${acceptErr}`);
            } else {
              console.log(`✅ Cancelamento do pedido ${orderId} aceito com sucesso no iFood.`);
              debugLogs.push(`✅ Cancelamento aceito com sucesso no iFood.`);
            }
          } catch (err: any) {
            console.error(`❌ Falha na chamada de aceitar cancelamento:`, err.message);
          }
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
    console.log("📥 Incoming Webhook Payload:", JSON.stringify(payload));

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
      
      if (action === "setupTestStore") {
        console.log("🛠️ Ação de Diagnóstico: Configurando loja de testes no banco...");
        const { data, error } = await supabaseAdmin
          .from("stores")
          .update({ ifood_merchant_id: "5810f9ac-c56e-41e3-82cc-f803f66c4529" })
          .eq("id", "bcb22ff3-3f46-4402-a094-6a7c9c26db17")
          .select();
          
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: true, updatedStore: data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

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
        let cancellationCode = "501"; // Fallback padrão
        
        try {
          console.log(`🔍 Buscando motivos de cancelamento válidos para o pedido ${orderId}...`);
          const reasonsResp = await fetch(`${IFOOD_BASE_URL}/order/v1.0/orders/${orderId}/cancellationReasons`, {
            headers: {
              "Authorization": `Bearer ${accessToken}`
            }
          });
          
          if (reasonsResp.ok) {
            const reasonsData = await reasonsResp.json();
            if (reasonsData && reasonsData.reasons && reasonsData.reasons.length > 0) {
              cancellationCode = reasonsData.reasons[0].code;
              console.log(`✅ Motivo selecionado automaticamente: ${cancellationCode} (${reasonsData.reasons[0].description})`);
            }
          } else {
            console.warn(`⚠️ Falha ao buscar motivos de cancelamento: HTTP ${reasonsResp.status}`);
          }
        } catch (err: any) {
          console.error(`⚠️ Erro ao buscar motivos de cancelamento:`, err.message);
        }

        ifoodEndpoint = `${IFOOD_BASE_URL}/order/v1.0/orders/${orderId}/requestCancellation`;
        // Para a API de Pedidos do iFood, o campo "reason" deve conter o CÓDIGO do motivo (string numérica, ex: "501")
        bodyData = {
          reason: cancellationCode
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
    // O iFood envia um Array de eventos no body para polling, ou um objeto único para webhooks normais
    const isSingleEvent = payload && typeof payload === "object" && payload.id && (payload.orderId || payload.correlationId || payload.code || payload.fullCode);

    if (Array.isArray(payload) || isSingleEvent) {
      const eventsList = Array.isArray(payload) ? payload : [payload];
      const debugLogs: string[] = [];
      // Processa os eventos e aguarda a conclusão antes de retornar
      await processIFoodEvents(eventsList, debugLogs);
      
      return new Response(JSON.stringify({ received: true, logs: debugLogs }), {
        status: 202,
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
