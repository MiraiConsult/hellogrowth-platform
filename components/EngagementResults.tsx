'use client';

import React, { useState, useEffect } from 'react';
import { Star, Users, CheckCircle, Clock, Gift, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Copy } from 'lucide-react';

interface Referral {
  id: string;
  referrer_name: string;
  referrer_phone: string;
  referred_name: string | null;
  referred_phone: string | null;
  referral_code: string;
  referral_link: string;
  status: string;
  reward_status: string;
  reward_delivered_at: string | null;
  source: string;
  created_at: string;
  engagement_campaigns?: { name: string; reward_description: string };
}

interface ReviewRequest {
  id: string;
  lead_name: string;
  lead_phone: string;
  status: string;
  reward_status: string;
  reward_delivered_at: string | null;
  source: string;
  created_at: string;
  engagement_campaigns?: { name: string; reward_description: string; google_review_url: string };
}

interface EngagementResultsProps {
  tenantId: string;
}

const SOURCE_LABELS: Record<string, string> = {
  ai: 'IA WhatsApp',
  game: 'Roleta',
  manual: 'Manual',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
  clicked: { label: 'Clicou', color: 'bg-purple-100 text-purple-700' },
  reviewed: { label: 'Avaliou', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Convertido', color: 'bg-green-100 text-green-700' },
};

const REWARD_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Prêmio pendente', color: 'text-yellow-600' },
  delivered: { label: 'Prêmio entregue', color: 'text-green-600' },
};

