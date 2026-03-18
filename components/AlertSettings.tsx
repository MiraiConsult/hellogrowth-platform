'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, BellOff, Phone, Save, TestTube, CheckCircle,
  AlertTriangle, TrendingUp, TrendingDown, Star, MessageSquare,
  Clock, UserX, Loader2, Info
} from 'lucide-react';

interface AlertSettingsData {
  id?: string;
  company_id: string;
  whatsapp_number: string | null;
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
}

interface AlertSettingsProps {
  companyId: string;
  companyName: string;
  activePlan: string; // 'hello_client' | 'hello_rating' | 'hello_growth'
}

const DEFAULT_SETTINGS: Omit<AlertSettingsData, 'company_id'> = {
  whatsapp_number: '',
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
};

// Verifica se o plano tem acesso ao módulo de vendas
const hasSalesModule = (plan: string) =>
  plan === 'hello_client' || plan === 'hello_growth' || plan === 'lifetime';

// Verifica se o plano tem acesso ao módulo de NPS
const hasNPSModule = (plan: string) =>
  plan === 'hello_rating' || plan === 'hello_growth' || plan === 'lifetime';

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
        setSettings({ ...json.settings, company_id: companyId });
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/alert-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, ...settings }),
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
    if (!settings.whatsapp_number) {
      setError('Informe o número de WhatsApp antes de testar.');
      return;
    }
    setTesting(true);
    setError(null);
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          companyId,
          whatsappNumber: settings.whatsapp_number,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha no envio');
      alert('✅ Mensagem de teste enviada com sucesso!');
    } catch (e: any) {
      setError(e.message);
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

      {/* Número de WhatsApp */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Phone size={14} className="inline mr-1" />
          Número de WhatsApp para alertas
        </label>
        <div className="flex gap-2">
          <input
            type="tel"
            value={settings.whatsapp_number || ''}
            onChange={e => update('whatsapp_number', e.target.value)}
            placeholder="5511999999999 (com DDI e DDD)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleTest}
            disabled={testing || !settings.whatsapp_number}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
            Testar
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Formato: código do país + DDD + número. Ex: 5547999998888
        </p>
      </div>

      {/* Alertas de Pré-venda */}
      {hasSales && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pré-venda</h3>
          </div>

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
            enabled={settings.alert_lead_won}
            onChange={v => update('alert_lead_won', v)}
            icon={<CheckCircle size={16} />}
            title="Venda Fechada"
            description="Alerta quando um lead é movido para 'Vendido' no Kanban"
            badge="Tempo real"
            badgeColor="bg-emerald-100 text-emerald-700"
          />

          <AlertToggle
            enabled={settings.alert_lead_lost}
            onChange={v => update('alert_lead_lost', v)}
            icon={<UserX size={16} />}
            title="Lead Perdido"
            description="Alerta quando um lead é movido para 'Perdido' no Kanban"
            badge="Tempo real"
            badgeColor="bg-red-100 text-red-700"
          />

          <AlertToggle
            enabled={settings.alert_stale_lead}
            onChange={v => update('alert_stale_lead', v)}
            icon={<Clock size={16} />}
            title="Lead Parado"
            description="Alerta diário para leads sem movimentação há X dias"
            badge="Diário"
            badgeColor="bg-yellow-100 text-yellow-700"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Parado há mais de</span>
              <input
                type="number"
                value={settings.stale_lead_days}
                onChange={e => update('stale_lead_days', Number(e.target.value))}
                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                min={1}
                max={90}
              />
              <span className="text-xs text-gray-600">dias</span>
            </div>
          </AlertToggle>
        </div>
      )}

      {/* Alertas de NPS */}
      {hasNPS && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star size={15} className="text-yellow-500" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Satisfação do Cliente</h3>
          </div>

          <AlertToggle
            enabled={settings.alert_detractor}
            onChange={v => update('alert_detractor', v)}
            icon={<AlertTriangle size={16} />}
            title="Detrator (NPS ≤ 6)"
            description="Alerta imediato quando um cliente dá nota de 0 a 6 — ação urgente recomendada"
            badge="Urgente · Tempo real"
            badgeColor="bg-red-100 text-red-700"
          />

          <AlertToggle
            enabled={settings.alert_promoter}
            onChange={v => update('alert_promoter', v)}
            icon={<Star size={16} />}
            title="Promotor (NPS ≥ 9)"
            description="Alerta quando um cliente dá nota 9 ou 10 — oportunidade de pedir indicação"
            badge="Tempo real"
            badgeColor="bg-emerald-100 text-emerald-700"
          />

          <AlertToggle
            enabled={settings.alert_neutral_with_comment}
            onChange={v => update('alert_neutral_with_comment', v)}
            icon={<MessageSquare size={16} />}
            title="Neutro com Comentário (NPS 7-8)"
            description="Alerta quando um cliente neutro deixa um comentário — feedback valioso"
            badge="Tempo real"
            badgeColor="bg-yellow-100 text-yellow-700"
          />
        </div>
      )}

      {/* Alertas de Trial (apenas Growth ou admin) */}
      {(activePlan === 'hello_growth' || activePlan === 'lifetime') && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Gestão de Trials</h3>
          </div>

          <AlertToggle
            enabled={settings.alert_trial_expiring}
            onChange={v => update('alert_trial_expiring', v)}
            icon={<Clock size={16} />}
            title="Trial Expirando"
            description="Alerta 3 dias antes do trial de um cliente expirar — envie o link de pagamento"
            badge="Diário"
            badgeColor="bg-purple-100 text-purple-700"
          />
        </div>
      )}

      {/* Aviso para planos sem módulo */}
      {!hasSales && !hasNPS && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Os alertas disponíveis dependem do seu plano. Faça upgrade para Hello Growth para ter acesso a todos os alertas.
          </p>
        </div>
      )}

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
