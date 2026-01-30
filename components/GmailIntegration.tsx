import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2, LogOut, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const GMAIL_CLIENT_ID = "850759694641-tkguhapdt0a628d86iui4lqqf6qo3iti.apps.googleusercontent.com";
const REDIRECT_URI = "https://system.hellogrowth.online/api/auth/callback/google";

export default function GmailIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('gmail_connections')
        .select('email')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setIsConnected(true);
        setEmail(data.email);
      }
    } catch (err) {
      console.error('Error checking Gmail connection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const scope = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GMAIL_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('gmail_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setEmail('');
    } catch (err) {
      setError('Erro ao desconectar Gmail');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-4">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Verificando conexão com Gmail...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 p-2 rounded-lg text-red-600">
            <Mail size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Integração com Gmail</h3>
            <p className="text-sm text-gray-500">Envie emails diretamente pela sua conta Gmail.</p>
          </div>
        </div>
        {isConnected ? (
          <span className="flex items-center gap-1 text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-100">
            <CheckCircle size={14} /> CONECTADO
          </span>
        ) : (
          <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
            DESCONECTADO
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {isConnected ? (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Conta Conectada</p>
                <p className="font-medium text-gray-900">{email}</p>
              </div>
              <button 
                onClick={handleDisconnect}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium px-3 py-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} /> Desconectar
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle size={14} />
            Seu sistema agora pode enviar emails diretamente usando esta conta.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Ao conectar seu Gmail, você poderá enviar sugestões de IA, convites de NPS e acompanhamentos de leads diretamente pela plataforma, sem precisar abrir o Outlook ou Gmail manualmente.
          </p>
          <button 
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            Conectar Conta Google
          </button>
        </div>
      )}
    </div>
  );
}
