
import React, { useMemo, useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { Phone, Navigation, Clock, MapPin, CheckCircle2, Circle, Bike, Search, AlertTriangle, MessageSquare, PackageCheck, ChevronDown, ChevronUp, Car } from 'lucide-react';

interface ActiveOrderCardProps {
  order: Order;
  storeLat: number;
  storeLng: number;
  onSimulateAccept?: (orderId: string) => void;
  onChatClick?: (order: Order) => void;
  onCardClick?: (order: Order) => void;
  onTrackClick?: (order: Order) => void;
  onValidateClick?: (order: Order) => void;
  onMarkAsReady?: (orderId: string) => void;
  onConfirmReturn?: (orderId: string) => void;
  routeStats?: any;
  unreadCount?: number;
}

// Helper for distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const BASE_STEPS = [
  { status: OrderStatus.PENDING, label: 'Chamando' },
  { status: OrderStatus.ACCEPTED, label: 'Aceito' },
  { status: OrderStatus.READY_FOR_PICKUP, label: 'Pronto' },
  { status: OrderStatus.IN_TRANSIT, label: 'A Caminho' },
  { status: OrderStatus.DELIVERED, label: 'Entregue' }
];

export const ActiveOrderCard: React.FC<ActiveOrderCardProps> = ({ 
  order, storeLat, storeLng, onSimulateAccept, onChatClick, onCardClick, onTrackClick, onValidateClick, onConfirmReturn, onMarkAsReady, routeStats,
  unreadCount = 0
}) => {
  const [secondsWaiting, setSecondsWaiting] = useState(0);
  const [arrivalTimerSeconds, setArrivalTimerSeconds] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Timer logic for Pending state
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (order.status === OrderStatus.PENDING && !order.scheduled_at) {
      interval = setInterval(() => {
        setSecondsWaiting(prev => prev + 1);
      }, 1000);
    } else {
      setSecondsWaiting(0);
    }
    return () => clearInterval(interval);
  }, [order.status, order.scheduled_at]);

  // Arrival Timer logic (Timeout monitor counterpart)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if ((order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.TO_STORE) && order.acceptedAt) {
      interval = setInterval(() => {
        const acceptedDate = new Date(order.acceptedAt!);
        const elapsed = Math.floor((Date.now() - acceptedDate.getTime()) / 1000);
        setArrivalTimerSeconds(elapsed >= 0 ? elapsed : 0);
      }, 1000);
    } else {
      setArrivalTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [order.status, order.acceptedAt]);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // DYNAMIC STEPS Logic for Return
  const STEPS = useMemo(() => {
    if (order.isReturnRequired) {
      return [
        { status: OrderStatus.PENDING, label: 'Chamando' },
        { status: OrderStatus.ACCEPTED, label: 'Coleta' },
        { status: OrderStatus.READY_FOR_PICKUP, label: 'Pronto' },
        { status: OrderStatus.IN_TRANSIT, label: 'Entrega' },
        { status: OrderStatus.RETURNING, label: 'Retorno' },
        { status: OrderStatus.DELIVERED, label: 'Fim' }
      ];
    }
    return BASE_STEPS;
  }, [order.isReturnRequired]);

  // Determine current step index
  const currentStepIndex = STEPS.findIndex(s => {
    if (order.status === OrderStatus.TO_STORE || order.status === OrderStatus.ARRIVED_AT_STORE) return s.status === OrderStatus.ACCEPTED;
    return s.status === order.status;
  });

  // 2. Calculate Telemetry (Live Distance & ETA)
  const telemetry = useMemo(() => {
    // Preference 1: Real Mapbox Metrics
    if (routeStats) {
      return {
        distKm: routeStats.distanceValue / 1000,
        etaMins: Math.round(routeStats.durationValue / 60),
        label: (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.TO_STORE || order.status === OrderStatus.ARRIVED_AT_STORE || order.status === OrderStatus.RETURNING) ? "até a Loja" : "até o Cliente"
      };
    }

    if (!order.courier) return null;

    // Preference 2: Straight-line Fallback
    let targetLat, targetLng, label;

    // Logic: If coming to store vs going to client
    if (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.TO_STORE || order.status === OrderStatus.ARRIVED_AT_STORE || order.status === OrderStatus.RETURNING) {
      targetLat = storeLat;
      targetLng = storeLng;
      label = "até a Loja";
    } else {
      targetLat = order.destinationLat || storeLat;
      targetLng = order.destinationLng || storeLng;
      label = "até o Cliente";
    }

    const distKm = calculateDistance(order.courier.lat, order.courier.lng, targetLat, targetLng);
    const speedKmH = 25; // City avg speed for moto
    const etaMins = Math.ceil((distKm / speedKmH) * 60);

    return { distKm, etaMins, label };
  }, [order.courier, order.status, order.destinationLat, order.destinationLng, storeLat, storeLng, routeStats]);

  const getCompactStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return "Buscando...";
      case OrderStatus.SCHEDULED: return "Agendado";
      case OrderStatus.ACCEPTED:
      case OrderStatus.TO_STORE: return "Em Coleta";
      case OrderStatus.ARRIVED_AT_STORE: return "Na Loja";
      case OrderStatus.READY_FOR_PICKUP: return "Pedido Pronto";
      case OrderStatus.IN_TRANSIT: return "Em Rota";
      case OrderStatus.RETURNING: return "Retorno";
      default: return "Ativo";
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    if (onCardClick) onCardClick(order);
  };

  return (
    <div className={`
      relative overflow-hidden transition-all duration-500 mb-4 rounded-[1.5rem] md:rounded-[2.5rem]
      bg-black/40 backdrop-blur-xl
      border border-white/10 border-l-[6px] ${order.requestSource === 'IFOOD' ? 'border-l-red-500 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : order.requestSource === '99FOOD' ? 'border-l-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.05)]' : 'border-l-guepardo-accent'}
      shadow-[0_20px_40px_rgba(0,0,0,0.4)] group/card cursor-pointer hover:border-guepardo-accent/40 active:scale-[0.99]
      ${isExpanded ? 'p-3 md:p-6 ring-2 ring-guepardo-accent/20' : 'p-3 md:p-5'}
    `}
      onClick={handleToggleExpand}
    >

      {/* --- COLLAPSED HEADER --- */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-black/40 text-white/30 text-[9px] font-black uppercase tracking-[0.2em] border border-white/5">
              #{order.display_id || order.id.slice(-4)}
            </span>
            
            {order.requestSource === 'IFOOD' && (
              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-red-600/20 text-red-500 text-[9px] font-black uppercase tracking-[0.2em] border border-red-500/30 shadow-[0_0_10px_rgba(220,38,38,0.2)]">
                iFood
              </span>
            )}

            {order.requestSource === '99FOOD' && (
              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-yellow-600/20 text-yellow-500 text-[9px] font-black uppercase tracking-[0.2em] border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                99Food
              </span>
            )}
            
            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border border-white/5 shadow-glow-sm ${
                order.status === OrderStatus.PENDING ? 'bg-orange-500/10 text-orange-400 animate-pulse' :
                (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.TO_STORE || order.status === OrderStatus.ARRIVED_AT_STORE) ? 'bg-amber-500/10 text-amber-400 shadow-glow-amber' :
                order.status === OrderStatus.READY_FOR_PICKUP ? 'bg-cyan-500/10 text-cyan-400 shadow-glow-cyan' :
                order.status === OrderStatus.IN_TRANSIT ? 'bg-green-500/10 text-green-400 shadow-glow-green' :
                order.status === OrderStatus.RETURNING ? 'bg-violet-500/10 text-violet-400 shadow-glow-violet' :
                'bg-white/5 text-white/30'
            }`}>
                {getCompactStatusLabel(order.status)}
            </span>

            {order.vehicleType && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-[9px] font-black uppercase tracking-[0.2em] border border-orange-500/20 shadow-glow-sm">
                {order.vehicleType === 'bike' ? <Bike size={10} strokeWidth={2.5} /> : order.vehicleType === 'carro' ? <Car size={10} strokeWidth={2.5} /> : <Bike size={10} strokeWidth={2.5} />}
                {order.vehicleType}
              </span>
            )}

            {(order.scheduled_at || (order as any).items?.scheduledAt) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-guepardo-accent text-white text-[9px] font-black uppercase tracking-[0.2em] border border-white/5 shadow-glow animate-pulse">
                <Clock size={10} strokeWidth={3} /> {order.scheduled_at || (order as any).items?.scheduledAt}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {order.courier && (
              <div className="relative shrink-0">
                <img
                  src={order.courier.photoUrl}
                  alt={order.courier.name}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover border border-white/10 shadow-glow-sm"
                />
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border border-[#1A0900]"></div>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className={`font-black italic tracking-tighter text-white leading-tight truncate transition-all duration-300 ${isExpanded ? 'text-lg md:text-2xl' : 'text-base md:text-lg'}`}>
                {order.clientName}
              </h3>
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-tighter text-white/30 mt-0.5 truncate">
                {order.destination}
              </p>
            </div>
          </div>
        </div>

        <div className="text-right flex flex-col items-end justify-between min-h-[44px] md:min-h-[60px] shrink-0">
          <div className={`font-black italic text-white tracking-tighter leading-none transition-all duration-300 ${isExpanded ? 'text-lg md:text-2xl' : 'text-base md:text-xl'}`}>
            R$ {(order.deliveryValue || 0).toFixed(2)}
          </div>
          
          <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover/card:text-guepardo-accent group-hover/card:bg-guepardo-accent/10 transition-all duration-300 ${isExpanded ? 'rotate-180 bg-guepardo-accent/20 text-guepardo-accent' : ''}`}>
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* --- EXPANDABLE CONTENT --- */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
        
        {/* STEPPER (Timeline) */}
        <div className="relative flex items-center justify-between mb-6 px-1">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 rounded-full -z-0"></div>
            <div
            className="absolute top-1/2 left-0 h-0.5 bg-guepardo-accent rounded-full -z-0 transition-all duration-1000 shadow-[0_0_10px_rgba(211,84,0,0.5)]"
            style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
            ></div>

            {STEPS.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
                <div key={step.label} className="relative z-10 flex flex-col items-center group">
                <div className={`w-5 h-5 md:w-8 md:h-8 rounded-md md:rounded-xl flex items-center justify-center border md:border-2 transition-all duration-500 shadow-2xl ${isCompleted
                    ? 'bg-guepardo-accent border-guepardo-accent text-white scale-110 shadow-glow'
                    : 'bg-black/40 border-white/5 text-white/10'
                    } ${isCurrent ? 'ring-2 md:ring-4 ring-guepardo-accent/30 animate-pulse' : ''}`}>
                    {isCompleted ? <CheckCircle2 size={10} className="md:size-4" strokeWidth={3} /> : <Circle size={6} fill="currentColor" />}
                </div>
                <span className={`text-[6px] md:text-[8px] font-black mt-1 md:mt-2 uppercase tracking-tighter md:tracking-widest transition-colors duration-500 line-clamp-1 ${isCurrent ? 'text-guepardo-accent text-shadow-glow' : 'text-white/20'
                    }`}>
                    {step.label}
                </span>
                </div>
            );
            })}
        </div>

        {/* STATUS CONTENT */}
        {(order.status === OrderStatus.PENDING || order.status === OrderStatus.SCHEDULED) ? (
            <div className="bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center gap-4 text-center py-8 relative overflow-hidden group/radar shadow-inner">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 bg-yellow-400/5 dark:bg-yellow-400/10 rounded-full animate-ping"></div>
                <div className="absolute w-48 h-48 bg-yellow-400/10 dark:bg-yellow-400/20 rounded-full animate-ping delay-150"></div>
            </div>

            <div className="w-16 h-16 bg-black/40 backdrop-blur-3xl rounded-3xl border border-white/5 flex items-center justify-center shadow-2xl relative z-10 group-hover/radar:scale-110 transition-transform duration-500">
                <Search size={32} className="text-guepardo-accent drop-shadow-glow" />
            </div>

            <div className="relative z-10 space-y-1">
                <p className="text-base font-black italic text-white tracking-widest uppercase">
                {order.scheduled_at ? 'Pedido Programado' : 'Procurando Entregadores'}
                </p>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                {order.scheduled_at ? `Coleta agendada para ${order.scheduled_at}` : 'Varredura de Proximidade Ativa'}
                </p>
                {order.status === OrderStatus.PENDING && !order.scheduled_at && (
                <div className="mt-4 inline-flex items-center gap-2 bg-guepardo-accent text-white text-xs font-black italic px-4 py-2 rounded-xl shadow-glow text-shadow-glow">
                    <Clock size={14} className="drop-shadow-glow" /> {formatTime(secondsWaiting)}
                </div>
                )}
            </div>

            {onSimulateAccept && (
                <button
                onClick={(e) => { e.stopPropagation(); onSimulateAccept(order.id); }}
                className="mt-6 relative z-20 text-[10px] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 px-4 py-2 rounded-xl font-black uppercase tracking-widest transition-all scale-75 opacity-50 hover:opacity-100"
                >
                [DEBUG] FORÇAR ACEITE
                </button>
            )}

            {secondsWaiting > 120 && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-500/10 text-red-500 text-[10px] p-3 rounded-2xl border border-red-500/20 flex items-center gap-3 justify-center animate-pulse z-20 font-black uppercase tracking-wider">
                <AlertTriangle size={14} />
                ALTA DEMANDA! EXPANDINDO RAIO...
                </div>
            )}
            </div>
        ) : order.courier ? (
            <div className="bg-black/40 rounded-2xl p-5 border border-white/5 relative overflow-hidden group/courier shadow-inner">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover/courier:bg-white/10 transition-colors"></div>

            <div className="flex items-center gap-3 relative z-10">
                <div className="relative hidden md:block">
                <img
                    src={order.courier.photoUrl}
                    alt={order.courier.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#8B3A0F]/30 shadow-[0_0_15px_rgba(211,84,0,0.2)] group-hover/courier:scale-105 transition-transform"
                />
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-[#1A0900] shadow-glow-green"></div>
                </div>

                <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-1 md:gap-3">
                    <p className="text-sm md:text-base font-black italic text-white tracking-tighter truncate">{order.courier.name}</p>
                    <div className="flex items-center gap-2">
                    {order.status === OrderStatus.ARRIVED_AT_STORE && (
                        <span className="animate-pulse bg-orange-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase text-shadow-glow">Na Loja</span>
                    )}
                    <span className="bg-black/40 text-white/40 px-2 md:px-3 py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase border border-white/5 tracking-widest shadow-inner">
                        {order.courier.vehiclePlate}
                    </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3">
                    {telemetry && (
                    <>
                        <div className={`flex items-center gap-2 text-[9px] md:text-[10px] font-black italic uppercase tracking-widest px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border ${
                            order.status === OrderStatus.IN_TRANSIT 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-glow-green' 
                            : (order.status === OrderStatus.ARRIVED_AT_STORE || order.status === OrderStatus.TO_STORE || order.status === OrderStatus.ACCEPTED) 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-glow-amber'
                            : order.status === OrderStatus.READY_FOR_PICKUP
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-glow-cyan'
                            : order.status === OrderStatus.RETURNING
                            ? 'bg-violet-500/10 text-violet-400 border-violet-500/20 shadow-glow-violet'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-glow-blue'
                        }`}>
                          <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" strokeWidth={3} />
                          {telemetry.etaMins} min
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 text-[9px] md:text-[10px] text-white/30 font-black italic uppercase tracking-tighter">
                          <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
                          {telemetry.distKm?.toFixed(1) || '0.0'} km {telemetry.label}
                        </div>

                        {(order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.TO_STORE) && arrivalTimerSeconds > 0 && (
                        <div className={`w-full md:w-auto mt-1 md:mt-0 flex items-center gap-2 text-[9px] md:text-[10px] font-black italic px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border animate-pulse ${
                            arrivalTimerSeconds > 720 ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            }`}>
                            <Clock className={`w-2.5 h-2.5 md:w-3 md:h-3 ${arrivalTimerSeconds > 720 ? 'animate-spin-slow' : ''}`} strokeWidth={3} />
                            TEMPO: {formatTime(arrivalTimerSeconds)} / 15:00
                        </div>
                        )}
                    </>
                    )}
                </div>
                </div>
            </div>

            <div className="flex gap-2 mt-6">
                {(order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.TO_STORE || order.status === OrderStatus.ARRIVED_AT_STORE) && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onMarkAsReady?.(order.id); }}
                    className="flex-[1.2] h-12 flex items-center justify-center gap-2 rounded-xl bg-orange-600/20 border border-orange-500/40 text-orange-500 hover:bg-orange-600 hover:text-white transition-all text-[11px] font-black uppercase tracking-widest shadow-glow animate-in zoom-in duration-300"
                    title="Marcar como Preparado"
                >
                    <CheckCircle2 size={16} strokeWidth={3} />
                    Pronto
                </button>
                )}
                
                <button 
                onClick={(e) => { e.stopPropagation(); onChatClick?.(order); }}
                className="w-14 h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all flex items-center justify-center relative shadow-2xl group/chat"
                title="Abrir Chat"
                >
                <MessageSquare size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 flex items-center justify-center">
                    <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-75"></div>
                    <div className="relative w-5 h-5 bg-orange-500 rounded-full border-2 border-[#1a0900] shadow-[0_0_15px_rgba(255,165,0,0.6)] flex items-center justify-center animate-pulse">
                      <span className="text-[8px] font-black text-white">{unreadCount}</span>
                    </div>
                  </div>
                )}
                </button>
                
                {order.status === OrderStatus.RETURNING ? (
                <button 
                    onClick={(e) => { e.stopPropagation(); onConfirmReturn?.(order.id); }}
                    className="flex-[2] h-12 flex items-center justify-center gap-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-all text-xs font-black italic uppercase tracking-widest shadow-glow-green"
                >
                    <CheckCircle2 size={16} strokeWidth={3} />
                    Finalizar
                </button>
                ) : (
                <button 
                    onClick={(e) => { 
                    e.stopPropagation(); 
                    if (order.status === OrderStatus.READY_FOR_PICKUP || order.status === OrderStatus.ARRIVED_AT_STORE || order.status === OrderStatus.TO_STORE) {
                        onValidateClick?.(order);
                    } else {
                        onTrackClick?.(order);
                    }
                    }}
                    className={`flex-[2] h-12 flex items-center justify-center gap-3 rounded-xl text-white hover:brightness-110 transition-all text-xs font-black italic uppercase tracking-widest shadow-glow 
                    ${(order.status === OrderStatus.READY_FOR_PICKUP || order.status === OrderStatus.ARRIVED_AT_STORE || order.status === OrderStatus.TO_STORE) ? 'bg-green-600 shadow-glow-green' : 'bg-brand-gradient'}`}
                >
                    { (order.status === OrderStatus.READY_FOR_PICKUP || order.status === OrderStatus.ARRIVED_AT_STORE || order.status === OrderStatus.TO_STORE) ? <PackageCheck size={20} strokeWidth={3} /> : <Navigation size={18} strokeWidth={3} className="drop-shadow-glow" /> }
                    <span className="text-shadow-glow uppercase tracking-wider">{ (order.status === OrderStatus.READY_FOR_PICKUP || order.status === OrderStatus.ARRIVED_AT_STORE || order.status === OrderStatus.TO_STORE) ? 'Coletar' : 'Acompanhar' }</span>
                </button>
                )}
            </div>
            </div>
        ) : null}
      </div>
    </div>
  );
};
