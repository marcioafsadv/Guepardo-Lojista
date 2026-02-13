
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
import { Order, OrderStatus, Courier, StoreProfile, OrderEvent, Customer, SavedAddress, StoreSettings } from './types';
import { Zap, Menu, Bell, MapPin, Search, Phone, FileText, ArrowRight, Filter, Users, Clock } from 'lucide-react';

// --- CONFIGURAÇÃO DA LOJA (PADARIA REBECA - ITU/SP) ---
const STORE_PROFILE: StoreProfile = {
    name: "Padaria e Conveniência Rebeca",
    address: "Rua Luiz Scavone - Centro, Itu - SP",
    lat: -23.257217,
    lng: -47.300549
};

// --- MOCK CUSTOMERS (INITIAL DATA) ---
const INITIAL_CUSTOMERS: Customer[] = [
    {
        id: 'cust_1',
        name: 'Carlos da Silva',
        phone: '11999887766',
        totalOrders: 15, // Gold Client
        totalSpent: 250.50,
        lastOrderDate: new Date(Date.now() - 86400000 * 2), // 2 days ago
        averageWaitTime: 2.5, // Fast
        addresses: [{
            street: 'Rua Floriano Peixoto',
            number: '120',
            neighborhood: 'Centro',
            city: 'Itu/SP',
            cep: '13300-000',
            lastUsed: new Date()
        }],
        notes: 'Campainha não funciona, gritar "Entregador"'
    },
    {
        id: 'cust_2',
        name: 'Ana Pereira',
        phone: '11988776655',
        totalOrders: 6, // Frequent Client
        totalSpent: 65.90,
        lastOrderDate: new Date(Date.now() - 86400000 * 15), // 15 days ago
        averageWaitTime: 8.0, // Slow
        addresses: [{
            street: 'Av. Prudente de Moraes',
            number: '500',
            complement: 'Apt 42',
            neighborhood: 'Vila Nova',
            city: 'Itu/SP',
            cep: '13309-050',
            lastUsed: new Date()
        }]
    },
    {
        id: 'cust_3',
        name: 'Roberto Mendes',
        phone: '11977665544',
        totalOrders: 2, // New Client
        totalSpent: 25.00,
        lastOrderDate: new Date(Date.now() - 86400000 * 1), // Yesterday
        averageWaitTime: 4.0,
        addresses: [{
            street: 'Rua Santa Rita',
            number: '88',
            neighborhood: 'Centro',
            city: 'Itu/SP',
            cep: '13300-100',
            lastUsed: new Date()
        }],
        notes: 'Deixar na portaria'
    }
];

