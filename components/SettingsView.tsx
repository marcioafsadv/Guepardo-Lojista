import React, { useState, useEffect } from 'react';
import { StoreSettings, StoreProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { geocodeAddress } from '../utils/geocoding';
import { Save, Clock, MapPin, Truck, Award, Monitor, Volume2, Moon, Sun, Shield, Headphones, MessageCircle, LogOut, Trash2, Layers, Building2, Loader2, Navigation2 } from 'lucide-react';

interface SettingsViewProps {
    settings: StoreSettings;
    onSave: (newSettings: StoreSettings) => void;
    storeProfile: StoreProfile | null;
    onUpdateProfile: (updates: any) => Promise<{ success: boolean; error?: string }>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave, storeProfile, onUpdateProfile }) => {
    const { signOut } = useAuth();
    // Local state for form handling before save
    const [localSettings, setLocalSettings] = useState<StoreSettings>(settings);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Profile state
    const [profileData, setProfileData] = useState({
        name: storeProfile?.name || '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        cep: ''
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
                const { data } = await supabase.from('stores').select('address, fantasy_name').eq('id', storeProfile.id).single();
                if (data) {
                    setProfileData({
                        name: data.fantasy_name || storeProfile.name,
                        street: data.address?.street || '',
                        number: data.address?.number || '',
                        neighborhood: data.address?.district || data.address?.neighborhood || '',
                        city: data.address?.city || '',
                        state: data.address?.state || '',
                        cep: data.address?.zip_code || data.address?.cep || ''
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

    return (
        <div className="flex flex-col h-full bg-gray-200 dark:bg-guepardo-gray-900 text-gray-900 dark:text-white overflow-y-auto transition-colors duration-300">
            {/* Header */}
            <div className="p-8 border-b border-gray-200 dark:border-guepardo-gray-800 flex justify-between items-center sticky top-0 bg-gray-100/95 dark:bg-guepardo-gray-900/95 backdrop-blur z-10 transition-colors duration-300">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações da Loja</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie os parâmetros de operação e interface.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${hasChanges && !isSaving
                        ? 'bg-guepardo-accent text-guepardo-gray-900 hover:brightness-110 shadow-lg shadow-guepardo-accent/20'
                        : 'bg-gray-200 dark:bg-guepardo-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="p-8 max-w-4xl mx-auto w-full space-y-8 pb-32">

                {/* 0. DADOS DA EMPRESA */}
                <section className="bg-white dark:bg-guepardo-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-guepardo-gray-700 shadow-sm dark:shadow-none transition-colors duration-300">
                    <h3 className="text-lg font-bold text-guepardo-accent mb-6 flex items-center gap-2">
                        <Building2 size={20} /> Dados da Empresa
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
                            <p className="text-[10px] text-gray-500 mt-2 italic">Dica: Use esta opção se o marcador da sua loja estiver no local incorreto após o cadastro.</p>
                        </div>
                    </div>
                </section>

                {/* 1. PERFIL & OPERAÇÃO */}
                <section className="bg-white dark:bg-guepardo-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-guepardo-gray-700 shadow-sm dark:shadow-none transition-colors duration-300">
                    <h3 className="text-lg font-bold text-guepardo-accent mb-6 flex items-center gap-2">
                        <Clock size={20} /> Perfil & Operação
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
                <section className="bg-white dark:bg-guepardo-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-guepardo-gray-700 shadow-sm dark:shadow-none transition-colors duration-300">
                    <h3 className="text-lg font-bold text-guepardo-accent mb-6 flex items-center gap-2">
                        <Truck size={20} /> Logística & Taxas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Frete Base */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Estimativa de Frete (R$)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.50"
                                    value={localSettings.baseFreight}
                                    onChange={(e) => handleChange('baseFreight', parseFloat(e.target.value))}
                                    className="w-full bg-gray-50 dark:bg-guepardo-gray-900 border border-gray-200 dark:border-guepardo-gray-700 rounded-lg pl-10 pr-4 py-3 text-gray-900 dark:text-white focus:border-guepardo-accent focus:outline-none font-mono transition-colors duration-300"
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
                            <p className="text-xs text-gray-400">Cobrar 50% do valor se houver devolução (maquininha/troca).</p>
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

                        {/* Sons */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3">Alerta Sonoro</label>
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
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><Volume2 size={12} /> Som tocado ao "Chegar na Loja"</p>
                        </div>
                    </div>
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
                            href="https://wa.me/5511951977684"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-green-600/20 whitespace-nowrap"
                        >
                            <MessageCircle size={20} />
                            WhatsApp (11) 95197-7684
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
