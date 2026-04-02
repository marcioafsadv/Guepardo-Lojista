import React, { useState, useEffect } from 'react';
import { X, QrCode, CreditCard, FileText, Check, Copy, Zap, Info, TrendingUp, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface RechargeModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
}

type PaymentStep = 'SELECT_AMOUNT' | 'SELECT_METHOD' | 'PROCESSING' | 'SHOW_PIX' | 'SUCCESS';

export const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose, storeId }) => {
    const [step, setStep] = useState<PaymentStep>('SELECT_AMOUNT');
    const [amount, setAmount] = useState<number>(20);
    const [method, setMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
    const [loading, setLoading] = useState(false);
    const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; paymentId: string } | null>(null);
    const [txId, setTxId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to transaction status changes once txId is set
    useEffect(() => {
        if (!txId || !isOpen) return;

        console.log(`📡 [RECHARGE_MODAL] Subscribing to transaction: ${txId}`);
        const channel = supabase
            .channel(`modal-tx-${txId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'wallet_transactions',
                    filter: `id=eq.${txId}`
                },
                (payload) => {
                    console.log("🔄 [RECHARGE_MODAL] Transaction update:", payload.new.status);
                    if (payload.new.status === 'CONFIRMED') {
                        setStep('SUCCESS');
                        // Auto close after 5 seconds of success
                        setTimeout(() => {
                            handleClose();
                        }, 5000);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [txId, isOpen]);

    if (!isOpen) return null;

    const quickAmounts = [20, 50, 100, 200];

    const handleClose = () => {
        onClose();
        // Reset state after a small delay to avoid flicker
        setTimeout(() => {
            setStep('SELECT_AMOUNT');
            setAmount(20);
            setPixData(null);
            setTxId(null);
            setError(null);
        }, 300);
    };

    const handleGeneratePayment = async () => {
        if (amount < 20) {
            setError("O valor mínimo para recarga é R$ 20,00");
            return;
        }
        setLoading(true);
        setError(null);
        setStep('PROCESSING');

        try {
            const { data, error: invokeError } = await supabase.functions.invoke('asaas-create-charge', {
                body: { storeId, amount, description: 'Recarga de Saldo - Guepardo' }
            });

            if (invokeError) throw invokeError;

            if (data?.success) {
                setPixData({
                    qrCode: data.pixCode,
                    qrCodeBase64: data.pixImage,
                    paymentId: data.paymentId
                });
                setTxId(data.transactionId);
                setStep('SHOW_PIX');
            } else {
                throw new Error(data?.message || data?.error || "Erro ao gerar QR Code Asaas");
            }
        } catch (err: any) {
            console.error("Erro no pagamento:", err);
            setError("Erro ao processar recarga: " + (err.message || "Tente novamente mais tarde."));
            setStep('SELECT_METHOD');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Código Copia e Cola copiado!");
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
                onClick={handleClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-[#1A1A1A] border border-white/10 w-full max-w-[480px] rounded-[32px] shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in duration-300">
                
                {/* Progress Bar (Only on Success) */}
                {step === 'SUCCESS' && (
                    <div className="absolute top-0 left-0 h-1.5 bg-green-500 z-50 w-full origin-left animate-progress"></div>
                )}

                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-guepardo-accent/20 flex items-center justify-center text-guepardo-accent">
                            <Zap size={20} className="fill-current" />
                        </div>
                        <h3 className="text-xl font-black italic tracking-tighter text-white uppercase">
                            {step === 'SUCCESS' ? 'PAGAMENTO OK!' : 'RECARREGAR SALDO'}
                        </h3>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    {step === 'SELECT_AMOUNT' && (
                        <div className="space-y-8">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block mb-4">Escolha um valor</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {quickAmounts.map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setAmount(v)}
                                            className={`
                                                py-5 rounded-2xl font-black italic text-xl transition-all border
                                                ${amount === v
                                                    ? 'bg-guepardo-accent border-guepardo-accent text-white shadow-[0_12px_40px_rgba(244,115,22,0.3)] scale-[1.02]'
                                                    : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                                                }
                                            `}
                                        >
                                            R$ {v},00
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="relative">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block mb-4">Ou digite outro valor</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black italic text-white/20 group-focus-within:text-guepardo-accent">R$</span>
                                    <input
                                        type="number"
                                        placeholder="0,00"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-3xl font-black italic text-white focus:outline-none focus:border-guepardo-accent transition-all tabular-nums"
                                        value={amount || ''}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                    />
                                </div>
                                {error && (
                                    <p className="text-red-400 text-[10px] font-bold mt-2 uppercase tracking-widest">{error}</p>
                                )}
                            </div>

                            <button
                                onClick={() => setStep('SELECT_METHOD')}
                                disabled={amount < 20}
                                className="w-full bg-guepardo-accent hover:bg-guepardo-accent-hover disabled:opacity-30 text-white py-6 rounded-2xl font-black italic text-2xl shadow-[0_12px_40px_rgba(244,115,22,0.4)] transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                CONTINUAR <ArrowRight size={24} />
                            </button>
                        </div>
                    )}

                    {step === 'SELECT_METHOD' && (
                        <div className="space-y-6">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block">Método de pagamento</label>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setMethod('PIX')}
                                    className={`w-full p-6 rounded-2xl border flex items-center justify-between transition-all ${method === 'PIX' ? 'bg-guepardo-accent/10 border-guepardo-accent' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                                            <QrCode size={28} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black italic text-lg text-white leading-none">PIX</p>
                                            <p className="text-[10px] uppercase font-bold text-white/30 mt-1">Instantâneo e sem taxas</p>
                                        </div>
                                    </div>
                                    {method === 'PIX' && <Check className="text-guepardo-accent" strokeWidth={4} />}
                                </button>

                                <button
                                    disabled
                                    className="w-full p-6 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between opacity-30 cursor-not-allowed group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                                            <CreditCard size={28} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black italic text-lg text-white/50 leading-none">CARTÃO</p>
                                            <p className="text-[10px] uppercase font-bold text-white/20 mt-1">Disponível em breve</p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div className="pt-6 space-y-4">
                                <button
                                    onClick={handleGeneratePayment}
                                    className="w-full bg-[#E26D21] hover:bg-[#F37E32] text-white py-6 rounded-2xl font-black italic text-2xl shadow-xl transition-all active:scale-95"
                                >
                                    PAGAR R$ {amount.toFixed(2)}
                                </button>
                                <button onClick={() => setStep('SELECT_AMOUNT')} className="w-full text-white/30 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors py-2">
                                    Alterar valor
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'PROCESSING' && (
                        <div className="py-24 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 border-8 border-guepardo-accent/20 border-t-guepardo-accent rounded-full animate-spin mb-8"></div>
                            <h4 className="text-2xl font-black italic tracking-tighter mb-2 text-white">GERANDO COBRANÇA</h4>
                            <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Comunicando com Asaas...</p>
                        </div>
                    )}

                    {step === 'SHOW_PIX' && pixData && (
                        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-6 duration-500">
                            <div className="bg-white p-8 rounded-[40px] mb-8 shadow-[0_20px_60px_rgba(255,255,255,0.05)] border-8 border-white group relative">
                                <img 
                                    src={`data:image/png;base64,${pixData.qrCodeBase64}`} 
                                    alt="Pix QR Code" 
                                    className="w-64 h-64 relative z-10" 
                                />
                                <div className="absolute inset-0 bg-guepardo-accent/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px]"></div>
                            </div>

                            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 relative group overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block mb-3">Pix Copia e Cola</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-black/40 p-3 rounded-xl text-xs font-mono text-white/50 truncate">
                                        {pixData.qrCode}
                                    </div>
                                    <button
                                        onClick={() => handleCopy(pixData.qrCode)}
                                        className="p-3 bg-guepardo-accent/20 hover:bg-guepardo-accent/30 rounded-xl text-guepardo-accent transition-all active:scale-90"
                                    >
                                        <Copy size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex gap-4 mb-3">
                                <Info className="text-blue-400 shrink-0" size={24} />
                                <p className="text-[11px] text-blue-200/70 font-semibold leading-relaxed">
                                    Após o pagamento, o saldo será atualizado **automaticamente** em tempo real. Não é necessário enviar comprovante.
                                </p>
                            </div>

                            <div className="w-full py-4 flex items-center justify-center gap-3 mb-8">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                                <span className="text-[10px] text-green-500/70 font-black uppercase tracking-[0.3em]">Aguardando confirmação...</span>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white py-5 rounded-2xl font-black italic text-xl transition-all border border-white/5"
                            >
                                FECHAR
                            </button>
                        </div>
                    )}

                    {step === 'SUCCESS' && (
                        <div className="flex flex-col items-center text-center py-10 animate-in fade-in zoom-in duration-500">
                            <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center mb-10 relative">
                                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                                <Check size={64} className="text-green-500" strokeWidth={4} />
                            </div>
                            
                            <h4 className="text-4xl font-black italic tracking-tighter text-white mb-4">PAGAMENTO OK!</h4>
                            <p className="text-sm text-white/60 font-medium mb-12 max-w-[300px]">
                                O saldo de **R$ {amount.toFixed(2)}** já foi creditado na sua carteira Guepardo.
                            </p>
                            
                            <button
                                onClick={handleClose}
                                className="w-full bg-green-500 hover:bg-green-600 text-white py-6 rounded-2xl font-black italic text-2xl transition-all shadow-[0_12px_40px_rgba(34,197,94,0.3)] active:scale-95"
                            >
                                VOLTAR PARA CARTEIRA
                            </button>
                            
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] mt-8 scale-90">
                                FECHANDO AUTOMATICAMENTE...
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
