import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Save,
  Calendar,
  Info,
  Users,
  PieChart,
  Send
} from 'lucide-react';
import { User } from '@/types';

interface ReportSettingsProps {
  currentUser?: User;
  userRole?: string;
}

interface ReportConfig {
  id?: string;
  whatsapp_number: string;
  email_recipient: string;
  daily_enabled: boolean;
  weekly_enabled: boolean;
  monthly_enabled: boolean;
  scheduled_time: string;
}

const ReportSettings: React.FC<ReportSettingsProps> = ({ currentUser, userRole = 'admin' }) => {
  const isReadOnly = userRole === 'viewer';
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState({ text: '', type: 'idle' as 'idle' | 'success' | 'error' });
  
  // No pre-production/main, o company_id é o próprio user.id (que é o tenant_id)
  const companyId = currentUser?.id || null;
  
  const [config, setConfig] = useState<ReportConfig>({
    whatsapp_number: '',
    email_recipient: currentUser?.email || '',
    daily_enabled: false,
    weekly_enabled: false,
    monthly_enabled: false,
    scheduled_time: '08:00'
  });

  // Carrega as configurações quando o companyId estiver disponível
  useEffect(() => {
    const loadSettings = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const { data } = await supabase
          .from('report_settings')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle();

        if (data) {
          setConfig({
            id: data.id,
            whatsapp_number: data.whatsapp_number || '',
            email_recipient: data.email_recipient || '',
            daily_enabled: data.daily_enabled || false,
            weekly_enabled: data.weekly_enabled || false,
            monthly_enabled: data.monthly_enabled || false,
            scheduled_time: data.scheduled_time?.substring(0, 5) || '08:00'
          });
        }
      } catch (e) {
        console.error('Erro ao carregar configurações de relatório:', e);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [companyId]);

  const handleToggle = (field: keyof ReportConfig) => {
    if (isReadOnly) return;
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
    setSaveStatus('idle');
  };

  const handleInputChange = (field: keyof ReportConfig, value: string) => {
    if (isReadOnly) return;
    setConfig(prev => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!companyId || isReadOnly) return;
    
    setSaveStatus('saving');
    setMessage({ text: '', type: 'idle' });

    try {
      const payload = {
        company_id: companyId,
        whatsapp_number: config.whatsapp_number,
        email_recipient: config.email_recipient,
        daily_enabled: config.daily_enabled,
        weekly_enabled: config.weekly_enabled,
        monthly_enabled: config.monthly_enabled,
        scheduled_time: '09:00:00'
      };

      let error;
      if (config.id) {
        const { error: updateError } = await supabase
          .from('report_settings')
          .update(payload)
          .eq('id', config.id);
        error = updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('report_settings')
          .insert([payload])
          .select();
        error = insertError;
        if (data?.[0]) setConfig(prev => ({ ...prev, id: data[0].id }));
      }

      if (error) throw error;

      setSaveStatus('saved');
      setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
      setTimeout(() => {
        setSaveStatus('idle');
        setMessage({ text: '', type: 'idle' });
      }, 3000);
    } catch (e: any) {
      console.error('Erro ao salvar:', e);
      setSaveStatus('error');
      setMessage({ text: `Erro ao salvar: ${e.message || 'Tente novamente.'}`, type: 'error' });
    }
  };

  const handleTestWhatsApp = async () => {
    if (!config.whatsapp_number) {
      setMessage({ text: 'Preencha o número de WhatsApp antes de testar.', type: 'error' });
      return;
    }

    setTestStatus('sending');
    setMessage({ text: '', type: 'idle' });

    try {
      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          companyId,
          whatsappNumber: config.whatsapp_number
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao enviar');

      setTestStatus('sent');
      setMessage({ text: 'Mensagem de teste enviada com sucesso!', type: 'success' });
    } catch (e: any) {
      setTestStatus('error');
      setMessage({ text: `Erro no teste: ${e.message}`, type: 'error' });
    } finally {
      setTimeout(() => {
        setTestStatus('idle');
        setMessage({ text: '', type: 'idle' });
      }, 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="text-emerald-600" size={24} /> Relatórios e Notificações
        </h1>
        <p className="text-gray-500">Configure o envio automático de KPIs por WhatsApp e E-mail.</p>
      </div>

      <div className="max-w-4xl space-y-6">

        {/* Card: Destinatários */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} className="text-gray-400" /> Destinatários
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-green-500" /> WhatsApp
                </span>
              </label>
              <input 
                type="tel" 
                value={config.whatsapp_number}
                onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
                disabled={isReadOnly}
                placeholder="Ex: 5511999999999"
                className="w-full rounded-lg border-gray-300 shadow-sm p-2 border bg-white text-gray-900 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-1">Inclua o código do país (55) e DDD.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-2">
                  <Mail size={16} className="text-blue-500" /> E-mail de Destino
                </span>
              </label>
              <input 
                type="email" 
                value={config.email_recipient}
                onChange={(e) => handleInputChange('email_recipient', e.target.value)}
                disabled={isReadOnly}
                placeholder="exemplo@email.com"
                className="w-full rounded-lg border-gray-300 shadow-sm p-2 border bg-white text-gray-900 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Botão de Teste */}
          {!isReadOnly && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleTestWhatsApp}
                disabled={testStatus === 'sending'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  testStatus === 'sending' 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : testStatus === 'sent'
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                }`}
              >
                {testStatus === 'sending' ? (
                  <><Loader2 size={16} className="animate-spin" /> Enviando teste...</>
                ) : testStatus === 'sent' ? (
                  <><CheckCircle size={16} /> Teste enviado!</>
                ) : (
                  <><Send size={16} /> Enviar mensagem de teste no WhatsApp</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Card: Periodicidade */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-gray-400" /> Periodicidade do Relatório
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.daily_enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                  <Clock size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Relatório Diário</p>
                  <p className="text-sm text-gray-500">Resumo das atividades das últimas 24h.</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('daily_enabled')}
                disabled={isReadOnly}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.daily_enabled ? 'bg-emerald-500' : 'bg-gray-300'
                } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.daily_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.weekly_enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Relatório Semanal</p>
                  <p className="text-sm text-gray-500">Enviado toda segunda-feira com o fechamento da semana.</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('weekly_enabled')}
                disabled={isReadOnly}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.weekly_enabled ? 'bg-emerald-500' : 'bg-gray-300'
                } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.weekly_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.monthly_enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                  <PieChart size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Relatório Mensal</p>
                  <p className="text-sm text-gray-500">Enviado no 1º dia do mês com o balanço do mês anterior.</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('monthly_enabled')}
                disabled={isReadOnly}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.monthly_enabled ? 'bg-emerald-500' : 'bg-gray-300'
                } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.monthly_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Horário Fixo */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Horário de envio: todo dia às 9h da manhã</p>
                <p className="text-xs text-emerald-600 mt-0.5">O relatório é enviado automaticamente com os dados do dia anterior.</p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2">
            <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              Os relatórios são processados e enviados automaticamente às 9h, 
              consolidando os KPIs de Vendas e NPS do dia anterior.
            </p>
          </div>
        </div>

        {/* Mensagem de Status */}
        {message.text && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : ''
          }`}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Botão Salvar */}
        {!isReadOnly && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all ${
                saveStatus === 'saving'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : saveStatus === 'saved'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {saveStatus === 'saving' ? (
                <><Loader2 size={18} className="animate-spin" /> Salvando...</>
              ) : saveStatus === 'saved' ? (
                <><CheckCircle size={18} /> Salvo!</>
              ) : (
                <><Save size={18} /> Salvar Configurações</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportSettings;
