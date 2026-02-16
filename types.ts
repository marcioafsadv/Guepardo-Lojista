
export interface StoreSettings {
  // 1. Perfil & Operação
  openTime: string; // "08:00"
  closeTime: string; // "22:00"
  isStoreOpen: boolean;
  deliveryRadiusKm: number; // e.g., 5

  // 2. Logística & Taxas
  baseFreight: number; // e.g., 8.50
  returnFeeActive: boolean; // true/false
  prepTimeMinutes: number; // e.g., 15

  // 3. Gamificação (Metas de Pedidos)
  tierGoals: {
    bronze: number; // e.g., 3
    silver: number; // e.g., 5
    gold: number; // e.g., 10
  };

  // 4. Interface
  theme: 'light' | 'dark' | 'auto';
  alertSound: 'default' | 'roar' | 'siren';
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  TO_STORE = 'TO_STORE',
  ARRIVED_AT_STORE = 'ARRIVED_AT_STORE', // Step 2.1: Courier arrived at store
  READY_FOR_PICKUP = 'READY_FOR_PICKUP', // Step 2.5: Merchant marked as ready
  IN_TRANSIT = 'IN_TRANSIT', // Step 4: Code validated, dispatched
  RETURNING = 'RETURNING', // Step 5: Returning to store (Logistics Reverse)
  DELIVERED = 'DELIVERED', // Final Step: Finished (either at client or back at store)
  CANCELED = 'CANCELED'
}

export interface Courier {
  id: string;
  name: string;
  photoUrl: string;
  vehiclePlate: string;
  phone: string;
  lat: number;
  lng: number;
}

export interface OrderEvent {
  status: OrderStatus;
  label: string;
  timestamp: Date;
  description?: string;
}

export interface Order {
  id: string;
  clientName: string;
  clientPhone?: string; // New field for CRM
  destination: string; // Full concatenated string for display

  // Detailed Address Fields for Audit
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressNeighborhood: string;
  addressCity: string;

  deliveryValue: number;
  paymentMethod: 'PIX' | 'CARD' | 'CASH'; // New Field
  changeFor: number | null; // Troco para

  status: OrderStatus;
  createdAt: Date;
  courier?: Courier;
  estimatedPrice: number;
  distanceKm: number;
  // New fields for Maps
  destinationLat?: number;
  destinationLng?: number;

  pickupCode: string; // The security code for validation
  cancellationReason?: string; // Reason for cancellation
  storeArrivalTimestamp?: Date; // When courier arrived at store

  // Tracking
  trackingToken?: string; // UUID for public tracking link


  // Logistics
  isReturnRequired?: boolean; // If courier must return to store (e.g. Card Machine)
  returnFee?: number; // The extra cost for the return trip

  // Timeline history
  events: OrderEvent[];

  // Simulation Data (Routing)
  simulationRoute?: { lat: number; lng: number }[]; // Array of coordinates for the current path
  simulationStep?: number; // Current index in the route array
  simulationTotalSteps?: number; // Total steps calculated for the duration
}

export interface SavedAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  cep: string;
  lastUsed: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date;
  averageWaitTime: number; // In minutes (avg time courier waits at gate)
  addresses: SavedAddress[];
  notes?: string; // Permanent notes like "Defective intercom"
}

export interface Stats {
  totalOrders: number;
  totalSpent: number;
}

export interface StoreProfile {
  name: string;
  address: string;
  lat: number;
  lng: number;
}
