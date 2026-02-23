export interface Step1Data {
    tipoPessoa: 'PF' | 'PJ';
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
    telefone: string;
}

export interface Step2Data {
    cep: string;
    rua: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
}

export interface Step3Data {
    nomeResponsavel: string;
    email: string;
    senha: string;
    confirmarSenha: string;
}

export interface WizardFormData extends Step1Data, Step2Data, Step3Data { }

export type StepProps = {
    formData: WizardFormData;
    updateFormData: (data: Partial<WizardFormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
    errors?: Partial<Record<keyof WizardFormData, string>>;
    setErrors?: (errors: Partial<Record<keyof WizardFormData, string>>) => void;
};
