
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DeliveryForm } from './components/DeliveryForm';
import { ActiveOrderCard } from './components/ActiveOrderCard';
import { LiveMap } from './components/LiveMap';
import { GlobalSidebar, AppView } from './components/GlobalSidebar';
import { DashboardTab } from './components/DashboardTab';
import { Header } from './components/Header';
import { TrackingPage } from './components/TrackingPage';

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
    siren: 'https://assets.mixkit.co/active_storage/sfx/249/249-preview.mp3' // Sci-Fi Siren
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
                setRealStoreProfile({
                    name: data.fantasy_name || data.company_name,
                    address: `${data.address?.street}, ${data.address?.number} - ${data.address?.city}`,
                    lat: -23.257217, // Mock coords for now as we don't have geocoding in stores table yet
                    lng: -47.300549
                });
            }
        };
        fetchProfile();
    }, [session]);

    // Fetch Couriers (Profiles + Vehicles)
    // We fetch "approved" profiles that have a vehicle.
    useEffect(() => {
        const fetchCouriers = async () => {
            try {
                // 1. Fetch Approved Profiles
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('status', 'approved');

                if (profileError) throw profileError;

                if (profiles && profiles.length > 0) {
                    const profileIds = profiles.map(p => p.id);

                    // 2. Fetch Vehicles for these profiles
                    const { data: vehicles, error: vehicleError } = await supabase
                        .from('vehicles')
                        .select('*')
                        .in('user_id', profileIds);

                    if (vehicleError) throw vehicleError;

                    // 3. Merge Data
                    const realCouriers: Courier[] = profiles.map(p => {
                        const vehicle = vehicles?.find(v => v.user_id === p.id);
                        if (!vehicle) return null; // Only show if has vehicle

                        // Filter offline couriers (or those without location updates recently)
                        if (!p.is_online || !p.current_lat || !p.current_lng) return null;

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

                    console.log('Real Couriers Fetched:', realCouriers);
                    setAvailableCouriers(realCouriers);
                }
            } catch (err) {
                console.error("Error fetching couriers:", err);
            }
        };

        fetchCouriers();

        // Optional: Realtime Presence or Location updates could go here
    }, [realStoreProfile]); // Re-fetch if store moves/init

    // Realtime Subscription
    useEffect(() => {
        if (!session?.user) return;

        const channel = supabase
            .channel('orders-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'deliveries',
                    filter: `store_id=eq.${session.user.id}`
                },
                (payload) => {
                    console.log('Realtime Update:', payload);
                    const newStatus = payload.new.status;
                    const orderId = payload.new.id;

                    setOrders(prev => prev.map(o => {
                        if (o.id === orderId) {
                            // Update Status
                            const mappedStatus = mapSupabaseStatusToLocal(newStatus);
                            if (mappedStatus !== o.status) {
                                // Add Event
                                const newEvent: OrderEvent = {
                                    status: mappedStatus,
                                    label: getStatusLabel(mappedStatus),
                                    timestamp: new Date(),
                                    description: `Atualizado via App Entregador`
                                };

                                // Trigger Notifications
                                if (mappedStatus === OrderStatus.ACCEPTED) {
                                    setNotification({ title: "Entregador Encontrado!", message: "Um Guepardo aceitou sua corrida." });
                                    playAlert();
                                } else if (mappedStatus === OrderStatus.ARRIVED_AT_STORE) {
                                    setNotification({ title: "Entregador na Loja", message: "Entregador chegou para coleta." });
                                    playAlert();
                                } else if (mappedStatus === OrderStatus.DELIVERED) {
                                    setNotification({ title: "Entrega Finalizada", message: "Pedido entregue ao cliente." });
                                    playAlert();
                                }

                                return { ...o, status: mappedStatus, events: [...o.events, newEvent] };
                            }
                        }
                        return o;
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [session]);

    // Fetch Customers
    useEffect(() => {
        if (!session?.user) return;

        const fetchCustomers = async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('store_id', session.user.id);

            if (data) {
                const mapCustomers: Customer[] = data.map(c => ({
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
                }));
                setCustomers(mapCustomers);
            }
        };
        fetchCustomers();
    }, [session]);

    // Helper for Status Mapping
    const mapSupabaseStatusToLocal = (status: string): OrderStatus => {
        switch (status) {
            case 'pending': return OrderStatus.PENDING;
            case 'accepted': return OrderStatus.ACCEPTED;
            case 'arrived_pickup': return OrderStatus.ARRIVED_AT_STORE;
            case 'in_transit': return OrderStatus.IN_TRANSIT;
            case 'completed': return OrderStatus.DELIVERED;
            case 'canceled': return OrderStatus.CANCELED;
            default: return OrderStatus.PENDING;
        }
    };

    const getStatusLabel = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.ACCEPTED: return "Aceito";
            case OrderStatus.ARRIVED_AT_STORE: return "Na Loja";
            case OrderStatus.IN_TRANSIT: return "Em Rota";
            case OrderStatus.DELIVERED: return "Concluído";
            default: return "Atualização";
        }
    };


    // Initial Store Settings
    const [settings, setSettings] = useState<StoreSettings>({
        openTime: "08:00",
        closeTime: "22:00",
        isStoreOpen: true,
        deliveryRadiusKm: 5,
        baseFreight: 8.50,
        returnFeeActive: true,
        prepTimeMinutes: 15,
        tierGoals: { bronze: 3, silver: 5, gold: 10 },
        theme: 'dark',
        alertSound: 'roar'
    });

    // View Specific States (Search/Filters)
    const [clientSearch, setClientSearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState('all'); // all, pending, completed

    // CRM / Customer State
    const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);

    // Modal State
    const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
    const [selectedClientDetails, setSelectedClientDetails] = useState<Customer | null>(null);



    // Refs for Simulation (To access fresh state in timeouts/intervals)
    const ordersRef = useRef(orders);
    const couriersRef = useRef(availableCouriers);
    const storeProfileRef = useRef(STORE_PROFILE); // Default
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Keep Refs synced
    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    useEffect(() => {
        couriersRef.current = availableCouriers;
    }, [availableCouriers]);

    useEffect(() => {
        if (realStoreProfile) {
            storeProfileRef.current = realStoreProfile;
        }
    }, [realStoreProfile]);

    // SOUND EFFECT SYNC
    useEffect(() => {
        const soundUrl = SOUNDS[settings.alertSound as keyof typeof SOUNDS] || SOUNDS.default;
        audioRef.current = new Audio(soundUrl);
    }, [settings.alertSound]);

    // THEME EFFECT SYNC
    useEffect(() => {
        const root = window.document.documentElement;
        if (settings.theme === 'dark') {
            root.classList.add('dark');
        } else if (settings.theme === 'light') {
            root.classList.remove('dark');
        } else {
            // Auto
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }, [settings.theme]);

    // Initial Theme class verification (on mount)
    useEffect(() => {
        // Default to dark if state is dark
        if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    }, []);



    const playAlert = () => {
        if (audioRef.current) {
            audioRef.current.volume = 0.5;
            audioRef.current.play().catch(() => { });
        }
    };

    const updateCustomerDatabase = async (orderData: Partial<Order>) => {
        if (!orderData.clientName || !session?.user) return;

        // Optimistic Update
        let currentCustomer: Customer | undefined;
        let isNew = false;

        setCustomers(prevCustomers => {
            const existingIndex = prevCustomers.findIndex(c => c.name.toLowerCase() === orderData.clientName!.toLowerCase());
            const newAddress: SavedAddress = {
                street: orderData.addressStreet!,
                number: orderData.addressNumber!,
                complement: orderData.addressComplement,
                neighborhood: orderData.addressNeighborhood!,
                city: orderData.addressCity!,
                cep: '00000-000',
                lastUsed: new Date()
            };

            if (existingIndex >= 0) {
                const updatedCustomers = [...prevCustomers];
                const cust = { ...updatedCustomers[existingIndex] };
                cust.totalOrders += 1;
                cust.totalSpent += (orderData.deliveryValue || 0);
                cust.lastOrderDate = new Date();
                cust.phone = orderData.clientPhone || cust.phone;

                const addressExists = cust.addresses.some(a => a.street === newAddress.street && a.number === newAddress.number);
                if (!addressExists) {
                    cust.addresses = [newAddress, ...cust.addresses];
                }

                updatedCustomers[existingIndex] = cust;
                currentCustomer = cust;
                return updatedCustomers;
            } else {
                isNew = true;
                const newCustomer: Customer = {
                    id: crypto.randomUUID(), // Temp ID
                    name: orderData.clientName!,
                    phone: orderData.clientPhone || '',
                    totalOrders: 1,
                    totalSpent: orderData.deliveryValue || 0,
                    lastOrderDate: new Date(),
                    averageWaitTime: 5,
                    addresses: [newAddress],
                    notes: ''
                };
                currentCustomer = newCustomer;
                return [...prevCustomers, newCustomer];
            }
        });

        // Supabase Upsert
        if (currentCustomer) {
            // Check if exists by name/phone to get real ID if new locally
            // Ideally we used the ID from currentCustomer but if it was just created locally it's random.
            // We should use Upsert with ON CONFLICT? But we don't have a unique constraint on name/store_id yet.
            // For now, let's try to match by name or insert.

            // Simplest Strategy: 
            // 1. Check if exists
            const { data: existing } = await supabase
                .from('customers')
                .select('*')
                .eq('store_id', session.user.id)
                .ilike('name', currentCustomer.name)
                .single();

            const payload = {
                store_id: session.user.id,
                name: currentCustomer.name,
                phone: currentCustomer.phone,
                total_orders: currentCustomer.totalOrders,
                total_spent: currentCustomer.totalSpent,
                last_order_date: currentCustomer.lastOrderDate,
                addresses: currentCustomer.addresses
            };

            if (existing) {
                await supabase.from('customers').update(payload).eq('id', existing.id);
            } else {
                await supabase.from('customers').insert(payload);
            }
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

        playAlert();
    };

    const handleNewOrder = async (data: Omit<Order, 'id' | 'status' | 'createdAt' | 'estimatedPrice' | 'distanceKm' | 'events' | 'destinationLat' | 'destinationLng' | 'courier' | 'returnFee'> & { isReturnRequired?: boolean }) => {
        if (!session?.user) return;

        let destCoords = { lat: STORE_PROFILE.lat + (Math.random() - 0.5) * 0.02, lng: STORE_PROFILE.lng + (Math.random() - 0.5) * 0.02 };
        if (data.destination.includes('Carlos Scalet')) destCoords = { lat: -23.2680, lng: -47.3000 };

        const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
        const mustReturn = data.isReturnRequired || data.paymentMethod === 'CARD';
        const calculatedBase = settings.baseFreight + (Math.random() * 2);
        const returnFee = (mustReturn && settings.returnFeeActive) ? calculatedBase * 0.5 : 0;
        const finalPrice = calculatedBase + returnFee;

        const newEvent: OrderEvent = { status: OrderStatus.PENDING, label: "Solicitado", timestamp: new Date(), description: "Aguardando entregadores..." };
        const newOrder: Order = {
            ...data,
            id: crypto.randomUUID(), // Temp ID for local state, will be replaced or synced? Ideally use returned ID.
            status: OrderStatus.PENDING,
            createdAt: new Date(),
            estimatedPrice: finalPrice,
            returnFee: returnFee,
            isReturnRequired: mustReturn,
            distanceKm: 1.2,
            destinationLat: destCoords.lat,
            destinationLng: destCoords.lng,
            events: [newEvent],
            pickupCode: generatedPin,
        };

        // Update Local State Optimistically
        setOrders(prev => [newOrder, ...prev]);
        setActiveOrder(newOrder);
        setNotification({ title: "Solicitando Entregador...", message: "Transmitindo pedido para a rede Guepardo." });

        try {
            // INSERT INTO SUPABASE
            const { data: insertedData, error } = await supabase
                .from('deliveries')
                .insert({
                    id: newOrder.id, // Use same UUID
                    store_id: session.user.id,
                    store_name: realStoreProfile?.name || STORE_PROFILE.name,
                    store_address: realStoreProfile?.address || STORE_PROFILE.address,
                    customer_name: data.clientName,
                    customer_address: data.destination,
                    customer_phone_suffix: data.clientPhone, // Mapping to existing column
                    status: 'pending',
                    items: {
                        paymentMethod: data.paymentMethod,
                        deliveryValue: data.deliveryValue,
                        changeFor: data.changeFor,
                        isReturnRequired: mustReturn,
                        pickupCode: generatedPin,
                        destinationLat: destCoords.lat,
                        destinationLng: destCoords.lng
                    },
                    earnings: finalPrice // Store the delivery price
                })
                .select()
                .single();

            if (error) throw error;

            console.log("Order created in Supabase:", insertedData);
            updateCustomerDatabase(newOrder);

        } catch (err: any) {
            console.error("Error creating order:", err);
            setNotification({ title: "Erro", message: "Falha ao criar pedido no sistema." });
            // Rollback local state if needed
            setOrders(prev => prev.filter(o => o.id !== newOrder.id));
        }
    };

    // --- STATE MACHINE ACTIONS (MANDATORY VALIDATION) ---

    const handleMarkAsReady = (orderId: string) => {
        setOrders(prev => prev.map(o => {
            if (o.id !== orderId) return o;
            const newEvent: OrderEvent = { status: OrderStatus.READY_FOR_PICKUP, label: "Pronto p/ Coleta", timestamp: new Date(), description: "Lojista marcou como pronto." };
            return {
                ...o,
                status: OrderStatus.READY_FOR_PICKUP,
                events: [...o.events, newEvent]
            };
        }));

    };

    const handleValidatePickup = (orderId: string) => {
        setOrders(prev => prev.map(o => {
            if (o.id !== orderId) return o;
            const newEvent: OrderEvent = { status: OrderStatus.IN_TRANSIT, label: "Código Validado", timestamp: new Date(), description: "Segurança confirmada. Despachado." };
            return {
                ...o,
                status: OrderStatus.IN_TRANSIT,
                events: [...o.events, newEvent]
            };
        }));
        playAlert();
        setNotification({ title: "Segurança Confirmada", message: "Pedido despachado com sucesso." });
    };

    // NEW: HANDLE CONFIRM RETURN (Finalize Logic)
    const handleConfirmReturn = (orderId: string) => {
        setOrders(prev => prev.map(o => {
            if (o.id !== orderId) return o;

            const newEvent: OrderEvent = {
                status: OrderStatus.DELIVERED,
                label: "Devolução Confirmada",
                timestamp: new Date(),
                description: "Lojista confirmou recebimento da maquininha/dinheiro. Pedido finalizado."
            };

            // Free up courier
            if (o.courier) {
                const courierAtStore = { ...o.courier, lat: STORE_PROFILE.lat, lng: STORE_PROFILE.lng };
                setAvailableCouriers(old => [...old, courierAtStore]);
            }

            return {
                ...o,
                status: OrderStatus.DELIVERED,
                events: [...o.events, newEvent]
            };
        }));

        playAlert();
        setNotification({ title: "Logística Reversa Concluída", message: "Devolução confirmada. Pedido encerrado." });

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

            // --- PART A: ACTIVE ORDERS SIMULATION ---
            // Find any active orders that need simulation updates
            const activeOrdersIndices = currentOrders.reduce((acc, o, index) => {
                if (o.status !== OrderStatus.DELIVERED &&
                    o.status !== OrderStatus.CANCELED &&
                    o.status !== OrderStatus.PENDING &&
                    o.courier) {
                    acc.push(index);
                }
                return acc;
            }, [] as number[]);

            let ordersUpdated = false;
            let nextOrders = [...currentOrders];

            // ASYNC HANDLING INSIDE INTERVAL IS TRICKY.
            // We use a "fire and forget" approach for fetching, but we need to know if we are WAITING for a route.
            // To keep it simple in this Loop, we Check if route is missing and needed, trigger fetch, and Wait.

            if (activeOrdersIndices.length > 0) {
                activeOrdersIndices.forEach(idx => {
                    const order = nextOrders[idx];
                    if (!order || order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELED || !order.courier) return;

                    let nextStatus = order.status;
                    let nextCourierPos = { lat: order.courier.lat, lng: order.courier.lng };
                    let newEvents = [...order.events];
                    let updatedRoute = order.simulationRoute;
                    let updatedStep = order.simulationStep ?? 0;
                    let updatedTotalSteps = order.simulationTotalSteps; // Will be set based on duration

                    // 1. SETUP ROUTE IF NEEDED (First Tick of a new phase)
                    const needsRouteToStore = (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.TO_STORE) && !order.simulationRoute;
                    const needsRouteToClient = (order.status === OrderStatus.IN_TRANSIT) && !order.simulationRoute;
                    const needsRouteReturn = (order.status === OrderStatus.RETURNING) && !order.simulationRoute;

                    if (needsRouteToStore || needsRouteToClient || needsRouteReturn) {
                        // Start Fetch (We can't await here efficiently without blocking, so we'll do the fetch detached and update state later)
                        // But to prevent flooding, we mark a flag or just execute once.
                        // Ideally: We trigger this only ONCE when status changes.
                        // Fix: We'll do it "Just in Time" but linear fallback if getting ready.

                        // For this Demo: We will assume we can fetch fast enough or we just use linear until route appears.
                        // Actually, let's trigger the fetch immediately when status SET happens (outside loop), 
                        // BUT since I am refactoring this "App.tsx", updating "onMarkAsReady" etc is better.
                        // HOWEVER, to be less intrusive, I can check here:

                        // Let's rely on the simulation logic below:
                        // If no route, we use linear. I'll add a side-effect to fetch route if simulationStep is 0.
                    }

                    // --- PHASE 1: COURIER GOING TO STORE (30 Seconds) ---
                    if (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.TO_STORE || order.status === OrderStatus.ARRIVED_AT_STORE || order.status === OrderStatus.READY_FOR_PICKUP) {

                        // Target Duration: 30s => 300 ticks (at 100ms)
                        const TARGET_TICKS = 300;

                        // Handle Route Fetching logic inside the loop (Self-Correcting)
                        if (!order.simulationRoute && updatedStep === 0 && order.status !== OrderStatus.ARRIVED_AT_STORE && order.status !== OrderStatus.READY_FOR_PICKUP) {
                            // Trigger fetch (async)
                            fetchRoute({ lat: order.courier.lat, lng: order.courier.lng }, { lat: storeProfileRef.current.lat, lng: storeProfileRef.current.lng })
                                .then(route => {
                                    if (route.length > 0) {
                                        setOrders(prev => {
                                            const newO = [...prev];
                                            const target = newO.find(o => o.id === order.id);
                                            if (target && (target.status === OrderStatus.ACCEPTED || target.status === OrderStatus.TO_STORE)) {
                                                target.simulationRoute = route;
                                                target.simulationTotalSteps = TARGET_TICKS;
                                                target.simulationStep = 0;
                                            }
                                            return newO;
                                        });
                                    }
                                });
                            // Mark that we tried, to avoid fetch flood, maybe set step to 1 (linear temporarily)
                            updatedStep = 1;
                        }


                        // ANIMATION 
                        if (order.status !== OrderStatus.ARRIVED_AT_STORE && order.status !== OrderStatus.READY_FOR_PICKUP) {
                            updatedStep++;

                            if (order.simulationRoute && order.simulationTotalSteps) {
                                // FOLLOW ROUTE
                                const progress = Math.min(updatedStep / order.simulationTotalSteps, 1);
                                nextCourierPos = getPositionOnRoute(order.simulationRoute, progress);

                                if (progress >= 1) {
                                    // Reached

                                    // Handle delay before triggering ARRIVED_AT_STORE
                                    if (!order.storeArrivalTimestamp) {
                                        nextOrders[idx] = { ...order, storeArrivalTimestamp: new Date(), courier: { ...order.courier!, lat: nextCourierPos.lat, lng: nextCourierPos.lng } };
                                        ordersUpdated = true;
                                        return; // Wait next tick
                                    } else {
                                        const diff = new Date().getTime() - new Date(order.storeArrivalTimestamp).getTime();
                                        if (diff > 1000) { // Reduced to 1s
                                            nextStatus = OrderStatus.ARRIVED_AT_STORE;
                                            newEvents.push({ status: OrderStatus.ARRIVED_AT_STORE, label: "Chegou na Loja", timestamp: new Date(), description: "Entregador marcou que chegou." });
                                            playAlert();
                                            setNotification({ title: "Entregador na Loja", message: `${order.courier!.name} chegou para retirar.` });

                                            // Clear route state for next phase
                                            updatedRoute = undefined;
                                            updatedStep = 0;
                                        }
                                    }
                                }
                            } else {
                                // FALLBACK: LINEAR
                                const move = moveTowards(nextCourierPos.lat, nextCourierPos.lng, storeProfileRef.current.lat, storeProfileRef.current.lng, 0.0004); // Fast linear 
                                nextCourierPos = { lat: move.lat, lng: move.lng };
                                if (move.reached) {
                                    // Same reach logic...
                                    nextStatus = OrderStatus.ARRIVED_AT_STORE;
                                    newEvents.push({ status: OrderStatus.ARRIVED_AT_STORE, label: "Chegou na Loja", timestamp: new Date(), description: "Entregador chegou (GPS Linear)." });
                                    playAlert();
                                    updatedRoute = undefined;
                                    updatedStep = 0;
                                }
                            }
                        }
                    }

                    // --- PHASE 2: GOING TO CLIENT (60 Seconds) ---
                    else if (order.status === OrderStatus.IN_TRANSIT) {
                        const destLat = order.destinationLat || storeProfileRef.current.lat;
                        const destLng = order.destinationLng || storeProfileRef.current.lng;
                        const TARGET_TICKS = 600; // 60s -> 600 ticks

                        // Route Fetching for Phase 2
                        if (!order.simulationRoute && updatedStep === 0) {
                            fetchRoute({ lat: order.courier.lat, lng: order.courier.lng }, { lat: destLat, lng: destLng })
                                .then(route => {
                                    if (route.length > 0) {
                                        setOrders(prev => {
                                            const newO = [...prev];
                                            const target = newO.find(o => o.id === order.id);
                                            if (target && target.status === OrderStatus.IN_TRANSIT) {
                                                target.simulationRoute = route;
                                                target.simulationTotalSteps = TARGET_TICKS;
                                                target.simulationStep = 0;
                                            }
                                            return newO;
                                        });
                                    }
                                });
                            updatedStep = 1;
                        }

                        updatedStep++;

                        if (order.simulationRoute && order.simulationTotalSteps) {
                            // FOLLOW ROUTE
                            const progress = Math.min(updatedStep / order.simulationTotalSteps, 1);
                            nextCourierPos = getPositionOnRoute(order.simulationRoute, progress);

                            if (progress >= 1) {
                                // REACHED CUSTOMER
                                if (order.isReturnRequired || order.paymentMethod === 'CARD') {
                                    nextStatus = OrderStatus.RETURNING;
                                    newEvents.push({ status: OrderStatus.RETURNING, label: "Em Retorno", timestamp: new Date(), description: "Entrega realizada. Retornando." });
                                    setNotification({ title: "Maquininha Retornando", message: `Entregador de ${order.clientName} está voltando.` });
                                    updatedRoute = undefined;
                                    updatedStep = 0;
                                } else {
                                    nextStatus = OrderStatus.DELIVERED;
                                    newEvents.push({ status: OrderStatus.DELIVERED, label: "Pedido Entregue", timestamp: new Date(), description: "Finalizado." });
                                    playAlert();
                                    setNotification({ title: "Entrega Finalizada", message: `Pedido de ${order.clientName} entregue!` });
                                    setTimeout(() => setNotification(null), 3000);
                                    setAvailableCouriers(prev => [...prev, { ...order.courier!, lat: destLat, lng: destLng }]);
                                }
                            }
                        } else {
                            // FALLBACK LINEAR
                            const move = moveTowards(nextCourierPos.lat, nextCourierPos.lng, destLat, destLng, 0.0002);
                            nextCourierPos = { lat: move.lat, lng: move.lng };
                            if (move.reached) {
                                // ... same end logic
                                nextStatus = OrderStatus.DELIVERED; // Simplify fallback
                                playAlert();
                                setAvailableCouriers(prev => [...prev, { ...order.courier!, lat: destLat, lng: destLng }]);
                            }
                        }
                    }

                    // --- PHASE 3: RETURNING TO STORE ---
                    else if (order.status === OrderStatus.RETURNING) {
                        const TARGET_TICKS = 300; // 30s return

                        if (!order.simulationRoute && updatedStep === 0) {
                            fetchRoute({ lat: order.courier.lat, lng: order.courier.lng }, { lat: storeProfileRef.current.lat, lng: storeProfileRef.current.lng })
                                .then(route => {
                                    if (route.length > 0) {
                                        setOrders(prev => {
                                            const newO = [...prev];
                                            const target = newO.find(o => o.id === order.id);
                                            if (target && target.status === OrderStatus.RETURNING) {
                                                target.simulationRoute = route;
                                                target.simulationTotalSteps = TARGET_TICKS;
                                                target.simulationStep = 0;
                                            }
                                            return newO;
                                        });
                                    }
                                });
                            updatedStep = 1;
                        }

                        updatedStep++;

                        if (order.simulationRoute && order.simulationTotalSteps) {
                            const progress = Math.min(updatedStep / order.simulationTotalSteps, 1);
                            nextCourierPos = getPositionOnRoute(order.simulationRoute, progress);
                            if (progress >= 1 && order.status !== OrderStatus.RETURNING) { // Only if logic needed
                                // Wait at store
                            }
                        } else {
                            const move = moveTowards(nextCourierPos.lat, nextCourierPos.lng, storeProfileRef.current.lat, storeProfileRef.current.lng, 0.0004);
                            nextCourierPos = { lat: move.lat, lng: move.lng };
                        }
                    }

                    if (nextStatus !== order.status || nextCourierPos.lat !== order.courier.lat || updatedStep !== order.simulationStep) {
                        ordersUpdated = true;
                        nextOrders[idx] = {
                            ...order,
                            status: nextStatus,
                            courier: { ...order.courier, lat: nextCourierPos.lat, lng: nextCourierPos.lng },
                            events: newEvents,
                            simulationRoute: updatedRoute,
                            simulationStep: updatedStep,
                            simulationTotalSteps: updatedTotalSteps
                        };
                    }
                });
            }

            if (ordersUpdated) {
                setOrders(nextOrders);
            }

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
            if (upToDate && (upToDate.status !== activeOrder.status || upToDate.courier?.lat !== activeOrder.courier?.lat)) {
                setActiveOrder(upToDate);
            }
        }
    }, [orders, activeOrder]);

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
    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-white">Carregando...</div>;
    }

    // 3. Unauthenticated State (Wizard)
    if (!session) {
        return <WizardForm />;
    }

    return (
        <div className="h-screen w-full flex bg-gray-100 font-sans overflow-hidden">

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
                        <DashboardTab orders={orders} totalSpent={totalSpent} customers={customers} onViewChange={setCurrentView} />
                    )}

                    {currentView === 'operational' && (
                        <GestaoDePedidos
                            orders={orders}
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
                            theme={settings.theme}
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

        </div>
    );
}

export default App;
