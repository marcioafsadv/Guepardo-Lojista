import React from 'react';
import { StepProps } from './types';
import { formatCNPJ, formatCPF, formatPhone, validateCNPJ, validateCPF } from '../../utils/validation';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

const UploadSlot: React.FC<{
    file?: File;
    onUpload: (file: File) => void;
    onRemove: () => void;
    label: string;
}> = ({ file, onUpload, onRemove, label }) => {
    const isPDF = file?.type === 'application/pdf';
    
    return (
        <div className={`relative group w-full h-32 rounded-2xl border-2 border-dashed transition-all duration-300 flex items-center justify-center overflow-hidden
            ${file ? 'border-[#FF6B00] bg-[#FF6B00]/5' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40'}`}>
            {file ? (
                <>
                    {isPDF ? (
                        <div className="flex flex-col items-center justify-center text-zinc-400">
                            <Upload size={24} className="mb-1 text-[#FF6B00]" />
                            <span className="text-[10px] font-bold uppercase truncate max-w-[80px] px-2">{file.name}</span>
                        </div>
                    ) : (
                        <img 
                            src={URL.createObjectURL(file)} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                        />
                    )}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onRemove();
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                        <X size={14} />
                    </button>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest border border-white/20 px-2 py-1 rounded-md backdrop-blur-sm">Alternar</span>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center text-zinc-600 group-hover:text-zinc-500 transition-colors">
                    <div className="p-3 bg-zinc-800/50 rounded-xl mb-2 group-hover:bg-[#FF6B00]/10 group-hover:text-[#FF6B00] transition-colors">
                        <Upload size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                </div>
            )}
            <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                    const uploadedFile = e.target.files?.[0];
                    if (uploadedFile) onUpload(uploadedFile);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
                title=""
            />
        </div>
    );
};

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

                {/* Documents Upload Section */}
                <div className="pt-4 space-y-6">
                    <div className="pb-2 border-b border-white/5">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Documentação e Identidade</h3>
                        <p className="text-[11px] text-zinc-500 mt-1">Anexe os documentos necessários para validação da sua conta.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Slot */}
                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Logo da Empresa</label>
                            <UploadSlot 
                                file={formData.logo} 
                                onUpload={(file) => updateFormData({ logo: file })}
                                onRemove={() => updateFormData({ logo: undefined })}
                                label="Logo"
                            />
                        </div>

                        {/* RG Socio Slot */}
                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">RG do Sócio Responsável</label>
                            <UploadSlot 
                                file={formData.rgSocio} 
                                onUpload={(file) => updateFormData({ rgSocio: file })}
                                onRemove={() => updateFormData({ rgSocio: undefined })}
                                label="RG Sócio"
                            />
                        </div>

                        {/* Contrato Social Slot */}
                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Contrato Social</label>
                            <UploadSlot 
                                file={formData.contratoSocial} 
                                onUpload={(file) => updateFormData({ contratoSocial: file })}
                                onRemove={() => updateFormData({ contratoSocial: undefined })}
                                label="Contrato"
                            />
                        </div>

                        {/* Fachada Slot */}
                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fachada da Loja</label>
                            <UploadSlot 
                                file={formData.fachadaLoja} 
                                onUpload={(file) => updateFormData({ fachadaLoja: file })}
                                onRemove={() => updateFormData({ fachadaLoja: undefined })}
                                label="Fachada"
                            />
                        </div>
                    </div>

                    <p className="text-[10px] text-zinc-500 font-medium italic text-center pt-2">
                        Formatos aceitos: JPG, PNG, PDF • Tamanho máximo: 5MB por arquivo
                    </p>
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
