import React, { useEffect, useState } from 'react';

export const SplashScreen: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2c1a0a 50%, #e67e22 100%)',
            }}>

            {/* Overlay de Brilho Dinâmico */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle at center, rgba(230, 126, 34, 0.4) 0%, transparent 70%)'
                }} />

            <div className="relative flex flex-col items-center animate-in fade-in zoom-in duration-700">

                {/* Container da Logo com Efeito Glossy */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-orange-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse"></div>

                    <div className="relative bg-black/40 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
                        <img
                            src="/guepardo-logo-v2.jpg"
                            alt="Guepardo Delivery"
                            className="h-48 md:h-64 object-contain rounded-lg shadow-inner"
                            style={{
                                filter: 'drop-shadow(0 0 15px rgba(230, 126, 34, 0.3))'
                            }}
                        />
                    </div>
                </div>

                {/* Barra de Carregamento Premium */}
                <div className="mt-12 w-64 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                    <div className="h-full bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600 animate-[loading-bar_3s_ease-in-out_forwards]" />
                </div>

                {/* Texto de Boas-vindas Subliminar */}
                <div className="mt-6 text-white/40 text-xs font-light tracking-[0.5em] uppercase animate-pulse">
                    Acelerando sua entrega
                </div>
            </div>

            <style>{`
        @keyframes loading-bar {
          0% { width: 0%; transform: translateX(-100%); }
          20% { width: 30%; transform: translateX(0); }
          50% { width: 60%; }
          100% { width: 100%; }
        }
      `}</style>
        </div>
    );
};
