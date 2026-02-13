
import React from 'react';
import { Order, StoreProfile } from '../types';
import { X } from 'lucide-react';
import { OrderServiceDetail } from './OrderServiceDetail';

interface OrderDetailsModalProps {
  order: Order | null;
  storeProfile: StoreProfile;
  onClose: () => void;
  theme?: string;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, storeProfile, onClose, theme = 'dark' }) => {
  if (!order) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-end sm:justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity">
      <div
        className={`w-full h-full sm:h-[85vh] sm:max-w-xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right sm:slide-in-from-bottom duration-300 relative border ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <OrderServiceDetail
          order={order}
          storeProfile={storeProfile}
          isEmbedded={true}
          onClose={onClose}
          theme={theme}
        />
      </div>
    </div>
  );
};