export default function EngagementResults({ tenantId }: EngagementResultsProps) {
  const [activeTab, setActiveTab] = useState<'referrals' | 'reviews'>('referrals');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [reviews, setReviews] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [refRes, revRes] = await Promise.all([
        fetch('/api/engagement/referrals', { headers: { 'x-tenant-id': tenantId } }),
        fetch('/api/engagement/reviews', { headers: { 'x-tenant-id': tenantId } }),
      ]);
      if (refRes.ok) setReferrals(await refRes.json());
      if (revRes.ok) setReviews(await revRes.json());
    } catch (err) {
      console.error('Erro ao carregar resultados:', err);
    } finally {
      setLoading(false);
    }
  };

  const markRewardDelivered = async (type: 'referral' | 'review', id: string) => {
    setUpdatingId(id);
    try {
      const endpoint = type === 'referral' ? '/api/engagement/referrals' : '/api/engagement/reviews';
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ id, reward_status: 'delivered' }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Erro ao marcar prêmio:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const copyLink = (link: string, code: string) => {
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    return phone;
  };

  const pendingRewards = {
    referrals: referrals.filter((r) => r.reward_status === 'pending' && r.status === 'closed').length,
    reviews: reviews.filter((r) => r.reward_status === 'pending' && r.status === 'reviewed').length,
  };

  const renderReferralsTab = () => (
    <div className="space-y-3">
      {referrals.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma indicação ainda</p>
          <p className="text-xs mt-1">As indicações aparecerão aqui quando forem geradas</p>
        </div>
      ) : (
        referrals.map((referral) => (
          <div
            key={referral.id}
            className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
          >
            {/* Header do card */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{referral.referrer_name || 'Sem nome'}</p>
                <p className="text-xs text-gray-500">{formatPhone(referral.referrer_phone)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  STATUS_LABELS[referral.status]?.color || 'bg-gray-100 text-gray-500'
                }`}>
                  {STATUS_LABELS[referral.status]?.label || referral.status}
                </span>
                <span className="text-xs text-gray-400">
                  {SOURCE_LABELS[referral.source] || referral.source}
                </span>
              </div>
            </div>

            {/* Indicado */}
            {referral.referred_name || referral.referred_phone ? (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">Indicado:</p>
                <p className="text-sm text-blue-900">{referral.referred_name || '-'}</p>
                <p className="text-xs text-blue-600">{formatPhone(referral.referred_phone || '')}</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Aguardando o indicado preencher o formulário</p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-gray-600 truncate flex-1">{referral.referral_link}</p>
                  <button
                    onClick={() => copyLink(referral.referral_link, referral.referral_code)}
                    className="flex-shrink-0 text-xs text-pink-500 hover:text-pink-600 flex items-center gap-1"
                  >
                    {copiedCode === referral.referral_code ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedCode === referral.referral_code ? 'Copiado!' : 'Copiar link'}
                  </button>
                </div>
              </div>
            )}

            {/* Prêmio */}
            {referral.engagement_campaigns?.reward_description && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-600">
                    {referral.engagement_campaigns.reward_description}
                  </span>
                  <span className={`text-xs font-medium ${
                    REWARD_STATUS_LABELS[referral.reward_status]?.color || 'text-gray-500'
                  }`}>
                    — {REWARD_STATUS_LABELS[referral.reward_status]?.label}
                  </span>
                </div>
                {referral.reward_status === 'pending' && referral.status === 'closed' && (
                  <button
                    onClick={() => markRewardDelivered('referral', referral.id)}
                    disabled={updatingId === referral.id}
                    className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Marcar entregue
                  </button>
                )}
                {referral.reward_status === 'delivered' && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Entregue em {referral.reward_delivered_at ? formatDate(referral.reward_delivered_at) : '-'}
                  </span>
                )}
              </div>
            )}

            <p className="text-xs text-gray-400">{formatDate(referral.created_at)}</p>
          </div>
        ))
      )}
    </div>
  );

  const renderReviewsTab = () => (
    <div className="space-y-3">
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma solicitação de review ainda</p>
          <p className="text-xs mt-1">As solicitações aparecerão aqui quando forem enviadas</p>
        </div>
      ) : (
        reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{review.lead_name || 'Sem nome'}</p>
                <p className="text-xs text-gray-500">{formatPhone(review.lead_phone)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  STATUS_LABELS[review.status]?.color || 'bg-gray-100 text-gray-500'
                }`}>
                  {STATUS_LABELS[review.status]?.label || review.status}
                </span>
                <span className="text-xs text-gray-400">
                  {SOURCE_LABELS[review.source] || review.source}
                </span>
              </div>
            </div>

            {/* Link do Google */}
            {review.engagement_campaigns?.google_review_url && (
              <a
                href={review.engagement_campaigns.google_review_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver no Google
              </a>
            )}

            {/* Prêmio */}
            {review.engagement_campaigns?.reward_description && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-600">
                    {review.engagement_campaigns.reward_description}
                  </span>
                  <span className={`text-xs font-medium ${
                    REWARD_STATUS_LABELS[review.reward_status]?.color || 'text-gray-500'
                  }`}>
                    — {REWARD_STATUS_LABELS[review.reward_status]?.label}
                  </span>
                </div>
                {review.reward_status === 'pending' && (
                  <button
                    onClick={() => markRewardDelivered('review', review.id)}
                    disabled={updatingId === review.id}
                    className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Marcar entregue
                  </button>
                )}
                {review.reward_status === 'delivered' && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Entregue em {review.reward_delivered_at ? formatDate(review.reward_delivered_at) : '-'}
                  </span>
                )}
              </div>
            )}

            <p className="text-xs text-gray-400">{formatDate(review.created_at)}</p>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-600">Indicações</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{referrals.length}</p>
          {pendingRewards.referrals > 0 && (
            <p className="text-xs text-yellow-600 mt-1">
              {pendingRewards.referrals} prêmio{pendingRewards.referrals > 1 ? 's' : ''} pendente{pendingRewards.referrals > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-medium text-gray-600">Reviews solicitados</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
          {pendingRewards.reviews > 0 && (
            <p className="text-xs text-yellow-600 mt-1">
              {pendingRewards.reviews} prêmio{pendingRewards.reviews > 1 ? 's' : ''} pendente{pendingRewards.reviews > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('referrals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'referrals'
              ? 'bg-pink-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Indicações
          {referrals.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'referrals' ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {referrals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'reviews'
              ? 'bg-pink-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Star className="w-4 h-4" />
          Google Reviews
          {reviews.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'reviews' ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {reviews.length}
            </span>
          )}
        </button>
        <button
          onClick={loadData}
          disabled={loading}
          className="ml-auto p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Atualizar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
        </div>
      ) : (
        <>
          {activeTab === 'referrals' && renderReferralsTab()}
          {activeTab === 'reviews' && renderReviewsTab()}
        </>
      )}
    </div>
  );
}
