import React, { useState, useMemo, useEffect } from 'react';
import { 
  Order, OrderStatus, Courier, StoreProfile, Customer, StoreSettings, ChatRoomType 
} from '../types';
import { 
  Bike, Clock, AlertTriangle, CheckCircle2, MessageSquare, MapPin, Search, Phone, 
  ExternalLink, ShoppingBag, Radio, ArrowRight, User, ShieldCheck, Flame, ChevronRight, 
  RefreshCw, X, Eye, Check, Send, Sparkles, Navigation, Layers, Plus, DollarSign,
  Store, Bell, QrCode, CreditCard, Banknote, HelpCircle, Utensils
} from 'lucide-react';
import { PickupValidationModal } from './PickupValidationModal';
import { ChatMultilateralModal } from './ChatMultilateralModal';

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
  onMarkAsReady: (orderId: string) => void;
  onValidatePickup: (orderId: string) => void;
  onCancelOrder: (orderId: string, reason: string) => void;
  onConfirmReturn: (orderId: string) => void;
  onSimulateAccept?: (orderId: string) => void;
  onNavigateToDispatch: () => void;
  onToggleStatus?: (newStatus: 'aberta' | 'fechada') => void;
  onOpenChat?: (order: Order) => void;
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
  onMarkAsReady,
  onValidatePickup,
  onCancelOrder,
  onConfirmReturn,
  onSimulateAccept,
  onNavigateToDispatch,
  onToggleStatus,
  onOpenChat,
}) => {
  // Filtros de UI
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'IFOOD' | '99FOOD' | 'DIRECT' | 'WHATSAPP'>('ALL');
  const [now, setNow] = useState(Date.now());
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [validatingOrder, setValidatingOrder] = useState<Order | null>(null);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);

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

  // Filtro de busca e canal
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Filtro de canal
      if (channelFilter === 'IFOOD' && order.requestSource !== 'IFOOD' && order.external_source !== 'IFOOD') return false;
      if (channelFilter === '99FOOD' && order.requestSource !== '99FOOD' && order.external_source !== '99FOOD') return false;
      if (channelFilter === 'WHATSAPP' && order.requestSource !== 'WHATSAPP') return false;
      if (channelFilter === 'DIRECT' && (order.requestSource === 'IFOOD' || order.requestSource === '99FOOD')) return false;

      // Filtro de busca por texto
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const clientNameMatch = order.clientName?.toLowerCase().includes(term);
        const displayIdMatch = order.display_id?.toLowerCase().includes(term);
        const idMatch = order.id.toLowerCase().includes(term);
        const phoneMatch = order.clientPhone?.includes(term);
        const addressMatch = order.destination?.toLowerCase().includes(term);
        if (!clientNameMatch && !displayIdMatch && !idMatch && !phoneMatch && !addressMatch) {
          return false;
        }
      }
      return true;
    });
  }, [orders, channelFilter, searchTerm]);

  // ─── 5 COLUNAS DA JORNADA OPERACIONAL ──────────────────────────────────────

  // 1. Coluna ACEITAR: Pedidos pendentes de confirmação (ex: iFood / 99 / WhatsApp pendentes de aceite do lojista)
  const colAccept = useMemo(() => {
    return filteredOrders.filter(o => {
      const isExternalPending = (o.requestSource === 'IFOOD' || o.requestSource === '99FOOD' || o.external_source) &&
                                o.status === OrderStatus.PENDING && !o.acceptedAt;
      return isExternalPending;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredOrders]);

  // 2. Coluna EM PREPARO / BUSCANDO: Cozinha preparando, aguardando ou motoboy a caminho da loja
  const colPrep = useMemo(() => {
    return filteredOrders.filter(o => {
      // Ignorar se estiver aguardando aceite na Coluna 1
      const isExternalPending = (o.requestSource === 'IFOOD' || o.requestSource === '99FOOD' || o.external_source) &&
                                o.status === OrderStatus.PENDING && !o.acceptedAt;
      if (isExternalPending) return false;

      return (
        o.status === OrderStatus.PENDING ||
        o.status === OrderStatus.SCHEDULED ||
        o.status === OrderStatus.ACCEPTED ||
        o.status === OrderStatus.TO_STORE
      );
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [filteredOrders]);

  // 3. Coluna PRONTO / GUEPARDO NA LOJA: Pedido embalado ou motoboy já no balcão aguardando entrega
  const colReady = useMemo(() => {
    return filteredOrders.filter(o => {
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
  }, [filteredOrders]);

  // 4. Coluna EM ROTA: Motoboy em trânsito com a entrega até o cliente (ou retornando)
  const colInTransit = useMemo(() => {
    return filteredOrders.filter(o => {
      return o.status === OrderStatus.IN_TRANSIT || o.status === OrderStatus.RETURNING;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredOrders]);

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

  // Manipulador de Aceite Rápido
  const handleQuickAccept = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcceptingOrderId(order.id);
    try {
      if (order.requestSource === 'IFOOD' || order.external_source === 'IFOOD') {
        if (onAcceptIFoodOrder) await onAcceptIFoodOrder(order.id);
      } else if (order.requestSource === '99FOOD' || order.external_source === '99FOOD') {
        if (onAccept99FoodOrder) await onAccept99FoodOrder(order.id);
      }
    } catch (err) {
      console.error('Erro ao aceitar pedido:', err);
    } finally {
      setAcceptingOrderId(null);
    }
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
              onClick={() => setChannelFilter('DIRECT')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${channelFilter === 'DIRECT' ? 'bg-orange-600 text-white' : 'text-white/50 hover:text-white'}`}
            >
              Direto
            </button>
          </div>

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

      {/* ─── KANBAN BOARD (5 COLUNAS) ────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 md:p-5 flex gap-3 md:gap-4 scrollbar-guepardo">
        
        {/* ─── COLUNA 1: ACEITAR ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-[270px] max-w-[340px] flex flex-col bg-[#120500]/70 rounded-2xl border border-red-500/20 backdrop-blur-md shadow-xl overflow-hidden">
          {/* Header da Coluna */}
          <div className="p-3.5 bg-gradient-to-r from-red-950/60 to-transparent border-b border-red-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h2 className="text-xs font-black uppercase tracking-wider text-red-400">
                1. Aceitar
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[11px] font-black">
              {colAccept.length}
            </span>
          </div>

          {/* Lista de Cards da Coluna 1 */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-guepardo">
            {colAccept.map(order => {
              const elapsedMin = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsedMin >= 3;

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className={`group relative bg-black/80 hover:bg-black border rounded-xl p-3.5 transition-all cursor-pointer shadow-lg hover:border-red-500/80 ${
                    isUrgent ? 'border-red-500/70 ring-1 ring-red-500/50' : 'border-white/10'
                  }`}
                >
                  {/* Topo do Card: ID, Origem, Tempo */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white group-hover:text-red-400 transition-colors">
                        #{order.display_id || order.id.slice(-4)}
                      </span>
                      {renderChannelBadge(order)}
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${isUrgent ? 'text-red-400 font-black' : 'text-white/40'}`}>
                      <Clock size={11} className={isUrgent ? 'animate-spin' : ''} />
                      <span>{formatElapsedTime(order.createdAt)}</span>
                    </div>
                  </div>

                  {/* Nome do Cliente e Destino */}
                  <p className="text-xs font-bold text-white truncate mb-1">
                    {order.clientName || 'Cliente sem nome'}
                  </p>
                  <p className="text-[10px] text-white/50 truncate flex items-center gap-1 mb-3">
                    <MapPin size={10} className="shrink-0 text-white/30" />
                    <span>{order.destination}</span>
                  </p>

                  {/* Valor e Ação Rápida */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="text-[11px] font-black text-white/70">
                      R$ {(order.deliveryValue || order.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                    </div>
                    <button
                      onClick={(e) => handleQuickAccept(order, e)}
                      disabled={acceptingOrderId === order.id}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md hover:shadow-red-600/40 flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      {acceptingOrderId === order.id ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} strokeWidth={3} />
                      )}
                      <span>Aceitar</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {colAccept.length === 0 && (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-white/20">
                <CheckCircle2 size={32} className="mb-2 opacity-30" />
                <p className="text-[11px] font-bold uppercase tracking-wider">Tudo em dia</p>
                <p className="text-[9px] text-white/20 mt-1">Nenhum pedido aguardando aceite</p>
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

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className="group relative bg-black/80 hover:bg-black border border-white/10 hover:border-amber-500/60 rounded-xl p-3.5 transition-all cursor-pointer shadow-lg"
                >
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                        #{order.display_id || order.id.slice(-4)}
                      </span>
                      {renderChannelBadge(order)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold">
                      <Clock size={11} />
                      <span>{formatElapsedTime(order.createdAt)}</span>
                    </div>
                  </div>

                  {/* Nome do Cliente */}
                  <p className="text-xs font-bold text-white truncate mb-1">
                    {order.clientName || 'Cliente'}
                  </p>

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
                            <p className="text-[9px] text-white/40">A caminho da loja</p>
                          </div>
                        </div>
                        {onOpenChat && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenChat(order); }}
                            className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                            title="Conversar no Chat"
                          >
                            <MessageSquare size={13} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[10px] text-[#FF6B00] font-bold">
                        <Radio size={12} className="animate-pulse" />
                        <span>Buscando Guepardo...</span>
                      </div>
                    )}
                  </div>

                  {/* Botão de Ação: Marcar como Pronto */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-white/40">
                      R$ {(order.deliveryValue || order.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsReady(order.id);
                      }}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 border border-amber-500/40 text-amber-300 hover:text-black rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                    >
                      <Check size={12} strokeWidth={2.5} />
                      <span>Marcar Pronto</span>
                    </button>
                  </div>
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

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className={`group relative bg-black/80 hover:bg-black border rounded-xl p-3.5 transition-all cursor-pointer shadow-lg ${
                    isDriverAtStore 
                      ? 'border-cyan-400/80 ring-2 ring-cyan-500/30' 
                      : 'border-white/10 hover:border-cyan-400/60'
                  }`}
                >
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                        #{order.display_id || order.id.slice(-4)}
                      </span>
                      {renderChannelBadge(order)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold">
                      <Clock size={11} />
                      <span>{formatElapsedTime(order.createdAt)}</span>
                    </div>
                  </div>

                  {/* Nome do Cliente */}
                  <p className="text-xs font-bold text-white truncate mb-1">
                    {order.clientName || 'Cliente'}
                  </p>

                  {/* Destaque: Guepardo Chegou na Loja! */}
                  {isDriverAtStore ? (
                    <div className="my-2 p-2 bg-cyan-500/20 border border-cyan-400/50 rounded-lg flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-2 truncate">
                        <Bike size={16} className="text-cyan-300 shrink-0" />
                        <span className="text-[10px] font-black text-cyan-200 uppercase truncate">
                          {order.courier?.name || 'Guepardo'} CHEGOU NO BALCÃO!
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="my-2 p-2 bg-white/5 rounded-lg text-[10px] text-white/60 flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>Pronto! Aguardando coleta...</span>
                    </div>
                  )}

                  {/* Botão de Ação: Validar Código de Coleta */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-white/40">
                      R$ {(order.deliveryValue || order.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setValidatingOrder(order);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:shadow-cyan-500/30 active:scale-95 transition-all"
                    >
                      <ShieldCheck size={13} strokeWidth={2.5} />
                      <span>Liberar Coleta</span>
                    </button>
                  </div>
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

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className="group relative bg-black/80 hover:bg-black border border-white/10 hover:border-emerald-500/60 rounded-xl p-3.5 transition-all cursor-pointer shadow-lg"
                >
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                        #{order.display_id || order.id.slice(-4)}
                      </span>
                      {renderChannelBadge(order)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <Navigation size={11} className="animate-spin" />
                      <span>{isReturning ? 'Retornando' : 'A caminho'}</span>
                    </div>
                  </div>

                  {/* Nome do Cliente e Destino */}
                  <p className="text-xs font-bold text-white truncate mb-1">
                    {order.clientName || 'Cliente'}
                  </p>
                  <p className="text-[10px] text-white/50 truncate flex items-center gap-1 mb-2">
                    <MapPin size={10} className="shrink-0 text-white/30" />
                    <span>{order.destination}</span>
                  </p>

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

                    {/* Ações Rápidas: Chat e Zap */}
                    <div className="flex items-center gap-1">
                      {onOpenChat && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenChat(order); }}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                          title="Abrir Chat"
                        >
                          <MessageSquare size={13} />
                        </button>
                      )}
                      {order.clientPhone && (
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

                  {/* Rodapé: Ação de Rastreio ao Vivo ou Confirmar Retorno */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-white/40">
                      R$ {(order.deliveryValue || order.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                    </span>

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
                          onSelectOrder(order);
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Eye size={12} />
                        <span>Ver Rastreio</span>
                      </button>
                    )}
                  </div>
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
                className="group relative bg-black/60 hover:bg-black/90 border border-white/5 hover:border-white/20 rounded-xl p-3 transition-all cursor-pointer opacity-80 hover:opacity-100"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white/90">
                      #{order.display_id || order.id.slice(-4)}
                    </span>
                    {renderChannelBadge(order)}
                  </div>
                  <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Entregue
                  </span>
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

      {/* --- MODAIS EMBUTIDOS DO GESTOR --- */}
      {validatingOrder && (
        <PickupValidationModal
          order={validatingOrder}
          onClose={() => setValidatingOrder(null)}
          onSuccess={() => {
            onValidatePickup(validatingOrder.id);
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
    </div>
  );
};
