import React, { useState } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { StoreProfile } from '../types';

interface HeaderProps {
    storeProfile: StoreProfile;
    notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ storeProfile, notificationCount = 0 }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <header className="h-20 bg-guepardo-accent border-b border-white/10 flex items-center justify-between px-6 shrink-0 relative z-40 transition-colors duration-300 shadow-sm">

            <div className="flex items-center gap-8">


                {/* CLIENT WIDGET (Padaria Rebeca) */}
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-3 border rounded-full py-1.5 pl-1.5 pr-4 transition-all cursor-pointer group select-none
                    ${isOpen
                            ? 'bg-white/10 hover:bg-white/20 border-white/10 hover:border-white/20'
                            : 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30 hover:border-red-500/40' // Closed State Style
                        }`}
                >
                    {/* Client Logo/Avatar */}
                    <div className={`w-8 h-8 rounded-full border-2 overflow-hidden relative transition-colors ${isOpen ? 'bg-white border-white/20' : 'bg-red-900/50 border-red-500/50 grayscale'}`}>
                        <img
                            src="https://ui-avatars.com/api/?name=Padaria+Rebeca&background=1E1E1E&color=D35400"
                            alt="Store Logo"
                            className={`w-full h-full object-cover transition-all ${!isOpen && 'opacity-50'}`}
                        />
                    </div>

                    {/* Client Info */}
                    <div className="flex flex-col">
                        <span className={`text-sm font-bold leading-none transition-colors text-shadow-sm ${isOpen ? 'text-white group-hover:text-white' : 'text-red-100'}`}>
                            {storeProfile.name}
                        </span>
                        <span className={`text-[10px] flex items-center gap-1 mt-0.5 font-medium ${isOpen ? 'text-white/90' : 'text-red-200'}`}>
                            {isOpen ? 'Loja aberta' : 'Loja fechada'}
                            <span className={`w-1.5 h-1.5 rounded-full ml-0.5 shadow-glow-sm ${isOpen ? 'bg-white animate-pulse' : 'bg-red-500'}`}></span>
                        </span>
                    </div>

                    {/* Dropdown Icon */}
                    <ChevronDown size={14} className={`ml-2 transition-transform duration-300 ${isOpen ? 'text-white/70 group-hover:text-white' : 'text-red-300 rotate-180'}`} />
                </div>
            </div>

            {/* CENTER BRAND LOGO */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-auto flex items-center justify-center group cursor-pointer">
                <div className="relative h-full w-auto flex items-center">
                    <div className="absolute inset-0 bg-white/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 w-[120%] -left-[10%]"></div>
                    <img src="/guepardo-logo-v2.jpg" alt="Guepardo Delivery" className="h-full w-auto object-contain transform group-hover:scale-105 transition-transform duration-300 drop-shadow-md" />
                </div>
            </div>

            {/* RIGHT SIDE ACTIONS */}
            <div className="flex items-center gap-4">
                {/* TEMP WIZARD BUTTON */}
                <button
                    onClick={() => window.location.href = '/cadastro'}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs font-bold border border-white/20 transition-all uppercase tracking-wider"
                >
                    Testar Cadastro
                </button>

                {/* Notification Bell */}
                <button className="relative w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white hover:text-white transition-colors border border-transparent hover:border-white/10 group">
                    <Bell size={20} />
                    {notificationCount > 0 && (
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-white rounded-full border border-guepardo-accent shadow-sm"></span>
                    )}
                </button>
            </div>

        </header>
    );
};
