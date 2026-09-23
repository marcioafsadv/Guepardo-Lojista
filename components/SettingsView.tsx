import React, { useState, useEffect } from 'react';
import { StoreSettings, StoreProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { geocodeAddress } from '../utils/geocoding';
import { Save, Clock, MapPin, Truck, Award, Monitor, Volume2, VolumeX, Moon, Sun, Shield, Headphones, MessageCircle, LogOut, Trash2, Layers, Building2, Loader2, Navigation2, Lock, ExternalLink, Copy, Check, Bot } from 'lucide-react';

interface SettingsViewProps {
    settings: StoreSettings;
    onSave: (newSettings: StoreSettings) => void;
    storeProfile: StoreProfile | null;
    onUpdateProfile: (updates: any) => Promise<{ success: boolean; error?: string }>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave, storeProfile, onUpdateProfile }) => {
    const { signOut } = useAuth();
    // Local state for form handling before save
    const [localSettings, setLocalSettings] = useState<StoreSettings>({
        ...settings,
        baseFreight: 7.00,
        voiceAlertsEnabled: settings.voiceAlertsEnabled !== false,
        voiceGender: settings.voiceGender || 'male'
    });
    const [playingSound, setPlayingSound] = useState<string | null>(null);
    const testAudioRef = React.useRef<HTMLAudioElement | null>(null);
    const [copiedWebhook, setCopiedWebhook] = useState(false);

    // Sync if external settings prop updates
    useEffect(() => {
        setLocalSettings(prev => ({
            ...prev,
            ...settings,
            voiceAlertsEnabled: settings.voiceAlertsEnabled !== false,
            voiceGender: settings.voiceGender || prev.voiceGender || 'male'
        }));
    }, [settings]);

    const playTestSound = (path: string, soundKey: string) => {
        if (testAudioRef.current) {
            testAudioRef.current.pause();
            testAudioRef.current.currentTime = 0;
        }
        try {
            const audio = new Audio(path);
            testAudioRef.current = audio;
            setPlayingSound(soundKey);
            audio.play().catch(e => {
                console.warn('Erro ao reproduzir teste sonoro:', e);
                setPlayingSound(null);
            });
            audio.onended = () => setPlayingSound(null);
            audio.onerror = () => setPlayingSound(null);
        } catch (e) {
            console.warn('Erro ao criar elemento de áudio:', e);
            setPlayingSound(null);
        }
    };

    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Password change state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile state
    const [profileData, setProfileData] = useState({
        name: storeProfile?.name || '',
        street: '',
        number: '',
        neighborhood: storeProfile?.address ? '' : '', // Will be set by useEffect
        city: '',
        state: '',
        cep: '',
        ifoodMerchantId: storeProfile?.ifood_merchant_id || '',
        ninenineMerchantId: storeProfile?.ninenine_merchant_id || '',
        ifoodReceivingOrders: storeProfile?.ifood_receiving_orders !== false,
        ninenineReceivingOrders: storeProfile?.ninenine_receiving_orders !== false,
        anotaaiToken: storeProfile?.anotaai_token || '',
        anotaaiReceivingOrders: storeProfile?.anotaai_receiving_orders !== false
    });

    // Initialize address from storeProfile string or fetch from DB if needed
    // But since storeProfile.address is concatenated, it's better to fetch structured if we want to edit.
    // However, for this task, let's assume we allow editing the name first and maybe address geocoding.
    
    // Better: let's add a separate section for the address if we have it in structured format.
    // We'll use a useEffect to sync profileData when storeProfile loads.
    React.useEffect(() => {
        if (storeProfile) {
            // We need to fetch the structured address since storeProfile only has the concatenated string
            const fetchStructuredAddress = async () => {
                const { data } = await supabase.from('stores').select('address, fantasy_name, ifood_merchant_id, ninenine_merchant_id, ifood_receiving_orders, ninenine_receiving_orders, anotaai_token, anotaai_receiving_orders').eq('id', storeProfile.id).single();
                if (data) {
                    setProfileData({
                        name: data.fantasy_name || storeProfile.name,
                        street: data.address?.street || '',
                        number: data.address?.number || '',
                        neighborhood: data.address?.district || data.address?.neighborhood || '',
                        city: data.address?.city || '',
                        state: data.address?.state || '',
                        cep: data.address?.zip_code || data.address?.cep || '',
                        ifoodMerchantId: data.ifood_merchant_id || '',
                        ninenineMerchantId: data.ninenine_merchant_id || '',
                        ifoodReceivingOrders: data.ifood_receiving_orders !== false,
                        ninenineReceivingOrders: data.ninenine_receiving_orders !== false,
                        anotaaiToken: data.anotaai_token || '',
                        anotaaiReceivingOrders: data.anotaai_receiving_orders !== false
                    });
                }
            };
            fetchStructuredAddress();
        }
    }, [storeProfile?.id]);

    const handleChange = (key: keyof StoreSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleProfileChange = (key: string, value: any) => {
        setProfileData(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleDeepChange = (parent: keyof StoreSettings, key: string, value: any) => {
        // @ts-ignore
        setLocalSettings(prev => ({
            ...prev,
            [parent]: {
                // @ts-ignore
                ...prev[parent],
                [key]: value
            }
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Save UI Settings
            onSave(localSettings);

            // 2. Save Profile Data if changed
            if (storeProfile) {
                const updates: any = {
                    fantasy_name: profileData.name,
                    ifood_merchant_id: profileData.ifoodMerchantId || null,
                    ninenine_merchant_id: profileData.ninenineMerchantId || null,
                    ifood_receiving_orders: profileData.ifoodReceivingOrders,
                    ninenine_receiving_orders: profileData.ninenineReceivingOrders,
                    anotaai_token: profileData.anotaaiToken || null,
                    anotaai_receiving_orders: profileData.anotaaiReceivingOrders,
                    address: {
                        street: profileData.street,
                        number: profileData.number,
                        district: profileData.neighborhood,
                        city: profileData.city,
                        state: profileData.state,
                        zip_code: profileData.cep
                    }
                };
                
                // Optional: Trigger geocoding if address changed? 
                // Let's do it if the user wants or just always for safety if address is modified.
                // For now, let's just save the text fields.
                
                await onUpdateProfile(updates);
            }

            setHasChanges(false);
        } catch (error) {
            console.error("Error saving settings:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRecalculateLocation = async () => {
        if (!storeProfile) return;
        setIsGeocoding(true);
        try {
            const coords = await geocodeAddress({
                street: profileData.street,
                number: profileData.number,
                neighborhood: profileData.neighborhood,
                city: profileData.city,
                cep: profileData.cep
            });

            if (coords) {
                await onUpdateProfile({
                    lat: coords.lat,
                    lng: coords.lng
                });
                alert("📍 Localização atualizada com sucesso no mapa!");
            } else {
                alert("⚠️ Não foi possível encontrar este endereço no mapa. Verifique os dados.");
            }
        } catch (error) {
            console.error("Geocoding error:", error);
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        setIsUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Error updating password:', error);
            setPasswordMessage({ type: 'error', text: error.message || 'Falha ao atualizar a senha.' });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-200 dark:bg-guepardo-gray-900 text-gray-900 dark:text-white overflow-y-auto transition-colors duration-300">
            {/* Header */}
            <div className="p-4 md:p-8 border-b border-gray-200 dark:border-guepardo-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-gray-100/95 dark:bg-guepardo-gray-900/95 backdrop-blur z-10 transition-colors duration-300">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Configurações</h2>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie os parâmetros da loja.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${hasChanges && !isSaving
                        ? 'bg-guepardo-accent text-guepardo-gray-900 hover:brightness-110 shadow-lg shadow-guepardo-accent/20'
                        : 'bg-gray-200 dark:bg-guepardo-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 md:space-y-8 pb-32">

                {/* 0. DADOS DA EMPRESA */}
                <section className="bg-white dark:bg-guepardo-gray-800 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-guepardo-gray-700 shadow-sm dark:shadow-none transition-colors duration-300">
                    <h3 className="text-base md:text-lg font-bold text-guepardo-accent mb-4 md:mb-6 flex items-center gap-2">
                        <Building2 size={18} /> Dados da Empresa
                    </h3>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Nome Fantasia</label>
                            <input
                                type="text"
                                value={profileData.name}
                                onChange={(e) => handleProfileChange('name', e.target.value)}
                                className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300"
                                placeholder="Nome da sua loja"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">CEP</label>
                                <input
                                    type="text"
                                    value={profileData.cep}
                                    onChange={(e) => handleProfileChange('cep', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Logradouro</label>
                                <input
                                    type="text"
                                    value={profileData.street}
                                    onChange={(e) => handleProfileChange('street', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Número</label>
                                <input
                                    type="text"
                                    value={profileData.number}
                                    onChange={(e) => handleProfileChange('number', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Bairro</label>
                                <input
                                    type="text"
                                    value={profileData.neighborhood}
                                    onChange={(e) => handleProfileChange('neighborhood', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Cidade</label>
                                <input
                                    type="text"
                                    value={profileData.city}
                                    onChange={(e) => handleProfileChange('city', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">UF</label>
                                <input
                                    type="text"
                                    value={profileData.state}
                                    onChange={(e) => handleProfileChange('state', e.target.value)}
                                    maxLength={2}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300 uppercase"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-guepardo-gray-700">
                        <button
                            onClick={handleRecalculateLocation}
                            disabled={isGeocoding}
                            className="flex items-center gap-2 text-sm font-bold text-guepardo-accent hover:text-white transition-colors disabled:opacity-50"
                        >
                            {isGeocoding ? <Loader2 size={16} className="animate-spin" /> : <Navigation2 size={16} />}
                            {isGeocoding ? 'Recalculando Localização...' : 'Recalcular Localização no Mapa'}
                        </button>
                        <p className="text-[10px] text-gray-500 mt-2 italic px-1">Dica: Use esta opção se o marcador da sua loja estiver no local incorreto após o cadastro.</p>
                    </div>
                </div>
            </section>

            {/* 0.5. INTEGRAÇÕES DE MARKETPLACE */}
            <section className="bg-white dark:bg-guepardo-gray-800 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-guepardo-gray-700 shadow-sm dark:shadow-none transition-colors duration-300">
                <h3 className="text-base md:text-lg font-bold text-guepardo-accent mb-4 md:mb-6 flex items-center gap-2">
                    <Layers size={18} /> Integrações de Marketplaces
                </h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* iFood */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">iFood Merchant ID</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400">RECEBER</span>
                                    <button
                                        onClick={() => handleProfileChange('ifoodReceivingOrders', !profileData.ifoodReceivingOrders)}
                                        className={`w-10 h-6 rounded-full p-0.5 transition-colors ${profileData.ifoodReceivingOrders ? 'bg-green-500' : 'bg-gray-300 dark:bg-guepardo-gray-750'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${profileData.ifoodReceivingOrders ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    value={profileData.ifoodMerchantId}
                                    onChange={(e) => handleProfileChange('ifoodMerchantId', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300 text-xs"
                                    placeholder="ID do Estabelecimento no iFood"
                                />
                                <a
                                    href="https://portal.ifood.com.br/apps/home"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="self-start inline-flex items-center gap-1.5 text-[10px] font-bold text-guepardo-accent hover:text-white hover:bg-guepardo-accent/15 px-3 py-1.5 rounded-lg transition-all border border-guepardo-accent/20"
                                >
                                    <ExternalLink size={12} /> Autorizar App no iFood
                                </a>
                            </div>
                        </div>

                        {/* 99Food */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">99Food Merchant ID</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400">RECEBER</span>
                                    <button
                                        onClick={() => handleProfileChange('ninenineReceivingOrders', !profileData.ninenineReceivingOrders)}
                                        className={`w-10 h-6 rounded-full p-0.5 transition-colors ${profileData.ninenineReceivingOrders ? 'bg-green-500' : 'bg-gray-300 dark:bg-guepardo-gray-750'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${profileData.ninenineReceivingOrders ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    value={profileData.ninenineMerchantId}
                                    onChange={(e) => handleProfileChange('ninenineMerchantId', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300 text-xs"
                                    placeholder="ID do Estabelecimento na 99Food"
                                />
                                <a
                                    href="https://merchant.99app.com/pt-BR/manager/app-authorize?app_id=5764607608634214376"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="self-start inline-flex items-center gap-1.5 text-[10px] font-bold text-guepardo-accent hover:text-white hover:bg-guepardo-accent/15 px-3 py-1.5 rounded-lg transition-all border border-guepardo-accent/20"
                                >
                                    <ExternalLink size={12} /> Vincular Loja na 99Food
                                </a>
                            </div>
                        </div>

                        {/* Anota AI */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#7952DE]"></span>
                                    Anota AI Token
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400">RECEBER</span>
                                    <button
                                        onClick={() => handleProfileChange('anotaaiReceivingOrders', !profileData.anotaaiReceivingOrders)}
                                        className={`w-10 h-6 rounded-full p-0.5 transition-colors ${profileData.anotaaiReceivingOrders ? 'bg-[#7952DE]' : 'bg-gray-300 dark:bg-guepardo-gray-750'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${profileData.anotaaiReceivingOrders ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    value={profileData.anotaaiToken}
                                    onChange={(e) => handleProfileChange('anotaaiToken', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-[#7952DE] focus:outline-none transition-colors duration-300 font-mono text-xs"
                                    placeholder="Chave da Loja (pageToken)"
                                />
                                <a
                                    href="https://admin.anota.ai/#/integrations"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="self-start inline-flex items-center gap-1.5 text-[10px] font-bold text-[#7952DE] hover:text-white hover:bg-[#7952DE]/20 px-3 py-1.5 rounded-lg transition-all border border-[#7952DE]/30"
                                >
                                    <ExternalLink size={12} /> Painel da Anota AI
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Box com URL do Webhook do Guepardo */}
                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                            <Bot size={18} className="text-[#7952DE] shrink-0" />
                            <div className="flex flex-col">
                                <span className="font-bold text-white">URL de Webhook do Guepardo para Anota AI:</span>
                                <code className="text-purple-300 font-mono text-[11px] select-all break-all">
                                    https://eviukbluwrwcblwhkzwz.supabase.co/functions/v1/anota-ai-webhook
                                </code>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText('https://eviukbluwrwcblwhkzwz.supabase.co/functions/v1/anota-ai-webhook');
                                setCopiedWebhook(true);
                                setTimeout(() => setCopiedWebhook(false), 3000);
                            }}
                            className="self-start md:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7952DE] hover:bg-[#6841ce] text-white rounded-lg font-bold text-[11px] transition-colors shadow-sm cursor-pointer"
                        >
                            {copiedWebhook ? <Check size={14} /> : <Copy size={14} />}
                            {copiedWebhook ? 'Copiado!' : 'Copiar URL do Webhook'}
                        </button>
                    </div>

                    <p className="text-[10px] text-gray-500 italic">Insira os identificadores fornecidos pelas respectivas plataformas para habilitar a sincronização em tempo real.</p>
                </div>
            </section>

                {/* 1. PERFIL & OPERAÇÃO */}
                <section className="bg-white dark:bg-guepardo-gray-800 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-guepardo-gray-700 shadow-sm dark:shadow-none transition-colors duration-300">
                    <h3 className="text-base md:text-lg font-bold text-guepardo-accent mb-4 md:mb-6 flex items-center gap-2">
                        <Clock size={18} /> Perfil & Operação
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Status da Loja */}
                        <div className="bg-gray-50 dark:bg-guepardo-gray-900 p-4 rounded-xl border border-gray-200 dark:border-guepardo-gray-700 flex justify-between items-center transition-colors duration-300">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1">Status da Loja</label>
                                <p className="text-xs text-gray-400">Define se a loja está recebendo pedidos.</p>
                            </div>
                            <button
                                onClick={() => handleChange('isStoreOpen', !localSettings.isStoreOpen)}
                                className={`w-14 h-8 rounded-full p-1 transition-colors ${localSettings.isStoreOpen ? 'bg-green-500' : 'bg-red-500'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${localSettings.isStoreOpen ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Raio de Atendimento */}
                        <div className="bg-gray-50 dark:bg-guepardo-gray-900 p-4 rounded-xl border border-gray-200 dark:border-guepardo-gray-700 transition-colors duration-300">
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 flex justify-between">
                                Raio de Atendimento
                                <span className="text-guepardo-accent">{localSettings.deliveryRadiusKm} km</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                step="0.5"
                                value={localSettings.deliveryRadiusKm}
                                onChange={(e) => handleChange('deliveryRadiusKm', parseFloat(e.target.value))}
                                className="w-full h-2 bg-guepardo-gray-700 rounded-lg appearance-none cursor-pointer accent-guepardo-accent"
                            />
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><MapPin size={12} /> A partir do centro de Itu/SP</p>
                        </div>

                        {/* Horários */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Abertura</label>
                                <input
                                    type="time"
                                    value={localSettings.openTime}
                                    onChange={(e) => handleChange('openTime', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Fechamento</label>
                                <input
                                    type="time"
                                    value={localSettings.closeTime}
                                    onChange={(e) => handleChange('closeTime', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. LOGÍSTICA & TAXAS */}
                <section className="bg-white dark:bg-guepardo-gray-800 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-guepardo-gray-700 shadow-sm dark:shadow-none transition-colors duration-300">
                    <h3 className="text-base md:text-lg font-bold text-guepardo-accent mb-4 md:mb-6 flex items-center gap-2">
                        <Truck size={18} /> Logística & Taxas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Frete Base */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Estimativa de Frete (R$)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold">R$</span>
                                <input
                                    type="text"
                                    value="7,00"
                                    disabled
                                    className="w-full bg-gray-100 dark:bg-guepardo-gray-800 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg pl-10 pr-4 py-3 text-gray-400 dark:text-gray-500 font-mono cursor-not-allowed transition-colors duration-300"
                                />
                            </div>
                        </div>

                        {/* Tempo de Preparo */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Tempo de Preparo (min)</label>
                            <input
                                type="number"
                                min="1"
                                value={localSettings.prepTimeMinutes}
                                onChange={(e) => handleChange('prepTimeMinutes', parseInt(e.target.value))}
                                className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300"
                            />
                        </div>

                        {/* Taxa de Retorno */}
                        <div className="bg-gray-50 dark:bg-guepardo-gray-900 p-4 rounded-xl border border-gray-200 dark:border-guepardo-gray-700 flex flex-col justify-center transition-colors duration-300">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-gray-900 dark:text-white">Taxa de Retorno</label>
                                <button
                                    onClick={() => handleChange('returnFeeActive', !localSettings.returnFeeActive)}
                                    className={`w-10 h-6 rounded-full p-0.5 transition-colors ${localSettings.returnFeeActive ? 'bg-guepardo-accent' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${localSettings.returnFeeActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">Cobrar taxa de retorno (apenas KM rodado) se houver devolução (maquininha/troca).</p>
                        </div>
                    </div>
                </section>

                {/* 3. GAMIFICAÇÃO & FIDELIDADE */}
                <section className="bg-white dark:bg-guepardo-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-guepardo-gray-700 shadow-sm dark:shadow-none transition-colors duration-300">
                    <h3 className="text-lg font-bold text-guepardo-accent mb-6 flex items-center gap-2">
                        <Award size={20} /> Gamificação (Metas)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Bronze Goal */}
                        <div className="relative pt-6">
                            <div className="absolute top-0 left-0 bg-[#CD7F32] text-white text-xs font-bold px-2 py-1 rounded-t-lg uppercase">Nível Bronze</div>
                            <div className="bg-gray-50 dark:bg-guepardo-gray-900 border-2 border-[#CD7F32] rounded-b-xl rounded-tr-xl p-4 transition-colors duration-300">
                                <label className="block text-sm text-gray-400 mb-2">Pedidos mínimos</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={localSettings.tierGoals.bronze}
                                    onChange={(e) => handleDeepChange('tierGoals', 'bronze', parseInt(e.target.value))}
                                    className="w-full bg-transparent border-b border-[#CD7F32]/50 text-2xl font-bold text-gray-900 dark:text-white focus:border-[#CD7F32] focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Prata Goal */}
                        <div className="relative pt-6">
                            <div className="absolute top-0 left-0 bg-gray-400 text-gray-900 text-xs font-bold px-2 py-1 rounded-t-lg uppercase">Nível Prata</div>
                            <div className="bg-gray-50 dark:bg-guepardo-gray-900 border-2 border-gray-400 rounded-b-xl rounded-tr-xl p-4 transition-colors duration-300">
                                <label className="block text-sm text-gray-400 mb-2">Pedidos mínimos</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={localSettings.tierGoals.silver}
                                    onChange={(e) => handleDeepChange('tierGoals', 'silver', parseInt(e.target.value))}
                                    className="w-full bg-transparent border-b border-gray-600 text-2xl font-bold text-gray-900 dark:text-white focus:border-white focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Gold Goal */}
                        <div className="relative pt-6">
                            <div className="absolute top-0 left-0 bg-amber-500 text-guepardo-gray-900 text-xs font-bold px-2 py-1 rounded-t-lg uppercase">Nível Ouro</div>
                            <div className="bg-gray-50 dark:bg-guepardo-gray-900 border-2 border-amber-500 rounded-b-xl rounded-tr-xl p-4 transition-colors duration-300">
                                <label className="block text-sm text-gray-400 mb-2">Pedidos necessários</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={localSettings.tierGoals.gold}
                                    onChange={(e) => handleDeepChange('tierGoals', 'gold', parseInt(e.target.value))}
                                    className="w-full bg-transparent border-b border-amber-500/50 text-2xl font-bold text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. INTERFACE */}
                <section className="bg-white dark:bg-guepardo-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-guepardo-gray-700 shadow-sm dark:shadow-none transition-colors duration-300">
                    <h3 className="text-lg font-bold text-guepardo-accent mb-6 flex items-center gap-2">
                        <Monitor size={20} /> Interface
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tema */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3">Tema da Aplicação</label>
                            <div className="flex bg-gray-50 dark:bg-guepardo-gray-900 p-1 rounded-xl border border-gray-200 dark:border-guepardo-gray-700 transition-colors duration-300">
                                {['light', 'dark', 'auto'].map(theme => (
                                    <button
                                        key={theme}
                                        onClick={() => handleChange('theme', theme)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize flex items-center justify-center gap-2 transition-colors ${localSettings.theme === theme
                                            ? 'bg-white dark:bg-guepardo-gray-700 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        {theme === 'light' ? <Sun size={14} /> : theme === 'dark' ? <Moon size={14} /> : <Shield size={14} />}
                                        {theme === 'auto' ? 'Auto' : theme === 'light' ? 'Claro' : 'Escuro'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tema do Mapa */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Layers size={14} className="text-guepardo-accent" /> Tema do Mapa
                            </label>
                            <div className="flex bg-gray-50 dark:bg-guepardo-gray-900 p-1 rounded-xl border border-gray-200 dark:border-guepardo-gray-700 transition-colors duration-300">
                                {['light', 'dark'].map(mTheme => (
                                    <button
                                        key={mTheme}
                                        onClick={() => handleChange('mapTheme', mTheme)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize flex items-center justify-center gap-2 transition-colors ${localSettings.mapTheme === mTheme
                                            ? 'bg-white dark:bg-guepardo-gray-700 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        {mTheme === 'light' ? <Sun size={14} /> : <Moon size={14} />}
                                        {mTheme === 'light' ? 'Mapa Claro' : 'Mapa Escuro'}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 italic px-1">Configure o mapa para o modo que melhor facilite sua visualização de rotas.</p>
                        </div>

                        {/* Alertas de Voz Operacionais (Monitoramento) */}
                        <div className="md:col-span-2 bg-gray-50 dark:bg-guepardo-gray-900/70 p-4 rounded-xl border border-gray-200 dark:border-guepardo-gray-700">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Headphones size={18} className="text-guepardo-accent" />
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                            Alertas por Voz (Monitoramento Operacional)
                                        </h4>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Avisos falados em tempo real: entregador aceitou a corrida, chegou no local, aviso de pedido pronto, confirmação do código de coleta e envio do link de rastreio.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleChange('voiceAlertsEnabled', localSettings.voiceAlertsEnabled === false ? true : false)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                                            localSettings.voiceAlertsEnabled !== false
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                : 'bg-gray-200 dark:bg-guepardo-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-guepardo-gray-600'
                                        }`}
                                    >
                                        {localSettings.voiceAlertsEnabled !== false ? (
                                            <>
                                                <Volume2 size={14} /> Ativado
                                            </>
                                        ) : (
                                            <>
                                                <VolumeX size={14} /> Desativado (Mudo)
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Seletor de Tipo de Voz e Teste (aparece quando os alertas por voz estão ativos) */}
                            {localSettings.voiceAlertsEnabled !== false && (
                                <div className="pt-3 border-t border-gray-200 dark:border-guepardo-gray-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                            Tipo de Voz:
                                        </label>
                                        <div className="flex bg-white dark:bg-guepardo-gray-800 p-1 rounded-lg border border-gray-200 dark:border-guepardo-gray-700">
                                            <button
                                                type="button"
                                                onClick={() => handleChange('voiceGender', 'male')}
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                                    (localSettings.voiceGender || 'male') === 'male'
                                                        ? 'bg-amber-500 text-gray-900 shadow-sm font-black'
                                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                }`}
                                            >
                                                👨 Voz Masculina
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleChange('voiceGender', 'female')}
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                                    localSettings.voiceGender === 'female'
                                                        ? 'bg-amber-500 text-gray-900 shadow-sm font-black'
                                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                }`}
                                            >
                                                👩 Voz Feminina
                                            </button>
                                        </div>
                                    </div>

                                    {/* Botão de teste da voz */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const voice = localSettings.voiceGender || 'male';
                                            const testFile = voice === 'male' 
                                                ? '/sounds/entregador-aceitou-masc.mp3' 
                                                : '/sounds/entregador-aceitou.mp3';
                                            playTestSound(testFile, 'voice_preview');
                                        }}
                                        disabled={playingSound === 'voice_preview'}
                                        className="px-3 py-1.5 bg-white hover:bg-gray-100 dark:bg-guepardo-gray-800 dark:hover:bg-guepardo-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg border border-gray-200 dark:border-guepardo-gray-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                                    >
                                        <Volume2 size={13} className={playingSound === 'voice_preview' ? 'animate-bounce text-guepardo-accent' : ''} />
                                        {playingSound === 'voice_preview' ? 'Ouvindo...' : 'Testar Voz Selecionada'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Sons de Notificação (Campainha) */}
                        <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-bold text-gray-900 dark:text-white">Alerta Sonoro (Toque / Campainha)</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const soundMap: Record<string, string> = {
                                            cheetah: '/sounds/rugido-guepardo.mp3',
                                            symphony: '/sounds/symphony.mp3',
                                            guitar: '/sounds/guitar-notification.mp3',
                                            beep: '/sounds/beep-notification.mp3',
                                            roar: '/sounds/lion-roar.mp3',
                                            siren: '/sounds/beep-notification.mp3',
                                            default: '/sounds/rugido-guepardo.mp3'
                                        };
                                        const path = soundMap[localSettings.alertSound] || '/sounds/rugido-guepardo.mp3';
                                        playTestSound(path, 'sound_preview');
                                    }}
                                    disabled={playingSound === 'sound_preview'}
                                    className="px-2.5 py-1 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-guepardo-gray-800 dark:hover:bg-guepardo-gray-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-gray-200 dark:border-guepardo-gray-700"
                                >
                                    <Volume2 size={13} className={playingSound === 'sound_preview' ? 'animate-bounce text-guepardo-accent' : ''} />
                                    {playingSound === 'sound_preview' ? 'Tocando...' : 'Testar Toque'}
                                </button>
                            </div>
                            <div className="bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-xl overflow-hidden transition-colors duration-300">
                                <select
                                    value={localSettings.alertSound}
                                    onChange={(e) => handleChange('alertSound', e.target.value)}
                                    className="w-full bg-transparent dark:bg-guepardo-gray-900 p-3 text-gray-900 dark:text-white font-bold focus:outline-none cursor-pointer"
                                >
                                    <option value="cheetah" className="text-gray-900 bg-white dark:bg-guepardo-gray-900 dark:text-white">Rugido do Guepardo</option>
                                    <option value="symphony" className="text-gray-900 bg-white dark:bg-guepardo-gray-900 dark:text-white">Symphony</option>
                                    <option value="guitar" className="text-gray-900 bg-white dark:bg-guepardo-gray-900 dark:text-white">Guitarra</option>
                                    <option value="beep" className="text-gray-900 bg-white dark:bg-guepardo-gray-900 dark:text-white">Beep (Curto)</option>
                                    <option value="default" className="text-gray-900 bg-white dark:bg-guepardo-gray-900 dark:text-white">Padrão (Bip)</option>
                                    <option value="roar" className="text-gray-900 bg-white dark:bg-guepardo-gray-900 dark:text-white">Rugido (Antigo)</option>
                                    <option value="siren" className="text-gray-900 bg-white dark:bg-guepardo-gray-900 dark:text-white">Sirene de Aviso</option>
                                </select>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><Volume2 size={12} /> Som tocado em alertas gerais e notificações do sistema</p>
                        </div>
                    </div>
                </section>

                {/* 4.5. ALTERAR SENHA */}
                <section className="bg-white dark:bg-guepardo-gray-800 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-guepardo-gray-700 shadow-sm dark:shadow-none transition-colors duration-300">
                    <h3 className="text-base md:text-lg font-bold text-guepardo-accent mb-4 md:mb-6 flex items-center gap-2">
                        <Lock size={18} /> Alterar Senha de Acesso
                    </h3>
                    
                    <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Nova Senha</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300"
                                placeholder="Digite a nova senha"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none transition-colors duration-300"
                                placeholder="Confirme a nova senha"
                                required
                            />
                        </div>

                        {passwordMessage && (
                            <div className={`p-3 rounded-lg text-sm font-semibold ${
                                passwordMessage.type === 'success' 
                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                                {passwordMessage.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                !isUpdatingPassword && newPassword && confirmPassword
                                    ? 'bg-guepardo-accent text-guepardo-gray-900 hover:brightness-110 shadow-lg shadow-guepardo-accent/20'
                                    : 'bg-gray-200 dark:bg-guepardo-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {isUpdatingPassword ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {isUpdatingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                        </button>
                    </form>
                </section>

                {/* 5. SUPORTE */}
                <section className="bg-white dark:bg-guepardo-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-guepardo-gray-700 shadow-sm dark:shadow-none transition-colors duration-300">
                    <h3 className="text-lg font-bold text-guepardo-accent mb-6 flex items-center gap-2">
                        <Headphones size={20} /> Suporte & Ajuda
                    </h3>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-gray-50 dark:bg-guepardo-gray-900 rounded-xl border border-gray-200 dark:border-guepardo-gray-700">
                        <div>
                            <p className="text-gray-900 dark:text-white font-bold text-lg mb-1">Precisa de ajuda com o sistema?</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Entre em contato com nosso suporte técnico especializado.</p>
                        </div>
                        <a
                            href="https://wa.me/5511983382090"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-green-600/20 whitespace-nowrap"
                        >
                            <MessageCircle size={20} />
                            WhatsApp (11) 98338-2090
                        </a>
                    </div>
                </section>


                {/* 6. LOGOUT */}
                <section className="flex justify-end pt-8 border-t border-gray-200 dark:border-guepardo-gray-800">
                    <button
                        onClick={async () => {
                            if (confirm('Tem certeza que deseja sair?')) {
                                await signOut();
                            }
                        }}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-500 border border-red-500/20 transition-all"
                    >
                        <LogOut size={20} />
                        Sair da Conta
                    </button>
                </section>

            </div>
        </div>
    );
};
