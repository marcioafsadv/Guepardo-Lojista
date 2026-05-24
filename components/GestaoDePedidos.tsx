
import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, Courier, StoreProfile, Customer, RouteStats, StoreSettings, AddressComponents, ChatRoomType } from '../types';
import { DeliveryForm } from './DeliveryForm';
import { LeafletMap } from './LeafletMap';
import { PickupValidationModal } from './PickupValidationModal';
import { OrderServiceDetail } from './OrderServiceDetail';
import { ChatMultilateralModal } from './ChatMultilateralModal';
import { CancellationModal } from './CancellationModal';
import {
    Clock, MapPin, AlertCircle, Lock, LockOpen, PackageCheck, Send, Loader2, MessageCircle, Zap,
    ChevronRight, ChevronLeft, ChevronUp, ChevronDown, ArrowRight, Wallet, Radio, Navigation, X, CreditCard, Banknote, QrCode, Trash2, ArrowLeftRight, CheckCheck, Layers, Hash, Bike
} from 'lucide-react';
import { ActiveOrderCard } from './ActiveOrderCard';
import { geocodeAddress } from '../utils/geocoding';
import { calculateRoute, optimizeRoute } from '../utils/routing';

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
    balance?: number;
    onSelectView?: (view: any) => void;
    onToggleStatus?: (newStatus: 'aberta' | 'fechada') => void;
    unreadMessages: Record<string, Partial<Record<ChatRoomType, number>>>;
    setUnreadMessages: React.Dispatch<React.SetStateAction<Record<string, Partial<Record<ChatRoomType, number>>>>>;
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
    onToggleMapTheme,
    balance = 0,
    onSelectView,
    onToggleStatus,
    unreadMessages,
    setUnreadMessages
}) => {
    // --- UI STATES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [validationModalOpen, setValidationModalOpen] = useState(false);
    const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
    const [orderToInteract, setOrderToInteract] = useState<Order | null>(null); // Shared for Validation & Cancellation

    // --- VISUAL ROUTE FEEDBACK STATE ---
    const [draftAddress, setDraftAddress] = useState<string | AddressComponents>('');
    const [draftAddressCoords, setDraftAddressCoords] = useState<{lat: number, lng: number} | null>(null);
    const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
    const [activeRouteStats, setActiveRouteStats] = useState<RouteStats | null>(null);
    const [draftAdditionalStops, setDraftAdditionalStops] = useState<any[]>([]);

    // Drawer State
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);

    // Targeted Selection State
    const [isSelectingCourier, setIsSelectingCourier] = useState(false);
    const [targetCourierId, setTargetCourierId] = useState<string>('');
    const [isFormCollapsed, setIsFormCollapsed] = useState(false);
    const [enrichedDraftStops, setEnrichedDraftStops] = useState<any[]>([]);
    const [mainDestStopNumber, setMainDestStopNumber] = useState<number>(1);
    const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);
    const [selectedOrderForChat, setSelectedOrderForChat] = useState<Order | null>(null);

    // Effect to clear unread messages when chat opens
    useEffect(() => {
        if (selectedOrderForChat) {
            console.log("💬 [GestaoDePedidos] Chat opened for order:", selectedOrderForChat.id, "Unread:", unreadMessages[selectedOrderForChat.id]);
            setUnreadMessages(prev => {
                if (!prev[selectedOrderForChat.id]) return prev;
                return prev; 
            });
        }
    }, [selectedOrderForChat?.id, unreadMessages, setUnreadMessages]);

    // Bulk Actions State
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

    // Sync drawer with active order
    useEffect(() => {
        if (activeOrder) {
            setShowDetailDrawer(true);
        }
    }, [activeOrder?.id]);

    const handleCloseDrawer = () => {
        setShowDetailDrawer(false);
        setIsDetailCollapsed(false);
        setTimeout(() => setActiveOrder(null), 300);
    };
    
    // --- REAL-TIME ROUTE CALCULATION ---
    useEffect(() => {
        if (!draftAddress) {
            setRouteStats(null);
            setEnrichedDraftStops([]);
            return;
        }

        const computeRoute = async () => {
            console.log("📍 [GestaoDePedidos] Auto-calculating route metrics...");
            
            // 1. Geocode Destination
            const destCoords = await geocodeAddress(draftAddress, { lat: storeProfile.lat, lng: storeProfile.lng });
            if (!destCoords) {
                console.warn("⚠️ [GestaoDePedidos] Could not geocode main address");
                setRouteStats(null);
                setDraftAddressCoords(null);
                return;
            }
            setDraftAddressCoords(destCoords);

            // 2. Geocode Additional Stops (if any)
            const coords: [number, number][] = [[storeProfile.lat, storeProfile.lng], [destCoords.lat, destCoords.lng]];
            
            const geocodedStops = [...draftAdditionalStops];
            for (let i = 0; i < geocodedStops.length; i++) {
                const stop = geocodedStops[i];
                if (!stop.addressStreet) continue; // Skip empty stops to avoid random geocoding
                const stopAddr = `${stop.addressStreet}, ${stop.addressNumber}, ${stop.addressNeighborhood}, ${stop.addressCity || 'Itu/SP'}`;
                const stopCoords = await geocodeAddress(stopAddr, { lat: storeProfile.lat, lng: storeProfile.lng });
                if (stopCoords) {
                    coords.push([stopCoords.lat, stopCoords.lng]);
                    geocodedStops[i] = { ...stop, lat: stopCoords.lat, lng: stopCoords.lng };
                }
            }
            setEnrichedDraftStops(geocodedStops);


            // 3. Optimize Route Sequence
            let finalCoords = [...coords];
            let finalGeocodedStops = [...geocodedStops];
            
            if (coords.length > 2) {
                console.log("🛣️ [GestaoDePedidos] Optimizing sequence for", coords.length, "points...");
                // Note: DeliveryForm doesn't have an explicit return checkbox yet, 
                // but we can pass false or check if a return is needed based on payment method logic
                const optimizedIndices = await optimizeRoute(coords, false);
                
                if (optimizedIndices && optimizedIndices.length === coords.length) {
                    // Reorder everything based on optimized indices
                    // Index 0 in optimizedIndices is always 0 (the Store)
                    // We need to map the rest to our stops
                    
                    const newCoords: [number, number][] = [];
                    const newEnrichedStops: any[] = [];
                    
                    optimizedIndices.forEach((origIdx, visitOrder) => {
                        newCoords.push(coords[origIdx]);
                        
                        // If origIdx was 1, it's the main destination.
                        // If origIdx > 1, it's one of the additional stops.
                        if (origIdx > 1) {
                            const stop = geocodedStops[origIdx - 2];
                            newEnrichedStops.push({ ...stop, stopNumber: visitOrder + 1 });
                        }
                    });
                    
                    finalCoords = newCoords;
                    // We need to identify which stop became Stop #1, #2 etc.
                    // This is tricky because LeafletMap expects draftAdditionalStops.
                    // Let's just update the stopNumber property in enrichedDraftStops.
                    
                    // Update enriched stops with their NEW optimized stop numbers
                    const optimizedEnriched = geocodedStops.map(stop => {
                        const originalPos = geocodedStops.indexOf(stop) + 2;
                        const visitOrder = optimizedIndices.indexOf(originalPos);
                        return { ...stop, stopNumber: visitOrder };
                    });
                    
                    // We also need to know the NEW stop number of the main destination
                    const mainDestVisitOrder = optimizedIndices.indexOf(1);
                    console.log("📍 [GestaoDePedidos] Main destination is now Stop #", mainDestVisitOrder);
                    
                    // Update state for map markers
                    setEnrichedDraftStops(optimizedEnriched);
                    setMainDestStopNumber(mainDestVisitOrder);
                } else {
                    setEnrichedDraftStops(geocodedStops);
                    setMainDestStopNumber(1);
                }
            } else {
                setEnrichedDraftStops(geocodedStops);
                setMainDestStopNumber(1);
            }

            // 4. Calculate Final Optimized Route Geometry
            const stats = await calculateRoute(finalCoords);
            if (stats) {
                setRouteStats(stats);
            } else {
                // Fallback to straight-line if Routing API fails
                const dist = calculateDistance(storeProfile.lat, storeProfile.lng, destCoords.lat, destCoords.lng);
                setRouteStats({
                    distanceText: `${dist.toFixed(1)} km`,
                    durationText: `${Math.round(dist * 2.5)} min`, 
                    distanceValue: dist * 1000,
                    durationValue: dist * 1000 * 2.5 * 60
                });
            }
        };

        computeRoute();
    }, [draftAddress, draftAdditionalStops, storeProfile.lat, storeProfile.lng]);

    // --- ACTIVE ORDER TRACKING (ROAD-SNAPPED) ---
    useEffect(() => {
        if (!activeOrder || !activeOrder.courier || activeOrder.status === OrderStatus.PENDING) {
            setActiveRouteStats(null);
            return;
        }

        const computeActiveRoute = async () => {
            console.log("🛣️ [GestaoDePedidos] Calculating road path for active order:", activeOrder.id);
            
            const points: [number, number][] = [[activeOrder.courier!.lat, activeOrder.courier!.lng]];
            
            if (activeOrder.isBatch && activeOrder.batchOrders) {
                // For batches, follow the delivery sequence
                const sortedStops = [...activeOrder.batchOrders].sort((a, b) => (a.stopNumber || 0) - (b.stopNumber || 0));
                
                // If any order still needs pickup, add store first
                if (sortedStops.some(o => o.status === OrderStatus.ACCEPTED || o.status === OrderStatus.TO_STORE)) {
                    points.push([storeProfile.lat, storeProfile.lng]);
                }

                sortedStops.forEach(o => {
                    if (o.destinationLat && o.destinationLng && o.status !== OrderStatus.RETURNING) {
                        points.push([o.destinationLat, o.destinationLng]);
                    }
                });

                // If returning, end at store
                if (sortedStops.some(o => o.status === OrderStatus.RETURNING)) {
                    points.push([storeProfile.lat, storeProfile.lng]);
                }
            } else {
                // Single order logic
                if (activeOrder.status === OrderStatus.ACCEPTED || activeOrder.status === OrderStatus.TO_STORE || activeOrder.status === OrderStatus.ARRIVED_AT_STORE) {
                    points.push([storeProfile.lat, storeProfile.lng]);
                }
                
                if (activeOrder.destinationLat && activeOrder.destinationLng && activeOrder.status !== OrderStatus.RETURNING) {
                    points.push([activeOrder.destinationLat, activeOrder.destinationLng]);
                }

                if (activeOrder.status === OrderStatus.RETURNING) {
                    points.push([storeProfile.lat, storeProfile.lng]);
                }
            }

            const stats = await calculateRoute(points);
            if (stats) setActiveRouteStats(stats);
        };

        computeActiveRoute();
        // Recalculate if courier moves significantly or status changes
    }, [activeOrder?.id, activeOrder?.status, activeOrder?.courier?.lat, activeOrder?.courier?.lng]);

    // --- CHAT STATE ---
    const [isChatOpen, setIsChatOpen] = useState(false);

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
        // --- ROUTE OPTIMIZATION SYNC ---
        // If we have an optimized sequence from the live preview, we apply it here
        // so the order is saved in the correct pedagogical sequence.
        
        let finalData = { ...data };
        
        if (data.additionalStops && data.additionalStops.length > 0 && mainDestStopNumber !== undefined) {
            console.log("🚀 [GestaoDePedidos] Applying optimized sequence to submission...");
            
            // 1. Collect all stops into one array
            // Original Stop 1 is the main destination in 'data'
            const mainStop = {
                clientName: data.clientName,
                clientPhone: data.clientPhone,
                addressStreet: data.addressStreet,
                addressNumber: data.addressNumber,
                addressComplement: data.addressComplement,
                addressNeighborhood: data.addressNeighborhood,
                addressCity: data.addressCity,
                addressCep: data.addressCep,
                deliveryValue: data.deliveryValue,
                paymentMethod: data.paymentMethod,
                changeFor: data.changeFor
            };
            
            const allStops = [mainStop, ...data.additionalStops];
            
            // 2. Identify the optimized order
            // Map enrichedDraftStops back to the sequence.
            // Actually, we can just use the stopNumber we assigned.
            const sortedByLogic = allStops.map((stop, idx) => {
                // Find matching stop in enrichedDraftStops to get its stopNumber
                // Stop 0 is main
                if (idx === 0) return { ...stop, stopNumber: mainDestStopNumber };
                const enriched = enrichedDraftStops[idx - 1];
                return { ...stop, stopNumber: enriched?.stopNumber || (idx + 1) };
            }).sort((a, b) => a.stopNumber - b.stopNumber);
            
            console.log("✅ [GestaoDePedidos] Re-sequenced stops:", sortedByLogic.map(s => s.addressStreet));
            
            // 3. Re-assign the first one to the 'main' level of finalData
            const first = sortedByLogic[0];
            finalData.clientName = first.clientName;
            finalData.clientPhone = first.clientPhone;
            finalData.addressStreet = first.addressStreet;
            finalData.addressNumber = first.addressNumber;
            finalData.addressComplement = first.addressComplement;
            finalData.addressNeighborhood = first.addressNeighborhood;
            finalData.addressCity = first.addressCity;
            finalData.addressCep = first.addressCep;
            finalData.deliveryValue = first.deliveryValue;
            finalData.paymentMethod = first.paymentMethod;
            finalData.changeFor = first.changeFor;
            finalData.stopNumber = 1; // Main destination is always the first stop (#1)
            
            // 4. Put the rest in additionalStops
            finalData.additionalStops = sortedByLogic.slice(1).map((s, i) => ({
                ...s,
                stopNumber: i + 2 // Following stops continue the sequence
            }));
            
            // 5. Update display strings for the main order
            finalData.destination = `${first.addressStreet}, ${first.addressNumber}${first.addressComplement ? ' - ' + first.addressComplement : ''} - ${first.addressNeighborhood}, ${first.addressCity}`;
        }

        onNewOrder(finalData);
        
        // Reset local draft states
        setDraftAddress('');
        setDraftAddressCoords(null);
        setRouteStats(null);
        setDraftAdditionalStops([]);
        setTargetCourierId('');
        setIsSelectingCourier(false);
        setMainDestStopNumber(1);
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
            OrderStatus.SCHEDULED,
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
        const batchGroups = new Map<string, Order[]>();
        const courierOnlyGroups = new Map<string, Order[]>();
        const individualOrders: Order[] = [];

        activeOrders.forEach(order => {
            if (order.batch_id) {
                if (!batchGroups.has(order.batch_id)) {
                    batchGroups.set(order.batch_id, []);
                }
                batchGroups.get(order.batch_id)!.push(order);
            } else if (order.courier) {
                const driverId = order.courier.id;
                if (!courierOnlyGroups.has(driverId)) {
                    courierOnlyGroups.set(driverId, []);
                }
                courierOnlyGroups.get(driverId)!.push(order);
            } else {
                individualOrders.push(order);
            }
        });

        const processedBatches: Order[] = Array.from(batchGroups.values()).map(batch => {
            const mainOrder = batch.find(o => o.stopNumber === 1) || batch[0];
            const totalValue = batch.reduce((acc, o) => acc + (o.deliveryValue || 0), 0);
            
            // Determine consolidated status - PRIORITY: IN_TRANSIT > STORE_READY > RETURNING
            const statuses = batch.map(o => o.status);
            let batchStatus = OrderStatus.PENDING;
            
            if (statuses.includes(OrderStatus.IN_TRANSIT)) batchStatus = OrderStatus.IN_TRANSIT;
            else if (statuses.includes(OrderStatus.READY_FOR_PICKUP)) batchStatus = OrderStatus.READY_FOR_PICKUP;
            else if (statuses.includes(OrderStatus.ARRIVED_AT_STORE)) batchStatus = OrderStatus.ARRIVED_AT_STORE;
            else if (statuses.includes(OrderStatus.ACCEPTED) || statuses.includes(OrderStatus.TO_STORE)) batchStatus = OrderStatus.ACCEPTED;
            else if (statuses.includes(OrderStatus.RETURNING)) batchStatus = OrderStatus.RETURNING;

            return {
                ...mainOrder,
                isBatch: true,
                batchOrders: batch,
                status: batchStatus,
                clientName: batch.length > 1 ? `${batch.length} Pedidos (Lote)` : mainOrder.clientName,
                destination: batch.length > 1 ? `${batch.length} destinos no roteiro` : mainOrder.destination,
                deliveryValue: totalValue
            };
        });

        const processedCourierGroups: Order[] = Array.from(courierOnlyGroups.values()).map(group => {
            const mainOrder = group[0];
            const totalValue = group.reduce((acc, o) => acc + (o.deliveryValue || 0), 0);
            
            const statuses = group.map(o => o.status);
            let groupStatus = OrderStatus.ACCEPTED;

            if (statuses.includes(OrderStatus.IN_TRANSIT)) groupStatus = OrderStatus.IN_TRANSIT;
            else if (statuses.includes(OrderStatus.READY_FOR_PICKUP)) groupStatus = OrderStatus.READY_FOR_PICKUP;
            else if (statuses.includes(OrderStatus.ARRIVED_AT_STORE)) groupStatus = OrderStatus.ARRIVED_AT_STORE;
            else if (statuses.includes(OrderStatus.RETURNING)) groupStatus = OrderStatus.RETURNING;

            return {
                ...mainOrder,
                batchOrders: group.length > 1 ? group : undefined,
                status: groupStatus,
                clientName: group.length > 1 ? `${group.length} Pedidos - ${mainOrder.courier?.name}` : mainOrder.clientName,
                destination: group.length > 1 ? `${group.length} destinos na rota` : mainOrder.destination,
                deliveryValue: totalValue
            };
        });

        return [...individualOrders, ...processedBatches, ...processedCourierGroups].sort((a, b) => {
            // Prioritize READY and RETURNING
            const aPrio = (a.status === OrderStatus.READY_FOR_PICKUP || a.status === OrderStatus.RETURNING) ? 0 : 1;
            const bPrio = (b.status === OrderStatus.READY_FOR_PICKUP || b.status === OrderStatus.RETURNING) ? 0 : 1;
            if (aPrio !== bPrio) return aPrio - bPrio;
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
                    draftAddressCoords={draftAddressCoords}
                    draftAdditionalStops={enrichedDraftStops}
                    onCardClick={handleOrderSelect}
                    mapboxToken={mapboxToken}
                    activeRouteStats={activeRouteStats}
                    showDrafts={!isFormCollapsed && !!draftAddress}
                    mainDestStopNumber={mainDestStopNumber}
                />
            </div>

            {/* --- LEFT OVERLAY (Form + Monitoring) --- */}
            <div className={`absolute top-0 left-0 h-full md:p-6 p-2 flex flex-col gap-4 md:gap-6 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-10 pointer-events-none ${isFormCollapsed ? 'w-0 overflow-hidden opacity-0 -translate-x-full' : 'md:w-[380px] lg:w-[450px] xl:w-[528px] w-full opacity-100 translate-x-0'}`}>
                <div className="pointer-events-auto flex flex-col gap-4 md:gap-6 h-full overflow-hidden">
                    {/* Delivery Form */}
                    <DeliveryForm
                    onSubmit={handleNewOrderSubmit}
                    isSubmitting={false}
                    existingCustomers={customers}
                    onAddressChange={setDraftAddress}
                    onAdditionalStopsChange={setDraftAdditionalStops}
                                routeStats={routeStats}
                                settings={settings}
                                balance={balance}
                                availableCouriers={availableCouriers}
                    allOrders={orders}
                    isSelecting={isSelectingCourier}
                    onToggleSelection={() => setIsSelectingCourier(!isSelectingCourier)}
                        externalTargetId={targetCourierId}
                        onClearSelection={() => setTargetCourierId('')}
                        onNavigateToWallet={() => onSelectView?.('wallet')}
                        storeStatus={storeProfile?.status}
                        onToggleStatus={onToggleStatus}
                    />

                    {/* --- MONITORING PANEL (Moved below Form) --- */}
                    <div className="bg-brand-gradient-premium/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-3 md:p-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex-1 overflow-hidden flex flex-col min-h-[400px]"
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
                        <span className="text-sm font-black italic text-guepardo-accent uppercase">{availableCouriers.length} ATIVOS</span>
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
                                onMarkAsReady={onMarkAsReady}
                                routeStats={activeOrder?.id === order.id ? activeRouteStats : null}
                                unreadCount={Object.values(unreadMessages[order.id] || {}).reduce((a, b) => a + (b || 0), 0)}
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
                    fixed md:absolute top-1/2 -translate-y-1/2 z-[60]
                    w-8 md:w-8 h-16 md:h-20 bg-brand-gradient-premium border border-white/10 
                    rounded-r-2xl flex items-center justify-center text-white
                    shadow-[5px_0_15px_rgba(0,0,0,0.3)] hover:scale-105 transition-all duration-300
                    pointer-events-auto
                    ${isFormCollapsed ? 'left-0' : 'left-[calc(100%-32px)] md:left-[356px] lg:left-[426px] xl:left-[504px]'}
                `}
                style={!isFormCollapsed && window.innerWidth < 768 ? { left: 'calc(100% - 32px)' } : {}}
                title={isFormCollapsed ? "Abrir Formulário" : "Fechar Formulário"}
            >
                {isFormCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} className="md:translate-x-[-1px]" />}
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
                <div className={`fixed inset-0 md:inset-auto md:top-0 md:right-0 md:h-full z-[1001] flex items-center md:pr-8 pointer-events-none transition-all duration-500 ${showDetailDrawer ? (isDetailCollapsed ? 'bg-transparent' : 'bg-black/60 backdrop-blur-sm pointer-events-auto') : 'bg-transparent'}`}>
                     
                     {/* Toggle Button for Detail Drawer (Mobile/Desktop) */}
                     <button
                        onClick={(e) => { e.stopPropagation(); setIsDetailCollapsed(!isDetailCollapsed); }}
                        className={`
                            fixed md:absolute z-[1010] pointer-events-auto
                            bg-brand-gradient-premium border border-white/10 text-white
                            shadow-2xl transition-all duration-500 ease-in-out
                            flex items-center justify-center
                            ${showDetailDrawer ? 'opacity-100' : 'opacity-0 translate-x-full'}
                            ${isDetailCollapsed 
                                ? 'bottom-6 left-1/2 -translate-x-1/2 w-48 h-12 rounded-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-auto md:right-0 md:w-8 md:h-20 md:rounded-l-2xl md:translate-x-0' 
                                : 'top-4 right-16 w-10 h-10 rounded-full md:top-1/2 md:-translate-y-1/2 md:right-[380px] lg:right-[450px] md:w-8 md:h-20 md:rounded-l-2xl md:translate-x-0'}
                        `}
                        title={isDetailCollapsed ? "Expandir Detalhes" : "Recolher Detalhes"}
                     >
                        {isDetailCollapsed ? (
                            <div className="flex items-center gap-2 md:block">
                                <ChevronUp size={18} className="md:hidden" />
                                <ChevronLeft size={18} className="hidden md:block" />
                                <span className="text-[10px] font-black uppercase tracking-widest md:hidden">Ver Detalhes</span>
                            </div>
                        ) : (
                            <>
                                <ChevronDown size={18} className="md:hidden" />
                                <ChevronRight size={18} className="hidden md:block" />
                            </>
                        )}
                     </button>

                     <div className={`
                        pointer-events-auto w-full md:w-[380px] lg:w-[450px] h-full md:h-[90vh] bg-[#121212] 
                        border-t md:border border-white/5 shadow-2xl rounded-t-[2.5rem] md:rounded-[3rem] 
                        overflow-hidden transition-all duration-500 transform
                        ${showDetailDrawer ? 'opacity-100' : 'opacity-0'}
                        ${isDetailCollapsed 
                            ? 'translate-y-[calc(100%-60px)] md:translate-x-full md:translate-y-0' 
                            : 'translate-y-0 md:translate-x-0'}
                     `}>
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
                    onClose={() => setSelectedOrderForChat(null)}
                    theme={theme}
                    unreadMessages={unreadMessages[selectedOrderForChat.id] || {}}
                    setUnreadMessages={(updater) => {
                        setUnreadMessages(prev => ({
                            ...prev,
                            [selectedOrderForChat.id]: typeof updater === 'function' ? updater(prev[selectedOrderForChat.id] || {}) : updater
                        }));
                    }}
                />
            )}
        </div>
    );
};

