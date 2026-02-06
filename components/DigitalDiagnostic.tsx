'use client';
import React
import { useTenantId } from '@/hooks/useTenantId', { useState, useEffect, useMemo } from 'react';
import { AccountSettings } from '@/types';
import { 
  Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, 
  Star, MapPin, Clock, Image, MessageSquare, CheckCircle, AlertTriangle,
  ChevronRight, History, Sparkles, Globe, Phone, ExternalLink, Camera,
  Calendar, Users, ThumbsUp, ThumbsDown, Eye, Lightbulb, Target, Award
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar } from 'recharts';
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
  settings: AccountSettings;
  npsData: any[];
}

const DigitalDiagnosticComponent: React.FC<DigitalDiagnosticProps> = ({ userId, settings, npsData }) => {
  const tenantId = useTenantId()

  const [diagnostics, setDiagnostics] = useState<DiagnosticData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing diagnostics
  useEffect(() => {
    fetchDiagnostics();
  }, [userId]);

  const fetchDiagnostics = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_diagnostics')
        .select('*')
        .eq('user_id', userId)
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

  // Fetch Google Place data - CHAMADA DIRETA À API DO GOOGLE
  const fetchGooglePlaceData = async (placeId: string): Promise<GooglePlaceData | null> => {
    try {
      console.log('Fetching Google Place data for:', placeId);
      
      // Chamada direta à Places API (New) do Google
      const url = `https://places.googleapis.com/v1/places/${placeId}`;
      
      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,reviews,regularOpeningHours,photos,types,businessStatus,googleMapsUri'
      };

      console.log('Making request to Google Places API...');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Google Places API error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to fetch place data');
      }

      const data = await response.json();
      console.log('Google Places API response:', data);

      // Transform NEW API format to match old format for compatibility
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

      console.log('Transformed result:', transformedResult);
      return transformedResult;
    } catch (error) {
      console.error('Error fetching Google Place data:', error);
      return null;
    }
  };

  // Generate AI analysis using Gemini
  const generateAIAnalysis = async (placeData: GooglePlaceData): Promise<AIAnalysis> => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
      // Generate analysis without AI
      return generateBasicAnalysis(placeData);
    }

    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `
Você é um especialista em marketing digital e presença online de negócios locais.
Analise os dados do Google Meu Negócio abaixo e forneça uma análise detalhada.

DADOS DO NEGÓCIO:
- Nome: ${placeData.name || 'Não informado'}
- Endereço: ${placeData.formatted_address || 'Não informado'}
- Telefone: ${placeData.formatted_phone_number || 'Não informado'}
- Website: ${placeData.website || 'Não informado'}
- Nota média: ${placeData.rating || 'Sem avaliações'} (${placeData.user_ratings_total || 0} avaliações)
- Status: ${placeData.business_status || 'Não informado'}
- Horário de funcionamento: ${placeData.opening_hours?.weekday_text?.join(', ') || 'Não configurado'}
- Quantidade de fotos: ${placeData.photos?.length || 0}
- Categorias: ${placeData.types?.slice(0, 5).join(', ') || 'Não informado'}

ÚLTIMAS AVALIAÇÕES:
${placeData.reviews?.slice(0, 5).map(r => `- ${r.author_name} (${r.rating}★): "${r.text?.substring(0, 100)}..."`).join('\n') || 'Sem avaliações recentes'}

Responda EXATAMENTE no formato JSON abaixo (sem markdown, apenas JSON puro):
{
  "summary": "Resumo geral da presença digital do negócio em 2-3 frases",
  "strengths": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],
  "weaknesses": ["Ponto fraco 1", "Ponto fraco 2", "Ponto fraco 3"],
  "recommendations": [
    {
      "priority": "high",
      "title": "Título da recomendação",
      "description": "Descrição detalhada do que fazer",
      "impact": "Impacto esperado"
    }
  ],
  "scores": {
    "reputation": 75,
    "visibility": 60,
    "engagement": 50,
    "overall": 62
  }
}

REGRAS PARA OS SCORES (0-100):
- reputation: Baseado na nota média e quantidade de avaliações
- visibility: Baseado em fotos, horários, website, completude do perfil
- engagement: Baseado em respostas às avaliações e atividade recente
- overall: Média ponderada dos três

Forneça de 3 a 5 recomendações priorizadas.
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return generateBasicAnalysis(placeData);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      return generateBasicAnalysis(placeData);
    }
  };

  // Generate basic analysis without AI
  const generateBasicAnalysis = (placeData: GooglePlaceData): AIAnalysis => {
    const rating = placeData.rating || 0;
    const reviewCount = placeData.user_ratings_total || 0;
    const hasPhotos = (placeData.photos?.length || 0) > 0;
    const hasHours = !!placeData.opening_hours?.weekday_text;
    const hasWebsite = !!placeData.website;
    const hasPhone = !!placeData.formatted_phone_number;

    // Calculate scores
    const reputationScore = Math.min(100, Math.round((rating / 5) * 60 + Math.min(40, reviewCount / 2.5)));
    const visibilityScore = Math.round(
      (hasPhotos ? 25 : 0) + 
      (hasHours ? 25 : 0) + 
      (hasWebsite ? 25 : 0) + 
      (hasPhone ? 25 : 0)
    );
    const engagementScore = Math.min(100, Math.round(reviewCount * 2));
    const overallScore = Math.round((reputationScore + visibilityScore + engagementScore) / 3);

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: AIAnalysis['recommendations'] = [];

    // Analyze strengths and weaknesses
    if (rating >= 4.5) {
      strengths.push(`Excelente nota média de ${rating} estrelas`);
    } else if (rating >= 4.0) {
      strengths.push(`Boa nota média de ${rating} estrelas`);
    } else if (rating > 0) {
      weaknesses.push(`Nota média de ${rating} precisa melhorar`);
      recommendations.push({
        priority: 'high',
        title: 'Melhore sua nota média',
        description: 'Foque em resolver problemas dos clientes insatisfeitos e peça avaliações para clientes satisfeitos.',
        impact: 'Pode aumentar sua nota em até 0.5 pontos'
      });
    }

    if (reviewCount >= 100) {
      strengths.push(`Grande volume de avaliações (${reviewCount})`);
    } else if (reviewCount >= 20) {
      strengths.push(`Bom número de avaliações (${reviewCount})`);
    } else {
      weaknesses.push(`Poucas avaliações (${reviewCount})`);
      recommendations.push({
        priority: 'high',
        title: 'Aumente o número de avaliações',
        description: 'Envie links de avaliação para clientes satisfeitos após cada atendimento.',
        impact: 'Mais avaliações aumentam a confiança e visibilidade'
      });
    }

    if (hasPhotos && (placeData.photos?.length || 0) >= 10) {
      strengths.push('Perfil com boas fotos');
    } else if (!hasPhotos) {
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
      weaknesses.push('Sem website vinculado');
      recommendations.push({
        priority: 'low',
        title: 'Adicione um website',
        description: 'Um website profissional aumenta a credibilidade do negócio.',
        impact: 'Clientes podem conhecer mais sobre seus serviços'
      });
    }

    return {
      summary: `${placeData.name || 'O negócio'} possui uma presença online ${overallScore >= 60 ? 'adequada' : 'que precisa de melhorias'}. ${rating > 0 ? `Com nota ${rating} e ${reviewCount} avaliações` : 'Sem avaliações registradas'}, há oportunidades de crescimento.`,
      strengths: strengths.length > 0 ? strengths : ['Nome do negócio definido', 'Status operacional definido'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['Nenhum ponto crítico identificado'],
      recommendations,
      scores: {
        reputation: reputationScore,
        visibility: visibilityScore,
        engagement: engagementScore,
        overall: overallScore
      }
    };
  };

  const handleRunDiagnostic = async () => {
    if (!settings.placeId) {
      setError('Configure o Google Place ID nas configurações para analisar sua presença digital.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Step 1: Fetch Google Place data
      setAnalysisStep('Buscando dados do Google...');
      console.log('Starting diagnostic for Place ID:', settings.placeId);
      
      const placeData = await fetchGooglePlaceData(settings.placeId);
      
      if (!placeData || !placeData.name) {
        console.log('No place data returned, using mock data');
        // Use mock data for demonstration
        const mockPlaceData: GooglePlaceData = {
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
        
        setAnalysisStep('Gerando análise com IA...');
        const aiAnalysis = await generateAIAnalysis(mockPlaceData);
        
        // Save to database
        setAnalysisStep('Salvando diagnóstico...');
        const { error: saveError } = await supabase
          .from('digital_diagnostics')
          .insert({
            user_id: userId, tenant_id: tenantId,
            place_data: mockPlaceData,
            ai_analysis: aiAnalysis,
            score_reputation: aiAnalysis.scores.reputation,
            score_information: aiAnalysis.scores.visibility,
            score_engagement: aiAnalysis.scores.engagement,
            overall_score: aiAnalysis.scores.overall,
            details: mockPlaceData,
            recommendations: aiAnalysis.recommendations
          });

        if (saveError) throw saveError;
        await fetchDiagnostics();
        return;
      }

      console.log('Place data received:', placeData);

      // Step 2: Generate AI analysis
      setAnalysisStep('Analisando dados com IA...');
      const aiAnalysis = await generateAIAnalysis(placeData);

      // Step 3: Save to database
      setAnalysisStep('Salvando diagnóstico...');
      const { error: saveError } = await supabase
        .from('digital_diagnostics')
        .insert({
          user_id: userId, tenant_id: tenantId,
          place_data: placeData,
          ai_analysis: aiAnalysis,
          score_reputation: aiAnalysis.scores.reputation,
          score_information: aiAnalysis.scores.visibility,
          score_engagement: aiAnalysis.scores.engagement,
          overall_score: aiAnalysis.scores.overall,
          details: placeData,
          recommendations: aiAnalysis.recommendations
        });

      if (saveError) throw saveError;

      // Refresh diagnostics list
      await fetchDiagnostics();
    } catch (e) {
      console.error('Error running diagnostic:', e);
      setError('Erro ao executar diagnóstico. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // Evolution trend
  const getEvolutionTrend = () => {
    if (!latestDiagnostic?.ai_analysis || !previousDiagnostic?.ai_analysis) return 'stable';
    const diff = latestDiagnostic.ai_analysis.scores.overall - previousDiagnostic.ai_analysis.scores.overall;
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  };

  // Chart data for evolution
  const evolutionData = useMemo(() => {
    return diagnostics
      .filter(d => d.ai_analysis)
      .slice(0, 10)
      .reverse()
      .map(d => ({
        date: new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        reputation: d.ai_analysis?.scores.reputation || 0,
        visibility: d.ai_analysis?.scores.visibility || 0,
        engagement: d.ai_analysis?.scores.engagement || 0,
        overall: d.ai_analysis?.scores.overall || 0
      }));
  }, [diagnostics]);

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

  const trend = getEvolutionTrend();
  const placeData = latestDiagnostic?.place_data;
  const aiAnalysis = latestDiagnostic?.ai_analysis;

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
            <p className="text-gray-500 text-sm">Análise completa do seu perfil no Google Meu Negócio</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <History size={18} />
            Histórico
          </button>
          <button
            onClick={handleRunDiagnostic}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {analysisStep}
              </>
            ) : (
              <>
                <RefreshCw size={18} />
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
      {!settings.placeId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-yellow-600 mt-1" size={24} />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">Configure seu Google Place ID</h3>
              <p className="text-yellow-700 mb-4">
                Para analisar sua presença digital, você precisa configurar o Google Place ID nas configurações.
              </p>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); /* navigate to settings */ }}
                className="inline-flex items-center gap-2 text-yellow-700 hover:text-yellow-800 font-medium"
              >
                Ir para Configurações <ChevronRight size={16} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Business Info Card */}
      {placeData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
              <Globe className="text-primary-600" size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">{placeData.name || settings.companyName}</h2>
              <p className="text-gray-500 flex items-center gap-2 mt-1">
                <MapPin size={14} />
                {placeData.formatted_address || 'Endereço não disponível'}
              </p>
              <div className="flex items-center gap-4 mt-2">
                {placeData.rating && placeData.rating > 0 ? (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Star size={16} fill="currentColor" />
                    {placeData.rating} ({placeData.user_ratings_total} avaliações)
                  </span>
                ) : (
                  <span className="text-gray-400">Sem avaliações</span>
                )}
                {placeData.formatted_phone_number && (
                  <span className="flex items-center gap-1 text-gray-600">
                    <Phone size={14} />
                    {placeData.formatted_phone_number}
                  </span>
                )}
              </div>
            </div>
            {placeData.url && (
              <a 
                href={placeData.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <ExternalLink size={16} />
                Ver no Google
              </a>
            )}
          </div>
        </div>
      )}

      {/* AI Analysis Summary */}
      {aiAnalysis && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Sparkles className="text-purple-600" size={24} />
            <div>
              <h3 className="font-semibold text-purple-800">Análise da IA</h3>
              <p className="text-gray-700 mt-1">{aiAnalysis.summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Score Cards */}
      {aiAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-xl border p-4 ${getScoreBg(aiAnalysis.scores.overall)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Escore Geral</span>
              <Activity size={18} className="text-gray-400" />
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(aiAnalysis.scores.overall)}`}>
              {aiAnalysis.scores.overall}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {aiAnalysis.scores.overall >= 80 ? 'Excelente' : aiAnalysis.scores.overall >= 60 ? 'Bom' : aiAnalysis.scores.overall >= 40 ? 'Regular' : 'Precisa melhorar'}
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${getScoreBg(aiAnalysis.scores.reputation)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Reputação</span>
              <Star size={18} className="text-gray-400" />
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(aiAnalysis.scores.reputation)}`}>
              {aiAnalysis.scores.reputation}
            </div>
            <div className="text-xs text-gray-500 mt-1">Nota e avaliações no Google</div>
          </div>

          <div className={`rounded-xl border p-4 ${getScoreBg(aiAnalysis.scores.visibility)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Visibilidade</span>
              <Eye size={18} className="text-gray-400" />
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(aiAnalysis.scores.visibility)}`}>
              {aiAnalysis.scores.visibility}
            </div>
            <div className="text-xs text-gray-500 mt-1">Fotos, horários e informações</div>
          </div>

          <div className={`rounded-xl border p-4 ${getScoreBg(aiAnalysis.scores.engagement)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Engajamento</span>
              <MessageSquare size={18} className="text-gray-400" />
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(aiAnalysis.scores.engagement)}`}>
              {aiAnalysis.scores.engagement}
            </div>
            <div className="text-xs text-gray-500 mt-1">Interação com clientes</div>
          </div>
        </div>
      )}

      {/* Strengths and Weaknesses */}
      {aiAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Strengths */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ThumbsUp className="text-green-600" size={20} />
              <h3 className="font-semibold text-gray-800">Pontos Fortes</h3>
            </div>
            <div className="space-y-3">
              {aiAnalysis.strengths.map((strength, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="text-green-600 mt-0.5" size={18} />
                  <span className="text-gray-700">{strength}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ThumbsDown className="text-red-600" size={20} />
              <h3 className="font-semibold text-gray-800">Pontos a Melhorar</h3>
            </div>
            <div className="space-y-3">
              {aiAnalysis.weaknesses.map((weakness, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="text-red-600 mt-0.5" size={18} />
                  <span className="text-gray-700">{weakness}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {aiAnalysis && aiAnalysis.recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-yellow-600" size={20} />
            <h3 className="font-semibold text-gray-800">Recomendações</h3>
          </div>
          <div className="space-y-4">
            {aiAnalysis.recommendations.map((rec, index) => (
              <div key={index} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{rec.title}</h4>
                    <p className="text-gray-600 text-sm mt-1">{rec.description}</p>
                    <p className="text-green-600 text-sm mt-2 flex items-center gap-1">
                      <Target size={14} />
                      {rec.impact}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      {placeData?.reviews && placeData.reviews.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-800">Últimas Avaliações</h3>
          </div>
          <div className="space-y-4">
            {placeData.reviews.slice(0, 5).map((review, index) => (
              <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-800">{review.author_name}</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={14} 
                        className={i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span className="text-gray-400 text-sm">{review.relative_time_description}</span>
                </div>
                <p className="text-gray-600 text-sm">{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Histórico de Diagnósticos</h3>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {diagnostics.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum diagnóstico realizado ainda.</p>
              ) : (
                <div className="space-y-4">
                  {diagnostics.map((diagnostic, index) => (
                    <div key={diagnostic.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">
                          {new Date(diagnostic.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {diagnostic.ai_analysis && (
                          <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreBg(diagnostic.ai_analysis.scores.overall)}`}>
                            Score: {diagnostic.ai_analysis.scores.overall}
                          </span>
                        )}
                      </div>
                      {diagnostic.ai_analysis && (
                        <p className="text-gray-600 text-sm">{diagnostic.ai_analysis.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No diagnostics yet */}
      {!latestDiagnostic && !isAnalyzing && settings.placeId && (
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
    </div>
  );
};

export default DigitalDiagnosticComponent;
