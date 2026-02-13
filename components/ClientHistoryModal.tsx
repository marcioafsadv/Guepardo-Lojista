
import React from 'react';
import { Customer } from '../types';
import { X, Phone, MapPin, Clock, Calendar, Crown, Star, ShieldCheck, StickyNote, TrendingUp, History, ExternalLink } from 'lucide-react';

interface ClientHistoryModalProps {
  customer: Customer | null;
  onClose: () => void;
  onStartOrder?: (customer: Customer) => void;
}

export const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({ customer, onClose, onStartOrder }) => {
  if (!customer) return null;

  // Helper for Loyalty Badge (Moved from Sidebar to here)
  const getLoyaltyBadge = (count: number) => {
    if (count >= 10) return { label: 'Cliente Ouro', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Crown size={14} fill="currentColor" /> };
    if (count >= 5) return { label: 'Frequente', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Star size={14} fill="currentColor" /> };
    return { label: 'Novo Cliente', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: <ShieldCheck size={14} /> };
  };

  const badge = getLoyaltyBadge(customer.totalOrders);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-end sm:justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity">
      <div
        className="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right sm:slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-900 text-white p-6 flex justify-between items-start shrink-0">
          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 border ${badge.color.replace('bg-', 'bg-opacity-20 ')} bg-white/10`}>
              {badge.icon}
              <span className="text-white">{badge.label}</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight">{customer.name}</h2>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-300">
              <Phone size={14} />
              <span className="font-mono">{customer.phone || 'Sem telefone cadastrado'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">

          {/* 1. Dashboard de Métricas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
              <span className="text-gray-400 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                <TrendingUp size={12} /> Total de Pedidos
              </span>
              <span className="text-3xl font-bold text-gray-900">{customer.totalOrders}</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
              <span className="text-gray-400 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                <Clock size={12} /> Espera Média
              </span>
              <span className={`text-3xl font-bold ${customer.averageWaitTime > 5 ? 'text-red-500' : 'text-green-600'}`}>
                {customer.averageWaitTime.toFixed(0)}<span className="text-sm text-gray-400">min</span>
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center col-span-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={14} />
                Última compra em: <span className="font-bold text-gray-800">{customer.lastOrderDate.toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* 2. Observações Fixas (Important) */}
          {customer.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg text-yellow-700 shrink-0">
                <StickyNote size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-yellow-800 uppercase mb-1">Observação Fixa</h4>
                <p className="text-sm text-yellow-900 leading-snug">"{customer.notes}"</p>
              </div>
            </div>
          )}

          {/* 3. Endereços Salvos */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
              <MapPin size={14} /> Endereços Cadastrados
            </h3>
            <div className="space-y-2">
              {customer.addresses.map((addr, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 flex items-start gap-3">
                  <div className="mt-1 text-gray-300">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {addr.street}, {addr.number}
                    </p>
                    <p className="text-xs text-gray-500">
                      {addr.neighborhood} - {addr.city}
                    </p>
                    {addr.complement && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded border border-gray-200">
                        {addr.complement}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm"
          >
            Fechar
          </button>
          {onStartOrder && (
            <button
              onClick={() => {
                onStartOrder(customer);
                onClose();
              }}
              className="flex-[2] py-3 bg-brand-dark text-guepardo-accent hover:text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <ExternalLink size={16} />
              Iniciar Novo Pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
