
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
import WizardForm from './components/RegistrationWizard/WizardForm';
import { useAuth } from './contexts/AuthContext';
import { Order, OrderStatus, Courier, StoreProfile, OrderEvent, Customer, SavedAddress, StoreSettings } from './types';
import { Zap, Menu, Bell, MapPin, Search, Phone, FileText, ArrowRight, Filter, Users, Clock } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

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
    default: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // Simple Bell
    roar: 'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3', // Lion Roar
    siren: 'https://assets.mixkit.co/active_storage/sfx/249/249-preview.mp3', // Sci-Fi Siren
    cheetah: '/sounds/lion-roar.mp3',
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

function App() {
    const { session, loading } = useAuth();
    const [currentView, setCurrentView] = useState<AppView>('operational');
    const [orders, setOrders] = useState<Order[]>([]);
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    const [notification, setNotification] = useState<{ title: string, message: string } | null>(null);
    const [availableCouriers, setAvailableCouriers] = useState<Courier[]>(INITIAL_COURIERS);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [showSplash, setShowSplash] = useState(true);

    // Initial Store Settings
    const [settings, setSettings] = useState<StoreSettings>({
        openTime: "08:00",
        closeTime: "22:00",
        isStoreOpen: true,
        deliveryRadiusKm: 5,
        baseFreight: 7.50,
        returnFeeActive: true,
        prepTimeMinutes: 15,
        tierGoals: { bronze: 3, silver: 5, gold: 10 },
        theme: 'dark',
        mapTheme: 'light',
        alertSound: 'cheetah'
    });

    // View Specific States (Search/Filters)
    const [clientSearch, setClientSearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState('all'); // all, pending, completed

    // CRM / Customer State
    const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);

    // Modal State
    const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
    const [selectedClientDetails, setSelectedClientDetails] = useState<Customer | null>(null);

    // Polling approach since Realtime is not reliably working for state synchronization
    const [lastResetDate, setLastResetDate] = useState<string | null>(() => localStorage.getItem('guepardo_reset_date'));

    // Refs for Simulation (To access fresh state in timeouts/intervals)
    const ordersRef = useRef<Order[]>([]);
    const couriersRef = useRef<Courier[]>(availableCouriers);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Keep Refs synced
    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    useEffect(() => {
        couriersRef.current = availableCouriers;
    }, [availableCouriers]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // --- MANUAL ROUTING (TRACKING PAGE) ---
    // Since we don't have react-router-dom, we check URL manually
    // --- MANUAL ROUTING (TRACKING PAGE) ---
    // Moved to bottom to prevent Hook errors

    // --- DEFAULT: REGISTRATION WIZARD (SIMULATING NOT LOGGED IN) ---
    // To allow access to dashboard, we would need a login state.
    // For now, based on user request, we default to the Wizard.
    // We can add a temporary override or just simple state if needed,
    // but the request was "iniciar já na tela de cadastro".

    // Check if we are in "dashboard mode" hash or something, otherwise show wizard
    // Let's use a temporary state override if the user manually navigates in previous valid sessions, but here
    // we force it.

    // --- AUTH CHECKS ---
    // Moved to bottom to prevent Hook errors

    const [realStoreProfile, setRealStoreProfile] = useState<StoreProfile | null>(null);

    // Fetch Store Profile & Realtime Subscription
    // Fetch Store Profile & Realtime Subscription
    useEffect(() => {
        if (!session?.user) return;

        // 1. Fetch Profile
        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from('stores')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (data) {
                const fullAddress = `${data.address?.street}, ${data.address?.number} - ${data.address?.city}`;

                // --- COORDINATE RESOLUTION STRATEGY ---
                // Priority 1: Coordinates saved directly in the DB (fast, accurate)
                // Priority 2: Nominatim geocoding (fallback only when DB has no coords)
                let lat: number = STORE_PROFILE.lat; // Default Fallback (Itu)
                let lng: number = STORE_PROFILE.lng; // Default Fallback (Itu)

                if (data.lat && data.lng && !isNaN(data.lat) && !isNaN(data.lng)) {
                    // Use coordinates from DB - fastest and most accurate
                    lat = data.lat;
                    lng = data.lng;
                    console.log("✅ [STORE_PROFILE] Using DB coordinates:", lat, lng, "for:", data.fantasy_name || data.company_name);
                } else {
                    // Fallback: Geocode via Nominatim using CEP+address for precision
                    const cep = data.address?.zip_code || data.address?.cep || '';
                    const geoQuery = cep
                        ? `${cep}, Brazil`
                        : `${data.address?.street}, ${data.address?.number}, ${data.address?.city}, ${data.address?.state}, Brazil`;

                    console.log("📍 [GEOCODING-OSM] No DB coords, geocoding:", geoQuery);
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(geoQuery)}&limit=1`);
                        const result = await response.json();

                        if (result && result.length > 0) {
                            const parsedLat = parseFloat(result[0].lat);
                            const parsedLng = parseFloat(result[0].lon);

                            if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                                lat = parsedLat;
                                lng = parsedLng;
                                console.log("📍 [GEOCODING-OSM] Found coordinates:", lat, lng);

                                // Save to DB for future use (avoid repeated geocoding)
                                await supabase.from('stores').update({ lat, lng }).eq('id', session.user.id);
                                console.log("💾 [GEOCODING-OSM] Coordinates saved to DB");
                            }
                        } else {
                            console.warn("⚠️ [GEOCODING-OSM] Could not geocode address, using default Itu coordinates");
                        }
                    } catch (geoError) {
                        console.error("❌ [GEOCODING-OSM] Error:", geoError);
                    }
                }

                console.log("📍 [STORE_PROFILE] Setting store coordinates:", lat, lng, "for:", data.fantasy_name || data.company_name);

                // Final safety check before setting state
                const finalLat = (typeof lat === 'number' && !isNaN(lat) && lat !== 0) ? lat : -23.257217;
                const finalLng = (typeof lng === 'number' && !isNaN(lng) && lng !== 0) ? lng : -47.300549;

                setRealStoreProfile({
                    name: data.fantasy_name || data.company_name,
                    address: fullAddress,
                    lat: finalLat,
                    lng: finalLng
                });
            }
        };
        fetchProfile();
    }, [session?.user?.id]); // Depend on user ID for stability

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
                        setSettings(prev => ({ ...prev, baseFreight: parseFloat(minFee) }));
                        console.log('✅ [PRICING] Loaded min_delivery_fee from DB:', minFee);
                    }
                }
            } catch (err) {
                console.error('❌ [PRICING] Error fetching system_settings:', err);
            }
        };
        fetchPricingSettings();
    }, []);

    // Fetch Couriers (Profiles + Vehicles)
    // We fetch "approved" profiles that have a vehicle.
    useEffect(() => {
        const fetchCouriers = async () => {
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

                console.log(`✅ [DEBUG] Found ${profiles?.length || 0} approved profiles`);

                if (profiles && profiles.length > 0) {
                    const profileIds = profiles.map(p => p.id);
                    console.log(`🔍 [DEBUG] Profile IDs to search for vehicles:`, profileIds);
                    console.log(`🔍 [DEBUG] Full profiles data:`, profiles.map(p => ({ id: p.id, name: p.full_name })));

                    // 2. Fetch Vehicles for these profiles
                    const { data: vehicles, error: vehicleError } = await supabase
                        .from('vehicles')
                        .select('*')
                        .in('user_id', profileIds);

                    if (vehicleError) {
                        console.error('❌ [ERROR] Failed to fetch vehicles:', vehicleError);
                        throw vehicleError;
                    }

                    console.log(`✅ [DEBUG] Found ${vehicles?.length || 0} vehicles`);
                    console.log(`🔍 [DEBUG] Vehicles data:`, vehicles);

                    // 3. Merge Data
                    const realCouriers: Courier[] = profiles.map(p => {
                        const vehicle = vehicles?.find(v => v.user_id === p.id);

                        console.log(`🔍 [DEBUG] Processing courier:`, {
                            id: p.id,
                            name: p.full_name,
                            has_vehicle: !!vehicle,
                            vehicle_user_id: vehicle?.user_id,
                            is_online: p.is_online,
                            has_location: !!(p.current_lat && p.current_lng),
                            current_lat: p.current_lat,
                            current_lng: p.current_lng
                        });

                        if (!vehicle) {
                            console.warn(`⚠️ [FILTER] Courier ${p.full_name} has no vehicle registered`);
                            return null; // Only show if has vehicle
                        }

                        // TEMPORARILY RELAXED FILTER FOR DEBUGGING
                        // Original filter was too restrictive:
                        // if (!p.is_online || !p.current_lat || !p.current_lng) return null;

                        // Filter: Only show ONLINE couriers with LOCATION
                        const hasLocation = !!(p.current_lat && p.current_lng);
                        const isOnline = p.is_online === true;

                        if (!isOnline) {
                            console.warn(`⚠️ [FILTER] Courier ${p.full_name} is OFFLINE (is_online=${p.is_online})`);
                            return null; // Don't show offline couriers
                        }

                        if (!hasLocation) {
                            console.warn(`⚠️ [FILTER] Courier ${p.full_name} has NO LOCATION (lat=${p.current_lat}, lng=${p.current_lng})`);
                            return null; // Don't show couriers without location
                        }

                        return {
                            id: p.id,
                            name: p.full_name || 'Entregador',
                            vehiclePlate: vehicle.plate || '---',
                            photoUrl: p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}&background=random`,
                            phone: p.phone || '',
                            lat: p.current_lat,
                            lng: p.current_lng
                        };
                    }).filter(Boolean) as Courier[];

                    console.log(`✅ [RESULT] ${realCouriers.length} couriers available:`, realCouriers);
                    setAvailableCouriers(realCouriers);
                } else {
                    console.warn('⚠️ [WARNING] No approved profiles found in database');
                }
            } catch (err) {
                console.error('❌ [ERROR] Error fetching couriers:', err);
            }
        };

        fetchCouriers();

        // Realtime Subscription for Courier Location/Status Updates
        const courierChannel = supabase
            .channel('courier-updates')
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'profiles',
                    filter: `status=eq.approved`
                },
                (payload) => {
                    console.log('🔄 [REALTIME] Courier profile updated:', payload);
                    // Re-fetch all couriers when any approved profile changes
                    fetchCouriers();
                }
            )
            .subscribe((status) => {
                console.log('📡 [REALTIME] Courier subscription status:', status);
            });

        return () => {
            console.log('🔌 [REALTIME] Unsubscribing from courier updates');
            supabase.removeChannel(courierChannel);
        };
    }, [realStoreProfile]); // Re-fetch if store moves/init

    // Polling logic refactored for stability
    const mapSupabaseStatusToLocal = useCallback((status: string): OrderStatus => {
        switch (status.toLowerCase()) {
            case 'pending': return OrderStatus.PENDING;
            case 'accepted': return OrderStatus.ACCEPTED;
            case 'arrived_pickup': return OrderStatus.ARRIVED_AT_STORE;
            case 'ready_for_pickup': return OrderStatus.READY_FOR_PICKUP;
            case 'in_transit': return OrderStatus.IN_TRANSIT;
            case 'arrived_at_customer': return OrderStatus.IN_TRANSIT;
            case 'completed': return OrderStatus.DELIVERED;
            case 'canceled':
            case 'cancelled': return OrderStatus.CANCELED;
            case 'returning': return OrderStatus.RETURNING;
            default: return OrderStatus.PENDING;
        }
    }, []);

    const getStatusLabel = useCallback((status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING: return "Pendente";
            case OrderStatus.ACCEPTED: return "Aceito";
            case OrderStatus.ARRIVED_AT_STORE: return "Na Loja";
            case OrderStatus.READY_FOR_PICKUP: return "Pronto";
            case OrderStatus.IN_TRANSIT: return "Em Rota";
            case OrderStatus.DELIVERED: return "Concluído";
            case OrderStatus.RETURNING: return "Retornando";
            case OrderStatus.CANCELED: return "Cancelado";
            default: return "Atualização";
        }
    }, []);

    const pollData = useCallback(async () => {
        if (!session?.user) return;
        try {
            let query = supabase
                .from('deliveries')
                .select('*')
                .eq('store_id', session.user.id)
                .order('created_at', { ascending: false });

            if (lastResetDate) {
                query = query.gt('created_at', lastResetDate);
            }

            const { data: deliveries, error } = await query;
            if (error || !deliveries) return;

            // 1. Handle NEW Orders
            const currentOrders = ordersRef.current;
            const newDeliveries = deliveries.filter(d => !currentOrders.some(o => o.id === d.id));

            if (newDeliveries.length > 0) {
                console.log(`📥 [SYNC] Found ${newDeliveries.length} new orders`);
                const newOrdersList: Order[] = await Promise.all(newDeliveries.map(async d => {
                    const items = d.items as any || {};
                    const parsedStatus = mapSupabaseStatusToLocal(d.status);

                    let courierData: Courier | undefined = undefined;
                    if (d.driver_id) {
                        const { data: profile } = await supabase.from('profiles').select('*').eq('id', d.driver_id).single();
                        if (profile) {
                            const { data: v } = await supabase.from('vehicles').select('*').eq('user_id', profile.id).single();
                            courierData = {
                                id: profile.id,
                                name: profile.full_name || 'Entregador',
                                vehiclePlate: v?.plate || '---',
                                photoUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=random`,
                                phone: profile.phone || '',
                                lat: profile.current_lat || 0,
                                lng: profile.current_lng || 0
                            };
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
                        deliveryValue: items.deliveryValue || 0,
                        paymentMethod: items.paymentMethod || 'PIX',
                        changeFor: items.changeFor,
                        status: parsedStatus,
                        createdAt: new Date(d.created_at),
                        estimatedPrice: d.earnings || 0,
                        distanceKm: 1.2,
                        events: [{
                            status: parsedStatus,
                            label: getStatusLabel(parsedStatus),
                            timestamp: new Date(d.created_at),
                            description: courierData ? `Aceito por ${courierData.name}` : 'Sincronizado'
                        }],
                        pickupCode: d.collection_code,
                        isReturnRequired: items.isReturnRequired,
                        destinationLat: items.destinationLat,
                        destinationLng: items.destinationLng,
                        clientPhone: items.clientPhone || (d.customer_phone_suffix ? `(11) 9...${d.customer_phone_suffix}` : undefined),
                        requestSource: items.requestSource || 'SITE',
                        isBatch: items.isBatch,
                        batch_id: d.batch_id,
                        stopNumber: items.stopNumber,
                        courier: courierData
                    };
                }));

                setOrders(prev => {
                    const existingIds = new Set(prev.map(o => o.id));
                    const filteredNew = newOrdersList.filter(o => !existingIds.has(o.id));
                    if (filteredNew.length === 0) return prev;
                    return [...filteredNew, ...prev].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                });
            }

            // 2. Update existing orders status
            for (const delivery of deliveries) {
                const existingOrder = ordersRef.current.find(o => o.id === delivery.id);
                if (!existingOrder) continue;

                const mappedStatus = mapSupabaseStatusToLocal(delivery.status);
                if (existingOrder.status === mappedStatus && (delivery.driver_id === existingOrder.courier?.id)) continue;

                // Regression checking logic (Ready for pickup vs Arrived)
                if (existingOrder.status === OrderStatus.READY_FOR_PICKUP && mappedStatus === OrderStatus.ARRIVED_AT_STORE) continue;

                let courierData: Courier | null = null;
                if (delivery.driver_id && !existingOrder.courier) {
                    const { data: p } = await supabase.from('profiles').select('*').eq('id', delivery.driver_id).single();
                    if (p) {
                        const { data: v } = await supabase.from('vehicles').select('*').eq('user_id', p.id).single();
                        courierData = {
                            id: p.id,
                            name: p.full_name || 'Entregador',
                            vehiclePlate: v?.plate || '---',
                            photoUrl: p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}&background=random`,
                            phone: p.phone || '',
                            lat: p.current_lat || 0,
                            lng: p.current_lng || 0
                        };
                    }
                }

                setOrders(prev => prev.map(o => {
                    if (o.id === delivery.id) {
                        const hasStatusChanged = o.status !== mappedStatus;
                        if (hasStatusChanged) {
                            if (mappedStatus === OrderStatus.ARRIVED_AT_STORE) playAlert();
                        }
                        return {
                            ...o,
                            status: mappedStatus,
                            courier: courierData || o.courier,
                            pickupCode: delivery.collection_code || o.pickupCode,
                            batch_id: delivery.batch_id || o.batch_id,
                            events: hasStatusChanged ? [...(o.events || []), {
                                status: mappedStatus,
                                label: getStatusLabel(mappedStatus),
                                timestamp: new Date(),
                                description: 'Status atualizado via servidor'
                            }] : o.events
                        };
                    }
                    return o;
                }));
            }
        } catch (err) {
            console.error('❌ Polling error:', err);
        }
    }, [session?.user, lastResetDate, mapSupabaseStatusToLocal, getStatusLabel]);

    useEffect(() => {
        if (!session?.user) return;
        pollData();
        const pollInterval = setInterval(pollData, 10000);
        return () => clearInterval(pollInterval);
    }, [pollData]);

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

    const playAlert = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.warn('Could not play sound:', e));
        }
    }, []);

    const storeProfileRef = useRef(STORE_PROFILE);
    useEffect(() => { if (realStoreProfile) storeProfileRef.current = realStoreProfile; }, [realStoreProfile]);

    useEffect(() => {
        const soundUrl = SOUNDS[settings.alertSound as keyof typeof SOUNDS] || SOUNDS.default;
        audioRef.current = new Audio(soundUrl);
    }, [settings.alertSound]);

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
                    isReturnRequired: data.isReturnRequired,
                    customerNote: data.customerNote
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
                    isReturnRequired: false, // Additional stops usually don't require individual return if batch
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
            const payloads = stopsToProcess.map((stop, index) => {
                const phoneDigits = stop.clientPhone.replace(/\D/g, '');
                const phoneSuffix = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : "6060";

                // Earnings Calculation: 100% for first, 50% for others (estimate)
                const baseEarnings = data.calculatedEarnings || 15.00;
                const stopEarnings = index === 0 ? baseEarnings : baseEarnings * 0.5;

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
                    items: {
                        displayId: Math.floor(1000 + Math.random() * 9000),
                        paymentMethod: stop.paymentMethod,
                        deliveryValue: stop.deliveryValue,
                        isReturnRequired: stop.isReturnRequired,
                        destinationLat: storeCenter.lat + (Math.random() - 0.5) * 0.02,
                        destinationLng: storeCenter.lng + (Math.random() - 0.5) * 0.02,
                        targetCourierId: targetCourierId,
                        addressNeighborhood: stop.addressNeighborhood,
                        addressComplement: stop.addressComplement,
                        addressCity: stop.addressCity,
                        addressCep: stop.addressCep,
                        stopNumber: index + 1
                    },
                    earnings: stopEarnings,
                    delivery_distance: (data.calculatedDistance || 1.2) / stopsToProcess.length // Crude estimate per stop
                };
            });

            console.log("💾 [App] Inserting batch/multi-stop orders into Supabase...", payloads);
            const { data: createdDataList, error: insertError } = await supabase
                .from('deliveries')
                .insert(payloads)
                .select();

            if (insertError) throw insertError;

            // Update local state
            const mappedOrders: Order[] = (createdDataList || []).map(createdData => {
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
                    batch_id: createdData.batch_id
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
                const newEarnings = i === 0 ? order.estimatedPrice : Number((order.estimatedPrice * 0.5).toFixed(2));

                const { error } = await supabase
                    .from('deliveries')
                    .update({
                        driver_id: courierId,
                        batch_id: batchId,
                        collection_code: existingPickupCode,
                        earnings: newEarnings,
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

        const orderIds = orderToUpdate.isBatch && orderToUpdate.batchOrders
            ? orderToUpdate.batchOrders.map(o => o.id)
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
        }
    };

    const handleValidatePickup = async (orderId: string) => {
        const orderToUpdate = orders.find(o => o.id === orderId);
        if (!orderToUpdate) return;

        const orderIds = orderToUpdate.isBatch && orderToUpdate.batchOrders
            ? orderToUpdate.batchOrders.map(o => o.id)
            : [orderId];

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
        } catch (err) {
            console.error("❌ Error validating order(s) in DB:", err);
            setNotification({ title: "Erro", message: "Falha ao validar no sistema." });
        }

        // playAlert(); // REMOVED: Only arrive at store should play
        setNotification({ title: "Segurança Confirmada", message: "Pedido(s) despachado(s) com sucesso." });
    };

    // NEW: HANDLE CONFIRM RETURN (Finalize Logic)
    const handleConfirmReturn = async (orderId: string) => {
        const orderToUpdate = orders.find(o => o.id === orderId);
        if (!orderToUpdate) return;

        const orderIds = orderToUpdate.isBatch && orderToUpdate.batchOrders
            ? orderToUpdate.batchOrders.map(o => o.id)
            : [orderId];

        setOrders(prev => prev.map(o => {
            if (!orderIds.includes(o.id)) return o;

            const newEvent: OrderEvent = {
                status: OrderStatus.DELIVERED,
                label: "Devolução Confirmada",
                timestamp: new Date(),
                description: "Lojista confirmou recebimento da maquininha/dinheiro. Pedido finalizado."
            };

            // Free up courier (only once for the whole batch)
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

        if (orderIds.length === 0) {
            console.warn("⚠️ [handleConfirmReturn] No order IDs to update.");
            return;
        }

        console.log("🚀 [handleConfirmReturn] Updating order IDs:", orderIds);

        try {
            const { error } = await supabase
                .from('deliveries')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .in('id', orderIds);

            if (error) throw error;
            console.log("✅ Order(s) finalized in DB:", orderIds);
        } catch (err) {
            console.error("❌ Error finalizing order(s) in DB:", err);
            setNotification({ title: "Erro", message: "Falha ao finalizar no sistema." });
        }

        // playAlert(); // REMOVED: Only arrive at store should play
        setNotification({ title: "Logística Reversa Concluída", message: "Devolução confirmada. Pedido(s) encerrado(s)." });
    };

    // NEW: HANDLE CANCEL ORDER
    const handleCancelOrder = (orderId: string, reason: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // 1. Return courier to pool if exists
        if (order.courier) {
            // If the courier is not at the destination yet, place them back at current simulated location
            const returnedCourier = { ...order.courier };
            setAvailableCouriers(prev => [...prev, returnedCourier]);
        }

        // 2. Update Order Status
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
                courier: undefined // Remove courier association from order
            };
        }));

        // 3. Clear Active Order if it's the one cancelled
        if (activeOrder?.id === orderId) {
            setActiveOrder(null);
        }
        if (selectedOrderDetails?.id === orderId) {
            setSelectedOrderDetails(null);
        }


        setNotification({ title: "Pedido Cancelado", message: "Solicitação interrompida e motoboy liberado." });
        setTimeout(() => setNotification(null), 4000);

        // 4. Persist to Supabase
        const cancelOrderInDB = async () => {
            try {
                const { error } = await supabase
                    .from('deliveries')
                    .update({
                        status: 'cancelled'
                    })
                    .eq('id', orderId);

                if (error) throw error;
                console.log("✅ Order cancelled in DB:", orderId);
            } catch (err) {
                console.error("❌ Error cancelling order in DB:", err);
                setNotification({ title: "Erro", message: "Falha ao cancelar no servidor." });
            }
        };
        cancelOrderInDB();
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

    // --- HELPER: FETCH OSRM ROUTE ---
    const fetchRoute = async (start: { lat: number, lng: number }, end: { lat: number, lng: number }): Promise<{ lat: number, lng: number }[]> => {
        try {
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                return data.routes[0].geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
            }
            return [];
        } catch (error) {
            console.error("OSRM Fetch Error:", error);
            return []; // Fallback to straight line handling in logic
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

        }, 100);
        return () => clearInterval(interval);
    }, []); // Empty dependency array = stable interval that uses Refs

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
                <div className="p-8 pb-4">
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

                <div className="flex-1 overflow-y-auto p-8 pt-0">
                    <div className="bg-white dark:bg-guepardo-gray-800 rounded-xl border border-gray-200 dark:border-guepardo-gray-700 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
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

    // 2. Loading State
    if (showSplash) {
        return <SplashScreen />;
    }

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-white">Carregando...</div>;
    }

    // 3. Unauthenticated State (Wizard)
    if (!session) {
        return (
            <div className="w-full h-full flex justify-center items-center bg-transparent">
                <div className="w-full max-w-[480px] h-full relative overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.95)] bg-transparent">
                    <WizardForm />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex bg-transparent font-sans overflow-hidden">

            {/* GLOBAL SIDEBAR */}
            <GlobalSidebar
                currentView={currentView}
                onChangeView={setCurrentView}
                hasActiveOrders={activeOrdersList.length > 0}
            />

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">

                {/* GLOBAL HEADER */}
                <Header storeProfile={realStoreProfile || STORE_PROFILE} notificationCount={2} />

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
                            onResetDatabase={handleResetDatabase}
                            onBulkAssign={handleBulkAssign}
                            theme={settings.mapTheme}
                            settings={settings}
                            onToggleMapTheme={toggleMapTheme}
                        />
                    )}

                    {currentView === 'clients' && renderClientsView()}

                    {currentView === 'history' && (
                        <HistoryView
                            orders={orders}
                            onSelectOrder={setSelectedOrderDetails}
                        />
                    )}

                    {currentView === 'settings' && (
                        <SettingsView
                            settings={settings}
                            onSave={setSettings}
                        />
                    )}
                </div>

            </main>

            {/* OVERLAYS & MODALS */}
            <OrderDetailsModal
                order={selectedOrderDetails}
                storeProfile={realStoreProfile || STORE_PROFILE}
                onClose={() => setSelectedOrderDetails(null)}
                theme={settings.theme}
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
        </div>
    );
}

export default App;
