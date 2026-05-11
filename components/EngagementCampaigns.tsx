'use client';

import React, { useState, useEffect } from 'react';
import { Star, Users, Save, Loader2, ToggleLeft, ToggleRight, AlertCircle, CheckCircle, Link, ChevronDown, ChevronUp } from 'lucide-react';

interface EngagementCampaign {
  id?: string;
  type: 'google_review' | 'referral';
  name: string;
  status: 'active' | 'inactive';
  reward_description: string;
  reward_condition: string;
  game_enabled: boolean;
  game_target: string | null;
  ai_enabled: boolean;
  ai_trigger: string | null;
  ai_trigger_days: number | null;
  google_review_url: string | null;
}

interface EngagementCampaignsProps {
  tenantId: string;
  googlePlaceId?: string;
}

const DEFAULT_REVIEW: EngagementCampaign = {
  type: 'google_review',
  name: 'Campanha Google Review',
  status: 'active',
  reward_description: '',
  reward_condition: '',
  game_enabled: false,
  game_target: 'review',
  ai_enabled: false,
  ai_trigger: 'promoter',
  ai_trigger_days: null,
  google_review_url: '',
};

const DEFAULT_REFERRAL: EngagementCampaign = {
  type: 'referral',
  name: 'Campanha de Indicação',
  status: 'active',
  reward_description: '',
  reward_condition: '',
  game_enabled: false,
  game_target: 'referral',
  ai_enabled: false,
  ai_trigger: 'promoter',
  ai_trigger_days: null,
  google_review_url: null,
};

const AI_TRIGGER_OPTIONS = [
  { value: 'promoter', label: 'Promotores NPS (nota ≥ 9)' },
  { value: 'after_appointment', label: 'Após agendamento confirmado' },
  { value: 'after_days', label: 'X dias após o cadastro' },
];

const REWARD_CONDITION_OPTIONS = [
  { value: 'scheduled', label: 'Quando o indicado agendar' },
  { value: 'attended', label: 'Quando o indicado comparecer' },
  { value: 'closed', label: 'Quando o indicado fechar negócio' },
  { value: 'form_submitted', label: 'Quando o indicado preencher o formulário' },
];

