import React, { useState, useMemo, useEffect } from 'react';
import { 
  Order, OrderStatus, Courier, StoreProfile, Customer, StoreSettings, ChatRoomType 
} from '../types';
import { 
  Bike, Clock, AlertTriangle, CheckCircle2, MessageSquare, MapPin, Search, Phone, 
  ExternalLink, ShoppingBag, Radio, ArrowRight, User, ShieldCheck, Flame, ChevronRight, 
  RefreshCw, X, Eye, EyeOff, Lock, Check, Send, Sparkles, Navigation, Layers, Plus, DollarSign, Zap,
  Store, Bell, QrCode, CreditCard, Banknote, HelpCircle, Utensils, ArrowLeftRight, Trash2
} from 'lucide-react';
import { PickupValidationModal } from './PickupValidationModal';
import { ChatMultilateralModal } from './ChatMultilateralModal';
import { CancellationModal } from './CancellationModal';
import { LeafletMap } from './LeafletMap';

interface GestorPedidosKanbanProps {
  orders: Order[];
  storeProfile: StoreProfile;
  availableCouriers: Courier[];
  customers: Customer[];
  settings: StoreSettings;
  balance?: number;
  unreadMessages: Record<string, Partial<Record<ChatRoomType, number>>>;
  onSelectOrder: (order: Order) => void;
  onAcceptIFoodOrder?: (orderId: string) => void;
  onAccept99FoodOrder?: (orderId: string) => void;
  onSimulate99FoodOrder?: () => Promise<void>;
  onAcceptAnotaAiOrder?: (orderId: string) => void;
  onSimulateAnotaAiOrder?: () => Promise<void>;
  onMarkAsReady: (orderId: string) => void;
  onValidatePickup: (orderId: string) => void;
  onCancelOrder: (orderId: string, reason: string) => void;
  onConfirmReturn: (orderId: string) => void;
  onSimulateAccept?: (orderId: string) => void;
  onNavigateToDispatch: () => void;
  onToggleStatus?: (newStatus: 'aberta' | 'fechada') => void;
  onOpenChat?: (order: Order) => void;
  mapboxToken?: string;
  onBulkAssign?: (orderIds: string[], courierId: string) => Promise<void> | void;
  onDirectAssignCourier?: (order: Order, courierId: string) => Promise<void>;
}

// Helper para calcular tempo decorrido amigável
const formatElapsedTime = (date: Date) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Agora mesmo';
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  const restMin = diffMinutes % 60;
  return `há ${hours}h ${restMin}m`;
};

// Helper de minutos decorridos
const getElapsedMinutes = (date: Date) => {
  const diffMs = Date.now() - new Date(date).getTime();
  return Math.floor(diffMs / 60000);
};

