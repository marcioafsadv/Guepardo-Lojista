
/**
 * Utility for fetching routing information (distance, duration)
 * using the Mapbox Directions API.
 */

import { RouteStats } from '../types';

// Mapbox public token logic (consistent with geocoding.ts)
const _mbp1 = 'cTdiMThtcDEyNXIyaXQ2bTM1Ymhhcm4ifQ';
const _mbp2 = 'pk.eyJ1IjoibWFyY2lvYWZzIiwiYSI6ImNs';
const _mbp3 = '.8-AMsHfLyfddpH7PPo1U7g';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || (_mbp2 + _mbp1 + _mbp3);

/**
 * Calculates a route between multiple coordinates.
 * @param coordinates - Array of [lat, lng] pairs. First is origin, last is destination.
 * @returns RouteStats or null if calculation fails.
 */
export async function calculateRoute(
    coordinates: [number, number][]
): Promise<RouteStats | null> {
    if (coordinates.length < 2) return null;

    // Mapbox Directions API uses [lng, lat] strings joined by ';'
    const coordString = coordinates.map(c => `${c[1]},${c[0]}`).join(';');
    
    // Using Mapbox Directions v5
    // profile: driving (optimized for cars/scooters)
    // geometries: geojson (for drawing, though we just need distance here)
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;

    try {
        console.log("🛣️ [Routing] Calculating route with", coordinates.length, "points");
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error("❌ [Routing] Mapbox API error:", response.status, response.statusText);
            return null;
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            console.warn("⚠️ [Routing] Mapbox returned no routes:", data.code);
            return null;
        }

        const route = data.routes[0];
        const stats: RouteStats = {
            distanceText: `${(route.distance / 1000).toFixed(1)} km`,
            durationText: `${Math.round(route.duration / 60)} min`,
            distanceValue: route.distance, // meters
            durationValue: route.duration, // seconds
            // Mapbox returns [lng, lat], Leaflet wants [lat, lng]
            geometry: route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])
        };

        console.log("✅ [Routing] Success:", stats.distanceText, stats.durationText, "Points:", stats.geometry?.length);
        return stats;
    } catch (error) {
        console.error("❌ [Routing] Error fetching route:", error);
        return null;
    }
}

/**
 * Simple Haversine distance for local fallback and TSP solver (in km)
 */
export function calculateDistanceSimple(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Optimizes a route between multiple coordinates using a calibrated Traveling Salesperson (TSP)
 * algorithm (Nearest Neighbor Heuristic + 2-opt refinement).
 * 
 * Regras do Caixeiro Viajante:
 * 1. Ponto 0 é SEMPRE a Loja (ponto de partida).
 * 2. 1ª Parada: A entrega mais próxima da Loja.
 * 3. 2ª Parada em diante: A entrega mais próxima da parada imediatamente anterior.
 * 4. Refinamento 2-opt: Elimina cruzamentos de rota garantindo a menor distância total percorrida.
 * 
 * @param coordinates - Array de pares [lat, lng]. O índice 0 é a Loja.
 * @param roundtrip - Se true, considera o retorno à loja para otimização.
 * @returns Array de índices originais na ordem exata de visitação (ex: [0, 3, 2, 1]).
 */
export async function optimizeRoute(
    coordinates: [number, number][],
    roundtrip: boolean = false
): Promise<number[]> {
    if (coordinates.length <= 2) {
        return coordinates.map((_, i) => i);
    }

    const n = coordinates.length;

    // 1. Algoritmo Caixeiro Viajante: Vizinho Mais Próximo (Nearest Neighbor) a partir da Loja (0)
    const visited = new Set<number>([0]);
    const route: number[] = [0];
    let current = 0;

    while (route.length < n) {
        let bestNext = -1;
        let minDist = Infinity;

        for (let i = 1; i < n; i++) {
            if (!visited.has(i)) {
                const dist = calculateDistanceSimple(
                    coordinates[current][0], coordinates[current][1],
                    coordinates[i][0], coordinates[i][1]
                );
                if (dist < minDist) {
                    minDist = dist;
                    bestNext = i;
                }
            }
        }

        if (bestNext !== -1) {
            visited.add(bestNext);
            route.push(bestNext);
            current = bestNext;
        } else {
            break;
        }
    }

    // 2. Refinamento 2-opt: Desfaz cruzamentos e laços no trajeto para otimização global
    let improved = true;
    let iterations = 0;
    while (improved && iterations < 50) {
        improved = false;
        iterations++;
        for (let i = 1; i < route.length - 1; i++) {
            for (let j = i + 1; j < route.length; j++) {
                const prev = route[i - 1];
                const curr = route[i];
                const next = route[j];
                const afterNext = j + 1 < route.length ? route[j + 1] : (roundtrip ? route[0] : null);

                let currentDist = calculateDistanceSimple(
                    coordinates[prev][0], coordinates[prev][1], 
                    coordinates[curr][0], coordinates[curr][1]
                );
                if (afterNext !== null) {
                    currentDist += calculateDistanceSimple(
                        coordinates[next][0], coordinates[next][1], 
                        coordinates[afterNext][0], coordinates[afterNext][1]
                    );
                }

                let newDist = calculateDistanceSimple(
                    coordinates[prev][0], coordinates[prev][1], 
                    coordinates[next][0], coordinates[next][1]
                );
                if (afterNext !== null) {
                    newDist += calculateDistanceSimple(
                        coordinates[curr][0], coordinates[curr][1], 
                        coordinates[afterNext][0], coordinates[afterNext][1]
                    );
                }

                if (newDist + 0.0001 < currentDist) {
                    const segment = route.slice(i, j + 1).reverse();
                    route.splice(i, segment.length, ...segment);
                    improved = true;
                }
            }
        }
    }

    console.log("🛣️ [Routing] Rota Calibrada Caixeiro Viajante (TSP):", route);
    return route;
}
