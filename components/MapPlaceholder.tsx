import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface MapPlaceholderProps {
  status?: string;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({ status }) => {
  return (
    <div className="w-full h-full bg-gray-200 rounded-xl overflow-hidden relative border border-gray-300 shadow-inner group">
      {/* Fake Map Grid */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}>
      </div>

      {/* Fake Streets */}
      <div className="absolute top-1/2 left-0 w-full h-4 bg-white/60 -translate-y-1/2 transform rotate-12"></div>
      <div className="absolute top-0 left-1/3 w-4 h-full bg-white/60 -translate-x-1/2 transform -rotate-12"></div>

      {/* Store Marker */}
      <div className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
        <div className="w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center animate-pulse">
          <div className="w-3 h-3 bg-white rounded-full"></div>
        </div>
        <span className="mt-1 text-xs font-bold bg-white px-2 py-0.5 rounded shadow text-gray-800">Sua Loja</span>
      </div>

      {/* Courier Marker (Simulated position based on status) */}
      {(status && status !== 'PENDING' && status !== 'CANCELED') && (
        <div className="absolute top-[40%] left-[60%] transform flex flex-col items-center transition-all duration-1000 z-20">
          <div className="w-10 h-10 bg-gradient-to-br from-guepardo-accent to-guepardo-orange rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white">
            <Navigation size={20} fill="currentColor" />
          </div>
          <span className="mt-1 text-xs font-bold bg-guepardo-gray-900 text-guepardo-accent px-2 py-0.5 rounded shadow">Guepardo</span>
        </div>
      )}

      {/* Destination Marker */}
      {(status && status !== 'PENDING') && (
        <div className="absolute top-[20%] left-[70%] transform flex flex-col items-center z-10">
          <MapPin size={32} className="text-guepardo-rust fill-current drop-shadow-lg" />
          <span className="mt-1 text-xs font-bold bg-white px-2 py-0.5 rounded shadow text-gray-800">Destino</span>
        </div>
      )}

      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded text-[10px] text-gray-500 font-medium z-10">
        Guepardo Maps (OSM)
      </div>
    </div>
  );
};