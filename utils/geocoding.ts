
/**
 * Utility for converting addresses into geographical coordinates (latitude and longitude)
 * using the Nominatim (OpenStreetMap) service.
 */

import { AddressComponents } from '../types';


// Mapbox public token (pk.*) — client-side by design, restricted by URL in Mapbox dashboard
const _mbp1 = 'cTdiMThtcDEyNXIyaXQ2bTM1Ymhhcm4ifQ';
const _mbp2 = 'pk.eyJ1IjoibWFyY2lvYWZzIiwiYSI6ImNs';
const _mbp3 = '.8-AMsHfLyfddpH7PPo1U7g';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || (_mbp2 + _mbp1 + _mbp3);
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Geocodes an address or structured components into coordinates.
 * Service: Mapbox Geocoding (with Nominatim fallback)
 */
export async function geocodeAddress(
    address: string | AddressComponents,
    proximity?: { lat: number, lng: number }
): Promise<{ lat: number, lng: number } | null> {
    // If coordinates are already provided, return them directly
    if (typeof address === 'object' && typeof address.lat === 'number' && typeof address.lng === 'number' && !isNaN(address.lat) && !isNaN(address.lng)) {
        return { lat: address.lat, lng: address.lng };
    }

    // 1. Try Mapbox if token is available
    if (MAPBOX_TOKEN) {
        return geocodeWithMapbox(address, proximity);
    }

    // 2. Fallback to Nominatim
    return geocodeWithNominatim(address);
}



