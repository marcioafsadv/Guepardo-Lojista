
import React from 'react';
import { Order, OrderStatus, StoreProfile } from '../types';
import {
    Smartphone, MessageCircle, Clock, Calendar, CheckCircle2, Share2, Printer,
    Wallet, AlertTriangle, User, Banknote, CreditCard, QrCode, Trash2, ArrowLeftRight, CheckCheck,
    ChevronUp, ChevronDown, X, Globe, Phone, Medal, Trophy, Star, UserPlus, Hash, Truck
} from 'lucide-react';

// Sub-component for the Inner Content (Reusable)
const OrderContent: React.FC<{
    order: Order;
    isEmbedded?: boolean;
    onClose?: () => void;
    onToggleExpand?: () => void;
    handleContact: (type: 'whatsapp' | 'phone') => void;
    securityPin: string;
    getPaymentIcon: (method: string) => React.ReactNode;
    onCancelClick?: (order: Order) => void;
    onCallCourier?: (order: Order) => void; // Added onCallCourier prop
    theme?: string;
    isExpanded?: boolean;
}> = ({ order, isEmbedded, onClose, onToggleExpand, handleContact, securityPin, getPaymentIcon, onCancelClick, onCallCourier, theme, isExpanded = true }) => {
    const isDark = theme === 'dark'; // Helper for Explicit Theme

    return (
        <div className={`flex flex-col h-full w-full ${isEmbedded ? 'bg-transparent' : 'absolute inset-0 z-20 transition-all duration-300'} ${!isEmbedded && (isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')}`}>

            {/* Header Actions */}
            <div className={`flex items-center justify-between p-4 border-b ${isEmbedded ? (isDark ? 'border-white/5 bg-black/20' : 'border-gray-200 bg-white') : 'bg-black/20 backdrop-blur-sm border-white/5'} shrink-0`}>
                {!isEmbedded && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'}`}
                    >
                        <ChevronDown size={20} />
                    </button>
                )}
                {isEmbedded && <div className="w-9" />} {/* Spacer for embedded mode centering */}

                <span className={`text-xs font-bold uppercase tracking-widest ${isEmbedded ? (isDark ? 'text-gray-200' : 'text-gray-950') : (isDark ? 'text-gray-500' : 'text-gray-600')}`}>
                    Detalhes do Pedido
                </span>

                <button
                    onClick={(e) => { e.stopPropagation(); onClose?.(); }}
                    className={`p-2 rounded-full transition-colors ${isEmbedded ? 'text-gray-500 hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/10' : (isDark ? 'hover:bg-red-500/20 text-white/50 hover:text-red-400' : 'hover:bg-red-100 text-gray-500 hover:text-red-600')}`}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">

                {/* Status Large */}
                <div className="text-center">
                    <h2 className={`text-2xl font-bold ${isEmbedded ? (isDark ? 'text-white' : 'text-gray-950') : (isDark ? 'text-white' : 'text-gray-900')}`}>{order.clientName}</h2>
                    {order.clientPhone && (
                        <div className="flex items-center justify-center gap-2 mt-0.5 text-gray-500 dark:text-gray-400">
                            <Phone size={12} />
                            <span className="text-sm font-medium">{order.clientPhone}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-center gap-2 mt-1 text-orange-500 dark:text-orange-400">
                        <Clock size={14} />
                        <span className="text-sm font-mono font-bold">
                            Chegada em {new Date(new Date(order.createdAt).getTime() + 40 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                {/* Courier Profile Card */}
                {order.courier && (
                    <div className={`border rounded-2xl p-4 ${isEmbedded ? (isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200') : (isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm')}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <img src={order.courier.photoUrl} className="w-14 h-14 rounded-full border-2 border-orange-500" />
                            <div>
                                <h3 className={`text-lg font-bold ${isEmbedded ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white' : 'text-gray-900')}`}>{order.courier.name}</h3>
                                <p className={`text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{order.courier.vehiclePlate}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleContact('whatsapp'); }}
                                className="h-10 bg-green-600/20 hover:bg-green-600/30 text-green-700 dark:text-green-400 border border-green-600/50 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase transition-all"
                            >
                                <MessageCircle size={16} /> WhatsApp
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleContact('phone'); }}
                                className="h-10 bg-blue-600/20 hover:bg-blue-600/30 text-blue-700 dark:text-blue-400 border border-blue-600/50 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase transition-all"
                            >
                                <Smartphone size={16} /> Ligar
                            </button>
                        </div>
                    </div>
                )}

                {/* Order Number (Previously Security PIN) */}
                <div className={`bg-gradient-to-r from-orange-500/10 ${isDark ? 'to-orange-900/10' : 'to-orange-100/50'} border border-orange-500/30 rounded-2xl p-4 text-center`}>
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-500 uppercase tracking-widest block mb-1">Número do Pedido</span>
                    <span className={`text-4xl font-mono font-black tracking-[0.2em] drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] ${isEmbedded ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white' : 'text-gray-900')}`}>
                        #{order.display_id || order.id.slice(-4)}
                    </span>
                </div>

                {/* Financials & Source (Grid) */}
                <div className="grid grid-cols-2 gap-3">
                    {/* VALOR */}
                    <div className={`rounded-xl p-3 border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Banknote size={12} className="text-gray-400" />
                            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Valor do Pedido</span>
                        </div>
                        <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>R$ {(order.deliveryValue || 0).toFixed(2)}</span>
                    </div>

                    {/* FRETE */}
                    <div className={`rounded-xl p-3 border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Truck size={12} className="text-gray-400" />
                            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Valor do Frete</span>
                        </div>
                        <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>R$ {(order.estimatedPrice || 0).toFixed(2)}</span>
                    </div>

                    {/* PAGAMENTO */}
                    <div className={`rounded-xl p-3 border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Wallet size={12} className="text-gray-400" />
                            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Pagamento</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold text-sm">
                            {getPaymentIcon(order.paymentMethod)}
                            <span>{order.paymentMethod}</span>
                        </div>
                    </div>

                    {/* SOLICITAÇÃO (ORIGEM) */}
                    <div className={`rounded-xl p-3 border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Share2 size={12} className="text-gray-400" />
                            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Solicitado via</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold text-sm">
                            {order.requestSource === 'WHATSAPP' ? <MessageCircle size={14} className="text-green-500" /> :
                                order.requestSource === 'PHONE' ? <Phone size={14} className="text-blue-500" /> :
                                    <Globe size={14} className="text-orange-500" />}
                            <span>{order.requestSource === 'WHATSAPP' ? 'WhatsApp' :
                                order.requestSource === 'PHONE' ? 'Telefone' : 'Site'}</span>
                        </div>
                    </div>
                </div>

                {/* Cliente & Categoria + Contato Direto */}
                <div className="space-y-3">
                    <div className={`rounded-2xl p-4 border flex items-center justify-between ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-white shadow-sm border border-gray-200'}`}>
                                <User size={20} className="text-gray-400" />
                            </div>
                            <div>
                                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider block">Categoria do Cliente</span>
                                <div className="flex items-center gap-2">
                                    {order.clientTier === 'GOLD' && <Trophy size={14} className="text-yellow-500" />}
                                    {order.clientTier === 'SILVER' && <Medal size={14} className="text-gray-400" />}
                                    {order.clientTier === 'BRONZE' && <Medal size={14} className="text-orange-600" />}
                                    {(!order.clientTier || order.clientTier === 'NEW') && <UserPlus size={14} className="text-blue-500" />}
                                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {order.clientTier === 'GOLD' ? 'Ouro' :
                                            order.clientTier === 'SILVER' ? 'Prata' :
                                                order.clientTier === 'BRONZE' ? 'Bronze' : 'Cliente Novo'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider block">Pedido feito em</span>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 justify-end">
                                <Calendar size={12} />
                                <span>{new Date(order.createdAt).toLocaleDateString()} às {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Botões de Contato do Cliente */}
                    {order.clientPhone && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const cleanPhone = order.clientPhone?.replace(/\D/g, '');
                                    window.open(`https://wa.me/${cleanPhone}`, '_blank');
                                }}
                                className="h-10 bg-green-600/10 hover:bg-green-600/20 text-green-600 border border-green-600/30 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase transition-all"
                            >
                                <MessageCircle size={16} /> WhatsApp
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const cleanPhone = order.clientPhone?.replace(/\D/g, '');
                                    window.open(`tel:${cleanPhone}`, '_self');
                                }}
                                className="h-10 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 border border-blue-600/30 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase transition-all"
                            >
                                <Smartphone size={16} /> Ligar Cliente
                            </button>
                        </div>
                    )}
                </div>

                {/* Timeline / Route History */}
                <div className="px-6 pb-6">
                    <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isEmbedded ? 'text-gray-500 dark:text-gray-400' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                        Histórico do Pedido
                    </h3>
                    <div className="relative border-l-2 border-gray-200 dark:border-white/10 ml-3 space-y-6">
                        {order.events && order.events.length > 0 ? (
                            order.events.map((event, index) => (
                                <div key={index} className="relative pl-6">
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${index === 0 ? 'bg-orange-500 border-orange-500' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}></div>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider ${index === 0 ? 'text-orange-600 dark:text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className={`text-sm font-bold ${isEmbedded ? 'text-gray-900 dark:text-white' : (isDark ? 'text-white' : 'text-gray-900')}`}>
                                            {event.label}
                                        </span>
                                        {event.description && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {event.description}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="pl-6 text-sm text-gray-500 italic">Nenhum evento registrado.</div>
                        )}
                        {/* Creation Event (Always exists) */}
                        <div className="relative pl-6">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={`text-sm font-bold ${isEmbedded ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white' : 'text-gray-900')}`}>
                                    Pedido Criado
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Aguardando entregador
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer Actions */}
            <div className={`p-4 border-t flex gap-3 shrink-0 ${isEmbedded ? (isDark ? 'border-white/5 bg-black/40' : 'border-gray-100 bg-white') : (isDark ? 'bg-black/40 border-white/5' : 'bg-white border-gray-200')}`}>
                <button
                    onClick={(e) => { e.stopPropagation(); window.print(); }}
                    className={`flex-1 h-12 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 border ${isEmbedded ? (isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100') : (isDark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100')}`}
                >
                    <Printer size={16} /> Imprimir
                </button>

                {/* Chamar Motoboy (Primary Action for External Orders) */}
                {order.requestSource === 'WHATSAPP' && !order.courier && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onCallCourier) {
                                onCallCourier(order);
                            } else {
                                // Fallback: Dispatch custom event for DeliveryForm
                                const event = new CustomEvent('fill-delivery-from-order', { detail: order });
                                window.dispatchEvent(event);
                                onClose?.();
                            }
                        }}
                        className="flex-[2] h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 transform active:scale-95"
                    >
                        <Truck size={18} /> Chamar Motoboy Guepardo
                    </button>
                )}

                <button
                    onClick={(e) => { e.stopPropagation(); onCancelClick && onCancelClick(order); }}
                    className="flex-1 h-12 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 border border-red-500/30"
                >
                    <Trash2 size={16} /> Cancelar
                </button>
            </div>

            {/* Tracking Share Action (Only when In Transit) */}
            {(order.status === OrderStatus.IN_TRANSIT || order.status === OrderStatus.TO_STORE) && (
                <div className={`px-4 pb-4 ${isEmbedded ? 'bg-gray-50 dark:bg-black/40' : (isDark ? 'bg-black/40' : 'bg-white')}`}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Generate Fake Token if missing (for demo)
                            const token = order.trackingToken || 'demo-token-123';
                            const link = `${window.location.origin}/track/${token}`;
                            const message = `🛵 *Guepardo Delivery*: Seu pedido saiu para entrega!\n\nAcompanhe o entregador em tempo real:\n${link}`;
                            const phone = order.clientPhone?.replace(/\D/g, '') || '5511999999999';
                            window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                    >
                        <Share2 size={18} />
                        Compartilhar Rastreio (WhatsApp)
                    </button>
                </div>
            )}
        </div>
    );
};

interface OrderServiceDetailProps {
    order: Order;
    storeProfile: StoreProfile;
    onCancelClick?: (order: Order) => void;
    onConfirmReturn?: (orderId: string) => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    onClose?: () => void;
    isEmbedded?: boolean; // New Prop
    theme?: string;
}

export const OrderServiceDetail: React.FC<OrderServiceDetailProps> = ({
    order, storeProfile, onCancelClick, onConfirmReturn, isExpanded = false, onToggleExpand, onClose, isEmbedded = false, theme = 'dark'
}) => {
    // Generate PIN
    const securityPin = order.pickupCode || order.id.slice(-4);

    const handleContact = (type: 'whatsapp' | 'phone') => {
        const phone = order.courier?.phone || '5511999999999'; // Fallback for demo
        const cleanPhone = phone.replace(/\D/g, '');
        if (type === 'whatsapp') {
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        } else {
            window.open(`tel:${cleanPhone}`, '_self');
        }
    };

    const getStatusLabel = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.IN_TRANSIT: return 'Em Trânsito';
            case OrderStatus.DELIVERED: return 'Entregue';
            case OrderStatus.PENDING: return 'Pendente';
            default: return 'Processando';
        }
    };

    const getPaymentIcon = (method: string) => {
        switch (method) {
            case 'CASH': return <Banknote size={14} className="text-green-500 dark:text-green-400" />;
            case 'CARD': return <CreditCard size={14} className="text-blue-500 dark:text-blue-400" />;
            case 'PIX': return <QrCode size={14} className="text-purple-500 dark:text-purple-400" />;
            default: return null;
        }
    };

    // --- EMBEDDED MODE (HISTORY MODAL) ---
    if (isEmbedded) {
        return (
            <OrderContent
                order={order}
                isEmbedded={true}
                onClose={onClose}
                handleContact={handleContact}
                securityPin={securityPin}
                getPaymentIcon={getPaymentIcon}
                onCancelClick={onCancelClick}
                theme={theme}
            />
        );
    }

    // --- CAPSULE CONTAINER (FLOATING) ---
    return (
        <div
            className={`
                fixed top-24 right-8 bottom-32
                transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${theme === 'dark' ? 'bg-gray-900/90 border-white/10 text-white' : 'bg-white/90 border-gray-200 text-gray-900'}
                backdrop-blur-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                overflow-hidden z-50
                ${isExpanded ? 'w-[400px] h-auto rounded-3xl' : 'w-[360px] h-[80px] rounded-full hover:scale-105 cursor-pointer translate-y-[calc(80vh-160px)]'}
            `}
            onClick={(e) => {
                if (!isExpanded) {
                    e.stopPropagation();
                    onToggleExpand?.();
                }
            }}
        >
            {/* --- COLLAPSED VIEW --- */}
            <div
                className={`
                    absolute inset-0 flex items-center justify-between px-4 transition-all duration-300 z-10
                    ${isExpanded ? 'opacity-0 pointer-events-none delay-0' : 'opacity-100 delay-100 pointer-events-auto'}
                `}
            >
                <div className="flex items-center gap-3">
                    {/* Tiny Courier Avatar */}
                    {order.courier ? (
                        <div className="relative">
                            <img src={order.courier.photoUrl} className="w-10 h-10 rounded-full border-2 border-orange-500/50" />
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full animate-pulse ${order.status === OrderStatus.IN_TRANSIT ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                        </div>
                    ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100 border border-gray-200'}`}>
                            <User size={16} className={theme === 'dark' ? 'text-white/50' : 'text-gray-400'} />
                        </div>
                    )}

                    <div className="flex flex-col">
                        <span className={`font-bold text-sm truncate max-w-[120px] ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {order.courier?.name || "Aguardando..."}
                        </span>
                        <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            {order.status === OrderStatus.IN_TRANSIT && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
                            {getStatusLabel(order.status)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <span className="block text-[10px] text-gray-400 uppercase">Chegada em</span>
                        <span className={`text-sm font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {new Date(new Date(order.createdAt).getTime() + 40 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'}`}>
                        <ChevronUp size={16} className={theme === 'dark' ? 'text-white/70' : 'text-gray-600'} />
                    </div>
                </div>
            </div>


            {/* --- EXPANDED VIEW --- */}
            <OrderContent
                order={order}
                isEmbedded={false}
                onClose={onClose}
                onToggleExpand={onToggleExpand}
                handleContact={handleContact}
                securityPin={securityPin}
                getPaymentIcon={getPaymentIcon}
                onCancelClick={onCancelClick}
                onCallCourier={(o) => {
                    // Logic to fill DeliveryForm: Dispatch event
                    const event = new CustomEvent('fill-delivery-from-order', { detail: o });
                    window.dispatchEvent(event);
                    onClose?.();
                }}
                theme={theme}
                isExpanded={isExpanded} // Pass isExpanded
            />
        </div>
    );
};
