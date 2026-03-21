import React, { useState } from 'react';
import { X, QrCode, CreditCard, FileText, Check, Copy, Zap, Info, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface RechargeModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
}

type PaymentStep = 'SELECT_AMOUNT' | 'SELECT_METHOD' | 'PROCESSING' | 'SHOW_PIX' | 'SHOW_CARD' | 'SHOW_BOLETO' | 'SUCCESS';

export const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose, storeId }) => {
    const [step, setStep] = useState<PaymentStep>('SELECT_AMOUNT');
    const [amount, setAmount] = useState<number>(0);
    const [method, setMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
    const [provider, setProvider] = useState<'asaas' | 'mercadopago'>('mercadopago');
    const [loading, setLoading] = useState(false);
    const [pixData, setPixData] = useState<{ qrCode: string, payload: string } | null>(null);

    if (!isOpen) return null;

    const quickAmounts = [50, 100, 200, 500];

    const handleStartPayment = async () => {
        if (amount < 20) {
            alert("O valor mínimo para recarga é R$ 20,00");
            return;
        }
        setStep('SELECT_METHOD');
    };

    const handleGeneratePix = async () => {
        setLoading(true);
        setStep('PROCESSING');

        try {
            const endpoint = provider === 'mercadopago' ? 'mercadopago-payment' : 'asaas-payment';
            const { data, error } = await supabase.functions.invoke(endpoint, {
                body: { amount, method: 'PIX', description: 'Recarga de Saldo - Guepardo' }
            });

            if (error) throw error;

            if (provider === 'mercadopago') {
                if (data.qrCode) {
                    setPixData({
                        qrCode: `data:image/png;base64,${data.qrCode}`,
                        payload: data.qrCodePayload
                    });
                    setStep('SHOW_PIX');
                } else {
                    throw new Error("Erro ao gerar QR Code Mercado Pago");
                }
            } else {
                if (data.pix) {
                    setPixData({
                        qrCode: data.pix.encodedImage,
                        payload: data.pix.payload
                    });
                    setStep('SHOW_PIX');
                } else {
                    throw new Error("Erro ao gerar QR Code Pix");
                }
            }
        } catch (err: any) {
            console.error("Erro no pagamento:", err);
            alert("Erro ao processar recarga: " + (err.message || "Tente novamente mais tarde."));
            setStep('SELECT_METHOD');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (pixData) {
            navigator.clipboard.writeText(pixData.payload);
            alert("Código Copia e Cola copiado!");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-[#1A1A1A] border border-white/10 w-full max-w-[500px] rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-guepardo-accent/20 flex items-center justify-center text-guepardo-accent">
                            <Zap size={20} className="fill-current" />
                        </div>
                        <h3 className="text-xl font-black italic tracking-tighter text-white">RECARREGAR SALDO</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    {step === 'SELECT_AMOUNT' && (
                        <div className="space-y-8">
                            <div>
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-4">Escolha um valor</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {quickAmounts.map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setAmount(v)}
                                            className={`
                                                py-4 rounded-2xl font-black text-lg transition-all border
                                                ${amount === v
                                                    ? 'bg-guepardo-accent border-guepardo-accent text-white shadow-lg shadow-guepardo-accent/20 scale-[1.02]'
                                                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                                                }
                                            `}
                                        >
                                            R$ {v},00
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="relative">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-4">Ou digite outro valor</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-white/30">R$</span>
                                    <input
                                        type="number"
                                        placeholder="0,00"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-guepardo-accent transition-all tabular-nums"
                                        value={amount || ''}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                    />
                                </div>
                                {amount > 0 && amount < 20 && (
                                    <p className="text-red-400 text-[10px] font-bold mt-2 uppercase">Valor mínimo R$ 20,00</p>
                                )}
                            </div>

                            <button
                                onClick={handleStartPayment}
                                disabled={amount < 20}
                                className="w-full bg-[#E26D21] hover:bg-[#F37E32] disabled:opacity-30 disabled:hover:bg-[#E26D21] text-white py-5 rounded-2xl font-black italic text-xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                CONTINUAR
                            </button>
                        </div>
                    )}

                    {step === 'SELECT_METHOD' && (
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-4">Escolha o Provedor</label>
                                <div className="grid grid-cols-2 gap-3 pb-2">
                                    <button
                                        onClick={() => setProvider('mercadopago')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${provider === 'mercadopago' ? 'bg-blue-500/10 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                                    >
                                        <div className={`p-2 rounded-lg ${provider === 'mercadopago' ? 'bg-blue-500 text-white' : 'bg-white/5'}`}>
                                            <Zap size={18} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-center">Mercado Pago</span>
                                    </button>
                                    <button
                                        onClick={() => setProvider('asaas')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${provider === 'asaas' ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                                    >
                                        <div className={`p-2 rounded-lg ${provider === 'asaas' ? 'bg-emerald-500 text-white' : 'bg-white/5'}`}>
                                            <TrendingUp size={18} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-center">Asaas</span>
                                    </button>
                                </div>
                            </div>

                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block">Método de pagamento</label>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setMethod('PIX')}
                                    className={`w-full p-5 rounded-2xl border flex items-center justify-between transition-all ${method === 'PIX' ? 'bg-guepardo-accent/10 border-guepardo-accent' : 'bg-white/5 border-white/10 text-white/60'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                                            <QrCode size={24} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black italic text-white">PIX</p>
                                            <p className="text-[10px] uppercase font-bold text-white/30">Instantâneo e sem taxas</p>
                                        </div>
                                    </div>
                                    {method === 'PIX' && <Check className="text-guepardo-accent" />}
                                </button>

                                <button
                                    onClick={() => setMethod('CREDIT_CARD')}
                                    className={`w-full p-5 rounded-2xl border flex items-center justify-between transition-all opacity-50 cursor-not-allowed ${method === 'CREDIT_CARD' ? 'bg-guepardo-accent/10 border-guepardo-accent' : 'bg-white/5 border-white/10 text-white/60'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                                            <CreditCard size={24} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black italic text-white">Cartão de Crédito</p>
                                            <p className="text-[10px] uppercase font-bold text-white/30">Em breve</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setMethod('BOLETO')}
                                    className={`w-full p-5 rounded-2xl border flex items-center justify-between transition-all opacity-50 cursor-not-allowed ${method === 'BOLETO' ? 'bg-guepardo-accent/10 border-guepardo-accent' : 'bg-white/5 border-white/10 text-white/60'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                                            <FileText size={24} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black italic text-white">Boleto</p>
                                            <p className="text-[10px] uppercase font-bold text-white/30">Em breve</p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div className="pt-4 space-y-3">
                                <button
                                    onClick={handleGeneratePix}
                                    className="w-full bg-[#E26D21] hover:bg-[#F37E32] text-white py-5 rounded-2xl font-black italic text-xl shadow-xl transition-all"
                                >
                                    PAGAR R$ {amount.toFixed(2)}
                                </button>
                                <button onClick={() => setStep('SELECT_AMOUNT')} className="w-full text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors py-2">
                                    Voltar
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'PROCESSING' && (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 border-4 border-guepardo-accent border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-black italic tracking-tighter mb-2">GERANDO COBRANÇA</h4>
                            <p className="text-white/40 text-sm font-medium">Comunicação segura com {provider === 'mercadopago' ? 'Mercado Pago' : 'Asaas'}...</p>
                        </div>
                    )}

                    {step === 'SHOW_PIX' && pixData && (
                        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white p-6 rounded-3xl mb-8 shadow-2xl">
                                <img src={pixData.qrCode} alt="Pix QR Code" className="w-64 h-64" />
                            </div>

                            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] block mb-2">Código Copia e Cola</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-black/40 p-3 rounded-lg text-xs font-mono text-white/60 truncate">
                                        {pixData.payload}
                                    </div>
                                    <button
                                        onClick={copyToClipboard}
                                        className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all active:scale-90"
                                    >
                                        <Copy size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-4 mb-8">
                                <Info className="text-blue-400 shrink-0" size={20} />
                                <p className="text-[11px] text-blue-200/70 font-medium leading-relaxed">
                                    Após o pagamento, o saldo será atualizado automaticamente em até 2 minutos. Não é necessário enviar comprovante.
                                </p>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full bg-white/10 hover:bg-white/20 text-white py-5 rounded-2xl font-black italic text-xl transition-all"
                            >
                                FECHAR
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