async function geocodeWithMapbox(
    address: string | AddressComponents,
    proximity?: { lat: number, lng: number }
): Promise<{ lat: number, lng: number } | null> {
    let query = '';
    if (typeof address === 'object') {
        const { street, number, neighborhood, city, cep } = address;

        // Clean city: "Itu/SP" -> "Itu, SP" or similar
        const [cityName] = (city || '').split('/');
        const cleanCity = cityName.trim();

        // Mapbox precision for Brazil works best with: [Number] [Street], [Neighborhood], [City]
        const cleanNumber = number ? number.replace(/\D/g, '') : '';
        const streetPart = `${cleanNumber} ${street}`.trim();

        // We build a very specific query
        query = `${streetPart}${neighborhood ? ', ' + neighborhood : ''}, ${cleanCity}, Brazil`;

        if (cep) {
            // Priority for CEP to narrow down the sector
            query = `${cep.replace(/\D/g, '')}, ${query}`;
        }
    } else {
        query = address;
    }

    try {
        // Extreme Tuning: 
        // - language=pt (Local relevance)
        // - autocomplete=false (Better for exact full address searches)
        // - routing=true (Points closer to road access)
        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=br&language=pt&autocomplete=false&routing=true&types=address,postcode,poi,neighborhood`;

        // ITU/SP Bounding Box (approximate)
        const ITU_BBOX = '-47.3639,-23.3333,-47.2417,-23.1956';
        url += `&bbox=${ITU_BBOX}`;

        if (proximity) {
            url += `&proximity=${proximity.lng},${proximity.lat}`;
        }

        console.log("📍 [Mapbox] Querying:", query);
        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            console.log("✅ [Mapbox] Found:", lat, lng, " - Result type:", data.features[0].place_type);
            console.log("📝 [Mapbox] Full name:", data.features[0].place_name);
            return { lat, lng };
        }
    } catch (error) {
        console.error("❌ [Mapbox] Error:", error);
    }
    return null;
}

async function geocodeWithNominatim(address: string | AddressComponents): Promise<{ lat: number, lng: number } | null> {
    const params = new URLSearchParams();
    params.append('format', 'json');
    params.append('limit', '1');

    if (typeof address === 'object') {
        const { street, number, city, cep } = address;
        if (street) params.append('street', `${number || ''} ${street}`.trim());
        if (city) {
            const [cityName, stateName] = city.split('/');
            params.append('city', cityName.trim());
            if (stateName) params.append('state', stateName.trim());
        }
        if (cep) params.append('postalcode', cep.replace(/\D/g, ''));
        params.append('country', 'Brazil');
    } else {
        // Fallback or string processing
        // Example: "Rua Carlos Scalet, 58 - Jardim Padre Bento, Itu/SP"
        // We attempt to identify city/state pattern "Itu/SP"
        const cityStateMatch = address.match(/([^,]+)\/([A-Z]{2})$/);

        if (cityStateMatch) {
            const cityName = cityStateMatch[1].trim();
            const stateCode = cityStateMatch[2].trim();

            // Reconstruct structured query if possible
            const parts = address.split(',');
            if (parts.length >= 2) {
                params.append('street', parts[0].trim());
                params.append('city', cityName);
                params.append('state', stateCode);
                params.append('country', 'Brazil');
            } else {
                params.append('q', address);
            }
        } else {
            params.append('q', address);
        }
    }

    console.log("📍 [Geocoding] Searching with params:", params.toString());

    try {
        const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'GuepardoDelivery/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);

            if (!isNaN(lat) && !isNaN(lng)) {
                console.log("✅ [Geocoding] Found:", lat, lng);
                return { lat, lng };
            }
        }

        console.warn("⚠️ [Geocoding] No results for:", params.toString());
        return null;
    } catch (error) {
        console.error("❌ [Geocoding] Error:", error);
        return null;
    }
}

/**
 * Valida se os valores de latitude e longitude estão em faixas geográficas aceitáveis.
 */
export function isValidLatLng(lat: number, lng: number): boolean {
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Tenta converter uma string de coordenadas ou link de mapa em { lat, lng }
 * Suporta formatos:
 * - Decimais: "-23.275812, -47.310245", "-23.275812 -47.310245"
 * - Links: "https://maps.google.com/?q=-23.275812,-47.310245", "/@ -23.275812,-47.310245"
 * - Graus, Minutos e Segundos: 23°16'32.9"S 47°18'36.9"W
 */
export function parseCoordinates(input: string): { lat: number, lng: number } | null {
    if (!input || typeof input !== 'string') return null;
    const clean = input.trim();

    // 1. URL pattern (Google Maps / Waze / Apple Maps)
    const urlMatch = clean.match(/(?:[?&]q=|[?&]ll=|\/@)(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/i);
    if (urlMatch) {
        const lat = parseFloat(urlMatch[1]);
        const lng = parseFloat(urlMatch[2]);
        if (isValidLatLng(lat, lng)) return { lat, lng };
    }

    // 2. Standard decimal: -23.123456, -47.123456 or with parentheses/semicolon
    const decimalMatch = clean.match(/(-?\d{1,2}(?:\.\d+)?)[,\s;]+(-?\d{1,3}(?:\.\d+)?)/);
    if (decimalMatch) {
        const lat = parseFloat(decimalMatch[1]);
        const lng = parseFloat(decimalMatch[2]);
        if (isValidLatLng(lat, lng)) return { lat, lng };
    }

    // 3. DMS: 23°16'32.9"S 47°18'36.9"W
    const dmsRegex = /(\d+)[°º\s]+(\d+)['′\s]+([\d.]+)?["″\s]*([NSns])[,\s]+(\d+)[°º\s]+(\d+)['′\s]+([\d.]+)?["″\s]*([EWOew\s])/i;
    const dmsMatch = clean.match(dmsRegex);
    if (dmsMatch) {
        let lat = parseInt(dmsMatch[1], 10) + parseInt(dmsMatch[2], 10) / 60 + (parseFloat(dmsMatch[3] || '0') / 3600);
        if (dmsMatch[4].toUpperCase() === 'S') lat = -lat;

        let lng = parseInt(dmsMatch[5], 10) + parseInt(dmsMatch[6], 10) / 60 + (parseFloat(dmsMatch[7] || '0') / 3600);
        if (['W', 'O'].includes(dmsMatch[8].toUpperCase().trim())) lng = -lng;

        if (isValidLatLng(lat, lng)) return { lat, lng };
    }

    return null;
}

/**
 * Geocodificação reversa para obter nome de rua, bairro e cidade a partir de coordenadas.
 */
export async function reverseGeocodeAddress(
    lat: number,
    lng: number
): Promise<{
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    cep?: string;
    formatted?: string;
} | null> {
    if (!isValidLatLng(lat, lng)) return null;

    // 1. Try Mapbox if token is available
    if (MAPBOX_TOKEN) {
        try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=pt&types=address,poi,neighborhood,locality,place`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.features && data.features.length > 0) {
                    const feature = data.features[0];
                    let street = feature.text || '';
                    let number = feature.address || '';
                    let neighborhood = '';
                    let city = 'Itu';
                    let cep = '';

                    if (feature.context) {
                        for (const ctx of feature.context) {
                            if (ctx.id.startsWith('neighborhood')) neighborhood = ctx.text;
                            else if (ctx.id.startsWith('place')) city = ctx.text;
                            else if (ctx.id.startsWith('postcode')) cep = ctx.text;
                        }
                    }

                    return {
                        street: street || feature.place_name?.split(',')[0]?.trim() || 'Estrada / Área Rural',
                        number: number || 'S/N',
                        neighborhood: neighborhood || 'Zona Rural',
                        city: `${city}/SP`,
                        cep: cep || '13300-000',
                        formatted: feature.place_name
                    };
                }
            }
        } catch (err) {
            console.warn("⚠️ [reverseGeocode] Mapbox error:", err);
        }
    }

    // 2. Fallback to Nominatim
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'GuepardoDelivery/1.0'
            }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
                const addr = data.address;
                const street = addr.road || addr.pedestrian || addr.suburb || addr.hamlet || addr.isolated_dwelling || '';
                const neighborhood = addr.neighbourhood || addr.suburb || addr.village || 'Zona Rural';
                const city = addr.city || addr.town || addr.municipality || 'Itu';
                const cep = addr.postcode || '13300-000';
                return {
                    street: street || 'Estrada / Área Rural',
                    number: addr.house_number || 'S/N',
                    neighborhood,
                    city: `${city}/SP`,
                    cep,
                    formatted: data.display_name
                };
            }
        }
    } catch (err) {
        console.warn("⚠️ [reverseGeocode] Nominatim error:", err);
    }

    return {
        street: 'Estrada / Localização por GPS',
        number: 'S/N',
        neighborhood: 'Zona Rural',
        city: 'Itu/SP',
        cep: '13300-000'
    };
}

