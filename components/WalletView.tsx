import React, { useState, useEffect } from 'react';
import { Wallet, Plus, CreditCard, QrCode, FileText, TrendingUp, History, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { RechargeModal } from './RechargeModal';

interface Transaction {
    id: string;
    date: string;
    amount: number;
    type: 'RECHARGE' | 'PAYMENT' | 'REFUND';
    method: 'PIX' | 'CARD' | 'BOLETO' | 'BALANCE';
    status: 'CONFIRMED' | 'PENDING' | 'FAILED';
}

interface WalletViewProps {
    balance: number;
    storeId: string;
}

export const WalletView: React.FC<WalletViewProps> = ({ balance, storeId }) => {
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([
        // Mock data for initial UI
        { id: '1', date: '2026-03-06 14:20', amount: 50.00, type: 'RECHARGE', method: 'PIX', status: 'CONFIRMED' },
        { id: '2', date: '2026-03-05 10:15', amount: -15.50, type: 'PAYMENT', method: 'BALANCE', status: 'CONFIRMED' },
        { id: '3', date: '2026-03-04 18:30', amount: 100.00, type: 'RECHARGE', method: 'BOLETO', status: 'PENDING' },
    ]);

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
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-bold text-white/70 uppercase">Conectado ao Asaas</span>
                    </div>
                </div>
            </div>

            {/* main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">

                {/* Balance Card - PREMIUM */}
                <div className="lg:col-span-2 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-brand-gradient-premium opacity-90 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

                    <div className="relative p-10 flex flex-col justify-between h-full min-h-[240px]">
                        <div>
                            <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Saldo Disponível</span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-2xl font-bold text-white/60">R$</span>
                                <h1 className="text-6xl font-black tracking-tighter tabular-nums">
                                    {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h1>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setIsRechargeModalOpen(true)}
                                className="group relative bg-[#E26D21] hover:bg-[#F37E32] text-white px-8 py-4 rounded-2xl font-black italic text-lg shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                            >
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
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between">
                    <div>
                        <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Uso este mês</span>
                        <div className="mt-4 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-white/70">Entradas</span>
                                </div>
                                <span className="font-bold text-green-500">+ R$ 150,00</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                                        <ArrowDownRight size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-white/70">Saídas</span>
                                </div>
                                <span className="font-bold text-red-400">- R$ 15,50</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5">
                        <p className="text-[10px] text-white/30 uppercase font-bold text-center">
                            Taxas de transação podem ser aplicadas pelo Asaas
                        </p>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex-1 flex flex-col">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-black italic tracking-tight flex items-center gap-2">
                        <History size={18} className="text-guepardo-accent" />
                        ÚLTIMAS MOVIMENTAÇÕES
                    </h3>
                    <div className="text-xs text-white/40 font-medium">Exibindo últimas 20 transações</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/20 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-8 py-4">Data/Hora</th>
                                <th className="px-8 py-4">Descrição</th>
                                <th className="px-8 py-4">Método</th>
                                <th className="px-8 py-4 text-center">Status</th>
                                <th className="px-8 py-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
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
                                            <span className="text-[10px] text-white/30 font-medium">ID: #{tx.id.padStart(6, '0')}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            {tx.method === 'PIX' && <QrCode size={14} className="text-blue-400" />}
                                            {tx.method === 'CARD' && <CreditCard size={14} className="text-purple-400" />}
                                            {tx.method === 'BALANCE' && <Wallet size={14} className="text-orange-400" />}
                                            <span className="text-xs font-bold text-white/60 uppercase">{tx.method}</span>
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
                            ))}
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
