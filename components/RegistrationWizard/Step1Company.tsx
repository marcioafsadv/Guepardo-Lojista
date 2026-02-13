import React from 'react';
import { StepProps } from './types';
import { formatCNPJ, formatPhone, validateCNPJ } from '../../utils/validation';

const Step1Company: React.FC<StepProps> = ({ formData, updateFormData, nextStep, errors, setErrors }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'cnpj') {
            formattedValue = formatCNPJ(value);
        } else if (name === 'telefone') {
            formattedValue = formatPhone(value);
        }

        updateFormData({ [name]: formattedValue });

        // Clear error when user types
        if (setErrors && errors?.[name as keyof typeof errors]) {
            setErrors({ ...errors, [name]: undefined });
        }
    };

    const handleNext = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.cnpj) newErrors.cnpj = 'CNPJ é obrigatório';
        else if (!validateCNPJ(formData.cnpj)) newErrors.cnpj = 'CNPJ inválido';

        if (!formData.razaoSocial) newErrors.razaoSocial = 'Razão Social é obrigatória';
        if (!formData.nomeFantasia) newErrors.nomeFantasia = 'Nome Fantasia é obrigatório';
        if (!formData.telefone) newErrors.telefone = 'Telefone é obrigatório';

        if (Object.keys(newErrors).length > 0) {
            if (setErrors) setErrors(newErrors);
            return;
        }

        nextStep();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#1A1A1A]">Dados da Empresa</h2>
                <p className="text-gray-500">Comece informando os dados principais do seu negócio.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">CNPJ</label>
                    <input
                        type="text"
                        name="cnpj"
                        value={formData.cnpj}
                        onChange={handleChange}
                        placeholder="00.000.000/0000-00"
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.cnpj ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        maxLength={18}
                    />
                    {errors?.cnpj && <p className="text-red-500 text-sm mt-1">{errors.cnpj}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Razão Social</label>
                    <input
                        type="text"
                        name="razaoSocial"
                        value={formData.razaoSocial}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.razaoSocial ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    />
                    {errors?.razaoSocial && <p className="text-red-500 text-sm mt-1">{errors.razaoSocial}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Nome Fantasia</label>
                    <input
                        type="text"
                        name="nomeFantasia"
                        value={formData.nomeFantasia}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.nomeFantasia ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    />
                    {errors?.nomeFantasia && <p className="text-red-500 text-sm mt-1">{errors.nomeFantasia}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Telefone</label>
                    <input
                        type="text"
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleChange}
                        placeholder="(00) 00000-0000"
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.telefone ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        maxLength={15}
                    />
                    {errors?.telefone && <p className="text-red-500 text-sm mt-1">{errors.telefone}</p>}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleNext}
                    className="bg-[#FF6B00] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#e56000] transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    Próximo
                </button>
            </div>
        </div>
    );
};

export default Step1Company;
