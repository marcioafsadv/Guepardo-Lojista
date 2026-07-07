
import React, { useState, useRef, useEffect } from 'react';
import { DollarSign, MapPin, User, Bike, Clock, Search, Loader2, Home, Hash, FileText, FlaskConical, Phone, Star, AlertCircle, CreditCard, Banknote, QrCode, ArrowLeftRight, CheckCheck, HardHat, ChevronDown, ChevronUp, Trash2, Wallet, Car } from 'lucide-react';
import { Order, Customer, SavedAddress, RouteStats, StoreSettings, Courier, OrderStatus, AddressComponents, StoreProfile } from '../types';
import { BalanceAlertModal } from './BalanceAlertModal';
import { StoreClosedAlertModal } from './StoreClosedAlertModal';
import { classifyClient } from '../utils/clientClassifier';
import {
  calculateFreight,
  calculateFreightBatching,
  calculateReturnFee,
  FREIGHT_BASE_SIMPLE,
  FREIGHT_BASE_BATCHING,
  FREIGHT_RATE_PER_METER,
} from '../utils/freightCalculator';

export type OrderFormData = Omit<Order, 'id' | 'status' | 'createdAt' | 'estimatedPrice' | 'distanceKm' | 'events' | 'destinationLat' | 'destinationLng' | 'courier' | 'returnFee' | 'pickupCode'> & {
  isReturnRequired?: boolean;
  calculatedDistance?: number;
  calculatedEarnings?: number;
  targetCourierId?: string;
  additionalStops?: any[]; // Simplified for internal use, mapping happens in App.tsx
  customerNote?: string | null;
  vehicleType?: 'moto' | 'bike' | 'carro';
  existingOrderId?: string;
};

interface DeliveryFormProps {
  onSubmit: (data: OrderFormData) => void;
  isSubmitting: boolean;
  existingCustomers: Customer[];
  onAddressChange: (address: string | AddressComponents) => void;
  routeStats: RouteStats | null;
  settings?: any;
  balance?: number; // Added to validate before submission
  activeCouriersWithOrders?: Courier[];
  availableCouriers?: Courier[];
  allOrders?: Order[];
  isSelecting?: boolean;
  onToggleSelection?: () => void;
  externalTargetId?: string;
  onClearSelection?: () => void;
  onAdditionalStopsChange?: (stops: any[]) => void;
  onNavigateToWallet?: () => void;
  storeStatus?: string;
  onToggleStatus?: (newStatus: 'aberta' | 'fechada') => void;
  storeProfile?: StoreProfile;
  onActivateFixedCourier?: (courierId: string) => Promise<void>;
  onReleaseFixedCourier?: (courierId: string) => Promise<void>;
  onActivateHybridCourier?: (courierId: string) => Promise<void>;
  onReleaseHybridCourier?: (courierId: string) => Promise<void>;
}

