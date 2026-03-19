import React, { useState, useEffect, KeyboardEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bell, Mail, MessageSquare, Clock, CheckCircle, AlertCircle,
  Loader2, Save, Calendar, Info, Users, PieChart, Send, Plus, X
} from 'lucide-react';
import { User } from '@/types';

interface ReportSettingsProps {
  currentUser?: User;
  userRole?: string;
}

interface ReportConfig {
  id?: string;
  // legado (campo único)
  whatsapp_number: string;
  email_recipient: string;
  // novos campos (múltiplos)
  whatsapp_numbers: string[];
  email_recipients: string[];
  daily_enabled: boolean;
  weekly_enabled: boolean;
  monthly_enabled: boolean;
  scheduled_time: string;
}

// ─── Componente de lista de contatos (tags) ───────────────────────────────────
interface ContactListProps {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  hint: string;
  type: 'tel' | 'email';
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

const ContactList: React.FC<ContactListProps> = ({
  label, icon, placeholder, hint, type, values, onChange, disabled
}) => {
  const [inputValue, setInputValue] = useState('');

  const addContact = () => {
    const v = inputValue.trim();
    if (!v || values.includes(v)) { setInputValue(''); return; }
    onChange([...values, v]);
    setInputValue('');
  };

  const removeContact = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addContact(); }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <span className="flex items-center gap-2">{icon} {label}</span>
      </label>

      {/* Tags dos contatos cadastrados */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {values.map((v, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-1 rounded-full"
            >
              {v}
              {!disabled && (
                <button
                  onClick={() => removeContact(i)}
                  className="text-emerald-500 hover:text-red-500 transition-colors"
                  aria-label="Remover"
                >
                  <X size={13} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input para adicionar novo contato */}
      {!disabled && (
        <div className="flex gap-2">
          <input
            type={type}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 rounded-lg border-gray-300 shadow-sm p-2 border bg-white text-gray-900 text-sm focus:ring-emerald-500 focus:border-emerald-500"
          />
          <button
            onClick={addContact}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Adicionar
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const ReportSettings: React.FC<ReportSettingsProps> = ({ currentUser, userRole = 'admin' }) => {
  const isReadOnly = userRole === 'viewer';
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState({ text: '', type: 'idle' as 'idle' | 'success' | 'error' });

  const companyId = currentUser?.id || null;

  const [config, setConfig] = useState<ReportConfig>({
    whatsapp_number: '',
    email_recipient: currentUser?.email || '',
    whatsapp_numbers: [],
    email_recipients: [],
    daily_enabled: false,
    weekly_enabled: false,
    monthly_enabled: false,
    scheduled_time: '08:00'
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!companyId) { setLoading(false); return; }
      try {
        setLoading(true);
        const { data } = await supabase
          .from('report_settings')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle();

        if (data) {
          // Migrar campo legado para array se necessário
          const legacyWhats = data.whatsapp_number || '';
          const legacyEmail = data.email_recipient || '';
          let whatsNums: string[] = Array.isArray(data.whatsapp_numbers) ? data.whatsapp_numbers : [];
          let emailRecs: string[] = Array.isArray(data.email_recipients) ? data.email_recipients : [];

          // Incluir legado se não estiver na lista
          if (legacyWhats && !whatsNums.includes(legacyWhats)) whatsNums = [legacyWhats, ...whatsNums];
          if (legacyEmail && !emailRecs.includes(legacyEmail)) emailRecs = [legacyEmail, ...emailRecs];

          setConfig({
            id: data.id,
            whatsapp_number: legacyWhats,
            email_recipient: legacyEmail,
            whatsapp_numbers: whatsNums,
            email_recipients: emailRecs,
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

  const handleToggle = (field: 'daily_enabled' | 'weekly_enabled' | 'monthly_enabled') => {
    if (isReadOnly) return;
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!companyId || isReadOnly) return;
    setSaveStatus('saving');
    setMessage({ text: '', type: 'idle' });

    try {
      const payload = {
        company_id: companyId,
        // Manter campo legado com o primeiro número/email (compatibilidade)
        whatsapp_number: config.whatsapp_numbers[0] || '',
        email_recipient: config.email_recipients[0] || '',
        // Novos campos com todos os contatos
        whatsapp_numbers: config.whatsapp_numbers,
        email_recipients: config.email_recipients,
        daily_enabled: config.daily_enabled,
        weekly_enabled: config.weekly_enabled,
        monthly_enabled: config.monthly_enabled,
        scheduled_time: '09:00:00'
      };

      let error;
      if (config.id) {
        const { error: updateError } = await supabase
          .from('report_settings').update(payload).eq('id', config.id);
        error = updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('report_settings').insert([payload]).select();
        error = insertError;
        if (data?.[0]) setConfig(prev => ({ ...prev, id: data[0].id }));
      }

      if (error) throw error;

      setSaveStatus('saved');
      setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
      setTimeout(() => { setSaveStatus('idle'); setMessage({ text: '', type: 'idle' }); }, 3000);
    } catch (e: any) {
      setSaveStatus('error');
      setMessage({ text: `Erro ao salvar: ${e.message || 'Tente novamente.'}`, type: 'error' });
    }
  };

  const handleTestWhatsApp = async () => {
    if (config.whatsapp_numbers.length === 0) {
      setMessage({ text: 'Adicione ao menos um número de WhatsApp antes de testar.', type: 'error' });
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
          whatsappNumber: config.whatsapp_numbers[0]
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
      setTimeout(() => { setTestStatus('idle'); setMessage({ text: '', type: 'idle' }); }, 4000);
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
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Users size={20} className="text-gray-400" /> Destinatários
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Adicione quantos números e e-mails quiser. Todos receberão os relatórios.
          </p>

          <div className="space-y-6">
            <ContactList
              label="Números de WhatsApp"
              icon={<MessageSquare size={16} className="text-green-500" />}
              placeholder="Ex: 5511999999999"
              hint="Inclua o código do país (55) e DDD. Pressione Enter ou clique em Adicionar."
              type="tel"
              values={config.whatsapp_numbers}
              onChange={v => { setConfig(prev => ({ ...prev, whatsapp_numbers: v })); setSaveStatus('idle'); }}
              disabled={isReadOnly}
            />

            <div className="border-t border-gray-100" />

            <ContactList
              label="E-mails de Destino"
              icon={<Mail size={16} className="text-blue-500" />}
              placeholder="exemplo@email.com"
              hint="Pressione Enter ou clique em Adicionar para incluir mais e-mails."
              type="email"
              values={config.email_recipients}
              onChange={v => { setConfig(prev => ({ ...prev, email_recipients: v })); setSaveStatus('idle'); }}
              disabled={isReadOnly}
            />
          </div>

          {/* Botão de Teste */}
          {!isReadOnly && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <button
                onClick={handleTestWhatsApp}
                disabled={testStatus === 'sending' || config.whatsapp_numbers.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  testStatus === 'sending'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : testStatus === 'sent'
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : config.whatsapp_numbers.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
              {config.whatsapp_numbers.length > 0 && (
                <p className="text-xs text-gray-400 mt-1.5">
                  O teste será enviado para: {config.whatsapp_numbers[0]}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Card: Periodicidade */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-gray-400" /> Periodicidade do Relatório
          </h2>
          <div className="space-y-4">
            {/* Diário */}
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

            {/* Semanal */}
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

            {/* Mensal */}
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
