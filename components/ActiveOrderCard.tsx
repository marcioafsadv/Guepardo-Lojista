
import React, { useMemo, useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { Phone, Navigation, Clock, MapPin, CheckCircle2, Circle, Bike, Search, AlertTriangle, MessageSquare } from 'lucide-react';

interface ActiveOrderCardProps {
  order: Order;
  storeLat: number;
  storeLng: number;
  onSimulateAccept?: (orderId: string) => void;
  onChatClick?: (order: Order) => void;
  onCardClick?: (order: Order) => void;
  onTrackClick?: (order: Order) => void;
  onValidateClick?: (order: Order) => void;
  onConfirmReturn?: (orderId: string) => void;
  routeStats?: any;
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
  { status: OrderStatus.IN_TRANSIT, label: 'A Caminho' },
  { status: OrderStatus.DELIVERED, label: 'Entregue' }
];

export const ActiveOrderCard: React.FC<ActiveOrderCardProps> = ({ 
  order, storeLat, storeLng, onSimulateAccept, onChatClick, onCardClick, onTrackClick, onValidateClick, onConfirmReturn, routeStats
}) => {
  const [secondsWaiting, setSecondsWaiting] = useState(0);

  // Timer logic for Pending state
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (order.status === OrderStatus.PENDING) {
      interval = setInterval(() => {
        setSecondsWaiting(prev => prev + 1);
      }, 1000);
    } else {
      setSecondsWaiting(0);
    }
    return () => clearInterval(interval);
  }, [order.status]);

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


  return (
    <div className={`
      relative overflow-hidden transition-all duration-300 mb-4 p-6 rounded-[2rem]
      bg-[#1A0900]/60 backdrop-blur-xl
      border border-[#8B3A0F]/20 border-l-4 border-l-guepardo-accent
      shadow-[0_20px_50px_rgba(0,0,0,0.5)] group/card cursor-pointer hover:border-guepardo-accent/40 active:scale-[0.98]
    `}
      onClick={() => onCardClick?.(order)}
    >

      {/* Header: ID & Price */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-black/40 text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-white/5">
            #{order.display_id || order.id.slice(-4)}
          </span>
          {/* Client Name: High Contrast */}
          <h3 className="font-black italic text-2xl tracking-tighter text-white leading-none">
            {order.clientName}
          </h3>
          {/* Address: Regular 12px */}
          <p className="text-xs font-black uppercase tracking-tighter text-white/40 mt-2 truncate max-w-[240px]">
            {order.destination}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black italic text-white tracking-tighter leading-none mb-1">
            R$ {(order.deliveryValue || 0).toFixed(2)}
          </div>
          {order.changeFor && (
            <div className="text-[10px] font-black text-guepardo-accent bg-black/40 px-2 py-1 rounded-lg border border-guepardo-accent/20 uppercase tracking-wider">
              Troco p/ {order.changeFor}
            </div>
          )}
        </div>
      </div>

      {/* STEPPER (Timeline) */}
      <div className="relative flex items-center justify-between mb-6 px-1">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 rounded-full -z-0"></div>
        <div
          className="absolute top-1/2 left-0 h-1 bg-guepardo-accent rounded-full -z-0 transition-all duration-1000 shadow-[0_0_10px_rgba(211,84,0,0.5)]"
          style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
        ></div>

        {STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center group">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all duration-500 shadow-2xl ${isCompleted
                ? 'bg-guepardo-accent border-guepardo-accent text-white scale-110 shadow-glow'
                : 'bg-black/40 border-white/5 text-white/10'
                } ${isCurrent ? 'ring-4 ring-guepardo-accent/30 animate-pulse' : ''}`}>
                {isCompleted ? <CheckCircle2 size={16} strokeWidth={3} /> : <Circle size={10} fill="currentColor" />}
              </div>
              <span className={`text-[8px] font-black mt-2 uppercase tracking-widest transition-colors duration-500 line-clamp-1 ${isCurrent ? 'text-guepardo-accent' : 'text-white/20'
                }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* STATUS CONTENT */}
      {order.status === OrderStatus.PENDING ? (
        /* SEARCHING STATE (RADAR) */
        <div className="bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center gap-4 text-center py-8 relative overflow-hidden group/radar shadow-inner">

          {/* Radar Animation */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 bg-yellow-400/5 dark:bg-yellow-400/10 rounded-full animate-ping"></div>
            <div className="absolute w-48 h-48 bg-yellow-400/10 dark:bg-yellow-400/20 rounded-full animate-ping delay-150"></div>
          </div>

          <div className="w-16 h-16 bg-black/40 backdrop-blur-3xl rounded-3xl border border-white/5 flex items-center justify-center shadow-2xl relative z-10 group-hover/radar:scale-110 transition-transform duration-500">
            <Search size={32} className="text-guepardo-accent drop-shadow-glow" />
          </div>

          <div className="relative z-10 space-y-1">
            <p className="text-base font-black italic text-white tracking-widest uppercase">Procurando Entregadores</p>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Varredura de Proximidade Ativa</p>
            <div className="mt-4 inline-flex items-center gap-2 bg-guepardo-accent text-white text-xs font-black italic px-4 py-2 rounded-xl shadow-glow">
              <Clock size={14} /> {formatTime(secondsWaiting)}
            </div>
          </div>

          {/* DEV SIMULATION BUTTON */}
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
        /* COURIER INFO CARD - High Contrast Mode */
        <div className="bg-black/40 rounded-2xl p-5 border border-white/5 relative overflow-hidden group/courier shadow-inner">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover/courier:bg-white/10 transition-colors"></div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="relative">
              <img
                src={order.courier.photoUrl}
                alt={order.courier.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#8B3A0F]/30 shadow-[0_0_15px_rgba(211,84,0,0.2)] group-hover/courier:scale-105 transition-transform"
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-[#1A0900] shadow-glow-green"></div>
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="text-base font-black italic text-white tracking-tighter">{order.courier.name}</p>
                <div className="flex items-center gap-2">
                   {order.status === OrderStatus.ARRIVED_AT_STORE && (
                     <span className="animate-pulse bg-orange-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">Na Loja</span>
                   )}
                  <span className="bg-black/40 text-white/40 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-white/5 tracking-widest shadow-inner">
                    {order.courier.vehiclePlate}
                  </span>
                </div>
              </div>

              {/* Telemetry Row */}
              <div className="flex items-center gap-3 mt-3">
                {telemetry && (
                  <>
                    <div className={`flex items-center gap-2 text-[10px] font-black italic uppercase tracking-widest px-3 py-1.5 rounded-xl border ${order.status === OrderStatus.IN_TRANSIT 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-glow-green' 
                        : (order.status === OrderStatus.ARRIVED_AT_STORE || order.status === OrderStatus.TO_STORE) 
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-glow'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-glow-blue'
                      }`}>
                      <Clock size={12} strokeWidth={3} />
                      {telemetry.etaMins} min
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-white/30 font-black italic uppercase tracking-tighter">
                      <MapPin size={12} />
                      {telemetry.distKm?.toFixed(1) || '0.0'} km {telemetry.label}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={(e) => { e.stopPropagation(); }}
              className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl bg-black/40 border border-white/5 text-white hover:bg-white/5 transition-all text-xs font-black uppercase tracking-wider shadow-2xl"
            >
              <Phone size={14} strokeWidth={3} />
              Ligar
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onChatClick?.(order); }}
              className="w-12 h-12 bg-black/40 hover:bg-white/5 text-white rounded-xl border border-white/5 transition-all flex items-center justify-center relative shadow-2xl group/chat"
            >
              <MessageSquare size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-guepardo-accent rounded-full border-2 border-[#121212]"></div>
            </button>
            
            {order.status === OrderStatus.RETURNING ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onConfirmReturn?.(order.id); }}
                className="flex-[2] h-12 flex items-center justify-center gap-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-all text-xs font-black italic uppercase tracking-widest shadow-glow-green"
              >
                <CheckCircle2 size={14} strokeWidth={3} />
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
                <Navigation size={14} strokeWidth={3} />
                { (order.status === OrderStatus.READY_FOR_PICKUP || order.status === OrderStatus.ARRIVED_AT_STORE || order.status === OrderStatus.TO_STORE) ? 'Coletar' : 'Acompanhar' }
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
