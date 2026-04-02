import React, { useState, useEffect } from 'react';
import { Wallet, Plus, CreditCard, QrCode, FileText, TrendingUp, History, ArrowUpRight, ArrowDownRight, Clock, RefreshCcw, Check } from 'lucide-react';
import { RechargeModal } from './RechargeModal.tsx';
import { supabase } from '../lib/supabaseClient';

interface Transaction {
    id: string;
    date: string;
    amount: number;
    type: 'RECHARGE' | 'PAYMENT' | 'REFUND';
    method: 'PIX' | 'CARD' | 'BOLETO' | 'BALANCE';
    status: 'CONFIRMED' | 'PENDING' | 'FAILED';
    qrCode?: string;
    qrCodePayload?: string;
}

interface WalletViewProps {
    balance: number;
    storeId: string;
    syncId?: number;
}

export const WalletView: React.FC<WalletViewProps> = ({ balance, storeId, syncId = 0 }) => {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [expandedTxId, setExpandedTxId] = useState<number | null>(null);
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const fetchTransactions = async () => {
        if (!storeId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('store_id', storeId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (data) {
                setTransactions(data.map((tx: any) => ({
                    id: tx.id,
                    date: new Date(tx.created_at).toLocaleString('pt-BR'),
                    amount: tx.type === 'PAYMENT' ? -tx.amount : tx.amount,
                    type: tx.type,
                    method: tx.payment_method,
                    status: tx.status,
                    qrCode: tx.pix_qr_code,
                    qrCodePayload: tx.pix_copy_paste
                })));
            }
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();

        // Realtime subscription for transaction updates
        const channel = supabase
            .channel(`wallet-tx-${storeId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'wallet_transactions',
                    filter: `store_id=eq.${storeId}`
                },
                (payload) => {
                    console.log("🔄 [WALLET_TX] Realtime update:", payload);
                    fetchTransactions();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [storeId]);

    return (
        <div className="flex flex-col h-full bg-[#121212] text-white p-8 overflow-y-auto scrollbar-guepardo">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tighter flex items-center gap-3">
                        <Wallet className="text-guepardo-accent w-8 h-8" />
                        MINHA CARTEIRA
                    </h2>
                    <p className="text-white/50 text-sm mt-1 uppercase tracking-widest font-medium">Gestão de saldo e recargas</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        <span className="text-[10px] font-bold text-white/70 uppercase">Pagamentos via Asaas</span>
                    </div>
                </div>
            </div>

            {/* main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">

                {/* Balance Card - PREMIUM */}
                <div className="lg:col-span-2 relative overflow-hidden group rounded-3xl border border-white/10 hover:border-emerald-500/50 transition-all duration-500 shadow-2xl">
                    <div className="absolute inset-0 bg-brand-gradient-green-premium opacity-95 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] group-hover:bg-emerald-500/30 transition-all duration-700"></div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>

                    <div className="relative p-10 flex flex-col justify-between h-full min-h-[260px]">
                        <div>
                            <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Saldo Disponível</span>
                            <div key={`balance-card-${syncId}`} className={`flex items-baseline gap-2 mt-2 transition-all ${syncId > 0 ? 'animate-balance-pulse' : ''}`}>
                                <h1 className="text-6xl font-black tracking-tighter tabular-nums drop-shadow-lg">
                                    <span className="text-2xl opacity-50 mr-2">R$</span>
                                    {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h1>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setIsRechargeModalOpen(true)}
                                className="group relative bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black italic text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                                RECARREGAR AGORA
                            </button>

                            <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 backdrop-blur-md border border-white/10">
                                <FileText size={20} />
                                Exportar Extrato
                            </button>
                        </div>
                    </div>
                </div>

            {/* Quick Stats */}
            <div className="bg-guepardo-gray-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col justify-between hover:border-white/20 transition-colors shadow-xl">
                <div>
                    <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Uso este mês</span>
                    <div className="mt-6 flex flex-col gap-8">
                        <div className="flex items-center justify-between group/stat">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-500/10 rounded-xl text-green-500 group-hover/stat:bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] group-hover/stat:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all">
                                    <TrendingUp size={22} />
                                </div>
                                <span className="text-sm font-bold text-white/80">Entradas</span>
                            </div>
                            <span className="text-xl font-black text-green-500 tracking-tight">
                                + R$ {transactions
                                    .filter(t => t.amount > 0 && t.status === 'CONFIRMED')
                                    .reduce((sum, t) => sum + t.amount, 0)
                                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div className="flex items-center justify-between group/stat">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-500/10 rounded-xl text-red-500 group-hover/stat:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] group-hover/stat:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all">
                                    <ArrowDownRight size={22} />
                                </div>
                                <span className="text-sm font-bold text-white/80">Saídas</span>
                            </div>
                            <span className="text-xl font-black text-red-400 tracking-tight">
                                - R$ {Math.abs(transactions
                                    .filter(t => t.amount < 0 && t.status === 'CONFIRMED')
                                    .reduce((sum, t) => sum + t.amount, 0))
                                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5">
                    <p className="text-[10px] text-white/30 uppercase font-bold text-center tracking-widest flex items-center justify-center gap-2">
                        <QrCode size={12} className="text-blue-500/50" />
                        Sistema de Pagamentos Seguro
                    </p>
                </div>
            </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-guepardo-gray-800/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex-1 flex flex-col shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <h3 className="font-black italic tracking-tight flex items-center gap-3 text-lg">
                        <div className="p-2 bg-guepardo-accent/10 rounded-lg shadow-[0_0_15px_rgba(211,84,0,0.15)]">
                            <History size={20} className="text-guepardo-accent" />
                        </div>
                        ÚLTIMAS MOVIMENTAÇÕES
                    </h3>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchTransactions}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/30 hover:text-white/60"
                            title="Atualizar transações"
                        >
                            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <div className="text-[10px] text-white/30 font-black uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                            Exibindo últimas 20 transações
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#1A0900]/40 text-[10px] font-black text-white/40 uppercase tracking-[0.25em] border-b border-white/5">
                            <tr>
                                <th className="px-8 py-5">Data/Hora</th>
                                <th className="px-8 py-5">Descrição</th>
                                <th className="px-8 py-5">Método</th>
                                <th className="px-8 py-5 text-center">Status</th>
                                <th className="px-8 py-5 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.length > 0 ? (
                                transactions.map(tx => (
                                    <React.Fragment key={tx.id}>
                                        <tr 
                                            onClick={() => tx.status === 'PENDING' && tx.qrCode ? setExpandedTxId(expandedTxId === tx.id ? null : tx.id) : null}
                                            className={`
                                                transition-all border-l-2
                                                ${tx.status === 'PENDING' && tx.qrCode ? 'cursor-pointer hover:bg-white/[0.03]' : 'hover:bg-white/5'}
                                                ${expandedTxId === tx.id ? 'bg-white/[0.05] border-l-guepardo-accent' : 'border-l-transparent'}
                                            `}
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3 text-sm text-white/80">
                                                    <Clock size={14} className="text-white/20" />
                                                    {tx.date}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white uppercase tracking-tight">
                                                        {tx.type === 'RECHARGE' ? 'Recarga de Saldo' : tx.type === 'PAYMENT' ? 'Pagamento de Frete' : 'Estorno'}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-white/30 font-medium">ID: #{tx.id.toString().slice(-6).padStart(6, '0')}</span>
                                                        {tx.status === 'PENDING' && tx.qrCode && (
                                                            <span className="text-[10px] text-guepardo-accent flex items-center gap-1 font-bold animate-pulse">
                                                                <Plus size={10} /> VER QR CODE
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    {tx.method === 'PIX' && <QrCode size={16} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]" />}
                                                    {tx.method === 'CARD' && <CreditCard size={16} className="text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.3)]" />}
                                                    {tx.method === 'BALANCE' && <Wallet size={16} className="text-guepardo-accent drop-shadow-[0_0_8px_rgba(211,84,0,0.3)]" />}
                                                    <span className="text-xs font-black text-white/70 uppercase tracking-tight">{tx.method}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`
                                                    px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider
                                                    ${tx.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                        tx.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                            'bg-red-500/20 text-red-400 border border-red-500/30'}
                                                `}>
                                                    {tx.status === 'CONFIRMED' ? 'Concluído' : tx.status === 'PENDING' ? 'Pendente' : 'Falhou'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`text-sm font-black italic tracking-tight ${tx.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                                                    {tx.amount > 0 ? '+' : ''} R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>

                                        {/* Expanded QR Code Row */}
                                        {expandedTxId === tx.id && tx.qrCode && (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-0">
                                                    <div className="overflow-hidden animate-in slide-in-from-top-4 duration-300">
                                                        <div className="bg-white/[0.02] border-x border-b border-white/5 rounded-b-2xl p-8 mb-4 flex flex-col md:flex-row items-center justify-center gap-12">
                                                            {/* QR Code Presentation */}
                                                            <div className="relative group">
                                                                <div className="absolute -inset-4 bg-blue-500/20 rounded-3xl blur-2xl group-hover:bg-blue-500/30 transition-all"></div>
                                                                <div className="relative bg-white p-6 rounded-2xl shadow-2xl">
                                                                    <img 
                                                                        src={`data:image/png;base64,${tx.qrCode}`} 
                                                                        alt="QR Code PIX" 
                                                                        className="w-48 h-48"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Instructions & Copy Button */}
                                                            <div className="flex flex-col gap-6 max-w-sm">
                                                                <div>
                                                                    <h4 className="text-xl font-black italic tracking-tight text-white mb-2">Pague com PIX</h4>
                                                                    <p className="text-white/50 text-xs leading-relaxed uppercase font-bold tracking-widest">
                                                                        Escaneie o QR Code ao lado ou utilize o código "Copia e Cola" abaixo para concluir sua recarga.
                                                                    </p>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <div className="flex flex-col gap-2">
                                                                        <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">Código Copia e Cola</span>
                                                                        <div className="flex gap-2">
                                                                            <input 
                                                                                type="text" 
                                                                                readOnly 
                                                                                value={tx.qrCodePayload}
                                                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/40 font-mono focus:outline-none"
                                                                            />
                                                                            <button 
                                                                                onClick={() => handleCopy(tx.qrCodePayload || '')}
                                                                                className={`
                                                                                    px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2
                                                                                    ${copied ? 'bg-green-500 text-white' : 'bg-guepardo-accent hover:bg-orange-600 text-white'}
                                                                                `}
                                                                            >
                                                                                {copied ? 'COPIADO!' : 'COPIAR'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                                                    <Clock size={16} className="text-amber-500 animate-pulse" />
                                                                    <span className="text-xs font-bold text-amber-500 uppercase">Aguardando confirmação do pagamento...</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-white/20">
                                            <History size={48} strokeWidth={1} />
                                            <p className="font-bold uppercase tracking-widest text-xs">Nenhuma movimentação encontrada</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <RechargeModal
                isOpen={isRechargeModalOpen}
                onClose={() => setIsRechargeModalOpen(false)}
                storeId={storeId}
            />
        </div>
    );
};
