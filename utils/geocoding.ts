
/**
 * Utility for converting addresses into geographical coordinates (latitude and longitude)
 * using the Nominatim (OpenStreetMap) service.
 */

import { AddressComponents } from '../types';


const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Geocodes an address or structured components into coordinates.
 * Service: Mapbox Geocoding (with Nominatim fallback)
 */
export async function geocodeAddress(
    address: string | AddressComponents,
    proximity?: { lat: number, lng: number }
): Promise<{ lat: number, lng: number } | null> {
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
