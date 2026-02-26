import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- TYPES ---
import { Courier, Order, StoreProfile, RouteStats, OrderStatus } from '../types';

import {
    Plus, Minus, Target, Layers, Info, Share2, MessageSquare, HelpCircle, Sun, Moon, HardHat
} from 'lucide-react';

interface LeafletMapProps {
    store: StoreProfile;
    activeOrder: Order | null;
    filteredOrders?: Order[];
    availableCouriers?: Courier[];
    theme?: string;
    draftDestinationAddress?: string;
    onRouteCalculated?: (stats: RouteStats | null) => void;
    toggleTheme?: () => void;
    isSelectingCourier?: boolean;
    onCourierSelect?: (courierId: string) => void;
}

// --- ASSETS & STYLES ---
// Fix for default Leaflet marker icons in Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Guepardo Branding Colors
const COLORS = {
    orange: '#FF6B00',
    accent: '#D35400',
    blue: '#3B82F6',
    green: '#22C55E',
    purple: '#9333EA',
    gold: '#F59E0B'
};

const DEFAULT_CENTER: [number, number] = [-23.257217, -47.300549]; // Itu-SP

// Custom Icons
const storeIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3595/3595587.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

const clientIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/25/25694.png',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
});

const courierIcon = L.icon({
    iconUrl: '/cheetah-icon.png',
    iconSize: [50, 40],
    iconAnchor: [25, 20],
});

const activeCourierIcon = L.icon({
    iconUrl: '/cheetah-icon.png',
    iconSize: [60, 48],
});

// Helper for dynamic order dots
const createOrderDot = (color: string) => L.divIcon({
    className: 'custom-order-dot',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});

// --- HELPERS ---
const isValidCoord = (point: any): point is [number, number] => {
    if (!point) return false;
    const lat = Array.isArray(point) ? point[0] : (typeof point === 'object' ? point.lat : undefined);
    const lng = Array.isArray(point) ? point[1] : (typeof point === 'object' ? point.lng : undefined);

    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
    );
};

/**
 * Custom Map Controls UI
 */
const MapControls: React.FC<{
    onZoomIn: () => void;
    onZoomOut: () => void;
    onRecenter: () => void;
    onToggleLayers: () => void;
    onToggleTheme: () => void;
    isDarkMode: boolean;
}> = ({ onZoomIn, onZoomOut, onRecenter, onToggleLayers, onToggleTheme, isDarkMode }) => {
    return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2">
            {/* Zoom Controls */}
            <div className="glass-panel rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <button
                    onClick={onZoomIn}
                    className="map-control-button border-b border-white/5"
                    title="Aumentar Zoom"
                >
                    <Plus size={20} />
                </button>
                <button
                    onClick={onZoomOut}
                    className="map-control-button"
                    title="Diminuir Zoom"
                >
                    <Minus size={20} />
                </button>
            </div>

            {/* Recenter / Focus */}
            <div className="glass-panel rounded-xl overflow-hidden shadow-2xl">
                <button
                    onClick={onRecenter}
                    className="map-control-button"
                    title="Centralizar Minha Loja"
                >
                    <Target size={20} className="text-guepardo-accent" />
                </button>
            </div>

            {/* Display / Layers */}
            <div className="glass-panel rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <button
                    onClick={onToggleLayers}
                    className="map-control-button border-b border-white/5"
                    title="Alternar Camadas"
                >
                    <Layers size={18} />
                </button>
                <button
                    onClick={onToggleTheme}
                    className="map-control-button"
                    title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
                >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            {/* Info & Support Group */}
            <div className="glass-panel rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <button className="map-control-button border-b border-white/5" title="Informações">
                    <Info size={18} />
                </button>
                <button className="map-control-button border-b border-white/5" title="Compartilhar">
                    <Share2 size={18} />
                </button>
                <button className="map-control-button border-b border-white/5" title="Chat">
                    <MessageSquare size={18} />
                </button>
                <button className="map-control-button" title="Ajuda">
                    <HelpCircle size={18} />
                </button>
            </div>
        </div>
    );
};

/**
 * Internal logic controller for the map
 */
const MapController: React.FC<{
    points: [number, number][];
    recenterTrigger: number;
    zoomLevel: number;
    onPointHandled: () => void;
}> = ({ points, recenterTrigger, zoomLevel, onPointHandled }) => {
    const map = useMap();
    const prevPointsRef = useRef<string>('');
    const prevRecenterRef = useRef<number>(0);
    const prevZoomRef = useRef<number>(0);

    // Initial Zoom sync
    useEffect(() => {
        if (zoomLevel !== prevZoomRef.current) {
            map.setZoom(zoomLevel);
            prevZoomRef.current = zoomLevel;
        }
    }, [zoomLevel, map]);

    // Handle fitting points (auto-focus)
    useEffect(() => {
        const pointsStr = JSON.stringify(points);
        if (!points || points.length === 0 || pointsStr === prevPointsRef.current) return;

        // Defensive check: Ensure all points are valid
        const validPoints = points.filter(isValidCoord);
        if (validPoints.length === 0) return;

        prevPointsRef.current = pointsStr;

        if (validPoints.length === 1) {
            map.flyTo(validPoints[0], 16, { duration: 1.5 });
        } else {
            const bounds = L.latLngBounds(validPoints);
            map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
        }
    }, [points, map]);

    // Manual Recenter Trigger
    useEffect(() => {
        if (recenterTrigger > prevRecenterRef.current) {
            prevRecenterRef.current = recenterTrigger;
            if (points && points.length > 0) {
                const validPoints = points.filter(isValidCoord);
                if (validPoints.length === 1) {
                    map.flyTo(validPoints[0], 16, { duration: 1.2 });
                } else if (validPoints.length > 1) {
                    const bounds = L.latLngBounds(validPoints);
                    map.fitBounds(bounds, { padding: [80, 80] });
                }
            }
        }
    }, [recenterTrigger, points, map]);

    return null;
};

