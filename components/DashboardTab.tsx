import React, { useMemo, useState } from 'react';
import { Order, Customer, OrderStatus } from '../types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  DollarSign, ShoppingBag, Clock, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, Users,
  CreditCard, Banknote, QrCode, Coins, Wallet, XCircle
} from 'lucide-react';

import { AppView } from './GlobalSidebar';

interface DashboardTabProps {
  orders: Order[];
  totalSpent: number;
  customers: Customer[];
  onViewChange: (view: AppView) => void;
}

type TimeFilter = 'today' | '7days' | 'month';

interface PaymentStat {
  count: number;
  total: number;
  label: string;
  color: string;
  icon: any;
}

const COLORS = {
  gold: '#D35400', // Replaced with Orange
  orange: '#E67E22', // Secondary Orange
  brown: '#3E1F11',
  green: '#10B981', // PIX
  blue: '#3B82F6',  // CARD
  red: '#EF4444',
  gray: '#E5E7EB',
  purple: '#8B5CF6'
};

export const DashboardTab: React.FC<DashboardTabProps> = ({ orders, customers, onViewChange }) => {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date; label: string }>({
    start: new Date(),
    end: new Date(),
    label: 'today'
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Helper to set presets
  const setPreset = (preset: 'today' | '7days' | '30days') => {
    const end = new Date();
    const start = new Date();

    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === '7days') {
      start.setDate(end.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (preset === '30days') {
      start.setDate(end.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    }

    setDateRange({ start, end, label: preset });
    setShowCustomPicker(false);
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const newDate = e.target.value ? new Date(e.target.value) : new Date();
    if (type === 'start') {
      // Adjust time to start of day if needed, but input date usually handles YYYY-MM-DD
      // We'll keep time as is or set to 00:00 for start
      const s = new Date(newDate);
      s.setHours(0, 0, 0, 0); // Force start of day for accurate filtering
      setDateRange(prev => ({ ...prev, start: s, label: 'custom' }));
    } else {
      const end = new Date(newDate);
      end.setHours(23, 59, 59, 999);
      setDateRange(prev => ({ ...prev, end, label: 'custom' }));
    }
  };

  // --- 1. FILTER LOGIC ---
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });
  }, [orders, dateRange]);

  // --- 2. KPI CALCULATIONS ---
  // --- 2. KPI CALCULATIONS ---
  const kpiData = useMemo(() => {
    // Separate Canceled from Completed for accurate Revenue
    const completedOrders = filteredOrders.filter(o => o.status !== OrderStatus.CANCELED);
    const canceledOrders = filteredOrders.filter(o => o.status === OrderStatus.CANCELED);

    const totalSales = completedOrders.reduce((acc, curr) => acc + (curr.deliveryValue || 0), 0);
    const totalFees = completedOrders.reduce((acc, curr) => acc + (curr.estimatedPrice || 0), 0);

    // Total Revenue for growth calc context (or could stay as total sales)
    const totalRevenue = totalSales;

    const totalOrders = filteredOrders.length; // Total includes canceled for volume

    // New Customers Logic
    // 1. Get all customer IDs for the filtered period
    const customersInPeriod = new Set<string>(completedOrders.map(o => (o.clientPhone || o.clientName) as string)); // Use unique identifier logic
    // 2. Count how many of these are their FIRST order (Simplification: in this dataset)
    // In a real app, check creation date of customer vs filter start date.
    // For this mock/client-side data:
    let newCustomersCount = 0;
    // We need to look at ALL orders to find first order date for each customer
    const allCustomerFirstOrders = new Map<string, Date>();

    orders.forEach(o => {
      const key = o.clientPhone || o.clientName;
      const d = new Date(o.createdAt);
      if (!allCustomerFirstOrders.has(key) || d < allCustomerFirstOrders.get(key)!) {
        allCustomerFirstOrders.set(key, d);
      }
    });

    customersInPeriod.forEach(key => {
      const firstOrderDate = allCustomerFirstOrders.get(key);
      if (firstOrderDate && firstOrderDate >= dateRange.start && firstOrderDate <= dateRange.end) {
        newCustomersCount++;
      }
    });


    const canceledCount = canceledOrders.length;
    const cancellationRate = totalOrders > 0 ? (canceledCount / totalOrders) * 100 : 0;

    const avgTicket = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

    // Growth mocking
    const revenueGrowth = dateRange.label === 'today' ? 12.5 : dateRange.label === '7days' ? -5.2 : 8.4;
    const ordersGrowth = 42.11; // Mocked
    const ticketGrowth = -11.15; // Mocked
    const newClientsGrowth = 36.84; // Mocked

    return {
      sales: totalSales,
      fees: totalFees,
      orders: totalOrders,
      canceledCount,
      cancellationRate,
      avgTicket: avgTicket,
      newCustomers: newCustomersCount,
      growth: {
        revenue: revenueGrowth,
        orders: ordersGrowth,
        ticket: ticketGrowth,
        newClients: newClientsGrowth
      }
    };
  }, [filteredOrders, dateRange, orders]);

  // --- 3. PAYMENT METRICS (FINANCIAL INTELLIGENCE) ---
  const paymentMetrics = useMemo(() => {
    const stats: Record<string, PaymentStat & { sales: number, fees: number }> = {
      PIX: { count: 0, total: 0, sales: 0, fees: 0, label: 'PIX', color: COLORS.green, icon: QrCode },
      CARD: { count: 0, total: 0, sales: 0, fees: 0, label: 'Cartão', color: COLORS.blue, icon: CreditCard },
      CASH: { count: 0, total: 0, sales: 0, fees: 0, label: 'Dinheiro', color: COLORS.orange, icon: Banknote },
    };

    let cashWithChangeCount = 0;

    filteredOrders.forEach(o => {
      // Skip Canceled orders for Finance
      if (o.status === OrderStatus.CANCELED) return;

      // Default to PIX if undefined for safety, though type enforces it
      const method = o.paymentMethod || 'PIX';
      if (stats[method]) {
        stats[method].count += 1;
        stats[method].total += (o.deliveryValue || 0); // Using Sales as Total here for chart
        stats[method].sales += (o.deliveryValue || 0);
        stats[method].fees += (o.estimatedPrice || 0);
      }

      // Change Logic
      if (method === 'CASH' && o.changeFor && o.changeFor > (o.deliveryValue || 0)) {
        cashWithChangeCount++;
      }
    });

    // Chart Data
    const chartData = Object.values(stats).map(s => ({
      name: s.label,
      value: s.count, // Using count for distribution share
      total: s.total,
      color: s.color
    })).filter(d => d.value > 0);

    // Preferred Method (by Volume)
    const preferred = Object.values(stats).reduce((prev, current) =>
      (prev.count > current.count) ? prev : current
    );

    return { stats, chartData, preferred, cashWithChangeCount };
  }, [filteredOrders]);


  // --- 4. HOURLY DATA ---
  const hourlyData = useMemo(() => {
    const data = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, hoje: 0, cancelados: 0, ontem: 0 }));
    filteredOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      if (data[hour]) {
        if (order.status === OrderStatus.CANCELED) {
          data[hour].cancelados += 1;
        } else {
          data[hour].hoje += 1;
        }
      }
    });
    data.forEach(d => {
      d.ontem = Math.max(0, Math.round(d.hoje * (0.8 + Math.random() * 0.4)));
      if (d.hoje === 0 && d.hour > '08h' && d.hour < '22h') d.ontem = Math.floor(Math.random() * 3);
    });
    if (dateRange.label === 'today') return data.slice(8, 23);
    return data;
  }, [filteredOrders, dateRange]);

  // --- 5. TOP CUSTOMERS ---
  const topCustomersData = useMemo(() => {
    const sorted = [...customers].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 5);
    return sorted.map(c => ({ name: c.name.split(' ')[0], fullName: c.name, orders: c.totalOrders, spent: c.totalSpent }));
  }, [customers]);

  return (
    <div className="flex flex-col h-full bg-gray-200 dark:bg-guepardo-gray-900 overflow-y-auto transition-colors duration-300">

      {/* HEADER & FILTERS */}
      <div className="px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard Operacional</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-green animate-pulse"></span>
            Loja Online • Padaria Rebeca
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white dark:bg-guepardo-gray-800 p-1 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm flex items-center">
            <button
              onClick={() => setPreset('today')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${dateRange.label === 'today' ? 'bg-guepardo-accent/10 text-guepardo-accent' : 'text-gray-500 hover:text-white'}`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPreset('7days')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${dateRange.label === '7days' ? 'bg-guepardo-accent/10 text-guepardo-accent' : 'text-gray-500 hover:text-white'}`}
            >
              Últ. 7 dias
            </button>
            <button
              onClick={() => setPreset('30days')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${dateRange.label === '30days' ? 'bg-guepardo-accent/10 text-guepardo-accent' : 'text-gray-500 hover:text-white'}`}
            >
              Últ. 30 dias
            </button>
            <button
              onClick={() => setShowCustomPicker(!showCustomPicker)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${dateRange.label === 'custom' ? 'bg-guepardo-accent/10 text-guepardo-accent' : 'text-gray-500 hover:text-white'}`}
            >
              Personalizado
            </button>
          </div>

          {showCustomPicker && (
            <div className="flex items-center gap-2 bg-white dark:bg-guepardo-gray-800 p-2 rounded-xl border border-gray-200 dark:border-white/5 animate-in fade-in slide-in-from-top-2">
              <input
                type="date"
                value={dateRange.start.toISOString().split('T')[0]}
                onChange={(e) => handleCustomDateChange(e, 'start')}
                className="bg-gray-100 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-guepardo-accent"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={dateRange.end.toISOString().split('T')[0]}
                onChange={(e) => handleCustomDateChange(e, 'end')}
                className="bg-gray-100 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-guepardo-accent"
              />
            </div>
          )}
        </div>
      </div>

      <div className="p-8 pt-0 space-y-6">

        {/* ROW 1: KPI GRID - NEW "VENDAS" CARD + OTHERS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          {/* Metric 1: Total Vendas */}
          <div className="bg-white dark:bg-guepardo-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <ShoppingBag size={20} />
              </div>
              <button
                onClick={() => onViewChange('history')}
                className="text-[10px] text-blue-500 border border-blue-500/30 px-2 py-1 rounded-full hover:bg-blue-500/10 transition-colors"
              >
                Ver
              </button>
            </div>

            <p className="text-gray-400 text-sm font-medium flex items-center gap-1 mb-1">
              Vendas Realizadas
              <span className="text-gray-600 cursor-help" title="Total de pedidos concluídos">ⓘ</span>
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.orders}</span>
              <span className={`text-xs font-bold flex items-center ${kpiData.growth.orders >= 0 ? 'text-status-green' : 'text-red-500'}`}>
                {kpiData.growth.orders >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(kpiData.growth.orders)}%
              </span>
            </div>
          </div>

          {/* Metric 2: Valor Total VENDAS */}
          <div className="bg-white dark:bg-guepardo-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                <DollarSign size={20} />
              </div>
            </div>

            <p className="text-gray-400 text-sm font-medium flex items-center gap-1 mb-1">
              Total em Vendas
              <span className="text-gray-600 cursor-help" title="Valor dos produtos vendidos">ⓘ</span>
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">R$ {kpiData.sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span className={`text-xs font-bold flex items-center ${kpiData.growth.revenue >= 0 ? 'text-status-green' : 'text-red-500'}`}>
                {kpiData.growth.revenue >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(kpiData.growth.revenue)}%
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] font-bold text-guepardo-orange flex items-center gap-0.5" title="Total em Taxas Logísticas">
                Taxas: R$ {kpiData.fees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Metric 3: Ticket Médio */}
          <div className="bg-white dark:bg-guepardo-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                <TrendingUp size={20} />
              </div>
            </div>

            <p className="text-gray-400 text-sm font-medium flex items-center gap-1 mb-1">
              Ticket Médio
              <span className="text-gray-600 cursor-help" title="Média de valor por pedido">ⓘ</span>
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">R$ {kpiData.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span className={`text-xs font-bold flex items-center ${kpiData.growth.ticket >= 0 ? 'text-status-green' : 'text-red-500'}`}>
                {kpiData.growth.ticket >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(kpiData.growth.ticket)}%
              </span>
            </div>
          </div>

          {/* Metric 4: Novos Clientes */}
          <div className="bg-white dark:bg-guepardo-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <Users size={20} />
              </div>
            </div>

            <p className="text-gray-400 text-sm font-medium flex items-center gap-1 mb-1">
              Novos Clientes
              <span className="text-gray-600 cursor-help" title="Clientes que fizeram o primeiro pedido">ⓘ</span>
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.newCustomers}</span>
              <span className={`text-xs font-bold flex items-center ${kpiData.growth.newClients >= 0 ? 'text-status-green' : 'text-red-500'}`}>
                {kpiData.growth.newClients >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(kpiData.growth.newClients)}%
              </span>
            </div>
          </div>


          {/* KPI 3: CANCELLATIONS (RETAINED) */}
          <div className="bg-white dark:bg-guepardo-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <XCircle size={64} className="text-red-500" />
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase mb-2">
              <div className="p-1.5 bg-red-500/10 rounded text-red-500"><XCircle size={14} /></div>
              Cancelamentos
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{kpiData.canceledCount}</span>
              <span className="text-xs font-bold mb-1.5 text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                {kpiData.cancellationRate.toFixed(1)}% taxa
              </span>
            </div>
          </div>

          {/* KPI 4: Preferred Payment (RETAINED) */}
          <div className="bg-white dark:bg-guepardo-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 relative overflow-hidden group col-span-1">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Wallet size={64} className="text-guepardo-gold" />
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase mb-2">
              <div className="p-1.5 bg-purple-500/10 rounded text-purple-400"><Wallet size={14} /></div>
              Método Favorito
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{paymentMetrics.preferred.label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              {/* Render Dynamic Icon based on preference */}
              {React.createElement(paymentMetrics.preferred.icon, { size: 12 })}
              Responsável por {((paymentMetrics.preferred.count / ((kpiData.orders - kpiData.canceledCount) || 1)) * 100).toFixed(0)}% das vendas
            </p>
          </div>
        </div>

        {/* ROW 2: CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* COLUMN 1+2: HOURLY VOLUME */}
          <div className="lg:col-span-2 bg-white dark:bg-guepardo-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Clock size={18} className="text-guepardo-orange" />
                Fluxo de Pedidos
              </h3>
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-guepardo-gold rounded-full"></span>
                  <span className="text-gray-400">Atual</span>
                </div>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHoje" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', borderRadius: '12px', border: '1px solid #374151', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                  <Area type="monotone" dataKey="hoje" stroke={COLORS.gold} strokeWidth={3} fillOpacity={1} fill="url(#colorHoje)" name="Pedidos (Vendas)" />
                  <Area type="monotone" dataKey="cancelados" stroke={COLORS.red} strokeWidth={2} fillOpacity={0.2} fill={COLORS.red} name="Cancelados" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* COLUMN 3: PAYMENT MIX (NEW CHART) */}
          <div className="bg-white dark:bg-guepardo-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 flex flex-col">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
              <Banknote size={18} className="text-status-green" />
              Mix de Pagamentos
            </h3>
            <div className="flex-1 min-h-[250px] relative">
              {paymentMetrics.chartData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMetrics.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentMetrics.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #374151', color: '#fff' }} formatter={(value, name, props) => [`${value} pedidos`, props.payload.name]} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Center Total */}
              {paymentMetrics.chartData.length > 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{kpiData.orders - kpiData.canceledCount}</span>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase">Vendas Reais</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 3: DETAILED FINANCE & CUSTOMERS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* TOP CUSTOMERS */}
          <div className="lg:col-span-2 bg-white dark:bg-guepardo-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-6">
              <Users size={18} className="text-status-blue" />
              Clientes Fiéis
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomersData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }} width={100} />
                  <Tooltip cursor={{ fill: '#374151' }} content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-guepardo-gray-900 p-3 border border-gray-700 shadow-lg rounded-xl">
                          <p className="font-bold text-white">{data.fullName}</p>
                          <p className="text-xs text-gray-400">{data.orders} pedidos • Total: R$ {data.spent.toFixed(2)}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="orders" fill={COLORS.orange} radius={[0, 4, 4, 0]} barSize={24}>
                    {topCustomersData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.gold : COLORS.orange} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* FINANCIAL VOLUME TABLE (NEW WIDGET) */}
          <div className="bg-white dark:bg-guepardo-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 flex flex-col">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-gray-400" />
              Volume Financeiro
            </h3>

            <div className="flex-1 space-y-4">
              {/* List */}
              {Object.values(paymentMetrics.stats).map((stat: any) => (
                <div key={stat.label} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 hover:border-guepardo-accent/50 dark:hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg text-white shadow-sm`} style={{ backgroundColor: stat.color }}>
                      {React.createElement(stat.icon, { size: 16 })}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">{stat.label}</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{stat.count} pedidos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">R$ {stat.sales.toFixed(0)}</p>
                    <p className="text-[10px] text-guepardo-orange font-bold">
                      + Taxas: R$ {stat.fees.toFixed(0)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Change Metric */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Coins size={14} className="text-guepardo-orange" />
                  <span className="text-xs font-bold text-gray-500 uppercase">Logística de Caixa</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Exigiu Troco</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {paymentMetrics.stats.CASH.count > 0
                      ? `${((paymentMetrics.cashWithChangeCount / paymentMetrics.stats.CASH.count) * 100).toFixed(0)}%`
                      : '0%'}
                    <span className="font-normal text-gray-500 text-xs ml-1">
                      ({paymentMetrics.cashWithChangeCount} pedidos)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

  );
};