export default function EngagementCampaigns({ tenantId, googlePlaceId }: EngagementCampaignsProps) {
  const autoGoogleReviewUrl = googlePlaceId
    ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
    : '';

  const [reviewCampaign, setReviewCampaign] = useState<EngagementCampaign>(DEFAULT_REVIEW);
  const [referralCampaign, setReferralCampaign] = useState<EngagementCampaign>(DEFAULT_REFERRAL);
  const [saving, setSaving] = useState<'review' | 'referral' | null>(null);
  const [saved, setSaved] = useState<'review' | 'referral' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewExpanded, setReviewExpanded] = useState(true);
  const [referralExpanded, setReferralExpanded] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, [tenantId]);

  useEffect(() => {
    if (googlePlaceId && !reviewCampaign.google_review_url) {
      setReviewCampaign(prev => ({
        ...prev,
        google_review_url: `https://search.google.com/local/writereview?placeid=${googlePlaceId}`,
      }));
    }
  }, [googlePlaceId]);

  const loadCampaigns = async () => {
    try {
      const res = await fetch('/api/engagement/campaigns', {
        headers: { 'x-tenant-id': tenantId },
      });
      if (res.ok) {
        const data: EngagementCampaign[] = await res.json();
        const review = data.find((c) => c.type === 'google_review');
        const referral = data.find((c) => c.type === 'referral');
        if (review) {
          if (!review.google_review_url && googlePlaceId) {
            review.google_review_url = `https://search.google.com/local/writereview?placeid=${googlePlaceId}`;
          }
          setReviewCampaign(review);
        }
        if (referral) setReferralCampaign(referral);
      }
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err);
    }
  };

  const saveCampaign = async (campaign: EngagementCampaign, type: 'review' | 'referral') => {
    setSaving(type);
    setError(null);
    try {
      const method = campaign.id ? 'PUT' : 'POST';
      const res = await fetch('/api/engagement/campaigns', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(campaign),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar campanha');
      }

      const savedData = await res.json();
      if (type === 'review') setReviewCampaign(savedData);
      else setReferralCampaign(savedData);

      setSaved(type);
      setTimeout(() => setSaved(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const renderToggle = (
    value: boolean,
    onChange: (v: boolean) => void,
    label: string,
    description?: string
  ) => (
    <div className="flex items-start gap-3">
      <button onClick={() => onChange(!value)} className="mt-0.5 flex-shrink-0">
        {value ? (
          <ToggleRight className="w-8 h-8 text-pink-500" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-gray-300" />
        )}
      </button>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Explicação */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Como funcionam as campanhas de engajamento</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Configure campanhas para pedir avaliações no Google e indicações de novos clientes.
          Cada campanha pode ser ativada por dois canais independentes: a <strong>Roleta</strong> (após NPS positivo)
          e a <strong>IA no WhatsApp</strong>. O sistema evita abordar o mesmo cliente duas vezes.
        </p>
      </div>

      {/* Card Google Review */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div
          className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setReviewExpanded(!reviewExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Google Review</h3>
              <p className="text-xs text-gray-500">Incentive avaliações no Google</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              reviewCampaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {reviewCampaign.status === 'active' ? 'Ativa' : 'Inativa'}
            </span>
            {reviewExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        {reviewExpanded && (
          <div className="px-5 pb-5 border-t border-gray-100 space-y-5">
            {/* Status */}
            <div className="pt-4">
              {renderToggle(
                reviewCampaign.status === 'active',
                (v) => setReviewCampaign({ ...reviewCampaign, status: v ? 'active' : 'inactive' }),
                'Campanha ativa',
                'Quando ativa, os canais configurados abaixo funcionarão'
              )}
            </div>

            {/* Link do Google */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Link className="w-4 h-4 inline mr-1" />
                Link do Google Review
                {googlePlaceId && reviewCampaign.google_review_url === autoGoogleReviewUrl && (
                  <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    Preenchido automaticamente
                  </span>
                )}
              </label>
              <input
                type="url"
                value={reviewCampaign.google_review_url || ''}
                onChange={(e) => setReviewCampaign({ ...reviewCampaign, google_review_url: e.target.value })}
                placeholder={googlePlaceId ? autoGoogleReviewUrl : 'https://g.page/r/...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              {!googlePlaceId ? (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Cadastre o Place ID do Google no <strong>Perfil do Negócio</strong> para preencher automaticamente
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Link gerado automaticamente pelo Place ID cadastrado. Você pode editar se necessário.
                </p>
              )}
            </div>

            {/* Canais */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-5">
              <h4 className="text-sm font-semibold text-gray-700">Como oferecer o prêmio</h4>

              {/* Via Roleta */}
              <div className="space-y-3">
                {renderToggle(
                  reviewCampaign.game_enabled,
                  (v) => setReviewCampaign({ ...reviewCampaign, game_enabled: v }),
                  'Via Roleta da Sorte',
                  'Após o NPS, o cliente gira a roleta e ganha o prêmio configurado na aba Roleta'
                )}
                {reviewCampaign.game_enabled && (
                  <div className="ml-11 text-xs text-blue-600 bg-blue-50 rounded-lg p-2.5">
                    🎯 O prêmio exibido na roleta é configurado na aba <strong>Roleta</strong>. Ative a roleta e configure os prêmios lá.
                  </div>
                )}
              </div>

              {/* Via IA */}
              <div className="space-y-3">
                {renderToggle(
                  reviewCampaign.ai_enabled,
                  (v) => setReviewCampaign({ ...reviewCampaign, ai_enabled: v }),
                  'Via IA no WhatsApp',
                  'A IA pede avaliação pelo WhatsApp e menciona o prêmio abaixo'
                )}
                {reviewCampaign.ai_enabled && (
                  <div className="ml-11 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Prêmio oferecido pela IA (opcional)</label>
                      <input
                        type="text"
                        value={reviewCampaign.reward_description}
                        onChange={(e) => setReviewCampaign({ ...reviewCampaign, reward_description: e.target.value })}
                        placeholder="Ex: Desconto de 10% na próxima consulta"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">A IA mencionará este prêmio ao pedir a avaliação. Entregue manualmente após confirmar a avaliação.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quando acionar:</label>
                      <select
                        value={reviewCampaign.ai_trigger || 'promoter'}
                        onChange={(e) => setReviewCampaign({ ...reviewCampaign, ai_trigger: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        {AI_TRIGGER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {reviewCampaign.ai_trigger === 'after_days' && (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={reviewCampaign.ai_trigger_days || ''}
                            onChange={(e) => setReviewCampaign({ ...reviewCampaign, ai_trigger_days: parseInt(e.target.value) || null })}
                            placeholder="7"
                            className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                          <span className="text-xs text-gray-500">dias após o cadastro</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botão salvar */}
            <div className="flex items-center justify-between">
              {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {error}
                </p>
              )}
              {saved === 'review' && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Salvo com sucesso
                </p>
              )}
              {!error && saved !== 'review' && <div />}
              <button
                onClick={() => saveCampaign(reviewCampaign, 'review')}
                disabled={saving === 'review'}
                className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 disabled:opacity-50 transition-colors"
              >
                {saving === 'review' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Indicação */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div
          className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setReferralExpanded(!referralExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Indicação</h3>
              <p className="text-xs text-gray-500">Programa de indicação de novos clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              referralCampaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {referralCampaign.status === 'active' ? 'Ativa' : 'Inativa'}
            </span>
            {referralExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        {referralExpanded && (
          <div className="px-5 pb-5 border-t border-gray-100 space-y-5">
            {/* Status */}
            <div className="pt-4">
              {renderToggle(
                referralCampaign.status === 'active',
                (v) => setReferralCampaign({ ...referralCampaign, status: v ? 'active' : 'inactive' }),
                'Campanha ativa',
                'Quando ativa, os canais configurados abaixo funcionarão'
              )}
            </div>

            {/* Canais */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-5">
              <h4 className="text-sm font-semibold text-gray-700">Como oferecer a indicação</h4>

              {/* Via Roleta */}
              <div className="space-y-3">
                {renderToggle(
                  referralCampaign.game_enabled,
                  (v) => setReferralCampaign({ ...referralCampaign, game_enabled: v }),
                  'Via Roleta da Sorte',
                  'Após o NPS, o cliente gira a roleta e recebe o link de indicação como prêmio'
                )}
                {referralCampaign.game_enabled && (
                  <div className="ml-11 text-xs text-blue-600 bg-blue-50 rounded-lg p-2.5">
                    🎯 Configure a roleta na aba <strong>Roleta</strong> com o prêmio &quot;Link de Indicação&quot;. O link único do cliente será exibido automaticamente.
                  </div>
                )}
              </div>

              {/* Via IA */}
              <div className="space-y-3">
                {renderToggle(
                  referralCampaign.ai_enabled,
                  (v) => setReferralCampaign({ ...referralCampaign, ai_enabled: v }),
                  'Via IA no WhatsApp',
                  'A IA envia o link de indicação único pelo WhatsApp e menciona o prêmio'
                )}
                {referralCampaign.ai_enabled && (
                  <div className="ml-11 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Prêmio para quem indica (opcional)</label>
                      <input
                        type="text"
                        value={referralCampaign.reward_description}
                        onChange={(e) => setReferralCampaign({ ...referralCampaign, reward_description: e.target.value })}
                        placeholder="Ex: 1 sessão grátis por indicação"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Condição para entregar o prêmio</label>
                      <select
                        value={referralCampaign.reward_condition}
                        onChange={(e) => setReferralCampaign({ ...referralCampaign, reward_condition: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="">Selecione uma condição</option>
                        {REWARD_CONDITION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quando acionar:</label>
                      <select
                        value={referralCampaign.ai_trigger || 'promoter'}
                        onChange={(e) => setReferralCampaign({ ...referralCampaign, ai_trigger: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        {AI_TRIGGER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {referralCampaign.ai_trigger === 'after_days' && (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={referralCampaign.ai_trigger_days || ''}
                            onChange={(e) => setReferralCampaign({ ...referralCampaign, ai_trigger_days: parseInt(e.target.value) || null })}
                            placeholder="7"
                            className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                          <span className="text-xs text-gray-500">dias após o cadastro</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botão salvar */}
            <div className="flex items-center justify-between">
              {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {error}
                </p>
              )}
              {saved === 'referral' && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Salvo com sucesso
                </p>
              )}
              {!error && saved !== 'referral' && <div />}
              <button
                onClick={() => saveCampaign(referralCampaign, 'referral')}
                disabled={saving === 'referral'}
                className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 disabled:opacity-50 transition-colors"
              >
                {saving === 'referral' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
