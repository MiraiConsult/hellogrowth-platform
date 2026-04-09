'use client';

import React, { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import {
  Bell, BellOff, Phone, Save, TestTube, CheckCircle,
  AlertTriangle, TrendingUp, TrendingDown, Star, MessageSquare,
  Clock, UserX, Loader2, Info, Plus, X
} from 'lucide-react';

interface AlertSettingsData {
  id?: string;
  company_id: string;
  whatsapp_number: string | null;
  whatsapp_numbers: string[];
  alert_new_lead: boolean;
  alert_high_value_lead: boolean;
  high_value_threshold: number;
  alert_lead_won: boolean;
  alert_lead_lost: boolean;
  alert_detractor: boolean;
  alert_promoter: boolean;
  alert_neutral_with_comment: boolean;
  alert_trial_expiring: boolean;
  alert_stale_lead: boolean;
  stale_lead_days: number;
  alert_new_google_review: boolean;
}

interface AlertSettingsProps {
  companyId: string;
  companyName: string;
  activePlan: string; // 'hello_client' | 'hello_rating' | 'hello_growth'
}

const DEFAULT_SETTINGS: Omit<AlertSettingsData, 'company_id'> = {
  whatsapp_number: '',
  whatsapp_numbers: [],
  alert_new_lead: true,
  alert_high_value_lead: true,
  high_value_threshold: 1000,
  alert_lead_won: true,
  alert_lead_lost: false,
  alert_detractor: true,
  alert_promoter: false,
  alert_neutral_with_comment: false,
  alert_trial_expiring: true,
  alert_stale_lead: false,
  stale_lead_days: 7,
  alert_new_google_review: true,
};

// Verifica se o plano tem acesso ao módulo de vendas
const hasSalesModule = (plan: string) =>
  plan === 'hello_client' || plan === 'hello_growth' || plan === 'lifetime' ||
  plan === 'client' || plan === 'growth' || plan === 'growth_lifetime' || plan === 'trial';

// Verifica se o plano tem acesso ao módulo de NPS
const hasNPSModule = (plan: string) =>
  plan === 'hello_rating' || plan === 'hello_growth' || plan === 'lifetime' ||
  plan === 'rating' || plan === 'growth' || plan === 'growth_lifetime' || plan === 'trial';

interface AlertToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

const AlertToggle: React.FC<AlertToggleProps> = ({
  enabled, onChange, icon, title, description, badge, badgeColor, disabled, children
}) => (
  <div className={`border rounded-xl p-4 transition-all ${
    disabled
      ? 'border-gray-100 bg-gray-50 opacity-50'
      : enabled
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-gray-200 bg-white hover:border-gray-300'
  }`}>
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 p-2 rounded-lg ${enabled && !disabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{title}</span>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor || 'bg-gray-100 text-gray-600'}`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        {enabled && !disabled && children && (
          <div className="mt-3">{children}</div>
        )}
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          enabled && !disabled ? 'bg-emerald-500' : 'bg-gray-300'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled && !disabled ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  </div>
);

const AlertSettings: React.FC<AlertSettingsProps> = ({ companyId, companyName, activePlan }) => {
  const [settings, setSettings] = useState<AlertSettingsData>({
    company_id: companyId,
    ...DEFAULT_SETTINGS,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [whatsInput, setWhatsInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSales = hasSalesModule(activePlan);
  const hasNPS = hasNPSModule(activePlan);

  // Carrega configurações existentes
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/alert-settings?companyId=${companyId}`);
      const json = await res.json();
      if (json.settings) {
        const s = json.settings;
        // Migrar campo legado para array
        let nums: string[] = Array.isArray(s.whatsapp_numbers) ? s.whatsapp_numbers : [];
        if (s.whatsapp_number && !nums.includes(s.whatsapp_number)) nums = [s.whatsapp_number, ...nums];
        setSettings({ ...s, company_id: companyId, whatsapp_numbers: nums });
      }
    } catch (e) {
      console.error('Erro ao carregar alertas:', e);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const update = (field: keyof AlertSettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const addWhatsNumber = () => {
    const v = whatsInput.trim();
    if (!v || settings.whatsapp_numbers.includes(v)) { setWhatsInput(''); return; }
    update('whatsapp_numbers', [...settings.whatsapp_numbers, v]);
    setWhatsInput('');
  };

  const removeWhatsNumber = (idx: number) => {
    update('whatsapp_numbers', settings.whatsapp_numbers.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...settings,
        // Manter campo legado com o primeiro número
        whatsapp_number: settings.whatsapp_numbers[0] || settings.whatsapp_number || '',
        whatsapp_numbers: settings.whatsapp_numbers,
      };
      const res = await fetch('/api/alert-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    // Usa o primeiro número salvo, ou o número digitado no campo, ou o campo legado
    const testNumber = settings.whatsapp_numbers[0] || whatsInput.trim() || settings.whatsapp_number;
    if (!testNumber) {
      setError('Adicione ao menos um número de WhatsApp antes de testar.');
      return;
    }
    setTesting(true);
    setError(null);
    try {
      // Usa a rota de status/teste do admin que já funciona com Evolution API
      const res = await fetch('/api/admin/whatsapp-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testNumber,
          message: `✅ *HelloGrowth — Teste de Alertas*\n\n🏢 ${companyName}\n\nSeus alertas por WhatsApp estão configurados e funcionando! 🎉\n\nVocê receberá notificações em tempo real sobre:\n• Novos leads\n• Detratores NPS\n• Leads de alto valor\n• Trials expirando\n\n_HelloGrowth — Plataforma de Gestão Comercial_`,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Falha no envio. Verifique se as variáveis EVOLUTION_API_KEY estão configuradas no Vercel.');
      alert('✅ Mensagem de teste enviada com sucesso!');
    } catch (e: any) {
      setError(`Erro ao enviar: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-emerald-500" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-xl">
          <Bell className="text-emerald-600" size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Alertas por WhatsApp</h2>
          <p className="text-sm text-gray-500">Receba notificações em tempo real dos eventos importantes</p>
        </div>
      </div>

      {/* Números de WhatsApp */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Phone size={14} className="inline mr-1" />
          Números de WhatsApp para alertas
        </label>

        {/* Tags dos números cadastrados */}
        {settings.whatsapp_numbers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {settings.whatsapp_numbers.map((num, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-1 rounded-full">
                {num}
                <button onClick={() => removeWhatsNumber(i)} className="text-emerald-500 hover:text-red-500 transition-colors" aria-label="Remover">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input para adicionar */}
        <div className="flex gap-2">
          <input
            type="tel"
            value={whatsInput}
            onChange={e => setWhatsInput(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addWhatsNumber(); } }}
            placeholder="5511999999999 (com DDI e DDD)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={addWhatsNumber}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} /> Adicionar
          </button>
          <button
            onClick={handleTest}
            disabled={testing || (settings.whatsapp_numbers.length === 0 && !whatsInput.trim())}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
            Testar
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Formato: código do país + DDD + número. Ex: 5547999998888. Pressione Enter ou clique em Adicionar.
        </p>
      </div>

      {/* Alertas */}
      <div className="space-y-3">
        <AlertToggle
          enabled={settings.alert_new_lead}
          onChange={v => update('alert_new_lead', v)}
          icon={<Bell size={16} />}
          title="Novo Lead"
          description="Alerta quando um formulário é preenchido e um novo lead entra no sistema"
          badge="Tempo real"
          badgeColor="bg-blue-100 text-blue-700"
        />

        <AlertToggle
          enabled={settings.alert_high_value_lead}
          onChange={v => update('alert_high_value_lead', v)}
          icon={<TrendingUp size={16} />}
          title="Lead de Alto Valor"
          description="Alerta quando um lead ultrapassa o valor mínimo configurado"
          badge="Tempo real"
          badgeColor="bg-orange-100 text-orange-700"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Valor mínimo: R$</span>
            <input
              type="number"
              value={settings.high_value_threshold}
              onChange={e => update('high_value_threshold', Number(e.target.value))}
              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              min={0}
              step={100}
            />
          </div>
        </AlertToggle>

        <AlertToggle
          enabled={settings.alert_detractor}
          onChange={v => update('alert_detractor', v)}
          icon={<AlertTriangle size={16} />}
          title="Novo Detrator (NPS ≤ 6)"
          description="Alerta imediato quando um cliente dá nota de 0 a 6 — ação urgente recomendada"
          badge="Urgente · Tempo real"
          badgeColor="bg-red-100 text-red-700"
        />
      </div>



      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Botão salvar */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          As configurações são salvas por empresa e aplicadas imediatamente.
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-900 hover:bg-gray-700 text-white'
          } disabled:opacity-60`}
        >
          {saving ? (
            <Loader2 size={15} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={15} />
          ) : (
            <Save size={15} />
          )}
          {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
};

export default AlertSettings;
