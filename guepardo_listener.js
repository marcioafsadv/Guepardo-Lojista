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
    let storeFee = 7.50;

    if (distanceKm <= 1) storeFee = 7.50;
    else if (distanceKm <= 2) storeFee = 9.50;
    else if (distanceKm <= 3) storeFee = 12.00;
    else if (distanceKm <= 4) storeFee = 14.50;
    else if (distanceKm <= 5) storeFee = 15.75; // Interpolação
    else if (distanceKm <= 6) storeFee = 17.00;
    else if (distanceKm <= 7) storeFee = 20.00;
    else if (distanceKm <= 8) storeFee = 21.50; // Interpolação
    else if (distanceKm <= 9) storeFee = 23.00;
    else if (distanceKm <= 10) storeFee = 27.00;
    else if (distanceKm <= 11) storeFee = 30.00;
    else if (distanceKm <= 12) storeFee = 33.00;
    else {
        // Acima de 12km: + R$ 3,00 fixos ao valor do Lojista por KM adicional
        const extraKm = Math.ceil(distanceKm - 12);
        storeFee = 33.00 + (extraKm * 3.00);
    }

    return storeFee;
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
        // Limpeza inteligente: Remove rótulos e isola a parte principal
        let clean = address
            .replace(/CEP:?\s*[\d-]+/i, '') // Remove o texto "CEP:" e o número 
            .replace(/Endereço:?/i, '')
            .split(' - ')[0]
            .trim();

        // Se o endereço original já contém "Salto", "Itu", etc., não forçamos Itu
        let query = clean;
        if (!clean.match(/Itu|Salto|Indaiatuba|Sorocaba|Porto Feliz|Cabreúva/i)) {
            query += ', Itu';
        }
        query += ', SP, Brazil';

        console.log(`📍 Query enviada ao GPS: ${query}`);

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
                            earnings: Number((totalFreight * 0.75).toFixed(2)),
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
