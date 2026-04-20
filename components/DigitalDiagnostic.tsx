'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { AccountSettings } from '@/types';
import {
  Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2,
  Star, MapPin, Clock, Image, MessageSquare, CheckCircle, AlertTriangle,
  ChevronRight, History, Sparkles, Globe, Phone, ExternalLink, Camera,
  Calendar, Users, ThumbsUp, ThumbsDown, Eye, Lightbulb, Target, Award,
  ArrowUp, ArrowDown, BarChart2, X, Info, CheckSquare,
  Square, TrendingDown as TrendingDownIcon, Zap, MousePointer, Navigation,
  Search, BarChart, PieChart, HelpCircle, Copy, BookOpen, Newspaper
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart as RechartsBarChart, Bar, ReferenceLine, AreaChart, Area
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || '';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface GooglePlaceData {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  reviews?: GoogleReview[];
  opening_hours?: { open_now?: boolean; weekday_text?: string[] };
  photos?: { photo_reference: string }[];
  types?: string[];
  business_status?: string;
  url?: string;
  price_level?: number;
}

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
}

interface TodoItem {
  id: string;
  title: string;
  description: string;
  impact: string;
  impactScore: number;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  category: 'reputation' | 'visibility' | 'engagement';
}

interface AIAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
  }[];
  scores: {
    reputation: number;
    visibility: number;
    engagement: number;
    overall: number;
  };
  evolution?: {
    summary: string;
    improved: string[];
    declined: string[];
  };
  todoItems?: TodoItem[];
}

interface DiagnosticData {
  id: string;
  user_id: string;
  place_data: GooglePlaceData;
  ai_analysis: AIAnalysis;
  created_at: string;
}

// GBP API desabilitada temporariamente (quota=0 no Google Cloud)
// interface GBPMetrics { ... }

interface DigitalDiagnosticProps {
  userId: string;
  activeTenantId?: string;
  settings: AccountSettings;
  npsData: any[];
  businessProfile?: any;
}

// ─── Benchmarks por setor ────────────────────────────────────────────────────

const SECTOR_BENCHMARKS: Record<string, { avgRating: number; avgReviews: number; label: string }> = {
  restaurant: { avgRating: 4.2, avgReviews: 180, label: 'Restaurantes' },
  food: { avgRating: 4.2, avgReviews: 180, label: 'Alimentação' },
  health: { avgRating: 4.3, avgReviews: 55, label: 'Saúde' },
  doctor: { avgRating: 4.3, avgReviews: 55, label: 'Médicos/Clínicas' },
  dentist: { avgRating: 4.4, avgReviews: 50, label: 'Odontologia' },
  beauty: { avgRating: 4.4, avgReviews: 65, label: 'Beleza/Estética' },
  hair_care: { avgRating: 4.4, avgReviews: 65, label: 'Salão de Beleza' },
  gym: { avgRating: 4.1, avgReviews: 80, label: 'Academia/Fitness' },
  store: { avgRating: 4.1, avgReviews: 70, label: 'Varejo' },
  clothing_store: { avgRating: 4.1, avgReviews: 70, label: 'Moda/Vestuário' },
  car_repair: { avgRating: 4.2, avgReviews: 45, label: 'Oficina/Auto' },
  real_estate: { avgRating: 4.2, avgReviews: 35, label: 'Imobiliária' },
  lawyer: { avgRating: 4.3, avgReviews: 25, label: 'Advocacia' },
  accounting: { avgRating: 4.3, avgReviews: 20, label: 'Contabilidade' },
  hotel: { avgRating: 4.2, avgReviews: 280, label: 'Hotelaria' },
  lodging: { avgRating: 4.2, avgReviews: 280, label: 'Hospedagem' },
  pet: { avgRating: 4.5, avgReviews: 45, label: 'Pet Shop/Veterinário' },
  default: { avgRating: 4.1, avgReviews: 39, label: 'Média Geral' },
};

function getSectorBenchmark(types?: string[]) {
  if (!types) return SECTOR_BENCHMARKS.default;
  for (const type of types) {
    for (const [key, val] of Object.entries(SECTOR_BENCHMARKS)) {
      if (type.includes(key)) return val;
    }
  }
  return SECTOR_BENCHMARKS.default;
}

// ─── Explicações das métricas ────────────────────────────────────────────────

const METRIC_EXPLANATIONS = {
  reputation: {
    title: 'Reputação',
    icon: <Star size={18} className="text-yellow-500" />,
    description: 'A Reputação mede como os clientes enxergam o seu negócio no Google. Ela é baseada em dois fatores: a nota média que você recebe nas avaliações (de 0 a 5 estrelas) e a quantidade total de avaliações que o seu perfil acumulou. Um negócio com nota alta mas poucas avaliações ainda tem reputação limitada — o Google valoriza tanto a qualidade quanto o volume.',
    howCalculated: 'O cálculo divide 100 pontos em duas partes: até 55 pontos pela nota média (com penalidade exponencial — notas abaixo de 4.0★ são penalizadas mais severamente) e até 45 pontos pelo volume de avaliações (escala rigorosa: 50 avaliações = ~19 pts, 200 avaliações = ~34 pts, 500 avaliações = 45 pts). Por exemplo: nota 4.8★ com 200 avaliações gera aproximadamente 51 + 34 = 85 pontos.',
    howToImprove: [
      'Solicite avaliações de clientes satisfeitos após cada atendimento',
      'Responda a todas as avaliações, especialmente as negativas',
      'Resolva os problemas mencionados nas avaliações negativas',
      'Use a Hello Growth para automatizar o pedido de avaliações',
    ],
    benchmark: 'A média do setor é 4.1-4.4 estrelas. Negócios no Top 3 do Google têm em média 240 avaliações.',
  },
  visibility: {
    title: 'Visibilidade',
    icon: <Eye size={18} className="text-blue-500" />,
    description: 'A Visibilidade mede o quão completo e bem configurado está o seu perfil no Google. Perfis incompletos aparecem menos nas buscas — o Google prioriza negócios que fornecem informações completas para os usuários. Cada informação que você adiciona aumenta as chances do seu negócio aparecer quando alguém busca por um serviço como o seu.',
    howCalculated: 'O cálculo avalia 4 elementos do perfil: Fotos (até 30 pts — 0 fotos = 0, 1-4 fotos = 8, 5-14 fotos = 16, 15-24 fotos = 24, 25+ fotos = 30), Horários de funcionamento configurados (25 pts), Website vinculado (25 pts) e Telefone cadastrado (20 pts). Total máximo: 100 pontos.',
    howToImprove: [
      'Adicione pelo menos 25 fotos de qualidade do estabelecimento para pontuação máxima',
      'Configure os horários de funcionamento corretamente',
      'Vincule seu website ao perfil',
      'Mantenha o telefone atualizado',
    ],
    benchmark: 'Perfis com 10+ fotos recebem 35% mais cliques. Perfis completos aparecem 7x mais nas buscas.',
  },
  engagement: {
    title: 'Engajamento',
    icon: <MessageSquare size={18} className="text-green-500" />,
    description: 'O Engajamento mede se o seu negócio está ativo e gerando interações recentes no Google. Um perfil que não recebe novas avaliações há meses é visto pelo Google como menos relevante — mesmo que tenha uma nota alta. O algoritmo do Google valoriza negócios que mantmé atividade constante, pois indica que o negócio está funcionando e atendendo clientes.',
    howCalculated: 'O cálculo combina dois fatores: volume total de avaliações (até 50 pts, escala muito rigorosa: 50 avaliações = ~14 pts, 200 = ~24 pts, 1000 = 50 pts) e nota média com penalidade exponencial (até 50 pts). Manter um fluxo constante de novas avaliações é essencial para pontuação alta.',
    howToImprove: [
      'Mantenha um fluxo constante de novas avaliações',
      'Responda às avaliações para incentivar mais interações',
      'Publique posts regulares no Google Meu Negócio',
      'Use a Hello Growth para automatizar a coleta de avaliações',
    ],
    benchmark: 'Negócios com atividade constante de avaliações têm 2x mais chances de aparecer no Google Maps.',
  },
  overall: {
    title: 'Score Geral',
    icon: <Activity size={18} className="text-purple-500" />,
    description: 'O Score Geral é um número único de 0 a 100 que resume toda a sua presença digital no Google. Ele combina as três dimensões — Reputação, Visibilidade e Engajamento — com pesos diferentes, pois cada uma tem um impacto diferente no posicionamento do seu negócio nas buscas. Quanto maior o score, mais chances o seu negócio tem de aparecer na frente dos concorrentes.',
    howCalculated: 'O Score Geral é uma média ponderada das três dimensões: Reputação representa 40% do score (o fator mais importante — clientes confiam em avaliações), Visibilidade representa 35% (perfil completo aparece mais nas buscas) e Engajamento representa 25% (atividade recente indica negócio ativo). Fórmula: (Reputação × 0,4) + (Visibilidade × 0,35) + (Engajamento × 0,25).',
    howToImprove: [
      'Foque primeiro na dimensão com menor score',
      'Mantenha consistência nas ações ao longo do tempo',
      'Realize diagnósticos mensais para acompanhar a evolução',
    ],
    benchmark: 'Score 65+ indica perfil bem otimizado. Score 80+ coloca o negócio entre os melhores do setor — exige nota 4.5★+ e 300+ avaliações.',
  },
};

