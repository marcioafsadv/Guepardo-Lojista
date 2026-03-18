
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order, OrderStatus, Courier, StoreProfile, RouteStats } from '../types';
import { 
    Clock, MapPin, Navigation, User, Phone, Package, CheckCircle2, AlertTriangle, 
    MoreVertical, Navigation2, Crosshair, Layers, MessageSquare, Share2, HelpCircle, 
    Zap, Activity, Target, Search, X, ChevronUp, ChevronDown, List, Layers as LayersIcon,
    Sun, Moon
} from 'lucide-react';

// --- STYLES & CONSTANTS ---
const COLORS = {
    orange: '#D35400',
    blue: '#2980B9',
    green: '#27AE60',
    red: '#C0392B',
    purple: '#8E44AD',
    dark: '#1A0900'
};

// --- MARKER ICONS (Premium Brand Stylized) ---
const createCustomIcon = (iconHtml: string, color: string) => L.divIcon({
    html: `
    <div class="relative group cursor-pointer transition-all duration-300">
      <div class="absolute -inset-2 bg-${color}/20 rounded-full blur-md group-hover:bg-${color}/40 transition-all"></div>
      <div class="relative w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden group-hover:scale-110 group-hover:-translate-y-1 transition-all">
        <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        ${iconHtml}
        <div class="absolute bottom-0 left-0 w-full h-1 bg-${color}"></div>
      </div>
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-${color} rotate-45 shadow-lg"></div>
    </div>`,
    className: 'custom-leaflet-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 48]
});

const storeIcon = L.divIcon({
    html: `
    <div class="relative group cursor-pointer transition-all duration-300">
      <div class="absolute -inset-4 bg-orange-500/20 rounded-full blur-xl animate-pulse"></div>
      <div class="absolute -inset-1 bg-orange-500/40 rounded-full blur-sm group-hover:bg-orange-500/60 transition-all"></div>
      <div class="relative w-14 h-14 flex items-center justify-center bg-black/60 backdrop-blur-3xl border-2 border-orange-500 rounded-full shadow-[0_0_20px_rgba(211,84,0,0.4)] overflow-hidden group-hover:scale-110 transition-all">
        <svg viewBox="0 0 24 24" width="28" height="28" stroke="#FF6B00" stroke-width="2" fill="none" class="drop-shadow-glow">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
        </svg>
      </div>
    </div>`,
    className: 'custom-leaflet-marker',
    iconSize: [60, 60],
    iconAnchor: [30, 30]
});
const clientIcon = createCustomIcon(`<svg viewBox="0 0 24 24" width="20" height="20" stroke="#2980B9" stroke-width="2.5" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`, 'blue');

const createStopMarker = (num: number, label: string, color: string) => L.divIcon({
    html: `
    <div class="relative flex flex-col items-center">
        <div class="w-8 h-8 flex items-center justify-center rounded-xl bg-black border-2 border-${color} shadow-2xl relative overflow-hidden group">
            <div class="absolute inset-0 bg-${color}/10"></div>
            <span class="text-white font-black text-xs relative z-10">${num}</span>
        </div>
        <div class="mt-1 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md border border-white/5 whitespace-nowrap">
            <p class="text-[8px] font-black text-white/60 uppercase tracking-widest">${label}</p>
        </div>
    </div>`,
    className: 'stop-marker',
    iconSize: [60, 40],
    iconAnchor: [30, 40]
});

