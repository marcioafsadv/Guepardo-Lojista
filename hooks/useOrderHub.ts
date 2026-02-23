import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../types';

export const useOrderHub = (storeId?: string) => {
    const [newOrders, setNewOrders] = useState<any[]>([]);

    useEffect(() => {
        if (!storeId) return;

        console.log("🔔 [OrderHub] Starting Realtime Listener for store:", storeId);

        // Listen for new inserts in the 'orders' table
        const channel = supabase
            .channel('public:orders:hub')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `store_id=eq.${storeId}`
                },
                (payload) => {
                    console.log("📦 [OrderHub] New External Order Received:", payload.new);

                    const order = payload.new;
                    setNewOrders((prev) => [order, ...prev]);

                    // Trigger browser notification
                    if (Notification.permission === 'granted') {
                        new Notification(`Novo Pedido via ${order.platform_origin}!`, {
                            body: `${order.client_name} - R$ ${order.total_value}`,
                            icon: '/logo192.png'
                        });
                    }

                    // Play alert sound
                    const audio = new Audio('/sounds/alert.mp3');
                    audio.play().catch(e => console.warn("Audio play blocked:", e));
                }
            )
            .subscribe((status) => {
                console.log("📡 [OrderHub] Realtime Status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [storeId]);

    const clearOrders = () => setNewOrders([]);

    return { newOrders, clearOrders };
};
