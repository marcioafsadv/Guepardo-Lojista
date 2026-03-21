import React, { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { 
    Clock, Search, FileSpreadsheet, FileDown, Printer, Hash, User, MapPin, Store, MessageSquare, 
    Navigation, BadgeDollarSign, Bike, BarChart3, TrendingUp 
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip as RechartsTooltip, BarChart, Bar, Cell 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ChatMultilateralModal } from './ChatMultilateralModal';

interface HistoryViewProps {
    orders: Order[];
    onSelectOrder: (order: Order) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ orders, onSelectOrder }) => {
    const [statusCategory, setStatusCategory] = useState<'all' | 'active' | 'finished'>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedOrderForChat, setSelectedOrderForChat] = useState<Order | null>(null);

    const handleOpenChat = (e: React.MouseEvent, order: Order) => {
        e.stopPropagation();
        setSelectedOrderForChat(order);
        setIsChatOpen(true);
    };

    const handlePresetDate = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);

        const formatLocal = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        setStartDate(formatLocal(start));
        setEndDate(formatLocal(end));
    };

    const getStatusLabel = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING: return 'Pendente';
            case OrderStatus.ACCEPTED: return 'Aceito';
            case OrderStatus.TO_STORE: return 'A caminho da loja';
            case OrderStatus.ARRIVED_AT_STORE: return 'Na loja';
            case OrderStatus.READY_FOR_PICKUP: return 'Pronto para coleta';
            case OrderStatus.IN_TRANSIT: return 'Em rota';
            case OrderStatus.RETURNING: return 'Retornando';
            case OrderStatus.DELIVERED: return 'Finalizado';
            case OrderStatus.CANCELED: return 'Cancelado';
            default: return status;
        }
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            // Category Filter
            if (statusCategory === 'active' && (o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELED)) return false;
            if (statusCategory === 'finished' && (o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELED)) return false;

            // Specific Status Filter
            if (selectedStatus !== 'all' && o.status !== selectedStatus) return false;

            // Search Filter (ID or Client Name)
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesId = String(o.display_id || o.id).toLowerCase().includes(term);
                const matchesClient = String(o.clientName || '').toLowerCase().includes(term);
                if (!matchesId && !matchesClient) return false;
            }

            // Date Filter
            const orderDate = new Date(o.createdAt);
            const parseLocal = (dateStr: string, isEnd: boolean = false) => {
                const [y, m, d] = dateStr.split('-').map(Number);
                const date = new Date(y, m - 1, d);
                if (isEnd) date.setHours(23, 59, 59, 999);
                else date.setHours(0, 0, 0, 0);
                return date;
            };

            const start = startDate ? parseLocal(startDate) : null;
            const end = endDate ? parseLocal(endDate, true) : null;

            if (start && orderDate < start) return false;
            if (end && orderDate > end) return false;

            return true;
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [orders, statusCategory, selectedStatus, searchTerm, startDate, endDate]);

    // Financial calculations
    const totalSales = filteredOrders.reduce((acc, curr) => acc + (curr.deliveryValue || 0), 0);
    const totalFees = filteredOrders.reduce((acc, curr) => acc + (curr.storeFreight || 0), 0);

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Relatório de Entregas - Guepardo Lojista", 14, 22);
        doc.setFontSize(11);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Período: ${startDate ? new Date(startDate).toLocaleDateString() : 'Início'} até ${endDate ? new Date(endDate).toLocaleDateString() : 'Hoje'}`, 14, 36);

        const tableColumn = ["ID", "Data/Hora", "Cliente", "Endereço", "Status", "Valor (R$)", "Taxa (R$)"];
        const tableRows: any[] = [];

        filteredOrders.forEach(order => {
            tableRows.push([
                order.id.slice(-4),
                `${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                order.clientName,
                order.destination,
                order.status,
                (Number(order.deliveryValue) || 0).toFixed(2),
                (Number(order.storeFreight) || 0).toFixed(2)
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 44,
        });

        doc.save(`relatorio_entregas_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const wsData = [
            ["ID", "Data", "Hora", "Cliente", "Telefone", "Endereço", "Status", "Valor Total", "Taxa de Entrega", "Pagamento"],
            ...filteredOrders.map(order => [
                order.id,
                new Date(order.createdAt).toLocaleDateString(),
                new Date(order.createdAt).toLocaleTimeString(),
                order.clientName,
                order.clientPhone || '',
                order.destination,
                order.status,
                order.estimatedPrice || 0,
                order.deliveryValue || 0,
                order.paymentMethod
            ])
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Entregas");
        XLSX.writeFile(wb, `relatorio_entregas_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filterText = useMemo(() => {
        if (!startDate && !endDate) return 'Tudo';
        return `${startDate ? new Date(startDate).toLocaleDateString() : 'Início'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Hoje'}`;
    }, [startDate, endDate]);

    return (
        <div className="flex flex-col h-full bg-[#0D0500] text-white">
            {/* TOOLBAR */}
            <div className="p-6 bg-[#1A0900]/40 border-b border-white/5 backdrop-blur-3xl sticky top-0 z-20">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-guepardo-accent rounded-2xl shadow-[0_0_20px_rgba(211,84,0,0.3)]">
                            <Clock size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Histórico de Entregas</h2>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{filteredOrders.length} solicitações encontradas</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* SEARCH BAR */}
                        <div className="relative group">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-guepardo-accent transition-colors" />
                            <input 
                                type="text"
                                placeholder="Buscar pedido ou cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-guepardo-accent/50 focus:bg-white/10 transition-all w-[240px]"
                            />
                        </div>

                        {/* STATUS CATEGORY TOGGLE */}
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                            {(['all', 'active', 'finished'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setStatusCategory(f)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusCategory === f
                                        ? 'bg-guepardo-accent text-white shadow-lg shadow-guepardo-accent/20'
                                        : 'text-white/40 hover:text-white'
                                        }`}
                                >
                                    {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Finalizados'}
                                </button>
                            ))}
                        </div>

                        {/* SPECIFIC STATUS FILTER */}
                        <select 
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white focus:outline-none appearance-none cursor-pointer"
                        >
                            <option value="all" className="bg-[#1A0900]">Todos os Status</option>
                            <option value="PENDING" className="bg-[#1A0900]">Pendentes</option>
                            <option value="ACCEPTED" className="bg-[#1A0900]">Aceitos</option>
                            <option value="IN_TRANSIT" className="bg-[#1A0900]">Em Rota</option>
                            <option value="DELIVERED" className="bg-[#1A0900]">Concluídos</option>
                            <option value="CANCELED" className="bg-[#1A0900]">Cancelados</option>
                        </select>

                        <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
                            <button onClick={() => handlePresetDate(7)} className="px-3 py-1.5 text-[9px] font-black text-white/40 hover:text-white border-r border-white/5 uppercase tracking-widest">7 Dias</button>
                            <button onClick={() => handlePresetDate(30)} className="px-3 py-1.5 text-[9px] font-black text-white/40 hover:text-white border-r border-white/5 uppercase tracking-widest">30 Dias</button>
                            
                            <div className="flex items-center gap-2 px-2">
                                <span className="text-[9px] font-black text-white/20 uppercase">De:</span>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[10px] font-black text-white focus:outline-none [color-scheme:dark]" />
                            </div>
                            <div className="w-px h-4 bg-white/5"></div>
                            <div className="flex items-center gap-2 px-2">
                                <span className="text-[9px] font-black text-white/20 uppercase">Até:</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[10px] font-black text-white focus:outline-none [color-scheme:dark]" />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={handleExportExcel} className="p-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl border border-green-500/20 transition-all">
                                <FileSpreadsheet size={18} />
                            </button>
                            <button onClick={handleExportPDF} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all">
                                <FileDown size={18} />
                            </button>
                            <button onClick={handlePrint} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all">
                                <Printer size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-guepardo bg-[#0D0500]">
                {filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 opacity-20">
                        <Search size={64} className="mb-4 text-white" />
                        <p className="text-xl font-black italic uppercase tracking-widest text-white">Nenhuma solicitação encontrada</p>
                    </div>
                ) : (
                    <>
                        {filteredOrders.map(order => (
                            <div 
                                key={order.id}
                                onClick={() => onSelectOrder(order)}
                                className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-4 flex flex-wrap lg:flex-nowrap items-center gap-6 hover:bg-white/[0.07] hover:border-orange-500/30 transition-all duration-300 cursor-pointer group shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute -right-20 -top-20 w-40 h-40 bg-orange-500/5 rounded-full blur-[60px] group-hover:bg-orange-500/10 transition-all duration-700"></div>

                                <div className="flex flex-col min-w-[120px]">
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Hash size={10} /> Pedido
                                    </span>
                                    <h4 className="text-xl font-black text-white italic tracking-tighter">
                                        #{order.display_id || order.id.slice(-4)}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                            order.status === OrderStatus.DELIVERED ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            order.status === OrderStatus.CANCELED ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                        <span className="text-[10px] text-white/40 font-bold flex items-center gap-1">
                                            <Clock size={10} /> {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                <div className="w-px h-12 bg-white/5 hidden lg:block"></div>

                                <div className="flex items-center gap-3 min-w-[160px]">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                        <User size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest mb-0.5">Cliente</span>
                                        <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors uppercase truncate max-w-[130px]">
                                            {order.clientName}
                                        </span>
                                    </div>
                                </div>

                                <div className="w-px h-12 bg-white/5 hidden lg:block"></div>

                                <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                                    <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                        <MapPin size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-red-400/60 uppercase tracking-widest mb-0.5">Localização de Entrega</span>
                                        <span className="text-xs font-bold text-white/70 line-clamp-1 group-hover:text-white transition-colors">
                                            {order.addressStreet}, {order.addressNumber} - {order.addressCity}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col min-w-[100px]">
                                    <span className="text-[10px] font-black text-green-400/60 uppercase tracking-widest mb-1">Valor Total</span>
                                    <span className="text-lg font-black italic text-white tracking-tighter">
                                        R$ {(Number(order.storeFreight) || 0).toFixed(2)}
                                    </span>
                                </div>

                                <div className="w-px h-12 bg-white/5 hidden lg:block"></div>

                                <div className="flex items-center gap-3 min-w-[150px]">
                                    <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
                                        <Store size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest mb-0.5">Lojista</span>
                                        <span className="text-xs font-black text-white/80 uppercase truncate max-w-[120px]">
                                            LOJA GUEPARDO
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                        <img 
                                            src={order.courier?.photoUrl || `https://ui-avatars.com/api/?name=${order.courier?.name || 'G'}&background=D35400&color=fff`} 
                                            className="w-10 h-10 rounded-full border-2 border-white/10 object-cover" 
                                            alt="" 
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Entregador</span>
                                            <span className="text-xs font-extrabold text-white truncate max-w-[100px] uppercase">
                                                {order.courier?.name.split(' ')[0] || 'GUEPARDO'}...
                                            </span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onSelectOrder(order); }}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white tracking-widest transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                                    >
                                        VER DETALHES
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                    <button 
                                        onClick={(e) => handleOpenChat(e, order)}
                                        className="p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/20 transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                    >
                                        <MessageSquare size={18} />
                                    </button>
                                    <button className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all">
                                        <Navigation size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* FINANCIAL KPI SECTION */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10">
                            <div className="bg-brand-gradient-premium backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-[0_20px_50px_rgba(211,84,0,0.15)]">
                                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                        <BadgeDollarSign size={24} />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 relative z-10">
                                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Volume de Transação</span>
                                    <h3 className="text-5xl font-black italic text-white tracking-tighter drop-shadow-lg">
                                        R$ {totalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <TrendingUp size={12} className="text-white/80" />
                                        <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Acumulado Total</span>
                                    </div>
                                </div>
                                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
                            </div>
 
                            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group hover:bg-white/10 transition-all duration-500 shadow-2xl">
                                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                        <Navigation size={24} />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 relative z-10">
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total de Pedidos</span>
                                    <h3 className="text-5xl font-black italic text-white tracking-tighter drop-shadow-md">
                                        {filteredOrders.length}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <TrendingUp size={12} className="text-blue-500" />
                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Volume Entregas</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* VISUAL CHARTS SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-32 pt-10">
                            <div className="bg-[#1A0900]/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 min-h-[400px]">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-guepardo-accent/10 rounded-xl text-guepardo-accent">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black italic uppercase text-white tracking-widest">Fluxo Financeiro</h4>
                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Volume x Receita (Últimas Entregas)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={filteredOrders.slice().reverse().slice(-10)}>
                                            <defs>
                                                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis 
                                                dataKey="createdAt" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 'bold' }}
                                                tickFormatter={(date) => new Date(date).toLocaleDateString()}
                                            />
                                            <YAxis 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 'bold' }}
                                                tickFormatter={(val) => `R$ ${val}`}
                                            />
                                            <RechartsTooltip 
                                                contentStyle={{ backgroundColor: '#1A0900', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                                itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                                labelStyle={{ display: 'none' }}
                                            />
                                            <Area type="monotone" dataKey="storeFreight" name="Volume" stroke="#FF6B00" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                                            <Area type="monotone" dataKey="deliveryValue" name="Taxa" stroke="#FFF" strokeWidth={2} fill="transparent" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-[#1A0900]/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 min-h-[400px]">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                                            <BarChart3 size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black italic uppercase text-white tracking-widest">Performance Mensal</h4>
                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Volume Total por Dia</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            data={
                                                Object.entries(
                                                    filteredOrders.reduce((acc, curr) => {
                                                        const date = new Date(curr.createdAt).toLocaleDateString();
                                                        acc[date] = (acc[date] || 0) + (Number(curr.estimatedPrice) || 0);
                                                        return acc;
                                                    }, {} as Record<string, number>)
                                                ).map(([date, volume]) => ({ date, volume })).slice(-7)
                                            }
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis 
                                                dataKey="date" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 'bold' }}
                                            />
                                            <YAxis 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 'bold' }}
                                                tickFormatter={(val) => `R$ ${val}`}
                                            />
                                            <RechartsTooltip 
                                                contentStyle={{ backgroundColor: '#1A0900', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                                itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                                labelStyle={{ display: 'none' }}
                                            />
                                            <Bar dataKey="volume" name="Faturamento" radius={[8, 8, 0, 0]} fill="#FF6B00" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </>
                )}
             </div>

            <div className="bg-[#1A0900]/80 backdrop-blur-3xl border-t border-white/10 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total de Pedidos</span>
                        <span className="text-xl font-black italic text-white">{filteredOrders.length}</span>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Período Selecionado</span>
                        <span className="text-sm font-bold text-white/70">{filterText}</span>
                    </div>
                </div>
                
                <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Custo Total</span>
                <span className="text-xl font-black italic text-guepardo-accent drop-shadow-glow">
                    R$ {totalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
            </div>

            <ChatMultilateralModal 
                order={selectedOrderForChat!} 
                onClose={() => setSelectedOrderForChat(null)} 
                theme="dark"
            />

            <div className="hidden print:block fixed top-0 left-0 w-full bg-white p-8 border-b border-black text-black">
                <h1 className="text-2xl font-bold mb-2">Relatório de Entregas - Guepardo Lojista</h1>
                <p className="text-sm">Gerado em: {new Date().toLocaleString()}</p>
            </div>

            <style>{`
                @media print {
                    @page { margin: 1cm; size: landscape; }
                    body * { visibility: hidden; }
                    .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; visibility: visible; }
                    .print\\:blockContent * { visibility: visible; }
                }
            `}</style>
        </div>
    );
};
