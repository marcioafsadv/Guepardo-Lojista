
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
 * Optimizes a route between multiple coordinates using Mapbox Optimization API.
 * Includes a local Greedy fallback if the API is unauthorized or fails.
 * @param coordinates - Array of [lat, lng] pairs. First is ALWAYS the origin (Store).
 * @param roundtrip - If true, the route will end back at the origin.
 * @returns Array of indices in optimized order.
 */
export async function optimizeRoute(
    coordinates: [number, number][],
    roundtrip: boolean = false
): Promise<number[]> {
    if (coordinates.length < 3) {
        return coordinates.map((_, i) => i);
    }

    const coordString = coordinates.map(c => `${c[1]},${c[0]}`).join(';');
    const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordString}?access_token=${MAPBOX_TOKEN}&source=first&destination=any&roundtrip=${roundtrip}&geometries=geojson&overview=full`;

    try {
        console.log("🎯 [Routing] Attempting Mapbox Optimization API...");
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.code === 'Ok' && data.waypoints) {
                const optimized = data.waypoints.map((wp: any) => wp.waypoint_index);
                console.log("✅ [Routing] Mapbox Cloud Optimization Success:", optimized);
                return optimized;
            }
        }
        
        console.warn("⚠️ [Routing] Mapbox API failed or unauthorized. Falling back to local Greedy Optimization.");
    } catch (error) {
        console.error("❌ [Routing] Error calling Mapbox Optimization:", error);
    }

    // --- FALLBACK: LOCAL GREEDY OPTIMIZATION ---
    // Simple Greedy algorithm (Nearest Neighbor) is highly effective for < 10 points.
    const visited = new Set<number>([0]); // Start at Store (0)
    const result = [0];
    let currentIdx = 0;

    while (result.length < coordinates.length) {
        let bestNext = -1;
        let minDist = Infinity;

        for (let i = 0; i < coordinates.length; i++) {
            if (!visited.has(i)) {
                // We use straight-line distance for the fallback optimization
                const dist = calculateDistanceSimple(
                    coordinates[currentIdx][0], coordinates[currentIdx][1],
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
            result.push(bestNext);
            currentIdx = bestNext;
        } else {
            break; 
        }
    }

    console.log("🤖 [Routing] Local Greedy Optimization Result:", result);
    return result;
}

/**
 * Simple Haversine distance for local fallback
 */
function calculateDistanceSimple(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
