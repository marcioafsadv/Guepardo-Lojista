
import React, { useMemo, useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { Phone, Navigation, Clock, MapPin, CheckCircle2, Circle, Bike, Search, AlertTriangle } from 'lucide-react';

interface ActiveOrderCardProps {
  order: Order;
  storeLat: number;
  storeLng: number;
  onSimulateAccept?: (orderId: string) => void;
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

export const ActiveOrderCard: React.FC<ActiveOrderCardProps> = ({ order, storeLat, storeLng, onSimulateAccept }) => {
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
    if (order.status === OrderStatus.TO_STORE) return s.status === OrderStatus.ACCEPTED;
    return s.status === order.status;
  });

  // 2. Calculate Telemetry (Live Distance & ETA)
  const telemetry = useMemo(() => {
    if (!order.courier) return null;

    let targetLat, targetLng, label;

    // Logic: If coming to store vs going to client
    if (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.TO_STORE || order.status === OrderStatus.RETURNING) {
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
  }, [order.courier, order.status, order.destinationLat, order.destinationLng, storeLat, storeLng]);


  return (
    <div className={`
      relative overflow-hidden transition-all duration-300 mb-4 p-5 rounded-2xl
      bg-white dark:bg-[#1E1E1E] 
      border-l-4 border-l-[#FFB800] 
      shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]
    `}>

      {/* Header: ID & Price */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5">
            #{order.id.slice(-4)}
          </span>
          {/* Client Name: High Contrast */}
          <h3 className="font-bold text-[18px] leading-tight text-[#121212] dark:text-white font-sans">
            {order.clientName}
          </h3>
          {/* Address: Regular 12px */}
          <p className="text-[12px] font-normal text-[#4A4A4A] dark:text-[#E0E0E0] mt-1 truncate max-w-[240px]">
            {order.destination}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-[#121212] dark:text-white tracking-tight">
            R$ {order.deliveryValue.toFixed(2)}
          </div>
          {order.changeFor && (
            <div className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded inline-block mt-1">
              Troco p/ {order.changeFor}
            </div>
          )}
        </div>
      </div>

      {/* STEPPER (Timeline) */}
      <div className="relative flex items-center justify-between mb-6 px-1">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 dark:bg-gray-700 -z-0"></div>
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-[#FFB800] -z-0 transition-all duration-1000"
          style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
        ></div>

        {STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center group">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted
                ? 'bg-[#FFB800] border-[#FFB800] text-black shadow-sm scale-110'
                : 'bg-white dark:bg-[#2D2D2D] border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600'
                } ${isCurrent ? 'ring-4 ring-[#FFB800]/20' : ''}`}>
                {isCompleted ? <CheckCircle2 size={14} strokeWidth={3} /> : <Circle size={10} fill="currentColor" />}
              </div>
              <span className={`text-[9px] font-bold mt-2 uppercase tracking-wide ${isCurrent ? 'text-[#121212] dark:text-white' : 'text-gray-400 dark:text-gray-600'
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
        <div className="bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl p-4 border border-yellow-100 dark:border-yellow-500/20 flex flex-col items-center justify-center gap-3 text-center py-6 relative overflow-hidden">

          {/* Radar Animation */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 bg-yellow-400/5 dark:bg-yellow-400/10 rounded-full animate-ping"></div>
            <div className="absolute w-48 h-48 bg-yellow-400/10 dark:bg-yellow-400/20 rounded-full animate-ping delay-150"></div>
          </div>

          <div className="bg-white dark:bg-[#2D2D2D] p-3 rounded-full shadow-lg relative z-10 animate-bounce-slow">
            <Search size={24} className="text-[#F57C00] dark:text-[#FFB800]" />
          </div>

          <div className="relative z-10">
            <p className="text-sm font-bold text-[#121212] dark:text-white">Procurando Entregadores...</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Aguardando aceite na região</p>
            <div className="mt-2 inline-block bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-xs font-mono font-bold px-3 py-1 rounded-full">
              ⏱ {formatTime(secondsWaiting)}
            </div>
          </div>

          {/* DEV SIMULATION BUTTON */}
          {onSimulateAccept && (
            <button
              onClick={() => onSimulateAccept(order.id)}
              className="mt-4 relative z-20 text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1"
            >
              <Bike size={12} />
              [DEV] Simular Aceite
            </button>
          )}

          {secondsWaiting > 120 && (
            <div className="absolute bottom-2 left-0 right-0 mx-4 bg-red-100 text-red-700 text-[10px] p-2 rounded border border-red-200 flex items-center gap-2 justify-center animate-pulse z-20">
              <AlertTriangle size={12} />
              Alta demanda! Tentando expandir raio...
            </div>
          )}
        </div>
      ) : order.courier ? (
        /* COURIER INFO CARD - High Contrast Mode */
        <div className="bg-gray-50 dark:bg-white rounded-xl p-3 border border-gray-200 dark:border-transparent relative overflow-hidden">

          <div className="flex items-center gap-3 relative z-10">
            <div className="relative">
              <img
                src={order.courier.photoUrl}
                alt={order.courier.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-200 shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-100"></div>
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-center">
                {/* Courier Name: Dark text always since bg is light in both modes (Gray-50 or White) */}
                <p className="text-sm font-bold text-[#121212]">{order.courier.name}</p>
                <span className="bg-white dark:bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border border-gray-200 dark:border-transparent">
                  {order.courier.vehiclePlate}
                </span>
              </div>

              {/* Telemetry Row */}
              <div className="flex items-center gap-2 mt-2">
                {telemetry && (
                  <>
                    <div className={`flex items-center gap-1 text-xs font-bold bg-white dark:bg-gray-100 px-2 py-1 rounded shadow-sm border border-gray-100 dark:border-transparent ${order.status === OrderStatus.IN_TRANSIT ? 'text-green-600' : 'text-blue-600'
                      }`}>
                      <Clock size={12} strokeWidth={2.5} />
                      {telemetry.etaMins} min
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-800 font-medium">
                      <MapPin size={12} />
                      {telemetry.distKm.toFixed(1)} km {telemetry.label}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-200">
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white dark:bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-xs font-bold shadow-sm">
              <Phone size={14} />
              Ligar
            </button>
            {/* Status / Track Button - High Contrast Yellow */}
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#FFB800] text-black hover:bg-[#F57C00] hover:text-white transition-all text-xs font-bold shadow-sm">
              <Navigation size={14} />
              Acompanhar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
