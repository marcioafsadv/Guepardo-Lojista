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
        <header className="shrink-0 relative z-40 transition-colors duration-300 shadow-sm" style={{ background: 'linear-gradient(135deg, #8B3A0F 0%, #1A0900 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

            {/* ─── DESKTOP HEADER ─────────────────────────────────────── */}
            <div className="hidden md:flex h-20 items-center justify-between px-6">
                {/* LEFT SIDE */}
                <div className="flex-1" />

                {/* CENTER */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50" />

                {/* RIGHT SIDE ACTIONS */}
                <div className="flex-1 flex items-center justify-end gap-4">
                    {/* Wallet Balance */}
                    <div
                        key={`header-balance-${syncId}`}
                        onClick={() => onSelectView?.('wallet')}
                        className={`flex items-center gap-3 px-5 py-2.5 bg-black/80 backdrop-blur-xl border-2 border-[#FF6B00] rounded-2xl group cursor-pointer hover:bg-black transition-all shadow-[0_0_20px_rgba(255,107,0,0.25)] relative overflow-hidden ${syncId > 0 ? 'animate-balance-pulse' : ''}`}
                    >
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
            </div>

            {/* ─── MOBILE HEADER ─────────────────────────────────────── */}
            <div className="flex md:hidden h-14 items-center justify-between px-4">

                {/* LEFT: Logo + Store name */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <img
                        src="/cheetah-scooter.png"
                        alt="Guepardo"
                        className="h-8 w-auto object-contain shrink-0"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(255,107,0,0.5))' }}
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="text-white font-black italic text-sm leading-none tracking-tighter truncate">GUEPARDO</span>
                        <span className="text-[#FF6B00] font-bold text-[8px] leading-none tracking-[0.2em]">ESTABELECIMENTO</span>
                    </div>
                </div>

                {/* RIGHT: Compact wallet + Status dot */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Store status indicator */}
                    <button
                        onClick={handleToggle}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all active:scale-95"
                        style={{
                            background: isOpen ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            borderColor: isOpen ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                        }}
                    >
                        <span
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ background: isOpen ? '#22C55E' : '#EF4444', boxShadow: isOpen ? '0 0 6px #22C55E' : '0 0 6px #EF4444' }}
                        />
                        <span
                            className="text-[10px] font-black uppercase tracking-wide"
                            style={{ color: isOpen ? '#22C55E' : '#EF4444' }}
                        >
                            {isOpen ? 'Aberta' : 'Fechada'}
                        </span>
                    </button>

                    {/* Compact wallet balance */}
                    <button
                        key={`mobile-balance-${syncId}`}
                        onClick={() => onSelectView?.('wallet')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#FF6B00] bg-black/60 active:scale-95 transition-all ${syncId > 0 ? 'animate-balance-pulse' : ''}`}
                    >
                        <Zap size={13} className="text-[#FF6B00] fill-current shrink-0" />
                        <span className="text-white font-black text-sm tabular-nums leading-none">
                            R$ {(storeProfile.wallet_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </button>
                </div>
            </div>
        </header>
    );
};
