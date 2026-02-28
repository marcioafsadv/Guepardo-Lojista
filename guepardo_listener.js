import { createServer } from 'http';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Configurações do Supabase
const SUPABASE_URL = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const SUPABASE_KEY = 'sb_secret_qHGa2O1Tfmcf_KesbX0HMg_LqX78sjL';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configurações da Loja
const STORE_ID = '5b4ce4be-c8cb-4cee-a0cd-ca6edce71901';
const STORE_NAME = 'Torres & Silva';
const STORE_ADDRESS = 'Rua dos Andradas, 468 - Itu';
const STORE_LAT = -23.2647;
const STORE_LNG = -47.2991;

const PORT = 3001;

function calculateFreight(distanceKm) {
    let base = 7.50;
    if (distanceKm <= 2) base = 7.50;
    else if (distanceKm <= 3) base = 8.00;
    else if (distanceKm <= 3.5) base = 8.50;
    else if (distanceKm <= 4) base = 9.00;
    else if (distanceKm <= 4.5) base = 10.00;
    else if (distanceKm <= 5) base = 12.00;
    else base = 12.00 + (distanceKm > 5 ? (distanceKm - 5) * 2 : 0);
    return base;
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(address) {
    try {
        console.log(`🔍 Buscando coordenadas para: ${address}`);
        // Limpa o endereço para melhorar a busca (Rua Sueli... CEP: ...) -> Rua Sueli...
        const cleanAddress = address.split(' - ')[0].split(' CEP:')[0].trim();
        const query = `${cleanAddress}, Itu, SP, Brazil`;

        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
            headers: { 'User-Agent': 'Guepardo-Lojista-Bot' }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            console.log(`✅ Localizado: ${data[0].display_name}`);
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) {
        console.error('Geocoding error:', e);
    }
    return null;
}

const server = createServer(async (req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                if (payload.event === 'messages.upsert') {
                    const messageData = payload.data;
                    const messageText = messageData.message?.conversation ||
                        messageData.message?.extendedTextMessage?.text || '';

                    if (messageText.toLowerCase().includes('gerar pedido')) {
                        console.log('🚀 Processando comando "Gerar Pedido" (V2.5 - Flex)...');
                        const lines = messageText.split('\n').map(l => l.trim());

                        // PARSER INTELIGENTE (Procura por padrões em qualquer ordem)
                        let customerName = messageData.pushName || 'Cliente WhatsApp';
                        let rawAddress = 'Centro, Itu';
                        let orderValue = 0;
                        let paymentMethod = 'PIX';
                        let tel = messageData.key.remoteJid.split('@')[0];

                        for (const line of lines) {
                            if (line.match(/^Cliente:/i)) customerName = line.replace(/^Cliente:/i, '').trim();
                            else if (line.match(/^Tel:/i)) tel = line.replace(/^Tel:/i, '').trim();
                            else if (line.match(/^Valor/i)) {
                                const v = line.match(/[\d,.]+/);
                                if (v) orderValue = parseFloat(v[0].replace(',', '.'));
                            }
                            else if (line.match(/Cartão|Card|Dinheiro|Cash|Pix/i)) {
                                if (line.toLowerCase().includes('cart')) paymentMethod = 'CARD';
                                else if (line.toLowerCase().includes('dinheiro')) paymentMethod = 'CASH';
                                else paymentMethod = 'PIX';
                            }
                            // Identifica a linha de endereço (Geralmente longa e contém 'Rua' ou 'CEP')
                            else if (line.match(/Rua|Av|Alameda|Praça|CEP/i) && line.length > 10) {
                                rawAddress = line.trim();
                            }
                        }

                        // GEOCODING E FRETE
                        const geo = await geocodeAddress(rawAddress);
                        const destLat = geo ? geo.lat : -23.2647;
                        const destLng = geo ? geo.lng : -47.2991;
                        const distance = getDistance(STORE_LAT, STORE_LNG, destLat, destLng);
                        const freight = calculateFreight(distance);
                        const isReturnRequired = paymentMethod === 'CARD';
                        const totalFreight = isReturnRequired ? freight * 1.5 : freight;

                        const displayId = Math.floor(1000 + Math.random() * 9000).toString();

                        const newOrder = {
                            id: crypto.randomUUID(),
                            store_id: STORE_ID,
                            store_name: STORE_NAME,
                            store_address: STORE_ADDRESS,
                            customer_name: customerName,
                            customer_address: rawAddress,
                            customer_phone_suffix: tel.slice(-4),
                            collection_code: Math.floor(1000 + Math.random() * 9000).toString(),
                            status: 'pending',
                            total_distance: parseFloat(distance.toFixed(2)),
                            earnings: totalFreight,
                            items: {
                                displayId: displayId,
                                paymentMethod: paymentMethod,
                                deliveryValue: orderValue,
                                isReturnRequired: isReturnRequired,
                                destinationLat: destLat,
                                destinationLng: destLng,
                                requestSource: 'WHATSAPP',
                                clientPhone: tel
                            }
                        };

                        console.log('📦 Inserindo pedido V2.5:', {
                            cliente: customerName,
                            end: rawAddress,
                            frete: totalFreight
                        });

                        const { error } = await supabase.from('deliveries').insert([newOrder]);

                        if (error) console.error('❌ Erro Supabase:', error.message);
                        else console.log(`✅ Pedido #${displayId} enviado com sucesso!`);
                    }
                }
                res.writeHead(200); res.end('OK');
            } catch (err) {
                console.error('Error:', err);
                res.writeHead(400); res.end('Error');
            }
        });
    } else {
        res.writeHead(404); res.end();
    }
});

server.listen(PORT, () => {
    console.log(`🐆 Guepardo Listener v2.5 Online (Porta ${PORT})`);
});
