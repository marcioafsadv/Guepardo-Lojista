import React, { useState } from 'react';
import { WizardFormData } from './types';
import Step1Company from './Step1Company';
import Step2Address from './Step2Address';
import Step3Access from './Step3Access';

import WelcomeScreen from './WelcomeScreen';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const WizardForm: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0); // Start at Welcome Screen
    const [formData, setFormData] = useState<WizardFormData>({
        tipoPessoa: 'PJ',
        cnpj: '',
        razaoSocial: '',
        nomeFantasia: '',
        telefone: '',
        cep: '',
        rua: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        nomeResponsavel: '',
        email: '',
        senha: '',
        confirmarSenha: ''
    });
    const [errors, setErrors] = useState<Partial<Record<keyof WizardFormData, string>>>({});

    const updateFormData = (newData: Partial<WizardFormData>) => {
        setFormData(prev => ({ ...prev, ...newData }));
    };

    const nextStep = () => {
        if (currentStep === 3) {
            handleFinish();
            return;
        }
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleFinish = async () => {
        // Prepare Data
        const { email, senha, nomeResponsavel, cnpj, razaoSocial, nomeFantasia, telefone, cep, rua, numero, complemento, bairro, cidade, estado } = formData;

        try {
            // 1. Register User in Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password: senha,
                options: {
                    data: {
                        role: 'lojista',
                        full_name: nomeResponsavel
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Insert Store Data linked to User ID
                const { error: storeError } = await supabase
                    .from('stores')
                    .insert({
                        id: authData.user.id,
                        cnpj,
                        company_name: razaoSocial,
                        fantasy_name: nomeFantasia,
                        phone: telefone,
                        tipo_pessoa: formData.tipoPessoa,
                        address: {
                            zip_code: cep,
                            street: rua,
                            number: numero,
                            complement: complemento,
                            district: bairro,
                            city: cidade,
                            state: estado
                        }
                    });

                if (storeError) {
                    // Decide if rollback or proceed (usually proceed and fix later manually or retry, but for now allow)
                    console.error('Error creating store profile:', storeError);
                    alert('Erro ao criar perfil da loja. Contate o suporte.');
                    return;
                }

                // 3. Success -> Redirect
                // No need to set localStorage manually as AuthContext handles session
                window.location.href = '/';
            }
        } catch (error: any) {
            console.error('Registration Error:', error);
            alert(`Erro no cadastro: ${error.message}`);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return (
                    <WelcomeScreen
                        onStart={nextStep}
                        onLogin={() => alert("Redirecionar para Login")}
                    />
                );
            case 1:
                return (
                    <Step1Company
                        formData={formData}
                        updateFormData={updateFormData}
                        nextStep={nextStep}
                        prevStep={prevStep}
                        errors={errors}
                        setErrors={setErrors}
                    />
                );
            case 2:
                return (
                    <Step2Address
                        formData={formData}
                        updateFormData={updateFormData}
                        nextStep={nextStep}
                        prevStep={prevStep}
                        errors={errors}
                        setErrors={setErrors}
                    />
                );
            case 3:
                return (
                    <Step3Access
                        formData={formData}
                        updateFormData={updateFormData}
                        nextStep={nextStep}
                        prevStep={prevStep}
                        errors={errors}
                        setErrors={setErrors}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-8 md:p-10 relative overflow-hidden">
                {/* Progress Bar (Hidden on Welcome) */}
                {currentStep > 0 && (
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <span className={`text-sm font-semibold ${currentStep >= 1 ? 'text-[#FF6B00]' : 'text-gray-400'}`}>Empresa</span>
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                            <span className={`text-sm font-semibold ${currentStep >= 2 ? 'text-[#FF6B00]' : 'text-gray-400'}`}>Endereço</span>
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                            <span className={`text-sm font-semibold ${currentStep >= 3 ? 'text-[#FF6B00]' : 'text-gray-400'}`}>Acesso</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#FF6B00] transition-all duration-300 ease-in-out"
                                style={{ width: `${((currentStep) / 3) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {renderStep()}
            </div>
        </div>
    );
};

export default WizardForm;
