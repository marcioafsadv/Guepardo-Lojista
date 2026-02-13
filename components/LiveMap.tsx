
import React, { useEffect, useRef, useState } from 'react';
import { Courier, Order, OrderStatus, StoreProfile } from '../types';
import { Crosshair, Navigation, Plus, Minus } from 'lucide-react';

interface LiveMapProps {
    store: StoreProfile;
    activeOrder: Order | null;
    filteredOrders?: Order[]; // New prop for filtered pins
    availableCouriers?: Courier[];
    onCourierLocationUpdate?: (lat: number, lng: number) => void;
    theme?: string;
}

// --- GEOLOCATION UTILS ---

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
};

const calculateETA = (distanceKm: number): number => {
    const speedKmH = 25; // Adjusted for city traffic
    return Math.ceil((distanceKm / speedKmH) * 60);
};

export const LiveMap: React.FC<LiveMapProps> = ({ store, activeOrder, filteredOrders = [], availableCouriers = [], onCourierLocationUpdate, theme = 'dark', isDrawerOpen = false }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);

    // Storage for different types of markers
    const markersRef = useRef<{
        store?: any;
        rangeCircle?: any;
        orderPins: any[]; // Array of numbered pins
        activeRoute?: any; // Polyline
        activeCourier?: any; // The courier for the SELECTED order
        available: Record<string, any>;
    }>({ orderPins: [], available: {} });

    const requestRef = useRef<number | null>(null);

    // Initialize Map & Handle Theme Changes
    useEffect(() => {
        const L = (window as any).L;
        if (!L || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [store.lat, store.lng],
                zoom: 14,
                zoomControl: false,
                attributionControl: false
            });

            mapInstanceRef.current = map;

            // Store Marker (SaaS Style)
            const storeIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `
                <div class="relative flex flex-col items-center justify-center group">
                    <div class="w-10 h-10 bg-gray-900 rounded-lg shadow-lg border-2 border-white flex items-center justify-center text-white z-20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
                    </div>
                    <div class="absolute -bottom-2 w-6 h-2 bg-black/20 blur-sm rounded-full"></div>
                </div>
            `,
                iconSize: [40, 48],
                iconAnchor: [20, 40]
            });

            markersRef.current.store = L.marker([store.lat, store.lng], { icon: storeIcon, zIndexOffset: 1000 }).addTo(map);
        }

        // Handle Tile Layer Switch based on Theme
        const map = mapInstanceRef.current;
        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
        }

        const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        const tileUrl = isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'; // CartoDB Voyager (Vibrant & Reliable)

        tileLayerRef.current = L.tileLayer(tileUrl, {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(map);

        return () => {
            // Cleanup on unmount handled by parent or empty dep array if needed, 
            // but here we rely on the stable ref logic.
            // Converting to dependency on [theme] to trigger switch.
        };
    }, [theme]); // Trigger when theme changes

    // --- RENDER FILTERED ORDER PINS (NUMBERED) ---
    useEffect(() => {
        const L = (window as any).L;
        const map = mapInstanceRef.current;
        if (!L || !map) return;

        // Clear existing order pins
        markersRef.current.orderPins.forEach(p => p.remove());
        markersRef.current.orderPins = [];

        // Add new pins based on filteredOrders
        filteredOrders.forEach((order, index) => {
            // Skip if delivered or canceled (optional, depends on preference, but usually we show them for history)
            if (!order.destinationLat || !order.destinationLng) return;

            const isSelected = activeOrder?.id === order.id;
            const statusColor =
                order.status === OrderStatus.PENDING ? 'bg-yellow-500' :
                    order.status === OrderStatus.DELIVERED ? 'bg-green-500' :
                        order.status === OrderStatus.RETURNING ? 'bg-purple-600' :
                            'bg-blue-600';

            const pinIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `
                <div class="relative group cursor-pointer transition-transform ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-10'}">
                    <div class="w-8 h-8 ${statusColor} rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs">
                        ${index + 1}
                    </div>
                    ${isSelected ? `<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white"></div>` : ''}
                </div>
            `,
                iconSize: [32, 32],
                iconAnchor: [16, 16] // Center anchor
            });

            // Helper to translate status
            const translateStatus = (status: OrderStatus) => {
                switch (status) {
                    case OrderStatus.PENDING: return 'Pendente';
                    case OrderStatus.ACCEPTED: return 'Aceito pelo Entregador';
                    case OrderStatus.TO_STORE: return 'A Caminho da Loja';
                    case OrderStatus.READY_FOR_PICKUP: return 'Aguardando Coleta';
                    case OrderStatus.IN_TRANSIT: return 'Em Trânsito';
                    case OrderStatus.RETURNING: return 'Em Retorno';
                    case OrderStatus.DELIVERED: return 'Entregue';
                    case OrderStatus.CANCELED: return 'Cancelado';
                    default: return status;
                }
            };

            const marker = L.marker([order.destinationLat, order.destinationLng], { icon: pinIcon })
                .addTo(map)
                .bindPopup(`
                <div class="font-sans text-sm p-1">
                    <strong>#${order.id.slice(-4)} ${order.clientName}</strong><br/>
                    <span class="text-xs text-gray-500">${translateStatus(order.status)}</span>
                </div>
            `);

            markersRef.current.orderPins.push(marker);
        });

    }, [filteredOrders, activeOrder]);


    // --- HANDLE ACTIVE ORDER ROUTE ---
    useEffect(() => {
        const L = (window as any).L;
        const map = mapInstanceRef.current;
        if (!L || !map) return;

        // Cleanup previous active route/courier
        if (markersRef.current.activeRoute) { markersRef.current.activeRoute.remove(); markersRef.current.activeRoute = null; }
        if (markersRef.current.activeCourier) { markersRef.current.activeCourier.remove(); markersRef.current.activeCourier = null; }

        if (activeOrder && activeOrder.courier && activeOrder.status !== OrderStatus.DELIVERED && activeOrder.status !== OrderStatus.CANCELED) {

            let startPoint: [number, number] = [activeOrder.courier.lat, activeOrder.courier.lng];
            let endPoint: [number, number] = [activeOrder.destinationLat || store.lat, activeOrder.destinationLng || store.lng];

            // If Picking up OR Returning: Courier -> Store
            if (activeOrder.status === OrderStatus.ACCEPTED || activeOrder.status === OrderStatus.TO_STORE || activeOrder.status === OrderStatus.RETURNING) {
                endPoint = [store.lat, store.lng];
            }

            const isReturning = activeOrder.status === OrderStatus.RETURNING;

            // Draw Route
            markersRef.current.activeRoute = L.polyline([startPoint, endPoint], {
                color: isReturning ? '#9333ea' : '#3B82F6', // Purple if returning, Blue otherwise
                weight: 4,
                opacity: 0.7,
                dashArray: '5, 10',
                lineCap: 'round'
            }).addTo(map);

            // Courier Marker (Cheetah Scooter Style)
            const courierIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `
                <div class="relative flex flex-col items-center justify-end group w-full h-full cursor-help hover:z-50">
                    <!-- Custom Cheetah Icon -->
                    <img src="/cheetah-scooter.png" 
                         class="w-24 h-24 object-contain z-10 transition-transform duration-300 ease-out group-hover:scale-110 origin-bottom filter drop-shadow-xl" 
                         onerror="this.onerror=null;this.src='/helmet-orange.png';"
                    />
                    
                    <!-- Shadow (adjusted for pin tip) -->
                    <div class="w-4 h-1.5 bg-black/40 rounded-full blur-[2px] mb-0.5 transition-all group-hover:w-6 group-hover:opacity-30"></div>

                    <!-- Tooltip (Hover Only) -->
                    <div class="absolute -top-[5rem] left-1/2 -translate-x-1/2 bg-gray-900 border border-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 pointer-events-none z-50 whitespace-nowrap backdrop-blur-sm bg-opacity-95">
                        <div class="flex flex-col items-center gap-0.5">
                            <span class="font-bold text-xs uppercase tracking-wider text-yellow-500">${activeOrder.courier.name}</span>
                            <span class="text-[10px] text-gray-400 font-mono tracking-tight flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full ${isReturning ? 'bg-purple-500' : 'bg-green-500'} animate-pulse"></span>
                                ${isReturning ? 'EM RETORNO' : 'EM ROTA'}
                            </span>
                        </div>
                        <!-- Arrow -->
                        <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 border-r border-b border-yellow-500/20 transform rotate-45"></div>
                    </div>
                </div>
            `,
                iconSize: [96, 96], // Larger for detailed cheetah
                iconAnchor: [48, 80] // Anchor bottom center
            });
            markersRef.current.activeCourier = L.marker(startPoint, { icon: courierIcon, zIndexOffset: 2000 }).addTo(map);

            // Fly to fit route - Full Screen centered
            map.fitBounds(L.latLngBounds([startPoint, endPoint]), {
                padding: [50, 50],
                maxZoom: 16,
                animate: true,
                duration: 1.5
            });
        }

    }, [activeOrder]);

    // --- RENDER AVAILABLE COURIERS ---
    useEffect(() => {
        const L = (window as any).L;
        const map = mapInstanceRef.current;
        if (!L || !map) return;

        // Clear existing available markers
        Object.values(markersRef.current.available).forEach((m: any) => m.remove());
        markersRef.current.available = {};

        availableCouriers.forEach(courier => {
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `
                <div class="relative flex flex-col items-center justify-end group w-full h-full cursor-pointer z-10 hover:z-50 transition-all duration-500">
                    <!-- Custom Cheetah Icon -->
                    <img src="/cheetah-scooter.png" 
                         class="w-16 h-16 object-contain transition-transform duration-300 group-hover:scale-125 origin-bottom opacity-90 group-hover:opacity-100 filter drop-shadow-md" 
                         onerror="this.onerror=null;this.src='/helmet-orange.png';"
                    />
                    
                    <!-- Shadow (for pin tip) -->
                    <div class="w-3 h-1 bg-black/30 rounded-full blur-[1px] mb-0.5 transition-all group-hover:w-4 group-hover:opacity-20"></div>

                    <!-- Tooltip (Hover Only) -->
                    <div class="absolute -top-[3.5rem] left-1/2 -translate-x-1/2 bg-gray-900 border border-white/10 text-white px-2 py-1 rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:-translate-y-1 translate-y-2 pointer-events-none whitespace-nowrap z-50">
                        <div class="text-center leading-tight">
                            <span class="block text-[10px] font-bold text-yellow-500 uppercase">${courier.name}</span>
                            <span class="block text-[9px] text-gray-500 font-mono tracking-tighter">${courier.vehiclePlate}</span>
                        </div>
                        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                </div>
            `,
                iconSize: [64, 64],
                iconAnchor: [32, 60]
            });

            const marker = L.marker([courier.lat, courier.lng], { icon }).addTo(map);
            markersRef.current.available[courier.id] = marker;
        });

    }, [availableCouriers]);

    // --- CONTROLS ---
    const handleZoomIn = () => mapInstanceRef.current?.setZoom(mapInstanceRef.current.getZoom() + 1);
    const handleZoomOut = () => mapInstanceRef.current?.setZoom(mapInstanceRef.current.getZoom() - 1);
    const handleRecenter = () => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (activeOrder && activeOrder.destinationLat) {
            map.flyTo([activeOrder.destinationLat, activeOrder.destinationLng], 16);
        } else {
            map.flyTo([store.lat, store.lng], 15);
        }
    };

    return (
        <div className="w-full h-full relative group bg-gray-100">
            <div id="map" ref={mapContainerRef} className="w-full h-full z-0" />

            {/* AVAILABLE COURIERS BADGE */}
            <div className="absolute top-4 right-4 z-[400] bg-guepardo-gray-800/90 backdrop-blur px-3 py-2 rounded-xl shadow-lg border border-white/10 flex items-center gap-3 transition-all hover:bg-guepardo-gray-800 group">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-guepardo-gray-900 text-status-green border border-white/5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v4Z" /><path d="M5 16h-.5A2.5 2.5 0 0 1 2 13.5V11h3" /><path d="M19 14h2.5A2.5 2.5 0 0 0 24 11.5V10h-5" /><circle cx="5.5" cy="16.5" r="3.5" /><circle cx="18.5" cy="16.5" r="3.5" /><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    <div className="absolute top-0 right-0 -mr-1 -mt-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase leading-none tracking-wide group-hover:text-guepardo-accent transition-colors">Disponíveis</span>
                    <span className="text-sm font-bold text-white leading-none mt-1">{availableCouriers.length} entregadores</span>
                </div>
            </div>

            {/* SaaS Style Map Controls (Bottom Right) */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-[400]">

                <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col overflow-hidden">
                    <button
                        onClick={handleZoomIn}
                        className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 text-gray-600 border-b border-gray-100 transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                        <Minus size={18} />
                    </button>
                </div>

                <button
                    onClick={handleRecenter}
                    className="w-9 h-9 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-blue-600 transition-colors"
                >
                    <Crosshair size={18} />
                </button>
            </div>

        </div>
    );
};
