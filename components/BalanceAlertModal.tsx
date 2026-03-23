
import React from 'react';
import { Wallet, AlertTriangle, X, ArrowRight, Zap } from 'lucide-react';

interface BalanceAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRecharge: () => void;
    requiredAmount: number;
    currentBalance: number;
}

export const BalanceAlertModal: React.FC<BalanceAlertModalProps> = ({ 
    isOpen, 
    onClose, 
    onRecharge, 
    requiredAmount, 
    currentBalance 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop with extreme blur */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-500"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-[440px] bg-[#1A0900] border border-[#8B3A0F]/30 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                {/* Premium Shine Effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-guepardo-accent to-transparent opacity-50"></div>
                
                <div className="p-10 flex flex-col items-center text-center">
                    {/* Header Icon */}
                    <div className="relative mb-8">
                        <div className="w-24 h-24 bg-guepardo-accent/10 rounded-[2rem] flex items-center justify-center text-guepardo-accent border border-guepardo-accent/20 shadow-glow-sm">
                            <Wallet size={44} strokeWidth={1.5} />
                        </div>
                        <div className="absolute -top-2 -right-2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white border-4 border-[#1A0900] shadow-xl">
                            <AlertTriangle size={18} fill="white" />
                        </div>
                    </div>

                    {/* Text Content */}
                    <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-4">
                        SALDO <span className="text-guepardo-accent">INSUFICIENTE</span>
                    </h3>
                    
                    <p className="text-white/50 text-xs font-bold uppercase tracking-[0.2em] leading-loose mb-10 max-w-[280px]">
                        Você não possui créditos suficientes para completar esta solicitação.
                    </p>

                    {/* Value Breakdown */}
                    <div className="w-full grid grid-cols-2 gap-4 mb-10">
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-5 text-left">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Custo da Entrega</p>
                            <p className="text-lg font-black italic text-white tracking-tighter">R$ {requiredAmount.toFixed(2)}</p>
                        </div>
                        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 text-left relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-12 h-12 bg-red-500/10 rounded-full -mr-6 -mt-6 blur-lg"></div>
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Seu Saldo Atual</p>
                            <p className="text-lg font-black italic text-red-400 tracking-tighter">R$ {currentBalance.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="w-full flex flex-col gap-4">
                        <button
                            onClick={onRecharge}
                            className="w-full h-16 bg-brand-gradient text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(211,84,0,0.3)] hover:shadow-[0_20px_40px_rgba(211,84,0,0.5)] hover:scale-[1.02] transition-all group active:scale-95"
                        >
                            <Zap size={16} fill="white" className="group-hover:scale-125 transition-transform" />
                            RECARREGAR AGORA
                            <ArrowRight size={16} />
                        </button>
                        
                        <button
                            onClick={onClose}
                            className="w-full h-14 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all border border-transparent hover:border-white/10"
                        >
                            TALVEZ DEPOIS
                        </button>
                    </div>

                    <p className="mt-8 text-[9px] font-black text-white/20 uppercase tracking-widest">
                        Guepardo Logística © 2026
                    </p>
                </div>
            </div>
        </div>
    );
};