// --- MOCK COURIERS (20 ENTREGADORES - CENÁRIO REALISTA EM ITU) ---
const INITIAL_COURIERS: Courier[] = [
    {
        "id": "1",
        "name": "Roberto Almeida",
        "vehiclePlate": "BRA-2E19",
        "photoUrl": "https://ui-avatars.com/api/?name=Roberto+Almeida&background=FFC107&color=000",
        "phone": "11999990001",
        "lat": -23.264201, "lng": -47.299205
    },
    {
        "id": "2",
        "name": "Fernanda Costa",
        "vehiclePlate": "FGT-5H42",
        "photoUrl": "https://ui-avatars.com/api/?name=Fernanda+Costa&background=F57C00&color=fff",
        "phone": "11999990002",
        "lat": -23.268500, "lng": -47.301500
    },
    {
        "id": "3",
        "name": "Lucas Pereira",
        "vehiclePlate": "JKS-9L12",
        "photoUrl": "https://ui-avatars.com/api/?name=Lucas+Pereira&background=3E1F11&color=fff",
        "phone": "11999990003",
        "lat": -23.261000, "lng": -47.295000
    },
    {
        "id": "4",
        "name": "Julia Santos",
        "vehiclePlate": "XYZ-1A23",
        "photoUrl": "https://ui-avatars.com/api/?name=Julia+Santos&background=FFC107&color=000",
        "phone": "11999990004",
        "lat": -23.259800, "lng": -47.305100
    },
    {
        "id": "5",
        "name": "Marcos Oliveira",
        "vehiclePlate": "ABC-4D56",
        "photoUrl": "https://ui-avatars.com/api/?name=Marcos+Oliveira&background=F57C00&color=fff",
        "phone": "11999990005",
        "lat": -23.272100, "lng": -47.290500
    },
    {
        "id": "6",
        "name": "Rafael Souza",
        "vehiclePlate": "GHI-7J89",
        "photoUrl": "https://ui-avatars.com/api/?name=Rafael+Souza&background=3E1F11&color=fff",
        "phone": "11999990006",
        "lat": -23.265500, "lng": -47.308800
    },
    {
        "id": "7",
        "name": "Bruno Lima",
        "vehiclePlate": "MNO-2P34",
        "photoUrl": "https://ui-avatars.com/api/?name=Bruno+Lima&background=FFC107&color=000",
        "phone": "11999990007",
        "lat": -23.263000, "lng": -47.292000
    },
    {
        "id": "8",
        "name": "Gabriela Rocha",
        "vehiclePlate": "QRS-5T67",
        "photoUrl": "https://ui-avatars.com/api/?name=Gabriela+Rocha&background=F57C00&color=fff",
        "phone": "11999990008",
        "lat": -23.266700, "lng": -47.297500
    },
    {
        "id": "9",
        "name": "Thiago Alves",
        "vehiclePlate": "UVW-8X90",
        "photoUrl": "https://ui-avatars.com/api/?name=Thiago+Alves&background=3E1F11&color=fff",
        "phone": "11999990009",
        "lat": -23.260500, "lng": -47.303200
    },
    {
        "id": "10",
        "name": "Daniel Ferreira",
        "vehiclePlate": "YZA-1B23",
        "photoUrl": "https://ui-avatars.com/api/?name=Daniel+Ferreira&background=FFC107&color=000",
        "phone": "11999990010",
        "lat": -23.269900, "lng": -47.294400
    },
    {
        "id": "11",
        "name": "Eduardo Ribeiro",
        "vehiclePlate": "CDE-4F56",
        "photoUrl": "https://ui-avatars.com/api/?name=Eduardo+Ribeiro&background=F57C00&color=fff",
        "phone": "11999990011",
        "lat": -23.264800, "lng": -47.306600
    },
    {
        "id": "12",
        "name": "Carla Martins",
        "vehiclePlate": "GHI-7J89",
        "photoUrl": "https://ui-avatars.com/api/?name=Carla+Martins&background=3E1F11&color=fff",
        "phone": "11999990012",
        "lat": -23.262500, "lng": -47.299900
    },
    {
        "id": "13",
        "name": "Vinicius Gomes",
        "vehiclePlate": "KLM-2N34",
        "photoUrl": "https://ui-avatars.com/api/?name=Vinicius+Gomes&background=FFC107&color=000",
        "phone": "11999990013",
        "lat": -23.267800, "lng": -47.288800
    },
    {
        "id": "14",
        "name": "Gustavo Barbosa",
        "vehiclePlate": "OPQ-5R67",
        "photoUrl": "https://ui-avatars.com/api/?name=Gustavo+Barbosa&background=F57C00&color=fff",
        "phone": "11999990014",
        "lat": -23.261200, "lng": -47.310200
    },
    {
        "id": "15",
        "name": "Leonardo Melo",
        "vehiclePlate": "STU-8V90",
        "photoUrl": "https://ui-avatars.com/api/?name=Leonardo+Melo&background=3E1F11&color=fff",
        "phone": "11999990015",
        "lat": -23.270500, "lng": -47.302100
    },
    {
        "id": "16",
        "name": "Felipe Nascimento",
        "vehiclePlate": "WXY-1Z23",
        "photoUrl": "https://ui-avatars.com/api/?name=Felipe+Nascimento&background=FFC107&color=000",
        "phone": "11999990016",
        "lat": -23.263900, "lng": -47.296500
    },
    {
        "id": "17",
        "name": "João Silva",
        "vehiclePlate": "ABC-4D56",
        "photoUrl": "https://ui-avatars.com/api/?name=Joao+Silva&background=F57C00&color=fff",
        "phone": "11999990017",
        "lat": -23.265100, "lng": -47.300500
    },
    {
        "id": "18",
        "name": "Pedro Rodrigues",
        "vehiclePlate": "EFG-7H89",
        "photoUrl": "https://ui-avatars.com/api/?name=Pedro+Rodrigues&background=3E1F11&color=fff",
        "phone": "11999990018",
        "lat": -23.268200, "lng": -47.307700
    },
    {
        "id": "19",
        "name": "Mateus Carvalho",
        "vehiclePlate": "IJK-2L34",
        "photoUrl": "https://ui-avatars.com/api/?name=Mateus+Carvalho&background=FFC107&color=000",
        "phone": "11999990019",
        "lat": -23.262100, "lng": -47.293300
    },
    {
        "id": "20",
        "name": "Ricardo Araujo",
        "vehiclePlate": "MNO-5P67",
        "photoUrl": "https://ui-avatars.com/api/?name=Ricardo+Araujo&background=F57C00&color=fff",
        "phone": "11999990020",
        "lat": -23.266600, "lng": -47.304400
    }
];

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
    const [currentView, setCurrentView] = useState<AppView>('operational');
    const [orders, setOrders] = useState<Order[]>([]);
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    const [notification, setNotification] = useState<{ title: string, message: string } | null>(null);
    const [availableCouriers, setAvailableCouriers] = useState<Courier[]>(INITIAL_COURIERS);

    // --- MANUAL ROUTING (TRACKING PAGE) ---
    // Since we don't have react-router-dom, we check URL manually
    if (window.location.pathname.startsWith('/track/')) {
        return <TrackingPage />;
    }

    // --- DEFAULT: REGISTRATION WIZARD (SIMULATING NOT LOGGED IN) ---
    // To allow access to dashboard, we would need a login state.
    // For now, based on user request, we default to the Wizard.
    // We can add a temporary override or just simple state if needed,
    // but the request was "iniciar já na tela de cadastro".

    // Check if we are in "dashboard mode" hash or something, otherwise show wizard
    // Let's use a temporary state override if the user manually navigates in previous valid sessions, but here
    // we force it.

    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return !!localStorage.getItem('guepardo_user');
    });

    if (!isLoggedIn) {
        return <WizardForm />;
    }


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
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Keep Refs synced
    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    useEffect(() => {
        couriersRef.current = availableCouriers;
    }, [availableCouriers]);

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

    const updateCustomerDatabase = (orderData: Partial<Order>) => {
        if (!orderData.clientName) return;

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
                const cust = updatedCustomers[existingIndex];
                cust.totalOrders += 1;
                cust.totalSpent += (orderData.deliveryValue || 0);
                cust.lastOrderDate = new Date();
                cust.phone = orderData.clientPhone || cust.phone;
                const addressExists = cust.addresses.some(a => a.street === newAddress.street && a.number === newAddress.number);
                if (!addressExists) {
                    cust.addresses = [newAddress, ...cust.addresses];
                }
                return updatedCustomers;
            } else {
                const newCustomer: Customer = {
                    id: Date.now().toString(),
                    name: orderData.clientName!,
                    phone: orderData.clientPhone || '',
                    totalOrders: 1,
                    totalSpent: orderData.deliveryValue || 0,
                    lastOrderDate: new Date(),
                    averageWaitTime: 5,
                    addresses: [newAddress],
                    notes: ''
                };

                return [...prevCustomers, newCustomer];
            }
        });
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

    const handleNewOrder = (data: Omit<Order, 'id' | 'status' | 'createdAt' | 'estimatedPrice' | 'distanceKm' | 'events' | 'destinationLat' | 'destinationLng' | 'courier' | 'returnFee'> & { isReturnRequired?: boolean }) => {
        let destCoords = { lat: STORE_PROFILE.lat + (Math.random() - 0.5) * 0.02, lng: STORE_PROFILE.lng + (Math.random() - 0.5) * 0.02 };
        if (data.destination.includes('Carlos Scalet')) destCoords = { lat: -23.2680, lng: -47.3000 };

        const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

        // BUSINESS RULE: Force return if CARD payment, even if flag missed from UI
        const mustReturn = data.isReturnRequired || data.paymentMethod === 'CARD';

        // Calculate Base + Return Fee using SETTINGS
        const basePrice = settings.baseFreight + (Math.random() * 2); // Keep random variation or remove? "Frete Base (R$ 8,50)" suggests fixed base. let's keep variation as "dynamic surge" or just use base.
        // User asked for "Configuração do Frete Base". It implies the starting point. I will keep the small random variation as a "distance factor" simulation for now, or maybe just use basePrice.
        // Let's use settings.baseFreight directly + distance factor simulation if we want, but for now let's stick closer to the requested "Frete Base".
        // Actually, the previous code was `8.50 + Math.random() * 2`. I'll replace 8.50 with settings.baseFreight.
        const calculatedBase = settings.baseFreight + (Math.random() * 2);

        const returnFee = (mustReturn && settings.returnFeeActive) ? calculatedBase * 0.5 : 0;
        const finalPrice = calculatedBase + returnFee;

        const newEvent: OrderEvent = { status: OrderStatus.PENDING, label: "Pedido Feito", timestamp: new Date(), description: "Aguardando entregador..." };
        const newOrder: Order = {
            ...data,
            id: Date.now().toString(),
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

        setOrders(prev => [newOrder, ...prev]);
        setActiveOrder(newOrder);
        updateCustomerDatabase(newOrder);
        setNotification({ title: "Solicitação Enviada", message: `Procurando entregador para ${newOrder.clientName}...` });
        setTimeout(() => setNotification(null), 4000);

        // Simulate finding a courier automatically after 5 seconds
        setTimeout(() => {
            handleSimulateAccept(newOrder.id);
        }, 5000);
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
                            fetchRoute({ lat: order.courier.lat, lng: order.courier.lng }, { lat: STORE_PROFILE.lat, lng: STORE_PROFILE.lng })
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
                                const move = moveTowards(nextCourierPos.lat, nextCourierPos.lng, STORE_PROFILE.lat, STORE_PROFILE.lng, 0.0004); // Fast linear 
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
                        const destLat = order.destinationLat || STORE_PROFILE.lat;
                        const destLng = order.destinationLng || STORE_PROFILE.lng;
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
                            fetchRoute({ lat: order.courier.lat, lng: order.courier.lng }, { lat: STORE_PROFILE.lat, lng: STORE_PROFILE.lng })
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
                            const move = moveTowards(nextCourierPos.lat, nextCourierPos.lng, STORE_PROFILE.lat, STORE_PROFILE.lng, 0.0004);
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
                <Header storeProfile={STORE_PROFILE} notificationCount={2} />

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
                            storeProfile={STORE_PROFILE}
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
                storeProfile={STORE_PROFILE}
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