export const DeliveryForm = ({
  onSubmit,
  isSubmitting,
  existingCustomers,
  onAddressChange,
  routeStats,
  settings,
  activeCouriersWithOrders = [],
  availableCouriers = [],
  allOrders = [],
  isSelecting = false,
  onToggleSelection,
  externalTargetId = '',
  onClearSelection,
  onAdditionalStopsChange,
  onNavigateToWallet,
  balance = 0,
  storeStatus = 'fechada',
  onToggleStatus,
  storeProfile,
  onActivateFixedCourier,
  onReleaseFixedCourier,
  onActivateHybridCourier,
  onReleaseHybridCourier
}: DeliveryFormProps) => {
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [showBalanceAlert, setShowBalanceAlert] = useState(false);
  const [showStoreClosedAlert, setShowStoreClosedAlert] = useState(false);

  // Modo Guepardo Open & Híbrido
  const [activeTab, setActiveTab] = useState<'express' | 'open' | 'hybrid'>(() => {
    if (storeProfile?.active_hybrid_drivers && storeProfile.active_hybrid_drivers.length > 0) {
      return 'hybrid';
    }
    if (storeProfile?.is_open_mode || (storeProfile?.active_fixed_drivers && storeProfile.active_fixed_drivers.length > 0)) {
      return 'open';
    }
    return 'express';
  });
  const [selectedCourierToFix, setSelectedCourierToFix] = useState<string>('');
  const [isActivatingFixed, setIsActivatingFixed] = useState(false);
  const [showFixedConfirmModal, setShowFixedConfirmModal] = useState(false);
  const [courierToFix, setCourierToFix] = useState<Courier | null>(null);
  const [confirmModalMode, setConfirmModalMode] = useState<'open' | 'hybrid'>('open');

  useEffect(() => {
    if (storeProfile?.active_hybrid_drivers && storeProfile.active_hybrid_drivers.length > 0) {
      setActiveTab('hybrid');
    } else if (storeProfile?.is_open_mode || (storeProfile?.active_fixed_drivers && storeProfile.active_fixed_drivers.length > 0)) {
      setActiveTab('open');
    }
  }, [storeProfile?.is_open_mode, storeProfile?.active_fixed_drivers, storeProfile?.active_hybrid_drivers]);

  // Client & Payment
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);

  // Financial State
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARD' | 'CASH'>('PIX');
  const [deliveryValue, setDeliveryValue] = useState<string>('');
  const [changeFor, setChangeFor] = useState<string>('');

  // Logistics State
  const [isReturnRequired, setIsReturnRequired] = useState(false);
  const [vehicleType, setVehicleType] = useState<'moto' | 'bike' | 'carro'>('moto');

  // Listener for auto-fill from WhatsApp/Order Hub
  useEffect(() => {
    const handleAutoFill = (e: any) => {
      const order = e.detail;
      if (order) {
        if (order.id) setExistingOrderId(order.id);
        if (order.clientName) setClientName(order.clientName);
        if (order.clientPhone) setClientPhone(order.clientPhone);
        if (order.deliveryValue) setDeliveryValue(String(order.deliveryValue)); // Ensure it's a string
        
        // Use structured fields if present
        if (order.addressStreet) setStreet(order.addressStreet);
        if (order.addressNumber) setNumber(order.addressNumber);
        if (order.addressNeighborhood) setNeighborhood(order.addressNeighborhood);
        if (order.addressComplement) setComplement(order.addressComplement);
        if (order.addressCity) setCityState(order.addressCity);
        if (order.addressCep) setCep(order.addressCep);

        // Fallback to parsing destination string
        if (!order.addressStreet && order.destination) {
          const parts = order.destination.split(',');
          if (parts.length > 0) setStreet(parts[0].trim());
          if (parts.length > 1) {
            const numPart = parts[1].trim().match(/\d+/);
            if (numPart) setNumber(numPart[0]);
          }
          const fullAddress = order.destination;
          const complementMatch = fullAddress.match(/complemento:\s*([^,]+)/i);
          if (complementMatch) setComplement(complementMatch[1].trim());
          const neighborhoodMatch = fullAddress.match(/bairro:\s*([^,]+)/i);
          if (neighborhoodMatch) setNeighborhood(neighborhoodMatch[1].trim());
          const cityStateMatch = fullAddress.match(/(\w+)\/([A-Z]{2})$/);
          if (cityStateMatch) {
            setCityState(`${cityStateMatch[1].trim()}/${cityStateMatch[2].trim()}`);
          } else if (!cityState) {
            setCityState('Itu/SP');
          }
        }
        if (order.paymentMethod) setPaymentMethod(order.paymentMethod);
      }
    };

    window.addEventListener('fill-delivery-from-order', handleAutoFill);
    return () => window.removeEventListener('fill-delivery-from-order', handleAutoFill);
  }, []);

  // Address Structure
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [cityState, setCityState] = useState('Itu/SP');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [targetCourierId, setTargetCourierId] = useState<string>('');
  const [additionalStops, setAdditionalStops] = useState<any[]>([]);

  // Sync external target changes (from Map selection)
  useEffect(() => {
    setTargetCourierId(externalTargetId || '');
  }, [externalTargetId]);

  // Sincroniza o entregador direcionado padrão baseado na aba ativa (Open vs Híbrido vs Express)
  useEffect(() => {
    if (activeTab === 'hybrid') {
      const activeHybrids = storeProfile?.active_hybrid_drivers || [];
      if (activeHybrids.length > 0) {
        if (!targetCourierId || !activeHybrids.includes(targetCourierId)) {
          setTargetCourierId(activeHybrids[0]);
        }
      } else {
        setTargetCourierId('');
      }
    } else if (activeTab === 'open') {
      const activeFixeds = storeProfile?.active_fixed_drivers || [];
      if (activeFixeds.length > 0) {
        if (!targetCourierId || !activeFixeds.includes(targetCourierId)) {
          setTargetCourierId(activeFixeds[0]);
        }
      } else {
        setTargetCourierId('');
      }
    } else {
      // Se está no Express e o entregador atual é um fixo ou híbrido ativo, limpa
      const activeFixeds = storeProfile?.active_fixed_drivers || [];
      const activeHybrids = storeProfile?.active_hybrid_drivers || [];
      if (targetCourierId && (activeFixeds.includes(targetCourierId) || activeHybrids.includes(targetCourierId))) {
        setTargetCourierId('');
      }
    }
  }, [activeTab, storeProfile?.active_fixed_drivers, storeProfile?.active_hybrid_drivers]);

  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeStopSuggestionsId, setActiveStopSuggestionsId] = useState<string | null>(null);
  const [customerNote, setCustomerNote] = useState<string | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

  // Ref for auto-focus
  const numberInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // AUTO-TRIGGER RETURN FOR CARD PAYMENTS
  useEffect(() => {
    const hasCardPayment = paymentMethod === 'CARD' || additionalStops.some(s => s.paymentMethod === 'CARD');
    if (hasCardPayment) {
      setIsReturnRequired(true);
    }
    // Note: We don't auto-disable if switching away from CARD, to respect manual user choice
  }, [paymentMethod, additionalStops]);

  // ── CÁLCULO DE FRETE & BATCHING (Centralizado) ────────────────────────
  // Distância exata em metros fornecida pela API de rotas
  const distanceMeters = routeStats?.distanceValue ?? 0;

  // Se o entregador já tem pedidos ativos, cobramos taxa de Batching (reduzida).
  // Se ele está livre ou não foi selecionado (Chamada Geral), cobramos taxa Simples.
  const isBatching = !!(targetCourierId && allOrders.some(o => 
    o.courier?.id === targetCourierId && 
    o.status !== OrderStatus.DELIVERED && 
    o.status !== OrderStatus.CANCELED
  ));

  const isFixedDriver = activeTab === 'open' || !!(targetCourierId && storeProfile?.active_fixed_drivers?.includes(targetCourierId));
  const isHybridFixedDriver = activeTab === 'hybrid' || !!(targetCourierId && storeProfile?.active_hybrid_drivers?.includes(targetCourierId));

  const baseFreightResult = isBatching
    ? calculateFreightBatching(distanceMeters)   // Base R$3,00 + R$1,32/km
    : calculateFreight(distanceMeters);           // Base R$7,00 + R$1,32/km

  const baseFreight = isFixedDriver 
    ? 0 
    : (isHybridFixedDriver ? 7.00 : baseFreightResult.storeFee);

  const baseCourierEarnings = isFixedDriver 
    ? 0 
    : (isHybridFixedDriver ? 5.00 : baseFreightResult.courierFee);

  // ── Taxa de retorno ───────────────────────────────────────────────────
  const returnFeeActive = settings?.returnFeeActive ?? true;
  const returnFeeResult = (isReturnRequired && returnFeeActive)
    ? calculateReturnFee(distanceMeters)
    : null;
  const returnFee = (isReturnRequired && returnFeeActive && !isFixedDriver && !isHybridFixedDriver) ? (returnFeeResult?.storeFee ?? 0) : 0;
  const returnCourierEarnings = (isReturnRequired && returnFeeActive && !isFixedDriver && !isHybridFixedDriver) ? (returnFeeResult?.courierFee ?? 0) : 0;

  const additionalStopsFee = isHybridFixedDriver ? (7.00 * additionalStops.length) : 0;
  const totalFreight = baseFreight + returnFee + additionalStopsFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📝 [DeliveryForm] handleSubmit triggered", { clientName, street, number, targetCourierId, additionalStopsCount: additionalStops.length });

    if (!clientName || !street || !number) {
      console.warn("⚠️ [DeliveryForm] Missing required fields, aborting submit");
      return;
    }

    if (activeTab === 'hybrid') {
      const activeHybrids = storeProfile?.active_hybrid_drivers || [];
      if (!targetCourierId || !activeHybrids.includes(targetCourierId)) {
        alert("Selecione um entregador Híbrido ativo para enviar este pedido.");
        return;
      }
    }

    if (activeTab === 'open') {
      const activeFixeds = storeProfile?.active_fixed_drivers || [];
      if (!targetCourierId || !activeFixeds.includes(targetCourierId)) {
        alert("Selecione um entregador Fixo ativo para enviar este pedido.");
        return;
      }
    }

    const fullAddress = `${street}, ${number}${complement ? ' - ' + complement : ''} - ${neighborhood}, ${cityState}`;

    // --- NEW: STORE STATUS VALIDATION ---
    if (storeStatus !== 'aberta') {
      console.warn("❌ [DeliveryForm] Store is closed, aborting submit");
      setShowStoreClosedAlert(true);
      return;
    }

    // --- NEW: BALANCE VALIDATION ---
    if (balance < totalFreight) {
      console.warn("❌ [DeliveryForm] Insufficient balance", { balance, totalFreight });
      setShowBalanceAlert(true);
      return;
    }

    console.log("🚀 [DeliveryForm] Calling onSubmit with payload...");
    onSubmit({
      clientName,
      clientPhone,
      destination: fullAddress,
      addressStreet: street,
      addressNumber: number,
      addressComplement: complement,
      addressNeighborhood: neighborhood,
      addressCity: cityState,
      addressCep: cep,
      deliveryValue: parseFloat(deliveryValue) || 0,
      paymentMethod,
      changeFor: paymentMethod === 'CASH' && changeFor ? parseFloat(changeFor) : null,
      isReturnRequired,
      // Pass calculated values to parent (distância em KM para compatibilidade)
      calculatedDistance: distanceMeters / 1000,
      calculatedEarnings: isHybridFixedDriver
        ? 5.00 * (1 + additionalStops.length)
        : Number((baseCourierEarnings + returnCourierEarnings).toFixed(2)),
      isBatch: isBatching,
      targetCourierId: targetCourierId || undefined,
      additionalStops: additionalStops.length > 0 ? additionalStops : undefined,
      storeFreight: totalFreight,
      scheduled_at: isScheduled && scheduledTime ? scheduledTime : undefined,
      vehicleType,
      existingOrderId: existingOrderId || undefined
    });

    // Reset form
    setClientName('');
    setClientPhone('');
    setCep('');
    setStreet('');
    setNumber('');
    setNeighborhood('');
    setComplement('');
    setChangeFor('');
    setDeliveryValue('');
    setTargetCourierId('');
    setCityState('Itu/SP');
    setPaymentMethod('PIX');
    setCustomerNote(null);
    setIsReturnRequired(false);
    setIsScheduled(false);
    setScheduledTime('');
    setAdditionalStops([]);
    setVehicleType('moto');
    setExistingOrderId(null);
  };

  const addStop = () => {
    if (additionalStops.length >= 4) return; // Limit to 5 total stops (1 main + 4 extra)
    setAdditionalStops([...additionalStops, {
      id: crypto.randomUUID(),
      clientName: '',
      clientPhone: '',
      addressStreet: '',
      addressNumber: '',
      addressNeighborhood: '',
      addressComplement: '',
      addressCep: '',
      addressCity: 'Itu/SP',
      deliveryValue: '',
      paymentMethod: 'PIX',
      changeFor: ''
    }]);
  };

  const removeStop = (id: string) => {
    setAdditionalStops(additionalStops.filter(s => s.id !== id));
  };

  const updateStop = (id: string, field: string, value: any) => {
    setAdditionalStops(additionalStops.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // BROADCAST ADDITIONAL STOPS FOR MAP VISIBILITY (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onAdditionalStopsChange) {
        onAdditionalStopsChange(additionalStops);
      }
    }, 600); // 0.6 second debounce matches main address logic
    return () => clearTimeout(timer);
  }, [additionalStops, onAdditionalStopsChange]);


  // --- ADDRESS CHANGE DEBOUNCER ---
  useEffect(() => {
    // Only trigger if we have at least Street
    const timer = setTimeout(() => {
      if (street) {
        // We now send structured data for better geocoding precision
        onAddressChange({
          name: clientName,
          street,
          number: number || undefined,
          neighborhood,
          city: cityState,
          cep
        });
      } else {
        console.log("📡 [DeliveryForm] Debouncer: empty street, clearing map");
        onAddressChange('');
      }
    }, 600); // 0.6 second debounce (optimized for real-time feel)

    return () => clearTimeout(timer);
  }, [street, number, neighborhood, cityState, cep, onAddressChange]);

  // --- AUTOCOMPLETE LOGIC ---
  const filteredCustomers = clientName.length > 1
    ? existingCustomers.filter(c => c.name.toLowerCase().includes(clientName.toLowerCase()))
    : [];

  const handleSelectCustomer = (customer: Customer) => {
    setClientName(customer.name);
    setClientPhone(customer.phone);
    setCustomerNote(customer.notes || null);

    // Select most recent address
    if (customer.addresses && customer.addresses.length > 0) {
      const lastAddress = customer.addresses[0];
      setCep(lastAddress.cep);
      setStreet(lastAddress.street);
      setNumber(lastAddress.number);
      setComplement(lastAddress.complement || '');
      setNeighborhood(lastAddress.neighborhood);
      setCityState(lastAddress.city);
    }

    setShowSuggestions(false);
  };

  const handleSelectCustomerForStop = (stopId: string, customer: Customer) => {
    const lastAddress = customer.addresses && customer.addresses.length > 0 ? customer.addresses[0] : null;

    setAdditionalStops(prev => prev.map(s => s.id === stopId ? {
      ...s,
      clientName: customer.name,
      clientPhone: customer.phone,
      addressCep: lastAddress?.cep || '',
      addressStreet: lastAddress?.street || '',
      addressNumber: lastAddress?.number || '',
      addressComplement: lastAddress?.complement || '',
      addressNeighborhood: lastAddress?.neighborhood || '',
      addressCity: lastAddress?.city || 'Itu/SP'
    } : s));

    setActiveStopSuggestionsId(null);
  };

  // Format CEP and fetch address
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    setCep(value);

    if (value.replace(/\D/g, '').length === 8) {
      const clean = value.replace(/\D/g, '');
      console.log("🔍 [DeliveryForm] Valid CEP detected, fetching:", clean);
      fetchAddress(clean);
    }
  };

  const fetchAddress = async (cleanCep: string) => {
    setIsLoadingCep(true);
    console.log("🌐 [DeliveryForm] Fetching ViaCEP for:", cleanCep);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      console.log("✅ [DeliveryForm] ViaCEP response:", data);

      if (!data.erro) {
        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCityState(`${data.localidade || ''}/${data.uf || ''}`);

        console.log("📍 [DeliveryForm] Address set:", {
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade
        });

        // Focus number input after finding address
        setTimeout(() => numberInputRef.current?.focus(), 100);
      } else {
        console.warn("⚠️ [DeliveryForm] ViaCEP returned error for CEP:", cleanCep);
        setStreet('');
        alert("CEP não encontrado!");
      }
    } catch (error) {
      console.error("❌ [DeliveryForm] Error fetching CEP:", error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const fillTestData = () => {
    setClientName("Marcio Silva");
    setClientPhone("11999998888");
    setCep("13300-240");
    setStreet("Rua Carlos Scalet");
    setNumber("58");
    setNeighborhood("Jardim Padre Bento");
    setCityState("Itu/SP");
    setDeliveryValue("12.50");
    setComplement("Casa Verde");
  };



  // Calculate change needed
  const calculateChangeNeeded = () => {
    if (paymentMethod !== 'CASH' || !deliveryValue || !changeFor) return 0;
    const val = parseFloat(deliveryValue);
    const pay = parseFloat(changeFor);
    return pay > val ? pay - val : 0;
  };

  const totalChangeNeeded = calculateChangeNeeded();

  return (
    <div className="delivery-form-container w-full flex flex-col relative bg-brand-gradient-premium/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] min-h-0 flex-shrink-1"
         style={{ background: 'linear-gradient(135deg, rgba(139, 58, 15, 0.95) 0%, rgba(26, 9, 0, 0.98) 100%)' }}
         ref={wrapperRef}>

      {/* COMPACT HEADER */}
      <div
        className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 cursor-pointer select-none group"
        onClick={() => setIsFormCollapsed(prev => !prev)}
        title={isFormCollapsed ? 'Expandir formulário' : 'Minimizar formulário'}
      >
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-guepardo-accent rounded-lg md:rounded-xl flex items-center justify-center text-white border border-guepardo-accent shadow-[0_0_20px_rgba(211,84,0,0.4)] group-hover:shadow-[0_0_25px_rgba(211,84,0,0.6)] transition-all duration-300">
            <Bike className="w-[18px] h-[18px] md:w-[22px] md:h-[22px] group-hover:scale-110 transition-transform" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none mb-1">Guepardo Flash</span>
            <h2 className="text-lg md:text-xl font-black italic text-white tracking-tighter leading-none">Chamar Guepardo</h2>
          </div>
        </div>
        <button
          type="button"
          className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white/50 group-hover:text-white/80 group-hover:border-white/20 hover:!bg-guepardo-accent hover:!text-white hover:!border-guepardo-accent/50 shadow-md hover:shadow-[0_0_15px_rgba(255,107,0,0.5)] transition-all duration-300"
          aria-label={isFormCollapsed ? 'Expandir' : 'Minimizar'}
        >
          {isFormCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* COLLAPSIBLE CONTENT */}
      <div
        className="delivery-form-content flex-1 overflow-y-auto transition-all duration-300 ease-in-out scrollbar-guepardo"
        style={{
          maxHeight: isFormCollapsed ? 0 : 'calc(100vh - 260px)',
          opacity: isFormCollapsed ? 0 : 1,
          paddingRight: isFormCollapsed ? 0 : '4px'
        }}
      >
        {/* TABS SELECTOR */}
        <div className="grid grid-cols-3 gap-2 mb-4 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('express')}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'express'
                ? 'bg-guepardo-accent text-white shadow-[0_0_15px_rgba(211,84,0,0.4)]'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Guepardo Flash
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'open'
                ? 'bg-guepardo-accent text-white shadow-[0_0_15px_rgba(211,84,0,0.4)]'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <FlaskConical size={12} className={activeTab === 'open' ? 'animate-pulse' : ''} />
            Guepardo Open
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hybrid')}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'hybrid'
                ? 'bg-guepardo-accent text-white shadow-[0_0_15px_rgba(211,84,0,0.4)]'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <ArrowLeftRight size={12} className={activeTab === 'hybrid' ? 'animate-pulse' : ''} />
            Híbrido (Fixo)
          </button>
        </div>

        {/* GUEPARDO OPEN PANEL */}
        {activeTab === 'open' && (
          <div className="mb-4 bg-black/40 border border-white/5 rounded-2xl p-4 space-y-4">
            <h3 className="text-[10px] font-black text-guepardo-accent uppercase tracking-widest text-shadow-glow flex items-center gap-1.5">
              <HardHat size={12} className="drop-shadow-glow" /> Entregadores Fixos Ativos
            </h3>

            {/* List Active Fixed Riders */}
            <div className="space-y-2">
              {storeProfile?.active_fixed_drivers && storeProfile.active_fixed_drivers.length > 0 ? (
                availableCouriers
                  .filter(c => storeProfile.active_fixed_drivers?.includes(c.id))
                  .map(courier => (
                    <div key={courier.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3 animate-in fade-in duration-300">
                      <div className="flex items-center gap-3">
                        <img src={courier.photoUrl} alt={courier.name} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                        <div>
                          <p className="text-xs font-black text-white">{courier.name}</p>
                          <p className="text-[9px] text-white/40 font-mono">{courier.vehiclePlate} • {courier.vehicleModel}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Deseja encerrar o turno fixo de ${courier.name}?\nSerá creditado R$ 170,00 na carteira dele.`)) {
                            if (onReleaseFixedCourier) await onReleaseFixedCourier(courier.id);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/20 hover:border-red-500 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      >
                        Liberar
                      </button>
                    </div>
                  ))
              ) : (
                <p className="text-[10px] text-white/30 italic uppercase tracking-wider text-center py-2">
                  Nenhum entregador ativado no turno fixo.
                </p>
              )}
            </div>

            {/* Add Courier to Fixed Shift Form */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <label className="text-[9px] font-black text-white/40 uppercase tracking-wider">Ativar Entregador Fixo no Turno (R$ 200,00/diária)</label>
              <div className="flex gap-2">
                <select
                  value={selectedCourierToFix}
                  onChange={(e) => setSelectedCourierToFix(e.target.value)}
                  className="flex-1 bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-white placeholder-white/45 focus:border-guepardo-accent/80 outline-none"
                >
                  <option value="">Selecione um Guepardo...</option>
                  {availableCouriers
                    .filter(c => c.isOnline && !storeProfile?.active_fixed_drivers?.includes(c.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.vehiclePlate})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedCourierToFix || isActivatingFixed}
                  onClick={async () => {
                    const c = availableCouriers.find(courier => courier.id === selectedCourierToFix);
                    if (!c) return;
                    setCourierToFix(c);
                    setConfirmModalMode('open');
                    setShowFixedConfirmModal(true);
                  }}
                  className="px-3 py-2 bg-guepardo-accent hover:bg-guepardo-accent/80 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  Ativar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GUEPARDO HÍBRIDO PANEL */}
        {activeTab === 'hybrid' && (
          <div className="mb-4 bg-black/40 border border-white/5 rounded-2xl p-4 space-y-4">
            <h3 className="text-[10px] font-black text-guepardo-accent uppercase tracking-widest text-shadow-glow flex items-center gap-1.5">
              <HardHat size={12} className="drop-shadow-glow" /> Entregadores Híbridos Ativos
            </h3>

            {/* List Active Hybrid Riders */}
            <div className="space-y-2">
              {storeProfile?.active_hybrid_drivers && storeProfile.active_hybrid_drivers.length > 0 ? (
                availableCouriers
                  .filter(c => storeProfile.active_hybrid_drivers?.includes(c.id))
                  .map(courier => (
                    <div key={courier.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3 animate-in fade-in duration-300">
                      <div className="flex items-center gap-3">
                        <img src={courier.photoUrl} alt={courier.name} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                        <div>
                          <p className="text-xs font-black text-white">{courier.name}</p>
                          <p className="text-[9px] text-white/40 font-mono">{courier.vehiclePlate} • {courier.vehicleModel}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Deseja encerrar o turno híbrido de ${courier.name}?\nSerá creditado R$ 50,00 na carteira dele.`)) {
                            if (onReleaseHybridCourier) await onReleaseHybridCourier(courier.id);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/20 hover:border-red-500 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      >
                        Liberar
                      </button>
                    </div>
                  ))
              ) : (
                <p className="text-[10px] text-white/30 italic uppercase tracking-wider text-center py-2">
                  Nenhum entregador ativado no turno híbrido.
                </p>
              )}
            </div>

            {/* Add Courier to Hybrid Shift Form */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <label className="text-[9px] font-black text-white/40 uppercase tracking-wider">Ativar Entregador Híbrido no Turno (R$ 50,00/diária)</label>
              <div className="flex gap-2">
                <select
                  value={selectedCourierToFix}
                  onChange={(e) => setSelectedCourierToFix(e.target.value)}
                  className="flex-1 bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-white placeholder-white/45 focus:border-guepardo-accent/80 outline-none"
                >
                  <option value="">Selecione um Guepardo...</option>
                  {availableCouriers
                    .filter(c => c.isOnline && !storeProfile?.active_fixed_drivers?.includes(c.id) && !storeProfile?.active_hybrid_drivers?.includes(c.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.vehiclePlate})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedCourierToFix || isActivatingFixed}
                  onClick={async () => {
                    const c = availableCouriers.find(courier => courier.id === selectedCourierToFix);
                    if (!c) return;
                    setCourierToFix(c);
                    setConfirmModalMode('hybrid');
                    setShowFixedConfirmModal(true);
                  }}
                  className="px-3 py-2 bg-guepardo-accent hover:bg-guepardo-accent/80 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  Ativar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM CONFIRMATION MODAL FOR ATIVAR DIÁRIA */}
        {showFixedConfirmModal && courierToFix && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1A0900]/95 border border-guepardo-accent/30 p-6 rounded-[2rem] w-full max-w-[340px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-guepardo-accent/20 rounded-full flex items-center justify-center text-guepardo-accent mx-auto border border-guepardo-accent/30 shadow-glow-sm">
                <HardHat size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white uppercase italic">
                  {confirmModalMode === 'hybrid' ? 'Ativar Turno Híbrido' : 'Ativar Turno Fixo'}
                </h3>
                <p className="text-xs text-white/70">
                  Deseja fixar o entregador <strong className="text-white font-bold">{courierToFix.name}</strong> no turno {confirmModalMode === 'hybrid' ? 'híbrido' : 'fixo'} de hoje?
                </p>
                <p className="text-[10px] text-guepardo-accent font-black uppercase tracking-wider pt-2">
                  * Será debitado R$ {confirmModalMode === 'hybrid' ? '50,00' : '200,00'} do seu saldo {confirmModalMode === 'hybrid' ? 'e retido até o final do turno' : ''}.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFixedConfirmModal(false);
                    setCourierToFix(null);
                  }}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsActivatingFixed(true);
                    try {
                      if (confirmModalMode === 'hybrid') {
                        if (onActivateHybridCourier) {
                          await onActivateHybridCourier(courierToFix.id);
                        }
                      } else {
                        if (onActivateFixedCourier) {
                          await onActivateFixedCourier(courierToFix.id);
                        }
                      }
                      setSelectedCourierToFix('');
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsActivatingFixed(false);
                      setShowFixedConfirmModal(false);
                      setCourierToFix(null);
                    }
                  }}
                  className="flex-1 py-2.5 bg-guepardo-accent hover:bg-guepardo-accent/80 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-glow transition-all"
                >
                  Ativar
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2 md:space-y-3">

          {/* CUSTOMER SEARCH / NAME */}
          <div className="relative group/input z-50">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="text-white/20 group-focus-within/input:text-guepardo-accent transition-colors" size={18} />
            </div>
            <input
              type="text"
              placeholder="Nome (Busca Automática)"
              className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-black/60 border border-white/20 rounded-2xl text-xs md:text-sm focus:outline-none focus:border-guepardo-accent/80 focus:ring-4 focus:ring-guepardo-accent/10 transition-all font-black italic text-white placeholder-white/45"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                setShowSuggestions(true);
                if (!e.target.value) setCustomerNote(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              autoFocus
              autoComplete="off"
              required
            />
            {/* Autocomplete Dropdown */}
            {showSuggestions && filteredCustomers.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-guepardo-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                {filteredCustomers.map(customer => {
                  const tier = classifyClient(customer.totalOrders);
                  return (
                    <div
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between group/item border-b border-gray-100 dark:border-white/5 last:border-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-gray-900 dark:text-gray-200 group-hover/item:text-guepardo-accent">{customer.name}</p>
                          {tier.id !== 'NEW' && (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${tier.bgColor} ${tier.style} border ${tier.borderColor}`}>
                              {tier.icon}
                              <span className="text-[9px] uppercase font-extrabold tracking-wider">{tier.label}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500">{customer.addresses[0]?.street}, {customer.addresses[0]?.number}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* PHONE / WHATSAPP */}
          <div className="relative group/input z-40">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone className="text-white/20 group-focus-within/input:text-guepardo-accent transition-colors" size={18} />
            </div>
            <input
              type="tel"
              placeholder="Telefone / WhatsApp"
              className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-black/60 border border-white/20 rounded-2xl text-xs md:text-sm focus:outline-none focus:border-guepardo-accent/80 focus:ring-4 focus:ring-guepardo-accent/10 transition-all font-black italic text-white placeholder-white/45"
              value={clientPhone}
              onChange={(e) => {
                // Basic phone mask (digits only)
                const val = e.target.value.replace(/\D/g, '');
                let formatted = val;
                if (val.length > 10) formatted = val.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                else if (val.length > 5) formatted = val.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
                else if (val.length > 2) formatted = val.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');

                setClientPhone(formatted);
              }}
              autoComplete="tel"
            />
          </div>

          {/* CRM ALERT NOTE */}
          {customerNote && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 flex items-start gap-2">
              <AlertCircle size={12} className="text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-900 leading-tight"><strong>Obs:</strong> {customerNote}</p>
            </div>
          )}

          {/* ADDRESS ROW 1 */}
          <div className="flex gap-3">
            <div className="relative group/input w-1/3 min-w-[90px]">
              <input
                type="text"
                placeholder="CEP"
                className="w-full px-4 py-2.5 md:py-3 bg-black/60 border border-white/20 rounded-2xl text-xs md:text-sm focus:outline-none focus:border-guepardo-accent/80 focus:ring-4 focus:ring-guepardo-accent/10 transition-all font-black italic text-white placeholder-white/45"
                value={cep}
                onChange={handleCepChange}
                maxLength={9}
                required
              />
            </div>
            <div className="relative group/input flex-1">
              <input
                type="text"
                placeholder="Rua"
                className="w-full px-4 py-2.5 md:py-3 bg-black/60 border border-white/20 rounded-2xl text-xs md:text-sm focus:outline-none focus:border-guepardo-accent/80 focus:ring-4 focus:ring-guepardo-accent/10 transition-all font-black italic text-white placeholder-white/45"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
              />
            </div>
          </div>

          {/* ADDRESS ROW 2 */}
          <div className="flex gap-3">
            <div className="relative group/input w-1/4">
              <input
                ref={numberInputRef}
                type="text"
                placeholder="Nº"
                className="w-full px-4 py-2.5 md:py-3 bg-black/60 border border-white/20 rounded-2xl text-xs md:text-sm focus:outline-none focus:border-guepardo-accent/80 focus:ring-4 focus:ring-guepardo-accent/10 transition-all font-black italic text-white placeholder-white/45"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
            </div>
            <div className="relative group/input flex-1">
              <input
                type="text"
                placeholder="Comp (apto, bloco...)"
                className="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-2xl text-sm focus:outline-none focus:border-guepardo-accent/80 focus:ring-4 focus:ring-guepardo-accent/10 transition-all font-black italic text-white placeholder-white/45"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
              />
            </div>
          </div>

          {/* ADDRESS ROW 3: Neighborhood & City (Visible fallback) */}
          <div className="flex gap-3">
            <div className="relative group/input flex-1">
              <input
                type="text"
                placeholder="Bairro"
                className="w-full px-4 py-2.5 md:py-3 bg-black/60 border border-white/20 rounded-2xl text-xs md:text-sm focus:outline-none focus:border-guepardo-accent/80 focus:ring-4 focus:ring-guepardo-accent/10 transition-all font-black italic text-white placeholder-white/45"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                required
              />
            </div>
            <div className="relative group/input w-1/3">
              <input
                type="text"
                placeholder="Cidade/UF"
                className="w-full px-4 py-2.5 md:py-3 bg-black/60 border border-white/20 rounded-2xl text-xs md:text-sm focus:outline-none focus:border-guepardo-accent/80 focus:ring-4 focus:ring-guepardo-accent/10 transition-all font-black italic text-white placeholder-white/45"
                value={cityState}
                onChange={(e) => setCityState(e.target.value)}
                required
              />
            </div>
          </div>

          {/* FINANCEIROS - LINHA 1: VALOR E METODO */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-white/20 text-xs font-black">R$</span>
              </div>
              <input
                type="number"
                placeholder="Valor"
                className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-black/60 border border-white/20 rounded-2xl text-xs md:text-sm focus:outline-none focus:border-guepardo-accent/80 focus:ring-4 focus:ring-guepardo-accent/10 transition-all font-black italic text-white placeholder-white/45"
                value={deliveryValue}
                onChange={(e) => setDeliveryValue(e.target.value)}
              />
            </div>

            <div className="relative group/input">
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as any);
                  if (e.target.value !== 'CASH') setChangeFor('');
                }}
                className="w-full px-4 py-2.5 md:py-3 bg-black/60 border border-white/20 rounded-2xl text-[10px] md:text-xs font-black italic focus:outline-none focus:border-guepardo-accent/80 focus:ring-4 focus:ring-guepardo-accent/10 transition-all text-white appearance-none"
              >
                <option value="PIX">PIX</option>
                <option value="CARD">Cartão (Maq.)</option>
                <option value="CASH">Dinheiro</option>
              </select>
              {/* Custom Arrow */}
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-white/20"></div>
              </div>
            </div>
          </div>

          {/* VEHICLE TYPE SELECTOR */}
          <div className="space-y-2 mt-2">
            <label className="text-[10px] font-black text-guepardo-accent uppercase tracking-[0.2em] flex items-center gap-2 text-shadow-glow">
              <Bike className="w-4 h-4 text-guepardo-accent drop-shadow-glow" /> Modalidade de Entrega
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'moto', label: 'Moto', icon: Bike },
                { id: 'bike', label: 'Bike', icon: Bike },
                { id: 'carro', label: 'Carro', icon: Car }
              ].map(method => {
                const IconComponent = method.icon;
                const isSelected = vehicleType === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setVehicleType(method.id as any)}
                    className={`vehicle-btn h-11 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${
                      isSelected
                        ? 'bg-guepardo-accent/20 border-guepardo-accent text-white shadow-glow-sm'
                        : 'bg-black/60 border-white/5 text-white/40 hover:border-white/20 hover:text-white/60'
                    }`}
                  >
                    <IconComponent size={16} className={isSelected ? 'text-guepardo-accent animate-pulse' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CAMPO DE TROCO - APARECE APENAS EM DINHEIRO */}
          {paymentMethod === 'CASH' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-guepardo-accent/5 border border-guepardo-accent/20 rounded-[1.5rem] p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-guepardo-accent uppercase tracking-[0.2em] flex items-center gap-2 mb-2 text-shadow-glow">
                      <Banknote size={14} className="drop-shadow-glow" /> Troco para quanto?
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-guepardo-accent text-xs font-black">R$</span>
                      </div>
                      <input
                        type="number"
                        placeholder="Ex: 50.00"
                        className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-black/60 border-2 border-guepardo-accent/40 rounded-2xl text-xs md:text-sm font-black italic focus:outline-none focus:border-guepardo-accent focus:ring-4 focus:ring-guepardo-accent/10 transition-all text-white placeholder-guepardo-accent/50"
                        value={changeFor}
                        onChange={(e) => setChangeFor(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right pt-4">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-tighter leading-none mb-2">Troco Total</p>
                    <p className={`text-2xl font-black italic tracking-tighter leading-none ${totalChangeNeeded > 0 ? 'text-guepardo-accent text-shadow-glow' : 'text-white/10'}`}>
                      R$ {totalChangeNeeded.toFixed(2)}
                    </p>
                  </div>
                </div>
                {totalChangeNeeded > 0 && (
                  <p className="text-[10px] text-guepardo-accent/60 font-black italic uppercase tracking-wider">
                    * O entregador deverá levar R$ {totalChangeNeeded.toFixed(2)} em espécie.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ADDITIONAL STOPS */}
          {additionalStops.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-guepardo-accent uppercase tracking-[0.2em] text-shadow-glow">Paradas Adicionais ({additionalStops.length})</span>
              </div>
              {additionalStops.map((stop, index) => (
                <div key={stop.id} className="bg-[#1A0900]/40 border border-[#8B3A0F]/20 rounded-[1.5rem] p-5 space-y-4 relative animate-in slide-in-from-right-4 duration-500 overflow-hidden group/stop">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-guepardo-accent/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover/stop:bg-guepardo-accent/10 transition-colors"></div>
                  <button
                    type="button"
                    onClick={() => removeStop(stop.id)}
                    className="absolute top-4 right-4 text-white/20 hover:text-red-500 transition-colors z-10"
                  >
                    <Trash2 size={16} />
                  </button>

                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] relative z-10">PARADA #{index + 2}</p>

                  {/* NOME DO CLIENTE */}
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="text-white/20 group-focus-within/input:text-guepardo-accent transition-colors" size={14} />
                    </div>
                    <input
                      type="text"
                      placeholder="Nome do Cliente"
                      className="w-full pl-10 pr-4 py-2 bg-black/60 border border-white/20 rounded-xl text-xs focus:outline-none focus:border-guepardo-accent/80 text-white font-black italic placeholder-white/45"
                      value={stop.clientName}
                      onChange={(e) => {
                        updateStop(stop.id, 'clientName', e.target.value);
                        setActiveStopSuggestionsId(stop.id);
                      }}
                      onFocus={() => setActiveStopSuggestionsId(stop.id)}
                      autoComplete="off"
                      required
                    />
                    {/* Additional Stop Autocomplete Dropdown */}
                    {activeStopSuggestionsId === stop.id && stop.clientName.length > 1 && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-guepardo-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200">
                        {existingCustomers
                          .filter(c => c.name.toLowerCase().includes(stop.clientName.toLowerCase()))
                          .slice(0, 5)
                          .map(customer => {
                            const tier = classifyClient(customer.totalOrders);
                            return (
                              <div
                                key={customer.id}
                                onClick={() => handleSelectCustomerForStop(stop.id, customer)}
                                className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between group/item border-b border-gray-100 dark:border-white/5 last:border-0"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-[10px] text-gray-900 dark:text-gray-200 group-hover/item:text-guepardo-accent">{customer.name}</p>
                                    {tier.id !== 'NEW' && (
                                      <div className={`flex items-center gap-1 px-1 py-0.5 rounded ${tier.bgColor} ${tier.style} border ${tier.borderColor}`}>
                                        <span className="text-[8px] uppercase font-black">{tier.label}</span>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-gray-500">{customer.addresses[0]?.street}, {customer.addresses[0]?.number}</p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* TELEFONE */}
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="text-white/20 group-focus-within/input:text-guepardo-accent transition-colors" size={14} />
                    </div>
                    <input
                      type="tel"
                      placeholder="Telefone / WhatsApp"
                      className="w-full pl-10 pr-4 py-2 bg-black/60 border border-white/20 rounded-xl text-xs focus:outline-none focus:border-guepardo-accent/80 text-white font-black italic placeholder-white/45"
                      value={stop.clientPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        let formatted = val;
                        if (val.length > 10) formatted = val.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                        else if (val.length > 5) formatted = val.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
                        else if (val.length > 2) formatted = val.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
                        updateStop(stop.id, 'clientPhone', formatted);
                      }}
                    />
                  </div>

                  {/* CEP E RUA */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="CEP"
                      className="w-28 px-4 py-2 bg-black/60 border border-white/20 rounded-xl text-xs focus:outline-none focus:border-guepardo-accent/80 text-white font-black italic placeholder-white/45"
                      value={stop.addressCep}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 5) val = val.replace(/^(\d{5})(\d)/, '$1-$2');
                        updateStop(stop.id, 'addressCep', val);
                        if (val.replace(/\D/g, '').length === 8) {
                          // Inline mini-fetch for additional stops
                          fetch(`https://viacep.com.br/ws/${val.replace(/\D/g, '')}/json/`)
                            .then(res => res.json())
                            .then(data => {
                              if (!data.erro) {
                                setAdditionalStops(prev => prev.map(s => s.id === stop.id ? {
                                  ...s,
                                  addressStreet: data.logradouro || '',
                                  addressNeighborhood: data.bairro || '',
                                  addressCity: `${data.localidade || ''}/${data.uf || ''}`
                                } : s));
                              }
                            }).catch(() => { });
                        }
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Rua"
                      className="flex-1 px-4 py-2 bg-black/40 border border-white/5 rounded-xl text-xs focus:outline-none focus:border-guepardo-accent/50 text-white font-black italic"
                      value={stop.addressStreet}
                      onChange={(e) => updateStop(stop.id, 'addressStreet', e.target.value)}
                      required
                    />
                  </div>

                  {/* NÚMERO E COMPLEMENTO */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Nº"
                      className="w-16 px-3 py-2 bg-black/40 border border-white/5 rounded-xl text-xs focus:outline-none focus:border-guepardo-accent/50 text-white font-black italic text-center"
                      value={stop.addressNumber}
                      onChange={(e) => updateStop(stop.id, 'addressNumber', e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Complemento"
                      className="flex-1 px-4 py-2 bg-black/40 border border-white/5 rounded-xl text-xs focus:outline-none focus:border-guepardo-accent/50 text-white font-black italic"
                      value={stop.addressComplement}
                      onChange={(e) => updateStop(stop.id, 'addressComplement', e.target.value)}
                    />
                  </div>

                  {/* BAIRRO E CIDADE */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Bairro"
                      className="flex-1 px-4 py-2 bg-black/40 border border-white/5 rounded-xl text-xs focus:outline-none focus:border-guepardo-accent/50 text-white font-black italic"
                      value={stop.addressNeighborhood}
                      onChange={(e) => updateStop(stop.id, 'addressNeighborhood', e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Cidade/UF"
                      className="w-28 px-4 py-2 bg-black/40 border border-white/5 rounded-xl text-xs focus:outline-none focus:border-guepardo-accent/50 text-white font-black italic"
                      value={stop.addressCity}
                      onChange={(e) => updateStop(stop.id, 'addressCity', e.target.value)}
                      required
                    />
                  </div>

                  {/* VALOR E FORMA DE PAGAMENTO */}
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-white/20 text-[10px] font-black">R$</span>
                      </div>
                      <input
                        type="number"
                        placeholder="Valor"
                        className="w-full pl-8 pr-4 py-2 bg-black/40 border border-white/5 rounded-xl text-xs focus:outline-none focus:border-guepardo-accent/50 font-black italic text-white placeholder-white/10"
                        value={stop.deliveryValue}
                        onChange={(e) => updateStop(stop.id, 'deliveryValue', e.target.value)}
                      />
                    </div>
                    <select
                      value={stop.paymentMethod}
                      onChange={(e) => updateStop(stop.id, 'paymentMethod', e.target.value)}
                      className="w-28 px-4 py-2 bg-black/40 border border-white/5 rounded-xl text-[10px] font-black italic focus:outline-none focus:border-guepardo-accent/50 text-white appearance-none"
                    >
                      <option value="PIX">PIX</option>
                      <option value="CARD">Cartão</option>
                      <option value="CASH">Dinheiro</option>
                    </select>
                  </div>

                  {/* TROCO PARA STOP */}
                  {stop.paymentMethod === 'CASH' && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                      <input
                        type="number"
                        placeholder="Troco para..."
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-warm-900 border-2 border-orange-200 dark:border-orange-900/50 rounded-md text-xs font-bold focus:outline-none focus:border-orange-500 text-warm-800 dark:text-white"
                        value={stop.changeFor}
                        onChange={(e) => updateStop(stop.id, 'changeFor', e.target.value)}
                      />
                      {parseFloat(stop.changeFor) > parseFloat(stop.deliveryValue) && (
                        <span className="text-[10px] font-black text-guepardo-accent italic uppercase tracking-tighter">
                          Troco: R$ {(parseFloat(stop.changeFor) - (parseFloat(stop.deliveryValue) || 0)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* BOTÃO ADICIONAR PARADA */}
          <button
            type="button"
            onClick={addStop}
            disabled={additionalStops.length >= 4}
            className="add-stop-btn w-full py-4 border-2 border-dashed border-white/10 rounded-[1.5rem] text-[10px] md:text-xs font-black text-white hover:border-guepardo-accent/50 hover:text-guepardo-accent hover:bg-guepardo-accent/5 transition-all flex items-center justify-center gap-3 group mb-4 text-shadow-glow"
          >
            <MapPin size={18} className="group-hover:animate-bounce text-white group-hover:text-guepardo-accent transition-colors" />
            <span>ADICIONAR PARADA (+)</span>
          </button>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-guepardo-accent uppercase tracking-[0.2em] flex items-center gap-2 text-shadow-glow">
              <User className="w-4 h-4 text-guepardo-accent drop-shadow-glow" />
              Direcionar para Entregador
            </label>
            <div className="grid grid-cols-1 gap-2">
              <select
                value={targetCourierId}
                onChange={(e) => {
                  const val = e.target.value;
                  setTargetCourierId(val);
                  if (!val && onClearSelection) {
                    onClearSelection();
                  }
                }}
                className={`w-full px-4 py-3 border rounded-2xl text-xs font-black focus:outline-none transition-all appearance-none ${targetCourierId
                  ? 'bg-guepardo-dark/40 border-guepardo-accent text-white shadow-[0_0_20px_rgba(211,84,0,0.3)]'
                  : 'bg-black/40 border-white/5 text-white/40'
                  }`}
              >
                <optgroup label="🚀 Chamada Geral" className="text-gray-900 bg-white">
                  <option value="">Enviar p/ Todos (Painel de Ofertas)</option>
                </optgroup>

                {availableCouriers.some(c => c.isOnline) && (
                  <optgroup label="📍 Disponíveis (Direto)" className="text-white bg-guepardo-dark">
                    {availableCouriers.filter(c => c.isOnline).map(courier => {
                      const isFixed = storeProfile?.active_fixed_drivers?.includes(courier.id);
                      const isHybrid = storeProfile?.active_hybrid_drivers?.includes(courier.id);
                      return (
                        <option key={courier.id} value={courier.id}>
                          Guepardo: {courier.name} ({courier.vehiclePlate})
                          {isFixed ? ' ★ [FIXO]' : ''}
                          {isHybrid ? ' ★ [FIXO HÍBRIDO]' : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                )}

                {activeCouriersWithOrders.length > 0 && (
                  <optgroup label="👤 Em Rota / Batching (Adicionar)" className="text-white bg-guepardo-dark">
                    {activeCouriersWithOrders
                      .filter(courier => {
                        const courierOrders = allOrders.filter(o => o.courier?.id === courier.id);
                        return courierOrders.every(o => o.status !== OrderStatus.IN_TRANSIT && o.status !== OrderStatus.RETURNING);
                      })
                      .map(courier => {
                        const isFixed = storeProfile?.active_fixed_drivers?.includes(courier.id);
                        const isHybrid = storeProfile?.active_hybrid_drivers?.includes(courier.id);
                        return (
                          <option key={courier.id} value={courier.id}>
                            {courier.name} - Adicionar à Rota
                            {isFixed ? ' ★ [FIXO]' : ''}
                            {isHybrid ? ' ★ [FIXO HÍBRIDO]' : ''}
                          </option>
                        );
                      })}
                  </optgroup>
                )}
              </select>
              {targetCourierId && (
                <p className="text-[10px] text-guepardo-accent font-black uppercase tracking-wider italic flex items-center gap-2 text-shadow-glow">
                  <CheckCheck size={12} className="drop-shadow-glow" /> Chamada será direcionada exclusivamente ao Guepardo selecionado.
                </p>
              )}
            </div>
          </div>

          {/* RETURN TRIP TOGGLE & ALERTS */}
          <div className="space-y-3 mt-2">
            {/* Toggle Switch for Return */}
            {!isHybridFixedDriver && (
              <label className="form-toggle-label flex items-center gap-4 p-4 rounded-[1.5rem] bg-black/40 border border-white/5 cursor-pointer hover:bg-white/5 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8"></div>
                <div className="relative z-10">
                  <input
                    type="checkbox"
                    checked={isReturnRequired}
                    onChange={(e) => setIsReturnRequired(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isReturnRequired ? 'bg-guepardo-accent shadow-[0_0_15px_rgba(211,84,0,0.5)]' : 'bg-white/10'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-xl transition-transform duration-300 ${isReturnRequired ? 'translate-x-6' : ''}`}></div>
                  </div>
                </div>
                <div className="flex-1 relative z-10">
                  <p className={`text-xs font-black uppercase tracking-wider ${isReturnRequired ? 'text-guepardo-accent text-shadow-glow' : 'text-white/30'}`}>Necessita Retorno à Loja?</p>
                  <p className="text-[10px] text-white/10 font-black tracking-tighter uppercase">Ex: Maquininha, Recibo Assinado, Troca</p>
                </div>
              </label>
            )}

            {/* Toggle Switch for Scheduled */}
            <label className="form-toggle-label flex items-center gap-4 p-4 rounded-[1.5rem] bg-black/40 border border-white/5 cursor-pointer hover:bg-white/5 transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8"></div>
              <div className="relative z-10">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsScheduled(checked);
                    if (checked && !scheduledTime) {
                      const now = new Date();
                      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16);
                      setScheduledTime(localISO);
                    }
                  }}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isScheduled ? 'bg-guepardo-accent shadow-[0_0_15px_rgba(211,84,0,0.5)]' : 'bg-white/10'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-xl transition-transform duration-300 ${isScheduled ? 'translate-x-6' : ''}`}></div>
                </div>
              </div>
              <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase tracking-widest ${isScheduled ? 'text-white' : 'text-white/30'}`}>Agendar Pedido?</span>
                  {isScheduled && <Clock size={12} className="text-guepardo-accent animate-pulse" />}
                </div>
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter mt-1">Definir um horário para coleta</p>
              </div>
            </label>

            {/* Scheduled Time Input */}
            {isScheduled && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-guepardo-accent/5 border border-guepardo-accent/20 rounded-[1.5rem] p-5">
                  <label className="text-[10px] font-black text-guepardo-accent uppercase tracking-[0.2em] flex items-center gap-2 mb-2 text-shadow-glow">
                    <Clock size={14} className="drop-shadow-glow" /> Horário da Programação
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      className="w-full px-4 py-3 bg-black/60 border-2 border-guepardo-accent/40 rounded-2xl text-sm font-black italic focus:outline-none focus:border-guepardo-accent focus:ring-4 focus:ring-guepardo-accent/10 transition-all text-white"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-guepardo-accent/60 font-black italic uppercase tracking-wider mt-2">
                    * O pedido aparecerá no Mural do Guepardo como Programado.
                  </p>
                </div>
              </div>
            )}

            {/* ERROR ALERTS (INSIDE THE FLOW) */}
            {isReturnRequired && (
              <div className="bg-guepardo-accent/5 border border-guepardo-accent/20 rounded-2xl p-4 flex items-start gap-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-8 h-8 bg-guepardo-accent/20 rounded-lg flex items-center justify-center text-guepardo-accent shrink-0">
                  <ArrowLeftRight size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-tight mb-1">Entrega com Retorno</p>
                  <p className="text-[10px] text-guepardo-accent font-black italic uppercase tracking-tighter">O motoboy deverá voltar ao estabelecimento.</p>
                </div>
              </div>
            )}

            {/* ALERTA DE CARTÃO */}
            {paymentMethod === 'CARD' && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 shrink-0">
                  <CreditCard size={16} />
                </div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Maquininha: Retorno ativado automaticamente</span>
              </div>
            )}
          </div>

          {/* ESTIMATE BREAKDOWN */}
          <div className="estimate-container bg-black/40 rounded-[1.5rem] border border-[#8B3A0F]/20 p-5 space-y-3 mt-4 relative overflow-hidden group/estimate">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover/estimate:bg-white/10 transition-colors"></div>

            {/* Taxa de saída */}
            <div className="flex justify-between items-center text-[10px] font-black text-white/20 uppercase tracking-[0.2em] relative z-10">
              <span>{isHybridFixedDriver ? 'Taxa Híbrido (Saída Fixo)' : `Taxa de saída (${isBatching ? 'Batching' : 'Simples'})`}:</span>
              <span className="text-white/40">{(isHybridFixedDriver ? 7.00 : (isBatching ? FREIGHT_BASE_BATCHING : FREIGHT_BASE_SIMPLE)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>

            {/* Paradas Adicionais Híbridas */}
            {isHybridFixedDriver && additionalStops.length > 0 && (
              <div className="flex justify-between items-center text-[10px] font-black text-white/20 uppercase tracking-[0.2em] relative z-10">
                <span>Paradas Adicionais ({additionalStops.length}):</span>
                <span className="text-white/40">{(7.00 * additionalStops.length).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            )}

            {/* Custo por distância */}
            {!isHybridFixedDriver && distanceMeters > 0 && (
              <div className="flex justify-between items-center text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] animate-in fade-in relative z-10">
                <span className="flex items-center gap-2">
                  <MapPin size={12} className="text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  {routeStats?.distanceText ?? `${(distanceMeters / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} km`}
                  {routeStats?.durationText ? ` (${routeStats.durationText})` : ''}
                </span>
                <span className="font-italic tracking-tighter text-blue-300">+ {(distanceMeters * FREIGHT_RATE_PER_METER).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            )}

            {/* Taxa de retorno */}
            {!isHybridFixedDriver && isReturnRequired && (
              <div className="flex justify-between items-center text-[10px] font-black text-guepardo-accent uppercase tracking-[0.2em] relative z-10">
                <span className="flex items-center gap-2">
                  <ArrowLeftRight size={12} className="text-guepardo-accent shadow-[0_0_10px_rgba(211,84,0,0.5)]" />
                  Retorno (KM):
                </span>
                <span className="font-italic tracking-tighter">+ {(returnFee || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-2 relative z-10">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total ao Cliente</span>
              <span className="text-2xl md:text-3xl font-black italic text-white tracking-tighter text-shadow-glow">
                {street && number ? (totalFreight || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ ****'}
              </span>
            </div>
          </div>

        </form>

        <div className="form-actions-wrapper flex flex-col sm:flex-row gap-4 pt-4 pb-12 md:pb-6">
          <button
            type="button"
            onClick={onToggleSelection}
            className={`form-action-btn h-14 rounded-2xl flex items-center justify-center transition-all border-2 relative overflow-hidden group/hardhat ${isSelecting
              ? 'bg-guepardo-accent text-white border-guepardo-accent shadow-glow animate-pulse w-full'
              : targetCourierId
                ? 'bg-guepardo-accent/20 text-guepardo-accent border-guepardo-accent/50 shadow-glow-sm w-full sm:w-14'
                : 'bg-black/40 text-white/20 border-white/5 hover:border-guepardo-accent/50 hover:text-white transition-all w-full sm:w-14'
              }`}
            title={isSelecting ? 'Selecione no Mapa' : 'Selecionar Guepardo no Mapa'}
          >
            <div className="absolute inset-0 bg-brand-gradient opacity-0 group-hover/hardhat:opacity-10 transition-opacity"></div>
            <div className="flex items-center gap-3 sm:gap-0">
                <HardHat size={28} strokeWidth={2.5} className="relative z-10" />
                <span className="sm:hidden font-black text-xs uppercase tracking-widest">Selecionar no Mapa</span>
            </div>
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !clientName || !street || !number}
            className={`form-action-btn flex-1 h-14 rounded-2xl font-black italic text-base flex items-center justify-center gap-3 transition-all transform active:scale-95 duration-200 shadow-2xl relative overflow-hidden group/chamar ${!clientName || !street || !number
              ? 'bg-black/40 text-white/5 cursor-not-allowed border border-white/5'
              : 'bg-brand-gradient text-white border border-[#8B3A0F]/50 shadow-[0_0_30px_rgba(211,84,0,0.4)] hover:shadow-[0_0_40px_rgba(211,84,0,0.6)] hover:brightness-110 active:brightness-90'
              }`}
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/chamar:opacity-20 transition-opacity"></div>
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span className="tracking-tighter text-shadow-glow">CHAMAR GUEPARDO</span>
                <Bike size={20} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform drop-shadow-glow" />
              </>
            )}
          </button>
        </div>

        <BalanceAlertModal 
          isOpen={showBalanceAlert}
          onClose={() => setShowBalanceAlert(false)}
          onRecharge={() => {
            setShowBalanceAlert(false);
            onNavigateToWallet?.();
          }}
          requiredAmount={totalFreight}
          currentBalance={balance}
        />

        <StoreClosedAlertModal
          isOpen={showStoreClosedAlert}
          onClose={() => setShowStoreClosedAlert(false)}
          onActivateStore={() => onToggleStatus?.('aberta')}
        />
      </div> {/* end collapsible */}
    </div>
  );
};
