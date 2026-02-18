import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { Mail, Lock, ArrowRight, Loader2, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Debug connection on mount
  useEffect(() => {
    console.log("Auth Mounted. Supabase Client:", supabase);
  }, []);

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (oauthError) {
        console.error('Google OAuth Error:', oauthError);
        throw new Error('Erro ao iniciar login com Google. Tente novamente.');
      }

      // The user will be redirected to Google, so we don't need to do anything else here
      // The callback page will handle the rest

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card with Glassmorphism */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
        
        <div className="relative bg-white/80 backdrop-blur-xl w-full rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Header with Gradient */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-10 text-center overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center mb-3">
                <Sparkles className="text-emerald-200 mr-2 animate-pulse" size={24} />
                <span className="font-bold text-4xl tracking-tight">
                  <span className="text-white">Hello</span>
                  <span className="text-emerald-100">Growth</span>
                </span>
                <Sparkles className="text-emerald-200 ml-2 animate-pulse" size={24} />
              </div>
              <p className="text-white/90 text-sm font-medium tracking-wide">
                Plataforma de Inteligência Comercial
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8">
            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold transition-all duration-300 mb-6 ${
                googleLoading || loading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[0.98]'
              }`}
            >
              {googleLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Conectando ao Google...</span>
                </>
              ) : (
                <>
                  <GoogleLogo />
                  <span>Entrar com Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 text-gray-400 font-medium">ou entre com email</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Email</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" size={20} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="relative w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-300 bg-white text-gray-900 placeholder:text-gray-400"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Senha</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" size={20} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="relative w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-300 bg-white text-gray-900 placeholder:text-gray-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 border border-red-100">
                  <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading || googleLoading}
                className={`relative w-full text-white font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden group ${
                  loading || googleLoading
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {!loading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                )}
                <span className="relative flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar</span>
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 flex items-center justify-center gap-2 font-medium">
                <ShieldCheck size={16} className="text-emerald-500" /> 
                <span>Acesso Seguro e Criptografado</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Auth;
