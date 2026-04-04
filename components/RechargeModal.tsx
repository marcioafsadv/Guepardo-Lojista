import React, { useState, useEffect } from 'react';
import { X, QrCode, CreditCard, Check, Copy, Zap, Info, ArrowRight, AlertTriangle, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface RechargeModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
}

type PaymentStep = 'SELECT_AMOUNT' | 'SELECT_METHOD' | 'CARD_INFO' | 'PROCESSING' | 'SHOW_PIX' | 'SUCCESS';

export const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose, storeId }) => {
    const [step, setStep] = useState<PaymentStep>('SELECT_AMOUNT');
    const [amount, setAmount] = useState<number>(20);
    const [method, setMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
    const [loading, setLoading] = useState(false);
    const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; paymentId: string } | null>(null);
    const [txId, setTxId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'AUTOMATED' | 'MANUAL'>('AUTOMATED');
    const [manualPixConfig, setManualPixConfig] = useState<{ pix_key?: string, bank_name?: string, receiver_name?: string } | null>(null);

    // Card States
    const [cardData, setCardData] = useState({
        number: '',
        name: '',
        expiry: '',
        cvv: '',
        cpfCnpj: ''
    });

    useEffect(() => {
        const fetchConfig = async () => {
            const { data } = await supabase
                .from('guepardo_system_settings')
                .select('value')
                .eq('key', 'manual_pix_config')
                .single();
            
            if (data && data.value) {
                setManualPixConfig(data.value);
            }
        };
        fetchConfig();
    }, []);

    // Subscribe to transaction status changes once txId is set
    useEffect(() => {
        if (!txId || !isOpen) return;

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
                    if (payload.new.status === 'CONFIRMED') {
                        setStep('SUCCESS');
                        setTimeout(() => handleClose(), 5000);
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
        setTimeout(() => {
            setStep('SELECT_AMOUNT');
            setAmount(20);
            setPixData(null);
            setTxId(null);
            setError(null);
            setCardData({ number: '', name: '', expiry: '', cvv: '', cpfCnpj: '' });
        }, 300);
    };

    const handleGeneratePayment = async (selectedMethod?: 'PIX' | 'CREDIT_CARD') => {
        const activeMethod = selectedMethod || method;
        
        if (amount < 20) {
            setError("O valor mínimo para recarga é R$ 20,00");
            return;
        }

        if (activeMethod === 'CREDIT_CARD' && step !== 'CARD_INFO') {
            setStep('CARD_INFO');
            return;
        }

        setLoading(true);
        setError(null);
        setStep('PROCESSING');

        try {
            const body: any = { 
                storeId, 
                amount, 
                description: 'Recarga de Saldo - Guepardo',
                billingType: activeMethod === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX'
            };

            if (activeMethod === 'CREDIT_CARD') {
                const [expiryMonth, expiryYear] = cardData.expiry.split('/');
                body.creditCard = {
                    number: cardData.number.replace(/\D/g, ''),
                    holderName: cardData.name,
                    expiryMonth: expiryMonth,
                    expiryYear: '20' + expiryYear,
                    ccv: cardData.cvv
                };
                body.creditCardHolderInfo = {
                    name: cardData.name,
                    email: '', // Let the Edge Function handle or fetch from store
                    cpfCnpj: cardData.cpfCnpj.replace(/\D/g, ''),
                    postalCode: '',
                    addressNumber: '',
                    phone: ''
                };
            }

            const { data, error: invokeError } = await supabase.functions.invoke('asaas-create-charge', {
                body
            });

            if (invokeError) throw invokeError;

            if (data?.success) {
                if (activeMethod === 'PIX') {
                    setPixData({
                        qrCode: data.pixCode,
                        qrCodeBase64: data.pixImage,
                        paymentId: data.paymentId
                    });
                    setTxId(data.transactionId);
                    setStep('SHOW_PIX');
                } else {
                    setStep('SUCCESS');
                    setTimeout(() => handleClose(), 5000);
                }
            } else {
                throw new Error(data?.message || data?.error || "Erro ao processar pagamento");
            }
        } catch (err: any) {
            console.error("Erro no pagamento:", err);
            setError("Erro: " + (err.message || "Tente novamente mais tarde."));
            setStep(activeMethod === 'CREDIT_CARD' ? 'CARD_INFO' : 'SELECT_METHOD');
        } finally {
            setLoading(false);
        }
    };

    const handleManualInform = async () => {
        if (amount < 20) {
            setError("Mínimo R$ 20,00");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('asaas-create-charge', {
                body: { 
                    storeId, 
                    amount,
                    billingType: 'MANUAL'
                }
            });

            if (invokeError) throw invokeError;
            if (data && !data.success) throw new Error(data.error || "Erro ao registrar recarga manual");

            setStep('SUCCESS');
            setTimeout(() => handleClose(), 5000);
        } catch (err: any) {
            console.error("Erro ao informar recarga manual:", err);
            setError("Erro ao registrar: " + (err.message || "Tente novamente mais tarde."));
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copiado!");
    };

    const calculateCreditCardTotal = (base: number) => {
        return (base + 0.49) / (1 - 0.0299);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={handleClose}></div>

            <div className="relative bg-[#1A1A1A] border border-white/10 w-full max-w-[480px] rounded-[32px] shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in duration-300">
                {step === 'SUCCESS' && <div className="absolute top-0 left-0 h-1.5 bg-green-500 z-50 w-full origin-left animate-progress"></div>}

                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-guepardo-accent/20 flex items-center justify-center text-guepardo-accent">
                            <Zap size={20} className="fill-current" />
                        </div>
                        <h3 className="text-xl font-black italic tracking-tighter text-white uppercase">
                            {step === 'SUCCESS' ? 'PRONTO!' : 'RECARREGAR SALDO'}
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
                                        <button key={v} onClick={() => setAmount(v)} className={`py-5 rounded-2xl font-black italic text-xl transition-all border ${amount === v ? 'bg-guepardo-accent border-guepardo-accent text-white shadow-[0_12px_40px_rgba(244,115,22,0.3)] scale-[1.02]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}>R$ {v},00</button>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block mb-4">Ou digite outro valor</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black italic text-white/20 group-focus-within:text-guepardo-accent">R$</span>
                                    <input type="number" placeholder="0,00" className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-3xl font-black italic text-white focus:outline-none focus:border-guepardo-accent transition-all tabular-nums" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} />
                                </div>
                                {error && <p className="text-red-400 text-[10px] font-bold mt-2 uppercase tracking-widest">{error}</p>}
                            </div>
                            <button onClick={() => setStep('SELECT_METHOD')} disabled={amount < 20} className="w-full bg-guepardo-accent hover:bg-guepardo-accent-hover disabled:opacity-30 text-white py-6 rounded-2xl font-black italic text-2xl shadow-[0_12px_40px_rgba(244,115,22,0.4)] transition-all flex items-center justify-center gap-3 active:scale-95">CONTINUAR <ArrowRight size={24} /></button>
                        </div>
                    )}

                    {step === 'SELECT_METHOD' && (
                        <div className="space-y-6">
                            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 mb-4">
                                <button onClick={() => setActiveTab('AUTOMATED')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'AUTOMATED' ? 'bg-white/10 text-white' : 'text-white/30'}`}>Automático</button>
                                <button onClick={() => setActiveTab('MANUAL')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'MANUAL' ? 'bg-guepardo-accent/20 text-guepardo-accent' : 'text-white/30'}`}>Manual (Grátis)</button>
                            </div>

                            {activeTab === 'AUTOMATED' ? (
                                <div className="space-y-3">
                                    <button onClick={() => setMethod('PIX')} className={`w-full p-6 rounded-2xl border flex items-center justify-between transition-all ${method === 'PIX' ? 'bg-guepardo-accent/10 border-guepardo-accent' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                                        <div className="flex items-center gap-5">
                                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><QrCode size={28} /></div>
                                            <div className="text-left">
                                                <p className="font-black italic text-lg text-white leading-none">PIX ASAS</p>
                                                <p className="text-[10px] uppercase font-bold text-white/30 mt-1">Instantâneo (Taxa R$ 1,99)</p>
                                            </div>
                                        </div>
                                        {method === 'PIX' && <Check className="text-guepardo-accent" strokeWidth={4} />}
                                    </button>
                                    <button onClick={() => setMethod('CREDIT_CARD')} className={`w-full p-6 rounded-2xl border flex items-center justify-between transition-all ${method === 'CREDIT_CARD' ? 'bg-guepardo-accent/10 border-guepardo-accent' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                                        <div className="flex items-center gap-5">
                                            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><CreditCard size={28} /></div>
                                            <div className="text-left">
                                                <p className="font-black italic text-lg text-white leading-none">CARTÃO DE CRÉDITO</p>
                                                <p className="text-[10px] uppercase font-bold text-white/30 mt-1">Imediato (Taxa 2.99% + 0.49)</p>
                                            </div>
                                        </div>
                                        {method === 'CREDIT_CARD' && <Check className="text-guepardo-accent" strokeWidth={4} />}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-6 bg-guepardo-accent/5 border border-guepardo-accent/10 rounded-3xl space-y-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Chave PIX (Admin)</span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black text-white">{manualPixConfig?.pix_key || 'Carregando...'}</span>
                                                <button onClick={() => handleCopy(manualPixConfig?.pix_key || '')} className="p-2 text-guepardo-accent hover:text-white transition-colors"><Copy size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Banco</span>
                                                <span className="text-[11px] font-black text-white italic">{manualPixConfig?.bank_name || '...'}</span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Favorecido</span>
                                                <span className="text-[11px] font-black text-white">{manualPixConfig?.receiver_name || '...'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3 italic">
                                        <Info size={16} className="text-blue-400 shrink-0" />
                                        <p className="text-[10px] text-blue-200/60 leading-relaxed font-bold">Realize a transferência e clique no botão abaixo. O saldo será liberado após conferência.</p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-6 space-y-3">
                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 animate-shake">
                                        <AlertTriangle size={16} className="text-red-400 shrink-0" />
                                        <p className="text-[10px] text-red-200 font-bold uppercase tracking-tight">{error}</p>
                                    </div>
                                )}
                                {activeTab === 'AUTOMATED' ? (
                                    <button onClick={() => handleGeneratePayment()} className="w-full bg-guepardo-accent hover:bg-guepardo-accent-hover text-white py-6 rounded-2xl font-black italic text-2xl shadow-xl transition-all active:scale-95 uppercase">{method === 'PIX' ? 'Gerar PIX' : 'Dados do Cartão'}</button>
                                ) : (
                                    <button onClick={handleManualInform} disabled={loading} className="w-full bg-guepardo-accent hover:bg-guepardo-accent-hover text-white py-6 rounded-2xl font-black italic text-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                                        {loading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <>INFORMAR TRANSFERÊNCIA <Check size={24} /></>}
                                    </button>
                                )}
                                <button onClick={() => setStep('SELECT_AMOUNT')} className="w-full text-white/30 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] py-2 transition-colors">Alterar Valor</button>
                            </div>
                        </div>
                    )}

                    {step === 'CARD_INFO' && (
                        <div className="space-y-6">
                            <button onClick={() => setStep('SELECT_METHOD')} className="flex items-center gap-2 text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors mb-2"><ChevronLeft size={14} /> Voltar</button>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[8px] font-black uppercase text-white/30 mb-2 block tracking-widest">Informações do Cartão</label>
                                    <div className="space-y-3">
                                        <input type="text" placeholder="Número do Cartão" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white font-bold focus:outline-none focus:border-guepardo-accent" value={cardData.number} onChange={(e) => setCardData({...cardData, number: e.target.value})} />
                                        <input type="text" placeholder="Nome Impresso" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white font-bold focus:outline-none focus:border-guepardo-accent" value={cardData.name} onChange={(e) => setCardData({...cardData, name: e.target.value})} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" placeholder="MM/AA" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white font-bold focus:outline-none focus:border-guepardo-accent" value={cardData.expiry} onChange={(e) => setCardData({...cardData, expiry: e.target.value})} />
                                            <input type="text" placeholder="CVV" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white font-bold focus:outline-none focus:border-guepardo-accent" value={cardData.cvv} onChange={(e) => setCardData({...cardData, cvv: e.target.value})} />
                                        </div>
                                        <input type="text" placeholder="CPF ou CNPJ do Titular" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white font-bold focus:outline-none focus:border-guepardo-accent" value={cardData.cpfCnpj} onChange={(e) => setCardData({...cardData, cpfCnpj: e.target.value})} />
                                    </div>
                                </div>
                                <div className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-white/40 uppercase"><span>Recarga</span><span className="text-white">R$ {amount.toFixed(2)}</span></div>
                                    <div className="flex justify-between items-center text-[10px] font-bold text-white/40 uppercase"><span>Taxas</span><span className="text-red-400">+ R$ {(calculateCreditCardTotal(amount) - amount).toFixed(2)}</span></div>
                                    <div className="pt-2 border-t border-white/5 flex justify-between items-center"><span className="text-xs font-black text-white italic uppercase">Total</span><span className="text-2xl font-black text-guepardo-accent">R$ {calculateCreditCardTotal(amount).toFixed(2)}</span></div>
                                </div>
                                <button onClick={() => handleGeneratePayment('CREDIT_CARD')} disabled={loading} className="w-full bg-guepardo-accent hover:bg-guepardo-accent-hover text-white py-6 rounded-2xl font-black italic text-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                                    {loading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <>PAGAR AGORA <Check size={24} /></>}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'PROCESSING' && (
                        <div className="py-24 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 border-8 border-guepardo-accent/20 border-t-guepardo-accent rounded-full animate-spin mb-8"></div>
                            <h4 className="text-2xl font-black italic tracking-tighter mb-2 text-white">PROCESSANDO</h4>
                            <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Comunicando com servidor seguro...</p>
                        </div>
                    )}

                    {step === 'SHOW_PIX' && pixData && (
                        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-6 duration-500">
                            <div className="bg-white p-8 rounded-[40px] mb-8 shadow-xl border-8 border-white group relative">
                                <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="Pix QR Code" className="w-64 h-64 relative z-10" />
                            </div>
                            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block mb-3">Pix Copia e Cola</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-black/40 p-3 rounded-xl text-xs font-mono text-white/50 truncate">{pixData.qrCode}</div>
                                    <button onClick={() => handleCopy(pixData.qrCode)} className="p-3 bg-guepardo-accent/20 hover:bg-guepardo-accent/30 rounded-xl text-guepardo-accent transition-all active:scale-90"><Copy size={20} /></button>
                                </div>
                            </div>
                            <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex gap-4 mb-8">
                                <Info className="text-blue-400 shrink-0" size={24} />
                                <p className="text-[11px] text-blue-200/70 font-semibold leading-relaxed">O saldo será atualizado **automaticamente**. Não feche esta janela até a confirmação.</p>
                            </div>
                            <div className="flex items-center gap-3 animate-pulse text-green-500 mb-8 font-black text-[10px] tracking-widest uppercase"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Aguardando Pagamento...</div>
                            <button onClick={handleClose} className="w-full bg-white/5 hover:bg-white/10 text-white/50 py-5 rounded-2xl font-black italic text-xl transition-all border border-white/5">CANCELAR</button>
                        </div>
                    )}

                    {step === 'SUCCESS' && (
                        <div className="flex flex-col items-center text-center py-10 animate-in fade-in zoom-in duration-500">
                            <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center mb-10 relative">
                                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                                <Check size={64} className="text-green-500" strokeWidth={4} />
                            </div>
                            <h4 className="text-4xl font-black italic tracking-tighter text-white mb-4">SUCESSO!</h4>
                            <p className="text-sm text-white/60 font-medium mb-12 max-w-[300px]">Sua solicitação foi processada com êxito. O saldo será creditado em breve.</p>
                            <button onClick={handleClose} className="w-full bg-green-500 hover:bg-green-600 text-white py-6 rounded-2xl font-black italic text-2xl transition-all shadow-xl active:scale-95">VOLTAR</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
