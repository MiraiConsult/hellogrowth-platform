'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
import {
  Sparkles,
  Building2,
  Users,
  MapPin,
  Package,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight
} from 'lucide-react';

interface OnboardingWidgetProps {
  userId: string;
  onNavigate: (view: string) => void;
}

interface OnboardingStatus {
  hasBusinessProfile: boolean;
  hasPlaceId: boolean;
  hasProducts: boolean;
  hasPersona: boolean;
  profileScore: number;
  productsCount: number;
}

export default function OnboardingWidget({ userId, onNavigate }: OnboardingWidgetProps) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const [status, setStatus] = useState<OnboardingStatus>({
    hasBusinessProfile: false,
    hasPlaceId: false,
    hasProducts: false,
    hasPersona: false,
    profileScore: 0,
    productsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // Obter o ID do usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthUserId(user.id);
        }

        // Verificar perfil do negócio
        const { data: profile } = await supabase
          .from('business_profile')
          .select('*')
          .eq('user_id', userId)
          .single();

        // Verificar produtos
        const { data: products, count } = await supabase
          .from('products_services')
          .select('*', { count: 'exact' })
          .eq('user_id', user?.id || userId);

        setStatus({
          hasBusinessProfile: !!profile?.company_name && !!profile?.business_description,
          hasPlaceId: !!profile?.google_place_id,
          hasProducts: (count || 0) > 0,
          hasPersona: !!profile?.target_audience && profile?.target_audience.length > 30,
          profileScore: profile?.onboarding_score || 0,
          productsCount: count || 0
        });
      } catch (error) {
        console.log('Erro ao verificar status de onboarding:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [userId, supabase]);

  const totalSteps = 4;
  const completedSteps = [
    status.hasBusinessProfile,
    status.hasPlaceId,
    status.hasProducts,
    status.hasPersona
  ].filter(Boolean).length;

  const overallProgress = Math.round((completedSteps / totalSteps) * 100);

  const getStatusColor = () => {
    if (overallProgress < 25) return 'from-red-500 to-red-600';
    if (overallProgress < 50) return 'from-amber-500 to-amber-600';
    if (overallProgress < 75) return 'from-blue-500 to-blue-600';
    return 'from-emerald-500 to-emerald-600';
  };

  const getStatusLabel = () => {
    if (overallProgress < 25) return 'Iniciando Configuração';
    if (overallProgress < 50) return 'Configurando a Base';
    if (overallProgress < 75) return 'IA em Aprendizado';
    return 'Negócio Inteligente';
  };

  const getStatusIcon = () => {
    if (overallProgress < 50) return <AlertTriangle className="text-amber-500" size={20} />;
    if (overallProgress < 100) return <Zap className="text-blue-500" size={20} />;
    return <CheckCircle2 className="text-emerald-500" size={20} />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-2/3"></div>
      </div>
    );
  }

  // Se já completou tudo, mostrar versão compacta
  if (overallProgress === 100) {
    return (
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="font-semibold">IA Totalmente Ativada!</h3>
              <p className="text-sm text-emerald-100">Seu negócio está pronto para usar todos os recursos</p>
            </div>
          </div>
          <CheckCircle2 size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header com Gradiente */}
      <div className={`bg-gradient-to-r ${getStatusColor()} p-5 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Ative a Inteligência do Sistema</h3>
              <p className="text-sm opacity-90">{getStatusLabel()}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold">{overallProgress}%</span>
            <p className="text-xs opacity-80">{completedSteps}/{totalSteps} etapas</p>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="mt-4 bg-white/20 rounded-full h-2">
          <div 
            className="bg-white rounded-full h-2 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Lista de Etapas */}
      <div className="p-4 space-y-2">
        {/* Etapa 1: Perfil do Negócio */}
        <button
          onClick={() => onNavigate('business-profile')}
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
            status.hasBusinessProfile 
              ? 'bg-emerald-50 border border-emerald-200' 
              : 'bg-amber-50 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status.hasBusinessProfile ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <Building2 size={18} className={status.hasBusinessProfile ? 'text-emerald-600' : 'text-amber-600'} />
            </div>
            <div className="text-left">
              <p className={`font-medium ${status.hasBusinessProfile ? 'text-emerald-800' : 'text-amber-800'}`}>
                Perfil do Negócio
              </p>
              <p className="text-xs text-slate-500">
                {status.hasBusinessProfile ? 'Configurado!' : 'Descreva sua empresa'}
              </p>
            </div>
          </div>
          {status.hasBusinessProfile ? (
            <CheckCircle2 className="text-emerald-500" size={20} />
          ) : (
            <ChevronRight className="text-amber-500" size={20} />
          )}
        </button>

        {/* Etapa 2: Persona */}
        <button
          onClick={() => onNavigate('business-profile')}
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
            status.hasPersona 
              ? 'bg-emerald-50 border border-emerald-200' 
              : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status.hasPersona ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <Users size={18} className={status.hasPersona ? 'text-emerald-600' : 'text-slate-600'} />
            </div>
            <div className="text-left">
              <p className={`font-medium ${status.hasPersona ? 'text-emerald-800' : 'text-slate-800'}`}>
                Público-Alvo (Persona)
              </p>
              <p className="text-xs text-slate-500">
                {status.hasPersona ? 'Definido!' : 'Descreva seu cliente ideal'}
              </p>
            </div>
          </div>
          {status.hasPersona ? (
            <CheckCircle2 className="text-emerald-500" size={20} />
          ) : (
            <ChevronRight className="text-slate-400" size={20} />
          )}
        </button>

        {/* Etapa 3: Place ID */}
        <button
          onClick={() => onNavigate('business-profile')}
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
            status.hasPlaceId 
              ? 'bg-emerald-50 border border-emerald-200' 
              : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status.hasPlaceId ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <MapPin size={18} className={status.hasPlaceId ? 'text-emerald-600' : 'text-slate-600'} />
            </div>
            <div className="text-left">
              <p className={`font-medium ${status.hasPlaceId ? 'text-emerald-800' : 'text-slate-800'}`}>
                Google Place ID
              </p>
              <p className="text-xs text-slate-500">
                {status.hasPlaceId ? 'Conectado!' : 'Para monitorar avaliações'}
              </p>
            </div>
          </div>
          {status.hasPlaceId ? (
            <CheckCircle2 className="text-emerald-500" size={20} />
          ) : (
            <ChevronRight className="text-slate-400" size={20} />
          )}
        </button>

        {/* Etapa 4: Produtos */}
        <button
          onClick={() => onNavigate('products')}
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
            status.hasProducts 
              ? 'bg-emerald-50 border border-emerald-200' 
              : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status.hasProducts ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <Package size={18} className={status.hasProducts ? 'text-emerald-600' : 'text-slate-600'} />
            </div>
            <div className="text-left">
              <p className={`font-medium ${status.hasProducts ? 'text-emerald-800' : 'text-slate-800'}`}>
                Catálogo de Produtos
              </p>
              <p className="text-xs text-slate-500">
                {status.hasProducts ? `${status.productsCount} produto(s) cadastrado(s)` : 'Cadastre seus serviços'}
              </p>
            </div>
          </div>
          {status.hasProducts ? (
            <CheckCircle2 className="text-emerald-500" size={20} />
          ) : (
            <ChevronRight className="text-slate-400" size={20} />
          )}
        </button>
      </div>

      {/* CTA */}
      {overallProgress < 100 && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onNavigate(status.hasBusinessProfile ? 'products' : 'business-profile')}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-all"
          >
            Continuar Configuração
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
