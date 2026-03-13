import React, { useState, useEffect, useRef } from 'react';
import { OrderStatus } from '../types';
import { Navigation, Phone, MapPin, Clock, Package, CheckCircle2, MessageCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabaseClient';

export const TrackingPage: React.FC = () => {
    const [id, setId] = useState<string>('');
    const [order, setOrder] = useState<any>(null);
    const [courierProfile, setCourierProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<{
        courier?: any;
        destination?: any;
        route?: any;
    }>({});

    // 1. ID Extraction from URL
    useEffect(() => {
        const pathParts = window.location.pathname.split('/');
        const trackingId = pathParts[pathParts.length - 1];
        if (trackingId) {
            setId(trackingId);
        }
    }, []);

    // 2. Fetch Initial Order and Courier Data
    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                // Fetch Order
                const { data: deliveryData, error: deliveryError } = await supabase
                    .from('deliveries')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (deliveryError) throw deliveryError;
                setOrder(deliveryData);

                // Fetch Courier Profile if assigned
                if (deliveryData.driver_id) {
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', deliveryData.driver_id)
                        .single();

                    if (!profileError) {
                        setCourierProfile(profileData);
                    }
                }
                setLoading(false);
            } catch (err) {
                console.error("Error fetching tracking data:", err);
                setLoading(false);
            }
        };

        fetchData();

        // High-frequency polling as fallback for location tracking
        const pollInterval = setInterval(fetchData, 8000);

        // 3. Real-time Subscription
        const channel = supabase
            .channel(`tracking:${id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'deliveries', filter: `id=eq.${id}` },
                async (payload) => {
                    console.log("Order updated:", payload.new);
                    setOrder(payload.new);

                    // If driver changed or was assigned, fetch profile
                    if (payload.new.driver_id && (!courierProfile || courierProfile.id !== payload.new.driver_id)) {
                        const { data: profileData } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', payload.new.driver_id)
                            .single();
                        if (profileData) setCourierProfile(profileData);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles' },
                (payload) => {
                    // Update courier position if it's the one assigned to this order
                    if (order && payload.new.id === order.driver_id) {
                        console.log("Courier moved:", payload.new.current_lat, payload.new.current_lng);
                        setCourierProfile(payload.new);
                    }
                }
            )
            .subscribe();

        return () => {
            clearInterval(pollInterval);
            supabase.removeChannel(channel);
        };
    }, [id, order?.driver_id]);

    // 4. Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [-23.2642, -47.2991], // Default Itu
                zoom: 15,
                zoomControl: false,
                attributionControl: false
            });

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                subdomains: 'abcd'
            }).addTo(map);

            mapInstanceRef.current = map;
        }
    }, [loading]);

    // 5. Update Markers and Map View
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !order) return;

        const destLat = order.items?.destinationLat || order.destination_lat;
        const destLng = order.items?.destinationLng || order.destination_lng;
        const courierLat = courierProfile?.current_lat;
        const courierLng = courierProfile?.current_lng;

        // Clear existing markers
        if (markersRef.current.courier) markersRef.current.courier.remove();
        if (markersRef.current.destination) markersRef.current.destination.remove();
        if (markersRef.current.route) markersRef.current.route.remove();

        const markers: L.LatLngExpression[] = [];

        // Destination Marker
        if (destLat && destLng) {
            const destIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `
                    <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 border-2 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });
            markersRef.current.destination = L.marker([destLat, destLng], { icon: destIcon }).addTo(map);
            markers.push([destLat, destLng]);
        }

        // Courier Marker
        if (courierLat && courierLng) {
            const courierIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `
                    <div class="relative flex flex-col items-center justify-center">
                       <div class="w-12 h-12 bg-white rounded-full p-1 shadow-lg z-20 relative border-2 border-orange-500">
                            <img src="${courierProfile.avatar_url || 'https://ui-avatars.com/api/?name=Moto&background=FFC107'}" class="w-full h-full rounded-full object-cover" />
                            <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                       </div>
                       <div class="w-4 h-1.5 bg-black/50 blur-sm rounded-full mt-1"></div>
                    </div>
                `,
                iconSize: [48, 60],
                iconAnchor: [24, 48]
            });
            markersRef.current.courier = L.marker([courierLat, courierLng], { icon: courierIcon }).addTo(map);
            markers.push([courierLat, courierLng]);

            // Route Line
            if (destLat && destLng) {
                markersRef.current.route = L.polyline([
                    [courierLat, courierLng],
                    [destLat, destLng]
                ], {
                    color: '#f97316',
                    weight: 3,
                    dashArray: '5, 10',
                    opacity: 0.5
                }).addTo(map);
            }
        }

        if (markers.length > 0) {
            const bounds = L.latLngBounds(markers);
            map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
        }
    }, [order, courierProfile]);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Aguardando Entregador', color: 'text-yellow-500', bg: 'bg-yellow-500/10', step: 1 };
            case 'accepted':
            case 'ready_for_pickup':
            case 'arrived_pickup': return { label: 'Em Coleta', color: 'text-blue-500', bg: 'bg-blue-500/10', step: 2 };
            case 'in_transit': return { label: 'A caminho de você', color: 'text-orange-500', bg: 'bg-orange-500/10', step: 3 };
            case 'completed': return { label: 'Entregue', color: 'text-green-500', bg: 'bg-green-500/10', step: 4 };
            case 'cancelled': return { label: 'Cancelado', color: 'text-red-500', bg: 'bg-red-500/10', step: 0 };
            default: return { label: 'Processando', color: 'text-gray-400', bg: 'bg-gray-400/10', step: 1 };
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0b] text-white">
                <div className="w-20 h-20 relative mb-6">
                    <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <img src="/logo-icon.png" className="absolute inset-4 opacity-50" alt="" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500 animate-pulse">Localizando Pedido...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0b] text-white p-6 text-center">
                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <MapPin size={32} />
                </div>
                <h2 className="text-xl font-bold mb-2">Pedido não encontrado</h2>
                <p className="text-gray-400 text-sm max-w-xs">Não conseguimos localizar as informações deste rastreamento. Verifique o link ou entre em contato com a loja.</p>
            </div>
        );
    }

    const statusInfo = getStatusInfo(order.status);

    return (
        <div className="h-screen w-full relative bg-[#0a0a0b] overflow-hidden font-sans">
            {/* Map Background */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Top Bar Branding */}
            <div className="absolute top-0 left-0 right-0 p-6 z-[1000] pointer-events-none">
                <div className="max-w-md mx-auto flex justify-center">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-2.5 rounded-full flex items-center gap-3">
                        <img src="https://eviukbluwrwcblwhkzwz.supabase.co/storage/v1/object/public/courier-documents/public/logo-guepardo.png" className="h-5" alt="Guepardo" />
                        <div className="h-4 w-px bg-white/20"></div>
                        <span className="text-white/70 text-[10px] uppercase font-black tracking-[0.2em]">Live Tracking</span>
                    </div>
                </div>
            </div>

            {/* Bottom Interaction Area */}
            <div className="fixed bottom-0 left-0 right-0 p-4 z-[1000] pb-safe">
                <div className="max-w-md mx-auto space-y-3">

                    {/* Progress Stepper Card */}
                    <div className="bg-[#121214]/90 backdrop-blur-2xl border border-white/5 rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-700">

                        {/* Status Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} text-[10px] font-black uppercase tracking-widest mb-2`}>
                                    <span className="relative flex h-2 w-2">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusInfo.color.replace('text', 'bg')}`}></span>
                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.color.replace('text', 'bg')}`}></span>
                                    </span>
                                    {statusInfo.label}
                                </div>
                                <h1 className="text-white text-2xl font-black tracking-tight leading-none">
                                    {order.status === 'completed' ? 'Pedido Entregue!' :
                                        order.status === 'in_transit' ? 'Chegando em breve' :
                                            'Preparando tudo'}
                                </h1>
                            </div>
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 border border-white/5">
                                {order.status === 'completed' ? <CheckCircle2 size={28} className="text-green-500" /> : <Clock size={28} />}
                            </div>
                        </div>

                        {/* Visual Timeline */}
                        <div className="relative flex justify-between items-center px-2 mb-10">
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/5 -translate-y-1/2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 transition-all duration-1000"
                                    style={{ width: `${Math.max(0, (statusInfo.step - 1) * 33.33)}%` }}
                                />
                            </div>
                            {[1, 2, 3, 4].map((s) => (
                                <div key={s} className="relative z-10">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${s <= statusInfo.step ? 'bg-orange-500 border-[#121214] text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-[#1a1a1e] border-[#121214] text-white/10'
                                        }`}>
                                        {s === 1 && <Package size={14} />}
                                        {s === 2 && <Navigation size={14} />}
                                        {s === 3 && <MapPin size={14} />}
                                        {s === 4 && <CheckCircle2 size={14} />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Courier Details */}
                        {courierProfile ? (
                            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                <img src={courierProfile.avatar_url || 'https://ui-avatars.com/api/?name=C&background=FFC107'} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt="" />
                                <div className="flex-1">
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-0.5">Entregador</p>
                                    <h3 className="text-white font-bold text-base leading-none">{courierProfile.full_name || courierProfile.name || 'Seu Entregador'}</h3>
                                    <p className="text-orange-500/80 text-[10px] font-black uppercase tracking-tighter mt-1">{courierProfile.vehicle || 'MOTO'} • ITU/SP</p>
                                </div>
                                <a href={`tel:${courierProfile.phone}`} className="w-12 h-12 bg-orange-500 hover:bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all">
                                    <Phone size={20} />
                                </a>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 opacity-50">
                                <div className="w-12 h-12 bg-white/5 rounded-xl animate-pulse"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-2 w-20 bg-white/10 rounded animate-pulse"></div>
                                    <div className="h-3 w-32 bg-white/10 rounded animate-pulse"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Store Contact & Order ID Overlay */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.open(`https://wa.me/5511999999999`, '_blank')}
                            className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 py-4 px-6 rounded-[24px] flex items-center justify-center gap-3 font-bold text-xs transition-all active:scale-95"
                        >
                            <MessageCircle size={18} />
                            Falar com a Loja
                        </button>
                        <div className="px-5 py-4 bg-white/5 border border-white/5 rounded-[24px] flex items-center justify-center">
                            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">#{order.id.slice(-4)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
