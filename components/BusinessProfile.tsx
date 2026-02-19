'use client';

import { useState, useEffect } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { supabase } from '@/lib/supabase';
import {
  Building2,
  Users,
  MessageSquare,
  MapPin,
  Instagram,
  Facebook,
  Globe,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Target,
  Heart,
  Zap,
  ChevronRight,
  Info
} from 'lucide-react';

interface BusinessProfileData {
  id?: string;
  user_id: string;
  company_name: string;
  business_type: string;
  business_description: string;
  target_audience: string;
  brand_tone: string;
  differentials: string;
  main_pain_points: string;
  google_place_id: string;
  instagram_handle: string;
  facebook_page: string;
  website_url: string;
  onboarding_score: number;
}

interface BusinessProfileProps {
  userId: string;
}

const BRAND_TONES = [
  { value: 'profissional', label: 'Profissional', description: 'Formal e corporativo', icon: '💼' },
  { value: 'amigavel', label: 'Amigável', description: 'Próximo e acolhedor', icon: '😊' },
  { value: 'informal', label: 'Informal', description: 'Descontraído e leve', icon: '🎉' },
  { value: 'direto', label: 'Direto', description: 'Objetivo e sem rodeios', icon: '🎯' },
  { value: 'inspirador', label: 'Inspirador', description: 'Motivacional e empoderador', icon: '✨' },
];

const BUSINESS_TYPES = [
  'Clínica de Estética',
  'Consultório Médico',
  'Escritório de Advocacia',
  'Agência de Marketing',
  'Loja de Roupas',
  'Restaurante',
  'Academia',
  'Salão de Beleza',
  'Imobiliária',
  'Consultoria',
  'E-commerce',
  'Outro'
];

