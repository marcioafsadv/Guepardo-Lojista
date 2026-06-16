import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { X, AlertTriangle, Trash2, Info, DollarSign, Clock, ShieldCheck, CheckCircle2, ChevronRight, Slash } from 'lucide-react';

interface CancellationModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (orderId: string, reason: string) => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({ order, onClose, onConfirm }) => {
    const [reason, setReason] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');
    const [now, setNow] = useState<Date>(new Date());

    // Sync clock for real-time timer
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    if (!order) return null;

    const reasons = [
        "Demora na busca do entregador",
        "Motoboy não chegou ao estabelecimento",
        "Cliente desistiu do pedido",
        "Erro no cadastro do pedido",
        "Outro motivo"
    ];

    // Business Logic
    const isPostAcceptance = [
        OrderStatus.ACCEPTED, 
        OrderStatus.ARRIVED_AT_STORE, 
        OrderStatus.READY_FOR_PICKUP, 
        OrderStatus.IN_TRANSIT
    ].includes(order.status);

    const minutesElapsed = useMemo(() => {
        if (!order.acceptedAt) return 0;
        const acceptedTime = new Date(order.acceptedAt).getTime();
        return Math.floor((now.getTime() - acceptedTime) / 60000);
    }, [order.acceptedAt, now]);

    const isLate = minutesElapsed >= 15;
    const isPlausibleReason = ["Demora na busca do entregador", "Motoboy não chegou ao estabelecimento"].includes(reason);
    
    // Fee = 4.90 unless it's before acceptance, or courier is late, or reason is valid
    const cancellationFee = useMemo(() => {
        if (!isPostAcceptance) return 0;
        if (isLate) return 0;
        if (isPlausibleReason) return 0;
        return 4.90;
    }, [isPostAcceptance, isLate, isPlausibleReason]);

    const handleSubmit = () => {
        const finalReason = reason === "Outro motivo" ? customReason : reason;
        if (!finalReason) return;
        onConfirm(order.id, finalReason);
    };

