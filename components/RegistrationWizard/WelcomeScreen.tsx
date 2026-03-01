import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface WelcomeScreenProps {
    onStart: () => void;
    onLogin: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLoginSubmit = async () => {
        if (!email || !password) {
            setLoginError('Preencha todos os campos');
            return;
        }
        setIsLoading(true);
        setLoginError('');
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setLoginError('E-mail ou senha incorretos.');
            }
        } catch {
            setLoginError('Ocorreu um erro inesperado.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-full w-full flex flex-col relative overflow-hidden bg-transparent"
        >
            {/* ── WATERMARK: logo ampliado ~60%, canto superior direito, desfocado ── */}
            <div
                className="absolute -top-16 -right-24 w-[70vw] max-w-[420px] pointer-events-none select-none"
                style={{ opacity: 0.12, filter: 'blur(2px) saturate(0.6)' }}
                aria-hidden
            >
                <img
                    src="/guepardo-loading.png"
                    alt=""
                    className="w-full h-auto object-contain"
                    draggable={false}
                />
            </div>

            {/* ── Textura de grão sutil ── */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
                    mixBlendMode: 'overlay',
                    opacity: 0.5,
                }}
            />

            {/* ── Ambient glow ── */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at 50% 30%, rgba(200,80,10,0.22) 0%, transparent 65%)',
                }}
            />

            {/* ── CONTEÚDO PRINCIPAL ── */}
            <div className="relative z-10 flex flex-col min-h-screen px-6">

                {/* Hero Logo — orgânico, sem card */}
                <div className="flex flex-col items-center pt-16 pb-6">
                    <img
                        src="/cheetah-icon.png"
                        alt="Guepardo Delivery"
                        className="w-60 object-contain"
                        style={{
                            filter: 'drop-shadow(0 16px 48px rgba(200,80,10,0.65)) drop-shadow(0 4px 12px rgba(0,0,0,0.7))',
                        }}
                    />
                    <p
                        className="mt-2 text-2xl font-black uppercase tracking-wider"
                        style={{ color: 'white', textShadow: '0 2px 12px rgba(200,80,10,0.7)' }}
                    >
                        Guepardo <span style={{ color: '#FF8C28' }}>Delivery</span>
                    </p>
                    <p
                        className="text-[10px] font-bold uppercase tracking-[0.6em] mt-0.5"
                        style={{ color: 'rgba(255,190,80,0.6)' }}
                    >
                        LOJISTA
                    </p>
                </div>

                {/* Divider com brilho */}
                <div className="w-full flex items-center gap-3 mb-8">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,140,40,0.35))' }} />
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF8C28', boxShadow: '0 0 8px 2px rgba(255,140,40,0.6)' }} />
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(255,140,40,0.35))' }} />
                </div>

                {/* Headline */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                        Bem-vindo<br />
                        <span style={{ color: '#FF8C28' }}>de volta!</span>
                    </h1>
                    <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Acesse o painel do seu estabelecimento.
                    </p>
                </div>

                {/* Formulário */}
                <div className="flex flex-col gap-4">

                    {/* Campo E-mail */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            E-mail
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()}
                            placeholder="seu@email.com"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,140,40,0.15)',
                                backdropFilter: 'blur(12px)',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                                color: 'white'
                            }}
                            className="w-full h-14 rounded-2xl pl-5 pr-4 text-sm font-medium text-white placeholder-white/20 outline-none transition-all focus:border-[#FF8C28]/60"
                            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,140,40,0.6)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,140,40,0.2)')}
                        />
                    </div>

                    {/* Campo Senha */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Senha
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()}
                                placeholder="••••••••"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,140,40,0.15)',
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                                    color: 'white'
                                }}
                                className="w-full h-14 rounded-2xl pl-5 pr-14 text-sm font-medium text-white placeholder-white/20 outline-none transition-all focus:border-[#FF8C28]/60"
                                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,140,40,0.6)')}
                                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,140,40,0.2)')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                                style={{ color: 'rgba(255,255,255,0.3)' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Erro */}
                    {loginError && (
                        <div
                            className="px-4 py-3 rounded-xl text-sm font-medium text-center"
                            style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', color: '#fca5a5' }}
                        >
                            ⚠️ {loginError}
                        </div>
                    )}

                    {/* Botão Entrar */}
                    <button
                        onClick={handleLoginSubmit}
                        disabled={isLoading}
                        className="w-full h-14 rounded-2xl font-black text-white text-base uppercase tracking-widest mt-2 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, #FF7A20 0%, #E55B00 100%)',
                            boxShadow: '0 8px 32px rgba(229,91,0,0.4), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,180,80,0.3)',
                        }}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 rounded-full border-2 border-transparent border-t-white animate-spin" />
                        ) : (
                            'Entrar'
                        )}
                    </button>

                    {/* Links auxiliares */}
                    <div className="flex items-center justify-between pt-1">
                        <button
                            className="text-xs font-medium"
                            style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            Esqueceu a senha?
                        </button>
                        <button
                            onClick={onStart}
                            className="text-xs font-bold"
                            style={{ color: '#FF8C28', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            Cadastre-se agora →
                        </button>
                    </div>
                </div>

                {/* Rodapé */}
                <div className="mt-auto pt-12 pb-8 text-center">
                    <p className="text-[10px] tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>
                        © 2026 Guepardo Delivery · Todos os direitos reservados
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