export const GestorPedidosKanban: React.FC<GestorPedidosKanbanProps> = ({
  orders,
  storeProfile,
  availableCouriers,
  customers,
  settings,
  balance = 0,
  unreadMessages,
  onSelectOrder,
  onAcceptIFoodOrder,
  onAccept99FoodOrder,
  onSimulate99FoodOrder,
  onAcceptAnotaAiOrder,
  onSimulateAnotaAiOrder,
  onMarkAsReady,
  onValidatePickup,
  onCancelOrder,
  onConfirmReturn,
  onSimulateAccept,
  onNavigateToDispatch,
  onToggleStatus,
  onOpenChat,
  mapboxToken,
  onBulkAssign,
  onDirectAssignCourier,
}) => {
  // Modos de Visão e Rastreio
  const [viewMode, setViewMode] = useState<'kanban' | 'map'>('kanban');
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [mapSelectedOrder, setMapSelectedOrder] = useState<Order | null>(null);

  // Estados de Agregação / Atribuição de Pedidos
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [assignModalOrders, setAssignModalOrders] = useState<Order[] | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [courierSearchTerm, setCourierSearchTerm] = useState('');

  // Filtros de UI
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'IFOOD' | '99FOOD' | 'ANOTA_AI' | 'DIRECT' | 'WHATSAPP'>('ALL');
  const [now, setNow] = useState(Date.now());
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [validatingOrder, setValidatingOrder] = useState<Order | null>(null);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);

  // Modo Capinha de Números Grandes (com persistência em localStorage)
  const [showOrderCover, setShowOrderCover] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('guepardo_kanban_cover_mode');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Conjunto de IDs de pedidos desbloqueados manualmente por clique
  const [unlockedOrderIds, setUnlockedOrderIds] = useState<Set<string>>(new Set());

  // Salvar preferência quando alterada
  useEffect(() => {
    try {
      localStorage.setItem('guepardo_kanban_cover_mode', JSON.stringify(showOrderCover));
    } catch (e) {
      console.warn('Erro ao salvar cover mode:', e);
    }
  }, [showOrderCover]);

  // Função para alternar bloqueio individual
  const toggleUnlockOrder = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnlockedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Timer para atualizar minutos decorridos a cada 10 segundos
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const isOpen = storeProfile.status === 'aberta';

  // Contagem de pilotos online
  const onlineCouriersCount = useMemo(() => {
    return availableCouriers.filter(c => c.isOnline).length;
  }, [availableCouriers]);

  // Agrupamento de entregadores com pedidos ativos (para agregar à mesma rota)
  const couriersWithActiveOrders = useMemo(() => {
    const map = new Map<string, { courier: Courier; activeOrders: Order[] }>();
    orders.forEach(order => {
      if (
        order.courier &&
        order.status !== OrderStatus.DELIVERED &&
        order.status !== OrderStatus.CANCELED
      ) {
        if (!map.has(order.courier.id)) {
          map.set(order.courier.id, { courier: order.courier, activeOrders: [] });
        }
        map.get(order.courier.id)!.activeOrders.push(order);
      }
    });
    return Array.from(map.values());
  }, [orders]);

  // Lista de entregadores ativos filtrados pela busca
  const activeCouriersFiltered = useMemo(() => {
    if (!courierSearchTerm) return couriersWithActiveOrders;
    const term = courierSearchTerm.toLowerCase();
    return couriersWithActiveOrders.filter(({ courier }) =>
      courier.name.toLowerCase().includes(term) ||
      courier.vehiclePlate?.toLowerCase().includes(term)
    );
  }, [couriersWithActiveOrders, courierSearchTerm]);

  // Lista de entregadores livres online (sem pedidos ativos no momento)
  const freeCouriersFiltered = useMemo(() => {
    const activeIds = new Set(couriersWithActiveOrders.map(c => c.courier.id));
    const free = availableCouriers.filter(c => c.isOnline && !activeIds.has(c.id));
    if (!courierSearchTerm) return free;
    const term = courierSearchTerm.toLowerCase();
    return free.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.vehiclePlate?.toLowerCase().includes(term)
    );
  }, [availableCouriers, couriersWithActiveOrders, courierSearchTerm]);

  // Manipulador de atribuição / agregação
  const handleAssignToCourier = async (orderIds: string[], courierId: string) => {
    setIsAssigning(true);
    try {
      if (onBulkAssign) {
        await onBulkAssign(orderIds, courierId);
      } else if (onDirectAssignCourier) {
        const order = orders.find(o => o.id === orderIds[0]);
        if (order) {
          await onDirectAssignCourier(order, courierId);
        }
      }
      setAssignModalOrders(null);
      setSelectedOrderIds([]);
    } catch (err) {
      console.error('Erro ao agregar/atribuir pedido:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const isOrderSelected = (order: Order) => {
    if (order.isBatch && order.batchOrders && order.batchOrders.length > 0) {
      return order.batchOrders.every(b => selectedOrderIds.includes(b.id));
    }
    return selectedOrderIds.includes(order.id);
  };

  const toggleSelectOrder = (orderOrId: Order | string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const idsToToggle: string[] = typeof orderOrId === 'string'
      ? [orderOrId]
      : (orderOrId.isBatch && orderOrId.batchOrders && orderOrId.batchOrders.length > 0)
        ? orderOrId.batchOrders.map(b => b.id)
        : [orderOrId.id];

    setSelectedOrderIds(prev => {
      const allSelected = idsToToggle.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !idsToToggle.includes(id));
      } else {
        return Array.from(new Set([...prev, ...idsToToggle]));
      }
    });
  };

  // Filtro de busca e canal
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Filtro de canal
      if (channelFilter === 'IFOOD' && order.requestSource !== 'IFOOD' && order.external_source !== 'IFOOD') return false;
      if (channelFilter === '99FOOD' && order.requestSource !== '99FOOD' && order.external_source !== '99FOOD') return false;
      if (channelFilter === 'ANOTA_AI' && order.requestSource !== 'ANOTA_AI' && order.external_source !== 'ANOTA_AI') return false;
      if (channelFilter === 'WHATSAPP' && order.requestSource !== 'WHATSAPP') return false;
      if (channelFilter === 'DIRECT' && (order.requestSource === 'IFOOD' || order.requestSource === '99FOOD' || order.requestSource === 'ANOTA_AI')) return false;

      // Filtro de busca por texto
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const clientNameMatch = order.clientName?.toLowerCase().includes(term);
        const displayIdMatch = order.display_id?.toLowerCase().includes(term);
        const idMatch = order.id.toLowerCase().includes(term);
        const phoneMatch = order.clientPhone?.includes(term);
        const addressMatch = order.destination?.toLowerCase().includes(term);
        const courierMatch = order.courier?.name?.toLowerCase().includes(term);
        if (!clientNameMatch && !displayIdMatch && !idMatch && !phoneMatch && !addressMatch && !courierMatch) {
          return false;
        }
      }
      return true;
    });
  }, [orders, channelFilter, searchTerm]);

  // ─── AGRUPAMENTO EM LOTE (BATCHING CONSOLIDADO) ───────────────────────────
  // Unifica pedidos que compartilham batch_id ou mesmo entregador ativo em rota
  const groupedOrders = useMemo(() => {
    // Pedidos pendentes de aceite do lojista (Coluna 1) permanecem individuais
    const isAcceptOrder = (o: Order) => {
      return (o.requestSource === 'IFOOD' || o.requestSource === '99FOOD' || o.requestSource === 'ANOTA_AI' || o.external_source) &&
             (o.status === OrderStatus.PENDING || o.rawStatus === 'created') && !o.acceptedAt;
    };

    const acceptOrders: Order[] = [];
    const activeCandidates: Order[] = [];
    const deliveredOrders: Order[] = [];

    filteredOrders.forEach(o => {
      if (isAcceptOrder(o)) {
        acceptOrders.push(o);
      } else if (o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELED) {
        deliveredOrders.push(o);
      } else {
        activeCandidates.push(o);
      }
    });

    const batchGroups = new Map<string, Order[]>();
    const courierOnlyGroups = new Map<string, Order[]>();
    const singleOrders: Order[] = [];

    activeCandidates.forEach(order => {
      if (order.batch_id) {
        if (!batchGroups.has(order.batch_id)) {
          batchGroups.set(order.batch_id, []);
        }
        batchGroups.get(order.batch_id)!.push(order);
      } else if (order.courier?.id) {
        const driverId = order.courier.id;
        if (!courierOnlyGroups.has(driverId)) {
          courierOnlyGroups.set(driverId, []);
        }
        courierOnlyGroups.get(driverId)!.push(order);
      } else {
        singleOrders.push(order);
      }
    });

    // Mesclar courierOnlyGroups nos batchGroups se o entregador já possui pedidos em batchGroups
    for (const [driverId, cOrders] of courierOnlyGroups.entries()) {
      let merged = false;
      for (const [, bOrders] of batchGroups.entries()) {
        if (bOrders.some(b => b.courier?.id === driverId)) {
          bOrders.push(...cOrders);
          merged = true;
          break;
        }
      }
      if (!merged) {
        if (cOrders.length > 1) {
          batchGroups.set(`courier-${driverId}`, cOrders);
        } else {
          singleOrders.push(...cOrders);
        }
      }
    }

    const processedBatches: Order[] = Array.from(batchGroups.values()).map(batch => {
      if (batch.length === 1) {
        return batch[0];
      }

      const sortedBatch = [...batch].sort((a, b) => (a.stopNumber || 0) - (b.stopNumber || 0));
      const mainOrder = sortedBatch[0];
      const totalDeliveryValue = batch.reduce((acc, o) => acc + (o.deliveryValue || o.estimatedPrice || 0), 0);
      const totalEstimatedPrice = batch.reduce((acc, o) => acc + (o.estimatedPrice || o.storeFreight || 0), 0);
      const statuses = batch.map(o => o.status);

      // Status Consolidado do Lote:
      // Se qualquer pedido estiver em trânsito ou retornando -> Em Rota
      // Se o motoboy chegou na loja (ARRIVED_AT_STORE) ou se todos estão prontos -> Pronto / Na Loja
      // Se qualquer um estiver pronto e o motoboy estiver na loja -> ARRIVED_AT_STORE
      // Se algum estiver pronto -> READY_FOR_PICKUP
      // Se o motoboy já foi aceito / a caminho -> ACCEPTED (Em Preparo)
      let batchStatus = mainOrder.courier ? OrderStatus.ACCEPTED : (mainOrder.status || OrderStatus.PENDING);
      if (statuses.includes(OrderStatus.IN_TRANSIT)) {
        batchStatus = OrderStatus.IN_TRANSIT;
      } else if (statuses.includes(OrderStatus.RETURNING)) {
        batchStatus = OrderStatus.RETURNING;
      } else if (statuses.includes(OrderStatus.ARRIVED_AT_STORE)) {
        batchStatus = OrderStatus.ARRIVED_AT_STORE;
      } else if (statuses.includes(OrderStatus.READY_FOR_PICKUP)) {
        batchStatus = OrderStatus.READY_FOR_PICKUP;
      } else if (statuses.includes(OrderStatus.ACCEPTED) || statuses.includes(OrderStatus.TO_STORE)) {
        batchStatus = mainOrder.courier ? OrderStatus.ACCEPTED : (mainOrder.status || OrderStatus.PENDING);
      }

      const sharedPickupCode = batch.find(o => o.pickupCode)?.pickupCode || mainOrder.pickupCode;
      const combinedDisplayId = sortedBatch.map(o => o.display_id || o.id.slice(-4)).join(' + ');

      return {
        ...mainOrder,
        id: mainOrder.id,
        isBatch: true,
        batchOrders: sortedBatch,
        status: batchStatus,
        pickupCode: sharedPickupCode,
        display_id: combinedDisplayId,
        clientName: `Lote (${sortedBatch.length} Pedidos) • ${mainOrder.courier?.name || 'Localizando Guepardo'}`,
        destination: `${sortedBatch.length} entregas agrupadas no roteiro`,
        deliveryValue: totalDeliveryValue,
        estimatedPrice: totalEstimatedPrice
      };
    });

    return [...acceptOrders, ...processedBatches, ...singleOrders, ...deliveredOrders];
  }, [filteredOrders]);

  // ─── 5 COLUNAS DA JORNADA OPERACIONAL ──────────────────────────────────────

  // Helper para verificar se o pedido está na fase "Localizando Entregador" (Coluna 1)
  const isLocatingCourier = (o: Order) => {
    if (o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELED) return false;
    // 1. Pedidos parceiros (iFood, 99Food, Anota AI) pendentes de confirmação/aceite da loja
    const isExternalPending = (o.requestSource === 'IFOOD' || o.requestSource === '99FOOD' || o.requestSource === 'ANOTA_AI' || o.external_source) &&
                              (o.status === OrderStatus.PENDING || o.rawStatus === 'created') && !o.acceptedAt;
    if (isExternalPending) return true;
    // 2. Pedidos novos ou manuais enquanto nenhum entregador tiver aceito / sido vinculado
    return !o.courier;
  };

  // 1. Coluna LOCALIZANDO ENTREGADOR: Pedidos parceiros pendentes de aceite ou pedidos sem entregador
  const colLocating = useMemo(() => {
    return groupedOrders.filter(o => isLocatingCourier(o))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [groupedOrders]);

  // Alias retrocompatível
  const colAccept = colLocating;

  // 2. Coluna EM PREPARO: Entregador já aceitou / atribuído, em preparação ou a caminho da loja
  const colPrep = useMemo(() => {
    return groupedOrders.filter(o => {
      // Ignorar se estiver aguardando entregador na Coluna 1
      if (isLocatingCourier(o)) return false;

      return (
        o.status === OrderStatus.PENDING ||
        o.status === OrderStatus.SCHEDULED ||
        o.status === OrderStatus.ACCEPTED ||
        o.status === OrderStatus.TO_STORE
      );
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [groupedOrders]);

  // 3. Coluna PRONTO / GUEPARDO NA LOJA: Pedido embalado ou motoboy já no balcão aguardando entrega
  const colReady = useMemo(() => {
    return groupedOrders.filter(o => {
      if (isLocatingCourier(o)) return false;
      return (
        o.status === OrderStatus.READY_FOR_PICKUP ||
        o.status === OrderStatus.ARRIVED_AT_STORE
      );
    }).sort((a, b) => {
      // Prioriza quem já tem motoboy na loja
      const aAtStore = a.status === OrderStatus.ARRIVED_AT_STORE ? 0 : 1;
      const bAtStore = b.status === OrderStatus.ARRIVED_AT_STORE ? 0 : 1;
      if (aAtStore !== bAtStore) return aAtStore - bAtStore;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [groupedOrders]);

  // 4. Coluna EM ROTA: Motoboy em trânsito com a entrega até o cliente (ou retornando)
  const colInTransit = useMemo(() => {
    return groupedOrders.filter(o => {
      return o.status === OrderStatus.IN_TRANSIT || o.status === OrderStatus.RETURNING;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [groupedOrders]);

  // 5. Coluna FINALIZADOS: Concluídos hoje
  const colDelivered = useMemo(() => {
    return filteredOrders.filter(o => {
      return o.status === OrderStatus.DELIVERED;
    }).slice(0, 30); // Limita aos 30 mais recentes
  }, [filteredOrders]);

  // Métricas do dia (dos finalizados)
  const dailyMetrics = useMemo(() => {
    const totalDelivered = colDelivered.length;
    const totalRevenue = colDelivered.reduce((acc, o) => acc + (o.deliveryValue || 0), 0);
    return { totalDelivered, totalRevenue };
  }, [colDelivered]);

  // Pedidos ativos para o mapa ao vivo
  const activeOrdersForMap = useMemo(() => {
    return groupedOrders.filter(o => 
      o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELED
    );
  }, [groupedOrders]);

  // Manipulador de Aceite Rápido
  const handleQuickAccept = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcceptingOrderId(order.id);
    try {
      if (order.requestSource === 'IFOOD' || order.external_source === 'IFOOD') {
        if (onAcceptIFoodOrder) await onAcceptIFoodOrder(order.id);
      } else if (order.requestSource === '99FOOD' || order.external_source === '99FOOD') {
        if (onAccept99FoodOrder) await onAccept99FoodOrder(order.id);
      } else if (order.requestSource === 'ANOTA_AI' || order.external_source === 'ANOTA_AI') {
        if (onAcceptAnotaAiOrder) await onAcceptAnotaAiOrder(order.id);
      }
    } catch (err) {
      console.error('Erro ao aceitar pedido:', err);
    } finally {
      setAcceptingOrderId(null);
    }
  };

  // Manipulador para abrir Chat com Entregador / Cliente
  const handleOpenChat = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onOpenChat) {
      onOpenChat(order);
    }
    setChatOrder(order);
  };

  // Helper para contagem de mensagens não lidas com o entregador
  const getCourierUnreadCount = (orderId: string) => {
    const orderUnread = unreadMessages?.[orderId];
    if (!orderUnread) return 0;
    return (orderUnread.STORE_COURIER || 0) + (orderUnread.COURIER_STORE || 0);
  };

  // Helper para renderizar Badge do Canal
  const renderChannelBadge = (order: Order) => {
    if (order.requestSource === 'IFOOD' || order.external_source === 'IFOOD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600 text-white shadow-sm">
          iFood
        </span>
      );
    }
    if (order.requestSource === '99FOOD' || order.external_source === '99FOOD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-black shadow-sm">
          99Food
        </span>
      );
    }
    if (order.requestSource === 'ANOTA_AI' || order.external_source === 'ANOTA_AI') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#7952DE] text-white shadow-sm">
          Anota AI
        </span>
      );
    }
    if (order.requestSource === 'WHATSAPP') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
          WhatsApp
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FF6B00] text-white shadow-sm">
        Guepardo
      </span>
    );
  };

  // Helper de ícone de pagamento
  const renderPaymentIcon = (method?: string) => {
    if (method === 'PIX') return <span className="text-emerald-400 font-bold text-[10px]">PIX</span>;
    if (method === 'CARD') return <CreditCard size={12} className="text-blue-400" />;
    return <Banknote size={12} className="text-amber-400" />;
  };

  // Helper para renderizar a Capinha Translúcida com Número Grande (Modo Híbrido)
  const renderOrderCover = (
    order: Order, 
    stepLabel: string, 
    stepColorClass: string = 'text-white',
    isCompact: boolean = false
  ) => {
    if (!showOrderCover) return null;
    const isUnlocked = unlockedOrderIds.has(order.id);
    if (isUnlocked) return null;

    const isBatch = !!(order.isBatch && order.batchOrders && order.batchOrders.length > 1);

    if (isCompact) {
      return (
        <div
          onClick={(e) => toggleUnlockOrder(order.id, e)}
          className="absolute inset-0 z-20 rounded-xl bg-gradient-to-b from-white/[0.18] via-white/[0.09] to-white/[0.04] backdrop-blur-md border border-white/20 hover:border-[#FF6B00]/70 flex items-center justify-between px-3 text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-300 pointer-events-auto group-hover:opacity-0 group-hover:pointer-events-none group-hover:scale-[0.98] cursor-pointer select-none"
          title="Passe o mouse para espiar ou clique para fixar aberto"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white tracking-tight drop-shadow-sm group-hover:text-[#FF6B00] transition-colors">
              #{order.display_id || order.id.slice(-4)}
            </span>
            {renderChannelBadge(order)}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 border border-white/20 ${stepColorClass}`}>
              {stepLabel}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={(e) => toggleUnlockOrder(order.id, e)}
        className="absolute inset-0 z-20 rounded-xl bg-gradient-to-b from-white/[0.18] via-white/[0.09] to-white/[0.04] backdrop-blur-md border border-white/30 hover:border-[#FF6B00]/70 flex flex-col items-center justify-between p-3.5 text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),0_8px_25px_rgba(0,0,0,0.6)] transition-all duration-300 pointer-events-auto group-hover:opacity-0 group-hover:pointer-events-none group-hover:scale-[0.98] cursor-pointer select-none"
        title="Passe o mouse para espiar ou clique para fixar aberto"
      >
        {/* Topo da Capinha */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isBatch ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/40">
                <Layers size={9} />
                Lote ({order.batchOrders?.length})
              </span>
            ) : (
              renderChannelBadge(order)
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/80 font-bold bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
            <Clock size={10} />
            <span>{formatElapsedTime(order.createdAt)}</span>
          </div>
        </div>

        {/* Centro da Capinha: Número Gigante */}
        <div className="my-auto flex flex-col items-center justify-center py-2">
          <span className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] group-hover:text-[#FF6B00] transition-colors">
            #{order.display_id || order.id.slice(-4)}
          </span>
          <p className="text-xs font-bold text-white/90 truncate max-w-[210px] mt-1 drop-shadow-sm">
            {order.clientName || 'Cliente'}
          </p>
          <span className={`mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/60 border border-white/20 shadow-sm ${stepColorClass}`}>
            {stepLabel}
          </span>
        </div>

        {/* Rodapé da Capinha */}
        <div className="w-full flex items-center justify-between pt-1.5 border-t border-white/15 text-[10px]">
          <span className="font-black text-white/90">
            R$ {(order.deliveryValue || order.estimatedPrice || 0).toFixed(2).replace('.', ',')}
          </span>
          <div className="flex items-center gap-1 text-[9px] font-bold text-white/70 tracking-wider">
            <Sparkles size={10} className="text-[#FF6B00]" />
            <span>Passe o mouse ou clique</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0A0400] text-white overflow-hidden select-none">
      
      {/* ─── TOPO / FAROL DA OPERAÇÃO ─────────────────────────────────────── */}
      <div className="shrink-0 px-4 md:px-6 py-3.5 bg-gradient-to-r from-[#1A0900] via-[#120500] to-[#0A0400] border-b border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-3">
        
        {/* Lado Esquerdo: Título & Farol */}
        <div className="flex items-center gap-3 md:gap-5 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#D35400] flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,107,0,0.5)]">
              <ShoppingBag size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-black italic tracking-tighter uppercase leading-none">
                  Gestor de Pedidos
                </h1>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/20 text-[#FF6B00] border border-orange-500/30 font-bold uppercase tracking-widest hidden sm:inline-block">
                  Jornada iFood
                </span>
              </div>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">
                {colAccept.length + colPrep.length + colReady.length + colInTransit.length} em andamento • {colDelivered.length} entregues hoje
              </p>
            </div>
          </div>

          {/* Farol da Operação (Status da Loja) */}
          <button
            onClick={() => onToggleStatus && onToggleStatus(isOpen ? 'fechada' : 'aberta')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all shadow-sm ${
              isOpen
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
            }`}
            title="Clique para alternar o status da loja"
          >
            <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]' : 'bg-red-500'}`} />
            <span>{isOpen ? 'Loja Aberta' : 'Loja Fechada'}</span>
          </button>

          {/* Pilotos Online */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-[11px] font-bold">
            <Bike size={14} className="text-[#FF6B00]" />
            <span className="text-white/60">Guepardos:</span>
            <span className="text-[#FF6B00] font-black">{onlineCouriersCount} online</span>
            <span className="text-white/30 text-[10px]">/ {availableCouriers.length}</span>
          </div>

          {/* ALTERNADOR DE VISÃO: QUADROS (KANBAN) OU MAPA AO VIVO */}
          <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-0.5 shrink-0 shadow-inner">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                viewMode === 'kanban'
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#D35400] text-white shadow-[0_0_12px_rgba(255,107,0,0.5)]'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <ShoppingBag size={13} />
              <span>Quadros</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                viewMode === 'map'
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#D35400] text-white shadow-[0_0_12px_rgba(255,107,0,0.5)]'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <MapPin size={13} />
              <span>Mapa ao Vivo</span>
              {colInTransit.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>
          </div>

          {/* ALTERNADOR DE CAPINHA DE NÚMEROS GRANDES */}
          <button
            onClick={() => setShowOrderCover(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all shrink-0 shadow-sm ${
              showOrderCover
                ? 'bg-white/10 border-white/30 text-white hover:bg-white/20 shadow-[0_0_12px_rgba(255,255,255,0.1)]'
                : 'bg-black/50 border-white/10 text-white/40 hover:text-white/80'
            }`}
            title={showOrderCover ? "Capinha com números grandes ATIVA: passe o mouse para espiar ou clique para fixar o card aberto" : "Capinha de números DESATIVADA: clique para ativar"}
          >
            {showOrderCover ? <Eye size={13} className="text-[#FF6B00]" /> : <EyeOff size={13} />}
            <span className="hidden sm:inline">Capinha de Números</span>
            <span className={`w-1.5 h-1.5 rounded-full ${showOrderCover ? 'bg-[#FF6B00] shadow-[0_0_6px_#FF6B00]' : 'bg-white/20'}`} />
          </button>
        </div>

        {/* Lado Direito: Filtros, Busca & Botão + Chamar Guepardo */}
        <div className="flex items-center gap-2.5 flex-1 justify-end max-w-full">
          
          {/* Campo de Busca Rápida */}
          <div className="relative w-36 sm:w-48 md:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Buscar pedido, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filtro de Canal (iFood / 99 / Todos) */}
          <div className="hidden xl:flex items-center bg-black/50 border border-white/10 rounded-xl p-0.5 text-[10px] font-bold">
            <button
              onClick={() => setChannelFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${channelFilter === 'ALL' ? 'bg-[#FF6B00] text-white' : 'text-white/50 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setChannelFilter('IFOOD')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${channelFilter === 'IFOOD' ? 'bg-red-600 text-white' : 'text-white/50 hover:text-white'}`}
            >
              iFood
            </button>
            <button
              onClick={() => setChannelFilter('99FOOD')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${channelFilter === '99FOOD' ? 'bg-amber-500 text-black font-black' : 'text-white/50 hover:text-white'}`}
            >
              99Food
            </button>
            <button
              onClick={() => setChannelFilter('ANOTA_AI')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${channelFilter === 'ANOTA_AI' ? 'bg-[#7952DE] text-white font-black' : 'text-white/50 hover:text-white'}`}
            >
              Anota AI
            </button>
            <button
              onClick={() => setChannelFilter('DIRECT')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${channelFilter === 'DIRECT' ? 'bg-orange-600 text-white' : 'text-white/50 hover:text-white'}`}
            >
              Direto
            </button>
          </div>

          {/* BOTÃO DE TESTE ANOTA AI */}
          {onSimulateAnotaAiOrder && (
            <button
              onClick={onSimulateAnotaAiOrder}
              title="Gera um pedido de teste simulando a integração com o Anota AI (Sushi Hoi)"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#7952DE]/20 hover:bg-[#7952DE]/35 border border-[#7952DE]/50 text-[#c8b6ff] hover:text-white rounded-xl font-bold text-xs transition-all active:scale-95 shrink-0 shadow-sm hover:shadow-[0_0_15px_rgba(121,82,222,0.4)]"
            >
              <span className="text-sm">🍣</span>
              <span className="hidden sm:inline">Testar Anota AI</span>
              <span className="sm:hidden">Anota AI</span>
            </button>
          )}

          {/* BOTÃO DE TESTE 99FOOD */}
          {onSimulate99FoodOrder && (
            <button
              onClick={onSimulate99FoodOrder}
              title="Gera um pedido de teste simulando a integração com a 99Food"
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/50 text-amber-300 hover:text-white rounded-xl font-bold text-xs transition-all active:scale-95 shrink-0 shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
              <span className="text-sm">🟡</span>
              <span className="hidden sm:inline">Testar 99Food</span>
              <span className="sm:hidden">99Food</span>
            </button>
          )}

          {/* BOTÃO EM DESTAQUE: + CHAMAR GUEPARDO */}
          <button
            onClick={onNavigateToDispatch}
            className="flex items-center gap-2 px-3.5 md:px-4 py-2 bg-gradient-to-r from-[#FF6B00] to-[#E65100] hover:from-[#FF7B1A] hover:to-[#FF6B00] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,107,0,0.4)] hover:shadow-[0_0_25px_rgba(255,107,0,0.6)] transform active:scale-95 transition-all shrink-0"
          >
            <Plus size={16} strokeWidth={3} />
            <span className="hidden sm:inline">Chamar Guepardo</span>
            <span className="sm:hidden">Chamar</span>
          </button>
        </div>
      </div>

      {/* ─── CONTEÚDO PRINCIPAL: QUADROS OU MAPA AO VIVO ─────────────────── */}
      {viewMode === 'kanban' ? (
        /* ─── KANBAN BOARD (5 COLUNAS) ────────────────────────────────────────── */
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 md:p-5 flex gap-3 md:gap-4 scrollbar-guepardo">
        
        {/* ─── COLUNA 1: LOCALIZANDO ENTREGADOR ───────────────────────────────── */}
        <div className="flex-1 min-w-[270px] max-w-[340px] flex flex-col bg-[#120500]/70 rounded-2xl border border-orange-500/25 backdrop-blur-md shadow-xl overflow-hidden">
          {/* Header da Coluna */}
          <div className="p-3.5 bg-gradient-to-r from-orange-950/60 to-transparent border-b border-orange-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] animate-ping" />
              <h2 className="text-xs font-black uppercase tracking-wider text-[#FF6B00]">
                1. Localizando Entregador
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[11px] font-black">
              {colLocating.length}
            </span>
          </div>

          {/* Lista de Cards da Coluna 1 */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-guepardo">
            {colLocating.map(order => {
              const elapsedMin = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsedMin >= 3;
              const isExternalToAccept = (order.requestSource === 'IFOOD' || order.requestSource === '99FOOD' || order.requestSource === 'ANOTA_AI' || order.external_source) &&
                                        (order.status === OrderStatus.PENDING || order.rawStatus === 'created') && !order.acceptedAt;
              const isTestOrder = !!(
                order.external_order_id?.startsWith('99food-test-') ||
                order.external_order_id?.startsWith('anota-test-') ||
                order.clientName?.toUpperCase().includes('TESTE')
              );
              const isBatch = !!(order.isBatch && order.batchOrders && order.batchOrders.length > 1);
              const selected = isOrderSelected(order);

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className={`group relative bg-black/80 hover:bg-black border rounded-xl p-3.5 transition-all cursor-pointer shadow-lg hover:border-orange-500/80 overflow-hidden ${
                    selected
                      ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/50 bg-orange-950/20'
                      : isUrgent && isExternalToAccept
                        ? 'border-red-500/70 ring-1 ring-red-500/50'
                        : isBatch
                          ? 'border-orange-500/40 bg-orange-950/10'
                          : 'border-white/10 hover:border-orange-500/60'
                  }`}
                >
                  {/* Topo do Card: ID, Origem, Tempo */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => toggleSelectOrder(order, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded border-white/20 bg-black/60 text-[#FF6B00] checked:bg-[#FF6B00] focus:ring-0 cursor-pointer accent-[#FF6B00]"
                        title="Selecionar para agregar em lote"
                      />
                      <span className="text-sm font-black text-white group-hover:text-orange-400 transition-colors">
                        #{order.display_id || order.id.slice(-4)}
                      </span>
                      {isBatch ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm">
                          <Layers size={10} />
                          Lote ({order.batchOrders?.length})
                        </span>
                      ) : (
                        renderChannelBadge(order)
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {showOrderCover && unlockedOrderIds.has(order.id) && (
                        <button
                          onClick={(e) => toggleUnlockOrder(order.id, e)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white text-[9px] font-bold transition-all"
                          title="Recolocar capinha com número grande"
                        >
                          <Lock size={10} />
                          <span className="hidden sm:inline">Capinha</span>
                        </button>
                      )}
                      <div className={`flex items-center gap-1 text-[10px] font-bold ${isUrgent && isExternalToAccept ? 'text-red-400 font-black' : 'text-white/40'}`}>
                        <Clock size={11} className={isUrgent && isExternalToAccept ? 'animate-spin' : ''} />
                        <span>{formatElapsedTime(order.createdAt)}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancellingOrder(order);
                        }}
                        className="p-1 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-md transition-colors"
                        title="Cancelar pedido"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Nome do Cliente e Destino ou Roteiro Consolidado */}
                  {isBatch ? (
                    <div className="space-y-1.5 my-2">
                      <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <p className="text-[10px] font-black text-orange-300 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <Layers size={12} />
                          <span>Roteiro Consolidado ({order.batchOrders?.length} Entregas)</span>
                        </p>
                        <div className="space-y-1">
                          {order.batchOrders?.map((subOrder, idx) => (
                            <div key={subOrder.id} className="p-1.5 rounded bg-black/50 border border-white/5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-4 h-4 rounded-full bg-orange-500/30 text-orange-300 text-[9px] font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="truncate">
                                  <span className="font-bold text-white text-[11px] truncate">
                                    #{subOrder.display_id || subOrder.id.slice(-4)} • {subOrder.clientName || 'Cliente'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] text-white/50 shrink-0 ml-1">
                                R$ {(subOrder.deliveryValue || subOrder.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-white truncate mb-1">
                        {order.clientName || 'Cliente sem nome'}
                      </p>
                      <p className="text-[10px] text-white/50 truncate flex items-center gap-1 mb-2">
                        <MapPin size={10} className="shrink-0 text-white/30" />
                        <span>{order.destination}</span>
                      </p>
                    </>
                  )}

                  {/* Status / Localização de Entregador */}
                  <div className="my-2 p-2 bg-white/5 rounded-lg border border-white/5">
                    {isExternalToAccept ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          <span>Aguardando Aceite da Loja</span>
                        </div>
                        <button
                          onClick={(e) => handleQuickAccept(order, e)}
                          disabled={acceptingOrderId === order.id}
                          className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md hover:shadow-orange-500/40 flex items-center gap-1 active:scale-95 transition-all"
                        >
                          {acceptingOrderId === order.id ? (
                            <RefreshCw size={11} className="animate-spin" />
                          ) : (
                            <Check size={11} strokeWidth={3} />
                          )}
                          <span>Aceitar</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] text-[#FF6B00] font-bold">
                          <Radio size={12} className="animate-pulse text-[#FF6B00]" />
                          <span>Buscando Guepardo...</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignModalOrders(order.batchOrders || [order]);
                          }}
                          className="px-2.5 py-1 bg-gradient-to-r from-orange-600/30 to-[#FF6B00]/30 hover:from-orange-600 hover:to-[#FF6B00] text-orange-300 hover:text-black border border-orange-500/40 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                          title="Agregar este pedido a um Guepardo"
                        >
                          <Layers size={11} strokeWidth={2.5} />
                          <span>Agregar</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Valor e Ação Rápida */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="text-[11px] font-black text-white/70">
                      R$ {(order.deliveryValue || order.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                    </div>
                    {isExternalToAccept ? (
                      <button
                        onClick={(e) => handleQuickAccept(order, e)}
                        disabled={acceptingOrderId === order.id}
                        className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md hover:shadow-orange-500/40 flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        {acceptingOrderId === order.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} strokeWidth={3} />
                        )}
                        <span>Aceitar</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {isTestOrder && onSimulateAccept && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSimulateAccept(order.id);
                            }}
                            className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                            title="Simular que um motoboy aceitou a corrida (modo teste)"
                          >
                            <Bike size={11} />
                            <span>Simular Aceite</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignModalOrders(order.batchOrders || [order]);
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-[#FF6B00] hover:from-orange-500 hover:to-orange-400 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md hover:shadow-orange-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
                          title="Vincular a um Guepardo disponível ou em rota"
                        >
                          <Zap size={12} fill="currentColor" />
                          <span>Vincular Guepardo</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Capinha Translúcida com Número Grande */}
                  {renderOrderCover(
                    order,
                    isExternalToAccept ? 'Aguardando Aceite da Loja' : 'Localizando Entregador',
                    isExternalToAccept ? 'text-amber-300' : 'text-[#FF6B00]'
                  )}
                </div>
              );
            })}

            {colLocating.length === 0 && (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-white/20">
                <Radio size={32} className="mb-2 opacity-30 text-[#FF6B00]" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Radar Limpo</p>
                <p className="text-[9px] text-white/20 mt-1">Nenhum pedido aguardando entregador</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── COLUNA 2: EM PREPARO / BUSCANDO ──────────────────────────────── */}
        <div className="flex-1 min-w-[270px] max-w-[340px] flex flex-col bg-[#120500]/70 rounded-2xl border border-amber-500/20 backdrop-blur-md shadow-xl overflow-hidden">
          {/* Header da Coluna */}
          <div className="p-3.5 bg-gradient-to-r from-amber-950/60 to-transparent border-b border-amber-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">
                2. Em Preparo
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black">
              {colPrep.length}
            </span>
          </div>

          {/* Lista de Cards da Coluna 2 */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-guepardo">
            {colPrep.map(order => {
              const hasCourier = !!order.courier;
              const isBatch = !!(order.isBatch && order.batchOrders && order.batchOrders.length > 1);
              const selected = isOrderSelected(order);

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className={`group relative bg-black/80 hover:bg-black border rounded-xl p-3.5 transition-all cursor-pointer shadow-lg overflow-hidden ${
                    selected
                      ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/50 bg-orange-950/20'
                      : isBatch
                        ? 'border-amber-500/50 hover:border-amber-400 bg-amber-950/10'
                        : 'border-white/10 hover:border-amber-500/60'
                  }`}
                >
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => toggleSelectOrder(order, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded border-white/20 bg-black/60 text-[#FF6B00] checked:bg-[#FF6B00] focus:ring-0 cursor-pointer accent-[#FF6B00]"
                        title="Selecionar para agregar em lote"
                      />
                      <span className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                        #{order.display_id || order.id.slice(-4)}
                      </span>
                      {isBatch ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                          <Layers size={10} />
                          Lote ({order.batchOrders?.length})
                        </span>
                      ) : (
                        renderChannelBadge(order)
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {showOrderCover && unlockedOrderIds.has(order.id) && (
                        <button
                          onClick={(e) => toggleUnlockOrder(order.id, e)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white text-[9px] font-bold transition-all"
                          title="Recolocar capinha com número grande"
                        >
                          <Lock size={10} />
                          <span className="hidden sm:inline">Capinha</span>
                        </button>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold">
                        <Clock size={11} />
                        <span>{formatElapsedTime(order.createdAt)}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancellingOrder(order);
                        }}
                        className="p-1 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-md transition-colors"
                        title="Cancelar pedido"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Nome do Cliente ou Lista de Paradas do Lote */}
                  {isBatch ? (
                    <div className="space-y-1.5 my-2">
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[10px] font-black text-amber-300 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <Layers size={12} />
                          <span>Roteiro Consolidado ({order.batchOrders?.length} Entregas)</span>
                        </p>
                        <div className="space-y-1">
                          {order.batchOrders?.map((subOrder, idx) => (
                            <div key={subOrder.id} className="p-1.5 rounded bg-black/50 border border-white/5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 text-[9px] font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="truncate">
                                  <span className="font-bold text-white text-[11px] truncate">
                                    #{subOrder.display_id || subOrder.id.slice(-4)} • {subOrder.clientName || 'Cliente'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] text-white/50 shrink-0 ml-1">
                                R$ {(subOrder.deliveryValue || subOrder.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-white truncate mb-1">
                        {order.clientName || 'Cliente'}
                      </p>
                      <p className="text-[10px] text-white/50 truncate flex items-center gap-1 mb-2">
                        <MapPin size={10} className="shrink-0 text-white/30" />
                        <span>{order.destination}</span>
                      </p>
                    </>
                  )}

                  {/* Status do Entregador (Buscando vs A Caminho da Loja) */}
                  <div className="my-2 p-2 bg-white/5 rounded-lg border border-white/5">
                    {hasCourier ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] shrink-0 font-bold text-[10px]">
                            {order.courier?.name?.[0] || 'G'}
                          </div>
                          <div className="truncate">
                            <p className="text-[10px] font-black text-amber-300 truncate">
                              {order.courier?.name}
                            </p>
                            <p className="text-[9px] text-white/40">
                              {isBatch ? 'Piloto do Lote • A caminho' : 'A caminho da loja'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Balão de Conversa com o Entregador Guepardo (Recuperado) */}
                          <button
                            onClick={(e) => handleOpenChat(order, e)}
                            className="relative p-1.5 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-300 hover:text-white rounded-lg transition-all shadow-sm flex items-center gap-1 active:scale-95"
                            title={`Conversar no Chat com ${order.courier?.name || 'o entregador'}`}
                          >
                            <MessageSquare size={13} />
                            {getCourierUnreadCount(order.id) > 0 && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center animate-bounce shadow">
                                {getCourierUnreadCount(order.id)}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setAssignModalOrders(order.batchOrders || [order]); }}
                            className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-300 hover:text-white transition-colors"
                            title="Trocar ou agregar para outro Guepardo"
                          >
                            <ArrowLeftRight size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setTrackingOrder(order); }}
                            className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-300 hover:text-white transition-colors"
                            title="Ver Entregador no Mapa"
                          >
                            <MapPin size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-[#FF6B00] font-bold">
                          <Radio size={12} className="animate-pulse" />
                          <span>Buscando Guepardo...</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignModalOrders(order.batchOrders || [order]);
                          }}
                          className="px-2.5 py-1 bg-gradient-to-r from-orange-600/30 to-[#FF6B00]/30 hover:from-orange-600 hover:to-[#FF6B00] text-orange-300 hover:text-black border border-orange-500/40 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                          title="Agregar este pedido a um Guepardo"
                        >
                          <Layers size={11} strokeWidth={2.5} />
                          <span>Agregar</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Botão de Ação: Chat + Marcar como Pronto */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-white/40">
                      R$ {(order.deliveryValue || order.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleOpenChat(order, e)}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                        title={`Conversar com ${order.courier?.name || 'o entregador'}`}
                      >
                        <MessageSquare size={12} className="text-amber-400" />
                        <span>Chat</span>
                        {getCourierUnreadCount(order.id) > 0 && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (order.isBatch && order.batchOrders) {
                            order.batchOrders.forEach(o => onMarkAsReady(o.id));
                          } else {
                            onMarkAsReady(order.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 border border-amber-500/40 text-amber-300 hover:text-black rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                      >
                        <Check size={12} strokeWidth={2.5} />
                        <span>{isBatch ? 'Marcar Pronto (Lote)' : 'Marcar Pronto'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Capinha Translúcida com Número Grande */}
                  {renderOrderCover(
                    order,
                    order.courier?.name ? `Com ${order.courier.name}` : 'Em Preparo',
                    'text-amber-300'
                  )}
                </div>
              );
            })}

            {colPrep.length === 0 && (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-white/20">
                <Utensils size={32} className="mb-2 opacity-30" />
                <p className="text-[11px] font-bold uppercase tracking-wider">Cozinha livre</p>
                <p className="text-[9px] text-white/20 mt-1">Nenhum pedido em preparação</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── COLUNA 3: PRONTO / GUEPARDO NA LOJA ───────────────────────────── */}
        <div className="flex-1 min-w-[270px] max-w-[340px] flex flex-col bg-[#120500]/70 rounded-2xl border border-cyan-500/20 backdrop-blur-md shadow-xl overflow-hidden">
          {/* Header da Coluna */}
          <div className="p-3.5 bg-gradient-to-r from-cyan-950/60 to-transparent border-b border-cyan-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                3. Pronto / Na Loja
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-[11px] font-black">
              {colReady.length}
            </span>
          </div>

          {/* Lista de Cards da Coluna 3 */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-guepardo">
            {colReady.map(order => {
              const isDriverAtStore = order.status === OrderStatus.ARRIVED_AT_STORE;
              const isBatch = !!(order.isBatch && order.batchOrders && order.batchOrders.length > 1);
              const selected = isOrderSelected(order);

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className={`group relative bg-black/80 hover:bg-black border rounded-xl p-3.5 transition-all cursor-pointer shadow-lg overflow-hidden ${
                    selected
                      ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/50 bg-orange-950/20'
                      : isDriverAtStore 
                        ? 'border-cyan-400/80 ring-2 ring-cyan-500/30 bg-cyan-950/20' 
                        : isBatch
                          ? 'border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/10'
                          : 'border-white/10 hover:border-cyan-400/60'
                  }`}
                >
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => toggleSelectOrder(order, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded border-white/20 bg-black/60 text-[#FF6B00] checked:bg-[#FF6B00] focus:ring-0 cursor-pointer accent-[#FF6B00]"
                        title="Selecionar para agregar em lote"
                      />
                      <span className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                        #{order.display_id || order.id.slice(-4)}
                      </span>
                      {isBatch ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm">
                          <Layers size={10} />
                          Lote ({order.batchOrders?.length})
                        </span>
                      ) : (
                        renderChannelBadge(order)
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {showOrderCover && unlockedOrderIds.has(order.id) && (
                        <button
                          onClick={(e) => toggleUnlockOrder(order.id, e)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white text-[9px] font-bold transition-all"
                          title="Recolocar capinha com número grande"
                        >
                          <Lock size={10} />
                          <span className="hidden sm:inline">Capinha</span>
                        </button>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold">
                        <Clock size={11} />
                        <span>{formatElapsedTime(order.createdAt)}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancellingOrder(order);
                        }}
                        className="p-1 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-md transition-colors"
                        title="Cancelar pedido"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Nome do Cliente ou Lista de Paradas do Lote */}
                  {isBatch ? (
                    <div className="space-y-1.5 my-2">
                      <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <p className="text-[10px] font-black text-cyan-300 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <Layers size={12} />
                          <span>Roteiro de Retirada ({order.batchOrders?.length} Pedidos)</span>
                        </p>
                        <div className="space-y-1">
                          {order.batchOrders?.map((subOrder, idx) => (
                            <div key={subOrder.id} className="p-1.5 rounded bg-black/50 border border-white/5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-300 text-[9px] font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="truncate">
                                  <span className="font-bold text-white text-[11px] truncate">
                                    #{subOrder.display_id || subOrder.id.slice(-4)} • {subOrder.clientName || 'Cliente'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] text-cyan-200/70 shrink-0 ml-1">
                                R$ {(subOrder.deliveryValue || subOrder.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-white truncate mb-1">
                        {order.clientName || 'Cliente'}
                      </p>
                      <p className="text-[10px] text-white/50 truncate flex items-center gap-1 mb-2">
                        <MapPin size={10} className="shrink-0 text-white/30" />
                        <span>{order.destination}</span>
                      </p>
                    </>
                  )}

                  {/* Destaque: Guepardo Chegou na Loja vs Status de Entrega */}
                  {isDriverAtStore ? (
                    <div className="my-2 p-2 bg-cyan-500/20 border border-cyan-400/50 rounded-lg flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-2 truncate">
                        <Bike size={16} className="text-cyan-300 shrink-0" />
                        <span className="text-[10px] font-black text-cyan-200 uppercase truncate">
                          {order.courier?.name || 'Guepardo'} CHEGOU NO BALCÃO!
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Balão de Conversa com o Entregador Guepardo (Recuperado) */}
                        <button
                          onClick={(e) => handleOpenChat(order, e)}
                          className="relative p-1.5 bg-cyan-500/30 hover:bg-cyan-500/50 border border-cyan-400/50 text-cyan-200 hover:text-white rounded-lg transition-all shadow-sm flex items-center gap-1 active:scale-95"
                          title={`Conversar no Chat com ${order.courier?.name || 'o entregador'}`}
                        >
                          <MessageSquare size={13} />
                          {getCourierUnreadCount(order.id) > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center animate-bounce shadow">
                              {getCourierUnreadCount(order.id)}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setAssignModalOrders(order.batchOrders || [order]); }}
                          className="p-1 hover:bg-cyan-500/30 rounded text-cyan-200 hover:text-white transition-colors shrink-0"
                          title="Trocar ou agregar para outro Guepardo"
                        >
                          <ArrowLeftRight size={13} />
                        </button>
                      </div>
                    </div>
                  ) : order.courier ? (
                    <div className="my-2 p-2 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 shrink-0 font-bold text-[10px]">
                          {order.courier?.name?.[0] || 'G'}
                        </div>
                        <div className="truncate">
                          <p className="text-[10px] font-black text-cyan-300 truncate">
                            {order.courier?.name}
                          </p>
                          <p className="text-[9px] text-white/40">
                            {isBatch ? 'Piloto do Lote • A caminho da retirada' : 'Pronto • A caminho da retirada'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Balão de Conversa com o Entregador Guepardo (Recuperado) */}
                        <button
                          onClick={(e) => handleOpenChat(order, e)}
                          className="relative p-1.5 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-lg transition-all shadow-sm flex items-center gap-1 active:scale-95"
                          title={`Conversar no Chat com ${order.courier?.name || 'o entregador'}`}
                        >
                          <MessageSquare size={13} />
                          {getCourierUnreadCount(order.id) > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center animate-bounce shadow">
                              {getCourierUnreadCount(order.id)}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setAssignModalOrders(order.batchOrders || [order]); }}
                          className="p-1.5 hover:bg-cyan-500/20 rounded-lg text-cyan-300 hover:text-white transition-colors"
                          title="Trocar ou agregar para outro Guepardo"
                        >
                          <ArrowLeftRight size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setTrackingOrder(order); }}
                          className="p-1.5 hover:bg-cyan-500/20 rounded-lg text-cyan-300 hover:text-white transition-colors"
                          title="Ver Entregador no Mapa"
                        >
                          <MapPin size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="my-2 p-2 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-[#FF6B00] font-bold">
                        <Radio size={12} className="animate-pulse" />
                        <span>Pronto • Buscando Guepardo...</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssignModalOrders(order.batchOrders || [order]);
                        }}
                        className="px-2.5 py-1 bg-gradient-to-r from-orange-600/30 to-[#FF6B00]/30 hover:from-orange-600 hover:to-[#FF6B00] text-orange-300 hover:text-black border border-orange-500/40 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                        title="Agregar este pedido a um Guepardo"
                      >
                        <Layers size={11} strokeWidth={2.5} />
                        <span>Agregar</span>
                      </button>
                    </div>
                  )}

                  {/* Botão de Ação: Chat + Validar Código de Coleta */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-white/40">
                      R$ {(order.deliveryValue || order.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {order.courier && (
                        <button
                          onClick={(e) => handleOpenChat(order, e)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                          title={`Conversar com ${order.courier?.name || 'o entregador'}`}
                        >
                          <MessageSquare size={12} className="text-cyan-400" />
                          <span>Chat</span>
                          {getCourierUnreadCount(order.id) > 0 && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setValidatingOrder(order);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:shadow-cyan-500/30 active:scale-95 transition-all"
                      >
                        <ShieldCheck size={13} strokeWidth={2.5} />
                        <span>{isBatch ? 'Liberar Coleta (Lote)' : 'Liberar Coleta'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Capinha Translúcida com Número Grande */}
                  {renderOrderCover(
                    order,
                    isDriverAtStore ? 'Guepardo no Balcão' : 'Pronto para Coleta',
                    'text-cyan-300'
                  )}
                </div>
              );
            })}

            {colReady.length === 0 && (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-white/20">
                <ShieldCheck size={32} className="mb-2 opacity-30" />
                <p className="text-[11px] font-bold uppercase tracking-wider">Balcão liberado</p>
                <p className="text-[9px] text-white/20 mt-1">Nenhum pedido aguardando retirada</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── COLUNA 4: EM ROTA ────────────────────────────────────────────── */}
        <div className="flex-1 min-w-[270px] max-w-[340px] flex flex-col bg-[#120500]/70 rounded-2xl border border-emerald-500/20 backdrop-blur-md shadow-xl overflow-hidden">
          {/* Header da Coluna */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-950/60 to-transparent border-b border-emerald-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                4. Em Rota
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-black">
              {colInTransit.length}
            </span>
          </div>

          {/* Lista de Cards da Coluna 4 */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-guepardo">
            {colInTransit.map(order => {
              const isReturning = order.status === OrderStatus.RETURNING;
              const isBatch = !!(order.isBatch && order.batchOrders && order.batchOrders.length > 1);

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className={`group relative bg-black/80 hover:bg-black border rounded-xl p-3.5 transition-all cursor-pointer shadow-lg overflow-hidden ${
                    isBatch
                      ? 'border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/10'
                      : 'border border-white/10 hover:border-emerald-500/60'
                  }`}
                >
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                        #{order.display_id || order.id.slice(-4)}
                      </span>
                      {isBatch ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                          <Layers size={10} />
                          Lote ({order.batchOrders?.length})
                        </span>
                      ) : (
                        renderChannelBadge(order)
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {showOrderCover && unlockedOrderIds.has(order.id) && (
                        <button
                          onClick={(e) => toggleUnlockOrder(order.id, e)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white text-[9px] font-bold transition-all"
                          title="Recolocar capinha com número grande"
                        >
                          <Lock size={10} />
                          <span className="hidden sm:inline">Capinha</span>
                        </button>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                        <Navigation size={11} className="animate-spin" />
                        <span>{isReturning ? 'Retornando' : 'A caminho'}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancellingOrder(order);
                        }}
                        className="p-1 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-md transition-colors"
                        title="Cancelar pedido"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Nome do Cliente ou Lista de Paradas */}
                  {isBatch ? (
                    <div className="space-y-1.5 my-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <Layers size={12} />
                          <span>Roteiro em Andamento ({order.batchOrders?.length} Paradas)</span>
                        </p>
                        <div className="space-y-1.5">
                          {order.batchOrders?.map((subOrder, idx) => (
                            <div key={subOrder.id} className="p-2 rounded bg-black/60 border border-white/5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 truncate min-w-0">
                                <span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 text-[9px] font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="truncate">
                                  <p className="font-bold text-white text-[11px] truncate">
                                    #{subOrder.display_id || subOrder.id.slice(-4)} • {subOrder.clientName || 'Cliente'}
                                  </p>
                                  <p className="text-[9px] text-white/40 truncate flex items-center gap-1">
                                    <MapPin size={9} className="shrink-0 text-white/30" />
                                    <span>{subOrder.destination}</span>
                                  </p>
                                </div>
                              </div>
                              {subOrder.clientPhone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const phone = subOrder.clientPhone?.replace(/\D/g, '');
                                    const msg = `Olá ${subOrder.clientName}, seu pedido #${subOrder.display_id || subOrder.id.slice(-4)} já está a caminho!`;
                                    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                  }}
                                  className="p-1 hover:bg-emerald-600/30 rounded text-emerald-400 hover:text-emerald-300 transition-colors shrink-0 ml-1.5"
                                  title="WhatsApp do Cliente"
                                >
                                  <Phone size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-white truncate mb-1">
                        {order.clientName || 'Cliente'}
                      </p>
                      <p className="text-[10px] text-white/50 truncate flex items-center gap-1 mb-2">
                        <MapPin size={10} className="shrink-0 text-white/30" />
                        <span>{order.destination}</span>
                      </p>
                    </>
                  )}

                  {/* Detalhes do Piloto em Rota */}
                  <div className="my-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bike size={14} className="text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <p className="text-[10px] font-bold text-white truncate">
                          {order.courier?.name || 'Guepardo'}
                        </p>
                        <p className="text-[8px] text-white/40 uppercase">
                          {order.courier?.vehiclePlate || 'Moto'}
                        </p>
                      </div>
                    </div>

                    {/* Ações Rápidas: Chat, Trocar/Agregar, Mapa e Zap */}
                    <div className="flex items-center gap-1.5">
                      {/* Balão de Conversa com o Entregador Guepardo (Recuperado) */}
                      <button
                        onClick={(e) => handleOpenChat(order, e)}
                        className="relative p-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-lg transition-all shadow-sm flex items-center gap-1 active:scale-95"
                        title={`Conversar no Chat com ${order.courier?.name || 'o entregador'}`}
                      >
                        <MessageSquare size={13} />
                        {getCourierUnreadCount(order.id) > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center animate-bounce shadow">
                            {getCourierUnreadCount(order.id)}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setAssignModalOrders(order.batchOrders || [order]); }}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-400 hover:text-white transition-colors"
                        title="Trocar ou agregar para outro Guepardo"
                      >
                        <ArrowLeftRight size={13} />
                      </button>
                      {!isBatch && order.clientPhone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const phone = order.clientPhone?.replace(/\D/g, '');
                            const msg = `Olá ${order.clientName}, seu pedido #${order.display_id || order.id.slice(-4)} já está a caminho!`;
                            window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="p-1.5 hover:bg-emerald-600/30 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="WhatsApp do Cliente"
                        >
                          <Phone size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rodapé: Ação de Chat, Rastreio ao Vivo ou Confirmar Retorno */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-white/40">
                      R$ {(order.deliveryValue || order.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleOpenChat(order, e)}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                        title={`Conversar com ${order.courier?.name || 'o entregador'}`}
                      >
                        <MessageSquare size={12} className="text-emerald-400" />
                        <span>Chat</span>
                        {getCourierUnreadCount(order.id) > 0 && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                      </button>

                      {isReturning ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onConfirmReturn(order.id);
                          }}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider"
                        >
                          Confirmar Retorno
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTrackingOrder(order);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                          <MapPin size={12} />
                          <span>{isBatch ? 'Ver Rastreio (Lote)' : 'Ver Rastreio'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Capinha Translúcida com Número Grande */}
                  {renderOrderCover(
                    order,
                    isReturning ? 'Retornando à Loja' : 'Em Rota de Entrega',
                    'text-emerald-300'
                  )}
                </div>
              );
            })}

            {colInTransit.length === 0 && (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-white/20">
                <Navigation size={32} className="mb-2 opacity-30" />
                <p className="text-[11px] font-bold uppercase tracking-wider">Sem entregas na rua</p>
                <p className="text-[9px] text-white/20 mt-1">Nenhum motoboy em trânsito</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── COLUNA 5: FINALIZADOS ────────────────────────────────────────── */}
        <div className="flex-1 min-w-[270px] max-w-[340px] flex flex-col bg-[#120500]/70 rounded-2xl border border-white/10 backdrop-blur-md shadow-xl overflow-hidden">
          {/* Header da Coluna */}
          <div className="p-3.5 bg-gradient-to-r from-white/5 to-transparent border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white/60">
                5. Finalizados
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/70 text-[11px] font-black">
              {colDelivered.length}
            </span>
          </div>

          {/* Lista de Cards da Coluna 5 */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-guepardo">
            {colDelivered.map(order => (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="group relative bg-black/60 hover:bg-black/90 border border-white/5 hover:border-white/20 rounded-xl p-3 transition-all cursor-pointer opacity-80 hover:opacity-100 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white/90">
                      #{order.display_id || order.id.slice(-4)}
                    </span>
                    {renderChannelBadge(order)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {showOrderCover && unlockedOrderIds.has(order.id) && (
                      <button
                        onClick={(e) => toggleUnlockOrder(order.id, e)}
                        className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                        title="Recolocar capinha"
                      >
                        <Lock size={9} />
                      </button>
                    )}
                    <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={10} /> Entregue
                    </span>
                  </div>
                </div>

                <p className="text-[11px] font-bold text-white/80 truncate mb-1">
                  {order.clientName || 'Cliente'}
                </p>

                <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[10px] text-white/50">
                  <span>{order.courier?.name || 'Entregador'}</span>
                  <span className="font-bold text-white/80">
                    R$ {(order.deliveryValue || order.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {/* Capinha Translúcida com Número Grande (Modo Compacto) */}
                {renderOrderCover(order, 'Entregue', 'text-emerald-300', true)}
              </div>
            ))}

            {colDelivered.length === 0 && (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-white/20">
                <Clock size={32} className="mb-2 opacity-30" />
                <p className="text-[11px] font-bold uppercase tracking-wider">Ainda nenhum</p>
                <p className="text-[9px] text-white/20 mt-1">Os pedidos entregues aparecerão aqui</p>
              </div>
            )}
          </div>
        </div>

      </div>
      ) : (
        /* ─── MAPA AO VIVO GERAL DA CIDADE ─────────────────────────────────── */
        <div className="flex-1 relative w-full h-full overflow-hidden flex">
          {/* Mapa Interativo em Tela Cheia */}
          <div className="flex-1 h-full w-full relative z-0">
            <LeafletMap
              orders={activeOrdersForMap}
              activeOrder={mapSelectedOrder}
              storeProfile={storeProfile}
              couriers={availableCouriers}
              theme="dark"
              mapboxToken={mapboxToken}
              onCardClick={(order) => setMapSelectedOrder(order)}
            />
          </div>

          {/* Drawer Lateral Flutuante com Entregas Ativas */}
          <div className="absolute top-4 left-4 z-[400] w-72 sm:w-80 max-h-[calc(100%-32px)] bg-[#120500]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col pointer-events-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <Bike size={16} className="text-[#FF6B00]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Entregas Ativas ({activeOrdersForMap.length})
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">
                {onlineCouriersCount} online
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-guepardo">
              {activeOrdersForMap.map(order => {
                const isSelected = mapSelectedOrder?.id === order.id;
                const hasCourier = !!order.courier;

                return (
                  <div
                    key={order.id}
                    onClick={() => setMapSelectedOrder(order)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#FF6B00]/20 border-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.3)]' 
                        : 'bg-black/60 hover:bg-black/90 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-white">
                        #{order.display_id || order.id.slice(-4)}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        order.status === OrderStatus.IN_TRANSIT ? 'bg-emerald-500/20 text-emerald-300' :
                        order.status === OrderStatus.ARRIVED_AT_STORE ? 'bg-cyan-500/20 text-cyan-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {order.status === OrderStatus.IN_TRANSIT ? 'Em Rota' :
                         order.status === OrderStatus.ARRIVED_AT_STORE ? 'Na Loja' : 'Em Preparo'}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold text-white/90 truncate">
                      {order.clientName}
                    </p>
                    <p className="text-[10px] text-white/40 truncate">
                      {order.destination}
                    </p>

                    {hasCourier && (
                      <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                        <span className="text-amber-300 font-bold truncate">
                          🏍️ {order.courier?.name}
                        </span>
                        <span className="text-white/40">
                          {order.courier?.vehiclePlate}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {activeOrdersForMap.length === 0 && (
                <div className="text-center py-10 text-white/30 text-xs">
                  Nenhuma entrega ativa no momento.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE RASTREIO AO VIVO (1-CLIQUE NO CARD) ─────────────────── */}
      {trackingOrder && (
        <div 
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
          onClick={() => setTrackingOrder(null)}
        >
          <div 
            className="w-full max-w-4xl bg-[#120500] border border-white/20 rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="p-4 bg-gradient-to-r from-[#1A0900] via-[#120500] to-black border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-sm">
                  <Navigation size={20} className="animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black italic text-white uppercase tracking-tight">
                      Rastreio ao Vivo #{trackingOrder.display_id || trackingOrder.id.slice(-4)}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {trackingOrder.status === OrderStatus.IN_TRANSIT ? 'Em Rota' : trackingOrder.status === OrderStatus.RETURNING ? 'Retornando' : 'A Caminho'}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 truncate max-w-md">
                    Destino: {trackingOrder.clientName} • {trackingOrder.destination}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTrackingOrder(null)}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-header com Entregador & Ações */}
            <div className="px-4 py-2.5 bg-black/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] font-black text-xs">
                  {trackingOrder.courier?.name?.[0] || 'G'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">{trackingOrder.courier?.name || 'Guepardo'}</span>
                    <span className="text-[9px] text-white/40 uppercase font-bold px-1.5 py-0.5 bg-white/5 rounded">
                      {trackingOrder.courier?.vehiclePlate || 'Moto'}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-bold">GPS ativo transmitindo em tempo real</p>
                </div>
              </div>

              {/* Botões Rápidos */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setChatOrder(trackingOrder);
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <MessageSquare size={14} />
                  <span>Chat com Piloto</span>
                </button>
                {trackingOrder.clientPhone && (
                  <button
                    onClick={() => {
                      const phone = trackingOrder.clientPhone?.replace(/\D/g, '');
                      const msg = `Olá ${trackingOrder.clientName}, acompanhe seu pedido #${trackingOrder.display_id || trackingOrder.id.slice(-4)} em tempo real!`;
                      window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Phone size={14} />
                    <span>WhatsApp Cliente</span>
                  </button>
                )}
              </div>
            </div>

            {/* Container do Mapa */}
            <div className="flex-1 min-h-[420px] md:min-h-[500px] relative w-full bg-black">
              <LeafletMap
                orders={[trackingOrder]}
                activeOrder={trackingOrder}
                storeProfile={storeProfile}
                couriers={availableCouriers}
                theme="dark"
                mapboxToken={mapboxToken}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── BARRA FLUTUANTE DE AÇÃO EM LOTE (AGREGAR PEDIDOS) ─────────────── */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-[#1A0900]/98 via-[#140600]/98 to-[#0A0400]/98 border border-[#FF6B00]/60 shadow-[0_15px_50px_rgba(0,0,0,0.9)] rounded-2xl px-5 py-3.5 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-2xl ring-2 ring-[#FF6B00]/20">
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/20 border border-[#FF6B00]/40 flex items-center justify-center text-[#FF6B00] shadow-[0_0_12px_rgba(255,107,0,0.4)]">
              <Layers size={18} strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider block text-white">
                {selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'Pedido Selecionado' : 'Pedidos Selecionados'}
              </span>
              <span className="text-[10px] text-white/50">
                Agregue para o mesmo piloto em rota ou piloto livre
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
              setAssignModalOrders(selectedOrders);
            }}
            className="px-4 py-2 bg-gradient-to-r from-[#FF6B00] to-[#D35400] hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#FF6B00]/40 active:scale-95 transition-all"
          >
            <Bike size={15} strokeWidth={2.5} />
            <span>Agregar a um Guepardo</span>
          </button>
          <button
            onClick={() => setSelectedOrderIds([])}
            className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-colors"
            title="Limpar seleção"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── MODAL DE AGREGAÇÃO / ATRIBUIÇÃO PARA GUEPARDO ────────────────── */}
      {assignModalOrders && (
        <div 
          className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => !isAssigning && setAssignModalOrders(null)}
        >
          <div 
            className="w-full max-w-xl max-h-[90vh] bg-gradient-to-b from-[#180800] via-[#120500] to-[#0D0400] border border-[#FF6B00]/40 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FF6B00]/20 border border-[#FF6B00]/40 flex items-center justify-center text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.3)]">
                  <Layers size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                    {assignModalOrders.length === 1 
                      ? `Agregar Pedido #${assignModalOrders[0].display_id || assignModalOrders[0].id.slice(-4)}`
                      : `Agregar ${assignModalOrders.length} Pedidos em Lote`
                    }
                  </h3>
                  <p className="text-[10px] text-white/50">
                    Selecione o Guepardo para despachar direto ou agrupar na mesma rota
                  </p>
                </div>
              </div>
              <button
                disabled={isAssigning}
                onClick={() => setAssignModalOrders(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Resumo dos Pedidos a Agregar */}
            <div className="px-4 md:px-5 py-3 bg-black/60 border-b border-white/5 flex flex-wrap gap-2 items-center shrink-0 max-h-28 overflow-y-auto">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                Pedidos:
              </span>
              {assignModalOrders.map(ord => (
                <div key={ord.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                  <span className="font-black text-[#FF6B00]">#{ord.display_id || ord.id.slice(-4)}</span>
                  <span className="text-white/70 truncate max-w-[120px]">{ord.clientName}</span>
                  <span className="text-white/40 text-[10px]">R$ {(ord.deliveryValue || ord.estimatedPrice || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
            </div>

            {/* Busca Rápida de Entregadores */}
            <div className="p-3 md:p-4 border-b border-white/5 shrink-0 bg-black/20">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Filtrar Guepardo por nome ou placa..."
                  value={courierSearchTerm}
                  onChange={(e) => setCourierSearchTerm(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#FF6B00] outline-none transition-all"
                />
              </div>
            </div>

            {/* Lista de Entregadores */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 scrollbar-guepardo">
              {/* SEÇÃO 1: PILOTOS COM ENTREGAS ATIVAS (AGREGAÇÃO DE ROTA) */}
              {activeCouriersFiltered.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                      ⚡ Pilotos com Entregas Ativas (Agregação de Rota)
                    </h4>
                  </div>
                  <p className="text-[10px] text-white/40 mb-2.5">
                    Agregar ao mesmo Guepardo unifica a rota e gera economia de frete para a loja.
                  </p>
                  <div className="space-y-2">
                    {activeCouriersFiltered.map(({ courier, activeOrders }) => {
                      const isFixed = storeProfile?.active_fixed_drivers?.includes(courier.id);
                      const isHybrid = storeProfile?.active_hybrid_drivers?.includes(courier.id);

                      return (
                        <div
                          key={courier.id}
                          className="bg-black/60 hover:bg-black/90 border border-amber-500/30 hover:border-amber-400 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all shadow-md group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={courier.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                                alt={courier.name}
                                className="w-11 h-11 rounded-xl object-cover border border-amber-500/40"
                              />
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-white truncate">{courier.name}</span>
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-black/60 border border-white/10 text-white/60">
                                  {courier.vehiclePlate}
                                </span>
                                {isFixed && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">★ Fixo</span>}
                                {isHybrid && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">★ Híbrido</span>}
                              </div>
                              <p className="text-[10px] text-amber-400 font-bold mt-0.5 truncate">
                                ⚡ {activeOrders.length} {activeOrders.length === 1 ? 'pedido em andamento' : 'pedidos em andamento'} (#{activeOrders.map(o => o.display_id || o.id.slice(-4)).join(', #')})
                              </p>
                            </div>
                          </div>

                          <button
                            disabled={isAssigning}
                            onClick={() => handleAssignToCourier(assignModalOrders.map(o => o.id), courier.id)}
                            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-[#FF6B00] hover:brightness-110 disabled:opacity-50 text-black font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0"
                          >
                            {isAssigning ? <RefreshCw size={12} className="animate-spin" /> : <Layers size={12} strokeWidth={2.5} />}
                            <span>Agregar Aqui</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SEÇÃO 2: PILOTOS LIVRES (ONLINE) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                    🟢 Pilotos Disponíveis (Online e Livres)
                  </h4>
                </div>
                <div className="space-y-2">
                  {freeCouriersFiltered.map(courier => {
                    const isFixed = storeProfile?.active_fixed_drivers?.includes(courier.id);
                    const isHybrid = storeProfile?.active_hybrid_drivers?.includes(courier.id);

                    return (
                      <div
                        key={courier.id}
                        className="bg-black/40 hover:bg-black/70 border border-white/10 hover:border-emerald-500/50 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={courier.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                              alt={courier.name}
                              className="w-10 h-10 rounded-xl object-cover border border-white/10"
                            />
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border border-black" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-white truncate">{courier.name}</span>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-black/60 border border-white/10 text-white/50">
                                {courier.vehiclePlate}
                              </span>
                              {isFixed && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">★ Fixo</span>}
                              {isHybrid && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">★ Híbrido</span>}
                            </div>
                            <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                              Disponível para nova rota
                            </p>
                          </div>
                        </div>

                        <button
                          disabled={isAssigning}
                          onClick={() => handleAssignToCourier(assignModalOrders.map(o => o.id), courier.id)}
                          className="px-3.5 py-2 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 disabled:opacity-50 font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
                        >
                          {isAssigning ? <RefreshCw size={12} className="animate-spin" /> : <Bike size={12} strokeWidth={2.5} />}
                          <span>Atribuir Pedido</span>
                        </button>
                      </div>
                    );
                  })}

                  {freeCouriersFiltered.length === 0 && activeCouriersFiltered.length === 0 && (
                    <div className="text-center py-8 text-white/30">
                      <p className="text-xs font-bold uppercase">Nenhum Guepardo online no momento</p>
                      <p className="text-[10px] mt-1 text-white/20">Aguarde os entregadores ficarem online no aplicativo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAIS EMBUTIDOS DO GESTOR --- */}
      {validatingOrder && (
        <PickupValidationModal
          order={validatingOrder}
          onClose={() => setValidatingOrder(null)}
          onSuccess={() => {
            if (validatingOrder.isBatch && validatingOrder.batchOrders && validatingOrder.batchOrders.length > 0) {
              validatingOrder.batchOrders.forEach(o => onValidatePickup(o.id));
            } else {
              onValidatePickup(validatingOrder.id);
            }
            setValidatingOrder(null);
          }}
        />
      )}

      {chatOrder && (
        <ChatMultilateralModal
          order={chatOrder}
          onClose={() => setChatOrder(null)}
          theme="dark"
          unreadMessages={unreadMessages[chatOrder.id] || {}}
          setUnreadMessages={() => {}}
        />
      )}

      {cancellingOrder && (
        <CancellationModal
          order={cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          onConfirm={(orderId, reason) => {
            if (cancellingOrder.isBatch && cancellingOrder.batchOrders) {
              cancellingOrder.batchOrders.forEach(o => onCancelOrder(o.id, reason));
            } else {
              onCancelOrder(orderId, reason);
            }
            setCancellingOrder(null);
          }}
        />
      )}
    </div>
  );
};
