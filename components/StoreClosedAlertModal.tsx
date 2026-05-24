import React from 'react';
import { Store, AlertTriangle, ArrowRight, Zap } from 'lucide-react';

interface StoreClosedAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onActivateStore: () => void;
}

export const StoreClosedAlertModal: React.FC<StoreClosedAlertModalProps> = ({ 
    isOpen, 
    onClose, 
    onActivateStore 
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
                            <Store size={44} strokeWidth={1.5} />
                        </div>
                        <div className="absolute -top-2 -right-2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white border-4 border-[#1A0900] shadow-xl">
                            <AlertTriangle size={18} fill="white" />
                        </div>
                    </div>

                    {/* Text Content */}
                    <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-4">
                        LOJA <span className="text-guepardo-accent">FECHADA</span>
                    </h3>
                    
                    <p className="text-white/70 text-xs font-black uppercase tracking-[0.1em] leading-relaxed mb-8 max-w-[320px]">
                        Antes de realizar a solicitação ative a loja no canto inferior esquerdo.
                    </p>

                    {/* Actions */}
                    <div className="w-full flex flex-col gap-4">
                        <button
                            onClick={() => {
                                onActivateStore();
                                onClose();
                            }}
                            className="w-full h-16 bg-brand-gradient text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(211,84,0,0.3)] hover:shadow-[0_20px_40px_rgba(211,84,0,0.5)] hover:scale-[1.02] transition-all group active:scale-95"
                        >
                            <Zap size={16} fill="white" className="group-hover:scale-125 transition-transform" />
                            ATIVAR LOJA AGORA
                            <ArrowRight size={16} />
                        </button>
                        
                        <button
                            onClick={onClose}
                            className="w-full h-14 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all border border-transparent hover:border-white/10"
                        >
                            CANCELAR
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
