
import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { X, AlertTriangle, Trash2, Info, DollarSign } from 'lucide-react';

interface CancellationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (orderId: string, reason: string) => void;
    order: Order | null;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({ isOpen, onClose, onConfirm, order }) => {
    const [reason, setReason] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');

    if (!isOpen || !order) return null;

    const reasons = [
        "Demora na busca do entregador",
        "Motoboy não chegou ao estabelecimento",
        "Cliente desistiu do pedido",
        "Erro no cadastro do pedido",
        "Outro motivo"
    ];

    // Business Logic: Financial Impact
    const isPostAcceptance = [OrderStatus.ACCEPTED, OrderStatus.TO_STORE, OrderStatus.READY_FOR_PICKUP, OrderStatus.IN_TRANSIT].includes(order.status);
    const cancellationFee = isPostAcceptance ? 4.90 : 0.00; // Example fee logic

    const handleSubmit = () => {
        const finalReason = reason === "Outro motivo" ? customReason : reason;
        if (!finalReason) return;
        onConfirm(order.id, finalReason);
        setReason('');
        setCustomReason('');
    };

    return (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">

                {/* Header */}
                <div className="bg-red-50 p-6 border-b border-red-100 flex items-start gap-4">
                    <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0">
                        <Trash2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-red-900 leading-tight">Cancelar Solicitação</h2>
                        <p className="text-sm text-red-700 mt-1">
                            OS #{order.id.slice(-4)} • {order.clientName}
                        </p>
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* 1. Financial Warning */}
                    <div className={`rounded-xl p-4 border ${isPostAcceptance ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign size={16} className={isPostAcceptance ? 'text-orange-600' : 'text-green-600'} />
                            <span className={`text-xs font-bold uppercase tracking-wide ${isPostAcceptance ? 'text-orange-800' : 'text-green-800'}`}>
                                Impacto Financeiro
                            </span>
                        </div>

                        {isPostAcceptance ? (
                            <div>
                                <p className="text-sm font-bold text-gray-800 mb-1">
                                    Taxa de Deslocamento Aplicável
                                </p>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Como o motoboy já aceitou a corrida, será descontado <strong className="text-red-600">R$ {cancellationFee.toFixed(2)}</strong> do seu saldo referente ao deslocamento parcial.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm font-bold text-gray-800 mb-1">
                                    Reembolso Integral
                                </p>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    O cancelamento antes do aceite não gera custos. O valor retido será estornado para o seu saldo imediatamente.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 2. Reason Selector */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Motivo do Cancelamento</label>
                        <div className="space-y-2">
                            {reasons.map((r) => (
                                <label key={r} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${reason === r ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 hover:border-gray-400 text-gray-700'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={r}
                                        checked={reason === r}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="hidden"
                                    />
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${reason === r ? 'border-guepardo-accent' : 'border-gray-300'}`}>
                                        {reason === r && <div className="w-2 h-2 rounded-full bg-guepardo-accent"></div>}
                                    </div>
                                    <span className="text-sm font-medium">{r}</span>
                                </label>
                            ))}
                        </div>

                        {reason === "Outro motivo" && (
                            <textarea
                                className="w-full mt-3 p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guepardo-accent resize-none"
                                placeholder="Descreva o motivo..."
                                rows={3}
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                            />
                        )}
                    </div>

                    {/* 3. Helper Text */}
                    <div className="flex items-start gap-2 text-gray-400 text-[10px]">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <p>Ao cancelar, o motoboy será notificado imediatamente e a rota será removida do mapa. Esta ação não pode ser desfeita.</p>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Voltar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!reason}
                        className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg shadow-red-200"
                    >
                        Confirmar Cancelamento
                    </button>
                </div>

            </div>
        </div>
    );
};
