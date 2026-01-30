'use client';
import React, { useState, useEffect, useMemo } from 'react';
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

  // Fetch Google Place data
  const fetchGooglePlaceData = async (placeId: string): Promise<GooglePlaceData | null> => {
    try {
      // Use Google Places API via our backend
      const response = await fetch(`/api/google-places?placeId=${placeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch place data');
      }
      const data = await response.json();
      return data.result || null;
    } catch (error) {
      console.error('Error fetching Google Place data:', error);
      // Return mock data for testing if API fails
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
      summary: `Seu negócio tem uma presença digital ${overallScore >= 70 ? 'boa' : overallScore >= 50 ? 'moderada' : 'que precisa de atenção'}. ${rating > 0 ? `Com nota ${rating} e ${reviewCount} avaliações` : 'Sem avaliações ainda'}, há oportunidades de melhoria para aumentar sua visibilidade online.`,
      strengths: strengths.length > 0 ? strengths : ['Perfil criado no Google'],
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
      const placeData = await fetchGooglePlaceData(settings.placeId);
      
      if (!placeData) {
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
            user_id: userId,
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

      // Step 2: Generate AI analysis
      setAnalysisStep('Analisando dados com IA...');
      const aiAnalysis = await generateAIAnalysis(placeData);

      // Step 3: Save to database
      setAnalysisStep('Salvando diagnóstico...');
      const { error: saveError } = await supabase
        .from('digital_diagnostics')
        .insert({
          user_id: userId,
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
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="text-primary-600" />
            Minha Presença Digital
          </h1>
          <p className="text-gray-500">Análise completa do seu perfil no Google Meu Negócio</p>
        </div>
        <div className="flex gap-3">
          {diagnostics.length > 1 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <History size={18} />
              Histórico
            </button>
          )}
          <button
            onClick={handleRunDiagnostic}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {isAnalyzing ? analysisStep || 'Analisando...' : 'Analisar Agora'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      {/* No Place ID Warning */}
      {!settings.placeId && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5" />
            <div>
              <h4 className="font-semibold">Configure seu Google Place ID</h4>
              <p className="text-sm mt-1">
                Para analisar sua presença digital, você precisa configurar o Place ID do seu negócio nas configurações.
                O Place ID é um identificador único do Google que permite acessar informações do seu perfil.
              </p>
              <a 
                href="https://developers.google.com/maps/documentation/places/web-service/place-id" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-yellow-800 underline mt-2 inline-flex items-center gap-1"
              >
                Como encontrar meu Place ID <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {!latestDiagnostic || !aiAnalysis ? (
        // Empty State
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity size={32} className="text-primary-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum diagnóstico realizado</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Clique em "Analisar Agora" para gerar seu primeiro diagnóstico de presença digital.
            Vamos buscar os dados do seu perfil no Google e gerar recomendações personalizadas.
          </p>
          <button
            onClick={handleRunDiagnostic}
            disabled={isAnalyzing || !settings.placeId}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {isAnalyzing ? analysisStep || 'Analisando...' : 'Iniciar Diagnóstico'}
          </button>
        </div>
      ) : (
        <>
          {/* Google Profile Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Globe size={32} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{placeData?.name || settings.companyName}</h2>
                  <p className="text-gray-600 text-sm mt-1">{placeData?.formatted_address || 'Endereço não disponível'}</p>
                  <div className="flex items-center gap-4 mt-2">
                    {placeData?.rating && (
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-yellow-500" fill="currentColor" />
                        <span className="font-bold text-gray-900">{placeData.rating}</span>
                        <span className="text-gray-500 text-sm">({placeData.user_ratings_total} avaliações)</span>
                      </div>
                    )}
                    {placeData?.formatted_phone_number && (
                      <div className="flex items-center gap-1 text-gray-600 text-sm">
                        <Phone size={14} />
                        {placeData.formatted_phone_number}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {placeData?.url && (
                <a 
                  href={placeData.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  Ver no Google <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Análise da IA</h3>
                <p className="text-gray-700">{aiAnalysis.summary}</p>
              </div>
            </div>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Overall Score */}
            <div className={`p-6 rounded-xl shadow-sm border ${getScoreBg(aiAnalysis.scores.overall)}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Escore Geral</p>
                  <h3 className={`text-4xl font-bold mt-2 ${getScoreColor(aiAnalysis.scores.overall)}`}>
                    {aiAnalysis.scores.overall}
                  </h3>
                </div>
                <div className={`p-2 rounded-lg ${trend === 'improving' ? 'bg-green-100 text-green-600' : trend === 'declining' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                  {trend === 'improving' ? <TrendingUp size={20} /> : trend === 'declining' ? <TrendingDown size={20} /> : <Minus size={20} />}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {trend === 'improving' ? 'Em melhoria' : trend === 'declining' ? 'Em queda' : 'Estável'}
              </p>
            </div>

            {/* Reputation Score */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Reputação</p>
                  <h3 className={`text-3xl font-bold mt-2 ${getScoreColor(aiAnalysis.scores.reputation)}`}>
                    {aiAnalysis.scores.reputation}
                  </h3>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <Star size={20} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Nota e avaliações no Google</p>
            </div>

            {/* Visibility Score */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Visibilidade</p>
                  <h3 className={`text-3xl font-bold mt-2 ${getScoreColor(aiAnalysis.scores.visibility)}`}>
                    {aiAnalysis.scores.visibility}
                  </h3>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Eye size={20} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Fotos, horários e informações</p>
            </div>

            {/* Engagement Score */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Engajamento</p>
                  <h3 className={`text-3xl font-bold mt-2 ${getScoreColor(aiAnalysis.scores.engagement)}`}>
                    {aiAnalysis.scores.engagement}
                  </h3>
                </div>
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                  <MessageSquare size={20} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Interação com clientes</p>
            </div>
          </div>

          {/* Strengths and Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Strengths */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ThumbsUp size={20} className="text-green-600" />
                Pontos Fortes
              </h3>
              <div className="space-y-3">
                {aiAnalysis.strengths.map((strength, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ThumbsDown size={20} className="text-red-600" />
                Pontos a Melhorar
              </h3>
              <div className="space-y-3">
                {aiAnalysis.weaknesses.map((weakness, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{weakness}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Radar Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Visão Geral</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb size={20} className="text-yellow-500" />
                Recomendações de Melhoria
              </h3>
              {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {aiAnalysis.recommendations.map((rec, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border ${
                        rec.priority === 'high' ? 'bg-red-50 border-red-200' : 
                        rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' : 
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-600' : 
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {rec.priority === 'high' ? <AlertTriangle size={16} /> : <Target size={16} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 text-sm">{rec.title}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              rec.priority === 'high' ? 'bg-red-100 text-red-700' : 
                              rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mt-1">{rec.description}</p>
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <TrendingUp size={12} /> {rec.impact}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award size={48} className="mx-auto text-green-500 mb-3" />
                  <p className="text-gray-600">Parabéns! Seu perfil está bem otimizado.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Reviews */}
          {placeData?.reviews && placeData.reviews.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare size={20} className="text-blue-600" />
                Últimas Avaliações do Google
              </h3>
              <div className="space-y-4">
                {placeData.reviews.slice(0, 5).map((review, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm font-bold">
                          {review.author_name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{review.author_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            className={i < review.rating ? 'text-yellow-500' : 'text-gray-300'} 
                            fill={i < review.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                        <span className="text-xs text-gray-500 ml-2">{review.relative_time_description}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm">{review.text || 'Sem comentário'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evolution Chart */}
          {evolutionData.length > 1 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Evolução ao Longo do Tempo</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" stroke="#9ca3af" axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#9ca3af" axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="overall" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="Escore Geral" />
                    <Line type="monotone" dataKey="reputation" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Reputação" />
                    <Line type="monotone" dataKey="visibility" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Visibilidade" />
                    <Line type="monotone" dataKey="engagement" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Engajamento" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* History Section */}
          {showHistory && diagnostics.length > 1 && (
            <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Histórico de Diagnósticos</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Geral</th>
                      <th className="px-4 py-3">Reputação</th>
                      <th className="px-4 py-3">Visibilidade</th>
                      <th className="px-4 py-3">Engajamento</th>
                      <th className="px-4 py-3">Variação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {diagnostics.filter(d => d.ai_analysis).map((d, index) => {
                      const prev = diagnostics.filter(dd => dd.ai_analysis)[index + 1];
                      const diff = prev?.ai_analysis ? d.ai_analysis!.scores.overall - prev.ai_analysis.scores.overall : 0;
                      return (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className={`px-4 py-3 text-sm font-bold ${getScoreColor(d.ai_analysis!.scores.overall)}`}>{d.ai_analysis!.scores.overall}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.ai_analysis!.scores.reputation}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.ai_analysis!.scores.visibility}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.ai_analysis!.scores.engagement}</td>
                          <td className="px-4 py-3 text-sm">
                            {prev?.ai_analysis && (
                              <span className={`flex items-center gap-1 ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {diff > 0 ? <TrendingUp size={14} /> : diff < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Last Analysis Date */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Última análise: {new Date(latestDiagnostic.created_at).toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default DigitalDiagnosticComponent;
