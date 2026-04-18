import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { X, AlertTriangle, Trash2, Info, DollarSign, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CancellationModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (orderId: string, reason: string) => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({ order, onClose, onConfirm }) => {
    const [reason, setReason] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');
    const [now, setNow] = useState<Date>(new Date());

    // Update internal clock every minute to keep the "15 min rule" accurate
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
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

    // Business Logic: Financial Impact
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
    
    // Fee logic: 
    // 0 if before acceptance.
    // 0 if late (> 15 min).
    // 0 if plausible reason (Demora/Não chegou).
    // 4.90 otherwise.
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
        setReason('');
        setCustomReason('');
    };

    return (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden relative border border-white/20">

                {/* Top Brand Bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

                {/* Header */}
                <div className="bg-[#fff9f2] p-8 pb-6 flex items-start gap-5 relative">
                    <div className="bg-red-50 p-3 rounded-2xl text-red-600 shadow-sm border border-red-100 flex items-center justify-center">
                        <Trash2 size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-[#3d1b11] tracking-tight leading-none italic uppercase text-[1.4rem]">
                            Cancelar <span className="text-red-600">Solicitação</span>
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="bg-gray-200/50 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 uppercase">OS #{order.id.slice(-4)}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm font-semibold text-gray-500 truncate max-w-[150px]">{order.clientName}</span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 pt-2 space-y-6">

                    {/* 1. Dynamic Financial Warning - The "Premium" Box */}
                    <div className={`rounded-3xl p-5 border-2 transition-all duration-500 overflow-hidden relative ${
                        cancellationFee > 0 
                        ? 'bg-amber-50/50 border-amber-100 shadow-[0_4px_20px_rgba(245,158,11,0.1)]' 
                        : 'bg-emerald-50/50 border-emerald-100 shadow-[0_4px_20px_rgba(16,185,129,0.1)]'
                    }`}>
                        
                        {/* Status Icon Indicator */}
                        <div className={`absolute -right-4 -top-4 opacity-5 pointer-events-none`}>
                            {cancellationFee > 0 ? <AlertTriangle size={120} /> : <ShieldCheck size={120} />}
                        </div>

                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${cancellationFee > 0 ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'}`}>
                                    <DollarSign size={14} strokeWidth={3} />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${cancellationFee > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                                    Conciliação Financeira
                                </span>
                            </div>
                            {isPostAcceptance && (
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${isLate ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    <Clock size={12} />
                                    {isLate ? 'ATRASO DETECTADO' : 'EM ROTA'}
                                </div>
                            )}
                        </div>

                        {cancellationFee > 0 ? (
                            <div>
                                <div className="flex items-baseline gap-1.5 mb-1">
                                    <span className="text-2xl font-black text-amber-900">R$ 4,90</span>
                                    <span className="text-xs font-bold text-amber-700/60 uppercase">Taxa de Deslocamento</span>
                                </div>
                                <p className="text-xs text-amber-800/80 leading-relaxed font-medium">
                                    O entregador aceitou o pedido há <span className="font-bold underline">{minutesElapsed} min</span>. 
                                    Este cancelamento gerará cobrança para compensar o deslocamento parcial.
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-black text-emerald-900 leading-tight uppercase italic tracking-tighter">Isenção de Taxa</h3>
                                    <p className="text-xs text-emerald-800/80 mt-1 font-medium leading-relaxed">
                                        {isLate 
                                            ? `O entregador excedeu o prazo de 15 minutos (tempo: ${minutesElapsed} min). Cancelamento gratuito.`
                                            : isPlausibleReason 
                                                ? "Motivo plausível selecionado. O valor será estornado integralmente para seu saldo."
                                                : "O cancelamento em fase pendente não gera custos ao estabelecimento."
                                        }
                                    </p>
                                </div>
                                <CheckCircle2 className="text-emerald-500 shrink-0" size={32} />
                            </div>
                        )}
                    </div>

                    {/* 2. Reason Selector */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Motivo do Cancelamento</label>
                        <div className="grid gap-2">
                            {reasons.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    className={`group flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                                        reason === r 
                                        ? 'bg-[#3d1b11] border-[#3d1b11] text-white shadow-xl scale-[1.02]' 
                                        : 'bg-white border-gray-100 hover:border-orange-200 text-gray-700 hover:bg-orange-50/10'
                                    }`}
                                >
                                    <span className={`text-sm font-bold ${reason === r ? 'text-white' : 'text-gray-900 group-hover:text-orange-600'}`}>{r}</span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        reason === r ? 'border-orange-400 bg-orange-400' : 'border-gray-200 group-hover:border-orange-200'
                                    }`}>
                                        {reason === r && <Check size={12} strokeWidth={4} className="text-white" />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {reason === "Outro motivo" && (
                            <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                                <textarea
                                    className="w-full p-5 border-2 border-gray-100 bg-gray-50 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3d1b11] focus:bg-white transition-all resize-none"
                                    placeholder="Diga-nos o que aconteceu..."
                                    rows={3}
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* 3. Helper Text */}
                    <div className="flex items-center justify-center gap-2 py-2">
                        <div className="h-[1px] flex-1 bg-gray-100" />
                        <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-tighter">
                            <Info size={12} className="shrink-0" />
                            Atenção: Ação Irreversível
                        </div>
                        <div className="h-[1px] flex-1 bg-gray-100" />
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-[#fff9f2]/50 border-t border-gray-100 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-sm font-black text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-widest"
                    >
                        Voltar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!reason || (reason === "Outro motivo" && !customReason)}
                        className={`flex-1 py-4 text-xs font-black text-white uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl disabled:opacity-30 disabled:grayscale ${
                            reason ? 'bg-[#3d1b11] hover:bg-[#2a120c] shadow-orange-900/10 hover:shadow-orange-900/20 active:scale-95' : 'bg-gray-300'
                        }`}
                    >
                        Confirmar
                    </button>
                </div>

            </div>
        </div>
    );
};
