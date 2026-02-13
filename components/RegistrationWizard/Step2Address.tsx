import React, { useState } from 'react';
import { StepProps } from './types';
import { formatCEP } from '../../utils/validation';
import { Loader2 } from 'lucide-react';

const Step2Address: React.FC<StepProps> = ({ formData, updateFormData, nextStep, prevStep, errors, setErrors }) => {
    const [loadingCep, setLoadingCep] = useState(false);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'cep') {
            formattedValue = formatCEP(value);

            // Auto-fetch address when CEP is complete
            if (formattedValue.length === 9) {
                fetchAddress(formattedValue);
            }
        }

        updateFormData({ [name]: formattedValue });

        if (setErrors && errors?.[name as keyof typeof errors]) {
            setErrors({ ...errors, [name]: undefined });
        }
    };

    const fetchAddress = async (cep: string) => {
        try {
            setLoadingCep(true);
            const cleanCep = cep.replace(/\D/g, '');
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                updateFormData({
                    rua: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.localidade,
                    estado: data.uf,
                    cep: cep // ensure cep is kept
                });
                // focus on number field logic could go here
            } else {
                if (setErrors) setErrors({ ...errors, cep: 'CEP não encontrado' });
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            if (setErrors) setErrors({ ...errors, cep: 'Erro ao buscar CEP' });
        } finally {
            setLoadingCep(false);
        }
    };

    const handleNext = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.cep) newErrors.cep = 'CEP é obrigatório';
        if (!formData.rua) newErrors.rua = 'Rua é obrigatória';
        if (!formData.numero) newErrors.numero = 'Número é obrigatório';
        if (!formData.bairro) newErrors.bairro = 'Bairro é obrigatório';
        if (!formData.cidade) newErrors.cidade = 'Cidade é obrigatória';
        if (!formData.estado) newErrors.estado = 'Estado é obrigatório';

        if (Object.keys(newErrors).length > 0) {
            if (setErrors) setErrors(newErrors);
            return;
        }

        nextStep();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#1A1A1A]">Endereço</h2>
                <p className="text-gray-500">Onde sua loja está localizada?</p>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">CEP</label>
                        <div className="relative">
                            <input
                                type="text"
                                name="cep"
                                value={formData.cep}
                                onChange={handleChange}
                                placeholder="00000-000"
                                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.cep ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                                maxLength={9}
                            />
                            {loadingCep && (
                                <div className="absolute right-3 top-3.5 text-[#FF6B00]">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                </div>
                            )}
                        </div>
                        {errors?.cep && <p className="text-red-500 text-sm mt-1">{errors.cep}</p>}
                    </div>
                    {/* Espaço vazio para alinhar ou pode colocar outro campo se quiser */}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Rua</label>
                        <input
                            type="text"
                            name="rua"
                            value={formData.rua}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.rua ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                        {errors?.rua && <p className="text-red-500 text-sm mt-1">{errors.rua}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Número</label>
                        <input
                            type="text"
                            name="numero"
                            value={formData.numero}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.numero ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                        {errors?.numero && <p className="text-red-500 text-sm mt-1">{errors.numero}</p>}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Complemento</label>
                    <input
                        type="text"
                        name="complemento"
                        value={formData.complemento}
                        onChange={handleChange}
                        placeholder="Apto, Sala, Bloco..."
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Bairro</label>
                    <input
                        type="text"
                        name="bairro"
                        value={formData.bairro}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.bairro ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    />
                    {errors?.bairro && <p className="text-red-500 text-sm mt-1">{errors.bairro}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Cidade</label>
                        <input
                            type="text"
                            name="cidade"
                            value={formData.cidade}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all ${errors?.cidade ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                        {errors?.cidade && <p className="text-red-500 text-sm mt-1">{errors.cidade}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">UF</label>
                        <input
                            type="text"
                            name="estado"
                            value={formData.estado}
                            onChange={handleChange}
                            maxLength={2}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] outline-none transition-all uppercase ${errors?.estado ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                        {errors?.estado && <p className="text-red-500 text-sm mt-1">{errors.estado}</p>}
                    </div>
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
                    Próximo
                </button>
            </div>
        </div>
    );
};

export default Step2Address;
