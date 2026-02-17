import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Courier, Order, OrderStatus, StoreProfile } from '../types';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { Crosshair, Plus, Minus } from 'lucide-react';

interface LiveMapProps {
    store: StoreProfile;
    activeOrder: Order | null;
    filteredOrders?: Order[];
    availableCouriers?: Courier[];
    onCourierLocationUpdate?: (lat: number, lng: number) => void;
    theme?: string;
}

const containerStyle = {
    width: '100%',
    height: '100%'
};

const LIBRARIES: ("places" | "geometry")[] = ["geometry"];

// --- MAP STYLES ---
const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#746855" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1f2835" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }],
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }],
    },
    {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
    }
];

export const LiveMap: React.FC<LiveMapProps> = ({ store, activeOrder, filteredOrders = [], availableCouriers = [], theme = 'dark' }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "AIzaSyBIttodmc3z2FrmG4rBFgD_Xct7UYt43es",
        libraries: LIBRARIES
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedMarker, setSelectedMarker] = useState<any>(null);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    // --- EFFECTS ---

    // Fit Bounds when active order changes
    useEffect(() => {
        if (map && activeOrder && activeOrder.courier && activeOrder.destinationLat && activeOrder.destinationLng) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: activeOrder.courier.lat, lng: activeOrder.courier.lng });
            bounds.extend({ lat: activeOrder.destinationLat, lng: activeOrder.destinationLng });
            bounds.extend({ lat: store.lat, lng: store.lng }); // Include store
            map.fitBounds(bounds, 50);
        } else if (map) {
            // If no active order, perform a simpler recenter or bounds fit
            // Maybe fit bounds of all filtered orders?
        }
    }, [map, activeOrder]);


    // Styles
    const mapOptions = useMemo(() => ({
        disableDefaultUI: true,
        styles: (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) ? darkMapStyle : []
    }), [theme]);


    if (!isLoaded) return <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">Carregando Mapa...</div>;

    // --- RENDER HELPERS ---

    const getPinColor = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING: return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
            case OrderStatus.DELIVERED: return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
            case OrderStatus.RETURNING: return 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
            default: return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
        }
    };

    return (
        <div className="w-full h-full relative group bg-gray-100">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={{ lat: store.lat, lng: store.lng }}
                zoom={14}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={mapOptions}
            >
                {/* STORE MARKER */}
                <Marker
                    position={{ lat: store.lat, lng: store.lng }}
                    icon={{
                        url: 'https://cdn-icons-png.flaticon.com/512/3595/3595587.png', // Temporary Store Icon or use SVG
                        scaledSize: new google.maps.Size(40, 40)
                    }}
                    zIndex={1000}
                />

                {/* AVAILABLE COURIERS */}
                {availableCouriers.map(courier => (
                    <Marker
                        key={`courier-${courier.id}`}
                        position={{ lat: courier.lat, lng: courier.lng }}
                        icon={{
                            url: '/cheetah-scooter.png',
                            scaledSize: new google.maps.Size(60, 60),
                            anchor: new google.maps.Point(30, 60)
                        }}
                        onClick={() => setSelectedMarker({ type: 'courier', data: courier })}
                    />
                ))}

                {/* ORDER PINS */}
                {filteredOrders.map((order, index) => (
                    (order.destinationLat && order.destinationLng) && (
                        <Marker
                            key={`order-${order.id}`}
                            position={{ lat: order.destinationLat, lng: order.destinationLng }}
                            label={{
                                text: (index + 1).toString(),
                                color: "white",
                                fontWeight: "bold"
                            }}
                            icon={getPinColor(order.status)}
                            onClick={() => setSelectedMarker({ type: 'order', data: order })}
                        />
                    )
                ))}

                {/* ACTIVE ORDER ROUTE */}
                {activeOrder && activeOrder.courier && activeOrder.destinationLat && activeOrder.destinationLng && (
                    <>
                        <Polyline
                            path={[
                                { lat: activeOrder.courier.lat, lng: activeOrder.courier.lng },
                                { lat: activeOrder.status === OrderStatus.RETURNING ? store.lat : activeOrder.destinationLat, lng: activeOrder.status === OrderStatus.RETURNING ? store.lng : activeOrder.destinationLng }
                            ]}
                            options={{
                                strokeColor: activeOrder.status === OrderStatus.RETURNING ? '#9333ea' : '#3B82F6',
                                strokeOpacity: 0.8,
                                strokeWeight: 4,
                                geodesic: true,
                                icons: [{
                                    icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                                    offset: '100%'
                                }]
                            }}
                        />
                        {/* Active Courier Marker (Override availability if needed, but usually redundant if in list) */}
                        <Marker
                            position={{ lat: activeOrder.courier.lat, lng: activeOrder.courier.lng }}
                            icon={{
                                url: '/cheetah-scooter.png',
                                scaledSize: new google.maps.Size(80, 80), // Larger
                                anchor: new google.maps.Point(40, 80)
                            }}
                            zIndex={2000}
                        />
                    </>
                )}


                {/* INFO WINDOW */}
                {selectedMarker && (
                    <InfoWindow
                        position={
                            selectedMarker.type === 'order'
                                ? { lat: selectedMarker.data.destinationLat, lng: selectedMarker.data.destinationLng }
                                : { lat: selectedMarker.data.lat, lng: selectedMarker.data.lng }
                        }
                        onCloseClick={() => setSelectedMarker(null)}
                    >
                        <div className="p-2 text-black">
                            {selectedMarker.type === 'order' ? (
                                <>
                                    <h3 className="font-bold">Pedido #{selectedMarker.data.id.slice(-4)}</h3>
                                    <p>{selectedMarker.data.clientName}</p>
                                    <p className="text-sm text-gray-600">{selectedMarker.data.status}</p>
                                </>
                            ) : (
                                <>
                                    <h3 className="font-bold">{selectedMarker.data.name}</h3>
                                    <p className="text-sm">{selectedMarker.data.vehiclePlate}</p>
                                </>
                            )}
                        </div>
                    </InfoWindow>
                )}

            </GoogleMap>

            {/* AVAILABLE COURIERS BADGE */}
            <div className="absolute top-4 right-4 z-[10] bg-guepardo-gray-800/90 backdrop-blur px-3 py-2 rounded-xl shadow-lg border border-white/10 flex items-center gap-3 transition-all hover:bg-guepardo-gray-800 group">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-guepardo-gray-900 text-status-green border border-white/5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v4Z" /><path d="M5 16h-.5A2.5 2.5 0 0 1 2 13.5V11h3" /><path d="M19 14h2.5A2.5 2.5 0 0 0 24 11.5V10h-5" /><circle cx="5.5" cy="16.5" r="3.5" /><circle cx="18.5" cy="16.5" r="3.5" /><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    <div className="absolute top-0 right-0 -mr-1 -mt-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase leading-none tracking-wide group-hover:text-guepardo-accent transition-colors">Disponíveis</span>
                    <span className="text-sm font-bold text-white leading-none mt-1">{availableCouriers.length} entregadores</span>
                </div>
            </div>

            {/* CONTROLS */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-[10]">
                <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col overflow-hidden">
                    <button
                        onClick={() => map?.setZoom((map.getZoom() || 14) + 1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 text-gray-600 border-b border-gray-100 transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                    <button
                        onClick={() => map?.setZoom((map.getZoom() || 14) - 1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                        <Minus size={18} />
                    </button>
                </div>
                <button
                    onClick={() => {
                        if (activeOrder && activeOrder.destinationLat) {
                            map?.panTo({ lat: activeOrder.destinationLat, lng: activeOrder.destinationLng });
                            map?.setZoom(16);
                        } else {
                            map?.panTo({ lat: store.lat, lng: store.lng });
                            map?.setZoom(15);
                        }
                    }}
                    className="w-9 h-9 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-blue-600 transition-colors"
                >
                    <Crosshair size={18} />
                </button>
            </div>
        </div>
    );
};
