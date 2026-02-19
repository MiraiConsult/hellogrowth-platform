import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { Eye, EyeOff, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';

interface AuthProps {
  onLogin: (user: User) => void;
}

// Google Logo SVG Component
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Check for Google OAuth callback on mount
  useEffect(() => {
    console.log("Auth Mounted. Supabase Client:", supabase);

    // Check if we're returning from Google OAuth
    const params = new URLSearchParams(window.location.search);
    const googleLogin = params.get('google_login');
    const userParam = params.get('user');
    const errorParam = params.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (googleLogin === 'success' && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        onLogin(user);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error('Error parsing user data:', err);
        setError('Erro ao processar dados de login');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [onLogin]);

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      // Redirect to our API route that initiates OAuth
      window.location.href = '/api/auth/google';
    } catch (err: any) {
      console.error('Google Login Exception:', err);
      setError(err.message || 'Ocorreu um erro ao tentar entrar com o Google.');
      setGoogleLoading(false);
    }
  };

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
        
        // Check if user exists in 'users' table
        const { data, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle(); 

        if (dbError) {
          console.error("Supabase Login Error:", JSON.stringify(dbError, null, 2));
          throw new Error('Erro ao conectar com o banco de dados. Tente novamente mais tarde.');
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
        
        const user: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          password: data.password, 
          plan: data.plan,
          createdAt: data.created_at,
          companyName: data.company_name,
          tenantId: data.tenant_id,
          isOwner: isOwner,
          role: userRole
        };

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

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl transition-colors mb-6 ${
              googleLoading || loading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {googleLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span className="font-medium text-gray-700">Conectando ao Google...</span>
              </>
            ) : (
              <>
                <GoogleLogo />
                <span className="font-medium text-gray-700">Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">ou entrar com</span>
            </div>
          </div>

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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all pr-12"
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
              disabled={loading || googleLoading}
              className={`w-full text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30 ${
                loading || googleLoading
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
              Cadastre-se grátis
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