const createCourierIcon = (courier: Courier, status: OrderStatus | 'IDLE') => {
    const isMoving = status === OrderStatus.IN_TRANSIT || status === OrderStatus.TO_STORE || status === OrderStatus.RETURNING;
    const colorClass = isMoving ? 'border-[#FF6B00]' : 'border-white/20';
    const bgClass = isMoving ? 'bg-[#FF6B00]/10' : 'bg-black/60';

    return L.divIcon({
        html: `
        <div class="relative group cursor-pointer">
            <div class="absolute -inset-1 bg-black/40 rounded-2xl blur-sm"></div>
            <div class="relative w-14 h-14 ${bgClass} backdrop-blur-3xl border-2 ${colorClass} rounded-2xl p-1 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 overflow-hidden flex items-center justify-center">
                <img src="/cheetah-scooter.png" class="w-10 h-10 object-contain" />
                ${isMoving ? `
                    <div class="absolute -top-1 -right-1 flex gap-0.5">
                        <div class="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
                        <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                    </div>` : ''}
            </div>
            <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-lg">
                <p class="text-[8px] font-black text-white italic tracking-tighter uppercase line-clamp-1">${courier.name.split(' ')[0]}</p>
            </div>
        </div>`,
        className: 'courier-marker',
        iconSize: [56, 70],
        iconAnchor: [28, 56]
    });
};

// --- MAP COMPONENTS ---
const MapController = ({ 
    activeOrder, 
    orders, 
    storeLat, 
    storeLng, 
    draftCoords,
    isManualFocus 
}: { 
    activeOrder: Order | null, 
    orders: Order[], 
    storeLat: number, 
    storeLng: number, 
    draftCoords: [number, number] | null,
    isManualFocus: boolean
}) => {
    const map = useMap();

    useEffect(() => {
        if (isManualFocus) return;

        // 1. Focus active order + courier
        if (activeOrder && activeOrder.courier) {
            const points = [[storeLat, storeLng], [activeOrder.courier.lat, activeOrder.courier.lng]];
            if (activeOrder.destinationLat && activeOrder.destinationLng) {
                points.push([activeOrder.destinationLat, activeOrder.destinationLng]);
            }
            map.fitBounds(L.latLngBounds(points as L.LatLngExpression[]), { padding: [50, 50], animate: true });
        } 
        // 2. Focus draft route
        else if (draftCoords) {
            map.fitBounds(L.latLngBounds([[storeLat, storeLng], draftCoords]), { padding: [80, 80], animate: true });
        }
        // 3. Overview of all orders
        else if (orders.length > 0) {
            const points = [[storeLat, storeLng]];
            orders.forEach(o => {
                if (o.destinationLat && o.destinationLng) points.push([o.destinationLat, o.destinationLng]);
                if (o.courier) points.push([o.courier.lat, o.courier.lng]);
            });
            map.fitBounds(L.latLngBounds(points as L.LatLngExpression[]), { padding: [100, 100], animate: true });
        }
        // 4. Default to Store
        else {
            map.setView([storeLat, storeLng], 15);
        }
    }, [activeOrder, orders.length, draftCoords, storeLat, storeLng, isManualFocus]);

    return null;
};

// Tooltip / Overlay UI Components
const MapOverlay = ({ children }: { children: React.ReactNode }) => (
    <div className="absolute inset-0 pointer-events-none z-[1000] flex flex-col p-8">
        {children}
    </div>
);

