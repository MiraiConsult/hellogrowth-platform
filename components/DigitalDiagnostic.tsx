'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase-client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowRight, CheckCircle, ChevronRight, Eye, Loader2, MapPin, MessageSquare, Minus, Phone, Star, ThumbsUp, TrendingUp, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DiagnosticData {
  id: string;
  tenant_id: string;
  created_at: string;
  place_data: any;
  ai_insights: any; 
}

interface HistoricalDiagnosticData {
  id: string;
  created_at: string;
  scores: {
    overall: number;
    reputation: number;
    visibility: number;
    engagement: number;
  };
}

export default function DigitalDiagnostic({ userId }: { userId: string }) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticData[]>([]);
  const [historicalDiagnostics, setHistoricalDiagnostics] = useState<HistoricalDiagnosticData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [showReputationExplanation, setShowReputationExplanation] = useState(false);
  const [showVisibilityExplanation, setShowVisibilityExplanation] = useState(false);
  const [showEngagementExplanation, setShowEngagementExplanation] = useState(false);
  const [showOverallExplanation, setShowOverallExplanation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const fetchDiagnostics = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', userId).single();
      const tenantId = userData?.tenant_id || userId;

      const { data, error } = await supabase
        .from('digital_diagnostics')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      const { data: historyData, error: historyError } = await supabase
        .from('digital_diagnostics_history')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      if (error) throw error;

      if (data) {
        setDiagnostics(data.map(d => ({ ...d, ai_insights: d.ai_analysis })));
      }
      if (historyData) {
        setHistoricalDiagnostics(historyData);
      }
    } catch (err: any) {
      setError('Erro ao buscar diagnósticos: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewAnalysis = async () => {
    if (!supabase) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisStep('Iniciando análise...');

    try {
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', userId).single();
      const tenantId = userData?.tenant_id || userId;

      setAnalysisStep('Buscando informações do seu negócio no Google...');
      const response = await fetch('/api/digital-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na comunicação com a API.');
      }

      setAnalysisStep('Analisando dados com IA...');
      const result = await response.json();

      setAnalysisStep('Salvando resultados...');
      await fetchDiagnostics();

    } catch (err: any) {
      setError('Ocorreu um erro durante a análise: ' + err.message);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-blue-50';
    if (score >= 40) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const latestDiagnostic = diagnostics[0];
  const previousDiagnostic = historicalDiagnostics[1];

  const evolutionData = historicalDiagnostics.map(d => ({
    date: new Date(d.created_at).toLocaleDateString('pt-BR'),
    'Escore Geral': d.scores.overall,
    'Google Meu Negócio': d.scores.reputation,
    'SEO Local': d.scores.visibility,
    'Mídias Sociais': d.scores.engagement,
  })).reverse();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={48} />
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-lg font-medium text-gray-700">Analisando sua presença digital...</p>
        <p className="text-sm text-gray-500">{analysisStep}</p>
        <Progress value={analysisStep === 'Iniciando análise...' ? 10 : analysisStep === 'Buscando informações do seu negócio no Google...' ? 40 : 80} className="w-1/2 mt-4" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Diagnóstico de Presença Digital</h1>
          <p className="text-gray-500">Veja como sua empresa se posiciona no mundo digital.</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          {diagnostics.length > 0 && (
            <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? 'Ver Diagnóstico Atual' : 'Ver Histórico de Evolução'}
            </Button>
          )}
          <Button onClick={handleNewAnalysis} disabled={isAnalyzing}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Fazer Nova Análise
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {diagnostics.length === 0 && !isAnalyzing && (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>Bem-vindo ao Diagnóstico Digital</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600">Clique no botão abaixo para iniciar sua primeira análise e descobrir seus pontos fortes e fracos no ambiente digital.</p>
            <Button onClick={handleNewAnalysis}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Iniciar Primeira Análise
            </Button>
          </CardContent>
        </Card>
      )}

      {showHistory ? (
        <div>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Histórico de Evolução</h2>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Evolução dos Scores</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Escore Geral" stroke="#16a34a" strokeWidth={2} />
                  <Line type="monotone" dataKey="Google Meu Negócio" stroke="#2563eb" />
                  <Line type="monotone" dataKey="SEO Local" stroke="#ca8a04" />
                  <Line type="monotone" dataKey="Mídias Sociais" stroke="#dc2626" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Último Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent>
                {latestDiagnostic && (
                  <div className="space-y-2">
                    <p><strong>Data:</strong> {new Date(latestDiagnostic.created_at).toLocaleString('pt-BR')}</p>
                    <p><strong>Escore Geral:</strong> <span className={getScoreColor(latestDiagnostic.ai_insights.scores.overall)}>{latestDiagnostic.ai_insights.scores.overall}</span></p>
                    <p><strong>Reputação:</strong> <span className={getScoreColor(latestDiagnostic.ai_insights.scores.reputation)}>{latestDiagnostic.ai_insights.scores.reputation}</span></p>
                    <p><strong>Visibilidade:</strong> <span className={getScoreColor(latestDiagnostic.ai_insights.scores.visibility)}>{latestDiagnostic.ai_insights.scores.visibility}</span></p>
                    <p><strong>Engajamento:</strong> <span className={getScoreColor(latestDiagnostic.ai_insights.scores.engagement)}>{latestDiagnostic.ai_insights.scores.engagement}</span></p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Diagnóstico Anterior</CardTitle>
              </CardHeader>
              <CardContent>
                {previousDiagnostic ? (
                  <div className="space-y-2">
                    <p><strong>Data:</strong> {new Date(previousDiagnostic.created_at).toLocaleString('pt-BR')}</p>
                    <p><strong>Escore Geral:</strong> <span className={getScoreColor(previousDiagnostic.scores.overall)}>{previousDiagnostic.scores.overall}</span></p>
                    <p><strong>Reputação:</strong> <span className={getScoreColor(previousDiagnostic.scores.reputation)}>{previousDiagnostic.scores.reputation}</span></p>
                    <p><strong>Visibilidade:</strong> <span className={getScoreColor(previousDiagnostic.scores.visibility)}>{previousDiagnostic.scores.visibility}</span></p>
                    <p><strong>Engajamento:</strong> <span className={getScoreColor(previousDiagnostic.scores.engagement)}>{previousDiagnostic.scores.engagement}</span></p>
                  </div>
                ) : (
                  <p className="text-gray-500">Não há diagnóstico anterior para comparação.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        latestDiagnostic && (
          <div>
            {latestDiagnostic.ai_insights && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className={`rounded-xl border p-4 ${getScoreBg(latestDiagnostic.ai_insights.scores.overall)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm font-medium">Escore Geral</span>
                    <button onClick={() => setShowOverallExplanation(!showOverallExplanation)} className="text-gray-400 hover:text-gray-600">
                      {showOverallExplanation ? <Minus size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>
                  <div className={`text-3xl font-bold ${getScoreColor(latestDiagnostic.ai_insights.scores.overall)}`}>
                    {latestDiagnostic.ai_insights.scores.overall}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {latestDiagnostic.ai_insights.scores.overall >= 80 ? 'Excelente' : latestDiagnostic.ai_insights.scores.overall >= 60 ? 'Bom' : latestDiagnostic.ai_insights.scores.overall >= 40 ? 'Regular' : 'Precisa melhorar'}
                  </div>
                  {showOverallExplanation && (
                    <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
                      <p>O Escore Geral reflete a saúde da sua presença digital, sendo uma média ponderada da sua Reputação, Visibilidade e Engajamento.</p>
                      <p className="mt-2"><strong>Como melhorar:</strong> Foque nas recomendações de maior prioridade e acompanhe a evolução dos scores individuais.</p>
                    </div>
                  )}
                </div>

                <div className={`rounded-xl border p-4 ${getScoreBg(latestDiagnostic.ai_insights.scores.reputation)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm font-medium">Reputação</span>
                    <button onClick={() => setShowReputationExplanation(!showReputationExplanation)} className="text-gray-400 hover:text-gray-600">
                      {showReputationExplanation ? <Minus size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>
                  <div className={`text-3xl font-bold ${getScoreColor(latestDiagnostic.ai_insights.scores.reputation)}`}>
                    {latestDiagnostic.ai_insights.scores.reputation}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Nota e avaliações no Google</div>
                  {showReputationExplanation && (
                    <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
                      <p>A Reputação é calculada com base na sua nota média e no volume de avaliações no Google Meu Negócio.</p>
                      <p className="mt-2"><strong>Como melhorar:</strong> Incentive mais clientes satisfeitos a deixar avaliações e responda a todas as avaliações, sejam elas positivas ou negativas.</p>
                    </div>
                  )}
                </div>

                <div className={`rounded-xl border p-4 ${getScoreBg(latestDiagnostic.ai_insights.scores.visibility)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm font-medium">Visibilidade</span>
                    <button onClick={() => setShowVisibilityExplanation(!showVisibilityExplanation)} className="text-gray-400 hover:text-gray-600">
                      {showVisibilityExplanation ? <Minus size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>
                  <div className={`text-3xl font-bold ${getScoreColor(latestDiagnostic.ai_insights.scores.visibility)}`}>
                    {latestDiagnostic.ai_insights.scores.visibility}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Fotos, horários e informações</div>
                  {showVisibilityExplanation && (
                    <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
                      <p>A Visibilidade mede o quão completo e otimizado está o seu perfil no Google Meu Negócio, incluindo fotos, horários de funcionamento e informações de contato.</p>
                      <p className="mt-2"><strong>Como melhorar:</strong> Mantenha seu perfil sempre atualizado, adicione fotos de alta qualidade e certifique-se de que todas as informações estejam corretas e completas.</p>
                    </div>
                  )}
                </div>

                <div className={`rounded-xl border p-4 ${getScoreBg(latestDiagnostic.ai_insights.scores.engagement)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm font-medium">Engajamento</span>
                    <button onClick={() => setShowEngagementExplanation(!showEngagementExplanation)} className="text-gray-400 hover:text-gray-600">
                      {showEngagementExplanation ? <Minus size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>
                  <div className={`text-3xl font-bold ${getScoreColor(latestDiagnostic.ai_insights.scores.engagement)}`}>
                    {latestDiagnostic.ai_insights.scores.engagement}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Interação com clientes</div>
                  {showEngagementExplanation && (
                    <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
                      <p>O Engajamento avalia sua interação com os clientes, principalmente através da resposta a avaliações e perguntas no Google Meu Negócio.</p>
                      <p className="mt-2"><strong>Como melhorar:</strong> Responda rapidamente a todas as avaliações e mensagens. Um bom engajamento mostra que você valoriza seus clientes.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsUp className="text-green-600" size={20} />
                  <h3 className="font-semibold text-gray-800">Pontos Fortes</h3>
                </div>
                <div className="space-y-3">
                  {latestDiagnostic.ai_insights.strengths.map((strength: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="text-green-500 mt-1 flex-shrink-0" size={16} />
                      <p className="text-gray-600">{strength}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="text-red-600" size={20} />
                  <h3 className="font-semibold text-gray-800">Pontos a Melhorar</h3>
                </div>
                <div className="space-y-3">
                  {latestDiagnostic.ai_insights.weaknesses.map((weakness: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <ArrowRight className="text-red-500 mt-1 flex-shrink-0" size={16} />
                      <p className="text-gray-600">{weakness}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {latestDiagnostic.place_data && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{latestDiagnostic.place_data.displayName?.text || 'Seu Negócio'}</h3>
                    <p className="text-gray-500 flex items-center gap-2 mt-1">
                      <MapPin size={14} />
                      {latestDiagnostic.place_data.formattedAddress || 'Endereço não disponível'}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      {latestDiagnostic.place_data.rating && latestDiagnostic.place_data.rating > 0 ? (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Star size={16} fill="currentColor" />
                          {latestDiagnostic.place_data.rating} ({latestDiagnostic.place_data.userRatingCount} avaliações)
                        </span>
                      ) : (
                        <span className="text-gray-400">Sem avaliações</span>
                      )}
                      {latestDiagnostic.place_data.nationalPhoneNumber && (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Phone size={14} />
                          {latestDiagnostic.place_data.nationalPhoneNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  {latestDiagnostic.place_data.googleMapsUri && (
                    <a 
                      href={latestDiagnostic.place_data.googleMapsUri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Ver no Google
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
