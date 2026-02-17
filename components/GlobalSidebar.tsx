
import React from 'react';
import { LayoutDashboard, Bike, Users, History, Zap, Settings, MapPin } from 'lucide-react';

export type AppView = 'dashboard' | 'operational' | 'clients' | 'history' | 'settings';

interface GlobalSidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  hasActiveOrders: boolean;
}




export const GlobalSidebar: React.FC<GlobalSidebarProps> = ({ currentView, onChangeView, hasActiveOrders }) => {

  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'operational', label: 'Chamar Guepardo', icon: MapPin },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <nav className="w-20 bg-guepardo-accent border-r border-white/10 flex flex-col py-6 z-50 shrink-0 h-full transition-all duration-300 shadow-xl">

      {/* Navigation Items */}
      <div className="flex-1 w-full flex flex-col justify-center gap-4 px-3">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id as AppView)}
              className={`
                group relative w-full flex items-center justify-center p-3 rounded-xl transition-all duration-300
                ${isActive
                  ? 'bg-white text-guepardo-accent shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                }
              `}
              title={item.label}
            >
              <div className={`
                 relative flex items-center justify-center
                 transition-transform duration-300 group-hover:scale-110
              `}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'drop-shadow-sm' : ''} />

                {/* Active Order Badge */}
                {item.id === 'operational' && hasActiveOrders && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-guepardo-accent rounded-full animate-pulse shadow-sm"></span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
