import React from 'react';
import { useOrderHub } from '../hooks/useOrderHub';
import { X, ExternalLink, ShoppingBag, Clock } from 'lucide-react';

export const OrderHubAlert: React.FC<{ storeId: string }> = ({ storeId }) => {
    const { newOrders, clearOrders } = useOrderHub(storeId);

    if (newOrders.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-6 z-[9999] w-80 animate-in slide-in-from-left duration-300">
            <div className="bg-white dark:bg-gray-900 border-l-4 border-guepardo-orange rounded-r-xl shadow-2xl p-4 relative glass-panel">
                <button
                    onClick={clearOrders}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                        <ShoppingBag size={20} className="text-guepardo-orange" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white leading-tight">
                            Novo Pedido Recebido!
                        </h3>
                        <p className="text-[10px] text-guepardo-orange font-bold uppercase tracking-wider">
                            Originado do {newOrders[0].platform_origin}
                        </p>
                    </div>
                </div>

                <div className="space-y-2 mb-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {newOrders[0].client_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                        <span className="shrink-0">📍</span>
                        <span className="line-clamp-2">{newOrders[0].delivery_address}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold text-gray-900 dark:text-white mt-2">
                        <span>Total</span>
                        <span>R$ {(newOrders[0].total_value || 0).toFixed(2)}</span>
                    </div>
                </div>

                <button
                    className="w-full bg-guepardo-orange hover:bg-guepardo-accent text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95"
                    onClick={() => {
                        window.open('https://eviukbluwrwcblwhkzwz.supabase.co/dashboard/project/eviukbluwrwcblwhkzwz/editor/public/orders', '_blank');
                    }}
                >
                    <ExternalLink size={16} />
                    Ver Detalhes do Pedido
                </button>

                {newOrders.length > 1 && (
                    <div className="mt-2 text-center text-[10px] text-gray-400 italic">
                        + {newOrders.length - 1} outros pedidos pendentes
                    </div>
                )}
            </div>
        </div>
    );
};
