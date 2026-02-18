import React, { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { Clock, Download, Printer, ChevronLeft, ChevronRight, Calendar, FileDown, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface HistoryViewProps {
    orders: Order[];
    onSelectOrder: (order: Order) => void;
}



export const HistoryView: React.FC<HistoryViewProps> = ({ orders, onSelectOrder }) => {
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const handlePresetDate = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);

        // Format as Local YYYY-MM-DD
        const formatLocal = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        setStartDate(formatLocal(start));
        setEndDate(formatLocal(end));
    };


    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            // 1. Status Filter
            if (statusFilter === 'pending' && (o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELED)) return false;
            if (statusFilter === 'completed' && o.status !== OrderStatus.DELIVERED) return false;

            // 2. Date Filter
            const orderDate = new Date(o.createdAt);

            // Fix: Parse YYYY-MM-DD as Local Time
            const parseLocal = (dateStr: string, isEnd: boolean = false) => {
                const [y, m, d] = dateStr.split('-').map(Number);
                const date = new Date(y, m - 1, d); // Local midnight
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
    }, [orders, statusFilter, startDate, endDate]);


    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Relatório de Entregas - Padaria Rebeca", 14, 22);

        doc.setFontSize(11);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Período: ${startDate ? new Date(startDate).toLocaleDateString() : 'Início'} até ${endDate ? new Date(endDate).toLocaleDateString() : 'Hoje'}`, 14, 36);

        const tableColumn = ["ID", "Data/Hora", "Cliente", "Endereço", "Status", "Valor (R$)", "Taxa (R$)"];
        const tableRows: any[] = [];

        filteredOrders.forEach(order => {
            const orderData = [
                order.id.slice(-4),
                `${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                order.clientName,
                order.destination,
                order.status,
                (order.estimatedPrice || 0).toFixed(2),
                (order.deliveryValue || 0).toFixed(3)
            ];
            tableRows.push(orderData);
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

    const totalValue = filteredOrders.reduce((acc, curr) => acc + (curr.deliveryValue || 0), 0);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-guepardo-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
            {/* TOOLBAR */}
            <div className="p-6 border-b border-gray-200 dark:border-guepardo-gray-800 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-50 dark:bg-guepardo-gray-900 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="text-guepardo-accent" /> Histórico de Entregas
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {filteredOrders.length} solicitações encontradas.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">

                    {/* Status Filter */}
                    <div className="flex bg-white dark:bg-guepardo-gray-800 p-1 rounded-lg border border-gray-200 dark:border-guepardo-gray-700 shadow-sm">
                        {['all', 'pending', 'completed'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f as any)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-colors ${statusFilter === f
                                    ? 'bg-gray-900 dark:bg-guepardo-accent text-white dark:text-guepardo-gray-900'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {f === 'all' ? 'Todos' : f === 'pending' ? 'Ativos' : 'Finalizados'}
                            </button>
                        ))}
                    </div>

                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 mx-1 hidden md:block"></div>

                    {/* Date Presets - REPLACED BY CUSTOM RANGE */}
                    <div className="flex items-center gap-2 bg-white dark:bg-guepardo-gray-800 p-1 rounded-lg border border-gray-200 dark:border-guepardo-gray-700 shadow-sm">

                        <button
                            onClick={() => handlePresetDate(7)}
                            className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border-r border-gray-300 dark:border-gray-700 pr-2 mr-1"
                        >
                            7 Dias
                        </button>
                        <button
                            onClick={() => handlePresetDate(30)}
                            className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border-r border-gray-300 dark:border-gray-700 pr-2 mr-1"
                        >
                            30 Dias
                        </button>

                        <div className="flex items-center gap-2 px-2">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">De:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none dark:[color-scheme:dark]"
                            />
                        </div>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-700"></div>
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Até:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none dark:[color-scheme:dark]"
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="text-[10px] text-red-500 hover:text-red-700 font-bold px-2"
                            >
                                Limpar
                            </button>
                        )}
                    </div>

                    {/* Month Picker (Conditional) */}


                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 mx-1 hidden md:block"></div>

                    {/* Export Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportExcel}
                            className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors shadow-sm"
                            title="Exportar Excel"
                        >
                            <FileSpreadsheet size={18} />
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors shadow-sm"
                            title="Exportar PDF"
                        >
                            <FileDown size={18} />
                        </button>
                        <button
                            onClick={handlePrint}
                            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm print:hidden"
                            title="Imprimir"
                        >
                            <Printer size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* TABLE CONTENT */}
            <div className="flex-1 overflow-y-auto print:overflow-visible">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-guepardo-gray-800 sticky top-0 z-10 transition-colors print:table-header-group">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-guepardo-gray-700">ID / Hora</th>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-guepardo-gray-700">Cliente</th>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-guepardo-gray-700">Endereço</th>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-guepardo-gray-700">Status</th>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-guepardo-gray-700 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-guepardo-gray-800">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                                    Nenhuma entrega encontrada neste período.
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-guepardo-gray-800/50 group transition-colors cursor-pointer print:break-inside-avoid" onClick={() => onSelectOrder(order)}>
                                    <td className="p-4">
                                        <span className="block font-mono text-xs font-bold text-gray-900 dark:text-guepardo-accent">#{order.display_id || order.id.slice(-4)}</span>
                                        <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-bold text-gray-900 dark:text-white">{order.clientName}</span>
                                    </td>
                                    <td className="p-4 max-w-xs truncate text-sm text-gray-600 dark:text-gray-400">
                                        {order.destination}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${order.status === OrderStatus.DELIVERED ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' :
                                            order.status === OrderStatus.CANCELED ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                                                'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="block text-sm font-bold text-gray-900 dark:text-white">R$ {(order.estimatedPrice || 0).toFixed(2)}</span>
                                        <span className="text-[10px] text-orange-600 font-bold">TAXA: R$ {(order.deliveryValue || 0).toFixed(3)}</span>
                                        {/* Using mockup deliveryValue as fee for display purpose if valid */}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-guepardo-gray-800 border-t-2 border-gray-200 dark:border-guepardo-gray-700 print:table-footer-group">
                        <tr>
                            <td colSpan={3} className="p-4 text-right text-xs font-bold text-gray-500 uppercase">Total do Período:</td>
                            <td colSpan={2} className="p-4 text-right text-lg font-bold text-gray-900 dark:text-white">R$ {totalValue.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Print Only Header (Visible only when printing) */}
            <div className="hidden print:block fixed top-0 left-0 w-full bg-white p-8 border-b border-black">
                <h1 className="text-2xl font-bold mb-2">Relatório de Entregas - Padaria Rebeca</h1>
                <p className="text-sm">Gerado em: {new Date().toLocaleString()}</p>
            </div>

            <style>{`
                @media print {
                    @page { margin: 1cm; size: landscape; }
                    body * {
                        visibility: hidden;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:block {
                        display: block !important;
                    }
                    .print\\:table-header-group {
                        display: table-header-group !important;
                    }
                    .print\\:table-footer-group {
                        display: table-footer-group !important;
                    }
                    .print\\:overflow-visible {
                        overflow: visible !important;
                    }
                    .print\\:break-inside-avoid {
                        break-inside: avoid !important;
                    }
                    /* Target the HistoryView container and make it visible */
                    div:has(> table) { 
                       visibility: visible;
                       position: absolute;
                       left: 0;
                       top: 0;
                       width: 100%;
                    }
                    div:has(> table) * {
                        visibility: visible;
                    }
                     /* Make table rows visible */
                    tr, td, th, tbody, thead, tfoot {
                        visibility: visible;
                    }
                }
            `}</style>
        </div>
    );
};