// --- MAIN COMPONENT ---

export const LeafletMap: React.FC<LeafletMapProps> = ({
    store,
    activeOrder,
    filteredOrders = [],
    availableCouriers = [],
    theme = 'dark',
    draftDestinationAddress,
    onRouteCalculated,
    toggleTheme,
    isSelectingCourier = false,
    onCourierSelect
}) => {
    // --- STATES ---
    const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
    const [routePolyline, setRoutePolyline] = useState<[number, number][] | null>(null);
    const [activeOrderRoute, setActiveOrderRoute] = useState<[number, number][] | null>(null);

    // Ensure store center is valid or use fallback
    const mapCenter: [number, number] = useMemo(() => {
        if (isValidCoord([store.lat, store.lng])) return [store.lat, store.lng];
        return DEFAULT_CENTER;
    }, [store.lat, store.lng]);

    const [fitPoints, setFitPoints] = useState<[number, number][]>([mapCenter]);

    // Map Control States
    const [zoomLevel, setZoomLevel] = useState(14);
    const [recenterTrigger, setRecenterTrigger] = useState(0);
    const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets');

    const isDarkMode = theme === 'dark';

    // --- LOGIC: GEOCODING (Nominatim) ---
    const geocodeAddress = useCallback(async (address: string) => {
        if (!address || address.length < 5) return null;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                return [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number];
            }
        } catch (error) {
            console.error("Geocoding Error:", error);
        }
        return null;
    }, []);

    // --- LOGIC: ROUTING (OSRM) ---
    const calculateRoute = useCallback(async (start: [number, number], end: [number, number]) => {
        try {
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
                return {
                    coordinates,
                    distance: route.distance, // in meters
                    duration: route.duration   // in seconds
                };
            }
        } catch (error) {
            console.error("Routing Error:", error);
        }
        return null;
    }, []);

    // --- EFFECT: DRAFT ADDRESS PROCESSING ---
    useEffect(() => {
        if (!draftDestinationAddress) {
            setDestinationCoords(null);
            setRoutePolyline(null);
            setFitPoints([[store.lat, store.lng]]);
            if (onRouteCalculated) onRouteCalculated(null);
            return;
        }

        const timer = setTimeout(async () => {
            const coords = await geocodeAddress(draftDestinationAddress);
            if (coords) {
                setDestinationCoords(coords);
                const routeData = await calculateRoute([store.lat, store.lng], coords);
                if (routeData) {
                    setRoutePolyline(routeData.coordinates);
                    setFitPoints([[store.lat, store.lng], coords]);
                    if (onRouteCalculated) {
                        onRouteCalculated({
                            distanceText: `${((routeData.distance || 0) / 1000).toFixed(1)} km`,
                            distanceValue: routeData.distance,
                            durationText: `${Math.ceil(routeData.duration / 60)} min`,
                            durationValue: routeData.duration
                        });
                    }
                }
            }
        }, 1000); // Debounce geocoding

        return () => clearTimeout(timer);
    }, [draftDestinationAddress, store.lat, store.lng, geocodeAddress, calculateRoute, onRouteCalculated]);

    // --- EFFECT: ACTIVE ORDER PROCESSING ---
    useEffect(() => {
        if (!activeOrder || !activeOrder.courier) {
            setActiveOrderRoute(null);
            return;
        }

        const fetchActiveRoute = async () => {
            const courierPoint: [number, number] = [activeOrder.courier!.lat, activeOrder.courier!.lng];
            const targetPoint: [number, number] = activeOrder.status === OrderStatus.RETURNING
                ? [store.lat, store.lng]
                : [(activeOrder.destinationLat || store.lat), (activeOrder.destinationLng || store.lng)];

            const routeData = await calculateRoute(courierPoint, targetPoint);
            if (routeData) {
                setActiveOrderRoute(routeData.coordinates);
                setFitPoints([courierPoint, targetPoint]);
            }
        };

        fetchActiveRoute();
    }, [activeOrder, store.lat, store.lng, calculateRoute]);

    // Handle markers for general visualization (excluding draft)
    const orderMarkers = useMemo(() => {
        return filteredOrders
            .filter(o =>
                o.destinationLat !== undefined &&
                o.destinationLng !== undefined &&
                !isNaN(o.destinationLat) &&
                !isNaN(o.destinationLng) &&
                o.id !== activeOrder?.id
            )
            .map(o => ({
                id: o.id,
                position: [o.destinationLat!, o.destinationLng!] as [number, number],
                name: o.clientName,
                status: o.status
            }));
    }, [filteredOrders, activeOrder]);

    return (
        <div className="w-full h-full relative border-0 overflow-hidden rounded-xl bg-gray-900">
            <MapContainer
                center={mapCenter}
                zoom={zoomLevel}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
            >
                {/* Dynamic Tile Layer */}
                {mapMode === 'streets' ? (
                    <TileLayer
                        url={isDarkMode
                            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                        attribution='&copy; OpenStreetMap & CARTO'
                    />
                ) : (
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                    />
                )}

                <MapController
                    points={fitPoints}
                    recenterTrigger={recenterTrigger}
                    zoomLevel={zoomLevel}
                    onPointHandled={() => { }}
                />

                <MapControls
                    onZoomIn={() => setZoomLevel(prev => Math.min(prev + 1, 20))}
                    onZoomOut={() => setZoomLevel(prev => Math.max(prev - 1, 3))}
                    onRecenter={() => setRecenterTrigger(prev => prev + 1)}
                    onToggleLayers={() => setMapMode(prev => prev === 'streets' ? 'satellite' : 'streets')}
                    onToggleTheme={toggleTheme || (() => { })}
                    isDarkMode={isDarkMode}
                />

                {/* 1. STORE MARKER */}
                {isValidCoord([store.lat, store.lng]) && (
                    <Marker position={[store.lat, store.lng]} icon={storeIcon}>
                        <Popup>
                            <div className="p-1">
                                <p className="font-bold text-guepardo-accent uppercase tracking-tighter">Sua Unidade</p>
                                <p className="text-xs text-gray-500">{store.address}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* 2. AVAILABLE COURIERS */}
                {availableCouriers.filter(c => isValidCoord([c.lat, c.lng])).map(c => (
                    <Marker
                        key={c.id}
                        position={[c.lat, c.lng]}
                        icon={activeOrder?.courier?.id === c.id ? activeCourierIcon : courierIcon}
                        zIndexOffset={activeOrder?.courier?.id === c.id ? 1000 : 0}
                        eventHandlers={{
                            click: (e) => {
                                if (isSelectingCourier && onCourierSelect) {
                                    // Prevent popup from opening and select immediately
                                    (e as any).originalEvent.preventDefault();
                                    (e as any).originalEvent.stopPropagation();
                                    console.log("🎯 Marker clicked in selection mode:", c.id);
                                    onCourierSelect(c.id);
                                }
                            }
                        }}
                    >
                        <Popup>
                            <div className="text-center p-1">
                                <p className="font-bold text-xs mb-1">{c.name}</p>
                                {isSelectingCourier && (
                                    <button
                                        type="button"
                                        className="w-full px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] rounded-md shadow-sm uppercase transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCourierSelect?.(c.id);
                                        }}
                                    >
                                        Escolher Guepardo
                                    </button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* 3. STATIC ORDER DOTS */}
                {orderMarkers.map(m => (
                    <Marker
                        key={m.id}
                        position={m.position}
                        icon={createOrderDot(m.status === OrderStatus.READY_FOR_PICKUP ? COLORS.gold : COLORS.blue)}
                    >
                        <Popup><div className="text-xs font-bold text-blue-600">{m.name}</div></Popup>
                    </Marker>
                ))}

                {/* 4. DRAFT ROUTE (Dashed Orange) */}
                {routePolyline && routePolyline.length > 0 && (
                    <>
                        <Polyline
                            positions={routePolyline}
                            pathOptions={{ color: COLORS.orange, weight: 5, opacity: 0.8, dashArray: '10, 10' }}
                        />
                        {destinationCoords && isValidCoord(destinationCoords) && (
                            <Marker position={destinationCoords} icon={clientIcon}>
                                <Popup><span className="font-bold text-orange-600">Novo Destino</span></Popup>
                            </Marker>
                        )}
                    </>
                )}

                {/* 5. ACTIVE ORDER ROUTE (Solid Blue/Purple) */}
                {activeOrderRoute && activeOrderRoute.length > 0 && (
                    <>
                        <Polyline
                            positions={activeOrderRoute}
                            pathOptions={{
                                color: activeOrder?.status === OrderStatus.RETURNING ? COLORS.purple : COLORS.blue,
                                weight: 6,
                                opacity: 0.9
                            }}
                        />
                        {activeOrder?.destinationLat !== undefined && activeOrder?.destinationLng !== undefined &&
                            isValidCoord([activeOrder.destinationLat, activeOrder.destinationLng]) && (
                                <Marker
                                    position={[activeOrder.destinationLat, activeOrder.destinationLng]}
                                    icon={clientIcon}
                                    zIndexOffset={500}
                                >
                                    <Popup><div className="font-bold">{activeOrder?.clientName}</div></Popup>
                                </Marker>
                            )}
                    </>
                )}
            </MapContainer>
        </div>
    );
};
