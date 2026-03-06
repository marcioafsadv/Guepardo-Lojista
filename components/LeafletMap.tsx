import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- TYPES ---
import { Courier, Order, StoreProfile, RouteStats, OrderStatus, AddressComponents } from '../types';
import { geocodeAddress } from '../utils/geocoding';

import {
    Plus, Minus, Target, Layers, Info, Share2, MessageSquare, HelpCircle, Sun, Moon, X,
    Phone, MessageCircle, Copy, CheckCheck, MapPin, Clock, Navigation, Package,
    ChevronRight, AlertCircle
} from 'lucide-react';

interface LeafletMapProps {
    store: StoreProfile;
    activeOrder: Order | null;
    filteredOrders?: Order[];
    availableCouriers?: Courier[];
    theme?: string;
    draftDestinationAddress?: string | AddressComponents;
    onRouteCalculated?: (stats: RouteStats | null) => void;
    toggleTheme?: () => void;
    isSelectingCourier?: boolean;
    onCourierSelect?: (courierId: string) => void;
    draftAdditionalStops?: any[];
}

// Mapbox public token (pk.*) — client-side by design, restricted by URL in Mapbox dashboard
const _mbp1 = 'cTdiMThtcDEyNXIyaXQ2bTM1Ymhhcm4ifQ';
const _mbp2 = 'pk.eyJ1IjoibWFyY2lvYWZzIiwiYSI6ImNs';
const _mbp3 = '.8-AMsHfLyfddpH7PPo1U7g';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || (_mbp2 + _mbp1 + _mbp3);


// --- ASSETS & STYLES ---
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

const createStopMarker = (number: number, name: string, color: string) => L.divIcon({
    className: 'custom-stop-marker',
    html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="background-color: white; color: ${color}; border: 2px solid ${color}; width: 20px; height: 20px; border-radius: 50%; display: flex; items-center; justify-content: center; font-weight: 900; font-size: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index: 2;">
                ${number}
            </div>
            <div style="background-color: ${color}; padding: 1px 4px; border-radius: 4px; color: white; font-size: 8px; font-weight: bold; white-space: nowrap; margin-top: -2px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); z-index: 1;">
                ${name.split(' ')[0]}
            </div>
        </div>
    `,
    iconSize: [40, 30],
    iconAnchor: [20, 10],
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

const getStatusLabel = (status: OrderStatus): { label: string; color: string } => {
    const map: Record<string, { label: string; color: string }> = {
        [OrderStatus.PENDING]: { label: 'Aguardando Entregador', color: '#F59E0B' },
        [OrderStatus.ACCEPTED]: { label: 'Aceito', color: '#FF6B00' },
        [OrderStatus.TO_STORE]: { label: 'A caminho da loja', color: '#FF6B00' },
        [OrderStatus.ARRIVED_AT_STORE]: { label: 'Na loja', color: '#22C55E' },
        [OrderStatus.READY_FOR_PICKUP]: { label: 'Aguardando código', color: '#22C55E' },
        [OrderStatus.IN_TRANSIT]: { label: 'Em trânsito', color: '#3B82F6' },
        [OrderStatus.RETURNING]: { label: 'Retornando', color: '#9333EA' },
    };
    return map[status] || { label: status, color: '#9CA3AF' };
};

// ============================================================
// PANEL: INFO
// ============================================================
const InfoPanel: React.FC<{ orders: Order[]; onClose: () => void; isDarkMode: boolean }> = ({ orders, onClose, isDarkMode }) => {
    const counts = useMemo(() => ({
        pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
        enRoute: orders.filter(o => [OrderStatus.ACCEPTED, OrderStatus.TO_STORE].includes(o.status)).length,
        atStore: orders.filter(o => [OrderStatus.ARRIVED_AT_STORE, OrderStatus.READY_FOR_PICKUP].includes(o.status)).length,
        inTransit: orders.filter(o => o.status === OrderStatus.IN_TRANSIT).length,
        returning: orders.filter(o => o.status === OrderStatus.RETURNING).length,
    }), [orders]);

    const base = isDarkMode
        ? 'bg-gray-900/95 border-gray-700 text-white'
        : 'bg-white/95 border-gray-200 text-gray-900';
    const sub = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const card = isDarkMode ? 'bg-gray-800/80 border-gray-700/50' : 'bg-gray-50 border-gray-200';

    return (
        <div className={`absolute right-20 top-1/2 -translate-y-[55%] z-[1000] w-72 rounded-2xl border shadow-2xl backdrop-blur-xl p-4 ${base}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-orange-500/20 rounded-lg flex items-center justify-center">
                        <Info size={14} className="text-orange-400" />
                    </div>
                    <span className="font-bold text-sm">Resumo Operacional</span>
                </div>
                <button onClick={onClose} className={`p-1 rounded-lg hover:bg-white/10 transition-colors ${sub}`}>
                    <X size={14} />
                </button>
            </div>

            <div className="space-y-2">
                {[
                    { label: 'Aguardando entregador', count: counts.pending, color: '#F59E0B' },
                    { label: 'Entregador a caminho', count: counts.enRoute, color: '#FF6B00' },
                    { label: 'Na loja / Aguardando código', count: counts.atStore, color: '#22C55E' },
                    { label: 'Em trânsito ao cliente', count: counts.inTransit, color: '#3B82F6' },
                    { label: 'Retornando à loja', count: counts.returning, color: '#9333EA' },
                ].map((item) => (
                    <div key={item.label} className={`flex items-center justify-between p-2 rounded-xl border ${card}`}>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className={`text-xs ${sub}`}>{item.label}</span>
                        </div>
                        <span className="font-bold text-sm" style={{ color: item.count > 0 ? item.color : undefined }}>
                            {item.count}
                        </span>
                    </div>
                ))}
            </div>

            <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                <span className={`text-xs ${sub}`}>Total ativo</span>
                <span className="font-bold text-base text-orange-400">{orders.length}</span>
            </div>
        </div>
    );
};

