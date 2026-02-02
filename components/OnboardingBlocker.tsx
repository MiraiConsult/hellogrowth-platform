'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Lock,
  Sparkles,
  Building2,
  Users,
  MapPin,
  Package,
  ArrowRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface OnboardingBlockerProps {
  userId: string;
  requiredItems: ('profile' | 'persona' | 'placeId' | 'products')[];
  moduleName: string;
  moduleDescription: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
}

interface OnboardingStatus {
  hasBusinessProfile: boolean;
  hasPlaceId: boolean;
  hasProducts: boolean;
  hasPersona: boolean;
  companyName: string;
}

export default function OnboardingBlocker({
  userId,
  requiredItems,
  moduleName,
  moduleDescription,
  onNavigate,
  children
}: OnboardingBlockerProps) {
  const supabase = createClientComponentClient();
  const [status, setStatus] = useState<OnboardingStatus>({
    hasBusinessProfile: false,
    hasPlaceId: false,
    hasProducts: false,
    hasPersona: false,
    companyName: ''
  });
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // Obter o ID do usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();

        // Verificar perfil do negócio
        const { data: profile } = await supabase
          .from('business_profile')
          .select('*')
          .eq('user_id', userId)
          .single();

        // Verificar produtos
        const { count } = await supabase
          .from('products_services')
          .select('*', { count: 'exact' })
          .eq('user_id', user?.id || userId);

        const newStatus = {
          hasBusinessProfile: !!profile?.company_name && !!profile?.business_description,
          hasPlaceId: !!profile?.google_place_id,
          hasProducts: (count || 0) > 0,
          hasPersona: !!profile?.target_audience && profile?.target_audience.length > 30,
          companyName: profile?.company_name || ''
        };

        setStatus(newStatus);

        // Verificar se está bloqueado
        const missingItems = requiredItems.filter(item => {
          switch (item) {
            case 'profile': return !newStatus.hasBusinessProfile;
            case 'persona': return !newStatus.hasPersona;
            case 'placeId': return !newStatus.hasPlaceId;
            case 'products': return !newStatus.hasProducts;
            default: return false;
          }
        });

        setIsBlocked(missingItems.length > 0);
      } catch (error) {
        console.log('Erro ao verificar status de onboarding:', error);
        setIsBlocked(true);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [userId, requiredItems, supabase]);

  const getItemInfo = (item: string) => {
    switch (item) {
      case 'profile':
        return {
          label: 'Perfil do Negócio',
          description: 'Descreva sua empresa',
          icon: Building2,
          completed: status.hasBusinessProfile,
          navigateTo: 'business-profile'
        };
      case 'persona':
        return {
          label: 'Público-Alvo',
          description: 'Defina seu cliente ideal',
          icon: Users,
          completed: status.hasPersona,
          navigateTo: 'business-profile'
        };
      case 'placeId':
        return {
          label: 'Google Place ID',
          description: 'Para monitorar avaliações',
          icon: MapPin,
          completed: status.hasPlaceId,
          navigateTo: 'business-profile'
        };
      case 'products':
        return {
          label: 'Catálogo de Produtos',
          description: 'Cadastre seus serviços',
          icon: Package,
          completed: status.hasProducts,
          navigateTo: 'products'
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Se não está bloqueado, renderiza o conteúdo normalmente
  if (!isBlocked) {
    return <>{children}</>;
  }

  // Tela de bloqueio
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center">
            <div className="inline-flex p-4 bg-white/20 rounded-full mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Quase lá! 🚀
            </h2>
            <p className="text-amber-100">
              Para usar o <strong>{moduleName}</strong>, preciso conhecer melhor seu negócio
            </p>
          </div>

          {/* Conteúdo */}
          <div className="p-6">
            <div className="flex items-start gap-3 mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-amber-800 font-medium">Por que isso é necessário?</p>
                <p className="text-sm text-amber-700 mt-1">
                  {moduleDescription}
                </p>
              </div>
            </div>

            <h3 className="font-semibold text-slate-800 mb-4">
              Complete estas etapas para desbloquear:
            </h3>

            <div className="space-y-3">
              {requiredItems.map((item) => {
                const info = getItemInfo(item);
                if (!info) return null;
                const Icon = info.icon;

                return (
                  <button
                    key={item}
                    onClick={() => onNavigate(info.navigateTo)}
                    disabled={info.completed}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                      info.completed
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        info.completed ? 'bg-emerald-100' : 'bg-slate-200'
                      }`}>
                        <Icon size={20} className={
                          info.completed ? 'text-emerald-600' : 'text-slate-600'
                        } />
                      </div>
                      <div className="text-left">
                        <p className={`font-medium ${
                          info.completed ? 'text-emerald-800' : 'text-slate-800'
                        }`}>
                          {info.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {info.completed ? 'Concluído!' : info.description}
                        </p>
                      </div>
                    </div>
                    {info.completed ? (
                      <CheckCircle2 className="text-emerald-500" size={24} />
                    ) : (
                      <ArrowRight className="text-slate-400" size={20} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <button
              onClick={() => {
                const firstIncomplete = requiredItems.find(item => {
                  const info = getItemInfo(item);
                  return info && !info.completed;
                });
                if (firstIncomplete) {
                  const info = getItemInfo(firstIncomplete);
                  if (info) onNavigate(info.navigateTo);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200"
            >
              <Sparkles size={20} />
              Começar Configuração
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* Dica */}
        <p className="text-center text-sm text-slate-500 mt-6">
          💡 Quanto mais informações você fornecer, mais inteligente a IA será!
        </p>
      </div>
    </div>
  );
}
