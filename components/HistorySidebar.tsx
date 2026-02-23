
import React, { useState } from 'react';
import { Order, Customer } from '../types';
import { TrendingUp, Users, Search, Phone, FileText, LayoutDashboard } from 'lucide-react';
import { DashboardTab } from './DashboardTab';

interface HistorySidebarProps {
    orders: Order[];
    totalSpent: number;
    customers: Customer[];
    onSelectOrder?: (order: Order) => void;
    onViewClientDetails?: (customer: Customer) => void;
    storeName?: string;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ orders, totalSpent, customers, onSelectOrder, onViewClientDetails, storeName = 'Minha Loja' }) => {
    const [activeTab, setActiveTab] = useState<'history' | 'clients' | 'dashboard'>('history');
    const [clientSearch, setClientSearch] = useState('');

    const recentOrders = [...orders].reverse();

    // Filter Customers
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone.includes(clientSearch)
    );

    return (
        <div className="bg-white h-full flex flex-col border-l border-gray-200">

            {/* TABS HEADER */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider flex flex-col md:flex-row items-center justify-center gap-1 transition-colors ${activeTab === 'history' ? 'text-guepardo-accent bg-gray-50 border-b-2 border-guepardo-accent' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <TrendingUp size={16} /> <span className="hidden md:inline">Histórico</span>
                </button>
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`flex-1 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider flex flex-col md:flex-row items-center justify-center gap-1 transition-colors ${activeTab === 'clients' ? 'text-guepardo-accent bg-gray-50 border-b-2 border-guepardo-accent' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <Users size={16} /> <span className="hidden md:inline">Clientes</span>
                </button>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex-1 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider flex flex-col md:flex-row items-center justify-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-guepardo-accent bg-gray-900 !text-guepardo-accent border-b-2 border-guepardo-accent' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <LayoutDashboard size={16} /> <span className="hidden md:inline">Dash</span>
                </button>
            </div>

            {/* --- DASHBOARD TAB CONTENT --- */}
            {activeTab === 'dashboard' && (
                <DashboardTab orders={orders} totalSpent={totalSpent} customers={customers} onViewChange={() => { }} storeName={storeName} />
            )}

            {/* --- HISTORY TAB CONTENT --- */}
            {activeTab === 'history' && (
                <div className="flex flex-col h-full bg-white">
                    <div className="p-6 bg-gray-50 border-b border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                                <span className="text-xs text-gray-400 block mb-1">Entregas</span>
                                <span className="text-2xl font-bold text-gray-800">{orders.length}</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                                <span className="text-xs text-gray-400 block mb-1">Total Frete</span>
                                <span className="text-2xl font-bold text-gray-800 flex items-center gap-0.5">
                                    <span className="text-sm text-gray-400">R$</span>
                                    {(totalSpent || 0).toFixed(0)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                        <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase">Últimas Solicitações</h3>
                        <div className="space-y-3">
                            {recentOrders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => onSelectOrder && onSelectOrder(order)}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-all border border-transparent hover:border-gray-200 group active:scale-95"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                                            // @ts-ignore
                                            order.status === 'DELIVERED' ? 'bg-green-500' :
                                                // @ts-ignore
                                                order.status === 'CANCELED' ? 'bg-red-500' : 'bg-guepardo-accent'
                                            }`}></div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-gray-800 truncate w-32">{order.clientName}</p>
                                            <p className="text-xs text-gray-500">
                                                {order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • #{order.id.slice(-4)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-600">R$ {(order.estimatedPrice || 0).toFixed(2)}</span>
                                        <FileText size={14} className="text-gray-300 group-hover:text-guepardo-orange" />
                                    </div>
                                </div>
                            ))}

                            {recentOrders.length === 0 && (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    <div className="mx-auto mb-2 opacity-50 w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                                    Nenhuma entrega hoje.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- CLIENTS TAB CONTENT (MINIMALIST) --- */}
            {activeTab === 'clients' && (
                <div className="flex flex-col h-full bg-gray-50">
                    {/* Search */}
                    <div className="p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou telefone..."
                                className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-guepardo-accent focus:outline-none transition-all"
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {filteredCustomers.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                <Users size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Nenhum cliente encontrado.</p>
                            </div>
                        ) : (
                            filteredCustomers.map(customer => (
                                <div key={customer.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-guepardo-accent/50 transition-colors">
                                    {/* Minimalist Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-lg leading-tight">{customer.name}</h4>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <Phone size={14} />
                                                <span className="font-mono text-xs">{customer.phone || 'Sem contato'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Single Primary Action */}
                                    <button
                                        onClick={() => onViewClientDetails && onViewClientDetails(customer)}
                                        className="w-full py-2.5 bg-gray-50 text-gray-700 hover:bg-white hover:text-guepardo-orange hover:shadow-md border border-gray-200 hover:border-gray-200 transition-all rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                                    >
                                        <FileText size={14} />
                                        Ver Detalhes e Histórico
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
