import React, { useState, useEffect, useMemo } from 'react';
import { DigitalDiagnostic, AccountSettings } from '@/types';
import { 
  Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, 
  Star, MapPin, Clock, Image, MessageSquare, CheckCircle, AlertTriangle,
  ChevronRight, History, Sparkles
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { supabase } from '@/lib/supabase';

interface DiagnosticRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'reputation' | 'information' | 'engagement';
  title: string;
  description: string;
  impact: string;
}

interface LocalDiagnostic {
  id: string;
  user_id: string;
  scoreReputation: number;
  scoreInformation: number;
  scoreEngagement: number;
  overallScore: number;
  details: any;
  recommendations: DiagnosticRecommendation[];
  createdAt: string;
}

interface DigitalDiagnosticProps {
  userId: string;
  settings: AccountSettings;
  npsData: any[];
}

const DigitalDiagnosticComponent: React.FC<DigitalDiagnosticProps> = ({ userId, settings, npsData }) => {
  const [diagnostics, setDiagnostics] = useState<LocalDiagnostic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
          scoreReputation: d.score_reputation || 0,
          scoreInformation: d.score_information || 0,
          scoreEngagement: d.score_engagement || 0,
          overallScore: d.overall_score || 0,
          details: d.details || {},
          recommendations: d.recommendations || [],
          createdAt: d.created_at
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

  // Calculate scores based on available data
  const calculateScores = () => {
    // Reputation Score (based on NPS data)
    const totalResponses = npsData.length;
    const promoters = npsData.filter(n => n.score >= 9).length;
    const detractors = npsData.filter(n => n.score <= 6).length;
    const npsScore = totalResponses > 0 ? Math.round(((promoters - detractors) / totalResponses) * 100) : 0;
    
    // Normalize NPS (-100 to 100) to 0-100 scale
    const reputationScore = Math.min(100, Math.max(0, Math.round((npsScore + 100) / 2)));

    // Information Score (based on settings completeness)
    let infoScore = 0;
    if (settings.companyName) infoScore += 20;
    if (settings.adminEmail) infoScore += 20;
    if (settings.phone) infoScore += 20;
    if (settings.website) infoScore += 20;
    if (settings.placeId) infoScore += 20;

    // Engagement Score (based on response rate and activity)
    const responseRate = totalResponses > 0 ? Math.min(100, totalResponses * 5) : 0;
    const engagementScore = Math.round(responseRate);

    // Overall Score
    const overallScore = Math.round((reputationScore + infoScore + engagementScore) / 3);

    return {
      scoreReputation: reputationScore,
      scoreInformation: infoScore,
      scoreEngagement: engagementScore,
      overallScore,
      details: {
        reviewCount: totalResponses,
        averageRating: totalResponses > 0 ? (npsData.reduce((acc, n) => acc + n.score, 0) / totalResponses).toFixed(1) : 0,
        responseRate: Math.round((promoters / Math.max(1, totalResponses)) * 100),
        profileCompleteness: infoScore,
        hoursConfigured: !!settings.placeId,
        addressVisible: !!settings.placeId,
        photosCount: 0
      }
    };
  };

  // Generate recommendations based on scores
  const generateRecommendations = (scores: any): DiagnosticRecommendation[] => {
    const recs: DiagnosticRecommendation[] = [];

    if (scores.scoreReputation < 70) {
      recs.push({
        id: '1',
        priority: 'high',
        category: 'reputation',
        title: 'Melhore sua Reputação Online',
        description: 'Seu escore de reputação está abaixo do ideal. Foque em converter detratores em promotores.',
        impact: 'Pode aumentar seu NPS em até 20 pontos'
      });
    }

    if (scores.scoreInformation < 80) {
      recs.push({
        id: '2',
        priority: scores.scoreInformation < 60 ? 'high' : 'medium',
        category: 'information',
        title: 'Complete seu Perfil',
        description: 'Informações incompletas prejudicam sua visibilidade. Preencha todos os campos nas configurações.',
        impact: 'Perfis completos têm 70% mais visibilidade'
      });
    }

    if (!settings.placeId) {
      recs.push({
        id: '3',
        priority: 'high',
        category: 'information',
        title: 'Configure seu Google Place ID',
        description: 'O Place ID permite integração com Google Reviews e melhora o redirecionamento de avaliações.',
        impact: 'Essencial para gestão de reputação'
      });
    }

    if (scores.scoreEngagement < 50) {
      recs.push({
        id: '4',
        priority: 'medium',
        category: 'engagement',
        title: 'Aumente o Engajamento',
        description: 'Envie mais pesquisas de NPS para coletar feedback e melhorar a experiência do cliente.',
        impact: 'Mais dados = melhores insights'
      });
    }

    if (npsData.filter(n => n.score <= 6).length > 0) {
      recs.push({
        id: '5',
        priority: 'high',
        category: 'reputation',
        title: 'Atenção aos Detratores',
        description: `Você tem ${npsData.filter(n => n.score <= 6).length} detratores que precisam de atenção imediata.`,
        impact: 'Recuperar detratores pode aumentar retenção em 25%'
      });
    }

    return recs.slice(0, 5);
  };

  const handleRunDiagnostic = async () => {
    setIsAnalyzing(true);
    
    try {
      const scores = calculateScores();
      const recommendations = generateRecommendations(scores);

      // Save to Supabase
      const { data, error } = await supabase
        .from('digital_diagnostics')
        .insert({
          user_id: userId,
          score_reputation: scores.scoreReputation,
          score_information: scores.scoreInformation,
          score_engagement: scores.scoreEngagement,
          overall_score: scores.overallScore,
          details: scores.details,
          recommendations: recommendations
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh diagnostics list
      await fetchDiagnostics();
    } catch (e) {
      console.error('Error running diagnostic:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Evolution trend
  const getEvolutionTrend = () => {
    if (!latestDiagnostic || !previousDiagnostic) return 'stable';
    const diff = latestDiagnostic.overallScore - previousDiagnostic.overallScore;
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  };

  // Chart data for evolution
  const evolutionData = useMemo(() => {
    return diagnostics
      .slice(0, 10)
      .reverse()
      .map(d => ({
        date: new Date(d.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        reputation: d.scoreReputation,
        information: d.scoreInformation,
        engagement: d.scoreEngagement,
        overall: d.overallScore
      }));
  }, [diagnostics]);

  // Radar chart data
  const radarData = latestDiagnostic ? [
    { subject: 'Reputação', value: latestDiagnostic.scoreReputation, fullMark: 100 },
    { subject: 'Informações', value: latestDiagnostic.scoreInformation, fullMark: 100 },
    { subject: 'Engajamento', value: latestDiagnostic.scoreEngagement, fullMark: 100 },
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
          <h1 className="text-2xl font-bold text-gray-900">Minha Presença Digital</h1>
          <p className="text-gray-500">Analise e acompanhe a evolução da sua presença online</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <History size={18} />
            Histórico
          </button>
          <button
            onClick={handleRunDiagnostic}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {isAnalyzing ? 'Analisando...' : 'Analisar Agora'}
          </button>
        </div>
      </div>

      {!latestDiagnostic ? (
        // Empty State
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity size={32} className="text-primary-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum diagnóstico realizado</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Clique em "Analisar Agora" para gerar seu primeiro diagnóstico de presença digital e receber recomendações personalizadas.
          </p>
          <button
            onClick={handleRunDiagnostic}
            disabled={isAnalyzing}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 mx-auto"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            Iniciar Diagnóstico
          </button>
        </div>
      ) : (
        <>
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Overall Score */}
            <div className={`p-6 rounded-xl shadow-sm border ${getScoreBg(latestDiagnostic.overallScore)}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Escore Geral</p>
                  <h3 className={`text-4xl font-bold mt-2 ${getScoreColor(latestDiagnostic.overallScore)}`}>
                    {latestDiagnostic.overallScore}
                  </h3>
                </div>
                <div className={`p-2 rounded-lg ${trend === 'improving' ? 'bg-green-100 text-green-600' : trend === 'declining' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                  {trend === 'improving' ? <TrendingUp size={20} /> : trend === 'declining' ? <TrendingDown size={20} /> : <Minus size={20} />}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {trend === 'improving' ? 'Em melhoria' : trend === 'declining' ? 'Em queda' : 'Estável'}
                {previousDiagnostic && ` (${latestDiagnostic.overallScore - previousDiagnostic.overallScore > 0 ? '+' : ''}${latestDiagnostic.overallScore - previousDiagnostic.overallScore} pts)`}
              </p>
            </div>

            {/* Reputation Score */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Reputação</p>
                  <h3 className={`text-3xl font-bold mt-2 ${getScoreColor(latestDiagnostic.scoreReputation)}`}>
                    {latestDiagnostic.scoreReputation}
                  </h3>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <Star size={20} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Baseado no NPS e avaliações</p>
            </div>

            {/* Information Score */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Informações</p>
                  <h3 className={`text-3xl font-bold mt-2 ${getScoreColor(latestDiagnostic.scoreInformation)}`}>
                    {latestDiagnostic.scoreInformation}
                  </h3>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <MapPin size={20} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Completude do perfil</p>
            </div>

            {/* Engagement Score */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Engajamento</p>
                  <h3 className={`text-3xl font-bold mt-2 ${getScoreColor(latestDiagnostic.scoreEngagement)}`}>
                    {latestDiagnostic.scoreEngagement}
                  </h3>
                </div>
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                  <MessageSquare size={20} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Interação com clientes</p>
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
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recomendações de Melhoria</h3>
              {latestDiagnostic.recommendations && latestDiagnostic.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {latestDiagnostic.recommendations.map((rec: DiagnosticRecommendation) => (
                    <div 
                      key={rec.id} 
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
                          {rec.priority === 'high' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{rec.title}</h4>
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
                <p className="text-gray-500 text-center py-8">Nenhuma recomendação no momento. Parabéns!</p>
              )}
            </div>
          </div>

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
                    <Line type="monotone" dataKey="information" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Informações" />
                    <Line type="monotone" dataKey="engagement" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Engajamento" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* History Modal/Section */}
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
                      <th className="px-4 py-3">Informações</th>
                      <th className="px-4 py-3">Engajamento</th>
                      <th className="px-4 py-3">Variação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {diagnostics.map((d, index) => {
                      const prev = diagnostics[index + 1];
                      const diff = prev ? d.overallScore - prev.overallScore : 0;
                      return (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(d.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className={`px-4 py-3 text-sm font-bold ${getScoreColor(d.overallScore)}`}>{d.overallScore}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.scoreReputation}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.scoreInformation}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.scoreEngagement}</td>
                          <td className="px-4 py-3 text-sm">
                            {prev && (
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
        </>
      )}
    </div>
  );
};

export default DigitalDiagnosticComponent;