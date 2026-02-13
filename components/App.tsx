
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DeliveryForm } from './components/DeliveryForm';
import { ActiveOrderCard } from './components/ActiveOrderCard';
import { LiveMap } from './components/LiveMap';
import { GlobalSidebar, AppView } from './components/GlobalSidebar';
import { DashboardTab } from './components/DashboardTab';
import { EventLog } from './components/EventLog';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { ClientHistoryModal } from './components/ClientHistoryModal';
import { GestaoDePedidos } from './components/GestaoDePedidos';
import { Order, OrderStatus, Courier, StoreProfile, OrderEvent, Customer, SavedAddress } from './types';
import { Zap, Menu, Bell, MapPin, Search, Phone, FileText, ArrowRight, Filter } from 'lucide-react';

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

// --- MOCK COURIERS (POSICIONADOS ESTRATEGICAMENTE EM ITU) ---
const INITIAL_COURIERS: Courier[] = [
    {
        id: 'c1',
        name: 'João do Centro',
        photoUrl: 'https://ui-avatars.com/api/?name=Joao+Silva&background=FFC107&color=000',
        vehiclePlate: 'ITU-1234',
        phone: '11999999999',
        // Centro de Itu (aprox 1km da loja)
        lat: -23.2645,
        lng: -47.2990
    },
    {
        id: 'c2',
        name: 'Maria do Chafariz',
        photoUrl: 'https://ui-avatars.com/api/?name=Maria+Souza&background=F57C00&color=fff',
        vehiclePlate: 'GUE-5678',
        phone: '11988888888',
        // Bairro Chafariz (aprox 1.5km da loja)
        lat: -23.2580,
        lng: -47.3085
    },
    {
        id: 'c3',
        name: 'Pedro Vila Nova',
        photoUrl: 'https://ui-avatars.com/api/?name=Pedro+Lima&background=3E1F11&color=fff',
        vehiclePlate: 'MOTO-9999',
        phone: '11977777777',
        // Vila Nova (aprox 2km da loja)
        lat: -23.2700,
        lng: -47.2950
    }
];