// ─── Componentes auxiliares ───────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium text-gray-700 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }}></span>
            {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR') : entry.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ScoreDetailModal = ({
  metricKey, score, prevScore, criteria, onClose
}: {
  metricKey: keyof typeof METRIC_EXPLANATIONS;
  score: number;
  prevScore?: number | null;
  criteria: { label: string; pts: number; maxPts: number; ok: boolean }[];
  onClose: () => void;
}) => {
  const info = METRIC_EXPLANATIONS[metricKey];
  const scoreColor = score >= 85 ? 'text-green-600' : score >= 65 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = score >= 85 ? 'bg-green-50 border-green-200' : score >= 65 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
  const scoreLabel = score >= 85 ? 'Excelente' : score >= 65 ? 'Bom' : score >= 45 ? 'Regular' : 'Precisa melhorar';
  const delta = prevScore != null ? score - prevScore : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${scoreBg} border`}>{info.icon}</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{info.title}</h3>
                <p className="text-sm text-gray-500">Entenda como esse score é calculado</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
          </div>
          {/* Score display */}
          <div className={`mt-4 rounded-xl p-4 border ${scoreBg} flex items-center justify-between`}>
            <div>
              <p className="text-sm text-gray-600 mb-1">Score atual</p>
              <div className="flex items-end gap-2">
                <span className={`text-5xl font-bold ${scoreColor}`}>{score}</span>
                <span className="text-gray-400 text-lg mb-1">/100</span>
              </div>
              <span className={`text-sm font-medium ${scoreColor}`}>{scoreLabel}</span>
            </div>
            {delta != null && (
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">vs. diagnóstico anterior</p>
                <span className={`text-2xl font-bold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>
                <p className="text-xs text-gray-400">pontos</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* O que é */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Info size={15} className="text-blue-500" /> O que é {info.title}?
            </h4>
            <p className="text-gray-600 text-sm leading-relaxed">{info.description}</p>
          </div>

          {/* Como é calculado */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <BarChart size={15} /> Como esse número é calculado
            </h4>
            <p className="text-blue-700 text-sm leading-relaxed mb-4">{info.howCalculated}</p>
            {/* Breakdown visual dos critérios */}
            {criteria.length > 0 && (
              <div className="space-y-3">
                {criteria.map((c, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700 flex items-center gap-2">
                        {c.ok
                          ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                          : <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />
                        }
                        {c.label}
                      </span>
                      <span className={`text-sm font-bold ${c.ok ? 'text-green-600' : 'text-yellow-600'}`}>
                        {c.pts} <span className="text-gray-400 font-normal">/ {c.maxPts} pts</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${c.ok ? 'bg-green-400' : 'bg-yellow-400'}`}
                        style={{ width: `${Math.round((c.pts / c.maxPts) * 100)}%` }}
                      />
                    </div>
                    {!c.ok && (
                      <p className="text-xs text-yellow-700 mt-1">⚠️ Pode melhorar — veja as dicas abaixo</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Benchmark */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <Award size={15} /> Benchmark do setor
            </h4>
            <p className="text-amber-700 text-sm leading-relaxed">{info.benchmark}</p>
          </div>

          {/* Como melhorar */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <TrendingUp size={15} /> Como melhorar sua {info.title}
            </h4>
            <ul className="space-y-2">
              {info.howToImprove.map((tip, i) => (
                <li key={i} className="text-green-700 text-sm flex items-start gap-2">
                  <CheckCircle size={14} className="mt-0.5 flex-shrink-0 text-green-500" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mantido para compatibilidade mas não usado
const MetricInfoModal = ({ metric, onClose }: { metric: keyof typeof METRIC_EXPLANATIONS; onClose: () => void }) => {
  return <ScoreDetailModal metricKey={metric} score={0} criteria={[]} onClose={onClose} />;
};

// ─── ReviewsTab: aba de avaliações com sugestão de resposta por IA ─────────────────

const ReviewsTab: React.FC<{
  placeData: GooglePlaceData | undefined;
  businessName: string;
  benchmark: { label: string; avgRating: number; avgReviews: number };
}> = ({ placeData, businessName, benchmark }) => {
  const [suggestedReplies, setSuggestedReplies] = useState<Record<number, string>>({});
  const [loadingReply, setLoadingReply] = useState<Record<number, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateReply = async (review: GooglePlaceData['reviews'][0], index: number) => {
    setLoadingReply(prev => ({ ...prev, [index]: true }));
    try {
      const res = await fetch('/api/suggest-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          reviewerName: review.author_name,
          rating: review.rating,
          reviewText: review.text || '',
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setSuggestedReplies(prev => ({ ...prev, [index]: data.reply }));
      }
    } catch (e) {
      console.error('Erro ao gerar resposta:', e);
    } finally {
      setLoadingReply(prev => ({ ...prev, [index]: false }));
    }
  };

  const copyReply = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const openGoogleReply = () => {
    window.open('https://business.google.com/reviews', '_blank');
  };

  if (!placeData?.reviews || placeData.reviews.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <Star className="mx-auto text-gray-300 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Sem avaliações disponíveis</h3>
        <p className="text-gray-500">As avaliações aparecerão aqui após o próximo diagnóstico.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Distribuição */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="text-yellow-500" size={20} />
          <h3 className="font-semibold text-gray-800">Distribuição das Avaliações</h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-800">{placeData.rating?.toFixed(1)}</div>
            <div className="flex justify-center mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className={i < Math.round(placeData.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} />
              ))}
            </div>
            <div className="text-sm text-gray-500 mt-1">{placeData.user_ratings_total?.toLocaleString('pt-BR')} avaliações</div>
            <div className={`text-xs mt-1 font-medium ${placeData.rating && placeData.rating >= benchmark.avgRating ? 'text-green-600' : 'text-orange-500'}`}>
              {placeData.rating && placeData.rating >= benchmark.avgRating ? '▲ Acima' : '▼ Abaixo'} da média do setor ({benchmark.avgRating}★)
            </div>
          </div>
          <div className="flex-1">
            {[5, 4, 3, 2, 1].map(star => {
              const count = placeData.reviews?.filter(r => r.rating === star).length || 0;
              const pct = placeData.reviews?.length ? Math.round((count / placeData.reviews.length) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
                  <Star size={12} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Avaliações com sugestão de resposta */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-800">Avaliações Recentes</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-purple-50 border border-purple-100 px-2 py-1 rounded-lg flex items-center gap-1">
              <Sparkles size={11} className="text-purple-500" /> IA sugere respostas
            </span>
            <button
              onClick={openGoogleReply}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <ExternalLink size={12} /> Responder no Google
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {placeData.reviews.slice(0, 50).map((review, index) => {
            const isPositive = review.rating >= 4;
            const isNegative = review.rating <= 2;
            const hasSuggestion = !!suggestedReplies[index];
            const isLoading = !!loadingReply[index];

            return (
              <div
                key={index}
                className={`rounded-xl border p-4 transition-all ${
                  isNegative ? 'border-red-100 bg-red-50/30' :
                  isPositive ? 'border-green-100 bg-green-50/30' :
                  'border-gray-100 bg-gray-50/30'
                }`}
              >
                {/* Cabeçalho da avaliação */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800 text-sm">{review.author_name}</span>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} />
                      ))}
                    </div>
                    <span className="text-gray-400 text-xs">{review.relative_time_description}</span>
                    {isNegative && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Resposta urgente</span>
                    )}
                  </div>
                  <button
                    onClick={() => generateReply(review, index)}
                    disabled={isLoading}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    {isLoading
                      ? <><Loader2 size={12} className="animate-spin" /> Gerando...</>
                      : <><Sparkles size={12} /> {hasSuggestion ? 'Regerar' : 'Sugerir resposta'}</>
                    }
                  </button>
                </div>

                {/* Texto da avaliação */}
                {review.text
                  ? <p className="text-gray-600 text-sm leading-relaxed mb-3">{review.text}</p>
                  : <p className="text-gray-400 text-sm italic mb-3">Avaliação sem comentário</p>
                }

                {/* Resposta sugerida */}
                {hasSuggestion && (
                  <div className="mt-3 bg-white rounded-lg border border-purple-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                        <Sparkles size={11} /> Resposta sugerida pela IA
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyReply(suggestedReplies[index], index)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          {copiedIndex === index
                            ? <><CheckCircle size={11} className="text-green-500" /> Copiado!</>
                            : <><Copy size={11} /> Copiar</>
                          }
                        </button>
                        <button
                          onClick={openGoogleReply}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                        >
                          <ExternalLink size={11} /> Publicar no Google
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{suggestedReplies[index]}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const DigitalDiagnosticComponent: React.FC<DigitalDiagnosticProps> = ({
  userId, activeTenantId, settings, npsData, businessProfile
}) => {
  const effectivePlaceId = businessProfile?.google_place_id || settings.placeId || '';
  const tenantIdFromHook = useTenantId();
  const tenantId = activeTenantId || tenantIdFromHook;

  const [diagnostics, setDiagnostics] = useState<DiagnosticData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'evolution' | 'reviews' | 'todo'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [openMetricInfo, setOpenMetricInfo] = useState<keyof typeof METRIC_EXPLANATIONS | null>(null);
  const [modalCriteria, setModalCriteria] = useState<{ label: string; pts: number; maxPts: number; ok: boolean }[]>([]);
  const [modalPrevScore, setModalPrevScore] = useState<number | null>(null);
  const [modalScore, setModalScore] = useState<number>(0);
  // GBP API desabilitada temporariamente
  // const [gbpMetrics, setGbpMetrics] = useState<GBPMetrics | null>(null);
  // const [gbpLoading, setGbpLoading] = useState(false);
  // const [gbpConnected, setGbpConnected] = useState(false);
  // GBP Location ID input desabilitado temporariamente
  // const [locationIdInput, setLocationIdInput] = useState('');
  // const [savingLocationId, setSavingLocationId] = useState(false);
  // const [locationIdSaved, setLocationIdSaved] = useState(false);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [clickedDimension, setClickedDimension] = useState<string | null>(null);
  const [showDailyDigest, setShowDailyDigest] = useState(false);

  // Limpar erro de Place ID quando o businessProfile carrega com o Place ID preenchido
  useEffect(() => {
    if (effectivePlaceId && error === 'Configure o Google Place ID no Perfil do Negócio para analisar sua presença digital.') {
      setError(null);
    }
  }, [effectivePlaceId]);

  useEffect(() => {
    fetchDiagnostics();
  }, [userId, activeTenantId]);

  const fetchDiagnostics = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const localStorageTenantId = typeof window !== 'undefined' ? localStorage.getItem('hg_active_company_id') : null;
      const resolvedTenantId = businessProfile?.tenant_id || activeTenantId || localStorageTenantId || tenantId || userId;
      const { data, error } = await supabase
        .from('digital_diagnostics')
        .select('*')
        .eq('tenant_id', resolvedTenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const mapped = data.map(d => ({
          id: d.id,
          user_id: d.user_id,
          place_data: d.place_data || {},
          ai_analysis: d.ai_analysis || null,
          created_at: d.created_at
        }));
        setDiagnostics(mapped);
        // Carregar to-do items do diagnóstico mais recente
        const latestAnalysis = mapped[0]?.ai_analysis;
        if (latestAnalysis) {
          const existingTodos: TodoItem[] = latestAnalysis.todoItems || [];
          const existingIds = new Set(existingTodos.map((t: TodoItem) => t.id));
          // Converter recomendações da IA em TodoItems
          const recTodos: TodoItem[] = (latestAnalysis.recommendations || []).map((rec: { priority: string; title: string; description: string; impact: string }, i: number) => {
            const id = `rec_${i}_${rec.title.replace(/\s+/g, '_').toLowerCase().slice(0, 20)}`;
            if (existingIds.has(id)) return null;
            return {
              id,
              title: rec.title,
              description: rec.description,
              impact: rec.impact,
              impactScore: rec.priority === 'high' ? 20 : rec.priority === 'medium' ? 10 : 5,
              priority: rec.priority as 'high' | 'medium' | 'low',
              completed: false,
              category: 'reputation' as const,
            };
          }).filter(Boolean) as TodoItem[];
          setTodoItems([...existingTodos, ...recTodos]);
        }
      }
    } catch (e) {
      console.error('Error fetching diagnostics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // GBP API desabilitada temporariamente — funções abaixo podem ser reativadas quando a API for habilitada no Google Cloud
  // const checkGbpConnection = async () => { ... };
  // const fetchGbpMetrics = async () => { ... };
  // const handleConnectGBP = () => { ... };
  // const handleDisconnectGBP = async () => { ... };

  const latestDiagnostic = diagnostics[0];
  const previousDiagnostic = diagnostics[1];

  // Fetch Google Place data
  const fetchGooglePlaceData = async (placeId: string): Promise<GooglePlaceData | null> => {
    try {
      const url = `https://places.googleapis.com/v1/places/${placeId}`;
      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,reviews,regularOpeningHours,photos,types,businessStatus,googleMapsUri'
      };
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) throw new Error('Failed to fetch place data');
      const data = await response.json();
      return {
        name: data.displayName?.text || '',
        formatted_address: data.formattedAddress || '',
        formatted_phone_number: data.nationalPhoneNumber || '',
        website: data.websiteUri || '',
        rating: data.rating || 0,
        user_ratings_total: data.userRatingCount || 0,
        reviews: data.reviews?.map((r: any) => ({
          author_name: r.authorAttribution?.displayName || 'Anônimo',
          rating: r.rating || 0,
          text: r.text?.text || '',
          time: r.publishTime ? new Date(r.publishTime).getTime() / 1000 : 0,
          relative_time_description: r.relativePublishTimeDescription || ''
        })) || [],
        opening_hours: data.regularOpeningHours ? {
          open_now: data.regularOpeningHours.openNow || false,
          weekday_text: data.regularOpeningHours.weekdayDescriptions || []
        } : undefined,
        photos: data.photos?.map((p: any) => ({ photo_reference: p.name || '' })) || [],
        types: data.types || [],
        business_status: data.businessStatus || 'OPERATIONAL',
        url: data.googleMapsUri || '',
        price_level: 0
      };
    } catch (error) {
      console.error('Error fetching Google Place data:', error);
      return null;
    }
  };

  const calculateEngagementMetrics = (placeData: GooglePlaceData) => {
    const totalReviews = placeData.user_ratings_total || 0;
    const rating = placeData.rating || 0;
    return {
      totalReviews,
      avgRating: rating,
    };
  };

  const calculateScores = (placeData: GooglePlaceData) => {
    const rating = placeData.rating || 0;
    const totalReviews = placeData.user_ratings_total || 0;
    const photoCount = placeData.photos?.length || 0;
    const hasHours = !!placeData.opening_hours?.weekday_text?.length;
    const hasWebsite = !!placeData.website;
    const hasPhone = !!placeData.formatted_phone_number;
    const engagementMetrics = calculateEngagementMetrics(placeData);

    // REPUTAÇÃO: nota com penalidade exponencial (expoente 1.8 — notas baixas penalizadas mais)
    // Volume muito mais exigente: log base 500 (antes log10 base 10)
    // 50 avaliações: antes ~34 pts, agora ~19 pts | 200 avaliações: antes ~46 pts, agora ~34 pts
    const ratingPts = totalReviews === 0 ? 0 : Math.min(55, Math.round(Math.pow(rating / 5, 1.8) * 55));
    const reviewVolumePts = totalReviews === 0 ? 0 : Math.min(45, Math.round(Math.log(totalReviews + 1) / Math.log(500) * 45));
    const reputationScore = Math.min(100, ratingPts + reviewVolumePts);

    // VISIBILIDADE: fotos muito mais exigentes (25+ para máximo, antes 10+ já dava máximo)
    const visibilityScore = Math.round(
      (photoCount >= 25 ? 30 : photoCount >= 15 ? 24 : photoCount >= 5 ? 16 : photoCount >= 1 ? 8 : 0) +
      (hasHours ? 25 : 0) + (hasWebsite ? 25 : 0) + (hasPhone ? 20 : 0)
    );

    // ENGAJAMENTO: volume muito mais exigente (log base 1000)
    // 50 avaliações: antes ~31 pts, agora ~14 pts | 200 avaliações: antes ~41 pts, agora ~24 pts
    const engVolumePts = totalReviews === 0 ? 0 : Math.min(50, Math.round(Math.log(totalReviews + 1) / Math.log(1000) * 50));
    const engRatingPts = totalReviews === 0 ? 0 : Math.min(50, Math.round(Math.pow(rating / 5, 1.5) * 50));
    const engagementScore = Math.min(100, engVolumePts + engRatingPts);

    const overallScore = Math.round(reputationScore * 0.4 + visibilityScore * 0.35 + engagementScore * 0.25);

    return { reputationScore, visibilityScore, engagementScore, overallScore };
  };

  const generateTodoItems = (placeData: GooglePlaceData, scores: ReturnType<typeof calculateScores>): TodoItem[] => {
    const items: TodoItem[] = [];
    const { reputationScore, visibilityScore, engagementScore } = scores;
    const rating = placeData.rating || 0;
    const totalReviews = placeData.user_ratings_total || 0;
    const photoCount = placeData.photos?.length || 0;
    const hasHours = !!placeData.opening_hours?.weekday_text?.length;
    const hasWebsite = !!placeData.website;
    const hasPhone = !!placeData.formatted_phone_number;
    const engagementMetrics = calculateEngagementMetrics(placeData);

    if (totalReviews < 50) {
      items.push({
        id: 'reviews-volume',
        title: 'Aumentar volume de avaliações',
        description: `Você tem ${totalReviews} avaliações. Envie links de avaliação para seus clientes após cada atendimento.`,
        impact: `+${Math.min(20, Math.round((50 - totalReviews) / 5))} pts no score de Reputação`,
        impactScore: 20,
        priority: totalReviews < 20 ? 'high' : 'medium',
        completed: false,
        category: 'reputation',
      });
    }

    if (rating > 0 && rating < 4.3) {
      items.push({
        id: 'rating-improve',
        title: 'Melhorar nota média',
        description: `Sua nota é ${rating}. Responda às avaliações negativas e solicite avaliações de clientes satisfeitos.`,
        impact: `Aumentar para 4.3+ pode dobrar sua visibilidade no Maps`,
        impactScore: 18,
        priority: 'high',
        completed: false,
        category: 'reputation',
      });
    }

    if (photoCount < 10) {
      items.push({
        id: 'photos',
        title: `Adicionar ${Math.max(0, 10 - photoCount)} fotos ao perfil`,
        description: `Você tem ${photoCount} foto${photoCount !== 1 ? 's' : ''}. Adicione fotos do ambiente, produtos e equipe.`,
        impact: `Perfis com 10+ fotos recebem 35% mais cliques`,
        impactScore: 15,
        priority: photoCount === 0 ? 'high' : 'medium',
        completed: false,
        category: 'visibility',
      });
    }

    if (!hasHours) {
      items.push({
        id: 'hours',
        title: 'Configurar horários de funcionamento',
        description: 'Clientes precisam saber quando você está aberto antes de visitar ou ligar.',
        impact: `+25 pts no score de Visibilidade`,
        impactScore: 25,
        priority: 'high',
        completed: false,
        category: 'visibility',
      });
    }

    if (!hasWebsite) {
      items.push({
        id: 'website',
        title: 'Vincular website ao perfil',
        description: 'Adicione o link do seu site ou landing page ao perfil do Google.',
        impact: `+25 pts no score de Visibilidade`,
        impactScore: 25,
        priority: 'medium',
        completed: false,
        category: 'visibility',
      });
    }

    if (!hasPhone) {
      items.push({
        id: 'phone',
        title: 'Adicionar telefone ao perfil',
        description: 'Configure o número de telefone para que clientes possam ligar diretamente do Google.',
        impact: `+20 pts no score de Visibilidade`,
        impactScore: 20,
        priority: 'medium',
        completed: false,
        category: 'visibility',
      });
    }

    if (engagementMetrics.totalReviews < 20) {
      items.push({
        id: 'recent-activity',
        title: 'Aumentar volume de avaliações',
        description: `Você tem ${engagementMetrics.totalReviews} avaliações no total. Use a Hello Growth para solicitar avaliações e manter um fluxo constante.`,
        impact: `+${Math.min(30, Math.max(5, 20 - engagementMetrics.totalReviews))} pts no Engajamento`,
        impactScore: 15,
        priority: 'medium',
        completed: false,
        category: 'engagement',
      });
    }

    return items.sort((a, b) => b.impactScore - a.impactScore);
  };

  const generateAIAnalysis = async (placeData: GooglePlaceData, previousAnalysis?: AIAnalysis | null, todoItems?: TodoItem[]): Promise<AIAnalysis> => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const scores = calculateScores(placeData);
    const { reputationScore, visibilityScore, engagementScore, overallScore } = scores;

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
      return generateBasicAnalysis(placeData, previousAnalysis, todoItems);
    }

    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const engagementMetrics = calculateEngagementMetrics(placeData);
      const hasWebsite = !!placeData.website;
      const hasPhone = !!placeData.formatted_phone_number;
      const hasHours = !!placeData.opening_hours?.weekday_text?.length;
      const photoCount = placeData.photos?.length || 0;
      const rating = placeData.rating || 0;
      const totalReviews = placeData.user_ratings_total || 0;
      const benchmark = getSectorBenchmark(placeData.types);

      const comparativeContext = previousAnalysis ? `
DIAGNÓSTICO ANTERIOR:
- Score Geral: ${previousAnalysis.scores.overall} | Reputação: ${previousAnalysis.scores.reputation} | Visibilidade: ${previousAnalysis.scores.visibility} | Engajamento: ${previousAnalysis.scores.engagement}
SCORES ATUAIS: Geral: ${overallScore} | Reputação: ${reputationScore} | Visibilidade: ${visibilityScore} | Engajamento: ${engagementScore}
` : '';

      const prompt = `
Você é especialista em marketing digital e presença online de negócios locais no Brasil.
Analise os dados REAIS abaixo e forneça análise precisa e específica.

DADOS REAIS:
- Nome: ${placeData.name || 'Não informado'}
- Telefone: ${hasPhone ? placeData.formatted_phone_number + ' (CONFIGURADO)' : 'NÃO CONFIGURADO'}
- Website: ${hasWebsite ? placeData.website + ' (CONFIGURADO)' : 'NÃO CONFIGURADO'}
- Nota média: ${rating > 0 ? rating + ' estrelas' : 'SEM AVALIAÇÕES'}
- Total de avaliações: ${totalReviews}
- Volume total de avaliações: ${engagementMetrics.totalReviews}
- Horário: ${hasHours ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}
- Fotos: ${photoCount} ${photoCount === 0 ? '(NENHUMA)' : photoCount < 5 ? '(POUCAS)' : '(BOM VOLUME)'}
- Benchmark do setor (${benchmark.label}): nota média ${benchmark.avgRating}, média de ${benchmark.avgReviews} avaliações

SCORES CALCULADOS (USE EXATAMENTE):
- reputation: ${reputationScore}, visibility: ${visibilityScore}, engagement: ${engagementScore}, overall: ${overallScore}

${comparativeContext}

ÚLTIMAS AVALIAÇÕES:
${placeData.reviews?.slice(0, 5).map(r => `- ${r.author_name} (${r.rating}★): "${r.text?.substring(0, 120)}"`).join('\n') || 'Sem avaliações'}

INSTRUÇÕES:
1. Use EXATAMENTE os scores fornecidos. NÃO altere os valores.
2. Baseie pontos fortes/fracos EXCLUSIVAMENTE nos dados reais.
3. Se telefone está configurado, NÃO diga que falta. Se tem fotos, NÃO diga que falta.
4. Mencione valores reais (ex: "nota 4.7", "127 avaliações").
5. Compare com o benchmark do setor quando relevante.
6. NÃO gere análises genéricas.

Responda APENAS em JSON puro (sem markdown):
{
  "summary": "Resumo específico em 2-3 frases com dados reais e comparação com benchmark",
  "strengths": ["Ponto forte com dados reais", "..."],
  "weaknesses": ["Ponto fraco com dados reais", "..."],
  "recommendations": [
    {"priority": "high", "title": "Título", "description": "Ação concreta", "impact": "Impacto esperado"}
  ],
  "scores": {"reputation": ${reputationScore}, "visibility": ${visibilityScore}, "engagement": ${engagementScore}, "overall": ${overallScore}}
  ${previousAnalysis ? `,"evolution": {"summary": "Uma frase sobre evolução", "improved": ["O que melhorou"], "declined": ["O que piorou ou lista vazia"]}` : ''}
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsed.scores = { reputation: reputationScore, visibility: visibilityScore, engagement: engagementScore, overall: overallScore };
        parsed.todoItems = todoItems || [];
        return parsed;
      }
      return generateBasicAnalysis(placeData, previousAnalysis, todoItems);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      return generateBasicAnalysis(placeData, previousAnalysis, todoItems);
    }
  };

  const generateBasicAnalysis = (placeData: GooglePlaceData, previousAnalysis?: AIAnalysis | null, todos?: TodoItem[]): AIAnalysis => {
    const scores = calculateScores(placeData);
    const { reputationScore, visibilityScore, engagementScore, overallScore } = scores;
    const rating = placeData.rating || 0;
    const reviewCount = placeData.user_ratings_total || 0;
    const photoCount = placeData.photos?.length || 0;
    const hasHours = !!placeData.opening_hours?.weekday_text?.length;
    const hasWebsite = !!placeData.website;
    const hasPhone = !!placeData.formatted_phone_number;
    const engagementMetrics = calculateEngagementMetrics(placeData);
    const benchmark = getSectorBenchmark(placeData.types);

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: AIAnalysis['recommendations'] = [];

    if (rating >= 4.5) strengths.push(`Excelente nota ${rating}★ — acima da média do setor (${benchmark.avgRating}★)`);
    else if (rating >= 4.0) strengths.push(`Boa nota ${rating}★ — próxima à média do setor (${benchmark.avgRating}★)`);
    else if (rating > 0) {
      weaknesses.push(`Nota ${rating}★ abaixo da média do setor (${benchmark.avgRating}★)`);
      recommendations.push({ priority: 'high', title: 'Melhore sua nota média', description: 'Responda avaliações negativas e solicite avaliações de clientes satisfeitos.', impact: 'Pode aumentar nota em até 0.5 pontos' });
    }

    if (reviewCount >= benchmark.avgReviews) strengths.push(`Volume de avaliações (${reviewCount}) acima da média do setor (${benchmark.avgReviews})`);
    else if (reviewCount >= 20) strengths.push(`${reviewCount} avaliações — crescendo em direção à média do setor (${benchmark.avgReviews})`);
    else if (reviewCount > 0) {
      weaknesses.push(`Apenas ${reviewCount} avaliações — muito abaixo da média do setor (${benchmark.avgReviews})`);
      recommendations.push({ priority: 'high', title: 'Aumente o número de avaliações', description: 'Use a Hello Growth para enviar links de avaliação automaticamente.', impact: 'Mais avaliações aumentam visibilidade e confiança' });
    } else {
      weaknesses.push('Nenhuma avaliação ainda — prioridade máxima');
      recommendations.push({ priority: 'high', title: 'Obtenha suas primeiras avaliações', description: 'Peça para clientes fiéis avaliarem no Google.', impact: 'Essencial para aparecer nas buscas locais' });
    }

    if (engagementMetrics.totalReviews >= 20) strengths.push(`${engagementMetrics.totalReviews} avaliações no total — bom volume`);
    if (photoCount >= 10) strengths.push(`${photoCount} fotos — perfil bem ilustrado`);
    else if (photoCount > 0) { weaknesses.push(`Apenas ${photoCount} foto(s) — ideal é 10+`); recommendations.push({ priority: 'medium', title: 'Adicione mais fotos', description: 'Fotos do ambiente, produtos e equipe.', impact: 'Perfis com 10+ fotos recebem 35% mais cliques' }); }
    else { weaknesses.push('Sem fotos no perfil'); recommendations.push({ priority: 'high', title: 'Adicione fotos ao perfil', description: 'Fotos aumentam a confiança e cliques.', impact: '+35% de cliques em média' }); }

    if (hasHours) strengths.push('Horário de funcionamento configurado');
    else { weaknesses.push('Horário não configurado'); recommendations.push({ priority: 'high', title: 'Configure os horários', description: 'Clientes precisam saber quando você está aberto.', impact: '+25 pts no score de Visibilidade' }); }

    if (hasWebsite) strengths.push('Website vinculado ao perfil');
    else { weaknesses.push('Sem website vinculado'); recommendations.push({ priority: 'medium', title: 'Adicione um website', description: 'Aumenta credibilidade e conversões.', impact: '+25 pts no score de Visibilidade' }); }

    if (hasPhone) strengths.push('Telefone configurado');
    else weaknesses.push('Telefone não configurado');

    let evolution: AIAnalysis['evolution'] | undefined;
    if (previousAnalysis) {
      const improved: string[] = [];
      const declined: string[] = [];
      if (overallScore > previousAnalysis.scores.overall + 2) improved.push(`Score geral subiu de ${previousAnalysis.scores.overall} para ${overallScore}`);
      if (overallScore < previousAnalysis.scores.overall - 2) declined.push(`Score geral caiu de ${previousAnalysis.scores.overall} para ${overallScore}`);
      if (reputationScore > previousAnalysis.scores.reputation + 2) improved.push(`Reputação melhorou de ${previousAnalysis.scores.reputation} para ${reputationScore}`);
      if (reputationScore < previousAnalysis.scores.reputation - 2) declined.push(`Reputação caiu de ${previousAnalysis.scores.reputation} para ${reputationScore}`);
      if (visibilityScore > previousAnalysis.scores.visibility + 2) improved.push(`Visibilidade melhorou de ${previousAnalysis.scores.visibility} para ${visibilityScore}`);
      if (visibilityScore < previousAnalysis.scores.visibility - 2) declined.push(`Visibilidade caiu de ${previousAnalysis.scores.visibility} para ${visibilityScore}`);
      if (engagementScore > previousAnalysis.scores.engagement + 2) improved.push(`Engajamento melhorou de ${previousAnalysis.scores.engagement} para ${engagementScore}`);
      if (engagementScore < previousAnalysis.scores.engagement - 2) declined.push(`Engajamento caiu de ${previousAnalysis.scores.engagement} para ${engagementScore}`);
      const diff = overallScore - previousAnalysis.scores.overall;
      evolution = {
        summary: diff > 2 ? `Evolução positiva: +${diff} pts desde o último diagnóstico.` : diff < -2 ? `Atenção: -${Math.abs(diff)} pts desde o último diagnóstico.` : 'Presença digital estável.',
        improved: improved.length > 0 ? improved : ['Nenhuma melhora significativa'],
        declined
      };
    }

    return {
      summary: `${placeData.name || 'O negócio'} tem score geral ${overallScore}/100 (${getScoreLabel(overallScore)}). ${rating > 0 ? `Nota ${rating}★ com ${reviewCount} avaliações` : 'Sem avaliações ainda'}${rating > 0 && benchmark ? ` — média do setor ${benchmark.label}: ${benchmark.avgRating}★` : ''}.`,
      strengths: strengths.length > 0 ? strengths : ['Negócio cadastrado no Google Meu Negócio'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['Nenhum ponto crítico identificado'],
      recommendations,
      scores: { reputation: reputationScore, visibility: visibilityScore, engagement: engagementScore, overall: overallScore },
      evolution,
      todoItems: todos || [],
    };
  };

  const handleRunDiagnostic = async () => {
    if (!effectivePlaceId) {
      setError('Configure o Google Place ID no Perfil do Negócio para analisar sua presença digital.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      let dataToAnalyze: GooglePlaceData;

      setAnalysisStep('Buscando dados do Google...');
      const placeData = await fetchGooglePlaceData(effectivePlaceId);
      dataToAnalyze = placeData && placeData.name ? placeData : {
        name: settings.companyName || 'Seu Negócio',
        formatted_address: '', formatted_phone_number: settings.phone, website: settings.website,
        rating: 0, user_ratings_total: 0, reviews: [],
        opening_hours: undefined, photos: [], types: ['establishment'], business_status: 'OPERATIONAL'
      };

      setAnalysisStep('Gerando to-do list...');
      const scores = calculateScores(dataToAnalyze);
      const generatedTodos = generateTodoItems(dataToAnalyze, scores);

      setAnalysisStep('Analisando com IA...');
      const previousAnalysis = latestDiagnostic?.ai_analysis || null;
      const aiAnalysis = await generateAIAnalysis(dataToAnalyze, previousAnalysis, generatedTodos);

      setAnalysisStep('Salvando diagnóstico...');
      const resolvedTenantId = businessProfile?.tenant_id || activeTenantId || tenantId || userId;
      const { error: saveError } = await supabase
        .from('digital_diagnostics')
        .insert({
          user_id: userId,
          tenant_id: resolvedTenantId,
          place_data: dataToAnalyze,
          ai_analysis: aiAnalysis,
          score_reputation: aiAnalysis.scores.reputation,
          score_information: aiAnalysis.scores.visibility,
          score_engagement: aiAnalysis.scores.engagement,
          overall_score: aiAnalysis.scores.overall,
          details: dataToAnalyze,
          recommendations: aiAnalysis.recommendations
        });

      if (saveError) throw saveError;
      setTodoItems(generatedTodos);
      await fetchDiagnostics();
      setActiveTab('overview');
    } catch (e) {
      console.error('Error running diagnostic:', e);
      setError('Erro ao executar diagnóstico. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const toggleTodoItem = (id: string) => {
    setTodoItems(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  // ─── Dados para gráficos ──────────────────────────────────────────────────

  const evolutionData = useMemo(() => diagnostics
    .filter(d => d.ai_analysis)
    .slice(0, 12)
    .reverse()
    .map((d) => ({
      date: new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      fullDate: new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      Geral: d.ai_analysis?.scores.overall || 0,
      Reputação: d.ai_analysis?.scores.reputation || 0,
      Visibilidade: d.ai_analysis?.scores.visibility || 0,
      Engajamento: d.ai_analysis?.scores.engagement || 0,
    })), [diagnostics]);

  const comparisonData = useMemo(() => {
    if (!latestDiagnostic?.ai_analysis) return [];
    const latest = latestDiagnostic.ai_analysis.scores;
    const previous = previousDiagnostic?.ai_analysis?.scores;
    return [
      { dimension: 'Reputação', Atual: latest.reputation, Anterior: previous?.reputation || null },
      { dimension: 'Visibilidade', Atual: latest.visibility, Anterior: previous?.visibility || null },
      { dimension: 'Engajamento', Atual: latest.engagement, Anterior: previous?.engagement || null },
      { dimension: 'Geral', Atual: latest.overall, Anterior: previous?.overall || null },
    ];
  }, [latestDiagnostic, previousDiagnostic]);

  const radarData = latestDiagnostic?.ai_analysis ? [
    { subject: 'Reputação', value: latestDiagnostic.ai_analysis.scores.reputation, previous: previousDiagnostic?.ai_analysis?.scores.reputation ?? null, fullMark: 100 },
    { subject: 'Visibilidade', value: latestDiagnostic.ai_analysis.scores.visibility, previous: previousDiagnostic?.ai_analysis?.scores.visibility ?? null, fullMark: 100 },
    { subject: 'Engajamento', value: latestDiagnostic.ai_analysis.scores.engagement, previous: previousDiagnostic?.ai_analysis?.scores.engagement ?? null, fullMark: 100 },
  ] : [];

  // Projeções de cenário
  const projectionData = useMemo(() => {
    if (!latestDiagnostic?.ai_analysis) return [];
    const current = latestDiagnostic.ai_analysis.scores.overall;
    const pendingTodos = todoItems.filter(t => !t.completed);
    const maxGain = pendingTodos.reduce((sum, t) => sum + Math.round(t.impactScore * 0.3), 0);
    return [
      { cenario: 'Implementar tudo', score: Math.min(100, current + maxGain), color: '#10b981' },
      { cenario: 'Manter atual', score: current, color: '#6366f1' },
      { cenario: 'Sem ação (3 meses)', score: Math.max(0, current - 8), color: '#ef4444' },
    ];
  }, [latestDiagnostic, todoItems]);

  // ─── Helpers de UI ────────────────────────────────────────────────────────

  const getScoreColor = (score: number) => score >= 85 ? 'text-green-600' : score >= 65 ? 'text-yellow-600' : 'text-red-600';
  const getScoreBg = (score: number) => score >= 85 ? 'bg-green-50 border-green-200' : score >= 65 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
  const getScoreLabel = (score: number) => score >= 85 ? 'Excelente' : score >= 65 ? 'Bom' : score >= 45 ? 'Regular' : 'Precisa melhorar';

  const getDeltaIcon = (current: number, previous: number | undefined) => {
    if (!previous) return null;
    const diff = current - previous;
    if (diff > 2) return <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><ArrowUp size={12} />+{diff}</span>;
    if (diff < -2) return <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><ArrowDown size={12} />{diff}</span>;
    return <span className="flex items-center gap-1 text-gray-400 text-xs"><Minus size={12} />0</span>;
  };

  const placeData = latestDiagnostic?.place_data;
  const aiAnalysis = latestDiagnostic?.ai_analysis;
  const prevScores = previousDiagnostic?.ai_analysis?.scores;
  const benchmark = getSectorBenchmark(placeData?.types);

  if (isLoading) {
    return (
      <div className="p-8 min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {openMetricInfo && (
        <ScoreDetailModal
          metricKey={openMetricInfo}
          score={modalScore}
          prevScore={modalPrevScore}
          criteria={modalCriteria}
          onClose={() => setOpenMetricInfo(null)}
        />
      )}

      {/* Diário do Dia Modal */}
      {showDailyDigest && latestDiagnostic?.ai_analysis?.dailyDigest && (() => {
        const digest = latestDiagnostic.ai_analysis.dailyDigest;
        const scores = latestDiagnostic.ai_analysis.scores;
        const prevScoresModal = previousDiagnostic?.ai_analysis?.scores;
        const delta = prevScoresModal ? scores.overall - prevScoresModal.overall : 0;
        const generatedDate = digest.generatedAt
          ? new Date(digest.generatedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
          : new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDailyDigest(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Newspaper size={22} />
                    <span className="font-bold text-lg">Diário do Dia</span>
                  </div>
                  <button onClick={() => setShowDailyDigest(false)} className="text-white/80 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-white/80 text-sm capitalize">{generatedDate}</p>
              </div>

              <div className="p-6 space-y-5">
                {/* Score geral com delta */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Score Geral</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-4xl font-bold ${getScoreColor(scores.overall)}`}>{scores.overall}</span>
                      <span className="text-gray-400 text-lg">/100</span>
                    </div>
                  </div>
                  {delta !== 0 && (
                    <div className={`flex flex-col items-center px-4 py-2 rounded-xl ${delta > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {delta > 0 ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                      <span className="font-bold text-lg">{delta > 0 ? '+' : ''}{delta}</span>
                      <span className="text-xs">vs ontem</span>
                    </div>
                  )}
                </div>

                {/* Scores por dimensão */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Reputação', value: scores.reputation, prev: prevScoresModal?.reputation },
                    { label: 'Visibilidade', value: scores.visibility, prev: prevScoresModal?.visibility },
                    { label: 'Engajamento', value: scores.engagement, prev: prevScoresModal?.engagement },
                  ].map(s => {
                    const d = s.prev ? s.value - s.prev : 0;
                    return (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                        <p className={`text-2xl font-bold ${getScoreColor(s.value)}`}>{s.value}</p>
                        {d !== 0 && (
                          <p className={`text-xs mt-0.5 ${d > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {d > 0 ? '+' : ''}{d}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Novas avaliações */}
                {digest.newReviewsCount > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="text-yellow-500 fill-yellow-500" size={16} />
                      <span className="font-semibold text-blue-800 text-sm">{digest.newReviewsCount} nova{digest.newReviewsCount > 1 ? 's' : ''} avaliação{digest.newReviewsCount > 1 ? 'ões' : ''} detectada{digest.newReviewsCount > 1 ? 's' : ''}</span>
                    </div>
                    {digest.newReviews?.slice(0, 3).map((r: any, i: number) => (
                      <div key={i} className="mb-2 last:mb-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{r.author_name}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, j) => (
                              <Star key={j} size={11} className={j < r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} />
                            ))}
                          </div>
                        </div>
                        {r.text && <p className="text-xs text-gray-500 mt-0.5">"{r.text.substring(0, 80)}{r.text.length > 80 ? '...' : ''}"</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Resumo da IA */}
                {digest.summary && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={15} className="text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700">Análise do dia</span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{digest.summary}</p>
                  </div>
                )}

                {/* Nota média e total */}
                <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-100">
                  <span>Nota média: <strong className="text-gray-800">{latestDiagnostic.place_data?.rating?.toFixed(1) || '-'}★</strong></span>
                  <span>Total de avaliações: <strong className="text-gray-800">{latestDiagnostic.place_data?.user_ratings_total?.toLocaleString('pt-BR') || '-'}</strong></span>
                </div>

                <button
                  onClick={() => setShowDailyDigest(false)}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Globe className="text-primary-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Minha Presença Digital</h1>
            <p className="text-gray-500 text-sm">
              Análise completa do seu perfil no Google Meu Negócio
              {diagnostics.length > 0 && (
                <span className="ml-2 text-primary-600 font-medium">• {diagnostics.length} diagnóstico{diagnostics.length > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {diagnostics.length > 1 && (
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <History size={16} />
              Histórico ({diagnostics.length})
            </button>
          )}
          {/* Botão de diagnóstico manual — visível quando há Place ID */}
          {effectivePlaceId && !isAnalyzing && (
            <button
              onClick={handleRunDiagnostic}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
            >
              <Sparkles size={15} />
              {diagnostics.length > 0 ? 'Novo diagnóstico' : 'Gerar diagnóstico agora'}
            </button>
          )}
          {isAnalyzing && (
            <span className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg text-sm border border-primary-200">
              <Loader2 className="animate-spin" size={16} />{analysisStep || 'Atualizando...'}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={20} />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      )}

      {/* No Place ID */}
      {!effectivePlaceId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-yellow-600 mt-1" size={24} />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">Configure sua presença digital</h3>
              <p className="text-yellow-700 mb-4">
                Para analisar sua presença digital, configure o Google Place ID no Perfil do Negócio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Business Info */}
      {placeData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Globe className="text-primary-600" size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-800">{placeData.name || settings.companyName}</h2>
              <p className="text-gray-500 flex items-center gap-2 mt-1 text-sm">
                <MapPin size={13} />{placeData.formatted_address || 'Endereço não disponível'}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {placeData.rating && placeData.rating > 0 ? (
                  <span className="flex items-center gap-1 text-yellow-600 text-sm">
                    <Star size={14} fill="currentColor" />
                    {placeData.rating} ({placeData.user_ratings_total?.toLocaleString('pt-BR')} avaliações)
                  </span>
                ) : <span className="text-gray-400 text-sm">Sem avaliações</span>}
                {placeData.formatted_phone_number && (
                  <span className="flex items-center gap-1 text-gray-600 text-sm"><Phone size={13} />{placeData.formatted_phone_number}</span>
                )}
                {placeData.website && (
                  <a href={placeData.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                    <Globe size={13} />Website
                  </a>
                )}
                {/* Benchmark do setor */}
                <span className="flex items-center gap-1 text-gray-400 text-xs border border-gray-200 px-2 py-0.5 rounded-full">
                  <Award size={11} /> Setor: {benchmark.label} — média {benchmark.avgRating}★ / {benchmark.avgReviews} avaliações
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {latestDiagnostic?.ai_analysis?.dailyDigest && (
                <button
                  onClick={() => setShowDailyDigest(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                >
                  <Newspaper size={14} />
                  Diário do Dia
                </button>
              )}
              {placeData.url && (
                <a href={placeData.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                  <ExternalLink size={14} />Ver no Google
                </a>
              )}
              <span className="text-xs text-gray-400">
                Último diagnóstico: {new Date(latestDiagnostic.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Score Cards */}
      {aiAnalysis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {([
            { label: 'Score Geral', score: aiAnalysis.scores.overall, prev: prevScores?.overall, icon: <Activity size={16} />, key: 'overall' as const },
            { label: 'Reputação', score: aiAnalysis.scores.reputation, prev: prevScores?.reputation, icon: <Star size={16} />, key: 'reputation' as const },
            { label: 'Visibilidade', score: aiAnalysis.scores.visibility, prev: prevScores?.visibility, icon: <Eye size={16} />, key: 'visibility' as const },
            { label: 'Engajamento', score: aiAnalysis.scores.engagement, prev: prevScores?.engagement, icon: <MessageSquare size={16} />, key: 'engagement' as const },
          ] as const).map((item) => {
            const pd = latestDiagnostic?.place_data;

            const buildCriteria = () => {
              const c: { label: string; pts: number; maxPts: number; ok: boolean }[] = [];
              if (item.key === 'reputation' && pd) {
                const ratingPts = (pd.user_ratings_total || 0) === 0 ? 0 : Math.min(55, Math.round(Math.pow((pd.rating || 0) / 5, 1.8) * 55));
                const reviewPts = (pd.user_ratings_total || 0) === 0 ? 0 : Math.min(45, Math.round(Math.log((pd.user_ratings_total || 0) + 1) / Math.log(500) * 45));
                c.push({ label: `Nota média (${pd.rating || 0}★)`, pts: ratingPts, maxPts: 55, ok: ratingPts >= 44 });
                c.push({ label: `Volume de avaliações (${pd.user_ratings_total || 0})`, pts: reviewPts, maxPts: 45, ok: reviewPts >= 30 });
              } else if (item.key === 'visibility' && pd) {
                const photoCount = pd.photos?.length || 0;
                const photoPts = photoCount >= 25 ? 30 : photoCount >= 15 ? 24 : photoCount >= 5 ? 16 : photoCount >= 1 ? 8 : 0;
                c.push({ label: `Fotos (${photoCount} fotos)`, pts: photoPts, maxPts: 30, ok: photoPts >= 30 });
                c.push({ label: 'Horários configurados', pts: pd.opening_hours?.weekday_text?.length ? 25 : 0, maxPts: 25, ok: !!pd.opening_hours?.weekday_text?.length });
                c.push({ label: 'Website vinculado', pts: pd.website ? 25 : 0, maxPts: 25, ok: !!pd.website });
                c.push({ label: 'Telefone cadastrado', pts: pd.formatted_phone_number ? 20 : 0, maxPts: 20, ok: !!pd.formatted_phone_number });
              } else if (item.key === 'engagement' && pd) {
                const eng = calculateEngagementMetrics(pd);
                const volumePts = Math.min(50, Math.round(Math.log((pd.user_ratings_total || 0) + 1) / Math.log(1000) * 50));
                const ratingPts = Math.min(50, Math.round(Math.pow((pd.rating || 0) / 5, 1.5) * 50));
                c.push({ label: `Volume de avaliações (${eng.totalReviews} total)`, pts: volumePts, maxPts: 50, ok: volumePts >= 25 });
                c.push({ label: `Nota média (${pd.rating || 0}★)`, pts: ratingPts, maxPts: 50, ok: ratingPts >= 40 });
              } else if (item.key === 'overall') {
                c.push({ label: `Reputação (peso 40%)`, pts: Math.round(aiAnalysis.scores.reputation * 0.4), maxPts: 40, ok: aiAnalysis.scores.reputation >= 70 });
                c.push({ label: `Visibilidade (peso 35%)`, pts: Math.round(aiAnalysis.scores.visibility * 0.35), maxPts: 35, ok: aiAnalysis.scores.visibility >= 70 });
                c.push({ label: `Engajamento (peso 25%)`, pts: Math.round(aiAnalysis.scores.engagement * 0.25), maxPts: 25, ok: aiAnalysis.scores.engagement >= 70 });
              }
              return c;
            };

            const handleCardClick = () => {
              setModalScore(item.score);
              setModalPrevScore(item.prev ?? null);
              setModalCriteria(buildCriteria());
              setOpenMetricInfo(item.key);
            };

            return (
              <div
                key={item.key}
                className={`rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${getScoreBg(item.score)}`}
                onClick={handleCardClick}
              >
                <div className="p-4 select-none">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-xs font-medium">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">{item.icon}</span>
                      <Info size={13} className="text-gray-300" />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className={`text-3xl font-bold ${getScoreColor(item.score)}`}>{item.score}</div>
                    {getDeltaIcon(item.score, item.prev)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{getScoreLabel(item.score)}</div>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.score >= 85 ? 'bg-green-500' : item.score >= 65 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-2">Clique para entender o cálculo</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      {aiAnalysis && (
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Análise', icon: <Sparkles size={14} /> },
            { id: 'todo', label: `To-Do (${todoItems.filter(t => !t.completed).length})`, icon: <CheckSquare size={14} /> },
            { id: 'evolution', label: 'Evolução', icon: <TrendingUp size={14} /> },
            { id: 'reviews', label: 'Avaliações', icon: <Star size={14} /> },

          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab: Análise ── */}
      {activeTab === 'overview' && aiAnalysis && (
        <div className="space-y-6">
          {/* AI Summary */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="text-purple-600 flex-shrink-0 mt-0.5" size={22} />
              <div>
                <h3 className="font-semibold text-purple-800 mb-1">Análise da IA</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{aiAnalysis.summary}</p>
              </div>
            </div>
          </div>

          {/* Evolução (se houver) */}
          {aiAnalysis.evolution && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="text-primary-600" size={20} />
                <h3 className="font-semibold text-gray-800">Evolução desde o último diagnóstico</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4 italic">{aiAnalysis.evolution.summary}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiAnalysis.evolution.improved.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2"><ArrowUp size={14} />O que melhorou</h4>
                    <div className="space-y-1.5">
                      {aiAnalysis.evolution.improved.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-green-50 rounded-lg">
                          <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiAnalysis.evolution.declined.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2"><ArrowDown size={14} />O que piorou</h4>
                    <div className="space-y-1.5">
                      {aiAnalysis.evolution.declined.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg">
                          <AlertTriangle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Benchmarks */}
          {placeData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="text-yellow-600" size={20} />
                <h3 className="font-semibold text-gray-800">Comparação com o Setor — {benchmark.label}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nota */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Nota média</span>
                    <span className="font-medium">
                      <span className={placeData.rating && placeData.rating >= benchmark.avgRating ? 'text-green-600' : 'text-red-500'}>
                        {placeData.rating?.toFixed(1) || '—'}★
                      </span>
                      <span className="text-gray-400 ml-1">/ setor: {benchmark.avgRating}★</span>
                    </span>
                  </div>
                  <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="absolute h-full bg-gray-300 rounded-full" style={{ width: `${(benchmark.avgRating / 5) * 100}%` }} />
                    <div className="absolute h-full bg-yellow-400 rounded-full" style={{ width: `${((placeData.rating || 0) / 5) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0★</span><span>5★</span>
                  </div>
                </div>
                {/* Avaliações */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Nº de avaliações</span>
                    <span className="font-medium">
                      <span className={placeData.user_ratings_total && placeData.user_ratings_total >= benchmark.avgReviews ? 'text-green-600' : 'text-orange-500'}>
                        {placeData.user_ratings_total?.toLocaleString('pt-BR') || '0'}
                      </span>
                      <span className="text-gray-400 ml-1">/ setor: {benchmark.avgReviews}</span>
                    </span>
                  </div>
                  <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="absolute h-full bg-gray-300 rounded-full" style={{ width: `${Math.min(100, (benchmark.avgReviews / Math.max(benchmark.avgReviews * 2, 1)) * 100)}%` }} />
                    <div className="absolute h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, ((placeData.user_ratings_total || 0) / Math.max(benchmark.avgReviews * 2, 1)) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0</span><span>{benchmark.avgReviews * 2}+</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Projeções de cenário */}
          {projectionData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="text-orange-500" size={20} />
                <h3 className="font-semibold text-gray-800">Projeção de Cenários (próximos 3 meses)</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {projectionData.map((scenario, i) => (
                  <div key={i} className={`rounded-xl border p-4 text-center ${
                    i === 0 ? 'border-green-200 bg-green-50' :
                    i === 1 ? 'border-blue-200 bg-blue-50' :
                    'border-red-200 bg-red-50'
                  }`}>
                    <div className={`text-3xl font-bold mb-1 ${
                      i === 0 ? 'text-green-600' : i === 1 ? 'text-blue-600' : 'text-red-600'
                    }`}>{scenario.score}</div>
                    <div className="text-xs font-medium text-gray-700">{scenario.cenario}</div>
                    <div className={`text-xs mt-1 ${
                      i === 0 ? 'text-green-600' : i === 1 ? 'text-gray-500' : 'text-red-600'
                    }`}>
                      {i === 0 ? `+${scenario.score - projectionData[1].score} pts` :
                       i === 1 ? 'Score atual' :
                       `-${projectionData[1].score - scenario.score} pts`}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                * Projeções baseadas nas ações pendentes no To-Do e tendências de mercado
              </p>
            </div>
          )}

          {/* Pontos fortes e fracos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ThumbsUp className="text-green-600" size={20} />
                <h3 className="font-semibold text-gray-800">Pontos Fortes</h3>
              </div>
              <div className="space-y-2">
                {aiAnalysis.strengths.map((strength, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                    <span className="text-gray-700 text-sm">{strength}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ThumbsDown className="text-red-600" size={20} />
                <h3 className="font-semibold text-gray-800">Pontos a Melhorar</h3>
              </div>
              <div className="space-y-2">
                {aiAnalysis.weaknesses.map((weakness, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
                    <span className="text-gray-700 text-sm">{weakness}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Link para To-Do */}
          {aiAnalysis.recommendations.length > 0 && (
            <div
              className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-orange-300 transition-colors"
              onClick={() => setActiveTab('todo')}
            >
              <div className="flex items-center gap-3">
                <Zap className="text-orange-500" size={20} />
                <div>
                  <h4 className="font-semibold text-orange-800 text-sm">Plano de Ação Gerado</h4>
                  <p className="text-orange-700 text-xs mt-0.5">{aiAnalysis.recommendations.length} recomendações disponíveis no To-Do</p>
                </div>
              </div>
              <span className="text-orange-600 text-sm font-medium flex items-center gap-1">
                Ver To-Do <ChevronRight size={16} />
              </span>
            </div>
          )}

          {/* Radar */}
          {radarData.length > 0 && (() => {
            const hasPrevious = radarData.some(d => d.previous !== null);
            const bm = benchmark;
            const bmReputationScore = bm ? Math.min(100, Math.round((bm.avgRating / 5) * 60 + Math.min(40, Math.log10(bm.avgReviews + 1) * 20))) : null;
            const dimensionDetails: Record<string, { icon: React.ReactNode; tips: string[]; color: string }> = {
              'Reputação': { icon: <Star size={16} className="text-yellow-500" />, tips: METRIC_EXPLANATIONS.reputation.howToImprove, color: 'yellow' },
              'Visibilidade': { icon: <Eye size={16} className="text-blue-500" />, tips: METRIC_EXPLANATIONS.visibility.howToImprove, color: 'blue' },
              'Engajamento': { icon: <MessageSquare size={16} className="text-green-500" />, tips: METRIC_EXPLANATIONS.engagement.howToImprove, color: 'green' },
            };
            return (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="text-primary-600" size={20} />
                    <h3 className="font-semibold text-gray-800">Visão Geral por Dimensão</h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block opacity-80"></span> Atual</span>
                    {hasPrevious && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block opacity-60"></span> Anterior</span>}
                    {bmReputationScore && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block opacity-60"></span> Setor ({bm?.label})</span>}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">Clique em uma dimensão para ver dicas de melhoria</p>
                <div style={{ outline: 'none' }} tabIndex={-1}>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData} style={{ outline: 'none' }} onClick={(data: any) => {
                    if (data?.activeLabel) setClickedDimension(clickedDimension === data.activeLabel ? null : data.activeLabel);
                  }}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13, cursor: 'pointer' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 11 }} />
                    {hasPrevious && (
                      <Radar name="Anterior" dataKey="previous" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.15} strokeDasharray="4 2" />
                    )}
                    {bmReputationScore && (
                      <Radar name="Setor" dataKey="benchmark" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.1} strokeDasharray="2 2" />
                    )}
                    <Radar name="Atual" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
                </div>
                {/* Painel de detalhes ao clicar */}
                {clickedDimension && dimensionDetails[clickedDimension] && (
                  <div className={`mt-4 border rounded-xl p-4 bg-${dimensionDetails[clickedDimension].color}-50 border-${dimensionDetails[clickedDimension].color}-200`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        {dimensionDetails[clickedDimension].icon}
                        Como melhorar: {clickedDimension}
                      </h4>
                      <button onClick={() => setClickedDimension(null)} className="text-gray-400 hover:text-gray-600">×</button>
                    </div>
                    <ul className="space-y-2">
                      {dimensionDetails[clickedDimension].tips.map((tip, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-primary-500 font-bold mt-0.5">→</span>{tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Tabela de comparação */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {radarData.map((d) => (
                    <div
                      key={d.subject}
                      className={`rounded-lg p-3 border cursor-pointer transition-all ${clickedDimension === d.subject ? 'border-primary-400 bg-primary-50' : 'border-gray-100 bg-gray-50 hover:border-gray-300'}`}
                      onClick={() => setClickedDimension(clickedDimension === d.subject ? null : d.subject)}
                    >
                      <p className="text-xs text-gray-500 mb-1">{d.subject}</p>
                      <p className={`text-xl font-bold ${getScoreColor(d.value)}`}>{d.value}</p>
                      {d.previous !== null && (
                        <p className="text-xs text-gray-400">
                          Anterior: {d.previous} {d.value > d.previous ? <span className="text-green-500">(+{d.value - d.previous})</span> : d.value < d.previous ? <span className="text-red-500">({d.value - d.previous})</span> : <span className="text-gray-400">(=)</span>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Tab: To-Do List ── */}
      {activeTab === 'todo' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-100 p-5">
            <div className="flex items-center gap-3">
              <Zap className="text-orange-500" size={22} />
              <div>
                <h3 className="font-semibold text-orange-800">Plano de Ação Personalizado</h3>
                <p className="text-orange-700 text-sm mt-0.5">
                  {todoItems.filter(t => !t.completed).length} ação(ões) pendente(s) •
                  Potencial de ganho: +{todoItems.filter(t => !t.completed).reduce((sum, t) => sum + Math.round(t.impactScore * 0.3), 0)} pts no score geral
                </p>
              </div>
            </div>
          </div>

          {todoItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <CheckCircle className="mx-auto text-green-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhuma ação pendente</h3>
              <p className="text-gray-500">Execute um diagnóstico para gerar seu plano de ação personalizado.</p>
            </div>
          ) : (
            <>
              {(['high', 'medium', 'low'] as const).map(priority => {
                const items = todoItems.filter(t => t.priority === priority);
                if (items.length === 0) return null;
                return (
                  <div key={priority} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className={`font-semibold mb-4 flex items-center gap-2 text-sm ${
                      priority === 'high' ? 'text-red-700' : priority === 'medium' ? 'text-yellow-700' : 'text-blue-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${priority === 'high' ? 'bg-red-500' : priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`}></span>
                      {priority === 'high' ? 'Prioridade Alta' : priority === 'medium' ? 'Prioridade Média' : 'Prioridade Baixa'}
                    </h3>
                    <div className="space-y-3">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                            item.completed ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 hover:border-primary-200'
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0 cursor-pointer" onClick={() => toggleTodoItem(item.id)}>
                            {item.completed
                              ? <CheckSquare size={20} className="text-green-500" />
                              : <Square size={20} className="text-gray-400" />
                            }
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 mt-0.5 ${
                                item.priority === 'high' ? 'bg-red-100 text-red-700' :
                                item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                              </span>
                              <h4 className={`font-medium text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {item.title}
                              </h4>
                            </div>
                            <p className="text-gray-500 text-sm mt-1">{item.description}</p>
                            {item.impact && (
                              <p className="text-green-600 text-xs mt-2 flex items-center gap-1">
                                <Target size={12} />{item.impact}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Evolução ── */}
      {activeTab === 'evolution' && (
        <div className="space-y-6">
          {evolutionData.length < 2 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <TrendingUp className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Histórico insuficiente</h3>
              <p className="text-gray-500">São necessários pelo menos 2 diagnósticos para visualizar a evolução.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-primary-600" size={20} />
                  <h3 className="font-semibold text-gray-800">Evolução dos Scores ao Longo do Tempo</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={evolutionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="Geral" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Reputação" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="Visibilidade" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="Engajamento" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {comparisonData.length > 0 && previousDiagnostic && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="text-primary-600" size={20} />
                      <h3 className="font-semibold text-gray-800">Comparativo: Atual vs. Anterior</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary-600 inline-block"></span>Atual ({new Date(latestDiagnostic.created_at).toLocaleDateString('pt-BR')})</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-300 inline-block"></span>Anterior ({new Date(previousDiagnostic.created_at).toLocaleDateString('pt-BR')})</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBarChart data={comparisonData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Atual" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Anterior" fill="#d1d5db" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabela histórico */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <History className="text-primary-600" size={20} />
                  <h3 className="font-semibold text-gray-800">Histórico Completo</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Data</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">Geral</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">Reputação</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">Visibilidade</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">Engajamento</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Resumo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnostics.filter(d => d.ai_analysis).map((d, i) => {
                        const next = diagnostics[i + 1];
                        const diff = next?.ai_analysis ? d.ai_analysis.scores.overall - next.ai_analysis.scores.overall : null;
                        return (
                          <tr key={d.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i === 0 ? 'bg-primary-50/30' : ''}`}>
                            <td className="py-3 px-3 text-gray-700">
                              {new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {i === 0 && <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">Atual</span>}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`font-bold ${getScoreColor(d.ai_analysis.scores.overall)}`}>{d.ai_analysis.scores.overall}</span>
                              {diff !== null && (
                                <span className={`ml-1 text-xs ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                  {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : ''}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center text-gray-700">{d.ai_analysis.scores.reputation}</td>
                            <td className="py-3 px-3 text-center text-gray-700">{d.ai_analysis.scores.visibility}</td>
                            <td className="py-3 px-3 text-center text-gray-700">{d.ai_analysis.scores.engagement}</td>
                            <td className="py-3 px-3 text-gray-500 text-xs max-w-xs truncate">{d.ai_analysis.summary?.substring(0, 80)}...</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Avaliações ── */}
      {activeTab === 'reviews' && (
        <ReviewsTab
          placeData={placeData}
          businessName={placeData?.name || settings.companyName || ''}
          benchmark={benchmark}
        />
      )}



      {/* No diagnostics yet */}
      {!latestDiagnostic && !isAnalyzing && effectivePlaceId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Globe className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhum diagnóstico realizado</h3>
          <p className="text-gray-500 mb-4">O diagnóstico é gerado automaticamente toda segunda-feira às 7h.</p>
          <button
            onClick={handleRunDiagnostic}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            <Sparkles size={16} />
            Gerar diagnóstico agora
          </button>
          <p className="text-gray-400 text-xs mt-3">A análise leva cerca de 30 segundos</p>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Histórico de Diagnósticos</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {diagnostics.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum diagnóstico realizado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {diagnostics.map((diagnostic, index) => (
                    <div key={diagnostic.id} className={`border rounded-lg p-4 ${index === 0 ? 'border-primary-200 bg-primary-50/30' : 'border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">
                          {new Date(diagnostic.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {index === 0 && <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">Atual</span>}
                        </span>
                        {diagnostic.ai_analysis && (
                          <span className={`px-2 py-1 rounded text-sm font-bold ${getScoreBg(diagnostic.ai_analysis.scores.overall)} ${getScoreColor(diagnostic.ai_analysis.scores.overall)}`}>
                            {diagnostic.ai_analysis.scores.overall}/100
                          </span>
                        )}
                      </div>
                      {diagnostic.ai_analysis && (
                        <>
                          <div className="flex gap-3 text-xs text-gray-500 mb-2">
                            <span>Rep: <strong>{diagnostic.ai_analysis.scores.reputation}</strong></span>
                            <span>Vis: <strong>{diagnostic.ai_analysis.scores.visibility}</strong></span>
                            <span>Eng: <strong>{diagnostic.ai_analysis.scores.engagement}</strong></span>
                          </div>
                          <p className="text-gray-600 text-xs leading-relaxed">{diagnostic.ai_analysis.summary}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal de Desconexão / Troca de Conta Google */}

    </div>
  );
};

export default DigitalDiagnosticComponent;
