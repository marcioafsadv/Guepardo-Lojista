import React from 'react';
import { StepProps } from './types';
import { formatCNPJ, formatCPF, formatPhone, validateCNPJ, validateCPF } from '../../utils/validation';

const Step1Company: React.FC<StepProps> = ({ formData, updateFormData, nextStep, errors, setErrors }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'cnpj') {
            formattedValue = formData.tipoPessoa === 'PJ' ? formatCNPJ(value) : formatCPF(value);
        } else if (name === 'telefone') {
            formattedValue = formatPhone(value);
        }

        updateFormData({ [name]: formattedValue });

        // Clear error when user types
        if (setErrors && errors?.[name as keyof typeof errors]) {
            setErrors({ ...errors, [name]: undefined });
        }
    };

    const setTipoPessoa = (tipo: 'PF' | 'PJ') => {
        updateFormData({ tipoPessoa: tipo, cnpj: '' });
        if (setErrors) {
            setErrors({ ...errors, cnpj: undefined, razaoSocial: undefined });
        }
    };

    const handleNext = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.cnpj) {
            newErrors.cnpj = formData.tipoPessoa === 'PJ' ? 'CNPJ é obrigatório' : 'CPF é obrigatório';
        } else {
            const isValid = formData.tipoPessoa === 'PJ' ? validateCNPJ(formData.cnpj) : validateCPF(formData.cnpj);
            if (!isValid) {
                newErrors.cnpj = formData.tipoPessoa === 'PJ' ? 'CNPJ inválido' : 'CPF inválido';
            }
        }

        if (!formData.razaoSocial) {
            newErrors.razaoSocial = formData.tipoPessoa === 'PJ' ? 'Razão Social é obrigatória' : 'Nome Completo é obrigatório';
        }
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
                <h2 className="text-2xl font-bold text-white">Dados da Empresa</h2>
                <p className="text-zinc-400">Comece informando os dados principais do seu negócio.</p>
            </div>

            <div className="space-y-4">
                <div className="flex bg-zinc-800/40 p-1 rounded-xl w-fit border border-white/5">
                    <button
                        onClick={() => setTipoPessoa('PJ')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${formData.tipoPessoa === 'PJ'
                            ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/20'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        Pessoa Jurídica
                    </button>
                    <button
                        onClick={() => setTipoPessoa('PF')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${formData.tipoPessoa === 'PF'
                            ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/20'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        Pessoa Física
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                        {formData.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'}
                    </label>
                    <input
                        type="text"
                        name="cnpj"
                        value={formData.cnpj}
                        onChange={handleChange}
                        placeholder={formData.tipoPessoa === 'PJ' ? "00.000.000/0000-00" : "000.000.000-00"}
                        className={`w-full p-3 bg-zinc-900/40 border rounded-lg text-white placeholder-zinc-600 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.cnpj ? 'border-red-500/50 bg-red-500/10' : 'border-zinc-700'}`}
                        maxLength={formData.tipoPessoa === 'PJ' ? 18 : 14}
                    />
                    {errors?.cnpj && <p className="text-red-400 text-sm mt-1">{errors.cnpj}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                        {formData.tipoPessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'}
                    </label>
                    <input
                        type="text"
                        name="razaoSocial"
                        value={formData.razaoSocial}
                        onChange={handleChange}
                        className={`w-full p-3 bg-zinc-900/40 border rounded-lg text-white placeholder-zinc-600 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.razaoSocial ? 'border-red-500/50 bg-red-500/10' : 'border-zinc-700'}`}
                    />
                    {errors?.razaoSocial && <p className="text-red-400 text-sm mt-1">{errors.razaoSocial}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Nome Fantasia</label>
                    <input
                        type="text"
                        name="nomeFantasia"
                        value={formData.nomeFantasia}
                        onChange={handleChange}
                        className={`w-full p-3 bg-zinc-900/40 border rounded-lg text-white placeholder-zinc-600 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.nomeFantasia ? 'border-red-500/50 bg-red-500/10' : 'border-zinc-700'}`}
                    />
                    {errors?.nomeFantasia && <p className="text-red-400 text-sm mt-1">{errors.nomeFantasia}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Telefone</label>
                    <input
                        type="text"
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleChange}
                        placeholder="(00) 00000-0000"
                        className={`w-full p-3 bg-zinc-900/40 border rounded-lg text-white placeholder-zinc-600 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.telefone ? 'border-red-500/50 bg-red-500/10' : 'border-zinc-700'}`}
                        maxLength={15}
                    />
                    {errors?.telefone && <p className="text-red-400 text-sm mt-1">{errors.telefone}</p>}
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
