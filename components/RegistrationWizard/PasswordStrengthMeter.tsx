import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
    password: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
    const requirements = [
        { label: 'Pelo menos 8 caracteres', test: (pwd: string) => pwd.length >= 8 },
        { label: 'Pelo menos uma letra maiúscula', test: (pwd: string) => /[A-Z]/.test(pwd) },
        { label: 'Pelo menos um número', test: (pwd: string) => /\d/.test(pwd) },
        { label: 'Pelo menos um caractere especial', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
    ];

    const strength = requirements.reduce((acc, req) => (req.test(password) ? acc + 1 : acc), 0);

    const getColor = () => {
        if (strength === 0) return 'bg-gray-200';
        if (strength <= 2) return 'bg-red-500';
        if (strength === 3) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getLabel = () => {
        if (strength === 0) return '';
        if (strength <= 2) return 'Fraca';
        if (strength === 3) return 'Média';
        return 'Forte';
    }

    return (
        <div className="mt-2 space-y-2">
            <div className="flex h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ease-out ${getColor()}`}
                    style={{ width: `${(strength / 4) * 100}%` }}
                />
            </div>
            {strength > 0 && <p className={`text-xs font-semibold ${strength <= 2 ? 'text-red-400' : strength === 3 ? 'text-yellow-400' : 'text-green-400'}`}>{getLabel()}</p>}

            <ul className="text-xs space-y-1 mt-2">
                {requirements.map((req, index) => {
                    const met = req.test(password);
                    return (
                        <li key={index} className={`flex items-center gap-2 transition-colors duration-300 ${met ? 'text-green-400' : 'text-zinc-500'}`}>
                            {met ? <Check className="w-3 h-3 text-green-400" /> : <div className="w-3 h-3 rounded-full border border-zinc-700" />}
                            {req.label}
                        </li>
                    )
                })}
            </ul>
        </div>
    );
};

export default PasswordStrengthMeter;