    return (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 overflow-y-auto animate-in fade-in duration-500">
            {/* Main Modal Container: Deep Cocoa */}
            <div className="bg-[#0D0400] w-full max-w-lg rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] overflow-hidden relative border border-white/10 ring-1 ring-orange-500/20 my-auto">
                
                {/* Neon Orange Top Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent blur-[1px]" />

                {/* Header: High Impact */}
                <div className="p-6 md:p-10 pb-4 flex items-start justify-between relative shrink-0">
                    <div className="flex items-start gap-4 md:gap-6">
                        <div className="bg-orange-600/10 p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] text-orange-500 shadow-[0_0_30px_rgba(255,122,0,0.15)] border border-orange-500/20 group">
                            <Slash className="rotate-45 group-hover:rotate-[225deg] transition-transform duration-700 w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-4xl font-black italic text-white leading-none uppercase tracking-tighter">
                                Cancelar <br />
                                <span className="text-orange-500 text-shadow-glow">Solicitação</span>
                            </h2>
                            <div className="flex items-center gap-3 mt-3 md:mt-4">
                                <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border border-white/5">OS #{order.id.slice(-4)}</span>
                                <span className="text-white/10 italic text-sm">/</span>
                                <span className="text-sm font-bold text-white/50">{order.clientName}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 md:p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/30 hover:text-white border border-white/5 shadow-xl"
                    >
                        <X className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                <div className="px-6 md:px-10 pb-6 md:pb-10 space-y-6 md:space-y-8">

                    {/* 1. Ultra-Premium Glass Financial Panel */}
                    <div className={`rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border transition-all duration-700 relative overflow-hidden ${
                        cancellationFee > 0 
                        ? 'bg-gradient-to-br from-orange-600/10 to-transparent border-orange-500/20' 
                        : 'bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/20'
                    }`}>
                        
                        {/* Background subtle glow */}
                        <div className={`absolute -right-20 -bottom-20 w-64 h-64 blur-[80px] pointer-events-none opacity-20 ${
                            cancellationFee > 0 ? 'bg-orange-500' : 'bg-emerald-500'
                        }`} />

                        <div className="flex items-center justify-between mb-6 md:mb-8 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${cancellationFee > 0 ? 'bg-orange-500 text-black shadow-glow' : 'bg-emerald-500 text-black shadow-glow-green'}`}>
                                    <DollarSign size={18} strokeWidth={3} />
                                </div>
                                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-white">CONCILIAÇÃO FINANCEIRA</span>
                            </div>
                            {isPostAcceptance && (
                                <div className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black italic tracking-widest flex items-center gap-2 ${
                                    isLate ? 'bg-red-500 text-white shadow-glow-red' : 'bg-white/10 text-orange-400 border border-orange-500/20'
                                }`}>
                                    <Clock size={12} strokeWidth={3} />
                                    {isLate ? 'ATRASO DETECTADO' : 'ACEITO EM ROTA'}
                                </div>
                            )}
                        </div>

                        <div className="relative z-10 flex items-end justify-between">
                            <div>
                                {cancellationFee > 0 ? (
                                    <>
                                        <div className="text-3xl md:text-4xl font-black italic text-white tracking-tighter mb-2">R$ 4,90</div>
                                        <p className="text-xs md:text-sm font-bold text-white/50 flex flex-col">
                                            <span>Taxa de Deslocamento</span>
                                            <span className="text-[9px] md:text-[10px] text-orange-500/60 uppercase tracking-widest mt-1">Motoboy já percorreu parte da rota</span>
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-3xl md:text-4xl font-black italic text-emerald-400 tracking-tighter mb-2 uppercase">Isenção Total</div>
                                        <p className="text-xs md:text-sm font-bold text-white/50 leading-tight">
                                            {isLate 
                                                ? `Cancelamento gratuito devido ao atraso do entregador (${minutesElapsed} min).`
                                                : isPlausibleReason 
                                                    ? "Cancelamento por falha na entrega. Reembolso integral aprovado."
                                                    : "Cancelamento em fase pendente. Sem custos operacionais."
                                            }
                                        </p>
                                    </>
                                )}
                            </div>
                            {cancellationFee === 0 && <CheckCircle2 className="text-emerald-500 drop-shadow-glow-green w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />}
                            {cancellationFee > 0 && <AlertTriangle className="text-orange-500 drop-shadow-glow w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />}
                        </div>
                    </div>

                    {/* 2. Custom Chocolate Reason Buttons */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2 mb-2 block">Selecione o Motivo Real</label>
                        <div className="grid gap-2.5 max-h-[180px] md:max-h-none overflow-y-auto pr-1.5 scrollbar-guepardo">
                            {reasons.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    className={`group flex items-center justify-between p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 transition-all duration-300 text-left relative overflow-hidden ${
                                        reason === r 
                                        ? 'bg-orange-500 border-orange-500 text-black shadow-[0_15px_30px_rgba(255,122,0,0.3)] scale-[1.02]' 
                                        : 'bg-white/5 border-white/5 hover:border-white/20 text-white/70 hover:bg-white/[0.08]'
                                    }`}
                                >
                                    {/* Inner Shine for active buttons */}
                                    {reason === r && <div className="absolute top-0 left-0 w-full h-[1px] bg-white/40 blur-[1px]" />}
                                    
                                    <span className={`text-xs md:text-sm font-black italic uppercase tracking-tight ${reason === r ? 'text-black' : 'group-hover:text-white'}`}>{r}</span>
                                    
                                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                                        reason === r ? 'border-black bg-black shadow-lg' : 'border-white/20 group-hover:border-white/40'
                                    }`}>
                                        {reason === r && <ChevronRight size={14} strokeWidth={4} className="text-orange-500" />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {reason === "Outro motivo" && (
                            <div className="mt-4 animate-in zoom-in-95 duration-300">
                                <textarea
                                    className="w-full p-4 md:p-6 bg-white/5 border-2 border-white/10 rounded-[1.5rem] md:rounded-[2rem] text-xs md:text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:bg-white/10 transition-all resize-none shadow-inner"
                                    placeholder="Descreva o motivo detalhadamente..."
                                    rows={3}
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* 3. Footer Actions: Ultra Contrast */}
                    <div className="pt-4 flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 md:py-5 text-[10px] md:text-[11px] font-black text-white/40 hover:text-white uppercase tracking-[0.3em] transition-all hover:translate-x-[-4px]"
                        >
                            <span className="flex items-center justify-center gap-2">
                                Voltar
                            </span>
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!reason || (reason === "Outro motivo" && !customReason)}
                            className={`flex-[2] py-4 md:py-6 text-xs md:text-sm font-black italic text-black uppercase tracking-[0.3em] rounded-[2rem] md:rounded-[2.5rem] transition-all relative overflow-hidden shadow-2xl active:scale-95 disabled:opacity-20 disabled:grayscale ${
                                reason 
                                ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/20' 
                                : 'bg-white/10 text-white/30'
                            }`}
                        >
                            {/* Button Shine Layer */}
                            {reason && <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rotate-12 -translate-y-full group-hover:translate-y-full transition-transform duration-1000" />}
                            Confirmar
                        </button>
                    </div>

                </div>

                {/* Info Bar */}
                <div className="bg-white/[0.03] p-4 text-center border-t border-white/5 shrink-0">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] flex items-center justify-center gap-3">
                        <Info size={12} />
                        Segurança Guepardo: Operação Ratificada
                    </p>
                </div>

            </div>
        </div>
    );
};
