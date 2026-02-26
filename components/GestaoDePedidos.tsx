
import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, Courier, StoreProfile, Customer, RouteStats, StoreSettings } from '../types';
import { DeliveryForm } from './DeliveryForm';
import { LeafletMap } from './LeafletMap';
import { PickupValidationModal } from './PickupValidationModal';
import { OrderServiceDetail } from './OrderServiceDetail';
import { CancellationModal } from './CancellationModal';
import {
    Clock, MapPin, AlertCircle, Lock, LockOpen, PackageCheck, Send, Loader2, MessageCircle, Zap,
    ChevronRight, ArrowRight, Wallet, Radio, Navigation, X, CreditCard, Banknote, QrCode, Trash2, ArrowLeftRight, CheckCheck, Layers, Hash, Bike
} from 'lucide-react';

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
    theme: string;
    settings: StoreSettings;
    onToggleMapTheme: () => void;
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
    onResetDatabase,
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
    const [draftAddress, setDraftAddress] = useState<string>('');
    const [routeStats, setRouteStats] = useState<RouteStats | null>(null);

    // Drawer State
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);

    // Targeted Selection State
    const [isSelectingCourier, setIsSelectingCourier] = useState(false);
    const [targetCourierId, setTargetCourierId] = useState<string>('');

    // Sync drawer with active order
    // Sync drawer with active order SELECTION (Expand on new selection)
    useEffect(() => {
        if (activeOrder) {
            setShowDetailDrawer(true);
        }
    }, [activeOrder?.id]);

    // Auto-collapse when status changes to "Moving" states (To Store / In Transit)
    useEffect(() => {
        if (activeOrder && (activeOrder.status === OrderStatus.TO_STORE || activeOrder.status === OrderStatus.IN_TRANSIT)) {
            setShowDetailDrawer(false);
        }
    }, [activeOrder?.status]);

    const handleCloseDrawer = () => {
        setShowDetailDrawer(false);
        // Small timeout to allow animation to finish before clearing state
        setTimeout(() => setActiveOrder(null), 300);
    };

    // --- HANDLERS ---
    const handleOpenValidation = (e: React.MouseEvent, order: Order) => {
        e.stopPropagation();
        setOrderToInteract(order);
        setValidationModalOpen(true);
    };

    const handleOpenCancellation = (e: React.MouseEvent, order: Order) => {
        e.stopPropagation();
        setOrderToInteract(order);
        setCancellationModalOpen(true);
    };

    const handleValidationSuccess = (code: string) => {
        if (orderToInteract) {
            if (orderToInteract.isBatch && orderToInteract.batchOrders) {
                // Validate ALL orders in the batch
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
        // If the cancelled order was the active one, close drawer
        if (activeOrder?.id === orderId) {
            handleCloseDrawer();
        }
        // SAFETY: Clear draft route if it happens to be lingering
        setDraftAddress('');
        setRouteStats(null);
    };

    const handleNewOrderSubmit = (data: any) => {
        console.log("🚀 [GestaoDePedidos] handleNewOrderSubmit triggered with data:", data);

        if (data.targetCourierId) {
            console.log("🎯 [GestaoDePedidos] Targeted courier detected in payload:", data.targetCourierId);
        } else {
            console.log("📣 [GestaoDePedidos] No target courier (Standard Broadcast)");
        }

        onNewOrder(data);
        // Clear draft route and targeted courier upon successful submission
        setDraftAddress('');
        setRouteStats(null);
        setTargetCourierId('');
        setIsSelectingCourier(false);
    };

    const handleCourierSelect = (courierId: string) => {
        console.log("📍 [GestaoDePedidos] Courier selected from map:", courierId);
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
        const pending: Order[] = [];

        activeOrders.forEach(order => {
            if (order.status === OrderStatus.PENDING || !order.courier) {
                pending.push(order);
            } else {
                const driverId = order.courier.id;
                if (!groups.has(driverId)) {
                    groups.set(driverId, []);
                }
                groups.get(driverId)!.push(order);
            }
        });

        const grouped: Order[] = Array.from(groups.values()).map(batch => {
            if (batch.length === 1) return batch[0];
            const mainOrder = batch[0];
            return {
                ...mainOrder,
                isBatch: true,
                batchOrders: batch,
                clientName: `${batch.length} Pedidos - Rota ${mainOrder.courier?.name || ''}`,
                destination: `${batch.length} destinos na rota`
            };
        });

        return [...pending, ...grouped].sort((a, b) => {
            if ((a.status === OrderStatus.READY_FOR_PICKUP || a.status === OrderStatus.RETURNING) && (b.status !== OrderStatus.READY_FOR_PICKUP && b.status !== OrderStatus.RETURNING)) return -1;
            if ((b.status === OrderStatus.READY_FOR_PICKUP || b.status === OrderStatus.RETURNING) && (a.status !== OrderStatus.READY_FOR_PICKUP && a.status !== OrderStatus.RETURNING)) return 1;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }, [activeOrders]);

    const activeCouriersWithOrders = useMemo(() => {
        const couriersMap = new Map<string, Courier>();
        orders.forEach(o => {
            if (o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELED && o.courier) {
                couriersMap.set(o.courier.id, o.courier);
            }
        });
        return Array.from(couriersMap.values());
    }, [orders]);

    // --- HELPER: CARD VISUALS & LOGIC ---
    const getCardConfig = (order: Order) => {
        // LED Proximity Logic
        let isNearby = false;
        if (order.courier && (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.TO_STORE || order.status === OrderStatus.RETURNING)) {
            const dist = calculateDistance(order.courier.lat, order.courier.lng, storeProfile.lat, storeProfile.lng);
            if (dist < 0.2) isNearby = true; // Less than 200m
        }

        switch (order.status) {
            case OrderStatus.PENDING:
                return {
                    border: 'border-l-status-amber',
                    bg: 'bg-guepardo-gray-800',
                    badge: 'bg-status-amber/10 text-status-amber border border-status-amber/20',
                    statusText: 'Procurando...',
                    action: null,
                    isNearby: false,
                    text: 'text-gray-300'
                };
            case OrderStatus.ACCEPTED:
            case OrderStatus.TO_STORE:
                return {
                    border: 'border-l-guepardo-accent',
                    bg: 'bg-guepardo-gray-800',
                    badge: 'bg-guepardo-accent/10 text-guepardo-accent border border-guepardo-accent/20',
                    statusText: 'A CAMINHO DA LOJA',
                    action: 'PREPARE',
                    isNearby,
                    text: 'text-white'
                };
            case OrderStatus.ARRIVED_AT_STORE:
                return {
                    border: 'border-l-guepardo-accent',
                    bg: 'bg-guepardo-gray-800',
                    badge: 'bg-guepardo-accent text-guepardo-gray-900 border border-guepardo-accent font-extrabold animate-pulse',
                    statusText: 'GUEPARDO NA LOJA',
                    action: 'PREPARE',
                    isNearby: true,
                    text: 'text-white'
                };
            case OrderStatus.READY_FOR_PICKUP:
                return {
                    border: 'border-l-status-green',
                    bg: 'bg-guepardo-gray-800', // removed green tint for cleaner dark mode
                    badge: 'bg-status-green/10 text-status-green border border-status-green/20',
                    statusText: 'AGUARDANDO CÓDIGO',
                    action: 'VALIDATE',
                    isNearby: false,
                    text: 'text-white'
                };
            case OrderStatus.IN_TRANSIT:
                return {
                    border: 'border-l-status-blue',
                    bg: 'bg-guepardo-gray-800',
                    badge: 'bg-status-blue/10 text-status-blue border border-status-blue/20',
                    statusText: 'EM TRÂNSITO',
                    action: 'TRACK',
                    isNearby: false,
                    text: 'text-white'
                };
            case OrderStatus.RETURNING:
                return {
                    border: 'border-l-purple-500',
                    bg: 'bg-guepardo-gray-800',
                    badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
                    statusText: 'EM RETORNO',
                    action: 'CONFIRM_RETURN',
                    isNearby: isNearby,
                    text: 'text-gray-300'
                };
            default:
                return {
                    border: 'border-l-gray-600',
                    bg: 'bg-guepardo-gray-800',
                    badge: 'bg-gray-700 text-gray-400',
                    statusText: order.status,
                    action: null,
                    isNearby: false,
                    text: 'text-gray-500'
                };
        }
    };

    const getPaymentIcon = (method: string) => {
        switch (method) {
            case 'CARD': return <CreditCard size={12} className="text-blue-600" />;
            case 'CASH': return <Banknote size={12} className="text-green-600" />;
            case 'PIX': return <QrCode size={12} className="text-guepardo-orange" />;
            default: return <Wallet size={12} className="text-gray-400" />;
        }
    };

    return (
        <div className="relative h-full w-full overflow-hidden font-sans bg-gray-200 dark:bg-guepardo-gray-900 transition-colors duration-300">

            {/* CAMADA 0: MAPA BACKGROUND (FULLSCREEN) */}
            <div className="absolute inset-0 z-0 pointer-events-auto">
                <LeafletMap
                    store={storeProfile}
                    activeOrder={activeOrder}
                    filteredOrders={activeOrders}
                    availableCouriers={availableCouriers}
                    theme={theme}
                    toggleTheme={onToggleMapTheme}
                    draftDestinationAddress={draftAddress}
                    onRouteCalculated={setRouteStats}
                    isSelectingCourier={isSelectingCourier}
                    onCourierSelect={(id) => {
                        setTargetCourierId(id);
                        setIsSelectingCourier(false);
                    }}
                />
            </div>

            {/* CAMADA 1: ÁREA OPERACIONAL (ESQUERDA - FLEX COL) */}
            <div className="absolute left-4 top-4 bottom-4 z-20 flex flex-col gap-4 pointer-events-none w-[380px]">

                {/* BLOCO 1: FORMULÁRIO (SUPERIOR) */}
                <div className="bg-warm-100 dark:bg-guepardo-gray-900/90 backdrop-blur-xl shadow-2xl shadow-warm-300/50 flex flex-col border border-warm-200 dark:border-white/10 rounded-3xl overflow-hidden ring-1 ring-black/5 dark:ring-black/50 transition-colors duration-300 pointer-events-auto shrink-0">
                    <div className="p-4">
                        <DeliveryForm
                            onSubmit={handleNewOrderSubmit}
                            isSubmitting={false}
                            existingCustomers={customers}
                            onAddressChange={setDraftAddress}
                            routeStats={routeStats}
                            settings={settings}
                            activeCouriersWithOrders={activeCouriersWithOrders}
                            availableCouriers={availableCouriers}
                            allOrders={orders}
                            isSelecting={isSelectingCourier}
                            onToggleSelection={() => setIsSelectingCourier(!isSelectingCourier)}
                            externalTargetId={targetCourierId}
                            onClearSelection={() => setTargetCourierId('')}
                        />
                    </div>
                </div>

                {/* BLOCO 2: MONITORAMENTO (INFERIOR - FLEX-1) */}
                <div className="flex-1 bg-warm-100 dark:bg-guepardo-gray-900/90 backdrop-blur-xl shadow-2xl shadow-warm-300/50 flex flex-col border border-warm-200 dark:border-white/10 rounded-3xl overflow-hidden ring-1 ring-black/5 dark:ring-black/50 transition-colors duration-300 pointer-events-auto">
                    <div className="flex-1 overflow-y-auto p-4 scrollbar-guepardo">
                        <h3 className="text-xs font-bold text-stone-500 dark:text-gray-400 uppercase mb-1 pl-1 flex items-center justify-between">
                            <span>Monitoramento Ativo</span>
                            <span className="bg-warm-200 dark:bg-white/10 text-warm-800 dark:text-white px-2 py-0.5 rounded-md border border-warm-300 dark:border-white/10">{activeOrders.length}</span>
                        </h3>
                        <h3 className="text-xs font-bold text-stone-500 dark:text-gray-400 uppercase mb-3 pl-1 flex items-center justify-between">
                            <span className="flex items-center gap-1"><Bike size={12} className="text-guepardo-accent" /> Guepardos On-line</span>
                            <span className="bg-guepardo-accent/10 text-guepardo-accent px-2 py-0.5 rounded-md border border-guepardo-accent/20">{availableCouriers.length}</span>
                        </h3>


                        {/* ZERAR BANCO BUTTON */}


                        <div className="space-y-3 pb-20">
                            {groupedOrders.map((order) => {
                                const config = getCardConfig(order);
                                const isSelected = activeOrder?.id === order.id;
                                const changeNeeded = order.paymentMethod === 'CASH' && order.changeFor
                                    ? order.changeFor - order.deliveryValue
                                    : 0;

                                // For batches, we show IDs of all orders
                                const displayIds = order.isBatch && order.batchOrders
                                    ? order.batchOrders.map(o => o.display_id || o.id.slice(-4)).join(', ')
                                    : (order.display_id || order.id.slice(-4));

                                return (
                                    <div
                                        key={order.id}
                                        onClick={() => handleCardClick(order)}
                                        className={`
                                                relative rounded-2xl shadow-lg cursor-pointer transition-all duration-300 mb-3
                                                hover:shadow-glow-sm hover:-translate-y-1 
                                                bg-white dark:bg-warm-800
                                                border-l-[4px] border-l-guepardo-accent
                                                ${isSelected ? 'ring-2 ring-guepardo-accent ring-offset-2 ring-offset-warm-900 z-10 shadow-glow scale-[1.02]' : 'border-y border-r border-warm-200 dark:border-white/5'}
                                            `}
                                    >
                                        {/* PROXIMITY LED */}
                                        {config.isNearby && (
                                            <div className="absolute -top-1.5 -right-1.5 z-20">
                                                <span className="flex h-4 w-4">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white shadow-sm"></span>
                                                </span>
                                            </div>
                                        )}

                                        {/* CANCEL BUTTON (HOVER) */}
                                        {!order.isBatch && (
                                            <button
                                                onClick={(e) => handleOpenCancellation(e, order)}
                                                className="absolute top-2 right-2 p-1.5 rounded-full bg-transparent hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors z-30"
                                                title="Cancelar Pedido"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}

                                        <div className="p-4">
                                            {/* Header do Card */}
                                            <div className="flex justify-between items-start mb-2 pr-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[10px] font-bold text-warm-500 dark:text-gray-400 bg-warm-50 dark:bg-white/10 px-1.5 py-0.5 rounded border border-warm-200 dark:border-transparent">
                                                        #{displayIds}
                                                    </span>
                                                    {!order.isBatch && (
                                                        <div className="p-1 rounded bg-warm-50 dark:bg-white/5 border border-warm-200 dark:border-white/10" title={order.paymentMethod}>
                                                            {getPaymentIcon(order.paymentMethod)}
                                                        </div>
                                                    )}
                                                    {order.isBatch && <Layers size={14} className="text-guepardo-accent" />}
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${order.status === OrderStatus.READY_FOR_PICKUP ? 'bg-green-100 text-green-700 border-green-200' :
                                                    order.status === OrderStatus.RETURNING ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                        'bg-orange-100 text-orange-700 border-orange-200'
                                                    }`}>
                                                    {config.statusText}
                                                </span>
                                            </div>

                                            {/* Informações Principais */}
                                            <div className="mb-4">
                                                <h4 className="text-[18px] font-bold text-warm-800 dark:text-white leading-tight mb-1 font-sans">
                                                    {order.clientName}
                                                </h4>
                                                <p className="text-[12px] font-normal text-warm-500 dark:text-[#E0E0E0] truncate flex items-center gap-1">
                                                    <MapPin size={10} /> {order.destination}
                                                </p>

                                                {order.isBatch && order.batchOrders && (
                                                    <div className="mt-2 space-y-1">
                                                        {order.batchOrders.map(bo => (
                                                            <div key={bo.id} className="text-[10px] text-warm-500 dark:text-gray-400 flex justify-between items-center group/item hover:text-guepardo-accent transition-colors">
                                                                <span className="flex items-center gap-1">
                                                                    <Hash size={8} /> {bo.display_id || bo.id.slice(-4)} - {bo.clientName}
                                                                </span>
                                                                {/* bo.pickupCode suppressed for batch view */}
                                                                {false && bo.pickupCode && (
                                                                    <span className="bg-guepardo-accent/10 text-guepardo-accent px-1.5 py-0.5 rounded font-bold">
                                                                        {bo.pickupCode}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {!order.isBatch && order.courier && order.status !== OrderStatus.PENDING && (
                                                    <p className="text-[10px] font-bold text-guepardo-accent mt-2 flex items-center gap-1 animate-in fade-in slide-in-from-left-2 transition-all">
                                                        <Zap size={10} fill="currentColor" />
                                                        Pedido aceito pelo Entregador "{order.courier.name}" via aplicativo Guepardo Entregador.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Financial Alert */}
                                            {!order.isBatch && changeNeeded > 0 && (
                                                <div className="mb-3 px-2 py-1 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded text-[10px] font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
                                                    <Banknote size={12} />
                                                    Troco: levar R$ {(changeNeeded || 0).toFixed(2)}
                                                </div>
                                            )}

                                            {/* Return Required Alert */}
                                            {!order.isBatch && order.isReturnRequired && order.status !== OrderStatus.RETURNING && (
                                                <div className="mb-3 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 rounded text-[10px] font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1">
                                                    <ArrowLeftRight size={12} />
                                                    Retorno Obrigatório (+50%)
                                                </div>
                                            )}

                                            {/* Action Area */}
                                            <div onClick={(e) => e.stopPropagation()}>
                                                {/* ACTION: PREPARE */}
                                                {config.action === 'PREPARE' && (
                                                    <div className="flex gap-2">
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (order.courier?.phone) {
                                                                    window.open(`https://wa.me/55${order.courier.phone.replace(/\D/g, '')}`, '_blank');
                                                                } else {
                                                                    alert('Entregador sem telefone cadastrado.');
                                                                }
                                                            }}
                                                            className="flex-1 flex items-center gap-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg p-2 border border-green-200 dark:border-green-800 shadow-sm cursor-pointer group transition-all"
                                                        >
                                                            <div className="relative">
                                                                <img src={order.courier?.photoUrl} className="w-8 h-8 rounded-full bg-gray-200 object-cover border border-green-200 dark:border-green-700" alt="" />
                                                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border border-white">
                                                                    <MessageCircle size={8} color="white" strokeWidth={3} />
                                                                </div>
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <p className="text-[10px] font-bold text-green-900 dark:text-green-100 truncate group-hover:text-green-700 transition-colors uppercase">{order.courier?.name}</p>
                                                                <p className="text-[9px] text-green-700 dark:text-green-300 font-mono truncate">{order.courier?.vehiclePlate}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => onMarkAsReady(order.id)}
                                                            className="flex-1 bg-guepardo-accent hover:bg-guepardo-orange text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all uppercase"
                                                        >
                                                            <PackageCheck size={16} />
                                                            Pronto
                                                        </button>
                                                    </div>
                                                )}

                                                {/* ACTION: VALIDATE */}
                                                {config.action === 'VALIDATE' && (
                                                    <button
                                                        onClick={(e) => handleOpenValidation(e, order)}
                                                        className="w-full h-11 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all animate-pulse-slow uppercase tracking-wide border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
                                                    >
                                                        <Lock size={16} />
                                                        Validar Código
                                                    </button>
                                                )}

                                                {/* ACTION: CONFIRM RETURN */}
                                                {config.action === 'CONFIRM_RETURN' && (
                                                    <button
                                                        onClick={() => onConfirmReturn(order.id)}
                                                        className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all uppercase tracking-wide border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 animate-pulse"
                                                    >
                                                        <CheckCheck size={18} />
                                                        Confirmar Devolução
                                                    </button>
                                                )}

                                                {/* ACTION: TRACK */}
                                                {config.action === 'TRACK' && (
                                                    <div className="w-full h-9 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/20 rounded-lg flex items-center justify-center gap-2 text-xs font-bold">
                                                        <Send size={14} />
                                                        Em deslocamento
                                                    </div>
                                                )}

                                                {/* LOADING (Searching) */}
                                                {!config.action && (
                                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden mt-2">
                                                        <div className="bg-guepardo-accent h-full w-1/3 animate-loading-bar rounded-full"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {groupedOrders.length === 0 && (
                                <div className="text-center py-12 opacity-40">
                                    <Radio size={32} className="mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm text-gray-500 font-medium">Nenhum pedido ativo</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* PAINEL 2: FLOATING CAPSULE (OS) moved to root */}
                </div>
            </div>

            {/* MODAL DE VALIDAÇÃO (Root Level) */}
            <PickupValidationModal
                isOpen={validationModalOpen}
                onClose={() => setValidationModalOpen(false)}
                onValidate={handleValidationSuccess}
                courierName={orderToInteract?.courier?.name || 'Entregador'}
                correctCode={orderToInteract?.pickupCode || '0000'}
                validCodes={
                    orderToInteract?.isBatch && orderToInteract.batchOrders
                        ? orderToInteract.batchOrders.map(o => o.pickupCode || '')
                        : orderToInteract?.pickupCode ? [orderToInteract.pickupCode] : []
                }
            />

            {/* MODAL DE CANCELAMENTO (Root Level) */}
            <CancellationModal
                isOpen={cancellationModalOpen}
                onClose={() => setCancellationModalOpen(false)}
                onConfirm={handleCancellationConfirm}
                order={orderToInteract}
            />

            {/* PAINEL DE DETALHES (Root Level) */}
            {
                activeOrder && (
                    <OrderServiceDetail
                        order={activeOrder}
                        storeProfile={storeProfile}
                        onCancelClick={(order) => {
                            setOrderToInteract(order);
                            setCancellationModalOpen(true);
                        }}
                        onConfirmReturn={onConfirmReturn}
                        isExpanded={showDetailDrawer}
                        onToggleExpand={() => setShowDetailDrawer(prev => !prev)}
                        onClose={handleCloseDrawer}
                        theme={theme}
                    />
                )
            }
        </div>
    );
};
