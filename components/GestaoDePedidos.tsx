
import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, Courier, StoreProfile, Customer, RouteStats, StoreSettings, AddressComponents } from '../types';
import { DeliveryForm } from './DeliveryForm';
import { LeafletMap } from './LeafletMap';
import { PickupValidationModal } from './PickupValidationModal';
import { OrderServiceDetail } from './OrderServiceDetail';
import { ChatMultilateralModal } from './ChatMultilateralModal';
import { CancellationModal } from './CancellationModal';
import {
    Clock, MapPin, AlertCircle, Lock, LockOpen, PackageCheck, Send, Loader2, MessageCircle, Zap,
    ChevronRight, ChevronLeft, ArrowRight, Wallet, Radio, Navigation, X, CreditCard, Banknote, QrCode, Trash2, ArrowLeftRight, CheckCheck, Layers, Hash, Bike
} from 'lucide-react';
import { ActiveOrderCard } from './ActiveOrderCard';
import { geocodeAddress } from '../utils/geocoding';
import { calculateRoute } from '../utils/routing';

// Sub-components used in GestaoDePedidos
const SearchIcon = ({ size, className }: { size: number, className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

interface GestaoDePedidosProps {
    orders: Order[];
    storeProfile: StoreProfile;
    availableCouriers: Courier[];
    customers: Customer[];
    onNewOrder: (data: any) => void;
    onSelectOrder: (order: Order) => void;
    activeOrder: Order | null;
    setActiveOrder: (order: Order | null) => void;
    onMarkAsReady: (orderId: string) => void;
    onValidatePickup: (orderId: string) => void;
    onCancelOrder: (orderId: string, reason: string) => void;
    onConfirmReturn: (orderId: string) => void;
    onResetDatabase: () => void;
    onBulkAssign: (orderIds: string[], courierId: string) => void;
    theme: string;
    settings: StoreSettings;
    onToggleMapTheme: () => void;
    mapboxToken?: string;
}

// Helper to calculate distance for the LED Logic
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Returns km
};

export const GestaoDePedidos: React.FC<GestaoDePedidosProps> = ({
    orders,
    storeProfile,
    availableCouriers,
    customers,
    onNewOrder,
    onSelectOrder,
    activeOrder,
    setActiveOrder,
    onMarkAsReady,
    onValidatePickup,
    onCancelOrder,
    onConfirmReturn,
    mapboxToken,
    onResetDatabase,
    onBulkAssign,
    theme,
    settings,
    onToggleMapTheme
}) => {
    // --- UI STATES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [validationModalOpen, setValidationModalOpen] = useState(false);
    const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
    const [orderToInteract, setOrderToInteract] = useState<Order | null>(null); // Shared for Validation & Cancellation

    // --- VISUAL ROUTE FEEDBACK STATE ---
    const [draftAddress, setDraftAddress] = useState<string | AddressComponents>('');
    const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
    const [activeRouteStats, setActiveRouteStats] = useState<RouteStats | null>(null);
    const [draftAdditionalStops, setDraftAdditionalStops] = useState<any[]>([]);

    // Drawer State
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);

    // Targeted Selection State
    const [isSelectingCourier, setIsSelectingCourier] = useState(false);
    const [targetCourierId, setTargetCourierId] = useState<string>('');
    const [isFormCollapsed, setIsFormCollapsed] = useState(false);

    // Bulk Actions State
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

    // Sync drawer with active order
    useEffect(() => {
        if (activeOrder) {
            setShowDetailDrawer(true);
        }
    }, [activeOrder?.id]);

    /* 
    // REMOVED: User wants to keep details visible during route tracking
    useEffect(() => {
        if (activeOrder && (activeOrder.status === OrderStatus.TO_STORE || activeOrder.status === OrderStatus.IN_TRANSIT)) {
            setShowDetailDrawer(false);
        }
    }, [activeOrder?.status]);
    */

    const handleCloseDrawer = () => {
        setShowDetailDrawer(false);
        setTimeout(() => setActiveOrder(null), 300);
    };
    
    // --- REAL-TIME ROUTE CALCULATION ---
    useEffect(() => {
        if (!draftAddress) {
            setRouteStats(null);
            return;
        }

        const computeRoute = async () => {
            console.log("📍 [GestaoDePedidos] Auto-calculating route metrics...");
            
            // 1. Geocode Destination
            const destCoords = await geocodeAddress(draftAddress, { lat: storeProfile.lat, lng: storeProfile.lng });
            if (!destCoords) {
                console.warn("⚠️ [GestaoDePedidos] Could not geocode main address");
                setRouteStats(null);
                return;
            }

            // 2. Geocode Additional Stops (if any)
            const coords: [number, number][] = [[storeProfile.lat, storeProfile.lng], [destCoords.lat, destCoords.lng]];
            
            for (const stop of draftAdditionalStops) {
                const stopAddr = `${stop.addressStreet}, ${stop.addressNumber}, ${stop.addressNeighborhood}, ${stop.addressCity}`;
                const stopCoords = await geocodeAddress(stopAddr, { lat: storeProfile.lat, lng: storeProfile.lng });
                if (stopCoords) {
                    coords.push([stopCoords.lat, stopCoords.lng]);
                }
            }

            // 3. Calculate Route
            const stats = await calculateRoute(coords);
            if (stats) {
                setRouteStats(stats);
            } else {
                // Fallback to straight-line if Routing API fails
                const dist = calculateDistance(storeProfile.lat, storeProfile.lng, destCoords.lat, destCoords.lng);
                setRouteStats({
                    distanceText: `${dist.toFixed(1)} km`,
                    durationText: `${Math.round(dist * 2.5)} min`, // Very rough estimate
                    distanceValue: dist * 1000,
                    durationValue: dist * 1000 * 2.5 * 60
                });
            }
        };

        computeRoute();
    }, [draftAddress, draftAdditionalStops.length, storeProfile.lat, storeProfile.lng]);

    // --- ACTIVE ORDER TRACKING (ROAD-SNAPPED) ---
    useEffect(() => {
        if (!activeOrder || !activeOrder.courier || activeOrder.status === OrderStatus.PENDING) {
            setActiveRouteStats(null);
            return;
        }

        const computeActiveRoute = async () => {
            console.log("🛣️ [GestaoDePedidos] Calculating road path for active order:", activeOrder.id);
            
            const points: [number, number][] = [[activeOrder.courier!.lat, activeOrder.courier!.lng]];
            
            // Logic: Courier -> Store -> Destination
            if (activeOrder.status === OrderStatus.ACCEPTED || activeOrder.status === OrderStatus.TO_STORE || activeOrder.status === OrderStatus.ARRIVED_AT_STORE) {
                points.push([storeProfile.lat, storeProfile.lng]);
            }
            
            if (activeOrder.destinationLat && activeOrder.destinationLng) {
                points.push([activeOrder.destinationLat, activeOrder.destinationLng]);
            }

            const stats = await calculateRoute(points);
            if (stats) setActiveRouteStats(stats);
        };

        computeActiveRoute();
        // Recalculate if courier moves significantly or status changes
    }, [activeOrder?.id, activeOrder?.status, activeOrder?.courier?.lat, activeOrder?.courier?.lng]);

    // --- CHAT STATE ---
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedOrderForChat, setSelectedOrderForChat] = useState<Order | null>(null);

    const handleOpenChat = (order: Order) => {
        setSelectedOrderForChat(order);
        setIsChatOpen(true);
    };

    // --- HANDLERS ---
    const handleOpenValidation = (order: Order) => {
        setOrderToInteract(order);
        setValidationModalOpen(true);
    };

    const handleOrderSelect = (order: Order) => {
        setActiveOrder(order);
    };

    const handleValidationSuccess = (code: string) => {
        if (orderToInteract) {
            if (orderToInteract.isBatch && orderToInteract.batchOrders) {
                orderToInteract.batchOrders.forEach(order => onValidatePickup(order.id));
            } else {
                onValidatePickup(orderToInteract.id);
            }
            setValidationModalOpen(false);
            setOrderToInteract(null);
        }
    };

    const handleCancellationConfirm = (orderId: string, reason: string) => {
        onCancelOrder(orderId, reason);
        setCancellationModalOpen(false);
        setOrderToInteract(null);
        if (activeOrder?.id === orderId) {
            handleCloseDrawer();
        }
        setDraftAddress('');
        setRouteStats(null);
    };

    const handleNewOrderSubmit = (data: any) => {
        onNewOrder(data);
        setDraftAddress('');
        setRouteStats(null);
        setDraftAdditionalStops([]);
        setTargetCourierId('');
        setIsSelectingCourier(false);
    };

    const handleCourierSelect = (courierId: string) => {
        setTargetCourierId(courierId);
        setIsSelectingCourier(false);
    };

    const handleCardClick = (order: Order) => {
        setActiveOrder(order);
    };

    // --- FILTER LOGIC ---
    const activeOrders = useMemo(() => {
        const validStatuses = [
            OrderStatus.PENDING,
            OrderStatus.ACCEPTED,
            OrderStatus.TO_STORE,
            OrderStatus.ARRIVED_AT_STORE,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.IN_TRANSIT,
            OrderStatus.RETURNING
        ];

        let filtered = orders.filter(o => validStatuses.includes(o.status));

        const uniqueFiltered: Order[] = [];
        const seenIds = new Set<string>();
        for (const o of filtered) {
            if (!seenIds.has(o.id)) {
                uniqueFiltered.push(o);
                seenIds.add(o.id);
            }
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return uniqueFiltered.filter(o =>
                o.clientName.toLowerCase().includes(term) ||
                (o.display_id && o.display_id.includes(term)) ||
                o.id.toLowerCase().includes(term)
            ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

        return uniqueFiltered;
    }, [orders, searchTerm]);

    const groupedOrders = useMemo(() => {
        const groups = new Map<string, Order[]>();
        const pendingBatches = new Map<string, Order[]>();
        const pendingSingle: Order[] = [];

        activeOrders.forEach(order => {
            if (order.status === OrderStatus.PENDING || !order.courier) {
                if (order.batch_id) {
                    if (!pendingBatches.has(order.batch_id)) {
                        pendingBatches.set(order.batch_id, []);
                    }
                    pendingBatches.get(order.batch_id)!.push(order);
                } else {
                    pendingSingle.push(order);
                }
            } else {
                const driverId = order.courier.id;
                if (!groups.has(driverId)) {
                    groups.set(driverId, []);
                }
                groups.get(driverId)!.push(order);
            }
        });

        const pendingGrouped: Order[] = Array.from(pendingBatches.values()).map(batch => {
            if (batch.length === 1) return batch[0];
            const mainOrder = batch.find(o => o.stopNumber === 1) || batch[0];
            return {
                ...mainOrder,
                isBatch: true,
                batchOrders: batch,
                clientName: `${batch.length} Pedidos (Lote)`,
                destination: `${batch.length} destinos no roteiro`
            };
        });

        const courierGrouped: Order[] = Array.from(groups.values()).map(batch => {
            if (batch.length === 1) return batch[0];
            const mainOrder = batch[0];
            const statuses = batch.map(o => o.status);
            let batchStatus = OrderStatus.DELIVERED;
            
            if (statuses.includes(OrderStatus.PENDING)) batchStatus = OrderStatus.PENDING;
            else if (statuses.includes(OrderStatus.READY_FOR_PICKUP)) batchStatus = OrderStatus.READY_FOR_PICKUP;
            else if (statuses.includes(OrderStatus.ARRIVED_AT_STORE)) batchStatus = OrderStatus.ARRIVED_AT_STORE;
            else if (statuses.includes(OrderStatus.ACCEPTED) || statuses.includes(OrderStatus.TO_STORE)) batchStatus = OrderStatus.ACCEPTED;
            else if (statuses.includes(OrderStatus.IN_TRANSIT)) batchStatus = OrderStatus.IN_TRANSIT;
            else if (statuses.includes(OrderStatus.RETURNING)) batchStatus = OrderStatus.RETURNING;

            return {
                ...mainOrder,
                isBatch: true,
                batchOrders: batch,
                status: batchStatus, 
                clientName: `${batch.length} Pedidos - Rota ${mainOrder.courier?.name || ''}`,
                destination: `${batch.length} destinos na rota`
            };
        });

        return [...pendingSingle, ...pendingGrouped, ...courierGrouped].sort((a, b) => {
            if ((a.status === OrderStatus.READY_FOR_PICKUP || a.status === OrderStatus.RETURNING) && (b.status !== OrderStatus.READY_FOR_PICKUP && b.status !== OrderStatus.RETURNING)) return -1;
            if ((b.status === OrderStatus.READY_FOR_PICKUP || b.status === OrderStatus.RETURNING) && (a.status !== OrderStatus.READY_FOR_PICKUP && a.status !== OrderStatus.RETURNING)) return 1;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }, [activeOrders]);

    return (
        <div className="w-full h-full overflow-hidden relative bg-black">
            {/* --- BACKGROUND MAP --- */}
            <div className="absolute inset-0 z-0">
                <LeafletMap
                    orders={groupedOrders}
                    activeOrder={activeOrder}
                    storeProfile={storeProfile}
                    couriers={availableCouriers}
                    onCourierClick={handleCourierSelect}
                    theme={theme}
                    draftAddress={draftAddress}
                    draftAdditionalStops={draftAdditionalStops}
                    draftRouteStats={routeStats}
                    activeRouteStats={activeRouteStats}
                    onCardClick={handleOrderSelect}
                    mapboxToken={mapboxToken}
                />
            </div>

            {/* --- LEFT OVERLAY (Form + Monitoring) --- */}
            <div className={`absolute top-0 left-0 h-full p-6 flex flex-col gap-6 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-10 pointer-events-none ${isFormCollapsed ? 'w-0 overflow-hidden opacity-0 -translate-x-full' : 'w-[528px] opacity-100 translate-x-0'}`}>
                <div className="pointer-events-auto flex flex-col gap-6 h-full overflow-hidden">
                    {/* Delivery Form */}
                    <DeliveryForm
                    onSubmit={handleNewOrderSubmit}
                    isSubmitting={false}
                    existingCustomers={customers}
                    onAddressChange={setDraftAddress}
                    onAdditionalStopsChange={setDraftAdditionalStops}
                    routeStats={routeStats}
                    settings={settings}
                    availableCouriers={availableCouriers}
                    allOrders={orders}
                    isSelecting={isSelectingCourier}
                    onToggleSelection={() => setIsSelectingCourier(!isSelectingCourier)}
                    externalTargetId={targetCourierId}
                        onClearSelection={() => setTargetCourierId('')}
                    />

                    {/* --- MONITORING PANEL (Moved below Form) --- */}
                    <div className="bg-brand-gradient-premium/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex-1 overflow-hidden flex flex-col min-h-[400px]"
                         style={{ background: 'linear-gradient(135deg, rgba(139, 58, 15, 0.95) 0%, rgba(26, 9, 0, 0.98) 100%)' }}>
                    
                    {/* Status Summary & Search */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">Monitoramento</h2>
                        <div className="relative">
                             <input 
                                 type="text"
                                 placeholder="BUSCAR..."
                                 value={searchTerm}
                                 onChange={(e) => setSearchTerm(e.target.value)}
                                 className="bg-black/60 border border-white/20 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-white placeholder:text-white/45 focus:border-guepardo-accent/80 outline-none w-32 transition-all"
                             />
                             <SearchIcon size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20" />
                        </div>
                    </div>

                    {/* Online Pulse */}
                    <div className="flex items-center justify-between mb-8 p-4 bg-black/60 border border-white/10 rounded-2xl shadow-inner">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-guepardo-accent/20 rounded-lg flex items-center justify-center text-guepardo-accent shadow-glow-sm">
                                <Bike size={16} strokeWidth={2.5} />
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-widest">Pilotos Ativos</span>
                        </div>
                        <span className="text-sm font-black italic text-guepardo-accent uppercase">{availableCouriers.length} ON</span>
                    </div>

                    <div className="space-y-3 pb-20 flex-1 overflow-y-auto scrollbar-guepardo">
                        {groupedOrders.map((order) => (
                            <ActiveOrderCard
                                key={order.id}
                                order={order}
                                storeLat={storeProfile.lat}
                                storeLng={storeProfile.lng}
                                onChatClick={handleOpenChat}
                                onCardClick={handleOrderSelect}
                                onTrackClick={(o) => {
                                    setActiveOrder(o);
                                }}
                                onValidateClick={handleOpenValidation}
                                onConfirmReturn={onConfirmReturn}
                                routeStats={activeOrder?.id === order.id ? activeRouteStats : null}
                            />
                        ))}

                        {groupedOrders.length === 0 && (
                            <div className="text-center py-20 opacity-30">
                                <div className="w-20 h-20 bg-black/60 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-[0_0_30px_rgba(139,58,15,0.2)]">
                                    <Radio size={40} className="text-white animate-pulse" />
                                </div>
                                <p className="text-sm font-black italic uppercase tracking-[0.2em] text-white">Nenhum pedido ativo</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-2">Aguardando...</p>
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- COLLAPSE/EXPAND TOGGLE (Floating) --- */}
            <button
                onClick={() => setIsFormCollapsed(!isFormCollapsed)}
                className={`
                    absolute top-1/2 -translate-y-1/2 z-[60]
                    w-8 h-20 bg-brand-gradient-premium border border-white/10 
                    rounded-r-2xl flex items-center justify-center text-white
                    shadow-[5px_0_15px_rgba(0,0,0,0.3)] hover:scale-105 transition-all duration-300
                    ${isFormCollapsed ? 'left-0' : 'left-[504px]'}
                `}
                title={isFormCollapsed ? "Abrir Formulário" : "Fechar Formulário"}
            >
                {isFormCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} className="translate-x-[-1px]" />}
            </button>


            {/* BATCH ACTION BAR */}
            {selectedOrderIds.length > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[340px] bg-guepardo-gray-900 border border-guepardo-accent shadow-2xl rounded-2xl p-4 z-50 ring-4 ring-orange-500/20 pointer-events-auto">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-guepardo-accent p-1.5 rounded-lg text-white">
                                    <Layers size={16} />
                                </div>
                                <span className="text-white text-xs font-black uppercase tracking-widest">{selectedOrderIds.length} selecionados</span>
                            </div>
                            <button onClick={() => setSelectedOrderIds([])} className="text-gray-400 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ORDER DETAILS DRAWER (Floating right side) --- */}
            {activeOrder && (
                <div className="fixed top-0 right-0 h-full z-[1001] flex items-center pr-8 pointer-events-none">
                     <div className={`pointer-events-auto w-[450px] h-[90vh] bg-[#121212] border border-white/5 shadow-2xl rounded-[3rem] overflow-hidden transition-all duration-500 transform ${showDetailDrawer ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
                        <OrderServiceDetail
                            order={activeOrder}
                            storeProfile={storeProfile}
                            isEmbedded={true}
                            onClose={handleCloseDrawer}
                            onCancelClick={(o) => {
                                setOrderToInteract(o);
                                setCancellationModalOpen(true);
                            }}
                            onConfirmReturn={onConfirmReturn}
                            isExpanded={true}
                            theme="dark"
                        />
                     </div>
                </div>
            )}

            {/* --- MODALS --- */}
            {validationModalOpen && orderToInteract && (
                <PickupValidationModal
                    order={orderToInteract}
                    onClose={() => setValidationModalOpen(false)}
                    onSuccess={handleValidationSuccess}
                />
            )}

            {cancellationModalOpen && orderToInteract && (
                <CancellationModal
                    order={orderToInteract}
                    onClose={() => setCancellationModalOpen(false)}
                    onConfirm={handleCancellationConfirm}
                />
            )}

            {isChatOpen && selectedOrderForChat && (
                <ChatMultilateralModal
                    order={selectedOrderForChat}
                    onClose={() => setIsChatOpen(false)}
                    theme={theme}
                />
            )}
        </div>
    );
};