export default function BusinessProfile({ userId }: BusinessProfileProps) {
  const tenantId = useTenantId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'basic' | 'persona' | 'integrations'>('basic');
  
  const [profile, setProfile] = useState<BusinessProfileData>({
    user_id: userId,
    company_name: '',
    business_type: '',
    business_description: '',
    target_audience: '',
    brand_tone: 'profissional',
    differentials: '',
    main_pain_points: '',
    google_place_id: '',
    instagram_handle: '',
    facebook_page: '',
    website_url: '',
    onboarding_score: 0
  });

  // Calcular score de onboarding
  const calculateScore = (data: BusinessProfileData): number => {
    let score = 0;
    const weights = {
      company_name: 10,
      business_type: 10,
      business_description: 15,
      target_audience: 15,
      brand_tone: 0,
      differentials: 10,
      main_pain_points: 10,
      google_place_id: 15,
      instagram_handle: 5,
      facebook_page: 5,
    };

    if (data.company_name?.trim()) score += weights.company_name;
    if (data.business_type?.trim()) score += weights.business_type;
    if (data.business_description?.trim() && data.business_description.length > 50) score += weights.business_description;
    if (data.target_audience?.trim() && data.target_audience.length > 30) score += weights.target_audience;
    // brand_tone removido - não usado
    if (data.differentials?.trim()) score += weights.differentials;
    if (data.main_pain_points?.trim()) score += weights.main_pain_points;
    if (data.google_place_id?.trim()) score += weights.google_place_id;
    if (data.instagram_handle?.trim()) score += weights.instagram_handle;
    if (data.facebook_page?.trim()) score += weights.facebook_page;

    return Math.min(score, 100);
  };

  const currentScore = calculateScore(profile);

  useEffect(() => {
    const loadProfile = async () => {
      if (!tenantId) return;
      
      try {
        const { data, error } = await supabase
          .from('business_profile')
          .select('*')
          .eq('tenant_id', tenantId)
          .single();

        if (data) {
          setProfile(data);
        }
      } catch (error) {
        console.log('Perfil não encontrado, criando novo...');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      loadProfile();
    }
  }, [userId, tenantId]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSave = async () => {
    if (!userId || !tenantId) {
      showNotification('error', 'Usuário não identificado');
      return;
    }

    setSaving(true);
    try {
      const updatedProfile = {
        ...profile,
        user_id: userId,
        tenant_id: tenantId,
        onboarding_score: currentScore,
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await supabase
        .from('business_profile')
        .select('id')
        .eq('tenant_id', tenantId)
        .single();

      let result;
      if (existing) {
        result = await supabase
          .from('business_profile')
          .update(updatedProfile)
          .eq('tenant_id', tenantId);
      } else {
        result = await supabase
          .from('business_profile')
          .insert(updatedProfile);
      }

      if (result.error) throw result.error;

      showNotification('success', 'Perfil salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      showNotification('error', 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 30) return 'text-red-500';
    if (score < 70) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getScoreLabel = (score: number) => {
    if (score < 30) return 'Configurando a Base';
    if (score < 70) return 'IA em Aprendizado';
    return 'Negócio Inteligente';
  };

  const getScoreBgColor = (score: number) => {
    if (score < 30) return 'bg-red-500';
    if (score < 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Notificação */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {notification.message}
        </div>
      )}

      {/* Header com Score */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Sparkles size={28} />
              Perfil do Negócio
            </h1>
            <p className="text-emerald-100 mt-1">
              Configure seu negócio para que a IA te conheça melhor
            </p>
          </div>
          
          <div className="text-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${currentScore * 2.51} 251`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{currentScore}%</span>
              </div>
            </div>
            <p className="text-sm mt-2 font-medium">{getScoreLabel(currentScore)}</p>
          </div>
        </div>

        {/* Barra de progresso detalhada */}
        <div className="mt-6 bg-white/10 rounded-full p-1">
          <div className="flex gap-1">
            <div className={`h-2 rounded-full transition-all ${currentScore >= 10 ? 'bg-white' : 'bg-white/30'}`} style={{ width: '10%' }} />
            <div className={`h-2 rounded-full transition-all ${currentScore >= 20 ? 'bg-white' : 'bg-white/30'}`} style={{ width: '10%' }} />
            <div className={`h-2 rounded-full transition-all ${currentScore >= 30 ? 'bg-white' : 'bg-white/30'}`} style={{ width: '10%' }} />
            <div className={`h-2 rounded-full transition-all ${currentScore >= 40 ? 'bg-white' : 'bg-white/30'}`} style={{ width: '10%' }} />
            <div className={`h-2 rounded-full transition-all ${currentScore >= 50 ? 'bg-white' : 'bg-white/30'}`} style={{ width: '10%' }} />
            <div className={`h-2 rounded-full transition-all ${currentScore >= 60 ? 'bg-white' : 'bg-white/30'}`} style={{ width: '10%' }} />
            <div className={`h-2 rounded-full transition-all ${currentScore >= 70 ? 'bg-white' : 'bg-white/30'}`} style={{ width: '10%' }} />
            <div className={`h-2 rounded-full transition-all ${currentScore >= 80 ? 'bg-white' : 'bg-white/30'}`} style={{ width: '10%' }} />
            <div className={`h-2 rounded-full transition-all ${currentScore >= 90 ? 'bg-white' : 'bg-white/30'}`} style={{ width: '10%' }} />
            <div className={`h-2 rounded-full transition-all ${currentScore >= 100 ? 'bg-white' : 'bg-white/30'}`} style={{ width: '10%' }} />
          </div>
        </div>
      </div>

      {/* Navegação por Seções */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveSection('basic')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === 'basic'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Building2 size={18} />
          Dados Básicos
        </button>
        <button
          onClick={() => setActiveSection('persona')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === 'persona'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users size={18} />
          Persona & Comunicação
        </button>
        <button
          onClick={() => setActiveSection('integrations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === 'integrations'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Globe size={18} />
          Integrações
        </button>
      </div>

      {/* Seção: Dados Básicos */}
      {activeSection === 'basic' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Building2 className="text-emerald-600" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Dados Básicos da Empresa</h2>
              <p className="text-sm text-slate-500">Informações essenciais sobre seu negócio</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome da Empresa *
              </label>
              <input
                type="text"
                value={profile.company_name}
                onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                placeholder="Ex: Clínica Bella Vita"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Negócio *
              </label>
              <input
                type="text"
                value={profile.business_type}
                onChange={(e) => setProfile({ ...profile, business_type: e.target.value })}
                placeholder="Ex: Loja de Roupas, Consultoria Empresarial, Salão de Beleza..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descrição do Negócio *
            </label>
            <textarea
              value={profile.business_description}
              onChange={(e) => setProfile({ ...profile, business_description: e.target.value })}
              placeholder="Descreva o que sua empresa faz, quais serviços oferece e o que a torna especial. Quanto mais detalhes, melhor a IA vai te entender..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              {profile.business_description.length}/500 caracteres (mínimo recomendado: 50)
            </p>
          </div>
        </div>
      )}

      {/* Seção: Persona & Comunicação */}
      {activeSection === 'persona' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Persona & Comunicação</h2>
              <p className="text-sm text-slate-500">Defina seu público e como você se comunica</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Target className="inline mr-2" size={16} />
              Público-Alvo (Persona) *
            </label>
            <textarea
              value={profile.target_audience}
              onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })}
              placeholder="Descreva seu cliente ideal: idade, gênero, profissão, interesses, comportamentos, poder aquisitivo..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Zap className="inline mr-2" size={16} />
              Diferenciais Competitivos
            </label>
            <textarea
              value={profile.differentials}
              onChange={(e) => setProfile({ ...profile, differentials: e.target.value })}
              placeholder="O que te diferencia da concorrência? Qualidade, preço, atendimento, tecnologia..."
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Heart className="inline mr-2" size={16} />
              Principais Dores que Você Resolve
            </label>
            <textarea
              value={profile.main_pain_points}
              onChange={(e) => setProfile({ ...profile, main_pain_points: e.target.value })}
              placeholder="Quais problemas seus clientes têm que você resolve? Ex: falta de tempo, insegurança, dor..."
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Seção: Integrações */}
      {activeSection === 'integrations' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Globe className="text-purple-600" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Integrações Externas</h2>
              <p className="text-sm text-slate-500">Conecte suas redes e plataformas</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-amber-800 font-medium">Por que isso é importante?</p>
              <p className="text-sm text-amber-700">
                O Place ID do Google permite que a IA monitore suas avaliações e sugira ações de recuperação de clientes insatisfeitos.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <MapPin className="inline mr-2" size={16} />
              Google Place ID *
            </label>
            <input
              type="text"
              value={profile.google_place_id}
              onChange={(e) => setProfile({ ...profile, google_place_id: e.target.value })}
              placeholder="Ex: ChIJN1t_tDeuEmsRUsoyG83frY4"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              <a 
                href="https://developers.google.com/maps/documentation/places/web-service/place-id" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline"
              >
                Como encontrar seu Place ID?
              </a>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Instagram className="inline mr-2" size={16} />
                Instagram
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-slate-500">
                  @
                </span>
                <input
                  type="text"
                  value={profile.instagram_handle}
                  onChange={(e) => setProfile({ ...profile, instagram_handle: e.target.value })}
                  placeholder="seuinstagram"
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-r-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Facebook className="inline mr-2" size={16} />
                Facebook
              </label>
              <input
                type="text"
                value={profile.facebook_page}
                onChange={(e) => setProfile({ ...profile, facebook_page: e.target.value })}
                placeholder="URL da sua página"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Globe className="inline mr-2" size={16} />
              Website
            </label>
            <input
              type="url"
              value={profile.website_url}
              onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
              placeholder="https://www.seusite.com.br"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Botão Salvar */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save size={20} />
              Salvar Perfil
            </>
          )}
        </button>
      </div>

      {/* Dicas de Preenchimento */}
      {currentScore < 70 && (
        <div className="mt-6 bg-slate-50 rounded-xl p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="text-amber-500" size={20} />
            O que falta para ativar a IA?
          </h3>
          <div className="space-y-2">
            {!profile.company_name && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <ChevronRight size={16} className="text-amber-500" />
                Preencha o nome da empresa (+10%)
              </div>
            )}
            {!profile.business_type && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <ChevronRight size={16} className="text-amber-500" />
                Selecione o tipo de negócio (+10%)
              </div>
            )}
            {(!profile.business_description || profile.business_description.length < 50) && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <ChevronRight size={16} className="text-amber-500" />
                Descreva seu negócio com mais detalhes (+15%)
              </div>
            )}
            {(!profile.target_audience || profile.target_audience.length < 30) && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <ChevronRight size={16} className="text-amber-500" />
                Defina seu público-alvo (+15%)
              </div>
            )}
            {!profile.google_place_id && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <ChevronRight size={16} className="text-amber-500" />
                Adicione o Place ID do Google (+15%)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