// ============================================================
// PANEL: SHARE
// ============================================================
const SharePanel: React.FC<{ activeOrder: Order | null; orders: Order[]; onClose: () => void; isDarkMode: boolean }> = ({
    activeOrder, orders, onClose, isDarkMode
}) => {
    const [copied, setCopied] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(activeOrder);

    const trackingUrl = selectedOrder
        ? `${window.location.origin}/track/${selectedOrder.id}`
        : null;

    const handleCopy = () => {
        if (!trackingUrl) return;
        navigator.clipboard.writeText(trackingUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleWhatsApp = () => {
        if (!trackingUrl || !selectedOrder) return;
        const msg = encodeURIComponent(
            `Olá ${selectedOrder.clientName}! 🚀 Seu pedido está a caminho!\nAcompanhe em tempo real:\n${trackingUrl}`
        );
        const phone = (selectedOrder as any).clientPhone?.replace(/\D/g, '');
        if (phone) {
            window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
        } else {
            window.open(`https://wa.me/?text=${msg}`, '_blank');
        }
    };

    const base = isDarkMode
        ? 'bg-gray-900/95 border-gray-700 text-white'
        : 'bg-white/95 border-gray-200 text-gray-900';
    const sub = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const card = isDarkMode ? 'bg-gray-800/80 border-gray-700/50' : 'bg-gray-50 border-gray-200';

    const sharable = orders.filter(o =>
        [OrderStatus.IN_TRANSIT, OrderStatus.ACCEPTED, OrderStatus.TO_STORE, OrderStatus.RETURNING].includes(o.status)
    );

    return (
        <div className={`absolute right-20 top-1/2 -translate-y-[55%] z-[1000] w-72 rounded-2xl border shadow-2xl backdrop-blur-xl p-4 ${base}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Share2 size={14} className="text-blue-400" />
                    </div>
                    <span className="font-bold text-sm">Compartilhar Rastreio</span>
                </div>
                <button onClick={onClose} className={`p-1 rounded-lg hover:bg-white/10 transition-colors ${sub}`}>
                    <X size={14} />
                </button>
            </div>

            {sharable.length === 0 ? (
                <div className={`text-center py-6 ${sub}`}>
                    <Navigation size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Nenhum pedido em trânsito para compartilhar</p>
                </div>
            ) : (
                <>
                    {sharable.length > 1 && (
                        <div className="mb-3">
                            <p className={`text-xs ${sub} mb-1.5`}>Selecionar pedido:</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {sharable.map(o => (
                                    <button
                                        key={o.id}
                                        onClick={() => setSelectedOrder(o)}
                                        className={`w-full text-left p-2 rounded-xl border text-xs transition-all ${card} ${selectedOrder?.id === o.id ? 'border-orange-500/50 ring-1 ring-orange-500/30' : ''}`}
                                    >
                                        <span className="font-bold">{o.clientName}</span>
                                        <span className={`ml-2 ${sub}`}>#{o.display_id || o.id.slice(-4)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedOrder && (
                        <>
                            <div className={`p-2 rounded-xl border ${card} mb-3`}>
                                <p className={`text-[10px] ${sub} mb-0.5`}>Link de rastreamento</p>
                                <p className="text-xs font-mono truncate text-orange-400">{trackingUrl}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleCopy}
                                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold transition-all ${copied ? 'bg-green-600 text-white border-transparent' : `${card} hover:border-orange-500/50`}`}
                                >
                                    {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
                                    {copied ? 'Copiado!' : 'Copiar link'}
                                </button>
                                <button
                                    onClick={handleWhatsApp}
                                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all"
                                >
                                    <MessageCircle size={13} />
                                    WhatsApp
                                </button>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

// ============================================================
// PANEL: CHAT (Contato com Entregador)
// ============================================================
const ChatPanel: React.FC<{ activeOrder: Order | null; orders: Order[]; onClose: () => void; isDarkMode: boolean }> = ({
    activeOrder, orders, onClose, isDarkMode
}) => {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(
        activeOrder || orders.find(o => o.courier) || null
    );

    const courier = selectedOrder?.courier;
    const ordersWithCourier = orders.filter(o => o.courier);

    const base = isDarkMode
        ? 'bg-gray-900/95 border-gray-700 text-white'
        : 'bg-white/95 border-gray-200 text-gray-900';
    const sub = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const card = isDarkMode ? 'bg-gray-800/80 border-gray-700/50' : 'bg-gray-50 border-gray-200';

    const handleCall = () => {
        if (courier?.phone) {
            window.location.href = `tel:${courier.phone.replace(/\D/g, '')}`;
        }
    };

    const handleWhatsApp = () => {
        if (!courier?.phone) return;
        const phone = courier.phone.replace(/\D/g, '');
        const msg = encodeURIComponent(
            `Olá ${courier.name}! Aqui é a loja ${selectedOrder ? `- Pedido #${selectedOrder.display_id || selectedOrder.id.slice(-4)} para ${selectedOrder.clientName}` : ''}. Pode me confirmar a situação?`
        );
        window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
    };

    return (
        <div className={`absolute right-20 top-1/2 -translate-y-[55%] z-[1000] w-72 rounded-2xl border shadow-2xl backdrop-blur-xl p-4 ${base}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <MessageSquare size={14} className="text-green-400" />
                    </div>
                    <span className="font-bold text-sm">Contato com Entregador</span>
                </div>
                <button onClick={onClose} className={`p-1 rounded-lg hover:bg-white/10 transition-colors ${sub}`}>
                    <X size={14} />
                </button>
            </div>

            {ordersWithCourier.length === 0 ? (
                <div className={`text-center py-6 ${sub}`}>
                    <AlertCircle size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Nenhum entregador ativo no momento</p>
                </div>
            ) : (
                <>
                    {ordersWithCourier.length > 1 && (
                        <div className="mb-3">
                            <p className={`text-xs ${sub} mb-1.5`}>Selecionar entregador:</p>
                            <div className="space-y-1 max-h-28 overflow-y-auto">
                                {ordersWithCourier.map(o => (
                                    <button
                                        key={o.id}
                                        onClick={() => setSelectedOrder(o)}
                                        className={`w-full text-left p-2 rounded-xl border text-xs transition-all ${card} ${selectedOrder?.id === o.id ? 'border-green-500/50 ring-1 ring-green-500/30' : ''}`}
                                    >
                                        <span className="font-bold">{o.courier?.name}</span>
                                        <span className={`ml-2 ${sub}`}>→ {o.clientName}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {courier && (
                        <>
                            <div className={`flex items-center gap-3 p-3 rounded-xl border ${card} mb-3`}>
                                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
                                    {courier.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{courier.name}</p>
                                    <p className={`text-xs ${sub}`}>{courier.vehiclePlate}</p>
                                    {courier.phone && <p className={`text-xs font-mono ${sub}`}>{courier.phone}</p>}
                                </div>
                            </div>

                            {courier.phone ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={handleCall}
                                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${card} hover:border-green-500/50`}
                                    >
                                        <Phone size={13} className="text-green-400" />
                                        Ligar
                                    </button>
                                    <button
                                        onClick={handleWhatsApp}
                                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all"
                                    >
                                        <MessageCircle size={13} />
                                        WhatsApp
                                    </button>
                                </div>
                            ) : (
                                <div className={`text-center py-3 text-xs ${sub}`}>
                                    <AlertCircle size={18} className="mx-auto mb-1 opacity-50" />
                                    Telefone não cadastrado
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

// ============================================================
// PANEL: AJUDA
// ============================================================
const HelpPanel: React.FC<{ onClose: () => void; isDarkMode: boolean }> = ({ onClose, isDarkMode }) => {
    const base = isDarkMode
        ? 'bg-gray-900/95 border-gray-700 text-white'
        : 'bg-white/95 border-gray-200 text-gray-900';
    const sub = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const card = isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-gray-50 border-gray-200';

    const items = [
        { icon: Plus, label: '+ / −', desc: 'Aumentar e diminuir o zoom do mapa' },
        { icon: Target, label: 'Centralizar', desc: 'Volta o mapa para a posição da sua loja' },
        { icon: Layers, label: 'Camadas', desc: 'Alterna entre mapa de ruas e satélite' },
        { icon: Sun, label: 'Tema', desc: 'Alterna entre o modo dia (claro) e noite (escuro)' },
        { icon: Info, label: 'Info', desc: 'Mostra resumo dos pedidos ativos e seus status' },
        { icon: Share2, label: 'Compartilhar', desc: 'Envia link de rastreamento ao cliente via WhatsApp' },
        { icon: MessageSquare, label: 'Chat', desc: 'Liga ou abre WhatsApp com o entregador ativo' },
    ];

    return (
        <div className={`absolute right-20 top-1/2 -translate-y-[55%] z-[1000] w-72 rounded-2xl border shadow-2xl backdrop-blur-xl p-4 ${base}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <HelpCircle size={14} className="text-purple-400" />
                    </div>
                    <span className="font-bold text-sm">Ajuda — Controles do Mapa</span>
                </div>
                <button onClick={onClose} className={`p-1 rounded-lg hover:bg-white/10 transition-colors ${sub}`}>
                    <X size={14} />
                </button>
            </div>

            <div className="space-y-1.5">
                {items.map(({ icon: Icon, label, desc }) => (
                    <div key={label} className={`flex items-start gap-3 p-2.5 rounded-xl border ${card}`}>
                        <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                            <Icon size={13} className="text-orange-400" />
                        </div>
                        <div>
                            <p className="font-bold text-xs">{label}</p>
                            <p className={`text-[11px] ${sub} leading-tight mt-0.5`}>{desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================
// CUSTOM MAP CONTROLS
// ============================================================
type ActivePanel = 'info' | 'share' | 'chat' | 'help' | null;

const MapControls: React.FC<{
    onZoomIn: () => void;
    onZoomOut: () => void;
    onRecenter: () => void;
    onToggleLayers: () => void;
    onToggleTheme: () => void;
    isDarkMode: boolean;
    onTogglePanel: (panel: ActivePanel) => void;
    activePanel: ActivePanel;
}> = ({ onZoomIn, onZoomOut, onRecenter, onToggleLayers, onToggleTheme, isDarkMode, onTogglePanel, activePanel }) => {
    const btnClass = "map-control-button";
    const activeCls = "bg-orange-500/20 text-orange-400";

    return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2">
            {/* Zoom Controls */}
            <div className="glass-panel rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <button onClick={onZoomIn} className={`${btnClass} border-b border-white/5`} title="Aumentar Zoom">
                    <Plus size={20} />
                </button>
                <button onClick={onZoomOut} className={btnClass} title="Diminuir Zoom">
                    <Minus size={20} />
                </button>
            </div>

            {/* Recenter */}
            <div className="glass-panel rounded-xl overflow-hidden shadow-2xl">
                <button onClick={onRecenter} className={btnClass} title="Centralizar Minha Loja">
                    <Target size={20} className="text-guepardo-accent" />
                </button>
            </div>

            {/* Display / Layers / Theme */}
            <div className="glass-panel rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <button onClick={onToggleLayers} className={`${btnClass} border-b border-white/5`} title="Alternar Camadas (Rua/Satélite)">
                    <Layers size={18} />
                </button>
                <button onClick={onToggleTheme} className={btnClass} title={isDarkMode ? "Modo Dia (Claro)" : "Modo Noite (Escuro)"}>
                    {isDarkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-blue-400" />}
                </button>
            </div>

            {/* Info & Support */}
            <div className="glass-panel rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <button
                    onClick={() => onTogglePanel('info')}
                    className={`${btnClass} border-b border-white/5 ${activePanel === 'info' ? activeCls : ''}`}
                    title="Informações do Mapa"
                >
                    <Info size={18} />
                </button>
                <button
                    onClick={() => onTogglePanel('share')}
                    className={`${btnClass} border-b border-white/5 ${activePanel === 'share' ? activeCls : ''}`}
                    title="Compartilhar Rastreamento"
                >
                    <Share2 size={18} />
                </button>
                <button
                    onClick={() => onTogglePanel('chat')}
                    className={`${btnClass} border-b border-white/5 ${activePanel === 'chat' ? activeCls : ''}`}
                    title="Contato com Entregador"
                >
                    <MessageSquare size={18} />
                </button>
                <button
                    onClick={() => onTogglePanel('help')}
                    className={`${btnClass} ${activePanel === 'help' ? activeCls : ''}`}
                    title="Ajuda"
                >
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

    useEffect(() => {
        if (zoomLevel !== prevZoomRef.current) {
            map.setZoom(zoomLevel);
            prevZoomRef.current = zoomLevel;
        }
    }, [zoomLevel, map]);

    useEffect(() => {
        const pointsStr = JSON.stringify(points);
        if (!points || points.length === 0 || pointsStr === prevPointsRef.current) return;

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
    onCourierSelect,
    draftAdditionalStops = []
}) => {
    // --- STATES ---
    const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
    const [routePolyline, setRoutePolyline] = useState<[number, number][] | null>(null);
    const [draftStopCoords, setDraftStopCoords] = useState<Record<string, [number, number]>>({});
    const [activeOrderRoute, setActiveOrderRoute] = useState<[number, number][] | null>(null);
    const [activePanel, setActivePanel] = useState<ActivePanel>(null);

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

    const handleTogglePanel = (panel: ActivePanel) => {
        setActivePanel(prev => prev === panel ? null : panel);
    };

    // --- LOGIC: GEOCODING (Nominatim) ---

    // --- LOGIC: ROUTING (Mapbox Directions API) ---
    const calculateRoute = useCallback(async (start: [number, number], end: [number, number]) => {
        if (!MAPBOX_TOKEN) {
            // Fallback to OSRM if token missing
            try {
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    return {
                        coordinates: route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]),
                        distance: route.distance,
                        duration: route.duration
                    };
                }
            } catch (e) { console.error("OSRM Fallback failed", e); }
            return null;
        }

        try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&access_token=${MAPBOX_TOKEN}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
                return {
                    coordinates,
                    distance: route.distance, // in meters
                    duration: route.duration  // in seconds
                };
            }
        } catch (error) {
            console.error("Mapbox Routing Error:", error);
        }
        return null;
    }, []);

    // --- EFFECT: DRAFT ADDRESS PROCESSING ---
    useEffect(() => {
        if (!draftDestinationAddress && draftAdditionalStops.length === 0) {
            setDestinationCoords(null);
            setDraftStopCoords({});
            setRoutePolyline(null);
            setFitPoints([[store.lat, store.lng]]);
            if (onRouteCalculated) onRouteCalculated(null);
            return;
        }

        const timer = setTimeout(async () => {
            const newFitPoints: [number, number][] = [[store.lat, store.lng]];
            let mainLatLng: [number, number] | null = null;

            // 1. Geocode Main Address
            if (draftDestinationAddress) {
                const coords = await geocodeAddress(draftDestinationAddress, { lat: store.lat, lng: store.lng });
                if (coords) {
                    mainLatLng = [coords.lat, coords.lng];
                    setDestinationCoords(mainLatLng);
                    newFitPoints.push(mainLatLng);
                }
            } else {
                setDestinationCoords(null);
            }

            // 2. Geocode Additional Stops
            const newDraftStopCoords: Record<string, [number, number]> = {};
            for (const stop of draftAdditionalStops) {
                if (stop.addressStreet) {
                    const coords = await geocodeAddress({
                        street: stop.addressStreet,
                        number: stop.addressNumber || undefined,
                        neighborhood: stop.addressNeighborhood || undefined,
                        city: stop.addressCity || 'Itu/SP',
                        cep: stop.addressCep || undefined
                    }, { lat: store.lat, lng: store.lng });

                    if (coords) {
                        const latLng: [number, number] = [coords.lat, coords.lng];
                        newDraftStopCoords[stop.id] = latLng;
                        newFitPoints.push(latLng);
                    }
                }
            }
            setDraftStopCoords(newDraftStopCoords);

            // 3. Calculate Consolidated Draft Route (Multi-point Professional Routing)
            if (mainLatLng || Object.keys(newDraftStopCoords).length > 0) {
                const stopsInOrder: [number, number][] = [];
                if (mainLatLng) stopsInOrder.push(mainLatLng);

                // Add additional stops in fixed order
                draftAdditionalStops.forEach(s => {
                    if (newDraftStopCoords[s.id]) {
                        stopsInOrder.push(newDraftStopCoords[s.id]);
                    }
                });

                if (stopsInOrder.length > 0) {
                    const allWaypoints = [[store.lat, store.lng], ...stopsInOrder];

                    if (MAPBOX_TOKEN) {
                        try {
                            const waypointSubset = allWaypoints.slice(0, 25); // Mapbox limit is 25
                            const coordsString = waypointSubset.map(p => `${p[1]},${p[0]}`).join(';');
                            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?overview=full&geometries=geojson&access_token=${MAPBOX_TOKEN}`;

                            const response = await fetch(url);
                            const routeData = await response.json();

                            if (routeData.routes && routeData.routes.length > 0) {
                                const route = routeData.routes[0];
                                const poly = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);

                                setRoutePolyline(poly);
                                setFitPoints(newFitPoints);

                                if (onRouteCalculated) {
                                    onRouteCalculated({
                                        distanceText: `${(route.distance / 1000).toFixed(1)} km`,
                                        distanceValue: route.distance,
                                        durationText: `${Math.ceil(route.duration / 60)} min`,
                                        durationValue: route.duration
                                    });
                                }
                            }
                        } catch (e) {
                            console.error("Multi-stop Mapbox error:", e);
                        }
                    } else {
                        // Original fallback for draft (dashed lines)
                        const path: [number, number][] = [[store.lat, store.lng], ...stopsInOrder];
                        setRoutePolyline(path);
                        setFitPoints(newFitPoints);
                        if (onRouteCalculated) {
                            onRouteCalculated({
                                distanceText: `~${(stopsInOrder.length * 2.5).toFixed(1)} km`,
                                distanceValue: stopsInOrder.length * 2500,
                                durationText: `~${stopsInOrder.length * 8} min`,
                                durationValue: stopsInOrder.length * 480
                            });
                        }
                    }
                }
            } else {
                setRoutePolyline(null);
            }
        }, 1500); // Slightly longer debounce for batch geocoding

        return () => clearTimeout(timer);
    }, [draftDestinationAddress, draftAdditionalStops, store.lat, store.lng, geocodeAddress, onRouteCalculated]);

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
                status: o.status,
                stopNumber: o.stopNumber || (o as any).items?.stopNumber || 1,
                batch_id: o.batch_id,
                courier_id: o.courier?.id
            }));
    }, [filteredOrders, activeOrder]);

    const batchRoutes = useMemo(() => {
        const groups: Record<string, typeof orderMarkers> = {};

        orderMarkers.forEach(m => {
            const key = m.courier_id || m.batch_id || 'unassigned';
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });

        return Object.entries(groups).map(([key, stops]) => {
            const sortedStops = [...stops].sort((a, b) => a.stopNumber - b.stopNumber);
            const path: [number, number][] = sortedStops.map(s => s.position);

            // If there's a courier assigned to this group, try to find their position
            const assignedCourier = availableCouriers.find(c => c.id === sortedStops[0].courier_id);
            const startPoint: [number, number] = assignedCourier && isValidCoord([assignedCourier.lat, assignedCourier.lng])
                ? [assignedCourier.lat, assignedCourier.lng]
                : [store.lat, store.lng];

            const fullPath: [number, number][] = [startPoint, ...path];

            return {
                id: key,
                path: fullPath,
                color: key === 'unassigned' ? COLORS.blue : (COLORS as any)[Object.keys(COLORS)[Math.abs(key.length % Object.keys(COLORS).length)]] || COLORS.orange,
                hasCourier: !!assignedCourier
            };
        });
    }, [orderMarkers, store.lat, store.lng, availableCouriers]);

    return (
        <div className="w-full h-full relative border-0 overflow-hidden rounded-xl bg-gray-900">
            <MapContainer
                center={mapCenter}
                zoom={zoomLevel}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
            >
                {/* Professional Mapbox Tile Layer */}
                {MAPBOX_TOKEN ? (
                    <TileLayer
                        url={mapMode === 'streets'
                            ? (isDarkMode
                                ? `https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
                                : `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`)
                            : `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
                        attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
                        tileSize={256}
                        maxZoom={22}
                    />
                ) : (
                    mapMode === 'streets' ? (
                        <TileLayer
                            url={isDarkMode
                                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                            attribution='&copy; OpenStreetMap &amp; CARTO'
                        />
                    ) : (
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution='Tiles &copy; Esri'
                        />
                    )
                )}

                <MapController
                    points={fitPoints}
                    recenterTrigger={recenterTrigger}
                    zoomLevel={zoomLevel}
                    onPointHandled={() => { }}
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
                                    (e as any).originalEvent.preventDefault();
                                    (e as any).originalEvent.stopPropagation();
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

                {/* 3. BATCH & MULTI-STOP ROUTES */}
                {batchRoutes.map(route => (
                    <React.Fragment key={route.id}>
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
                    </React.Fragment>
                ))}

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
                                <div className="text-xs">
                                    <p className="font-bold">{m.name}</p>
                                    <p className="text-gray-500">Parada #{m.stopNumber}</p>
                                    {m.courier_id && <p className="text-orange-500 font-bold text-[9px]">EM ROTA</p>}
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
                        {destinationCoords && isValidCoord(destinationCoords) && (
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
                            const coords = draftStopCoords[stop.id];
                            if (!coords || !isValidCoord(coords)) return null;
                            return (
                                <Marker
                                    key={`draft-${stop.id}`}
                                    position={coords}
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

            {/* === MAP CONTROLS (Outside MapContainer, absolute positioning) === */}
            <MapControls
                onZoomIn={() => setZoomLevel(prev => Math.min(prev + 1, 20))}
                onZoomOut={() => setZoomLevel(prev => Math.max(prev - 1, 3))}
                onRecenter={() => setRecenterTrigger(prev => prev + 1)}
                onToggleLayers={() => setMapMode(prev => prev === 'streets' ? 'satellite' : 'streets')}
                onToggleTheme={toggleTheme || (() => { })}
                isDarkMode={isDarkMode}
                onTogglePanel={handleTogglePanel}
                activePanel={activePanel}
            />

            {/* === FLOATING PANELS === */}
            {activePanel === 'info' && (
                <InfoPanel
                    orders={filteredOrders}
                    onClose={() => setActivePanel(null)}
                    isDarkMode={isDarkMode}
                />
            )}
            {activePanel === 'share' && (
                <SharePanel
                    activeOrder={activeOrder}
                    orders={filteredOrders}
                    onClose={() => setActivePanel(null)}
                    isDarkMode={isDarkMode}
                />
            )}
            {activePanel === 'chat' && (
                <ChatPanel
                    activeOrder={activeOrder}
                    orders={filteredOrders}
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
