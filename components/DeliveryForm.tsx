
import React, { useState, useRef, useEffect } from 'react';
import { DollarSign, MapPin, User, Bike, Clock, Search, Loader2, Home, Hash, FileText, FlaskConical, Phone, Star, AlertCircle, CreditCard, Banknote, QrCode, ArrowLeftRight, CheckCheck, HardHat, ChevronDown, ChevronUp } from 'lucide-react';
import { Order, Customer, SavedAddress, RouteStats, StoreSettings, Courier, OrderStatus } from '../types';
import { classifyClient } from '../utils/clientClassifier';

export type OrderFormData = Omit<Order, 'id' | 'status' | 'createdAt' | 'estimatedPrice' | 'distanceKm' | 'events' | 'destinationLat' | 'destinationLng' | 'courier' | 'returnFee' | 'pickupCode'> & {
  isReturnRequired?: boolean;
  calculatedDistance?: number;
  calculatedEarnings?: number;
  targetCourierId?: string;
};

interface DeliveryFormProps {
  onSubmit: (data: OrderFormData) => void;
  isSubmitting: boolean;
  existingCustomers: Customer[];
  onAddressChange: (address: string) => void;
  routeStats: RouteStats | null;
  settings: StoreSettings;
  activeCouriersWithOrders?: Courier[];
  availableCouriers?: Courier[];
  allOrders?: Order[];
  isSelecting?: boolean;
  onToggleSelection?: () => void;
  externalTargetId?: string;
  onClearSelection?: () => void;
}