const GlassControl = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 pointer-events-auto transition-all duration-300 hover:border-white/20 shadow-2xl ${className}`}>
        {children}
    </div>
);

// --- MAIN COMPONENT ---
interface LeafletMapProps {
    orders: Order[];
    activeOrder: Order | null;
    storeProfile: StoreProfile;
    couriers: Courier[];
    onCourierClick?: (courierId: string) => void;
    theme?: string;
    draftAddress?: any;
    draftAdditionalStops?: any[];
    draftRouteStats?: RouteStats | null;
    activeRouteStats?: RouteStats | null;
    onCardClick?: (order: Order) => void;
    mapboxToken?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ 
    orders, 
    activeOrder, 
    storeProfile, 
    couriers,
    onCourierClick,
    theme,
    draftAddress,
    draftAdditionalStops = [],
    draftRouteStats,
    activeRouteStats,
    onCardClick,
    mapboxToken
}) => {
    const [isManualFocus, setIsManualFocus] = useState(false);
    const [mapTheme, setMapTheme] = useState<'dark' | 'standard' | 'satellite'>('standard');
    const [activePanel, setActivePanel] = useState<'info' | 'share' | 'chat' | 'help' | null>(null);

    const isDarkMode = theme === 'dark' || mapTheme === 'dark';

    // Helper to validate coords
    const isValidCoord = (coords: any): coords is [number, number] => 
        Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number';

    const storeCoords: [number, number] = [storeProfile.lat, storeProfile.lng];

    // Draft Coordinates parsing
    const destinationCoords = useMemo(() => {
        if (!draftAddress) return null;
        if (typeof draftAddress === 'object' && draftAddress.lat && draftAddress.lng) {
            return [draftAddress.lat, draftAddress.lng] as [number, number];
        }
        return null;
    }, [draftAddress]);

    const draftStopCoords = useMemo(() => {
        const coordsMap: Record<string, [number, number]> = {};
        draftAdditionalStops.forEach(stop => {
            if (stop.lat && stop.lng) coordsMap[stop.id] = [stop.lat, stop.lng];
        });
        return coordsMap;
    }, [draftAdditionalStops]);

    // Construct polyline for draft route
    const routePolyline = useMemo(() => {
        // Preference 1: Real Mapbox road-snapped geometry
        if (draftRouteStats?.geometry && draftRouteStats.geometry.length > 0) {
            return draftRouteStats.geometry;
        }

        // Preference 2: Manual straight-line fallback
        if (!destinationCoords) return [];
        const path: [number, number][] = [storeCoords, destinationCoords];
        draftAdditionalStops.forEach(stop => {
            if (stop.lat && stop.lng) path.push([stop.lat, stop.lng]);
        });
        return path;
    }, [storeCoords, destinationCoords, draftAdditionalStops, draftRouteStats?.geometry]);

    // Active Routes construction (for multi-stop or batching)
    const batchRoutes = useMemo(() => {
        const routes: any[] = [];
        
        // Group orders by courier or batch_id
        const courierJobs = new Map<string, Order[]>();
        orders.forEach(o => {
            if (o.status === OrderStatus.PENDING) return;
            const key = o.courier?.id || o.batch_id || 'unassigned';
            if (!courierJobs.has(key)) courierJobs.set(key, []);
            courierJobs.get(key)!.push(o);
        });

        courierJobs.forEach((group, id) => {
            const sorted = [...group].sort((a, b) => (a.stopNumber || 0) - (b.stopNumber || 0));
            const path: [number, number][] = [];
            const courier = sorted[0].courier;

            // Start path from courier or store
            if (courier) {
                path.push([courier.lat, courier.lng]);
                // If headed to store, add store next
                if (sorted[0].status === OrderStatus.ACCEPTED || sorted[0].status === OrderStatus.TO_STORE) {
                    path.push(storeCoords);
                }
            } else {
                path.push(storeCoords);
            }

            // Add all stop destinations
            sorted.forEach(o => {
                if (o.destinationLat && o.destinationLng) {
                    path.push([o.destinationLat, o.destinationLng]);
                }
            });

            // If returning, path back to store
            if (sorted.some(o => o.status === OrderStatus.RETURNING)) {
                path.push(storeCoords);
            }

            routes.push({
                id,
                path,
                color: courier ? COLORS.orange : COLORS.blue,
                hasCourier: !!courier,
                name: courier?.name || 'Não atribuído'
            });
        });

        return routes;
    }, [orders, storeCoords]);

    // Consolidate markers for better iteration
    const orderMarkers = useMemo(() => {
        const markers: any[] = [];
        orders.forEach(o => {
            if (o.destinationLat && o.destinationLng) {
                markers.push({
                    id: o.id,
                    position: [o.destinationLat, o.destinationLng],
                    name: o.clientName,
                    stopNumber: o.stopNumber,
                    status: o.status,
                    courier_id: o.courier?.id,
                    batch_id: o.batch_id
                });
            }
        });
        return markers;
    }, [orders]);

    return (
        <div className="w-full h-full relative group/map">
            <MapContainer
                center={storeCoords}
                zoom={15}
                className="w-full h-full"
                zoomControl={false}
                attributionControl={false}
            >
                {/* TILE LAYER MODES (MAPBOX INTEGRATION) */}
                {mapboxToken ? (
                    <>
                        {mapTheme === 'dark' && (
                            <TileLayer 
                                url={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`}
                                attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
                            />
                        )}
                        {mapTheme === 'satellite' && (
                            <TileLayer 
                                url={`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`}
                                attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
                            />
                        )}
                        {mapTheme === 'standard' && (
                            <TileLayer 
                                url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`}
                                attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
                            />
                        )}
                    </>
                ) : (
                    <>
                        {mapTheme === 'dark' ? (
                            <TileLayer 
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />
                        ) : mapTheme === 'satellite' ? (
                            <TileLayer 
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                            />
                        ) : (
                            <TileLayer 
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                        )}
                    </>
                )}

                <ZoomControl position="bottomleft" />
                <MapController 
                    activeOrder={activeOrder} 
                    orders={orders} 
                    storeLat={storeProfile.lat} 
                    storeLng={storeProfile.lng}
                    draftCoords={destinationCoords}
                    isManualFocus={isManualFocus}
                />

                {/* 1. STORE MARKER (Home Base) */}
                <Marker position={storeCoords} icon={storeIcon}>
                    <Popup className="premium-popup">
                        <div className="p-2">
                             <h4 className="font-black text-orange-600 uppercase tracking-widest text-xs mb-1">Base Guepardo</h4>
                             <p className="text-[10px] text-gray-400 font-bold">{storeProfile.name}</p>
                        </div>
                    </Popup>
                </Marker>

                {/* 2. COURIER MARKERS */}
                {couriers.map(c => {
                    const currentOrder = orders.find(o => o.courier?.id === c.id);
                    return (
                        <Marker 
                            key={c.id} 
                            position={[c.lat, c.lng]} 
                            icon={createCourierIcon(c, currentOrder?.status || 'IDLE')}
                            eventHandlers={{
                                click: () => onCourierClick?.(c.id)
                            }}
                        >
                            <Popup>
                                <div className="text-xs">
                                    <p className="font-bold">{c.name}</p>
                                    <p className="text-gray-500">{c.vehicleModel || 'Moto'} • {c.vehiclePlate}</p>
                                    {currentOrder && <p className="text-orange-500 font-bold mt-2">EM ATENDIMENTO</p>}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* 3. ACTIVE ROUTES & STOPS */}
                {batchRoutes.map(route => {
                    const isTrackingActive = activeOrder && activeRouteStats?.geometry && route.orders.some(o => o.id === activeOrder.id);
                    
                    return (
                        <React.Fragment key={route.id}>
                            {/* Road-snapped Route (High Fidelity) */}
                            {isTrackingActive ? (
                                <Polyline 
                                    positions={activeRouteStats.geometry!}
                                    pathOptions={{ 
                                        color: route.color, 
                                        weight: 4, 
                                        opacity: 0.9,
                                        dashArray: '10, 5'
                                    }}
                                />
                            ) : (
                                <>
                                    {/* Line from Start (Store or Courier) to first stop (Dashed) */}
                                    <Polyline 
                                        positions={[route.path[0], route.path[1]]}
                                        pathOptions={{ 
                                            color: route.color, 
                                            weight: 2, 
                                            opacity: route.hasCourier ? 0.9 : 0.6,
                                            dashArray: route.hasCourier ? '1, 5' : '5, 5'
                                        }}
                                    />
                                    {/* Lines between stops (Solid) */}
                                    {route.path.length > 2 && (
                                        <Polyline 
                                            positions={route.path.slice(1)}
                                            pathOptions={{ color: route.color, weight: 3, opacity: 0.8 }}
                                        />
                                    )}
                                </>
                            )}
                        </React.Fragment>
                    );
                })}

                {/* 3.1 STOP MARKERS */}
                {orderMarkers.map(m => {
                    const route = batchRoutes.find(r => r.id === (m.courier_id || m.batch_id || 'unassigned'));
                    return (
                        <Marker 
                            key={m.id} 
                            position={m.position} 
                            icon={createStopMarker(m.stopNumber, m.name, route?.color || COLORS.blue)}
                        >
                            <Popup>
                                <div className="text-xs font-black">
                                    <p className="uppercase tracking-widest text-guepardo-accent">{m.name}</p>
                                    <p className="text-white/40 mt-1 uppercase text-[8px]">Parada #{m.stopNumber}</p>
                                    {m.courier_id && <p className="text-green-500 font-black mt-2 uppercase text-[9px]">Em Rota de Entrega</p>}
                                    <button 
                                        onClick={() => {
                                            const match = orders.find(o => o.id === m.id);
                                            if (match) onCardClick?.(match);
                                        }}
                                        className="mt-3 w-full py-1.5 bg-guepardo-accent text-white rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer"
                                    >
                                        Detalhes
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* 4. DRAFT ROUTE (Dashed Orange) */}
                {routePolyline && routePolyline.length > 0 && (
                    <>
                        <Polyline 
                            positions={routePolyline}
                            pathOptions={{ color: COLORS.orange, weight: 5, opacity: 0.8, dashArray: '10, 10' }}
                        />
                        {destinationCoords && (
                             <Marker position={destinationCoords} icon={clientIcon}>
                                <Popup>
                                    <div className="text-xs">
                                        <p className="font-bold text-orange-600">Destino Principal</p>
                                        <p className="text-gray-500">Parada #1</p>
                                    </div>
                                </Popup>
                             </Marker>
                        )}
                        {/* Additional Draft Stops */}
                        {draftAdditionalStops.map((stop, idx) => {
                            if (!stop.lat || !stop.lng) return null;
                            return (
                                <Marker 
                                    key={`draft-${stop.id}`}
                                    position={[stop.lat, stop.lng]} 
                                    icon={createStopMarker(idx + 2, stop.clientName || 'Cliente', COLORS.orange)}
                                >
                                    <Popup>
                                        <div className="text-xs">
                                            <p className="font-bold text-orange-600">{stop.clientName || 'Cliente'}</p>
                                            <p className="text-gray-500">Parada #{idx + 2}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </>
                )}
            </MapContainer>

            {/* --- PREMIUM UI OVERLAYS --- */}
            <MapOverlay>
                {/* TOP BAR: SEARCH & TOOLS */}
                <div className="flex justify-between items-start pointer-events-none">
                    <div className="flex flex-col gap-3">
                        {/* Radar e Performance removidos a pedido do usuário */}
                    </div>

                    {/* RIGHT TOP: MAP MODES */}
                    <div className="flex flex-col gap-2">
                     <GlassControl className="p-1">
                        <button 
                            onClick={() => setMapTheme(mapTheme === 'dark' ? 'standard' : 'dark')}
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-guepardo-accent text-white shadow-glow"
                            title={mapTheme === 'dark' ? "Modo Claro" : "Modo Escuro"}
                        >
                            {mapTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                     </GlassControl>

                         <GlassControl className="p-1">
                            <button 
                                onClick={() => setIsManualFocus(!isManualFocus)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${!isManualFocus ? 'bg-green-500 text-white shadow-glow-green' : 'text-white/40 hover:text-white'}`}
                                title={isManualFocus ? "Foco Manual" : "Auto-Focus"}
                            >
                                <Crosshair size={18} />
                            </button>
                         </GlassControl>
                    </div>
                </div>

                <div className="mt-auto flex justify-between items-end pointer-events-none">
                     {/* BOTTOM LEFT: ORDER SUMMARY OVERLAY removed to declutter */}
                     <div className="flex flex-col gap-4">
                        {/* Fleet Monitoring removido a pedido do usuário */}
                     </div>

                     {/* BOTTOM RIGHT: UTILITY TOOLS */}
                     <div className="flex flex-col gap-2">
                          <GlassControl className="p-1 flex flex-col gap-1 translate-y-2 group-hover/map:translate-y-0 opacity-0 group-hover/map:opacity-100 transition-all duration-500 delay-100">
                               <button 
                                    onClick={() => setActivePanel('share')}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
                                >
                                   <Share2 size={18} />
                               </button>
                               <button 
                                    onClick={() => setActivePanel('chat')}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
                                >
                                   <MessageSquare size={18} />
                               </button>
                               <button 
                                    onClick={() => setActivePanel('info')}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
                                >
                                   <Zap size={18} />
                               </button>
                               <button 
                                    onClick={() => setActivePanel('help')}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
                                >
                                   <HelpCircle size={18} />
                               </button>
                          </GlassControl>
                     </div>
                </div>
            </MapOverlay>

            {/* --- SLIDE PANELS --- */}
            {activePanel === 'info' && (
                <InfoPanel 
                    orders={orders} 
                    onClose={() => setActivePanel(null)} 
                    isDarkMode={isDarkMode}
                />
            )}
            {activePanel === 'help' && (
                <HelpPanel 
                    onClose={() => setActivePanel(null)} 
                    isDarkMode={isDarkMode}
                />
            )}
        </div>
    );
};

