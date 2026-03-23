'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { AccountSettings } from '@/types';
import { 
  Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, 
  Star, MapPin, Clock, Image, MessageSquare, CheckCircle, AlertTriangle,
  ChevronRight, History, Sparkles, Globe, Phone, ExternalLink, Camera,
  Calendar, Users, ThumbsUp, ThumbsDown, Eye, Lightbulb, Target, Award,
  ArrowUp, ArrowDown, BarChart2, X
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  BarChart, Bar, ReferenceLine
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Google Places API Key - usando variável pública
const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || 'AIzaSyBsyDdAB-ZzDr9Grw0xpAfSUOPngM37Qnk';

interface GooglePlaceData {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  reviews?: GoogleReview[];
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
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
  // Novo: análise comparativa (opcional, presente quando há diagnóstico anterior)
  evolution?: {
    summary: string;
    improved: string[];
    declined: string[];
  };
}

interface DiagnosticData {
  id: string;
  user_id: string;
  place_data: GooglePlaceData;
  ai_analysis: AIAnalysis;
  created_at: string;
}

interface DigitalDiagnosticProps {
  userId: string;
  activeTenantId?: string;
  settings: AccountSettings;
  npsData: any[];
  businessProfile?: any;
}

// Tooltip personalizado para os gráficos
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium text-gray-700 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }}></span>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const DigitalDiagnosticComponent: React.FC<DigitalDiagnosticProps> = ({ userId, activeTenantId, settings, npsData, businessProfile }) => {
  const effectivePlaceId = businessProfile?.google_place_id || settings.placeId || '';
  const tenantIdFromHook = useTenantId();
  const tenantId = activeTenantId || tenantIdFromHook;

  const [diagnostics, setDiagnostics] = useState<DiagnosticData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'evolution' | 'reviews'>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDiagnostics();
  }, [userId, activeTenantId]);

  const fetchDiagnostics = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const localStorageTenantId = typeof window !== 'undefined' ? localStorage.getItem('hg_active_company_id') : null;
      const resolvedTenantId = activeTenantId || localStorageTenantId || tenantId || userId;
      const { data, error } = await supabase
        .from('digital_diagnostics')
        .select('*')
        .eq('tenant_id', resolvedTenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setDiagnostics(data.map(d => ({
          id: d.id,
          user_id: d.user_id,
          place_data: d.place_data || {},
          ai_analysis: d.ai_analysis || null,
          created_at: d.created_at
        })));
      }
    } catch (e) {
      console.error('Error fetching diagnostics:', e);
    } finally {
      setIsLoading(false);
    }
  };

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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch place data');
      }

      const data = await response.json();

      const transformedResult: GooglePlaceData = {
        name: data.displayName?.text || '',
        formatted_address: data.formattedAddress || '',
        formatted_phone_number: data.nationalPhoneNumber || '',
        website: data.websiteUri || '',
        rating: data.rating || 0,
        user_ratings_total: data.userRatingCount || 0,
        reviews: data.reviews?.map((review: any) => ({
          author_name: review.authorAttribution?.displayName || 'Anônimo',
          rating: review.rating || 0,
          text: review.text?.text || '',
          time: review.publishTime ? new Date(review.publishTime).getTime() / 1000 : 0,
          relative_time_description: review.relativePublishTimeDescription || ''
        })) || [],
        opening_hours: data.regularOpeningHours ? {
          open_now: data.regularOpeningHours.openNow || false,
          weekday_text: data.regularOpeningHours.weekdayDescriptions || []
        } : undefined,
        photos: data.photos?.map((photo: any) => ({
          photo_reference: photo.name || ''
        })) || [],
        types: data.types || [],
        business_status: data.businessStatus || 'OPERATIONAL',
        url: data.googleMapsUri || '',
        price_level: 0
      };

      return transformedResult;
    } catch (error) {
      console.error('Error fetching Google Place data:', error);
      return null;
    }
  };

  // Calcular métricas reais de engajamento a partir das avaliações
  const calculateEngagementMetrics = (placeData: GooglePlaceData) => {
    const reviews = placeData.reviews || [];
    const totalReviews = placeData.user_ratings_total || 0;
    
    // Verificar respostas do proprietário nas avaliações visíveis
    // A API do Google não retorna diretamente se há resposta, mas podemos inferir pela atividade
    const recentReviews = reviews.filter(r => {
      const reviewDate = new Date(r.time * 1000);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return reviewDate > sixMonthsAgo;
    });

    const avgRatingRecentReviews = recentReviews.length > 0
      ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
      : 0;

    return {
      totalReviews,
      recentReviewCount: recentReviews.length,
      avgRatingRecentReviews: Math.round(avgRatingRecentReviews * 10) / 10,
      hasRecentActivity: recentReviews.length > 0
    };
  };

  // Generate AI analysis using Gemini - com prompt melhorado e análise comparativa
  const generateAIAnalysis = async (placeData: GooglePlaceData, previousAnalysis?: AIAnalysis | null): Promise<AIAnalysis> => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
      return generateBasicAnalysis(placeData, previousAnalysis);
    }

    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const engagementMetrics = calculateEngagementMetrics(placeData);
      const hasWebsite = !!placeData.website;
      const hasPhone = !!placeData.formatted_phone_number;
      const hasHours = !!placeData.opening_hours?.weekday_text?.length;
      const photoCount = placeData.photos?.length || 0;
      const rating = placeData.rating || 0;
      const totalReviews = placeData.user_ratings_total || 0;

      // Calcular scores de forma determinística para evitar variação entre análises
      const reputationScore = totalReviews === 0 ? 0 : Math.min(100, Math.round(
        (rating / 5) * 60 + Math.min(40, Math.log10(totalReviews + 1) * 20)
      ));
      const visibilityScore = Math.round(
        (photoCount >= 10 ? 30 : photoCount >= 3 ? 20 : photoCount >= 1 ? 10 : 0) +
        (hasHours ? 25 : 0) +
        (hasWebsite ? 25 : 0) +
        (hasPhone ? 20 : 0)
      );
      const engagementScore = totalReviews === 0 ? 0 : Math.min(100, Math.round(
        Math.min(50, engagementMetrics.recentReviewCount * 5) +
        Math.min(50, Math.log10(totalReviews + 1) * 15)
      ));
      const overallScore = Math.round((reputationScore * 0.4 + visibilityScore * 0.35 + engagementScore * 0.25));

      // Contexto comparativo (se houver diagnóstico anterior)
      const comparativeContext = previousAnalysis ? `
DIAGNÓSTICO ANTERIOR (para comparação):
- Score Geral anterior: ${previousAnalysis.scores.overall}
- Reputação anterior: ${previousAnalysis.scores.reputation}
- Visibilidade anterior: ${previousAnalysis.scores.visibility}
- Engajamento anterior: ${previousAnalysis.scores.engagement}
- Pontos fortes anteriores: ${previousAnalysis.strengths.join('; ')}
- Pontos fracos anteriores: ${previousAnalysis.weaknesses.join('; ')}

SCORES CALCULADOS AGORA:
- Score Geral: ${overallScore}
- Reputação: ${reputationScore}
- Visibilidade: ${visibilityScore}
- Engajamento: ${engagementScore}

Com base na comparação, identifique o que melhorou e o que piorou.
` : '';

      const prompt = `
Você é um especialista em marketing digital e presença online de negócios locais.
Analise os dados REAIS do Google Meu Negócio abaixo e forneça uma análise precisa e específica.

DADOS REAIS DO NEGÓCIO:
- Nome: ${placeData.name || 'Não informado'}
- Endereço: ${placeData.formatted_address || 'Não informado'}
- Telefone: ${hasPhone ? placeData.formatted_phone_number + ' (CONFIGURADO)' : 'NÃO CONFIGURADO'}
- Website: ${hasWebsite ? placeData.website + ' (CONFIGURADO)' : 'NÃO CONFIGURADO'}
- Nota média: ${rating > 0 ? rating + ' estrelas' : 'SEM AVALIAÇÕES'}
- Total de avaliações: ${totalReviews}
- Avaliações recentes (últimos 6 meses): ${engagementMetrics.recentReviewCount}
- Nota média das avaliações recentes: ${engagementMetrics.avgRatingRecentReviews > 0 ? engagementMetrics.avgRatingRecentReviews : 'N/A'}
- Status: ${placeData.business_status || 'Não informado'}
- Horário de funcionamento: ${hasHours ? 'CONFIGURADO (' + placeData.opening_hours?.weekday_text?.slice(0, 2).join(', ') + '...)' : 'NÃO CONFIGURADO'}
- Quantidade de fotos: ${photoCount} ${photoCount === 0 ? '(NENHUMA FOTO)' : photoCount < 5 ? '(POUCAS FOTOS)' : '(BOM VOLUME DE FOTOS)'}
- Categorias: ${placeData.types?.slice(0, 5).join(', ') || 'Não informado'}

ÚLTIMAS AVALIAÇÕES RECEBIDAS:
${placeData.reviews?.slice(0, 5).map(r => `- ${r.author_name} (${r.rating}★, ${r.relative_time_description}): "${r.text?.substring(0, 150)}"`).join('\n') || 'Sem avaliações visíveis'}

SCORES JÁ CALCULADOS (USE EXATAMENTE ESTES VALORES):
- reputation: ${reputationScore}
- visibility: ${visibilityScore}
- engagement: ${engagementScore}
- overall: ${overallScore}

${comparativeContext}

INSTRUÇÕES CRÍTICAS:
1. Use EXATAMENTE os scores fornecidos acima. NÃO altere os valores numéricos.
2. Os pontos fortes e fracos devem ser baseados EXCLUSIVAMENTE nos dados reais fornecidos.
3. Se o telefone está configurado, NÃO diga que falta telefone. Se tem fotos, NÃO diga que falta fotos.
4. Seja específico: mencione os valores reais (ex: "nota 4.7", "127 avaliações", "15 fotos").
5. NÃO gere análises genéricas. Cada ponto deve ser justificado pelos dados acima.
6. Se há avaliações recentes, o engajamento é ativo - não diga que não há engajamento.

Responda EXATAMENTE no formato JSON abaixo (sem markdown, apenas JSON puro):
{
  "summary": "Resumo específico e baseado nos dados reais em 2-3 frases",
  "strengths": ["Ponto forte específico com dados reais", "..."],
  "weaknesses": ["Ponto fraco específico com dados reais", "..."],
  "recommendations": [
    {
      "priority": "high",
      "title": "Título específico",
      "description": "Ação concreta e específica para este negócio",
      "impact": "Impacto esperado com dados/percentuais quando possível"
    }
  ],
  "scores": {
    "reputation": ${reputationScore},
    "visibility": ${visibilityScore},
    "engagement": ${engagementScore},
    "overall": ${overallScore}
  }${previousAnalysis ? `,
  "evolution": {
    "summary": "Uma frase resumindo a evolução desde o último diagnóstico",
    "improved": ["O que melhorou especificamente"],
    "declined": ["O que piorou especificamente, ou lista vazia se nada piorou"]
  }` : ''}
}

Forneça de 3 a 5 recomendações priorizadas e específicas para este negócio.
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Garantir que os scores calculados sejam preservados (não sobrescritos pela IA)
        parsed.scores = { reputation: reputationScore, visibility: visibilityScore, engagement: engagementScore, overall: overallScore };
        return parsed;
      }
      
      return generateBasicAnalysis(placeData, previousAnalysis);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      return generateBasicAnalysis(placeData, previousAnalysis);
    }
  };

  // Generate basic analysis without AI - também melhorada
  const generateBasicAnalysis = (placeData: GooglePlaceData, previousAnalysis?: AIAnalysis | null): AIAnalysis => {
    const rating = placeData.rating || 0;
    const reviewCount = placeData.user_ratings_total || 0;
    const hasPhotos = (placeData.photos?.length || 0) > 0;
    const photoCount = placeData.photos?.length || 0;
    const hasHours = !!placeData.opening_hours?.weekday_text?.length;
    const hasWebsite = !!placeData.website;
    const hasPhone = !!placeData.formatted_phone_number;
    const engagementMetrics = calculateEngagementMetrics(placeData);

    // Scores determinísticos
    const reputationScore = reviewCount === 0 ? 0 : Math.min(100, Math.round(
      (rating / 5) * 60 + Math.min(40, Math.log10(reviewCount + 1) * 20)
    ));
    const visibilityScore = Math.round(
      (photoCount >= 10 ? 30 : photoCount >= 3 ? 20 : photoCount >= 1 ? 10 : 0) +
      (hasHours ? 25 : 0) +
      (hasWebsite ? 25 : 0) +
      (hasPhone ? 20 : 0)
    );
    const engagementScore = reviewCount === 0 ? 0 : Math.min(100, Math.round(
      Math.min(50, engagementMetrics.recentReviewCount * 5) +
      Math.min(50, Math.log10(reviewCount + 1) * 15)
    ));
    const overallScore = Math.round((reputationScore * 0.4 + visibilityScore * 0.35 + engagementScore * 0.25));

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: AIAnalysis['recommendations'] = [];

    if (rating >= 4.5) {
      strengths.push(`Excelente nota média de ${rating} estrelas no Google`);
    } else if (rating >= 4.0) {
      strengths.push(`Boa nota média de ${rating} estrelas no Google`);
    } else if (rating > 0) {
      weaknesses.push(`Nota média de ${rating} estrelas precisa melhorar`);
      recommendations.push({
        priority: 'high',
        title: 'Melhore sua nota média',
        description: 'Responda às avaliações negativas com empatia e solicite avaliações de clientes satisfeitos.',
        impact: 'Pode aumentar sua nota em até 0.5 pontos'
      });
    }

    if (reviewCount >= 100) {
      strengths.push(`Grande volume de avaliações: ${reviewCount} avaliações`);
    } else if (reviewCount >= 20) {
      strengths.push(`Bom número de avaliações: ${reviewCount} avaliações`);
    } else if (reviewCount > 0) {
      weaknesses.push(`Volume baixo de avaliações: apenas ${reviewCount}`);
      recommendations.push({
        priority: 'high',
        title: 'Aumente o número de avaliações',
        description: 'Envie links de avaliação para clientes satisfeitos após cada atendimento.',
        impact: 'Mais avaliações aumentam a confiança e visibilidade no Google'
      });
    } else {
      weaknesses.push('Nenhuma avaliação registrada ainda');
      recommendations.push({
        priority: 'high',
        title: 'Obtenha suas primeiras avaliações',
        description: 'Peça para clientes fiéis avaliarem seu negócio no Google.',
        impact: 'Avaliações são o fator mais importante para aparecer nas buscas locais'
      });
    }

    if (engagementMetrics.recentReviewCount > 0) {
      strengths.push(`Atividade recente: ${engagementMetrics.recentReviewCount} avaliações nos últimos 6 meses`);
    }

    if (photoCount >= 10) {
      strengths.push(`Perfil com bom volume de fotos: ${photoCount} fotos`);
    } else if (photoCount >= 3) {
      weaknesses.push(`Poucas fotos no perfil: apenas ${photoCount}`);
      recommendations.push({
        priority: 'medium',
        title: 'Adicione mais fotos ao perfil',
        description: 'Adicione fotos do ambiente, produtos, equipe e serviços. O ideal é ter pelo menos 10 fotos.',
        impact: 'Perfis com 10+ fotos recebem 35% mais cliques'
      });
    } else {
      weaknesses.push('Sem fotos no perfil');
      recommendations.push({
        priority: 'medium',
        title: 'Adicione fotos ao perfil',
        description: 'Fotos de qualidade do estabelecimento, produtos e equipe aumentam a confiança.',
        impact: 'Perfis com fotos recebem 35% mais cliques'
      });
    }

    if (!hasHours) {
      weaknesses.push('Horário de funcionamento não configurado');
      recommendations.push({
        priority: 'medium',
        title: 'Configure os horários de funcionamento',
        description: 'Clientes precisam saber quando você está aberto antes de visitar.',
        impact: 'Evita perda de clientes por informação incorreta'
      });
    } else {
      strengths.push('Horário de funcionamento configurado');
    }

    if (!hasWebsite) {
      weaknesses.push('Sem website vinculado ao perfil');
      recommendations.push({
        priority: 'low',
        title: 'Adicione um website',
        description: 'Um website profissional aumenta a credibilidade do negócio.',
        impact: 'Clientes podem conhecer mais sobre seus serviços'
      });
    } else {
      strengths.push('Website vinculado ao perfil');
    }

    if (!hasPhone) {
      weaknesses.push('Telefone não configurado no perfil');
    } else {
      strengths.push('Telefone configurado no perfil');
    }

    // Análise de evolução comparativa
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
        summary: diff > 2 ? `Evolução positiva: score geral subiu ${diff} pontos desde o último diagnóstico.`
          : diff < -2 ? `Atenção: score geral caiu ${Math.abs(diff)} pontos desde o último diagnóstico.`
          : 'Presença digital estável desde o último diagnóstico.',
        improved: improved.length > 0 ? improved : ['Nenhuma melhora significativa identificada'],
        declined: declined
      };
    }

    return {
      summary: `${placeData.name || 'O negócio'} possui presença digital com score geral de ${overallScore}/100. ${rating > 0 ? `Nota ${rating} com ${reviewCount} avaliações.` : 'Ainda sem avaliações no Google.'} ${overallScore >= 70 ? 'Perfil bem estruturado com oportunidades de crescimento.' : 'Há pontos importantes a melhorar para aumentar a visibilidade.'}`,
      strengths: strengths.length > 0 ? strengths : ['Negócio cadastrado no Google Meu Negócio'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['Nenhum ponto crítico identificado'],
      recommendations,
      scores: {
        reputation: reputationScore,
        visibility: visibilityScore,
        engagement: engagementScore,
        overall: overallScore
      },
      evolution
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
      setAnalysisStep('Buscando dados do Google...');
      const placeData = await fetchGooglePlaceData(effectivePlaceId);
      
      const dataToAnalyze: GooglePlaceData = placeData && placeData.name ? placeData : {
        name: settings.companyName || 'Seu Negócio',
        formatted_address: 'Endereço não disponível',
        formatted_phone_number: settings.phone,
        website: settings.website,
        rating: 0,
        user_ratings_total: 0,
        reviews: [],
        opening_hours: undefined,
        photos: [],
        types: ['establishment'],
        business_status: 'OPERATIONAL'
      };

      setAnalysisStep('Analisando dados com IA...');
      // Passar o diagnóstico anterior para análise comparativa
      const previousAnalysis = latestDiagnostic?.ai_analysis || null;
      const aiAnalysis = await generateAIAnalysis(dataToAnalyze, previousAnalysis);

      setAnalysisStep('Salvando diagnóstico...');
      const resolvedTenantId = activeTenantId || tenantId || userId;
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

  // Dados para gráfico de evolução (todos os diagnósticos, do mais antigo ao mais recente)
  const evolutionData = useMemo(() => {
    return diagnostics
      .filter(d => d.ai_analysis)
      .slice(0, 12)
      .reverse()
      .map((d, index) => ({
        date: new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        fullDate: new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        Geral: d.ai_analysis?.scores.overall || 0,
        Reputação: d.ai_analysis?.scores.reputation || 0,
        Visibilidade: d.ai_analysis?.scores.visibility || 0,
        Engajamento: d.ai_analysis?.scores.engagement || 0,
        index: index + 1
      }));
  }, [diagnostics]);

  // Dados para gráfico de barras comparativo (último vs anterior)
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

  // Radar chart data
  const radarData = latestDiagnostic?.ai_analysis ? [
    { subject: 'Reputação', value: latestDiagnostic.ai_analysis.scores.reputation, fullMark: 100 },
    { subject: 'Visibilidade', value: latestDiagnostic.ai_analysis.scores.visibility, fullMark: 100 },
    { subject: 'Engajamento', value: latestDiagnostic.ai_analysis.scores.engagement, fullMark: 100 },
  ] : [];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Precisa melhorar';
  };

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

  if (isLoading) {
    return (
      <div className="p-8 min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="text-primary-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Minha Presença Digital</h1>
            <p className="text-gray-500 text-sm">
              Análise completa do seu perfil no Google Meu Negócio
              {diagnostics.length > 0 && (
                <span className="ml-2 text-primary-600 font-medium">• {diagnostics.length} diagnóstico{diagnostics.length > 1 ? 's' : ''} realizado{diagnostics.length > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {diagnostics.length > 1 && (
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <History size={16} />
              Histórico ({diagnostics.length})
            </button>
          )}
          <button
            onClick={handleRunDiagnostic}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                {analysisStep}
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Analisar Agora
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={20} />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* No Place ID configured */}
      {!effectivePlaceId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-yellow-600 mt-1" size={24} />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">Configure seu Google Place ID</h3>
              <p className="text-yellow-700 mb-4">
                Para analisar sua presença digital, configure o Google Place ID no <strong>Perfil do Negócio</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Business Info Card */}
      {placeData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Globe className="text-primary-600" size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-800">{placeData.name || settings.companyName}</h2>
              <p className="text-gray-500 flex items-center gap-2 mt-1 text-sm">
                <MapPin size={13} />
                {placeData.formatted_address || 'Endereço não disponível'}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {placeData.rating && placeData.rating > 0 ? (
                  <span className="flex items-center gap-1 text-yellow-600 text-sm">
                    <Star size={14} fill="currentColor" />
                    {placeData.rating} ({placeData.user_ratings_total?.toLocaleString('pt-BR')} avaliações)
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">Sem avaliações</span>
                )}
                {placeData.formatted_phone_number && (
                  <span className="flex items-center gap-1 text-gray-600 text-sm">
                    <Phone size={13} />
                    {placeData.formatted_phone_number}
                  </span>
                )}
                {placeData.website && (
                  <a href={placeData.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                    <Globe size={13} />
                    Website
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {placeData.url && (
                <a 
                  href={placeData.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                >
                  <ExternalLink size={14} />
                  Ver no Google
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
          {[
            { label: 'Score Geral', score: aiAnalysis.scores.overall, prev: prevScores?.overall, icon: <Activity size={16} />, desc: getScoreLabel(aiAnalysis.scores.overall) },
            { label: 'Reputação', score: aiAnalysis.scores.reputation, prev: prevScores?.reputation, icon: <Star size={16} />, desc: 'Nota e avaliações' },
            { label: 'Visibilidade', score: aiAnalysis.scores.visibility, prev: prevScores?.visibility, icon: <Eye size={16} />, desc: 'Fotos, horários, infos' },
            { label: 'Engajamento', score: aiAnalysis.scores.engagement, prev: prevScores?.engagement, icon: <MessageSquare size={16} />, desc: 'Atividade recente' },
          ].map((item, i) => (
            <div key={i} className={`rounded-xl border p-4 ${getScoreBg(item.score)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-xs font-medium">{item.label}</span>
                <span className="text-gray-400">{item.icon}</span>
              </div>
              <div className="flex items-end gap-2">
                <div className={`text-3xl font-bold ${getScoreColor(item.score)}`}>
                  {item.score}
                </div>
                {getDeltaIcon(item.score, item.prev)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {aiAnalysis && (
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {[
            { id: 'overview', label: 'Análise', icon: <Sparkles size={14} /> },
            { id: 'evolution', label: 'Evolução', icon: <TrendingUp size={14} /> },
            { id: 'reviews', label: 'Avaliações', icon: <Star size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab: Análise (Overview) */}
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

          {/* Análise de Evolução (se houver) */}
          {aiAnalysis.evolution && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="text-primary-600" size={20} />
                <h3 className="font-semibold text-gray-800">Evolução desde o Último Diagnóstico</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">{aiAnalysis.evolution.summary}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiAnalysis.evolution.improved.length > 0 && aiAnalysis.evolution.improved[0] !== 'Nenhuma melhora significativa identificada' && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">O que melhorou</p>
                    <div className="space-y-2">
                      {aiAnalysis.evolution.improved.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                          <ArrowUp className="text-green-600 flex-shrink-0 mt-0.5" size={14} />
                          <span className="text-gray-700 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiAnalysis.evolution.declined.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">O que piorou</p>
                    <div className="space-y-2">
                      {aiAnalysis.evolution.declined.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                          <ArrowDown className="text-red-600 flex-shrink-0 mt-0.5" size={14} />
                          <span className="text-gray-700 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Strengths and Weaknesses */}
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

          {/* Recommendations */}
          {aiAnalysis.recommendations.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="text-yellow-600" size={20} />
                <h3 className="font-semibold text-gray-800">Recomendações Prioritárias</h3>
              </div>
              <div className="space-y-3">
                {aiAnalysis.recommendations.map((rec, index) => (
                  <div key={index} className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 mt-0.5 ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 text-sm">{rec.title}</h4>
                        <p className="text-gray-600 text-sm mt-1">{rec.description}</p>
                        <p className="text-green-600 text-xs mt-2 flex items-center gap-1">
                          <Target size={12} />
                          {rec.impact}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Radar Chart */}
          {radarData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="text-primary-600" size={20} />
                <h3 className="font-semibold text-gray-800">Visão Geral por Dimensão</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Radar name="Score" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Tab: Evolução */}
      {activeTab === 'evolution' && (
        <div className="space-y-6">
          {evolutionData.length < 2 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <TrendingUp className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Histórico insuficiente</h3>
              <p className="text-gray-500">São necessários pelo menos 2 diagnósticos para visualizar a evolução. Realize um novo diagnóstico em alguns dias.</p>
            </div>
          ) : (
            <>
              {/* Gráfico de Linha - Evolução ao longo do tempo */}
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

              {/* Gráfico de Barras - Comparativo Atual vs Anterior */}
              {comparisonData.length > 0 && previousDiagnostic && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="text-primary-600" size={20} />
                      <h3 className="font-semibold text-gray-800">Comparativo: Atual vs. Diagnóstico Anterior</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-primary-600 inline-block"></span>
                        Atual ({new Date(latestDiagnostic.created_at).toLocaleDateString('pt-BR')})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-gray-300 inline-block"></span>
                        Anterior ({new Date(previousDiagnostic.created_at).toLocaleDateString('pt-BR')})
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparisonData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Atual" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Anterior" fill="#d1d5db" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabela de histórico */}
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
                              <span className={`font-bold ${getScoreColor(d.ai_analysis.scores.overall)}`}>
                                {d.ai_analysis.scores.overall}
                              </span>
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

      {/* Tab: Avaliações */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {placeData?.reviews && placeData.reviews.length > 0 ? (
            <>
              {/* Distribuição de notas */}
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
                            <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500 w-8">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Lista de avaliações */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="text-blue-600" size={20} />
                  <h3 className="font-semibold text-gray-800">Avaliações Recentes</h3>
                </div>
                <div className="space-y-4">
                  {placeData.reviews.slice(0, 10).map((review, index) => (
                    <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-medium text-gray-800 text-sm">{review.author_name}</span>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} className={i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} />
                          ))}
                        </div>
                        <span className="text-gray-400 text-xs">{review.relative_time_description}</span>
                      </div>
                      {review.text && <p className="text-gray-600 text-sm leading-relaxed">{review.text}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Star className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Sem avaliações disponíveis</h3>
              <p className="text-gray-500">As avaliações do Google aparecerão aqui após o próximo diagnóstico.</p>
            </div>
          )}
        </div>
      )}

      {/* No diagnostics yet */}
      {!latestDiagnostic && !isAnalyzing && effectivePlaceId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Globe className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhum diagnóstico realizado</h3>
          <p className="text-gray-500 mb-6">Clique em "Analisar Agora" para gerar seu primeiro diagnóstico de presença digital.</p>
          <button
            onClick={handleRunDiagnostic}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw size={18} />
            Analisar Agora
          </button>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Histórico de Diagnósticos</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
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
                          {new Date(diagnostic.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                          {index === 0 && <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">Atual</span>}
                        </span>
                        {diagnostic.ai_analysis && (
                          <span className={`px-2 py-1 rounded text-sm font-bold ${getScoreBg(diagnostic.ai_analysis.scores.overall)} ${getScoreColor(diagnostic.ai_analysis.scores.overall)}`}>
                            {diagnostic.ai_analysis.scores.overall}/100
                          </span>
                        )}
                      </div>
                      {diagnostic.ai_analysis && (
                        <div className="flex gap-3 text-xs text-gray-500 mb-2">
                          <span>Rep: <strong>{diagnostic.ai_analysis.scores.reputation}</strong></span>
                          <span>Vis: <strong>{diagnostic.ai_analysis.scores.visibility}</strong></span>
                          <span>Eng: <strong>{diagnostic.ai_analysis.scores.engagement}</strong></span>
                        </div>
                      )}
                      {diagnostic.ai_analysis && (
                        <p className="text-gray-600 text-xs leading-relaxed">{diagnostic.ai_analysis.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalDiagnosticComponent;
