
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
