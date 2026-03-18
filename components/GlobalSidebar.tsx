import React, { useState } from 'react';
import { LayoutDashboard, Bike, Users, History, Zap, Settings, MapPin, ChevronLeft, ChevronRight, Menu, Store, ChevronDown } from 'lucide-react';
import { StoreProfile } from '../types';

export type AppView = 'dashboard' | 'operational' | 'clients' | 'history' | 'wallet' | 'settings';

interface GlobalSidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  hasActiveOrders: boolean;
  storeProfile: StoreProfile;
  onToggleStatus?: (newStatus: 'aberta' | 'fechada') => void;
}

export const GlobalSidebar: React.FC<GlobalSidebarProps> = ({ currentView, onChangeView, hasActiveOrders, storeProfile, onToggleStatus }) => {
  const isOpen = storeProfile.status === 'aberta';
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'operational', label: 'Chamar Guepardo', icon: MapPin },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'wallet', label: 'Carteira', icon: Zap },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <nav className={`${isExpanded ? 'w-64' : 'w-20'} bg-brand-gradient-premium border-r border-white/10 flex flex-col py-6 z-50 shrink-0 h-full transition-all duration-300 shadow-xl relative`}>
      
      {/* BRAND LOGO AREA */}
      <div className={`px-4 mb-6 flex items-center transition-all duration-300 ${isExpanded ? 'justify-start ml-2' : 'justify-center'}`}>
        <div className="flex items-center gap-4">
          <img src="/cheetah-scooter.png" alt="Guepardo" className={`${isExpanded ? 'h-14' : 'h-12'} w-auto object-contain shrink-0 drop-shadow-lg transition-all duration-300`} />
          {isExpanded && (
            <div className="flex flex-col items-start whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 pr-2">
              <span className="text-white font-black italic text-2xl leading-none tracking-tighter">GUEPARDO</span>
              <span className="text-[#FF6B00] font-bold text-[10px] leading-none tracking-[0.2em] mt-1">DELIVERY</span>
            </div>
          )}
        </div>
      </div>

      {/* DIVIDER */}
      <div className="px-4 mb-6">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-24 w-6 h-6 bg-white rounded-full border border-white/10 flex items-center justify-center text-guepardo-rust shadow-md hover:scale-110 transition-transform z-[60]"
      >
        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Navigation Items */}
      <div className="flex-1 w-full flex flex-col gap-3 px-3">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <div key={item.id} className="relative flex items-center">
              {/* Left Indicator bar */}
              {isActive && (
                <div className="absolute -left-3 w-1.5 h-8 bg-[#FF6B00] rounded-r-full shadow-[0_0_12px_rgba(255,107,0,0.5)] animate-pulse" />
              )}
              
              <button
                onClick={() => onChangeView(item.id as AppView)}
                className={`
                  group relative w-full flex items-center p-3 rounded-2xl transition-all duration-300
                  ${isExpanded ? 'justify-start gap-4' : 'justify-center'}
                  ${isActive
                    ? 'bg-[#FF6B00] text-white shadow-xl shadow-[#FF6B00]/20 border-2 border-white/90 scale-105'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5 border border-transparent'
                  }
                `}
                title={!isExpanded ? item.label : undefined}
              >
                <div className={`
                   relative flex items-center justify-center shrink-0
                   transition-transform duration-300 group-hover:scale-110
                `}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'drop-shadow-md' : 'opacity-80'} />

                  {/* Active Order Badge */}
                  {item.id === 'operational' && hasActiveOrders && (
                    <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-[#FF6B00] rounded-full animate-pulse shadow-sm ${isExpanded ? 'translate-x-1 -translate-y-1' : ''}`}></span>
                  )}
                </div>

                {isExpanded && (
                  <span className={`font-bold text-sm whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 ${isActive ? 'text-white' : 'text-white/70'}`}>
                    {item.label}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      
      {/* BOTTOM MERCHANT WIDGET */}
      <div className={`mt-auto px-3 border-t border-white/10 pt-6 pb-2 transition-all duration-300 ${isExpanded ? 'opacity-100' : 'flex flex-col items-center'}`}>
        <div 
            onClick={() => onToggleStatus?.(isOpen ? 'fechada' : 'aberta')}
            className={`cursor-pointer transition-all duration-300 group ${isExpanded ? 'flex items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-2 hover:bg-black/60 shadow-lg' : 'w-12 h-12 flex items-center justify-center'}`}
        >
            {/* Status Avatar/Icon */}
            <div className={`shrink-0 rounded-full transition-all duration-500 overflow-hidden flex items-center justify-center ${isExpanded ? 'w-10 h-10' : 'w-12 h-12'} ${isOpen ? 'bg-green-500/10 border-2 border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-red-500/10 border-2 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}>
                <Store size={isExpanded ? 20 : 24} className={isOpen ? 'text-green-500 animate-pulse-slow' : 'text-red-500'} />
                {!isExpanded && (
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black animate-pulse ${isOpen ? 'bg-green-500 shadow-[0_0_8px_#22C55E]' : 'bg-red-500 shadow-[0_0_8px_#EF4444]'}`}></div>
                )}
            </div>

            {isExpanded && (
              <>
                <div className="flex-1 flex flex-col min-w-0">
                  <span className="text-white font-black text-sm leading-none truncate tracking-tight">{storeProfile.name}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[8px] font-black uppercase tracking-wider ${isOpen ? 'text-green-500' : 'text-red-500'}`}>
                      {isOpen ? 'Loja aberta' : 'Loja fechada'}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </div>
                </div>
                <ChevronDown size={14} className={`text-white/20 group-hover:text-white transition-all duration-300 ${!isOpen && 'rotate-180'}`} />
              </>
            )}
        </div>
      </div>
    </nav>
  );
};
