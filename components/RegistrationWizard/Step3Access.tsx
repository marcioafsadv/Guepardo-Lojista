import React from 'react';
import { StepProps } from './types';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { Eye, EyeOff } from 'lucide-react';

const Step3Access: React.FC<StepProps> = ({ formData, updateFormData, nextStep, prevStep, errors, setErrors }) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        updateFormData({ [name]: value });

        if (setErrors && errors?.[name as keyof typeof errors]) {
            setErrors({ ...errors, [name]: undefined });
        }
    };

    const handleNext = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.nomeResponsavel) newErrors.nomeResponsavel = 'Nome do responsável é obrigatório';
        if (!formData.email) newErrors.email = 'Email é obrigatório';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';

        if (!formData.senha) newErrors.senha = 'Senha é obrigatória';
        if (formData.senha.length < 8) newErrors.senha = 'A senha deve ter pelo menos 8 caracteres';

        if (formData.senha !== formData.confirmarSenha) {
            newErrors.confirmarSenha = 'As senhas não coincidem';
        }

        if (Object.keys(newErrors).length > 0) {
            if (setErrors) setErrors(newErrors);
            return;
        }

        nextStep();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#1A1A1A]">Acesso e Segurança</h2>
                <p className="text-gray-500">Defina quem será o administrador da conta.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Nome do Responsável</label>
                    <input
                        type="text"
                        name="nomeResponsavel"
                        value={formData.nomeResponsavel}
                        onChange={handleChange}
                        placeholder="Nome completo"
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.nomeResponsavel ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    />
                    {errors?.nomeResponsavel && <p className="text-red-500 text-sm mt-1">{errors.nomeResponsavel}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="seu@email.com"
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.email ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    />
                    {errors?.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Senha</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="senha"
                            value={formData.senha}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all pr-10 ${errors?.senha ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    {errors?.senha && <p className="text-red-500 text-sm mt-1">{errors.senha}</p>}
                    <PasswordStrengthMeter password={formData.senha} />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Confirmar Senha</label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmarSenha"
                            value={formData.confirmarSenha}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all pr-10 ${errors?.confirmarSenha ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                        >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    {errors?.confirmarSenha && <p className="text-red-500 text-sm mt-1">{errors.confirmarSenha}</p>}
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <button
                    onClick={prevStep}
                    className="text-gray-500 font-semibold px-6 py-3 hover:text-[#1A1A1A] transition-colors"
                >
                    Voltar
                </button>
                <button
                    onClick={handleNext}
                    className="bg-[#FF6B00] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#e56000] transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    Finalizar Cadastro
                </button>
            </div>
        </div>
    );
};

export default Step3Access;