// --- SUPPORTING UI SUB-COMPONENTS ---
const InfoPanel = ({ orders, onClose, isDarkMode }: { orders: Order[], onClose: () => void, isDarkMode: boolean }) => (
    <div className="absolute top-8 right-8 bottom-8 w-[340px] bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 z-[2000] animate-in slide-in-from-right-10 duration-500 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">Insights do Dia</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X size={20} className="text-white/40" />
            </button>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-none">
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                <div className="flex justify-between items-end mb-4">
                     <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Volume Total</p>
                        <h4 className="text-4xl font-black italic text-white italic tracking-tighter leading-none">{orders.length}</h4>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">+12% vs Ontem</p>
                        <div className="flex gap-1">
                             {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
                                 <div key={i} className="w-1 bg-green-500/40 rounded-full" style={{ height: `${h * 0.2}px` }}></div>
                             ))}
                        </div>
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Entregues</p>
                    <p className="text-xl font-black italic text-white">42</p>
                </div>
                <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Pendentes</p>
                    <p className="text-xl font-black italic text-guepardo-accent">08</p>
                </div>
            </div>

            <div className="pt-6 border-t border-white/5">
                 <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Status da Frota</h4>
                 <div className="space-y-3">
                      <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Em Trânsito</span>
                          <span className="text-[10px] font-black text-white">12</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-guepardo-accent w-[70%]"></div>
                      </div>
                 </div>
            </div>
        </div>

        <button className="mt-8 w-full h-14 bg-guepardo-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/5 transition-all border border-white/5">
            Gerar Relatório Completo
        </button>
    </div>
);

