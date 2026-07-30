export interface Step1Data {
    tipoPessoa: 'PF' | 'PJ';
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
    telefone: string;
    logo?: File;
    rgSocio?: File;
    contratoSocial?: File;
    fachadaLoja?: File;
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

export interface Step4ContractData {
    contractAccepted: boolean;
    contractAcceptedAt?: string;   // ISO timestamp do momento do aceite
    contractIpAddress?: string;    // IP do cliente no momento do aceite
    contractUserAgent?: string;    // User-Agent do navegador
    contractVersion: string;       // ex: 'v1.0-2026-07'
}

export interface WizardFormData extends Step1Data, Step2Data, Step3Data, Step4ContractData { }

export type StepProps = {
    formData: WizardFormData;
    updateFormData: (data: Partial<WizardFormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
    errors?: Partial<Record<keyof WizardFormData, string>>;
    setErrors?: (errors: Partial<Record<keyof WizardFormData, string>>) => void;
};
