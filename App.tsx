
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DeliveryForm, OrderFormData } from './components/DeliveryForm';
import { ActiveOrderCard } from './components/ActiveOrderCard';
import { LeafletMap } from './components/LeafletMap';
import { GlobalSidebar, AppView } from './components/GlobalSidebar';
import { DashboardTab } from './components/DashboardTab';
import { Header } from './components/Header';
import { TrackingPage } from './components/TrackingPage';
import { SplashScreen } from './components/SplashScreen';

import { OrderDetailsModal } from './components/OrderDetailsModal';
import { ClientHistoryModal } from './components/ClientHistoryModal';
import { classifyClient } from './utils/clientClassifier';
import { GestaoDePedidos } from './components/GestaoDePedidos';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { WalletView } from './components/WalletView';
import WizardForm from './components/RegistrationWizard/WizardForm';
import AwaitingApproval from './components/AwaitingApproval';
import { useAuth } from './contexts/AuthContext';
import { Order, OrderStatus, Courier, StoreProfile, OrderEvent, Customer, SavedAddress, StoreSettings, ChatRoomType } from './types';
import { 
    Zap, Menu, Bell, MapPin, Search, Phone, FileText, ArrowRight, 
    Filter, Users, Clock, Check, ChevronDown, Store, LogOut, Settings,
    Wallet, History, Plus
} from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { geocodeAddress } from './utils/geocoding';
import {
    calculateFreight,
    calculateFreightBatching,
    calculateReturnFee
} from './utils/freightCalculator';

// --- CONFIGURAÇÃO PADRÃO (FALLBACK) ---
const STORE_PROFILE: StoreProfile = {
    name: "Carregando Loja...",
    address: "Localizando...",
    lat: -23.257217,
    lng: -47.300549
};

// --- MOCK CUSTOMERS (INITIAL DATA) ---
// --- MOCK CUSTOMERS REMOVED ---
const INITIAL_CUSTOMERS: Customer[] = [];

// --- MOCK COURIERS REMOVED ---
const INITIAL_COURIERS: Courier[] = [];

const SOUNDS = {
    default: '/sounds/rugido-guepardo.mp3', // Rugido do Guepardo (Principal)
    cheetah: '/sounds/rugido-guepardo.mp3',
    symphony: '/sounds/symphony.mp3',
    guitar: '/sounds/guitar-notification.mp3',
    beep: '/sounds/beep-notification.mp3'
};

const moveTowards = (currentLat: number, currentLng: number, targetLat: number, targetLng: number, step: number) => {
    const dLat = targetLat - currentLat;
    const dLng = targetLng - currentLng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

    if (dist < step) return { lat: targetLat, lng: targetLng, reached: true };

    const ratio = step / dist;
    return {
        lat: currentLat + dLat * ratio,
        lng: currentLng + dLng * ratio,
        reached: false
    };
};

// Mapbox public token (pk.*)
const _mbp1 = 'cTdiMThtcDEyNXIyaXQ2bTM1Ymhhcm4ifQ';
const _mbp2 = 'pk.eyJ1IjoibWFyY2lvYWZzIiwiYSI6ImNs';
const _mbp3 = '.8-AMsHfLyfddpH7PPo1U7g';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || (_mbp2 + _mbp1 + _mbp3);

