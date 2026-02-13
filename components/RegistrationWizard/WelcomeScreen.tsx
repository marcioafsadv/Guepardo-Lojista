import React, { useState } from 'react';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface WelcomeScreenProps {
    onStart: () => void;
    onLogin: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onLogin }) => {
    // Only Login View is needed now
    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');

    const handleLoginSubmit = () => {
        if (!email || !password) {
            setLoginError('Preencha todos os campos');
            return;
        }
        // Mock Login Success
        localStorage.setItem('guepardo_user', JSON.stringify({ email, name: 'Usuário Teste' }));
        window.location.reload();
    };

    return (
        <div className="min-h-screen flex items-center justify-center font-sans bg-gradient-to-br from-gray-900 via-[#1a1a1a] to-[#FF6B00]/90 relative overflow-hidden p-4">

            {/* Background Decor */}
            <div className="absolute top-[-20%] left-[-20%] w-[50rem] h-[50rem] bg-[#FF6B00]/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[50rem] h-[50rem] bg-[#FF6B00]/10 rounded-full blur-[120px] mix-blend-screen animate-pulse delay-700 pointer-events-none"></div>

            {/* Main Glassmorphism Card */}
            <div className="w-full max-w-[450px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10 relative z-10 transition-all duration-500">

                {/* Header: Logo & Title */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="relative group mb-6">
                        <div className="absolute -inset-4 bg-[#FF6B00]/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <img
                            src="/cheetah-scooter.png"
                            alt="Guepardo Delivery"
                            className="w-40 object-contain relative z-10 drop-shadow-lg transform hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Bem-vindo
                    </h1>
                    <p className="text-gray-300 mt-2 text-sm">
                        Acesse a plataforma para continuar.
                    </p>
                </div>

                {/* Form Area */}
                <div className="space-y-5">

                    <div className="relative group">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-900/40 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all"
                            placeholder="Seu melhor e-mail"
                        />
                        <Mail className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-[#FF6B00] transition-colors" />
                    </div>

                    <div className="relative group">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-4 bg-gray-900/40 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all"
                            placeholder="Sua senha secreta"
                        />
                        <Lock className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-[#FF6B00] transition-colors" />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white focus:outline-none transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {loginError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm font-medium flex items-center justify-center animate-pulse">
                            <span className="mr-2">⚠️</span> {loginError}
                        </div>
                    )}

                    {/* ACTION BUTTONS */}
                    <button
                        onClick={handleLoginSubmit}
                        className="w-full py-4 bg-[#FF6B00] hover:bg-[#E65100] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-orange-500/20 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] mt-6"
                    >
                        Entrar na Plataforma
                    </button>

                    <div className="flex items-center justify-between mt-6 px-1">
                        <button
                            className="text-sm text-gray-400 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer"
                        >
                            Esqueceu a senha?
                        </button>

                        <button
                            onClick={onStart}
                            className="text-sm text-[#FF6B00] font-semibold hover:text-orange-400 transition-colors bg-transparent border-none p-0 cursor-pointer hover:underline decoration-[#FF6B00] underline-offset-4"
                        >
                            Cadastre-se agora mesmo
                        </button>
                    </div>

                </div>
            </div>

            {/* Footer Copyright */}
            <div className="absolute bottom-4 w-full text-center text-xs text-white/20 font-light tracking-wide">
                &copy; 2026 Guepardo Delivery. Todos os direitos reservados.
            </div>

        </div>
    );
};

export default WelcomeScreen;
