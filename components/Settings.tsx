
import React, { useState, useEffect } from 'react';
import { PlanType, AccountSettings, User } from '@/types';
import { User as UserIcon, CreditCard, Globe, Lock, ShieldCheck, MapPin, CheckCircle, AlertCircle, Loader2, Save, Database, ExternalLink, Key } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SettingsProps {
  activePlan: PlanType;
  onSelectPlan: (plan: PlanType) => void;
  settings: AccountSettings;
  setSettings: (newSettings: AccountSettings) => void;
  currentUser?: User;
}

const Settings: React.FC<SettingsProps> = ({ activePlan, onSelectPlan, settings, setSettings, currentUser }) => {
  // Initialize local state with props, fallback to empty
  const [placeIdInput, setPlaceIdInput] = useState(settings.placeId || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [placeName, setPlaceName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [localSettings, setLocalSettings] = useState<AccountSettings>(settings);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: 'idle' as 'idle' | 'success' | 'error' });


  // Check DB on Mount
  useEffect(() => {
    const checkDb = async () => {
        try {
            const { error } = await supabase.from('users').select('id').limit(1);
            if (error) throw error;
            setDbStatus('connected');
        } catch (e) {
            console.error(e);
            setDbStatus('error');
        }
    };
    checkDb();
  }, []);

  // Sync props to local state
  useEffect(() => {
    setLocalSettings(settings);
    setPlaceIdInput(settings.placeId || '');
  }, [settings]);
  
  // Clear password message on input change
  useEffect(() => {
      if (passwordStatus === 'error' && (newPassword || confirmPassword)) {
          setPasswordStatus('idle');
          setPasswordMessage({ text: '', type: 'idle' });
      }
  }, [newPassword, confirmPassword, passwordStatus]);

  const handleInputChange = (field: keyof AccountSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
  };

  const handleSaveAccountDetails = () => {
    setSaveStatus('saving');
    // Calls parent handler (MainApp) which writes to Supabase
    setSettings(localSettings); 
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 800);
  };

  const handleChangePassword = async () => {
    setPasswordMessage({ text: '', type: 'idle' });

    if (!newPassword || !confirmPassword) {
      setPasswordMessage({ text: 'Por favor, preencha ambos os campos.', type: 'error' });
      setPasswordStatus('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'As senhas não coincidem.', type: 'error' });
      setPasswordStatus('error');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: 'A senha deve ter no mínimo 6 caracteres.', type: 'error' });
      setPasswordStatus('error');
      return;
    }

    setPasswordStatus('saving');
    try {
        const { error } = await supabase
            .from('users')
            .update({ password: newPassword })
            .eq('id', currentUser?.id);
        
        if (error) throw error;
        
        setPasswordStatus('saved');
        setPasswordMessage({ text: 'Senha atualizada com sucesso!', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
            setPasswordStatus('idle');
            setPasswordMessage({ text: '', type: 'idle' });
        }, 5000);
    } catch (e: any) {
        console.error(e);
        setPasswordStatus('error');
        setPasswordMessage({ text: 'Erro ao atualizar. A senha pode ser muito fraca ou a permissão foi negada.', type: 'error' });
    }
  };


  const handleVerifyPlaceId = () => {
    const cleanInput = placeIdInput.trim();
    if (!cleanInput) return;
    
    setIsVerifying(true);
    setVerificationStatus('idle');
    setPlaceName('');

    // MOCK VERIFICATION LOGIC FOR DEMO
    setTimeout(() => {
      setIsVerifying(false);
      // Accept the specific mock ID OR any string > 10 chars to simulate success
      if (cleanInput === 'ChIJ2ef_nRV5GZURZqtdhmxRlx0') {
        setVerificationStatus('success');
        setPlaceName('GIO Estética Avançada Bom Fim - Porto Alegre/RS');
      } else if (cleanInput.length > 10) {
         setVerificationStatus('success');
         setPlaceName('Local Encontrado (Simulação)');
      } else {
        setVerificationStatus('error');
        return;
      }
      // If success, update the local settings state with this valid PlaceID
      const updated = { ...localSettings, placeId: cleanInput };
      setLocalSettings(updated);
    }, 1500);
  };
  
  const isLifetime = activePlan === 'growth_lifetime';

  return (
    <div className="p-8 min-h-screen bg-gray-50" style={{ colorScheme: 'light' }}>
      <div className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-500">Gerencie sua conta, assinatura e integrações.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${dbStatus === 'connected' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            <Database size={14} />
            {dbStatus === 'checking' && 'Verificando...'}
            {dbStatus === 'connected' && 'Supabase Online'}
            {dbStatus === 'error' && 'Erro de Conexão'}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div id="settings-company-details" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 scroll-mt-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserIcon size={20} className="text-gray-400" /> Detalhes da Conta
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                <input 
                  type="text" 
                  value={localSettings.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white text-gray-900" 
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                  placeholder="Sua Empresa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Administrativo</label>
                <input 
                  type="email" 
                  value={localSettings.adminEmail}
                  onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white text-gray-900" 
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                  placeholder="email@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input 
                  type="tel" 
                  value={localSettings.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white text-gray-900" 
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                <input 
                  type="url" 
                  value={localSettings.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white text-gray-900" 
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button 
                onClick={handleSaveAccountDetails}
                disabled={saveStatus === 'saving'}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  saveStatus === 'saved' 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {saveStatus === 'saving' && <Loader2 size={18} className="animate-spin" />}
                {saveStatus === 'saved' && <CheckCircle size={18} />}
                {saveStatus === 'idle' ? 'Salvar Alterações' : saveStatus === 'saving' ? 'Salvando...' : 'Salvo!'}
              </button>
            </div>
          </div>

           {/* Security / Password Change */}
           <div id="settings-password" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 scroll-mt-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={20} className="text-gray-400" /> Alterar Senha
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                    <div className="relative">
                        <Key className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input 
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-9 rounded-lg border-gray-300 shadow-sm p-2 border bg-white text-gray-900"
                            style={{ backgroundColor: '#ffffff', color: '#111827' }}
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                    <div className="relative">
                        <Key className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input 
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-9 rounded-lg border-gray-300 shadow-sm p-2 border bg-white text-gray-900"
                            style={{ backgroundColor: '#ffffff', color: '#111827' }}
                            placeholder="Repita a nova senha"
                        />
                    </div>
                 </div>
              </div>
              <div className="mt-4 flex justify-end items-center gap-4">
                 {passwordMessage.text && (
                    <p className={`text-sm font-medium ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordMessage.text}
                    </p>
                 )}
                 <button 
                    onClick={handleChangePassword}
                    disabled={passwordStatus === 'saving'}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors min-w-[150px] justify-center ${
                        passwordStatus === 'saved' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50'
                    }`}
                 >
                    {passwordStatus === 'saving' && <Loader2 size={18} className="animate-spin" />}
                    {passwordStatus === 'saved' && <CheckCircle size={18} />}
                    {passwordStatus === 'idle' || passwordStatus === 'error' ? 'Atualizar Senha' : passwordStatus === 'saving' ? 'Salvando...' : 'Senha Atualizada!'}
                 </button>
              </div>
           </div>

          {/* HelloRating Integrations */}
          <div id="settings-integrations" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 scroll-mt-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-purple-500" /> Integrações HelloRating
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Place ID</label>
                  
                  <div className="bg-blue-50 p-3 rounded-lg mb-3 text-sm text-blue-800 border border-blue-100">
                    <p className="mb-1">Para obter seu Place ID:</p>
                    <ol className="list-decimal ml-4 space-y-1 mb-2">
                      <li>Acesse o <a href="https://developers.google.com/maps/documentation/places/web-service/place-id?hl=pt-br" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-blue-600 inline-flex items-center gap-1">Localizador de Place IDs <ExternalLink size={12} /></a>.</li>
                      <li>Digite o endereço do seu negócio no mapa.</li>
                      <li>Copie o código que aparece no campo <strong>Place ID</strong>.</li>
                      <li>Cole o código abaixo e clique em verificar.</li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={placeIdInput}
                      onChange={(e) => {
                        setPlaceIdInput(e.target.value);
                        setVerificationStatus('idle');
                      }}
                      placeholder="Cole seu Place ID aqui (Ex: ChIJ...)" 
                      className={`flex-1 rounded-lg border shadow-sm p-2 bg-white text-gray-900 ${verificationStatus === 'error' ? 'border-red-300' : 'border-gray-300'}`} 
                      style={{ backgroundColor: '#ffffff', color: '#111827' }}
                    />
                    <button 
                      onClick={handleVerifyPlaceId}
                      disabled={isVerifying || !placeIdInput}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] justify-center"
                    >
                      {isVerifying ? <Loader2 size={18} className="animate-spin" /> : 'Verificar'}
                    </button>
                  </div>
                  {verificationStatus === 'success' && <div className="mt-2 text-sm text-green-600 flex items-center gap-2"><CheckCircle size={16} /> Local: <strong>{placeName}</strong></div>}
                  {verificationStatus === 'error' && <div className="mt-2 text-sm text-red-600 flex items-center gap-2"><AlertCircle size={16} /> Place ID inválido ou não encontrado.</div>}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input 
                    type="checkbox" 
                    id="auto-redirect" 
                    className="rounded text-primary-600" 
                    checked={localSettings.autoRedirect}
                    onChange={(e) => handleInputChange('autoRedirect', e.target.checked)}
                  />
                  <label htmlFor="auto-redirect" className="text-sm text-gray-700">Ativar redirecionamento automático para Promotores</label>
                </div>

                <div className="mt-4 flex justify-end">
                    <button 
                        onClick={handleSaveAccountDetails}
                        disabled={saveStatus === 'saving'}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        saveStatus === 'saved' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                        }`}
                    >
                        {saveStatus === 'saving' && <Loader2 size={18} className="animate-spin" />}
                        {saveStatus === 'saved' && <CheckCircle size={18} />}
                        {saveStatus === 'idle' ? 'Salvar Integrações' : saveStatus === 'saving' ? 'Salvando...' : 'Salvo!'}
                    </button>
                </div>
              </div>
            </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-gray-400" /> Assinatura
            </h2>
            <div className={`bg-primary-50 rounded-lg p-4 mb-4 border ${isLifetime ? 'border-yellow-400 bg-gray-900' : 'border-primary-100'}`}>
              <p className={`text-xs font-bold uppercase mb-1 ${isLifetime ? 'text-yellow-400' : 'text-primary-600'}`}>PLANO ATUAL</p>
              <p className={`text-xl font-bold capitalize ${isLifetime ? 'text-white' : 'text-gray-900'}`}>
                {isLifetime ? 'Lifetime Pro 🚀' : activePlan}
              </p>
            </div>
            {!isLifetime && <button onClick={() => onSelectPlan('growth')} className="w-full mt-2 py-2 border border-primary-600 text-primary-600 rounded-lg font-medium">Upgrade</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
