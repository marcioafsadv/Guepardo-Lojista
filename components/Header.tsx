import React, { useState } from 'react';
import { Bell, ChevronDown, Store, Zap } from 'lucide-react';
import { StoreProfile } from '../types';

interface HeaderProps {
    storeProfile: StoreProfile;
    notificationCount?: number;
    onToggleStatus?: (newStatus: 'aberta' | 'fechada') => void;
    onSelectView?: (view: any) => void;
    syncId?: number;
}

export const Header: React.FC<HeaderProps> = ({ storeProfile, notificationCount = 0, onToggleStatus, onSelectView, syncId = 0 }) => {
    const isOpen = storeProfile.status === 'aberta';

    const handleToggle = () => {
        if (onToggleStatus) {
            onToggleStatus(isOpen ? 'fechada' : 'aberta');
        }
    };

    return (
        <header className="h-20 bg-brand-gradient-premium border-b border-white/10 flex items-center justify-between px-6 shrink-0 relative z-40 transition-colors duration-300 shadow-sm">

            {/* LEFT SIDE (Empty to allow centering) */}
            <div className="flex-1" />

            {/* CENTER - MANTIDAMENTE VAZIO (Widget movido para a barra lateral) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
            </div>

            {/* RIGHT SIDE ACTIONS */}
            <div className="flex-1 flex items-center justify-end gap-4">
                
                {/* Wallet Balance Display - RELUZENTE STYLE & CLICKABLE */}
                <div 
                    key={`header-balance-${syncId}`}
                    onClick={() => onSelectView?.('wallet')}
                    className={`flex items-center gap-3 px-5 py-2.5 bg-black/80 backdrop-blur-xl border-2 border-[#FF6B00] rounded-2xl group cursor-pointer hover:bg-black transition-all shadow-[0_0_20px_rgba(255,107,0,0.25)] relative overflow-hidden ${syncId > 0 ? 'animate-balance-pulse' : ''}`}
                >
                    {/* Glowing highlight animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF6B00]/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    
                    <div className="p-2 bg-[#FF6B00] rounded-xl text-white shadow-[0_0_15px_rgba(255,107,0,0.4)] group-hover:scale-110 transition-transform">
                        <Zap size={18} className="fill-current" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] leading-none mb-1">Saldo</span>
                        <span className="text-lg font-black italic tracking-tighter text-white leading-none tabular-nums drop-shadow-[0_0_8px_rgba(255,107,0,0.3)]">
                            R$ {(storeProfile.wallet_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Notification Bell */}
                <button className="relative w-12 h-12 rounded-full bg-black/80 hover:bg-black border-2 border-white/5 hover:border-[#FF6B00]/50 flex items-center justify-center text-white transition-all group shadow-lg">
                    <Bell size={22} className="group-hover:rotate-12 transition-transform" />
                    {notificationCount > 0 && (
                        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-[#FF6B00] rounded-full border-2 border-black shadow-[0_0_8px_#FF6B00]"></span>
                    )}
                </button>
            </div>

        </header>
    );
};