const HelpPanel = ({ onClose, isDarkMode }: { onClose: () => void, isDarkMode: boolean }) => (
    <div className="absolute top-8 right-8 bottom-8 w-[340px] bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 z-[2000] animate-in slide-in-from-right-10 duration-500 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">Central de Ajuda</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X size={20} className="text-white/40" />
            </button>
        </div>
        <div className="space-y-4">
             <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-guepardo-accent/40 cursor-pointer transition-all">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Guia de Gestão de Pedidos</h4>
                  <p className="text-[9px] text-white/40 uppercase tracking-tighter">Aprenda a monitorar e reagir em tempo real</p>
             </div>
             <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-guepardo-accent/40 cursor-pointer transition-all">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Problemas com Entregador?</h4>
                  <p className="text-[9px] text-white/40 uppercase tracking-tighter">Como cancelar ou redirecionar rotas</p>
             </div>
             <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-guepardo-accent/40 cursor-pointer transition-all">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Treinamento de Equipe</h4>
                  <p className="text-[9px] text-white/40 uppercase tracking-tighter">Vídeo aulas sobre o ecossistema Guepardo</p>
             </div>
        </div>
        <div className="mt-auto pt-8 border-t border-white/5">
             <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 text-center">Suporte Direto</p>
             <button className="w-full h-14 bg-guepardo-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-glow">
                 WhatsApp Suporte
             </button>
        </div>
    </div>
);

const ArrowRight = ({ size, className }: { size: number, className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
);
