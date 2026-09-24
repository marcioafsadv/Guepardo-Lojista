
import React from 'react';
import { Order, StoreProfile, Courier } from '../types';
import { X } from 'lucide-react';
import { OrderServiceDetail } from './OrderServiceDetail';

interface OrderDetailsModalProps {
  order: Order | null;
  storeProfile: StoreProfile;
  onClose: () => void;
  onAcceptIFoodOrder?: (orderId: string) => void;
  onAccept99FoodOrder?: (orderId: string) => void;
  theme?: string;
  availableCouriers?: Courier[];
  onDirectAssignCourier?: (order: Order, courierId: string) => Promise<void>;
  onBulkAssign?: (orderIds: string[], courierId: string) => Promise<void> | void;
  onCancelClick?: (order: Order) => void;
  onConfirmReturn?: (orderId: string) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ 
  order, 
  storeProfile, 
  onClose, 
  onAcceptIFoodOrder, 
  onAccept99FoodOrder, 
  theme = 'dark',
  availableCouriers = [],
  onDirectAssignCourier,
  onBulkAssign,
  onCancelClick,
  onConfirmReturn
}) => {
  if (!order) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-end sm:justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity">
      <div
        className={`w-full h-full sm:h-[85vh] sm:max-w-xl sm:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in slide-in-from-right sm:slide-in-from-bottom duration-500 relative border ${isDark ? 'bg-[#0D0500] border-white/10' : 'bg-white border-gray-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <OrderServiceDetail
          order={order}
          storeProfile={storeProfile}
          isEmbedded={true}
          onClose={onClose}
          onAcceptIFoodOrder={onAcceptIFoodOrder}
          onAccept99FoodOrder={onAccept99FoodOrder}
          theme={theme}
          availableCouriers={availableCouriers}
          onDirectAssignCourier={onDirectAssignCourier}
          onBulkAssign={onBulkAssign}
          onCancelClick={onCancelClick}
          onConfirmReturn={onConfirmReturn}
        />
      </div>
    </div>
  );
};
