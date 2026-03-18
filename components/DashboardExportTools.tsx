import React from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { Order } from '../types';

interface DashboardExportToolsProps {
  orders: Order[];
  filterLabel?: string;
  kpiData?: {
    sales: number;
    fees: number;
    orders: number;
    canceledCount: number;
    cancellationRate: number;
    avgTicket: number;
    newCustomers: number;
  };
  onPrint?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
}

export const DashboardExportTools: React.FC<DashboardExportToolsProps> = ({ 
  orders, 
  filterLabel = 'relatorio',
  kpiData,
  onPrint, 
  onExportExcel, 
  onExportPDF 
}) => {
  
  // Basic CSV Export Logic using current filters and KPIs
  const handleExcelExport = () => {
    if (onExportExcel) {
      onExportExcel();
      return;
    }
    
    let csvRows = [];

    // 1. Add KPI Summary if available
    if (kpiData) {
      csvRows.push(['RESUMO DO PERIODO (' + filterLabel.toUpperCase() + ')'].join(';'));
      csvRows.push(['Vendas Realizadas', kpiData.orders].join(';'));
      csvRows.push(['Total em Vendas', 'R$ ' + kpiData.sales.toFixed(2)].join(';'));
      csvRows.push(['Taxas Logisticas', 'R$ ' + kpiData.fees.toFixed(2)].join(';'));
      csvRows.push(['Ticket Medio', 'R$ ' + kpiData.avgTicket.toFixed(2)].join(';'));
      csvRows.push(['Novos Clientes', kpiData.newCustomers].join(';'));
      csvRows.push(['Cancelamentos', kpiData.canceledCount + ' (' + kpiData.cancellationRate.toFixed(1) + '%)'].join(';'));
      csvRows.push(['']); // Spacer
    }

    // 2. Add Orders Table
    const headers = ['ID', 'Data', 'Cliente', 'Telefone', 'Valor Produto', 'Taxa Entrega', 'Total', 'Metodo Pagamento', 'Status'];
    csvRows.push(headers.join(';'));
    
    orders.forEach(o => {
      csvRows.push([
        o.id,
        new Date(o.createdAt).toLocaleString('pt-BR'),
        o.clientName,
        o.clientPhone || '-',
        (o.deliveryValue || 0).toFixed(2),
        (o.estimatedPrice || 0).toFixed(2),
        ((o.deliveryValue || 0) + (o.estimatedPrice || 0)).toFixed(2),
        o.paymentMethod || 'PIX',
        o.status
      ].join(';'));
    });

    const csvContent = csvRows.join('\n');

    // BOM for Excel to recognize UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `guepardo_${filterLabel}_${dateStr}.csv`;
    link.click();
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="flex items-center gap-2 pl-4 border-l border-white/10 ml-2">
      {/* EXCEL / RELATÓRIO GREEN */}
      <button
        onClick={handleExcelExport}
        title="Exportar para Excel"
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-500 transition-all hover:scale-105"
      >
        <FileText size={20} />
      </button>

      {/* PDF RED */}
      <button
        onClick={onExportPDF || (() => alert('Funcionalidade de PDF em desenvolvimento'))}
        title="Exportar para PDF"
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 transition-all hover:scale-105"
      >
        <Download size={20} />
      </button>

      {/* PRINT GRAY/WHITE */}
      <button
        onClick={handlePrint}
        title="Imprimir Relatório"
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all hover:scale-105"
      >
        <Printer size={20} />
      </button>
    </div>
  );
};
