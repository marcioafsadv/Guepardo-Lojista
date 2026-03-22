import React from 'react';
import { Store, Clock, ShieldCheck, LogOut, Phone } from 'lucide-react';

interface AwaitingApprovalProps {
    onLogout: () => void;
    storeName?: string;
    status?: 'pending' | 'rejected';
    notes?: string;
}

const AwaitingApproval: React.FC<AwaitingApprovalProps> = ({ 
    onLogout, 
    storeName = "sua loja", 
    status = 'pending',
    notes
}) => {
    return (
        <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-6 font-sans text-white">
            <div className="max-w-md w-full relative">
                {/* Background Glow */}
                <div className="absolute -inset-4 bg-[#FF6B00]/10 rounded-[3rem] blur-3xl" />
                
                <div className="relative bg-[#141415] border border-white/5 rounded-[2.5rem] p-10 text-center shadow-2xl backdrop-blur-xl">
                    {/* Icon */}
                    <div className="mb-8 relative inline-block">
                        <div className="absolute -inset-4 bg-brand-gradient rounded-full blur-xl opacity-20 animate-pulse" />
                        <div className={`w-24 h-24 rounded-3xl ${status === 'rejected' ? 'bg-red-500/10 border-red-500/20' : 'bg-[#FF6B00]/10 border-[#FF6B00]/20'} border-2 flex items-center justify-center relative overflow-hidden`}>
                            {status === 'rejected' ? (
                                <ShieldCheck className="w-12 h-12 text-red-500 opacity-50" />
                            ) : (
                                <Clock className="w-12 h-12 text-[#FF6B00] animate-spin-slow" />
                            )}
                            <Store className="absolute -right-2 -bottom-2 w-12 h-12 text-white/5 rotate-12" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-black text-white tracking-tight mb-4 leading-tight">
                        {status === 'rejected' ? 'Cadastro Não Aprovado' : 'Quase lá, Guepardo!'}
                    </h1>
                    
                    <p className="text-[#A8A29E] text-base font-medium leading-relaxed mb-8">
                        {status === 'rejected' ? (
                            <>Infelizmente seu cadastro para <strong>{storeName}</strong> não pôde ser aprovado neste momento.</>
                        ) : (
                            <>Analisamos todos os detalhes da <strong>{storeName}</strong> para garantir a melhor experiência na nossa rede. Em breve você terá acesso total!</>
                        )}
                    </p>

                    {status === 'rejected' && notes && (
                        <div className="mb-8 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-left">
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1">Motivo da Recusa:</span>
                            <p className="text-red-200/70 text-sm font-medium italic">"{notes}"</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4 text-left">
                            <div className="p-2 bg-[#FF6B00]/10 text-[#FF6B00] rounded-xl border border-[#FF6B00]/20">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest leading-none mb-1">Status do Registro</p>
                                <p className="text-white text-sm font-bold">
                                    {status === 'rejected' ? 'Vistoria Recusada' : 'Vistoria em Andamento'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                                className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-[#A8A29E] hover:text-white text-[11px] transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                            >
                                <Phone className="w-4 h-4" /> Suporte
                            </button>
                            <button 
                                onClick={onLogout}
                                className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-[#A8A29E] hover:text-white text-[11px] transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                            >
                                <LogOut className="w-4 h-4" /> Sair
                            </button>
                        </div>
                    </div>

                    <div className="mt-10 flex items-center justify-center gap-2 opacity-50">
                        <div className="w-1 h-1 bg-[#FF6B00] rounded-full animate-ping" />
                        <span className="text-[9px] font-black text-[#FF6B00] uppercase tracking-[0.3em]">Guepardo Delivery</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default AwaitingApproval;
