
import React, { useState, useRef, useEffect } from 'react';
import { DollarSign, MapPin, User, Bike, Clock, Search, Loader2, Home, Hash, FileText, FlaskConical, Phone, Star, AlertCircle, CreditCard, Banknote, QrCode, ArrowLeftRight } from 'lucide-react';
import { Order, Customer, SavedAddress } from '../types';
import { classifyClient } from '../utils/clientClassifier';

type OrderFormData = Omit<Order, 'id' | 'status' | 'createdAt' | 'estimatedPrice' | 'distanceKm' | 'events' | 'destinationLat' | 'destinationLng' | 'courier' | 'returnFee' | 'pickupCode'> & { isReturnRequired?: boolean };

interface DeliveryFormProps {
  onSubmit: (data: OrderFormData) => void;
  isSubmitting: boolean;
  existingCustomers: Customer[];
}

export const DeliveryForm: React.FC<DeliveryFormProps> = ({ onSubmit, isSubmitting, existingCustomers }) => {
  // Client & Payment
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Financial State
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARD' | 'CASH'>('PIX');
  const [deliveryValue, setDeliveryValue] = useState<string>('');
  const [changeFor, setChangeFor] = useState<string>('');

  // Logistics State
  const [isReturnRequired, setIsReturnRequired] = useState(false);

  // Address Structure
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [cityState, setCityState] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');

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
    if (!clientName || !street || !number) return;

    const fullAddress = `${street}, ${number}${complement ? ' - ' + complement : ''} - ${neighborhood}, ${cityState}`;

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
      isReturnRequired
    });

    // Reset form
    setClientName('');
    setClientPhone('');
    setCep('');
    setStreet('');
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
    if (value.replace(/\D/g, '').length === 8) fetchAddress(value.replace(/\D/g, ''));
  };

  const fetchAddress = async (cleanCep: string) => {
    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setStreet(data.logradouro);
        setNeighborhood(data.bairro);
        setCityState(`${data.localidade}/${data.uf}`);
        setTimeout(() => numberInputRef.current?.focus(), 100);
      } else {
        setStreet('');
        alert("CEP não encontrado!");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP", error);
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

  // --- FREIGHT CALCULATION LOGIC ---
  const baseFreight = street ? 8.50 + (street.length * 0.10) : 8.50;
  const returnFee = isReturnRequired ? baseFreight * 0.5 : 0;
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
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-guepardo-accent/10 rounded-lg text-guepardo-accent border border-guepardo-accent/20">
            <Bike size={16} strokeWidth={2.5} />
          </div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-none">Chamar Guepardo</h2>
        </div>
        <button
          onClick={fillTestData}
          type="button"
          className="text-[9px] bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded border border-gray-200 dark:border-white/10 flex items-center gap-1 transition-colors"
        >
          <FlaskConical size={10} /> Demo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* CUSTOMER SEARCH / NAME */}
        <div className="relative group/input z-50">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="text-gray-500 group-focus-within/input:text-guepardo-accent transition-colors" size={16} />
          </div>
          <input
            type="text"
            placeholder="Nome (Busca Automática)"
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-guepardo-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-guepardo-accent focus:ring-1 focus:ring-guepardo-accent/50 transition-all font-medium text-gray-900 dark:text-white placeholder-gray-500"
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
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-guepardo-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-guepardo-accent focus:ring-1 focus:ring-guepardo-accent/50 transition-all font-medium text-gray-900 dark:text-white placeholder-gray-500"
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
              className="w-full px-3 py-2 bg-gray-50 dark:bg-guepardo-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-guepardo-accent focus:ring-1 focus:ring-guepardo-accent/50 text-gray-900 dark:text-white placeholder-gray-500"
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
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none text-gray-500 dark:text-gray-400 cursor-not-allowed select-none"
              value={street}
              readOnly
              tabIndex={-1}
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
              className="w-full px-3 py-2 bg-gray-50 dark:bg-guepardo-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-guepardo-accent focus:ring-1 focus:ring-guepardo-accent/50 text-gray-900 dark:text-white placeholder-gray-500"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
            />
          </div>
          <div className="relative group/input flex-1">
            <input
              type="text"
              placeholder="Complemento"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-guepardo-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-guepardo-accent focus:ring-1 focus:ring-guepardo-accent/50 text-gray-900 dark:text-white placeholder-gray-500"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
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
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-guepardo-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-guepardo-accent focus:ring-1 focus:ring-guepardo-accent/50 font-bold text-gray-900 dark:text-white placeholder-gray-500"
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
              className="w-full px-3 py-2 bg-gray-50 dark:bg-guepardo-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold focus:outline-none focus:border-guepardo-accent focus:ring-1 focus:ring-guepardo-accent/50 text-gray-900 dark:text-gray-200 appearance-none"
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

        {/* FINANCEIROS - LINHA 2 (CONDICIONAL): TROCO E INFO */}
        {paymentMethod === 'CASH' && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="relative group/input">
              <input
                type="number"
                placeholder="Troco p/ quanto?"
                className="w-full px-3 py-2 bg-status-amber/10 border border-status-amber/30 rounded-lg text-sm focus:outline-none focus:border-status-amber focus:ring-1 focus:ring-status-amber/50 text-status-amber placeholder-status-amber/50"
                value={changeFor}
                onChange={(e) => setChangeFor(e.target.value)}
              />
            </div>
            {/* CALCULO AUTOMATICO */}
            <div className={`flex items-center justify-center rounded-lg border text-xs font-bold px-2 text-center leading-tight ${changeNeeded > 0
              ? 'bg-red-500/10 border-red-500/30 text-red-500'
              : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400'
              }`}>
              {changeNeeded > 0
                ? `LEVAR R$ ${changeNeeded.toFixed(2)}`
                : 'Sem troco'
              }
            </div>
          </div>
        )}

        {/* RETURN TRIP TOGGLE & ALERTS */}
        <div className="space-y-2 mt-1">
          {/* Toggle Switch for Return */}
          <label className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group">
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
        <div className="bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 p-3 space-y-1.5">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Frete Base:</span>
            <span>R$ {baseFreight.toFixed(2)}</span>
          </div>

          {isReturnRequired && (
            <div className="flex justify-between items-center text-xs text-guepardo-orange font-medium">
              <span className="flex items-center gap-1"><ArrowLeftRight size={10} /> Taxa Retorno (50%):</span>
              <span>+ R$ {returnFee.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-white/10 mt-1">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Total Previsto:</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">R$ {totalFreight.toFixed(2)}</span>
          </div>
        </div>

      </form>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !clientName || !street || !number}
        className={`w-full py-3 mt-4 rounded-lg font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 duration-200 ${!clientName || !street || !number
          ? 'bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
          : 'bg-brand-gradient text-white hover:brightness-110 shadow-guepardo-orange/30'
          }`}
      >
        {isSubmitting ? '...' : <>CHAMAR <Bike size={16} strokeWidth={2.5} /></>}
      </button>
    </div>
  );
};
