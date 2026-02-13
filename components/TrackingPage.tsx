import React, { useEffect, useRef, useState } from 'react';
import { OrderStatus } from '../types';
import { Navigation, Phone } from 'lucide-react';

// Mock Data for Demo
const MOCK_COURIER_LOC = { lat: -23.55052, lng: -46.63330 };
const MOCK_DESTINATION = { lat: -23.555, lng: -46.635 };

export const TrackingPage: React.FC = () => {
    const [id, setId] = useState<string>('');
    const [mockOrder, setMockOrder] = useState<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<{
        courier?: any;
        destination?: any;
        route?: any;
    }>({});

    // 1. ID Extraction
    useEffect(() => {
        const pathParts = window.location.pathname.split('/');
        const trackingId = pathParts[pathParts.length - 1];
        setId(trackingId);
    }, []);

    // 2. Fetch Data
    useEffect(() => {
        setTimeout(() => {
            setMockOrder({
                id: '12345',
                clientName: 'Roberto Mendes',
                status: OrderStatus.IN_TRANSIT,
                courier: {
                    name: 'Roberto Almeida',
                    vehiclePlate: 'BRA-2E19',
                    photoUrl: 'https://ui-avatars.com/api/?name=Roberto+Almeida&background=FFC107&color=000',
                    lat: MOCK_COURIER_LOC.lat,
                    lng: MOCK_COURIER_LOC.lng
                },
                eta: '12 min',
                destination: MOCK_DESTINATION
            });
        }, 1000);
    }, [id]);

    // 3. Initialize Map
    useEffect(() => {
        const L = (window as any).L;
        if (!L || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [MOCK_COURIER_LOC.lat, MOCK_COURIER_LOC.lng],
                zoom: 15,
                zoomControl: false,
                attributionControl: false
            });

            // Dark Mode Tiles
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                subdomains: 'abcd',
                attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
            }).addTo(map);

            mapInstanceRef.current = map;
        }

        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // 4. Update Markers
    useEffect(() => {
        const L = (window as any).L;
        const map = mapInstanceRef.current;
        if (!L || !map || !mockOrder) return;

        // Courier Icon
        const courierIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div class="relative flex flex-col items-center justify-center">
                   <div class="w-12 h-12 bg-white rounded-full p-1 shadow-lg z-20 relative">
                        <img src="${mockOrder.courier.photoUrl}" class="w-full h-full rounded-full object-cover" />
                        <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                   </div>
                   <div class="w-4 h-1.5 bg-black/50 blur-sm rounded-full mt-1"></div>
                </div>
            `,
            iconSize: [48, 60],
            iconAnchor: [24, 48]
        });

        // Destination Icon
        const destIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 border-2 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        // Clear old
        if (markersRef.current.courier) markersRef.current.courier.remove();
        if (markersRef.current.destination) markersRef.current.destination.remove();
        if (markersRef.current.route) markersRef.current.route.remove();

        // Add New
        markersRef.current.courier = L.marker([mockOrder.courier.lat, mockOrder.courier.lng], { icon: courierIcon }).addTo(map);
        markersRef.current.destination = L.marker([mockOrder.destination.lat, mockOrder.destination.lng], { icon: destIcon }).addTo(map);

        // Fit Bounds
        const bounds = L.latLngBounds(
            [mockOrder.courier.lat, mockOrder.courier.lng],
            [mockOrder.destination.lat, mockOrder.destination.lng]
        );
        map.fitBounds(bounds, { padding: [50, 100] }); // Extra bottom padding for card

        // Polyline
        markersRef.current.route = L.polyline([
            [mockOrder.courier.lat, mockOrder.courier.lng],
            [mockOrder.destination.lat, mockOrder.destination.lng]
        ], {
            color: '#f97316', // Orange-500
            weight: 4,
            dashArray: '10, 10',
            opacity: 0.6
        }).addTo(map);

    }, [mockOrder]);

    if (!mockOrder) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full relative bg-gray-900 overflow-hidden">
            {/* Map */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Floating Status Card */}
            <div className="fixed bottom-0 left-0 right-0 p-4 z-[1000] pb-8">
                <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl max-w-md mx-auto animate-in slide-in-from-bottom duration-500">

                    {/* Header: Status */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                        <div>
                            <span className="text-orange-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                Em Rota de Entrega
                            </span>
                            <h2 className="text-white text-xl font-bold mt-1">Chegando em {mockOrder.eta}</h2>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                            <Navigation size={20} />
                        </div>
                    </div>

                    {/* Courier Info */}
                    <div className="flex items-center gap-4">
                        <img src={mockOrder.courier.photoUrl} className="w-12 h-12 rounded-full border-2 border-orange-500" />
                        <div className="flex-1">
                            <h3 className="text-white font-bold">{mockOrder.courier.name}</h3>
                            <p className="text-gray-400 text-xs">{mockOrder.courier.vehiclePlate} • Honda CG 160</p>
                        </div>

                        {/* Safe Actions */}
                        <a href={`tel:123456789`} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                            <Phone size={18} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Brand Watermark */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest">Guepardo Delivery</span>
            </div>
        </div>
    );
};
