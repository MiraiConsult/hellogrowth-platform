import React, { useState, useEffect } from 'react';
import { User, UserCompany } from '@/types';
import { Eye, EyeOff, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Auth Mounted. Supabase Client:", supabase);

    // Check for error params in URL
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        console.log("Attempting login for:", email);

        // --- SUPER ADMIN CHECK ---
        if (email === 'admin@hellogrowth.com' && password === 'admin') {
           const adminUser: User = {
             id: 'super-admin',
             name: 'Administrador do Sistema',
             email: 'admin@hellogrowth.com',
             password: 'admin',
             plan: 'growth_lifetime',
             createdAt: new Date().toISOString(),
             companyName: 'HelloGrowth HQ',
             role: 'super_admin'
           };
           // Simulate network delay
           await new Promise(r => setTimeout(r, 800));
           onLogin(adminUser);
           return;
        }
        // -------------------------
        
        // Check if user exists in 'users' table — retry up to 3x on network errors
        let data: any = null;
        let dbError: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          const result = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();
          data = result.data;
          dbError = result.error;
          if (!dbError) break;
          const isNetworkError = dbError.message?.includes('fetch') ||
            dbError.message?.includes('network') ||
            dbError.message?.includes('Failed') ||
            dbError.code === 'NETWORK_ERROR' ||
            String(dbError).includes('ERR_');
          if (!isNetworkError || attempt === 3) break;
          console.warn(`[Auth] Tentativa ${attempt} falhou, tentando novamente...`, dbError.message);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }

        if (dbError) {
          console.error("Supabase Login Error:", JSON.stringify(dbError, null, 2));
          throw new Error('Erro ao conectar com o banco de dados. Verifique sua conexão e tente novamente.');
        }
        
        // SECURITY FIX: Validate user exists AND password matches
        // If user doesn't exist, reject
        if (!data) {
            throw new Error('Email ou senha incorretos. Verifique suas credenciais.');
        }
        
        // If user exists but has no password set, reject (security measure)
        if (!data.password || data.password.trim() === '') {
            console.error("User has no password set:", email);
            throw new Error('Sua conta não possui senha configurada. Entre em contato com o suporte.');
        }
        
        // If password doesn't match, reject
        if (data.password !== password) {
            throw new Error('Email ou senha incorretos. Verifique suas credenciais.');
        }
        
        // Buscar role do usuário diretamente da tabela users
        let isOwner = data.is_owner || false;
        let userRole = data.role || (isOwner ? 'admin' : 'viewer');
        
        // Buscar empresas do usuário na tabela user_companies
        let userCompanies: UserCompany[] = [];
        let activeCompanyId = data.tenant_id;
        let activePlan = data.plan;
        let activeCompanyName = data.company_name;
        let activeTrialEndAt: string | null = null;
        let activeTrialModel: string = 'none';
        let activeSubscriptionStatus: string = 'active';
        
        try {
          const { data: ucData } = await supabase
            .from('user_companies')
            .select('*, company:companies(*)')
            .eq('user_id', data.id)
            .eq('status', 'active');
          
          if (ucData && ucData.length > 0) {
            userCompanies = ucData;
            // Encontrar empresa padrão ou usar a primeira
            const defaultCompany = ucData.find((uc: any) => uc.is_default) || ucData[0];
            if (defaultCompany?.company) {
              activeCompanyId = defaultCompany.company_id;
              activePlan = defaultCompany.company.plan || data.plan;
              activeCompanyName = defaultCompany.company.name || data.company_name;
              userRole = defaultCompany.role || userRole;
              isOwner = defaultCompany.role === 'owner';
              // Capturar dados de trial da empresa ativa
              activeTrialEndAt = defaultCompany.company.trial_end_at || null;
              activeTrialModel = defaultCompany.company.trial_model || 'none';
              activeSubscriptionStatus = defaultCompany.company.subscription_status || 'active';
            }
          }
        } catch (err) {
          console.warn('Erro ao buscar empresas do usuário (tabela pode não existir ainda):', err);
        }
        
        const user: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          password: data.password, 
          plan: activePlan,
          createdAt: data.created_at,
          companyName: activeCompanyName,
          tenantId: activeCompanyId,
          isOwner: isOwner,
          role: userRole,
          companies: userCompanies,
          activeCompanyId: activeCompanyId,
          trialEndAt: activeTrialEndAt || undefined,
          trialModel: (activeTrialModel as 'none' | 'model_a' | 'model_b') || 'none',
          subscriptionStatus: (activeSubscriptionStatus as any) || 'active',
        };

        // Registrar last_login no banco (fire-and-forget, não bloqueia o login)
        supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.id)
          .then(() => {})
          .catch(() => {});

        onLogin(user);

    } catch (err: any) {
      console.error("Auth Exception:", err);
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              <span className="text-gray-900">Hello</span>
              <span className="text-emerald-500">Growth</span>
            </h1>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Entrar no HelloGrowth
          </h2>
          <p className="text-gray-600 mb-8">
            Acesse sua conta e impulsione suas vendas
          </p>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 bg-white"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all pr-12 text-gray-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-600">Lembrar de mim</span>
              </label>
              <a
                href="#"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Esqueci a senha
              </a>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Security Badge */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2 font-medium">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Acesso Seguro e Criptografado</span>
            </p>
          </div>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-gray-600">
            Não está no HelloGrowth?{' '}
            <Link
              href="/pricing"
              className="text-emerald-600 hover:text-emerald-700 font-bold"
            >
              Cadastre-se agora
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 items-center justify-center p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-4xl font-bold text-white mb-4">
              + Avaliações Positivas + Vendas!
            </h2>
            <p className="text-2xl font-bold text-white mb-8">
              Tudo isso em uma só plataforma!
            </p>
            
            {/* Dashboard Preview Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/hellogrowth-dashboard.png"
                alt="HelloGrowth Dashboard"
                width={600}
                height={400}
                className="w-full h-auto"
                priority
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                <div className="text-3xl font-bold text-white mb-1">+28%</div>
                <div className="text-white/90 text-sm">Conversão Média</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                <div className="text-3xl font-bold text-white mb-1">+40%</div>
                <div className="text-white/90 text-sm">Aumento de Vendas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