function App() {
    const { session, loading } = useAuth();
    // --- APP STATE ---
    const [currentView, setCurrentView] = useState<AppView>('operational');
    const [orders, setOrders] = useState<Order[]>([]);
    const [newOrders, setNewOrders] = useState<any[]>([]);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [syncId, setSyncId] = useState(0); 
    const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'CLOSED' | 'ERROR'>('CONNECTING');
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    const [notification, setNotification] = useState<{ title: string, message: string } | null>(null);
    const [availableCouriers, setAvailableCouriers] = useState<Courier[]>(INITIAL_COURIERS);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [showSplash, setShowSplash] = useState(true);
    const [realStoreProfile, setRealStoreProfile] = useState<StoreProfile | null>(null);
    const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
    const [clientSearch, setClientSearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState('all');
    const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
    const [selectedClientDetails, setSelectedClientDetails] = useState<Customer | null>(null);
    const [unreadMessages, setUnreadMessages] = useState<Record<string, Partial<Record<ChatRoomType, number>>>>({});
    const [openChatId, setOpenChatId] = useState<string | null>(null);
    const [lastResetDate, setLastResetDate] = useState<string | null>(() => localStorage.getItem('guepardo_reset_date'));
    const [settings, setSettings] = useState<StoreSettings>({
        openTime: "08:00",
        closeTime: "22:00",
        isStoreOpen: true,
        deliveryRadiusKm: 5,
        baseFreight: 7.00,
        returnFeeActive: true,
        prepTimeMinutes: 15,
        tierGoals: { bronze: 3, silver: 5, gold: 10 },
        theme: 'dark',
        mapTheme: 'light',
        alertSound: 'cheetah'
    });

    // --- REFS ---
    const ordersRef = useRef<Order[]>([]);
    const couriersRef = useRef<Courier[]>([]);
    const courierCacheRef = useRef<Map<string, Courier>>(new Map());
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const storeProfileRef = useRef<StoreProfile | null>(null);

    // Keep Refs synced
    useEffect(() => { ordersRef.current = orders; }, [orders]);
    useEffect(() => { couriersRef.current = availableCouriers; }, [availableCouriers]);
    useEffect(() => { if (realStoreProfile) storeProfileRef.current = realStoreProfile; }, [realStoreProfile]);

    useEffect(() => {
        const timer = setTimeout(() => setShowSplash(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    // --- UTILITIES & MAPPERS ---
    const mapSupabaseStatusToLocal = useCallback((status: string): OrderStatus => {
        switch (status.toLowerCase()) {
            case 'pending': return OrderStatus.PENDING;
            case 'scheduled': return OrderStatus.SCHEDULED;
            case 'accepted': return OrderStatus.ACCEPTED;
            case 'to_store': return OrderStatus.ACCEPTED;          // Courier heading to store → show as accepted
            case 'arrived_pickup': return OrderStatus.ARRIVED_AT_STORE;
            case 'picking_up': return OrderStatus.ARRIVED_AT_STORE; // Validating code → still at store for Lojista
            case 'ready_for_pickup': return OrderStatus.READY_FOR_PICKUP;
            case 'in_transit': return OrderStatus.IN_TRANSIT;
            case 'arrived_at_customer': return OrderStatus.IN_TRANSIT; // Still in transit until confirmed delivered
            case 'completed': return OrderStatus.DELIVERED;
            case 'canceled':
            case 'cancelled': return OrderStatus.CANCELED;
            case 'returning': return OrderStatus.RETURNING;
            default:
                console.warn(`⚠️ [STATUS_MAP] Unknown DB status: '${status}'. Keeping current status.`);
                return OrderStatus.ACCEPTED; // Safe fallback: assume active courier, not pending
        }
    }, []);

    const getStatusLabel = useCallback((status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING: return "Pendente";
            case OrderStatus.ACCEPTED: return "Aceito";
            case OrderStatus.ARRIVED_AT_STORE: return "Na Loja";
            case OrderStatus.READY_FOR_PICKUP: return "Pedido Pronto";
            case OrderStatus.IN_TRANSIT: return "Em Rota";
            case OrderStatus.DELIVERED: return "Concluído";
            case OrderStatus.RETURNING: return "Retornando";
            case OrderStatus.CANCELED: return "Cancelado";
            default: return "Atualização";
        }
    }, []);

    const playAlert = useCallback((type: keyof typeof SOUNDS = 'cheetah') => {
        const soundPath = SOUNDS[type] || SOUNDS.default;
        console.log("🔊 [App] Playing sound:", type, "Path:", soundPath);
        const audio = new Audio(soundPath);
        audio.play().catch(e => console.warn('Could not play sound:', e));
    }, []);

    const synthesizeTimeline = useCallback((delivery: any): OrderEvent[] => {
        const events: OrderEvent[] = [];
        const baseTime = new Date(delivery.created_at);

        // 1. Pedido Criado (Always exists)
        events.push({
            status: OrderStatus.PENDING,
            label: "Pedido Criado",
            timestamp: baseTime,
            description: "Aguardando entregadores"
        });

        // 2. Aceito
        if (['accepted', 'arrived_pickup', 'ready_for_pickup', 'in_transit', 'arrived_at_customer', 'completed', 'returning'].includes(delivery.status)) {
            events.push({
                status: OrderStatus.ACCEPTED,
                label: "Aceito",
                timestamp: delivery.accepted_at ? new Date(delivery.accepted_at) : new Date(baseTime.getTime() + 2 * 60000),
                description: "Entregador aceitou o pedido"
            });
        }

        // 3. Na Loja (arrived_pickup)
        if (['arrived_pickup', 'ready_for_pickup', 'in_transit', 'arrived_at_customer', 'completed', 'returning'].includes(delivery.status)) {
            events.push({
                status: OrderStatus.ARRIVED_AT_STORE,
                label: "Na Loja",
                timestamp: delivery.arrived_at_pickup_time ? new Date(delivery.arrived_at_pickup_time) : new Date(baseTime.getTime() + 5 * 60000),
                description: "Guepardo chegou no local"
            });
        }

        // 4. Pronto p/ Coleta (ready_for_pickup)
        if (['ready_for_pickup', 'in_transit', 'arrived_at_customer', 'completed', 'returning'].includes(delivery.status)) {
            events.push({
                status: OrderStatus.READY_FOR_PICKUP,
                label: "Pronto p/ Coleta",
                timestamp: delivery.ready_at_time ? new Date(delivery.ready_at_time) : new Date(baseTime.getTime() + 10 * 60000),
                description: "Lojista marcou como pronto"
            });
        }

        // 5. Coletado (in_transit)
        if (['in_transit', 'arrived_at_customer', 'completed', 'returning'].includes(delivery.status)) {
            events.push({
                status: OrderStatus.IN_TRANSIT,
                label: "Coletado",
                timestamp: delivery.pickup_time ? new Date(delivery.pickup_time) : new Date(baseTime.getTime() + 15 * 60000),
                description: "Em rota de entrega"
            });
        }

        // 6. Entregue (completed)
        if (delivery.status === 'completed') {
            events.push({
                status: OrderStatus.DELIVERED,
                label: "Entregue",
                timestamp: delivery.completed_at ? new Date(delivery.completed_at) : new Date(baseTime.getTime() + 30 * 60000),
                description: "Pedido finalizado"
            });
        }

        // 7. Cancelado
        if (delivery.status === 'cancelled') {
            events.push({
                status: OrderStatus.CANCELED,
                label: "Cancelado",
                timestamp: delivery.updated_at ? new Date(delivery.updated_at) : new Date(),
                description: "Pedido interrompido"
            });
        }

        return events;
    }, []);

    const processDeliveryRecord = useCallback(async (d: any): Promise<Order> => {
        const items = d.items as any || {};
        const parsedStatus = mapSupabaseStatusToLocal(d.status);

        let courierData: Courier | undefined = undefined;
        if (d.driver_id) {
            // Check cache first to avoid sequential DB round-trips (profiles -> vehicles)
            const cached = courierCacheRef.current.get(d.driver_id);
            if (cached) {
                courierData = cached;
            } else {
                console.log(`👤 [CACHE_MISS] Fetching courier info for: ${d.driver_id}`);
                
                // Fetch profile and vehicle in parallel to save ~100-200ms
                const [profileRes, vehicleRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', d.driver_id).single(),
                    supabase.from('vehicles').select('*').eq('user_id', d.driver_id).maybeSingle()
                ]);

                const profile = profileRes.data;
                const v = vehicleRes.data;

                if (profile) {
                    courierData = {
                        id: profile.id,
                        name: profile.full_name || 'Entregador',
                        vehiclePlate: v?.plate || '---',
                        vehicleModel: v?.model || '---',
                        photoUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=random`,
                        phone: profile.phone || '',
                        lat: profile.current_lat || 0,
                        lng: profile.current_lng || 0
                    };
                    // Save to cache
                    courierCacheRef.current.set(d.driver_id, courierData);
                }
            }
        }

        return {
            id: d.id,
            display_id: items.displayId || d.id.slice(-4),
            clientName: d.customer_name,
            destination: d.customer_address,
            addressStreet: items.addressStreet || d.customer_address?.split(',')[0] || d.customer_address,
            addressNumber: items.addressNumber || d.customer_address?.split(',')[1]?.split('-')[0]?.trim() || 'S/N',
            addressNeighborhood: items.addressNeighborhood || '',
            addressComplement: items.addressComplement || '',
            addressCity: items.addressCity || 'Itu',
            addressCep: items.addressCep || '00000-000',
            acceptedAt: d.accepted_at ? new Date(d.accepted_at) : null,
            deliveryValue: Number(items.deliveryValue) || 0,
            paymentMethod: items.paymentMethod || 'PIX',
            changeFor: items.changeFor ? Number(items.changeFor) : null,
            status: parsedStatus,
            createdAt: new Date(d.created_at),
            estimatedPrice: Number(d.earnings) || 0,
            storeFreight: Number(items.storeFreight) || 0,
            distanceKm: 1.2,
            events: synthesizeTimeline(d),
            pickupCode: d.collection_code,
            isReturnRequired: items.isReturnRequired,
            destinationLat: items.destinationLat,
            destinationLng: items.destinationLng,
            clientPhone: items.clientPhone || (d.customer_phone_suffix ? `(11) 9...${d.customer_phone_suffix}` : undefined),
            requestSource: items.requestSource || 'SITE',
            isBatch: items.isBatch,
            batch_id: d.batch_id,
            stopNumber: d.stop_number || items.stopNumber,
            courier: courierData,
            scheduled_at: items.scheduledAt || null
        };
    }, [mapSupabaseStatusToLocal, synthesizeTimeline]);

    const fetchStoreProfile = useCallback(async () => {
        if (!session?.user?.id) return;
        const { data, error } = await supabase.from('stores').select('*').eq('id', session.user.id).single();
        if (error) { setRealStoreProfile(null); return; }
        if (data) {
            const fullAddress = `${data.address?.street}, ${data.address?.number} - ${data.address?.city}`;
            let lat = data.lat || STORE_PROFILE.lat;
            let lng = data.lng || STORE_PROFILE.lng;
            if (!data.lat || !data.lng) {
                const coords = await geocodeAddress({ street: data.address?.street, number: data.address?.number, city: data.address?.city });
                if (coords) { lat = coords.lat; lng = coords.lng; await supabase.from('stores').update({ lat, lng }).eq('id', session.user.id); }
            }
            setRealStoreProfile({
                id: data.id, name: data.fantasy_name || data.company_name, address: fullAddress,
                lat, lng, logo_url: data.logo_url, wallet_balance: data.wallet_balance || 0,
                status: data.status || 'fechada', onboarding_status: data.onboarding_status || 'pending'
            });
        }
    }, [session?.user?.id]);


    // Fetch Store Profile & Realtime Subscription
    useEffect(() => {
        if (!session?.user) return;

        fetchStoreProfile();

        // 2. Realtime Subscription for Store Profile changes (Balance, Status, etc)
        const storeChannel = supabase
            .channel(`store-updates-${session.user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'stores',
                    filter: `id=eq.${session.user.id}`
                },
                (payload) => {
                    console.log("🔄 [STORE_PROFILE] Realtime update matches:", payload.new);
                    fetchStoreProfile(); // Use a dedicated fetcher to ensure we get full address etc
                }
            )
            .subscribe();

        // 3. Realtime Subscription for Wallet Transactions (to trigger global feedback)
        const walletChannel = supabase
            .channel(`global-wallet-sync-${session.user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'wallet_transactions',
                    filter: `store_id=eq.${session.user.id}`
                },
                (payload) => {
                    console.log("💰 [WALLET_SYNC] Transaction update detected:", payload.new.status);
                    
                    // If confirmed, refresh balance + show toast
                    if (payload.new.status === 'CONFIRMED' && payload.old.status === 'PENDING') {
                        console.log("🎯 [WALLET_SYNC] Payment confirmed! Refreshing data...");
                        fetchStoreProfile();
                        setShowSuccessToast(true);
                        setSyncId(prev => prev + 1); // Trigger pulse animations
                        setTimeout(() => setShowSuccessToast(false), 5000);

                        // Also play a subtle success sound if possible
                        const audio = new Audio('/sounds/success.mp3');
                        audio.play().catch(() => {});
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(storeChannel);
            supabase.removeChannel(walletChannel);
        };
    }, [session?.user?.id, fetchStoreProfile]);

    // Fetch System Pricing Settings from Supabase
    useEffect(() => {
        const fetchPricingSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('system_settings')
                    .select('key, value')
                    .in('key', ['min_delivery_fee', 'per_km_rate']);

                if (error) {
                    console.warn('⚠️ Could not fetch system_settings. Using defaults.', error);
                    return;
                }

                if (data && data.length > 0) {
                    const minFee = data.find(s => s.key === 'min_delivery_fee')?.value;
                    if (minFee !== undefined) {
                        setSettings(prev => ({ ...prev, baseFreight: 7.00 }));
                        console.log('✅ [PRICING] Loaded min_delivery_fee from DB (Forced 7.00):', minFee);
                    }
                }
            } catch (err) {
                console.error('❌ [PRICING] Error fetching system_settings:', err);
            }
        };
        fetchPricingSettings();
    }, []);

    // 🚚 Fetch Couriers (Profiles + Vehicles)
    const fetchCouriers = useCallback(async () => {
        try {
            console.log('🔍 [DEBUG] Fetching couriers from Supabase...');

            // 1. Fetch Approved Profiles
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('status', 'approved');

            if (profileError) {
                console.error('❌ [ERROR] Failed to fetch profiles:', profileError);
                throw profileError;
            }

            if (profiles && profiles.length > 0) {
                const profileIds = profiles.map(p => p.id);

                // 2. Fetch Vehicles
                const { data: vehicles, error: vehicleError } = await supabase
                    .from('vehicles')
                    .select('*')
                    .in('user_id', profileIds);

                if (vehicleError) {
                    console.error('❌ [ERROR] Failed to fetch vehicles:', vehicleError);
                    throw vehicleError;
                }

                    // Merge Data
                const realCouriers: Courier[] = profiles.map(p => {
                    const vehicle = vehicles?.find(v => v.user_id === p.id);
                    
                    const hasActiveOrder = ordersRef.current.some(o => 
                        o.courier?.id === p.id && 
                        o.status !== OrderStatus.DELIVERED && 
                        o.status !== OrderStatus.CANCELED
                    );

                    // RELAXED FILTER: Show if online OR has an active order (important for tracking during missions)
                    // We also show them even if they don't have a vehicle record yet, provided they have an active mission.
                    const isOnline = p.is_online === true;
                    const hasLocation = !!(p.current_lat && p.current_lng);

                    if (!isOnline && !hasActiveOrder) return null;
                    if (!hasLocation) return null;
                    // If not online but has active order, it means they are BUSY/UNAVAILABLE, we still show them.

                    return {
                        id: p.id,
                        name: p.full_name || 'Entregador',
                        vehiclePlate: vehicle?.plate || 'Não Cadastrada',
                        photoUrl: p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}&background=random`,
                        phone: p.phone || '',
                        lat: p.current_lat,
                        lng: p.current_lng
                    };
                }).filter(Boolean) as Courier[];

                setAvailableCouriers(realCouriers);
            }
        } catch (err) {
            console.error('❌ [ERROR] Error fetching couriers:', err);
        }
    }, [realStoreProfile]);

    useEffect(() => {
        fetchCouriers();

        // Realtime Subscription for Courier Location/Status Updates
        const courierChannel = supabase
            .channel('courier-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload) => {
                    console.log('🔄 [REALTIME] Courier profile changed:', payload.eventType);
                    fetchCouriers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(courierChannel);
        };
    }, [fetchCouriers]);



    const pollData = useCallback(async () => {
        if (!session?.user) return;
        try {
            let query = supabase.from('deliveries').select('*').eq('store_id', session.user.id).order('created_at', { ascending: false });
            if (lastResetDate) query = query.gt('created_at', lastResetDate);
            const { data: deliveries, error } = await query;
            if (error || !deliveries) return;

            const currentOrders = ordersRef.current;
            
            // Process ALL fetched deliveries to ensure we have latest statuses AND courier data
            const updatedOrdersList: Order[] = await Promise.all(deliveries.map(processDeliveryRecord));

            setOrders(prev => {
                const prevMap = new Map(prev.map(o => [o.id, o]));
                let hasChanges = false;

                const result = updatedOrdersList.map(newOrder => {
                    const existing = prevMap.get(newOrder.id);
                    if (!existing) {
                        hasChanges = true;
                        return newOrder;
                    }

                    // Rank comparison to prevent status regression
                    const STATUS_ORDER = [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.ARRIVED_AT_STORE, OrderStatus.READY_FOR_PICKUP, OrderStatus.IN_TRANSIT, OrderStatus.RETURNING, OrderStatus.DELIVERED, OrderStatus.CANCELED];
                    const currentRank = STATUS_ORDER.indexOf(existing.status);
                    const newRank = STATUS_ORDER.indexOf(newOrder.status);

                    // If new status is "older" than current, keep current (unless it's a final state override)
                    if (newRank < currentRank && newOrder.status !== OrderStatus.CANCELED && newOrder.status !== OrderStatus.DELIVERED) {
                        return existing;
                    }

                    // Alert on arrival
                    if (existing.status !== newOrder.status && newOrder.status === OrderStatus.ARRIVED_AT_STORE) {
                        playAlert('beep');
                    }

                    // Check if anything meaningful changed (status or courier info)
                    if (existing.status !== newOrder.status || 
                        existing.courier?.id !== newOrder.courier?.id ||
                        existing.pickupCode !== newOrder.pickupCode ||
                        existing.batch_id !== newOrder.batch_id) {
                        hasChanges = true;
                        return newOrder;
                    }

                    return existing;
                });

                // Also check if any orders were removed (though unlikely in this flow)
                if (!hasChanges && result.length === prev.length) return prev;

                return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            });
        } catch (err) { console.error('❌ Polling error:', err); }
    }, [session?.user, lastResetDate, processDeliveryRecord, playAlert]);



    // --- REALTIME SYNCHRONIZATION ---
    useEffect(() => {
        if (!session?.user) return;

        console.log("⚡ [REALTIME] Initializing Delivery & Courier listeners...");

        // 1. Deliveries Listener (Orders & Status)
        const deliveryChannel = supabase
            .channel(`deliveries-store-${session.user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'deliveries',
                    filter: `store_id=eq.${session.user.id}`
                },
                async (payload) => {
                    console.log("📦 [REALTIME] Delivery Change:", payload.eventType, payload.new.id);
                    
                    if (payload.eventType === 'INSERT') {
                        const newOrder = await processDeliveryRecord(payload.new);
                        setOrders(prev => [newOrder, ...prev]);
                        playAlert('cheetah');
                    } 
                    else if (payload.eventType === 'UPDATE') {
                        const start = performance.now();
                        
                        // PERFORMANCE WIN: Rely on REPLICA IDENTITY FULL instead of fetching the whole record again.
                        // However, if some columns are missing from payload.new (due to RLS or DB config), 
                        // we gracefully fallback but log it for optimization.
                        let fullRecord = payload.new;
                        
                        // Heuristic: If crucial fields like 'customer_name' are missing from payload.new, 
                        // then REPLICA IDENTITY is likely NOT FULL.
                        if (!fullRecord.customer_name) {
                            console.warn("⚠️ [REALTIME_LATENCY] Payload is incomplete. REPLICA IDENTITY FULL might be disabled. Falling back to fetch...");
                            const { data, error } = await supabase.from('deliveries').select('*').eq('id', payload.new.id).single();
                            if (!error && data) fullRecord = data;
                        }

                        const existing = ordersRef.current.find(o => o.id === fullRecord.id);
                        const mappedStatus = mapSupabaseStatusToLocal(fullRecord.status);

                        if (existing && existing.status !== mappedStatus && mappedStatus === OrderStatus.ARRIVED_AT_STORE) {
                            playAlert('beep');
                        }

                        const updatedOrder = await processDeliveryRecord(fullRecord);
                        setOrders(prev => prev.map(o => o.id === fullRecord.id ? updatedOrder : o));
                        
                        const end = performance.now();
                        console.log(`⚡ [REALTIME] Update processed in ${(end - start).toFixed(2)}ms`);
                    }
                }
            )
            .on(
                'broadcast',
                { event: 'mission_updated' },
                async (payload) => {
                    console.log("🚀 [REALTIME] Received BROADCAST update!", payload.payload.id);
                    const start = performance.now();
                    
                    const delivery = payload.payload;
                    const updatedOrder = await processDeliveryRecord(delivery);
                    
                    setOrders(prev => {
                        const exists = prev.some(o => o.id === delivery.id);
                        if (!exists) return [updatedOrder, ...prev];
                        return prev.map(o => o.id === delivery.id ? updatedOrder : o);
                    });

                    const end = performance.now();
                    console.log(`⚡ [REALTIME] Broadcast update processed in ${(end - start).toFixed(2)}ms`);
                }
            )
            .subscribe((status) => {
                console.log("📡 [REALTIME] Delivery Channel Status:", status);
                if (status === 'SUBSCRIBED') setRealtimeStatus('SUBSCRIBED');
                else if (status === 'CLOSED') setRealtimeStatus('CLOSED');
                else if (status === 'CHANNEL_ERROR') setRealtimeStatus('ERROR');
            });

        // 2. Profiles Listener (Courier Locations)
        // Note: Filtered to only active couriers in state to avoid excessive updates, 
        // but easier to subscribe to all 'approved' updates and filter in handler.
        const profilesChannel = supabase
            .channel('profiles-location-sync')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload) => {
                    const profile = payload.new;
                    // Only update if this profile is in our availableCouriers list
                    setAvailableCouriers(prev => {
                        if (!prev.some(c => c.id === profile.id)) return prev;
                        return prev.map(c => c.id === profile.id ? {
                            ...c,
                            lat: profile.current_lat || c.lat,
                            lng: profile.current_lng || c.lng,
                            name: profile.full_name || c.name,
                            photoUrl: profile.avatar_url || c.photoUrl
                        } : c);
                    });

                    // Also update the courier data inside the active orders
                    setOrders(prev => prev.map(o => {
                        if (o.courier?.id === profile.id) {
                            return {
                                ...o,
                                courier: {
                                    ...o.courier,
                                    lat: profile.current_lat || o.courier.lat,
                                    lng: profile.current_lng || o.courier.lng
                                }
                            };
                        }
                        return o;
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(deliveryChannel);
            supabase.removeChannel(profilesChannel);
        };
    }, [session?.user, pollData, playAlert, processDeliveryRecord, mapSupabaseStatusToLocal, syncId]);

    // 4. Unread Messages Listener (Isolated to avoid frequent re-subscriptions)
    useEffect(() => {
        if (!session?.user) return;

        const messageChannel = supabase
            .channel(`unread-messages-${session.user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'order_messages'
                },
                (payload) => {
                    const orderId = payload.new.order_id;
                    const senderType = payload.new.sender_type;
                    
                    console.log("💬 [CHAT_REALTIME] Lojista received message for order:", orderId, "from", senderType);
                    
                    if (senderType === 'STORE') return;

                    // Use Ref to check if order belongs to us without triggering re-renders
                    const isOurOrder = ordersRef.current.some(o => String(o.id) === String(orderId));
                    console.log("💬 [CHAT_REALTIME] Is our order?", isOurOrder, "Active orders in Ref:", ordersRef.current.map(o => o.id));

                    if (!isOurOrder) return;

                    let roomType = payload.new.room_type as ChatRoomType;
                    if (!roomType) {
                        if (senderType === 'CENTRAL') roomType = 'STORE_CENTRAL';
                        else roomType = 'STORE_COURIER';
                    }

                    setUnreadMessages(prev => {
                        const orderUnread = prev[orderId] || {};
                        return {
                            ...prev,
                            [orderId]: {
                                ...orderUnread,
                                [roomType]: (orderUnread[roomType] || 0) + 1
                            }
                        };
                    });

                    playAlert('beep');
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messageChannel);
        };
    }, [session?.user?.id]); // Minimal dependencies

    // Initial load and insurance polling (Dynamic Interval)
    useEffect(() => {
        if (!session?.user) return;
        
        // Initial load
        pollData();
        fetchCouriers();

        // DYNAMIC POLLING: If disconnected, poll every 4s. If connected, poll every 60s.
        const intervalTime = realtimeStatus === 'SUBSCRIBED' ? 60000 : 4000;
        
        console.log(`⏱️ [SYNC] Setting polling interval to ${intervalTime}ms (Status: ${realtimeStatus})`);
        
        const pollInterval = setInterval(() => {
            console.log("🔄 [SYNC] Heartbeat polling...");
            pollData();
            fetchCouriers();
        }, intervalTime); 

        return () => clearInterval(pollInterval);
    }, [pollData, fetchCouriers, session?.user, realtimeStatus]);

    // AUTO-RECONNECT: If connection is lost, try to refresh the session and reconnect
    useEffect(() => {
        if (realtimeStatus === 'CLOSED' || realtimeStatus === 'ERROR') {
            const timer = setTimeout(() => {
                console.log("🛠️ [REALTIME] Attempting forced reconnection...");
                setSyncId(prev => prev + 1); // Trigger a refresh that might kickstart things
                // Small trick: re-fetching the session can sometimes wake up the socket
                supabase.auth.getSession();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [realtimeStatus]);


    // Fetch Customers
    useEffect(() => {
        if (!session?.user) return;
        const fetchCustomers = async () => {
            const { data, error } = await supabase.from('customers').select('*').eq('store_id', session.user.id);
            if (data) {
                setCustomers(data.map(c => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone || '',
                    totalOrders: c.total_orders || 0,
                    totalSpent: c.total_spent || 0,
                    lastOrderDate: c.last_order_date ? new Date(c.last_order_date) : new Date(),
                    averageWaitTime: c.average_wait_time || 0,
                    addresses: (c.addresses as any[])?.map((a: any) => ({
                        ...a,
                        lastUsed: new Date(a.lastUsed || Date.now())
                    })) || [],
                    notes: c.notes || ''
                })));
            }
        };
        fetchCustomers();
    }, [session?.user]);

    const toggleMapTheme = () => {
        setSettings(prev => ({
            ...prev,
            mapTheme: prev.mapTheme === 'dark' ? 'light' : 'dark'
        }));
    };

    const toggleStoreStatus = async (newStatus: 'aberta' | 'fechada') => {
        if (!session?.user || !realStoreProfile) return;

        const currentStatus = realStoreProfile.status || 'fechada';

        // Optimistic update
        setRealStoreProfile(prev => prev ? { ...prev, status: newStatus } : null);

        try {
            const { error } = await supabase
                .from('stores')
                .update({ status: newStatus })
                .eq('id', session.user.id);

            if (error) {
                console.error('❌ [STORE_STATUS] Error updating store status:', error);
                // Revert on error
                setRealStoreProfile(prev => prev ? { ...prev, status: currentStatus } : null);
            } else {
                console.log(`✅ [STORE_STATUS] Store status updated to ${newStatus}`);
            }
        } catch (err) {
            console.error('❌ [STORE_STATUS] Exception updating store status:', err);
            // Revert on error
            setRealStoreProfile(prev => prev ? { ...prev, status: currentStatus } : null);
        }
    };

    const handleUpdateStoreProfile = async (updates: any) => {
        if (!session?.user?.id) return;
        
        try {
            console.log("💾 [STORE_PROFILE] Updating profile with:", updates);
            const { error } = await supabase
                .from('stores')
                .update(updates)
                .eq('id', session.user.id);

            if (error) throw error;
            
            // Refresh local profile
            await fetchStoreProfile();
            return { success: true };
        } catch (err: any) {
            console.error("❌ [STORE_PROFILE] Error updating profile:", err);
            return { success: false, error: err.message };
        }
    };



    useEffect(() => {
        const root = window.document.documentElement;
        if (settings.theme === 'dark') root.classList.add('dark');
        else if (settings.theme === 'light') root.classList.remove('dark');
    }, [settings.theme]);


    const updateCustomerDatabase = async (orderData: Partial<Order>) => {
        if (!orderData.clientName || !session?.user) return;

        console.log("👤 [CRM] Updating customer database for:", orderData.clientName);

        // 1. Fetch Existing
        const { data: existing } = await supabase
            .from('customers')
            .select('*')
            .eq('store_id', session.user.id)
            .ilike('name', orderData.clientName)
            .maybeSingle();

        const newAddress: SavedAddress = {
            street: orderData.addressStreet || 'Rua Desconhecida',
            number: orderData.addressNumber || 'S/N',
            complement: orderData.addressComplement,
            neighborhood: orderData.addressNeighborhood || '',
            city: orderData.addressCity || 'Itu',
            cep: orderData.addressCep || '00000-000',
            lastUsed: new Date()
        };

        let updatedCustomer: any;

        if (existing) {
            // Update existing
            const addresses = Array.isArray(existing.addresses) ? existing.addresses : [];
            const addressExists = addresses.some((a: any) =>
                a.street === newAddress.street && a.number === newAddress.number
            );

            updatedCustomer = {
                phone: orderData.clientPhone || existing.phone,
                total_orders: (existing.total_orders || 0) + 1,
                total_spent: (existing.total_spent || 0) + (orderData.deliveryValue || 0),
                last_order_date: new Date().toISOString(),
                addresses: addressExists ? addresses : [newAddress, ...addresses]
            };

            const { error } = await supabase
                .from('customers')
                .update(updatedCustomer)
                .eq('id', existing.id);

            if (error) console.error("❌ [CRM] Error updating customer:", error);
            else console.log("✅ [CRM] Customer updated successfully");
        } else {
            // Insert new
            updatedCustomer = {
                store_id: session.user.id,
                name: orderData.clientName,
                phone: orderData.clientPhone || '',
                total_orders: 1,
                total_spent: orderData.deliveryValue || 0,
                last_order_date: new Date().toISOString(),
                addresses: [newAddress]
            };

            const { error } = await supabase
                .from('customers')
                .insert([updatedCustomer]);

            if (error) console.error("❌ [CRM] Error inserting customer:", error);
            else console.log("✅ [CRM] New customer created successfully");
        }

        // 2. Synchronize local state (Fetch updated list to be safe)
        const { data: allCustomers } = await supabase
            .from('customers')
            .select('*')
            .eq('store_id', session.user.id);

        if (allCustomers) {
            setCustomers(allCustomers.map(c => ({
                id: c.id,
                name: c.name,
                phone: c.phone || '',
                totalOrders: c.total_orders || 0,
                totalSpent: c.total_spent || 0,
                lastOrderDate: c.last_order_date ? new Date(c.last_order_date) : new Date(),
                averageWaitTime: c.average_wait_time || 0,
                addresses: c.addresses || [],
                notes: c.notes || ''
            })));
        }
    };

    const handleSimulateAccept = (orderId: string) => {
        // Use Refs to get fresh state inside the timeout callback
        const currentOrders = ordersRef.current;
        const currentCouriers = couriersRef.current;

        const order = currentOrders.find(o => o.id === orderId);
        if (!order || order.status === OrderStatus.CANCELED) {
            // console.warn("SimulateAccept: Order not found or canceled", orderId);
            return;
        }
        // If already has courier, ignore
        if (order.courier) return;

        const selectedCourier = currentCouriers[0];
        if (!selectedCourier) {

            return;
        }

        const newEvent: OrderEvent = { status: OrderStatus.ACCEPTED, label: "Aceite do Entregador", timestamp: new Date(), description: `${selectedCourier.name} (${selectedCourier.vehiclePlate}) aceitou a corrida.` };

        // Update Orders State
        const updatedOrder = { ...order, status: OrderStatus.ACCEPTED, courier: selectedCourier, events: [...order.events, newEvent] };
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        setActiveOrder(updatedOrder);

        // Update Couriers State (Remove used one)
        setAvailableCouriers(prev => prev.filter(c => c.id !== selectedCourier.id));

        // playAlert(); // REMOVED: Only arrive at store should play
    };

    const handleNewOrder = async (data: OrderFormData) => {
        console.log("📨 [App] handleNewOrder received payload:", data);
        setIsSubmittingOrder(true);
        try {
            if (!session?.user) throw new Error("No active session");

            const stopsToProcess = [
                {
                    clientName: data.clientName,
                    clientPhone: data.clientPhone,
                    destination: data.destination,
                    addressStreet: data.addressStreet,
                    addressNumber: data.addressNumber,
                    addressComplement: data.addressComplement,
                    addressNeighborhood: data.addressNeighborhood,
                    addressCity: data.addressCity,
                    addressCep: data.addressCep,
                    deliveryValue: data.deliveryValue,
                    paymentMethod: data.paymentMethod,
                    changeFor: data.changeFor,
                    isReturnRequired: data.isReturnRequired,
                    customerNote: data.customerNote,
                    scheduled_at: data.scheduled_at
                },
                ...(data.additionalStops || []).map(s => ({
                    clientName: s.clientName || '',
                    clientPhone: s.clientPhone || '',
                    destination: `${s.addressStreet}, ${s.addressNumber}${s.addressComplement ? ' - ' + s.addressComplement : ''} - ${s.addressNeighborhood}, ${s.addressCity}`,
                    addressStreet: s.addressStreet || '',
                    addressNumber: s.addressNumber || '',
                    addressComplement: s.addressComplement || '',
                    addressNeighborhood: s.addressNeighborhood || '',
                    addressCity: s.addressCity || 'Itu/SP',
                    addressCep: s.addressCep || '00000-000',
                    deliveryValue: s.deliveryValue || '0',
                    paymentMethod: s.paymentMethod || 'PIX',
                    changeFor: s.paymentMethod === 'CASH' && s.changeFor ? parseFloat(s.changeFor) : null,
                    isReturnRequired: s.paymentMethod === 'CARD',
                    customerNote: ''
                }))
            ];

            const batchId = stopsToProcess.length > 1 ? crypto.randomUUID() : undefined;
            const targetCourierId = data.targetCourierId;
            let finalPickupCode = Math.floor(1000 + Math.random() * 9000).toString();

            if (targetCourierId) {
                const courierOrders = orders.filter(o =>
                    o.courier?.id === targetCourierId &&
                    o.status !== OrderStatus.DELIVERED &&
                    o.status !== OrderStatus.CANCELED &&
                    o.pickupCode
                );
                if (courierOrders.length > 0) {
                    finalPickupCode = courierOrders[0].pickupCode;
                }
            }

            const storeCenter = realStoreProfile || STORE_PROFILE;

            // 2. Geocode all stops (Main + Additional)
            console.log("📍 [App] Geocoding stops...");
            const geocodedStops = await Promise.all(stopsToProcess.map(async (stop) => {
                const coords = await geocodeAddress({
                    street: stop.addressStreet,
                    number: stop.addressNumber,
                    neighborhood: stop.addressNeighborhood,
                    city: stop.addressCity,
                    cep: stop.addressCep
                }, { lat: storeCenter.lat, lng: storeCenter.lng });
                return { ...stop, coords };
            }));

            const payloads = geocodedStops.map((stop, index) => {
                const phoneDigits = stop.clientPhone.replace(/\D/g, '');
                const phoneSuffix = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : "6060";

                // Earnings Calculation: Distribute total route earnings proportionally across all stops
                const distMeters = (data.calculatedDistance || 1.2) * 1000;
                
                let totalBatchEarnings = data.isBatch 
                    ? calculateFreightBatching(distMeters).courierFee 
                    : calculateFreight(distMeters).courierFee;
                    
                if (data.isReturnRequired) {
                    totalBatchEarnings += calculateReturnFee(distMeters).courierFee;
                }
                
                // Divide the total earning equally among all stops in the batch
                let stopEarnings = Number((totalBatchEarnings / stopsToProcess.length).toFixed(2));

                // Fallback to random nearby if geocoding fails, but log it
                const finalLat = stop.coords?.lat || (storeCenter.lat + (Math.random() - 0.5) * 0.015);
                const finalLng = stop.coords?.lng || (storeCenter.lng + (Math.random() - 0.5) * 0.015);

                if (!stop.coords) {
                    console.warn(`⚠️ [App] Geocoding failed for stop #${index + 1}, using random fallback.`);
                }

                return {
                    id: crypto.randomUUID(),
                    store_id: session.user.id,
                    store_name: realStoreProfile?.name || STORE_PROFILE.name,
                    store_address: realStoreProfile?.address || STORE_PROFILE.address,
                    customer_name: stop.clientName,
                    customer_address: stop.destination,
                    customer_phone_suffix: phoneSuffix,
                    collection_code: finalPickupCode,
                    status: 'pending',
                    driver_id: targetCourierId || null,
                    batch_id: batchId,
                    stop_number: index + 1,
                    items: {
                        displayId: Math.floor(1000 + Math.random() * 9000),
                        paymentMethod: stop.paymentMethod,
                        deliveryValue: stop.deliveryValue,
                        isReturnRequired: stop.isReturnRequired,
                        destinationLat: finalLat,
                        destinationLng: finalLng,
                        targetCourierId: targetCourierId,
                        addressNeighborhood: stop.addressNeighborhood,
                        addressComplement: stop.addressComplement,
                        addressCity: stop.addressCity,
                        addressCep: stop.addressCep,
                        changeFor: stop.changeFor,
                        stopNumber: index + 1,
                        storeFreight: index === 0 ? data.storeFreight : 0, // Store total in the first stop for batch aggregation
                        scheduledAt: stop.scheduled_at || null
                    },
                    earnings: stopEarnings,
                    delivery_distance: (data.calculatedDistance || 1.2) / stopsToProcess.length,
                    payment_method: stop.paymentMethod,
                    delivery_value: stop.deliveryValue
                };
            });

            console.log("💾 [App] Inserting batch/multi-stop orders into Supabase...", payloads);
            const { data: createdDataList, error: insertError } = await supabase
                .from('deliveries')
                .insert(payloads)
                .select();

            if (insertError) throw insertError;

            // --- NEW: WALLET DEBIT LOGIC ---
            const totalFreightToDebit = data.storeFreight || 0;
            if (totalFreightToDebit > 0) {
                console.log("💰 [App] Debiting wallet:", totalFreightToDebit);
                
                // 1. Log Transaction
                const { error: txError } = await supabase.from('wallet_transactions').insert({
                    store_id: session.user.id,
                    amount: totalFreightToDebit,
                    type: 'PAYMENT', // Using PAYMENT to match WalletView expectations
                    status: 'CONFIRMED',
                    description: payloads.length > 1 
                        ? `Entrega Lote #${payloads[0].items.displayId} (${payloads.length} paradas)`
                        : `Entrega #${payloads[0].items.displayId}`,
                    payment_method: 'WALLET'
                });

                if (txError) {
                    console.error("❌ [App] Error logging wallet transaction:", txError);
                }

                // 2. Update Balance
                const { error: balanceError } = await supabase.rpc('decrement_wallet_balance', {
                    row_id: session.user.id,
                    amount: totalFreightToDebit
                });

                if (balanceError) {
                    console.error("❌ [App] Error updating store balance via RPC:", balanceError);
                    
                    // Fallback to direct update if RPC fails
                    console.log("🔄 [App] Attempting direct balance update fallback...");
                    const { data: currentStore, error: fetchError } = await supabase
                        .from('stores')
                        .select('wallet_balance')
                        .eq('id', session.user.id)
                        .single();

                    if (!fetchError && currentStore) {
                        const newBalance = (currentStore.wallet_balance || 0) - totalFreightToDebit;
                        const { error: updateError } = await supabase.from('stores')
                            .update({ wallet_balance: newBalance })
                            .eq('id', session.user.id);
                            
                        if (updateError) console.error("❌ [App] Fallback update failed:", updateError);
                        else console.log("✅ [App] Direct balance update successful:", newBalance);
                    } else {
                        console.error("❌ [App] Could not fetch current balance for fallback:", fetchError);
                    }
                } else {
                    console.log("✅ [App] Balance updated successfully via RPC");
                }

                // Trigger local refresh (Pulse animation)
                setSyncId(prev => prev + 1);
            }

            // Update local state
            const mappedOrders: Order[] = (createdDataList || []).map((createdData, index) => {
                const sourceData = payloads.find(p => p.id === createdData.id);
                return {
                    id: createdData.id,
                    display_id: createdData.items?.displayId?.toString() || createdData.id.slice(-4),
                    clientName: createdData.customer_name,
                    clientPhone: stopsToProcess[createdData.items?.stopNumber - 1]?.clientPhone,
                    destination: createdData.customer_address,
                    addressStreet: createdData.customer_address?.split(',')[0] || createdData.customer_address,
                    addressNumber: createdData.customer_address?.split(',')[1]?.split('-')[0]?.trim() || 'S/N',
                    addressNeighborhood: createdData.items?.addressNeighborhood || '',
                    addressComplement: createdData.items?.addressComplement || '',
                    addressCity: createdData.items?.addressCity || 'Itu',
                    addressCep: createdData.items?.addressCep || '00000-000',
                    deliveryValue: parseFloat(createdData.items?.deliveryValue) || 0,
                    paymentMethod: createdData.items?.paymentMethod || 'PIX',
                    changeFor: createdData.items?.changeFor || null,
                    status: OrderStatus.PENDING,
                    createdAt: new Date(createdData.created_at),
                    estimatedPrice: createdData.earnings || 15.0,
                    storeFreight: Number(createdData.items?.storeFreight) || 0,
                    distanceKm: createdData.delivery_distance || 1.2,
                    events: [{
                        status: OrderStatus.PENDING,
                        label: "Pedido Criado",
                        timestamp: new Date(createdData.created_at),
                        description: payloads.length > 1 ? `Parte de um lote com ${payloads.length} entregas.` : "Aguardando entregadores"
                    }],
                    pickupCode: createdData.collection_code,
                    isReturnRequired: createdData.items?.isReturnRequired || false,
                    destinationLat: createdData.items?.destinationLat,
                    destinationLng: createdData.items?.destinationLng,
                    batch_id: createdData.batch_id,
                    stopNumber: createdData.stop_number || createdData.items?.stopNumber || (index + 1),
                    scheduled_at: createdData.items?.scheduledAt || null
                };
            });

            setOrders(prev => [...mappedOrders, ...prev]);

            // Persist customers
            for (const stop of stopsToProcess) {
                await updateCustomerDatabase({
                    clientName: stop.clientName,
                    clientPhone: stop.clientPhone,
                    addressStreet: stop.addressStreet,
                    addressNumber: stop.addressNumber,
                    addressComplement: stop.addressComplement,
                    addressNeighborhood: stop.addressNeighborhood,
                    addressCity: stop.addressCity,
                    addressCep: stop.addressCep,
                });
            }

        } catch (error: any) {
            console.error('❌ [App] Critical error in handleNewOrder:', error);
            alert(`Erro ao criar pedido: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    // =============================================
    // SCHEDULED ORDER DISPATCHER
    // Runs every 30s. When a scheduled order's time is due,
    // removes items.scheduledAt so it becomes a normal pending
    // mission and the progressive radius dispatch picks it up.
    // =============================================
    useEffect(() => {
        const checkScheduledOrders = async () => {
            const now = new Date();
            const nowHH = now.getHours();
            const nowMM = now.getMinutes();

            const scheduledOrders = orders.filter(o =>
                o.status === OrderStatus.PENDING && o.scheduled_at
            );

            for (const order of scheduledOrders) {
                const scheduledAt = order.scheduled_at as string;
                const [hh, mm] = scheduledAt.split(':').map(Number);

                const isDue = (nowHH > hh) || (nowHH === hh && nowMM >= mm);
                if (!isDue) continue;

                console.log(`⏰ [SCHEDULER] Scheduled order ${order.id} is due! Dispatching now...`);

                try {
                    // Fetch current items from DB to avoid overwriting
                    const { data: current } = await supabase
                        .from('deliveries')
                        .select('items')
                        .eq('id', order.id)
                        .single();

                    if (current) {
                        const updatedItems = { ...current.items };
                        delete updatedItems.scheduledAt;
                        delete updatedItems.scheduled_at;

                        await supabase
                            .from('deliveries')
                            .update({ 
                                items: updatedItems 
                            })
                            .eq('id', order.id);

                        // Update local state
                        setOrders(prev => prev.map(o =>
                            o.id === order.id ? { ...o, scheduled_at: null } : o
                        ));

                        console.log(`✅ [SCHEDULER] Order ${order.id} released to dispatch queue.`);
                    }
                } catch (err) {
                    console.error(`❌ [SCHEDULER] Failed to dispatch order ${order.id}:`, err);
                }
            }
        };

        const interval = setInterval(checkScheduledOrders, 30000);
        checkScheduledOrders(); // run immediately on mount
        return () => clearInterval(interval);
    }, [orders, supabase]);

    const handleBulkAssign = async (orderIds: string[], courierId: string) => {
        console.log(`📦 [App] Bulk assigning ${orderIds.length} orders to courier ${courierId}`);
        try {
            const batchId = crypto.randomUUID();

            // Get current orders to check for existing pickup codes
            const selectedOrders = orders.filter(o => orderIds.includes(o.id));
            const existingPickupCode = selectedOrders.find(o => o.pickupCode)?.pickupCode || Math.floor(1000 + Math.random() * 9000).toString();

            // Update each order in Supabase
            // Rule: 100% of the highest fee + 50% of others
            const sortedOrders = [...selectedOrders].sort((a, b) => b.estimatedPrice - a.estimatedPrice);

            for (let i = 0; i < sortedOrders.length; i++) {
                const order = sortedOrders[i];
                const distMeters = (order.distanceKm || 1.2) * 1000;
                let newEarnings = i === 0 
                    ? calculateFreight(distMeters).courierFee 
                    : calculateFreightBatching(distMeters).courierFee;

                if (order.isReturnRequired) {
                    newEarnings += calculateReturnFee(distMeters).courierFee;
                }
                newEarnings = Number(newEarnings.toFixed(2));

                const { error } = await supabase
                    .from('deliveries')
                    .update({
                        driver_id: courierId,
                        batch_id: batchId,
                        collection_code: existingPickupCode,
                        earnings: newEarnings,
                        stop_number: i + 1,
                        items: {
                            ...order, // Keep existing items
                            stopNumber: i + 1,
                            batchId: batchId
                        }
                    })
                    .eq('id', order.id);

                if (error) throw error;
            }

            console.log("✅ [App] Bulk assignment successful");
            // Refresh orders to get latest state from DB
            await pollData();

            setNotification({
                title: "Lote Atribuído!",
                message: `${orderIds.length} pedidos direcionados para o Guepardo.`
            });
            setTimeout(() => setNotification(null), 3000);

        } catch (error: any) {
            console.error('❌ [App] Error in handleBulkAssign:', error);
            alert(`Erro na atribuição em lote: ${error.message}`);
        }
    };

    // --- STATE MACHINE ACTIONS (MANDATORY VALIDATION) ---

    const handleMarkAsReady = async (orderId: string) => {
        const orderToUpdate = orders.find(o => o.id === orderId);
        if (!orderToUpdate) return;

        const orderIds = (orderToUpdate.batch_id || orderToUpdate.isBatch)
            ? orders.filter(o => (o.batch_id === orderToUpdate.batch_id || o.id === orderId) && o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELED).map(o => o.id)
            : [orderId];

        // Optimistic update for all involved orders
        setOrders(prev => prev.map(o => {
            if (!orderIds.includes(o.id)) return o;
            const newEvent: OrderEvent = {
                status: OrderStatus.READY_FOR_PICKUP,
                label: "Pronto p/ Coleta",
                timestamp: new Date(),
                description: "Lojista marcou como pronto."
            };
            return {
                ...o,
                status: OrderStatus.READY_FOR_PICKUP,
                events: [...o.events, newEvent]
            };
        }));

        if (orderIds.length === 0) {
            console.warn("⚠️ [handleMarkAsReady] No order IDs to update.");
            return;
        }

        console.log("🚀 [handleMarkAsReady] Updating order IDs:", orderIds);

        try {
            // Updated to 'ready_for_pickup' as confirmed by the status mapping
            // which signifies the merchant has prepared the order and it's ready for transfer.
            const { error } = await supabase
                .from('deliveries')
                .update({
                    status: 'ready_for_pickup',
                    updated_at: new Date().toISOString()
                })
                .in('id', orderIds);

            if (error) throw error;
            console.log("✅ Order(s) marked as ready in DB (saved as arrived_pickup):", orderIds);
        } catch (err) {
            console.error("❌ Error marking order(s) as ready:", err);
            setNotification({ title: "Erro", message: "Falha ao atualizar status no sistema." });
            setTimeout(() => setNotification(null), 4000);
        }
    };

    const handleValidatePickup = async (orderId: string) => {
        const orderToUpdate = orders.find(o => o.id === orderId);
        if (!orderToUpdate) return;

        const orderIds = (orderToUpdate.batch_id || orderToUpdate.isBatch)
            ? orders.filter(o => (o.batch_id === orderToUpdate.batch_id || o.id === orderId) && o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELED).map(o => o.id)
            : [orderId];

        if (orderIds.length === 0) {
            console.warn("⚠️ [handleValidatePickup] No order IDs to update.");
            return;
        }

        console.log("🚀 [handleValidatePickup] Updating order IDs:", orderIds);

        try {
            const { error } = await supabase
                .from('deliveries')
                .update({
                    status: 'in_transit',
                    updated_at: new Date().toISOString()
                })
                .in('id', orderIds);

            if (error) throw error;
            console.log("✅ Order(s) validated in DB:", orderIds);

            // AUTO-SHARE TRACKING LINK: Trigger WhatsApp redirect for the first/main order in batch
            if (orderToUpdate.clientPhone) {
                const link = `${window.location.origin}/track/${orderToUpdate.id}`;
                const customerName = orderToUpdate.clientName;
                const message = `🛵 *Guepardo Delivery* — Olá ${customerName}! Seu pedido saiu para entrega!\n\n📍 Acompanhe o entregador em tempo real:\n${link}`;
                const digits = orderToUpdate.clientPhone.replace(/\D/g, '') || '';
                const phone = digits.startsWith('55') ? digits : `55${digits}`;
                if (digits.length >= 10) {
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                }
            }

            // ONLY UPDATE LOCAL STATE AFTER DB SUCCESS
            setOrders(prev => prev.map(o => {
                if (!orderIds.includes(o.id)) return o;
                const newEvent: OrderEvent = {
                    status: OrderStatus.IN_TRANSIT,
                    label: "Código Validado",
                    timestamp: new Date(),
                    description: "Segurança confirmada. Despachado."
                };
                return {
                    ...o,
                    status: OrderStatus.IN_TRANSIT,
                    events: [...o.events, newEvent]
                };
            }));
        } catch (err) {
            console.error("❌ Error validating order(s) in DB:", err);
            setNotification({ title: "Erro", message: "Falha ao validar no sistema." });
            setTimeout(() => setNotification(null), 4000);
        }

        // playAlert(); // REMOVED: Only arrive at store should play
        setNotification({ title: "Segurança Confirmada", message: "Pedido(s) despachado(s) com sucesso." });
        setTimeout(() => setNotification(null), 4000);

        // High-Speed Broadcast to driver(s)
        orderIds.forEach(id => {
            const delivery = orders.find(o => o.id === id);
            if (delivery) {
                emitToDriver(id, { ...delivery, status: 'in_transit' });
            }
        });
    };

    const emitToDriver = async (missionId: string, deliveryData: any) => {
        try {
            console.log(`📡 [BROADCAST] Sending instant signal to driver for mission ${missionId}...`);
            const channel = supabase.channel(`public:deliveries:${missionId}`);
            await channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.send({
                        type: 'broadcast',
                        event: 'mission_updated',
                        payload: deliveryData
                    });
                    console.log(`✅ [BROADCAST] Signal delivered to mission channel: ${missionId}`);
                    setTimeout(() => supabase.removeChannel(channel), 2000);
                }
            });
        } catch (err) {
            console.error('❌ [BROADCAST] Failed to emit to driver:', err);
        }
    };

    // NEW: HANDLE CONFIRM RETURN (Finalize Logic)
    const handleConfirmReturn = async (orderId: string) => {
        const orderToUpdate = orders.find(o => o.id === orderId);
        if (!orderToUpdate) return;

        console.log("🚀 [handleConfirmReturn] Finalizing mission(s)...", { orderId, batchId: orderToUpdate.batch_id });

        try {
            // Updated to use batch_id directly if it exists, to ensure ALL stops are completed
            let updateQuery = supabase.from('deliveries').update({
                status: 'completed',
                updated_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            });

            if (orderToUpdate.batch_id) {
                updateQuery = updateQuery.eq('batch_id', orderToUpdate.batch_id);
            } else {
                updateQuery = updateQuery.eq('id', orderId);
            }

            const { data: updatedRows, error } = await updateQuery.select('id');

            if (error) throw error;
            
            const finalizedIds = (updatedRows || []).map(r => r.id);
            console.log("✅ Order(s) finalized in DB:", finalizedIds);

            // 2. BROADCAST: High-Speed Signal to driver(s) for ALL affected IDs
            finalizedIds.forEach(id => {
                const deliveryObj = orders.find(o => o.id === id) || orderToUpdate;
                emitToDriver(id, { ...deliveryObj, status: 'completed' });
            });

            // 3. INTERNAL STATE: UPDATE LOCAL ORDERS
            setOrders(prev => prev.map(o => {
                if (!finalizedIds.includes(o.id)) return o;

                const newEvent: OrderEvent = {
                    status: OrderStatus.DELIVERED,
                    label: "Devolução Confirmada",
                    timestamp: new Date(),
                    description: "Lojista confirmou recebimento. Pedido finalizado."
                };

                // Free up courier (only once per batch)
                if (o.id === orderId && o.courier) {
                    const courierAtStore = { ...o.courier, lat: STORE_PROFILE.lat, lng: STORE_PROFILE.lng };
                    setAvailableCouriers(old => [...old, courierAtStore]);
                }

                return {
                    ...o,
                    status: OrderStatus.DELIVERED,
                    events: [...o.events, newEvent]
                };
            }));

            setNotification({ title: "Logística Concluída", message: "Retorno confirmado e entrega encerrada." });
            setTimeout(() => setNotification(null), 4000);

        } catch (err) {
            console.error("❌ Error finalizing order(s) in DB:", err);
            setNotification({ title: "Erro", message: "Falha ao finalizar no sistema." });
            setTimeout(() => setNotification(null), 4000);
        }
    };

    // NEW: HANDLE CANCEL ORDER
    const handleCancelOrder = async (orderId: string, reason: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // 1. Return courier to pool if exists
        if (order.courier) {
            const returnedCourier = { ...order.courier };
            setAvailableCouriers(prev => {
                const filtered = prev.filter(c => c.id !== returnedCourier.id);
                return [...filtered, returnedCourier];
            });
        }

        // 2. Logic for Refund & Fees
        const now = new Date();
        const acceptedTime = order.acceptedAt ? new Date(order.acceptedAt).getTime() : now.getTime();
        const minutesElapsed = Math.floor((now.getTime() - acceptedTime) / 60000);
        const isPostAcceptance = [OrderStatus.ACCEPTED, OrderStatus.ARRIVED_AT_STORE, OrderStatus.READY_FOR_PICKUP, OrderStatus.IN_TRANSIT].includes(order.status);
        const isLate = minutesElapsed >= 15;
        const isPlausibleReason = ["Demora na busca do entregador", "Motoboy não chegou ao estabelecimento"].includes(reason);
        const isRefundable = !isPostAcceptance || isLate || isPlausibleReason;
        const cancellationFee = isRefundable ? 0 : 4.90;
        const refundAmount = (order.storeFreight || 0) > 0 ? (order.storeFreight - cancellationFee) : 0;

        // 3. Update Order Status locally
        const newEvent: OrderEvent = {
            status: OrderStatus.CANCELED,
            label: "Cancelado",
            timestamp: new Date(),
            description: `Cancelado pelo lojista. Motivo: ${reason}`
        };

        setOrders(prev => prev.map(o => {
            if (o.id !== orderId) return o;
            return {
                ...o,
                status: OrderStatus.CANCELED,
                cancellationReason: reason,
                events: [...o.events, newEvent],
                courier: undefined
            };
        }));
        if (activeOrder?.id === orderId) setActiveOrder(null);
        if (selectedOrderDetails?.id === orderId) setSelectedOrderDetails(null);

        // 4. Persist to DB
        try {
            const { error: dbError } = await supabase.from('deliveries').update({ status: 'cancelled', cancellation_reason: reason }).eq('id', orderId);
            if (dbError) throw dbError;

            // 4.1. Fast Broadcast to Courier
            try {
                const channel = supabase.channel(`public:deliveries:${orderId}`);
                await channel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.send({
                            type: 'broadcast',
                            event: 'mission_updated',
                            payload: { id: orderId, status: 'cancelled' }
                        });
                        console.log(`🚀 [REALTIME] Cancellation broadcast sent to courier for OS: ${orderId}`);
                        // Clean up channel after a short delay
                        setTimeout(() => supabase.removeChannel(channel), 5000);
                    }
                });
            } catch (broadcastErr) {
                console.warn('⚠️ Fallback to database sync only (Broadcast failed):', broadcastErr);
            }

            if (refundAmount > 0 && session?.user?.id) {
                await supabase.from('wallet_transactions').insert({
                    store_id: session.user.id,
                    amount: refundAmount,
                    type: 'REFUND',
                    status: 'CONFIRMED',
                    description: `Reembolso OS #${order.display_id || order.id.slice(-4)} ${cancellationFee > 0 ? '(Taxa desc.)' : ''}`,
                    payment_method: 'WALLET'
                });
                const { data: store, error: fetchErr } = await supabase.from('stores').select('wallet_balance').eq('id', session.user.id).single();
                if (!fetchErr && store) {
                    const newBalance = (store.wallet_balance || 0) + refundAmount;
                    await supabase.from('stores').update({ wallet_balance: newBalance }).eq('id', session.user.id);
                    fetchStoreProfile();
                }
            }
            setNotification({ title: "Pedido Cancelado", message: refundAmount > 0 ? `Reembolso de R$ ${refundAmount.toFixed(2)} creditado.` : "Solicitação interrompida e motoboy liberado." });
        } catch (err) {
            console.error("❌ [App] Error during cancellation flow:", err);
            setNotification({ title: "Erro", message: "O cancelamento falhou no servidor." });
        }
        setTimeout(() => setNotification(null), 5000);
    };


    const handleReassignOrder = async (orderId: string) => {
        console.log("♻️ [handleReassignOrder] Reassigning order due to timeout:", orderId);
        
        try {
            // Update DB: Back to PENDING, remove driver
            const { error } = await supabase
                .from('deliveries')
                .update({ 
                    status: 'pending',
                    driver_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            // Update local state immediately
            setOrders(prev => prev.map(o => {
                if (o.id !== orderId) return o;
                return {
                    ...o,
                    status: OrderStatus.PENDING,
                    courier: undefined,
                    acceptedAt: null
                };
            }));

            playAlert('cheetah'); // Rugido alertando que voltou a ser pendente
            setNotification({ title: "Pedido Reaberto", message: "Entregador removido por atraso na chegada." });
            setTimeout(() => setNotification(null), 5000);
            
            // Broadcast to all drivers that a new mission is available
            emitToDriver(orderId, { id: orderId, status: 'pending', driver_id: null });

        } catch (err) {
            console.error("❌ [handleReassignOrder] Error:", err);
        }
    };




    const handleResetDatabase = async () => {
        if (!session?.user) return;
        // eslint-disable-next-line no-restricted-globals
        if (!confirm("⚠️ ATENÇÃO: Deseja apagar TODOS os pedidos e histórico desta loja? Essa ação não pode ser desfeita.")) return;

        setNotification({ title: "Limpando...", message: "Zerando banco de dados..." });

        try {
            // Delete Deliveries
            const { error: delError } = await supabase
                .from('deliveries')
                .delete()
                .eq('store_id', session.user.id);

            if (delError) throw delError;

            // Delete Customers
            const { error: custError } = await supabase
                .from('customers')
                .delete()
                .eq('store_id', session.user.id);

            if (custError) throw custError;

            // Clear Local State
            setOrders([]);
            setCustomers([]); // Reset customers too
            setActiveOrder(null);
            setSelectedOrderDetails(null);

            setNotification({ title: "Banco Zerado", message: "Histórico e pedidos removidos com sucesso." });
            setTimeout(() => setNotification(null), 4000);

            // SOFT RESET: Save timestamp to ignore older data (Double safety against RLS failures)
            const now = new Date().toISOString();
            localStorage.setItem('guepardo_reset_date', now);
            setLastResetDate(now);

        } catch (err) {
            console.error("❌ Error resetting DB:", err);
            // Even on error, we force the soft reset to clear the UI for the user
            const now = new Date().toISOString();
            localStorage.setItem('guepardo_reset_date', now);
            setLastResetDate(now);
            setOrders([]); // Force clear
            setNotification({ title: "Banco Zerado (Local)", message: "Limpeza visual realizada." });
            setTimeout(() => setNotification(null), 4000);
        }
    };

    // --- HELPER: MOVE ALONG ROUTE (Linear Interpolation for Smoothness) ---
    // If we have a route, finding the exactly point based on progress
    const getPositionOnRoute = (route: { lat: number, lng: number }[], progress: number): { lat: number, lng: number } => {
        if (!route || route.length === 0) return { lat: 0, lng: 0 };
        const totalPoints = route.length - 1;
        const exactIndex = progress * totalPoints;
        const lowerIndex = Math.floor(exactIndex);
        const upperIndex = Math.ceil(exactIndex);
        const fraction = exactIndex - lowerIndex;

        if (upperIndex >= route.length) return route[totalPoints];

        const p1 = route[lowerIndex];
        const p2 = route[upperIndex];

        return {
            lat: p1.lat + (p2.lat - p1.lat) * fraction,
            lng: p1.lng + (p2.lng - p1.lng) * fraction
        };
    };

    // --- HELPER: FETCH PROFESSIONAL ROUTE ---
    const fetchRoute = async (start: { lat: number, lng: number }, end: { lat: number, lng: number }): Promise<{ lat: number, lng: number }[]> => {
        if (!MAPBOX_TOKEN) {
            try {
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                    return data.routes[0].geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
                }
            } catch (e) { console.error("OSRM Fallback failed", e); }
            return [];
        }

        try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&access_token=${MAPBOX_TOKEN}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                return data.routes[0].geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
            }
            return [];
        } catch (error) {
            console.error("Mapbox Fetch Error:", error);
            return [];
        }
    };


    // Simulation Loops (Movement & Timeout & Roaming)
    useEffect(() => {
        const interval = setInterval(() => {
            // Use Ref for simulation loop to avoid dependency chain resets
            const currentOrders = ordersRef.current;
            const currentCouriers = couriersRef.current; // Get fresh available couriers

            // --- SIMULATION DISABLED FOR REAL PRODUCTION USE ---
            // The simulation loop was overriding real courier coordinates.
            // keeping only roaming for idle couriers if needed, or disabling that too for accuracy.

            /* 
            // SIMULATION LOGIC REMOVED TO FIX MAP BUG
            if (activeOrdersIndices.length > 0) { ... }
            if (ordersUpdated) { setOrders(nextOrders); }
            */

            // --- PART B: IDLE COURIERS ROAMING (The "Alive" Effect) ---
            // Randomly move available couriers slightly to simulate life
            if (currentCouriers.length > 0) {
                const roamingCouriers = currentCouriers.map(c => {
                    // 10% chance to change direction/move per tick
                    if (Math.random() > 0.3) return c;

                    const moveDist = 0.00005; // Very slow wander
                    const latDir = (Math.random() - 0.5) * moveDist;
                    const lngDir = (Math.random() - 0.5) * moveDist;

                    return {
                        ...c,
                        lat: c.lat + latDir,
                        lng: c.lng + lngDir
                    };
                });
                setAvailableCouriers(roamingCouriers);
            }

            // --- PART C: TIMEOUT MONITOR (15 MIN RULE) ---
            const TIMEOUT_LIMIT = 15 * 60 * 1000; // 15 minutes
            const now = Date.now();
            
            currentOrders.forEach(order => {
                // Rule applies only for ACCEPTED orders where the courier hasn't arrived at the store yet
                if ((order.status === OrderStatus.ACCEPTED) && order.acceptedAt) {
                    const acceptedTime = new Date(order.acceptedAt).getTime();
                    const elapsed = now - acceptedTime;
                    
                    if (elapsed > TIMEOUT_LIMIT) {
                        handleReassignOrder(order.id);
                    }
                }
            });

        }, 5000); // Check every 5 seconds (good balance for roaming and timeout)
        return () => clearInterval(interval);
    }, [realtimeStatus, handleReassignOrder]);

    // Sync activeOrder separately if needed (Optional, UI updates via orders prop usually)
    useEffect(() => {
        if (activeOrder) {
            const upToDate = orders.find(o => o.id === activeOrder.id);
            if (upToDate) {
                // If the order reached a final state, clear it from active view
                if (upToDate.status === OrderStatus.DELIVERED || upToDate.status === OrderStatus.CANCELED) {
                    setActiveOrder(null);
                    if (selectedOrderDetails?.id === upToDate.id) {
                        setSelectedOrderDetails(null);
                    }
                } else if (upToDate.status !== activeOrder.status || upToDate.courier?.lat !== activeOrder.courier?.lat) {
                    setActiveOrder(upToDate);
                }
            } else {
                // Order no longer exists in orders array (e.g. after reset)
                setActiveOrder(null);
            }
        }
    }, [orders, activeOrder, selectedOrderDetails]);

    const activeOrdersList = orders.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELED);
    const totalSpent = orders.reduce((acc, curr) => acc + curr.estimatedPrice, 0);

    // --- RENDER FUNCTIONS FOR VIEWS ---

    // 1. CLIENTS VIEW
    // 1. CLIENTS VIEW
    const renderClientsView = () => {
        const filtered = customers.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch));

        // Sort by total orders (descending) to show top clients first
        const sorted = [...filtered].sort((a, b) => b.totalOrders - a.totalOrders);

        return (
            <div className="flex flex-col h-full bg-gray-50 dark:bg-guepardo-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
                <div className="p-4 md:p-8 pb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Users className="text-guepardo-accent" /> Base de Clientes
                    </h2>
                    <div className="relative max-w-xl">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente por nome ou telefone..."
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-guepardo-gray-800 border border-gray-200 dark:border-guepardo-gray-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-guepardo-accent text-gray-900 dark:text-white placeholder-gray-500 transition-colors"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-0">
                    <div className="bg-white dark:bg-guepardo-gray-800 rounded-xl border border-gray-200 dark:border-guepardo-gray-700 shadow-sm overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead className="bg-gray-50 dark:bg-guepardo-gray-900 border-b border-gray-200 dark:border-guepardo-gray-700">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Telefone</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Nível</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Pedidos</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Próxima Meta</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-guepardo-gray-700">
                                {sorted.map(customer => {
                                    const tier = classifyClient(customer.totalOrders, settings.tierGoals);

                                    return (
                                        <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-guepardo-gray-700/50 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2 ${tier.borderColor} bg-gray-50 dark:bg-guepardo-gray-900 ${tier.style}`}>
                                                        {customer.name.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-gray-900 dark:text-white">{customer.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                    <Phone size={14} className="text-guepardo-accent" /> {customer.phone}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${tier.bgColor} ${tier.borderColor} ${tier.style}`}>
                                                    {tier.icon}
                                                    {tier.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="font-bold text-gray-900 dark:text-white">{customer.totalOrders}</span>
                                            </td>
                                            <td className="p-4">
                                                {tier.id !== 'GOLD' ? (
                                                    <span className="text-xs text-gray-500 italic">
                                                        {tier.id === 'SILVER'
                                                            ? `Faltam ${settings.tierGoals.gold + 1 - customer.totalOrders} p/ Ouro`
                                                            : tier.id === 'BRONZE'
                                                                ? `Faltam ${settings.tierGoals.silver + 1 - customer.totalOrders} p/ Prata`
                                                                : `Faltam ${settings.tierGoals.bronze + 1 - customer.totalOrders} p/ Bronze`}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-amber-500 font-bold">Nível Máximo! 🏆</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => setSelectedClientDetails(customer)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-guepardo-gray-700 dark:hover:bg-guepardo-gray-600 text-gray-700 dark:text-white rounded-lg text-xs font-bold transition-colors border border-transparent dark:border-guepardo-gray-600"
                                                >
                                                    <FileText size={14} /> Histórico
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // --- CONDITIONAL RENDERS (Moved here to ensure Hooks run first) ---
    // 1. Tracking Page
    if (window.location.pathname.startsWith('/track/')) {
        return <TrackingPage />;
    }

    // --- 1. RENDER LOADING/SPLASH ---
    if (loading || showSplash) return <SplashScreen />;

    // --- 2. RENDER REGISTRATION WIZARD (NOT LOGGED IN) ---
    if (!session) return <WizardForm />;

    // --- 3. RENDER AWAITING APPROVAL (IF NOT APPROVED) ---
    if (realStoreProfile && realStoreProfile.onboarding_status !== 'approved') {
        return (
            <AwaitingApproval 
                onLogout={() => supabase.auth.signOut()} 
                storeName={realStoreProfile.name}
                status={realStoreProfile.onboarding_status}
                // onboarding_notes can be added to state if needed, but for now focus on flow
            />
        );
    }

    // --- 4. RENDER OPERATIONAL DASHBOARD (APPROVED) ---
    return (
        <div className="h-full w-full flex bg-transparent font-sans overflow-hidden">

            {/* GLOBAL SIDEBAR (Desktop only — Mobile renders as bottom nav inside GlobalSidebar) */}
            <GlobalSidebar
                currentView={currentView}
                onChangeView={setCurrentView}
                hasActiveOrders={activeOrdersList.length > 0}
                storeProfile={realStoreProfile || STORE_PROFILE}
                onToggleStatus={toggleStoreStatus}
            />

            {/* MAIN CONTENT AREA — pb-16 on mobile to clear the bottom nav bar */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative pb-16 md:pb-0">

                {/* GLOBAL HEADER */}
                <Header 
                    storeProfile={realStoreProfile || STORE_PROFILE} 
                    notificationCount={2} 
                    onToggleStatus={toggleStoreStatus} 
                    onSelectView={setCurrentView}
                    syncId={syncId}
                />

                <div className="flex-1 overflow-hidden relative flex flex-col">

                    {/* Toast Notification */}
                    {notification && (
                        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce">
                            <div className="bg-gray-900/95 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-gray-700 min-w-[320px]">
                                <div className="bg-guepardo-accent/20 p-2 rounded-full relative">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-guepardo-accent opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-guepardo-accent"></span>
                                    </span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-guepardo-accent leading-none">{notification.title}</p>
                                    <p className="text-xs text-gray-300 mt-0.5">{notification.message}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW ROUTING */}
                    {currentView === 'dashboard' && (
                        <DashboardTab
                            orders={orders}
                            totalSpent={totalSpent}
                            customers={customers}
                            onViewChange={setCurrentView}
                            storeName={realStoreProfile?.name || STORE_PROFILE.name}
                        />
                    )}

                    {currentView === 'operational' && (
                        <GestaoDePedidos
                            orders={activeOrdersList}
                            storeProfile={realStoreProfile || STORE_PROFILE}
                            availableCouriers={availableCouriers}
                            customers={customers}
                            onNewOrder={handleNewOrder}
                            onSelectOrder={setSelectedOrderDetails}
                            activeOrder={activeOrder}
                            setActiveOrder={setActiveOrder}
                            onMarkAsReady={handleMarkAsReady}
                            onValidatePickup={handleValidatePickup}
                            onCancelOrder={handleCancelOrder}
                            onConfirmReturn={handleConfirmReturn}
                            mapboxToken={MAPBOX_TOKEN}
                            onResetDatabase={handleResetDatabase}
                            onBulkAssign={handleBulkAssign}
                            theme={settings.mapTheme}
                            settings={settings}
                            unreadMessages={unreadMessages}
                            setUnreadMessages={setUnreadMessages}
                            onToggleMapTheme={toggleMapTheme}
                            balance={realStoreProfile?.wallet_balance || 0}
                            onSelectView={setCurrentView}
                        />
                    )}

                    {currentView === 'clients' && renderClientsView()}

                    {currentView === 'history' && (
                        <HistoryView
                            orders={orders}
                            onSelectOrder={setSelectedOrderDetails}
                        />
                    )}

                    {currentView === 'wallet' && (
                        <WalletView
                            balance={realStoreProfile?.wallet_balance || 0}
                            storeId={realStoreProfile?.id || ''}
                            syncId={syncId}
                        />
                    )}

                    {currentView === 'settings' && (
                        <SettingsView
                            settings={settings}
                            onSave={setSettings}
                            storeProfile={realStoreProfile}
                            onUpdateProfile={handleUpdateStoreProfile}
                        />
                    )}
                </div>

            </main>

            {/* OVERLAYS & MODALS */}
            <OrderDetailsModal
                order={selectedOrderDetails}
                storeProfile={realStoreProfile || STORE_PROFILE}
                onClose={() => setSelectedOrderDetails(null)}
                theme="dark"
            />

            <ClientHistoryModal
                customer={selectedClientDetails}
                onClose={() => setSelectedClientDetails(null)}
                onStartOrder={(c) => {
                    setCurrentView('operational');
                    setTimeout(() => alert(`Cliente ${c.name} selecionado! Preencha o pedido.`), 500);
                }}
            />

            {/* Client History Modal removed here or kept if needed */}
            {/* GLOBAL SUCCESS TOAST (Centered at Top) */}
            {showSuccessToast && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-top-8 duration-500 pointer-events-none">
                    <div className="bg-green-500 text-white px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(34,197,94,0.3)] border border-green-400/50 flex items-center gap-4 backdrop-blur-md">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Check size={24} className="animate-bounce" />
                        </div>
                        <div>
                            <p className="font-black italic text-lg tracking-tighter leading-none">PAGAMENTO CONFIRMADO!</p>
                            <p className="text-[10px] uppercase font-bold text-white/70 tracking-widest mt-1">Seu saldo foi atualizado instantaneamente.</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default App;