const ALERT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

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

    // View Specific States (Search/Filters)
    const [clientSearch, setClientSearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState('all'); // all, pending, completed

    // CRM / Customer State
    const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);

    // Modal State
    const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
    const [selectedClientDetails, setSelectedClientDetails] = useState<Customer | null>(null);

    // Debug / Event Logs
    const [logs, setLogs] = useState<string[]>([]);

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

    useEffect(() => {
        audioRef.current = new Audio(ALERT_SOUND_URL);
        addLog("SISTEMA INICIADO: Padaria Rebeca (Itu/SP).");
    }, []);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, msg]);
    };

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
                addLog(`NOVO CLIENTE CADASTRADO: ${newCustomer.name}`);
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
            addLog(`AVISO: Sem entregadores disponíveis para o pedido #${orderId.slice(-4)}`);
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
        addLog(`STATUS: ACCEPTED. Entregador ${selectedCourier.name} (${selectedCourier.vehiclePlate}) aceitou.`);
    };

    const handleNewOrder = (data: Omit<Order, 'id' | 'status' | 'createdAt' | 'estimatedPrice' | 'distanceKm' | 'events' | 'destinationLat' | 'destinationLng' | 'courier' | 'returnFee'> & { isReturnRequired?: boolean }) => {
        let destCoords = { lat: STORE_PROFILE.lat + (Math.random() - 0.5) * 0.02, lng: STORE_PROFILE.lng + (Math.random() - 0.5) * 0.02 };
        if (data.destination.includes('Carlos Scalet')) destCoords = { lat: -23.2680, lng: -47.3000 };

        const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

        // Calculate Base + Return Fee
        const basePrice = 8.50 + Math.random() * 2;
        const returnFee = data.isReturnRequired ? basePrice * 0.5 : 0;
        const finalPrice = basePrice + returnFee;

        const newEvent: OrderEvent = { status: OrderStatus.PENDING, label: "Pedido Feito", timestamp: new Date(), description: "Aguardando entregador..." };
        const newOrder: Order = {
            ...data,
            id: Date.now().toString(),
            status: OrderStatus.PENDING,
            createdAt: new Date(),
            estimatedPrice: finalPrice,
            returnFee: returnFee,
            isReturnRequired: data.isReturnRequired,
            distanceKm: 1.2,
            destinationLat: destCoords.lat,
            destinationLng: destCoords.lng,
            events: [newEvent],
            pickupCode: generatedPin,
        };

        setOrders(prev => [newOrder, ...prev]);
        setActiveOrder(newOrder);
        updateCustomerDatabase(newOrder);
        addLog(`NOVO PEDIDO: ${newOrder.clientName} (PIN: ${generatedPin}) - ${data.isReturnRequired ? 'COM RETORNO' : 'SEM RETORNO'}`);
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
        addLog(`PEDIDO #${orderId.slice(-4)}: PRONTO PARA COLETA.`);
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
        addLog(`PEDIDO #${orderId.slice(-4)}: CÓDIGO VALIDADO. IN_TRANSIT.`);
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
        addLog(`PEDIDO #${orderId.slice(-4)}: DEVOLUÇÃO CONFIRMADA. DELIVERED.`);
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

        addLog(`PEDIDO #${orderId.slice(-4)} CANCELADO: ${reason}`);
        setNotification({ title: "Pedido Cancelado", message: "Solicitação interrompida e motoboy liberado." });
        setTimeout(() => setNotification(null), 4000);
    };


    // Simulation Loops (Movement & Timeout)
    useEffect(() => {
        const interval = setInterval(() => {
            // Use Ref for simulation loop to avoid dependency chain resets
            const currentOrders = ordersRef.current;

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

            if (activeOrdersIndices.length === 0) return;

            setOrders(prevOrders => {
                // Create a copy to mutate
                const nextOrders = [...prevOrders];
                let hasUpdates = false;

                activeOrdersIndices.forEach(idx => {
                    const order = nextOrders[idx];
                    // Double check status inside the setOrders callback to be safe
                    if (!order || order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELED || !order.courier) return;

                    let nextStatus = order.status;
                    let nextCourierPos = { lat: order.courier.lat, lng: order.courier.lng };
                    const speedStep = 0.00015;
                    let newEvents = [...order.events];

                    // --- PHASE 1: COURIER GOING TO STORE ---
                    if (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.TO_STORE || order.status === OrderStatus.READY_FOR_PICKUP) {
                        const move = moveTowards(nextCourierPos.lat, nextCourierPos.lng, STORE_PROFILE.lat, STORE_PROFILE.lng, speedStep);
                        nextCourierPos = { lat: move.lat, lng: move.lng };

                        // If reached store, we DO NOT automatically dispatch anymore.
                        // We just stay there (lat/lng fixed at store) waiting for 'handleValidatePickup'
                        if (move.reached) {
                            // Only log once when arriving
                            if (order.status !== OrderStatus.READY_FOR_PICKUP && order.status !== OrderStatus.IN_TRANSIT && Math.random() > 0.95) {
                                addLog(`ENTREGADOR NA LOJA: PIN DO APP DELE: ${order.pickupCode}`);
                            }
                        }
                    }
                    // --- PHASE 2: GOING TO CLIENT (Only after validation) ---
                    else if (order.status === OrderStatus.IN_TRANSIT) {
                        const destLat = order.destinationLat || STORE_PROFILE.lat;
                        const destLng = order.destinationLng || STORE_PROFILE.lng;
                        const move = moveTowards(nextCourierPos.lat, nextCourierPos.lng, destLat, destLng, speedStep);
                        nextCourierPos = { lat: move.lat, lng: move.lng };

                        if (move.reached) {
                            // REVERSE LOGIC: CHECK IF RETURN REQUIRED
                            if (order.isReturnRequired) {
                                nextStatus = OrderStatus.RETURNING;
                                newEvents.push({ status: OrderStatus.RETURNING, label: "Em Retorno", timestamp: new Date(), description: "Entrega realizada. Retornando para devolver itens." });
                                addLog(`PEDIDO #${order.id.slice(-4)}: ENTREGA FEITA. INICIANDO RETORNO.`);
                                setNotification({ title: "Maquininha Retornando", message: `Entregador de ${order.clientName} está voltando.` });
                            } else {
                                nextStatus = OrderStatus.DELIVERED;
                                newEvents.push({ status: OrderStatus.DELIVERED, label: "Pedido Entregue", timestamp: new Date(), description: "Corrida finalizada com sucesso." });
                                playAlert();
                                addLog(`PEDIDO #${order.id.slice(-4)}: DELIVERED.`);
                                setNotification({ title: "Entrega Finalizada", message: `Pedido de ${order.clientName} entregue!` });

                                // Return courier to pool (simulated)
                                setAvailableCouriers(prev => [...prev, { ...order.courier!, lat: destLat, lng: destLng }]);
                            }
                        }
                    }
                    // --- PHASE 3: RETURNING TO STORE (Logística Reversa) ---
                    else if (order.status === OrderStatus.RETURNING) {
                        const move = moveTowards(nextCourierPos.lat, nextCourierPos.lng, STORE_PROFILE.lat, STORE_PROFILE.lng, speedStep);
                        nextCourierPos = { lat: move.lat, lng: move.lng };

                        if (move.reached) {
                            // Stay at store, wait for manual confirmation
                            // Optional: Notification that courier arrived back
                            if (Math.random() > 0.98) {
                                addLog(`PEDIDO #${order.id.slice(-4)}: ENTREGADOR DE VOLTA NA LOJA. AGUARDANDO CONFIRMAÇÃO.`);
                            }
                        }
                    }

                    if (nextStatus !== order.status || nextCourierPos.lat !== order.courier.lat) {
                        hasUpdates = true;
                        nextOrders[idx] = {
                            ...order,
                            status: nextStatus,
                            courier: { ...order.courier, lat: nextCourierPos.lat, lng: nextCourierPos.lng },
                            events: newEvents
                        };
                    }
                });

                return hasUpdates ? nextOrders : prevOrders;
            });

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
    const renderClientsView = () => {
        const filtered = customers.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch));
        return (
            <div className="flex flex-col h-full bg-gray-50">
                <div className="p-8 pb-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Base de Clientes</h2>
                    <div className="relative max-w-xl">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente por nome ou telefone..."
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-guepardo-accent"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(customer => (
                            <div key={customer.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-xl group-hover:bg-guepardo-accent group-hover:text-white transition-colors">
                                        {customer.name.charAt(0)}
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-2xl font-bold text-gray-900">{customer.totalOrders}</span>
                                        <span className="text-[10px] text-gray-400 uppercase font-bold">Pedidos</span>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 truncate">{customer.name}</h3>
                                <p className="text-sm text-gray-500 mb-4 flex items-center gap-2"><Phone size={14} /> {customer.phone}</p>
                                <button
                                    onClick={() => setSelectedClientDetails(customer)}
                                    className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-lg text-xs uppercase tracking-wide transition-colors flex items-center justify-center gap-2 border border-gray-200"
                                >
                                    <FileText size={14} /> Ver Histórico
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // 2. HISTORY VIEW
    const renderHistoryView = () => {
        const filtered = orders.filter(o => {
            if (historyFilter === 'pending') return o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELED;
            if (historyFilter === 'completed') return o.status === OrderStatus.DELIVERED;
            return true;
        });

        return (
            <div className="flex flex-col h-full bg-white">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Histórico de Entregas</h2>
                        <p className="text-sm text-gray-500 mt-1">Total de {orders.length} solicitações registradas.</p>
                    </div>
                    <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        {['all', 'pending', 'completed'].map(f => (
                            <button
                                key={f}
                                onClick={() => setHistoryFilter(f)}
                                className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-colors ${historyFilter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                {f === 'all' ? 'Todos' : f === 'pending' ? 'Ativos' : 'Finalizados'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200">ID / Hora</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200">Cliente</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200">Endereço</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 text-right">Valor</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50 group transition-colors cursor-pointer" onClick={() => setSelectedOrderDetails(order)}>
                                    <td className="p-4">
                                        <span className="block font-mono text-xs font-bold text-gray-900">#{order.id.slice(-4)}</span>
                                        <span className="text-xs text-gray-500">{order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-bold text-gray-900">{order.clientName}</span>
                                    </td>
                                    <td className="p-4 max-w-xs truncate text-sm text-gray-600">
                                        {order.destination}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${order.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-700 border-green-200' :
                                                order.status === OrderStatus.CANCELED ? 'bg-red-100 text-red-700 border-red-200' :
                                                    order.status === OrderStatus.RETURNING ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                        'bg-blue-100 text-blue-700 border-blue-200'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-gray-900">
                                        R$ {order.estimatedPrice.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="p-2 text-gray-300 group-hover:text-guepardo-orange transition-colors">
                                            <ArrowRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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

                {/* Toast Notification */}
                {notification && (
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce">
                        <div className="bg-gray-900/95 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-gray-700 min-w-[320px]">
                            <div className="bg-guepardo-gold/20 p-2 rounded-full relative">
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
                    <DashboardTab orders={orders} totalSpent={totalSpent} customers={customers} />
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
                    />
                )}

                {currentView === 'clients' && renderClientsView()}

                {currentView === 'history' && renderHistoryView()}

            </main>

            {/* OVERLAYS & MODALS */}
            <EventLog logs={logs} onClear={() => setLogs([])} />

            <OrderDetailsModal
                order={selectedOrderDetails}
                storeProfile={STORE_PROFILE}
                onClose={() => setSelectedOrderDetails(null)}
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