export const DeliveryForm: React.FC<DeliveryFormProps> = ({
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
  onClearSelection
}) => {
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Client & Payment
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Financial State
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARD' | 'CASH'>('PIX');
  const [deliveryValue, setDeliveryValue] = useState<string>('');
  const [changeFor, setChangeFor] = useState<string>('');

  // Logistics State
  const [isReturnRequired, setIsReturnRequired] = useState(false);

  // Listener for auto-fill from WhatsApp/Order Hub
  useEffect(() => {
    const handleAutoFill = (e: any) => {
      const order = e.detail;
      if (order) {
        if (order.clientName) setClientName(order.clientName);
        if (order.clientPhone) setClientPhone(order.clientPhone);
        if (order.deliveryValue) setDeliveryValue(String(order.deliveryValue)); // Ensure it's a string
        if (order.destination) {
          // If address looks like a street, try to set street name
          const parts = order.destination.split(',');
          if (parts.length > 0) setStreet(parts[0].trim());
          if (parts.length > 1) {
            const numPart = parts[1].trim().match(/\d+/);
            if (numPart) setNumber(numPart[0]);
          }
          // Attempt to parse other address components if available in order.destination
          // This is a basic attempt and might need more robust parsing for real-world addresses
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

  // Sync external target changes (from Map selection)
  useEffect(() => {
    setTargetCourierId(externalTargetId || '');
  }, [externalTargetId]);

  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customerNote, setCustomerNote] = useState<string | null>(null);

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
    if (paymentMethod === 'CARD') {
      setIsReturnRequired(true);
    }
    // Note: We don't auto-disable if switching away from CARD, to respect manual user choice
  }, [paymentMethod]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📝 [DeliveryForm] handleSubmit triggered", { clientName, street, number, targetCourierId });

    if (!clientName || !street || !number) {
      console.warn("⚠️ [DeliveryForm] Missing required fields, aborting submit");
      return;
    }

    const fullAddress = `${street}, ${number}${complement ? ' - ' + complement : ''} - ${neighborhood}, ${cityState}`;

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
      deliveryValue: parseFloat(deliveryValue) || 0,
      paymentMethod,
      changeFor: paymentMethod === 'CASH' && changeFor ? parseFloat(changeFor) : null,
      isReturnRequired,
      // Pass calculated values to parent
      calculatedDistance: routeStats?.distanceValue ? routeStats.distanceValue / 1000 : 1.2,
      calculatedEarnings: totalFreight,
      targetCourierId: targetCourierId || undefined
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
    setNeighborhood('');
    setCityState('');
    setNumber('');
    setComplement('');
    setChangeFor('');
    setDeliveryValue('');
    setPaymentMethod('PIX');
    setCustomerNote(null);
    setIsReturnRequired(false);
  };


  // --- ADDRESS CHANGE DEBOUNCER ---
  useEffect(() => {
    // Only trigger if we have at least Street
    const timer = setTimeout(() => {
      if (street) {
        // If number is missing, use a generic "S/N" (Sem Número) to allow geocoding the street/CEP area
        const searchNumber = number || 'S/N';
        const full = `${street}, ${searchNumber} - ${cityState}`;
        console.log("📡 [DeliveryForm] Debouncer triggered, sending address to map:", full);
        onAddressChange(full);
      } else {
        console.log("📡 [DeliveryForm] Debouncer: empty street, clearing map");
        onAddressChange('');
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [street, number, cityState, onAddressChange]);

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

  const calculateTieredFreight = (distanceKm: number) => {
    if (distanceKm <= 2) return 7.50;
    if (distanceKm <= 3) return 8.00;
    if (distanceKm <= 3.5) return 8.50;
    if (distanceKm <= 4) return 9.00;
    if (distanceKm <= 4.5) return 10.00;
    if (distanceKm <= 5) return 12.00;
    if (distanceKm <= 6) return 14.00;
    if (distanceKm <= 7) return 16.00;
    if (distanceKm <= 8) return 18.00;
    if (distanceKm <= 9) return 20.00;
    if (distanceKm <= 10) return 22.00;
    // Fallback para > 10km: R$ 22.00 + R$ 2.00 por km adicional
    return 22.00 + Math.ceil(distanceKm - 10) * 2;
  };

  const calculateBaseFreight = () => {
    const distanceKm = routeStats?.distanceValue ? routeStats.distanceValue / 1000 : 0;
    const tieredFee = calculateTieredFreight(distanceKm);

    if (targetCourierId) {
      // Regra de Batching: desconto de 25% sobre a taxa, mantendo o mínimo da primeira faixa
      return Math.max(7.50, tieredFee * 0.75);
    }

    return tieredFee;
  };

  const baseFreight = calculateBaseFreight();
  const returnFeeActive = settings.returnFeeActive ?? true;
  const returnFee = (isReturnRequired && returnFeeActive) ? baseFreight * 0.5 : 0;
  const totalFreight = baseFreight + returnFee;

  // Calculate change needed
  const calculateChangeNeeded = () => {
    if (paymentMethod !== 'CASH' || !deliveryValue || !changeFor) return 0;
    const val = parseFloat(deliveryValue);
    const pay = parseFloat(changeFor);
    return pay > val ? pay - val : 0;
  };

  const changeNeeded = calculateChangeNeeded();

  return (
    <div className="w-full flex flex-col relative" ref={wrapperRef}>

      {/* COMPACT HEADER */}
      <div
        className="flex items-center justify-between mb-4 pb-2 border-b border-warm-200 dark:border-white/10 cursor-pointer select-none"
        onClick={() => setIsFormCollapsed(prev => !prev)}
        title={isFormCollapsed ? 'Expandir formulário' : 'Minimizar formulário'}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-guepardo-accent/10 rounded-lg text-guepardo-accent border border-guepardo-accent/20">
            <Bike size={16} strokeWidth={2.5} />
          </div>
          <h2 className="text-sm font-bold text-warm-800 dark:text-white leading-none">Chamar Guepardo</h2>
        </div>
        <button
          type="button"
          className="p-1 rounded-md text-warm-500 dark:text-white/50 hover:text-guepardo-accent hover:bg-guepardo-accent/10 transition-all duration-200"
          aria-label={isFormCollapsed ? 'Expandir' : 'Minimizar'}
        >
          {isFormCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* COLLAPSIBLE CONTENT */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isFormCollapsed ? 0 : '9999px', opacity: isFormCollapsed ? 0 : 1 }}
      >
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* CUSTOMER SEARCH / NAME */}
          <div className="relative group/input z-50">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="text-gray-500 group-focus-within/input:text-guepardo-accent transition-colors" size={16} />
            </div>
            <input
              type="text"
              placeholder="Nome (Busca Automática)"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-warm-800 border border-warm-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium text-warm-800 dark:text-white placeholder-warm-500"
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
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="text-gray-500 group-focus-within/input:text-guepardo-accent transition-colors" size={16} />
            </div>
            <input
              type="tel"
              placeholder="Telefone / WhatsApp"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-warm-800 border border-warm-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium text-warm-800 dark:text-white placeholder-warm-500"
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
          <div className="flex gap-2">
            <div className="relative group/input w-1/3 min-w-[90px]">
              <input
                type="text"
                placeholder="CEP"
                className="w-full px-3 py-2 bg-white dark:bg-warm-800 border border-warm-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-warm-800 dark:text-white placeholder-warm-500"
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
                className="w-full px-3 py-2 bg-white dark:bg-warm-800 border border-warm-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-warm-800 dark:text-white placeholder-warm-500"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
              />
            </div>
          </div>

          {/* ADDRESS ROW 2 */}
          <div className="flex gap-2">
            <div className="relative group/input w-1/4">
              <input
                ref={numberInputRef}
                type="text"
                placeholder="Nº"
                className="w-full px-3 py-2 bg-white dark:bg-warm-800 border border-warm-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-warm-800 dark:text-white placeholder-warm-500"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
            </div>
            <div className="relative group/input flex-1">
              <input
                type="text"
                placeholder="Comp (apto, bloco...)"
                className="w-full px-3 py-2 bg-white dark:bg-warm-800 border border-warm-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-warm-800 dark:text-white placeholder-warm-500"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
              />
            </div>
          </div>

          {/* ADDRESS ROW 3: Neighborhood & City (Visible fallback) */}
          <div className="flex gap-2">
            <div className="relative group/input flex-1">
              <input
                type="text"
                placeholder="Bairro"
                className="w-full px-3 py-2 bg-white dark:bg-warm-800 border border-warm-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-warm-800 dark:text-white placeholder-warm-500"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                required
              />
            </div>
            <div className="relative group/input w-1/3">
              <input
                type="text"
                placeholder="Cidade/UF"
                className="w-full px-3 py-2 bg-white dark:bg-warm-800 border border-warm-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-warm-800 dark:text-white placeholder-warm-500"
                value={cityState}
                onChange={(e) => setCityState(e.target.value)}
                required
              />
            </div>
          </div>

          {/* FINANCEIROS - LINHA 1: VALOR E METODO */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-xs font-bold">R$</span>
              </div>
              <input
                type="number"
                placeholder="Valor"
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-guepardo-gray-800 border border-stone-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-bold text-stone-800 dark:text-white placeholder-stone-500"
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
                className="w-full px-3 py-2 bg-white dark:bg-guepardo-gray-800 border border-stone-300 dark:border-white/10 rounded-lg text-xs font-bold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-stone-800 dark:text-gray-200 appearance-none"
              >
                <option value="PIX">PIX</option>
                <option value="CARD">Cartão (Maq.)</option>
                <option value="CASH">Dinheiro</option>
              </select>
              {/* Custom Arrow */}
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-gray-500"></div>
              </div>
            </div>
          </div>

          {/* CAMPO DE TROCO - APARECE APENAS EM DINHEIRO */}
          {paymentMethod === 'CASH' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-extrabold text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                      <Banknote size={12} /> Troco para quanto?
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-orange-500 text-xs font-bold">R$</span>
                      </div>
                      <input
                        type="number"
                        placeholder="Ex: 50.00"
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-guepardo-gray-800 border-2 border-orange-200 dark:border-orange-900/50 rounded-lg text-sm font-bold focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-stone-800 dark:text-white placeholder-orange-300"
                        value={changeFor}
                        onChange={(e) => setChangeFor(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right pt-4">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter leading-none mb-1">Troco Total</p>
                    <p className={`text-lg font-black leading-none ${changeNeeded > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-stone-300'}`}>
                      R$ {changeNeeded.toFixed(2)}
                    </p>
                  </div>
                </div>
                {changeNeeded > 0 && (
                  <p className="text-[9px] text-orange-600/80 dark:text-orange-400/80 font-medium italic">
                    * O entregador deverá levar R$ {changeNeeded.toFixed(2)} em espécie.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* DIRECIONAR PARA ENTREGADOR (SELETOR) */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-stone-500 dark:text-white/30 uppercase tracking-wider flex items-center gap-2">
              <User className="w-3 h-3" />
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
                className={`w-full px-3 py-2 border rounded-lg text-xs font-bold focus:outline-none transition-all appearance-none ${targetCourierId
                  ? 'bg-guepardo-accent/10 border-guepardo-accent text-guepardo-accent shadow-sm'
                  : 'bg-white dark:bg-warm-800 border-warm-300 dark:border-white/10 text-warm-500 dark:text-gray-400'
                  }`}
              >
                <optgroup label="🚀 Chamada Geral" className="text-gray-900 bg-white">
                  <option value="">Enviar p/ Todos (Painel de Ofertas)</option>
                </optgroup>

                {availableCouriers.length > 0 && (
                  <optgroup label="📍 Disponíveis (Direto)" className="text-gray-900 bg-white">
                    {availableCouriers.map(courier => (
                      <option key={courier.id} value={courier.id}>
                        Guepardo: {courier.name} ({courier.vehiclePlate})
                      </option>
                    ))}
                  </optgroup>
                )}

                {activeCouriersWithOrders.length > 0 && (
                  <optgroup label="👤 Em Rota / Batching (Adicionar)" className="text-gray-900 bg-white">
                    {activeCouriersWithOrders
                      .filter(courier => {
                        const courierOrders = allOrders.filter(o => o.courier?.id === courier.id);
                        return courierOrders.every(o => o.status !== OrderStatus.IN_TRANSIT && o.status !== OrderStatus.RETURNING);
                      })
                      .map(courier => (
                        <option key={courier.id} value={courier.id}>
                          {courier.name} - Adicionar à Rota
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              {targetCourierId && (
                <p className="text-[10px] text-guepardo-accent font-bold flex items-center gap-1">
                  <CheckCheck size={10} /> Chamada será direcionada exclusivamente ao Guepardo selecionado.
                </p>
              )}
            </div>
          </div>

          {/* RETURN TRIP TOGGLE & ALERTS */}
          <div className="space-y-2 mt-1">
            {/* Toggle Switch for Return */}
            <label className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-white/5 border border-warm-300 dark:border-white/10 cursor-pointer hover:bg-warm-50 dark:hover:bg-white/10 transition-colors group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isReturnRequired}
                  onChange={(e) => setIsReturnRequired(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-9 h-5 rounded-full shadow-inner transition-colors duration-200 ${isReturnRequired ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isReturnRequired ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
              <div className="flex-1">
                <p className={`text-xs font-bold ${isReturnRequired ? 'text-orange-700 dark:text-orange-400' : 'text-gray-500 dark:text-gray-300'}`}>Necessita Retorno à Loja?</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-none">Ex: Maquininha, Recibo Assinado, Troca</p>
              </div>
            </label>

            {/* Price Alert: Return Required */}
            {isReturnRequired && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 rounded-lg p-2.5 flex items-start gap-2 animate-in fade-in">
                <ArrowLeftRight size={14} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-orange-800 dark:text-orange-300 leading-tight">Entrega com Retorno (+50%)</p>
                  <p className="text-[9px] text-orange-700 dark:text-orange-400/80">O motoboy deverá voltar ao estabelecimento.</p>
                </div>
              </div>
            )}

            {/* ALERTA DE CARTÃO */}
            {paymentMethod === 'CARD' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg p-2 flex items-center gap-2 animate-in fade-in">
                <CreditCard size={14} className="text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300">Maquininha: Retorno ativado automaticamente</span>
              </div>
            )}
          </div>

          {/* ESTIMATE BREAKDOWN */}
          <div className="bg-warm-200/50 dark:bg-white/5 rounded-lg border border-warm-200 dark:border-white/10 p-3 space-y-1.5">
            <div className="flex justify-between items-center text-xs text-warm-500">
              <span>Estimativa de Frete:</span>
              <span>R$ {(baseFreight || 0).toFixed(2)}</span>
            </div>

            {isReturnRequired && (
              <div className="flex justify-between items-center text-xs text-guepardo-orange font-medium">
                <span className="flex items-center gap-1"><ArrowLeftRight size={10} /> Taxa Retorno (50%):</span>
                <span>+ R$ {(returnFee || 0).toFixed(2)}</span>
              </div>
            )}

            {/* DYNAMIC ROUTE STATS */}
            {routeStats && (
              <div className="flex justify-between items-center text-xs text-blue-600 dark:text-blue-400 font-medium animate-in fade-in">
                <span className="flex items-center gap-1"><MapPin size={10} /> Distância:</span>
                <span>{routeStats.distanceText} ({routeStats.durationText})</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-warm-200 dark:border-white/10 mt-1">
              <span className="text-xs font-bold text-warm-800 dark:text-gray-300">Total Previsto:</span>
              <span className="text-xl font-extrabold text-warm-900 dark:text-white">
                {street && number ? `R$ ${(totalFreight || 0).toFixed(2)}` : 'R$ ****'}
              </span>
            </div>
          </div>

        </form>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleSelection}
            className={`w-12 h-12 mt-4 rounded-lg flex items-center justify-center transition-all border-2 ${isSelecting
              ? 'bg-orange-500 text-white border-orange-600 shadow-lg shadow-orange-500/30 animate-pulse'
              : targetCourierId
                ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 border-orange-500 shadow-sm'
                : 'bg-white dark:bg-warm-800 text-orange-600 border-orange-200 dark:border-orange-500/30 hover:bg-orange-50 dark:hover:bg-orange-500/10'
              }`}
            title={isSelecting ? 'Selecione no Mapa' : 'Selecionar Guepardo no Mapa'}
          >
            <HardHat size={24} strokeWidth={isSelecting || targetCourierId ? 2.5 : 2} />
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !clientName || !street || !number}
            className={`flex-1 py-3 mt-4 rounded-lg font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 duration-200 ${!clientName || !street || !number
              ? 'bg-warm-100 dark:bg-white/5 text-warm-500 dark:text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-orange-600 hover:bg-orange-700 text-white hover:brightness-110 shadow-orange-500/30'
              }`}
          >
            {isSubmitting ? '...' : <>CHAMAR <Bike size={16} strokeWidth={2.5} /></>}
          </button>
        </div>
      </div> {/* end collapsible */}
    </div>
  );
};
