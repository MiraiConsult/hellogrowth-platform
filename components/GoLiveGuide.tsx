"use client";

import { useState } from "react";
import {
  Rocket, CheckCircle, Circle, ChevronDown, ChevronRight,
  Copy, ExternalLink, AlertTriangle, Key, Globe, Zap,
  MessageSquare, Mail, Database, Settings
} from "lucide-react";

interface Props {
  isDark: boolean;
}

interface EnvVar {
  key: string;
  description: string;
  example: string;
  required: boolean;
  link?: string;
}

interface Step {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  envVars?: EnvVar[];
  instructions?: string[];
  done?: boolean;
}

const ENV_GROUPS: { title: string; icon: any; color: string; vars: EnvVar[] }[] = [
  {
    title: "Supabase",
    icon: Database,
    color: "text-emerald-500",
    vars: [
      { key: "NEXT_PUBLIC_SUPABASE_URL", description: "URL do projeto Supabase", example: "https://xxxx.supabase.co", required: true, link: "https://supabase.com/dashboard/project/_/settings/api" },
      { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", description: "Chave anon pública", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", required: true, link: "https://supabase.com/dashboard/project/_/settings/api" },
      { key: "SUPABASE_SERVICE_ROLE_KEY", description: "Chave service role (secreta)", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", required: true, link: "https://supabase.com/dashboard/project/_/settings/api" },
    ],
  },
  {
    title: "WhatsApp Business API",
    icon: MessageSquare,
    color: "text-green-500",
    vars: [
      { key: "WHATSAPP_PHONE_NUMBER_ID", description: "ID do número de telefone no Meta", example: "123456789012345", required: true, link: "https://developers.facebook.com/apps" },
      { key: "WHATSAPP_BUSINESS_TOKEN", description: "Token de acesso permanente", example: "EAABsbCS1iHgBO...", required: true, link: "https://developers.facebook.com/apps" },
      { key: "WHATSAPP_WEBHOOK_VERIFY_TOKEN", description: "Token de verificação do webhook (você define)", example: "meu_token_secreto_123", required: true },
      { key: "WHATSAPP_WEBHOOK_SIGNING_SECRET", description: "App Secret do app Meta", example: "abc123def456...", required: false, link: "https://developers.facebook.com/apps" },
    ],
  },
  {
    title: "IA (Gemini / OpenAI)",
    icon: Zap,
    color: "text-purple-500",
    vars: [
      { key: "GEMINI_API_KEY", description: "Chave da API Google Gemini", example: "AIzaSy...", required: true, link: "https://aistudio.google.com/app/apikey" },
      { key: "OPENAI_API_KEY", description: "Chave OpenAI (alternativa ao Gemini)", example: "sk-proj-...", required: false, link: "https://platform.openai.com/api-keys" },
    ],
  },
  {
    title: "Inngest (Cron Jobs)",
    icon: Settings,
    color: "text-blue-500",
    vars: [
      { key: "INNGEST_EVENT_KEY", description: "Chave de evento Inngest", example: "evt_...", required: true, link: "https://app.inngest.com" },
      { key: "INNGEST_SIGNING_KEY", description: "Chave de assinatura Inngest", example: "signkey-...", required: true, link: "https://app.inngest.com" },
    ],
  },
  {
    title: "Email (Notificações)",
    icon: Mail,
    color: "text-amber-500",
    vars: [
      { key: "RESEND_API_KEY", description: "Chave API Resend para envio de emails", example: "re_...", required: false, link: "https://resend.com/api-keys" },
    ],
  },
  {
    title: "App",
    icon: Globe,
    color: "text-slate-500",
    vars: [
      { key: "NEXT_PUBLIC_APP_URL", description: "URL pública da aplicação", example: "https://app.hellogrowth.com.br", required: true },
      { key: "NEXTAUTH_SECRET", description: "Segredo para autenticação NextAuth", example: "openssl rand -base64 32", required: true },
      { key: "NEXTAUTH_URL", description: "URL base para callbacks de auth", example: "https://app.hellogrowth.com.br", required: true },
    ],
  },
];

const STEPS: Step[] = [
  {
    id: "supabase",
    title: "1. Executar migração SQL no Supabase",
    description: "Criar as tabelas do Módulo IA no banco de dados de produção.",
    icon: Database,
    color: "text-emerald-500",
    instructions: [
      "Acesse o Supabase Dashboard → SQL Editor",
      "Abra o arquivo supabase/migrations/20250503_semana4_referral_dispatches.sql",
      "Cole o conteúdo e clique em Run",
      "Verifique se as tabelas foram criadas em Table Editor",
    ],
  },
  {
    id: "meta",
    title: "2. Configurar App Meta / WhatsApp Business",
    description: "Criar o app Meta, obter credenciais e configurar o webhook.",
    icon: MessageSquare,
    color: "text-green-500",
    instructions: [
      "Acesse developers.facebook.com → Meus Apps → Criar App",
      "Selecione 'Empresa' e adicione o produto 'WhatsApp'",
      "Gere um token de acesso permanente em WhatsApp → Configuração",
      "Configure o webhook: URL = https://SEU_DOMINIO/api/whatsapp/webhook",
      "Token de verificação = valor que você definiu em WHATSAPP_WEBHOOK_VERIFY_TOKEN",
      "Assine os eventos: messages, message_deliveries, message_reads",
    ],
  },
  {
    id: "inngest",
    title: "3. Configurar Inngest",
    description: "Registrar o app no Inngest e obter as chaves de API.",
    icon: Settings,
    color: "text-blue-500",
    instructions: [
      "Acesse app.inngest.com → Criar conta ou fazer login",
      "Crie um novo app e copie o Event Key e Signing Key",
      "No Vercel, adicione as variáveis INNGEST_EVENT_KEY e INNGEST_SIGNING_KEY",
      "Após o deploy, acesse app.inngest.com → Apps → Sync App",
      "URL de sync: https://SEU_DOMINIO/api/inngest",
    ],
  },
  {
    id: "vercel",
    title: "4. Configurar variáveis no Vercel",
    description: "Adicionar todas as variáveis de ambiente no projeto Vercel.",
    icon: Globe,
    color: "text-slate-500",
    instructions: [
      "Acesse vercel.com → Seu projeto → Settings → Environment Variables",
      "Adicione todas as variáveis listadas na seção abaixo",
      "Marque as variáveis como 'Production' e 'Preview' conforme necessário",
      "Após adicionar, faça um novo deploy para aplicar as variáveis",
    ],
  },
  {
    id: "test",
    title: "5. Teste end-to-end",
    description: "Verificar o fluxo completo antes de ativar para clientes.",
    icon: CheckCircle,
    color: "text-purple-500",
    instructions: [
      "Configure um cliente piloto no PilotChecklist",
      "Envie um NPS de teste pelo formulário HelloRating",
      "Aguarde o Cron Job processar (ou dispare manualmente via Inngest)",
      "Verifique se a mensagem foi gerada na ActionInbox",
      "Aprove e envie a mensagem",
      "Responda pelo WhatsApp e verifique se a resposta aparece na conversa",
      "Teste o fluxo de escalada enviando 'quero falar com atendente'",
    ],
  },
];

export default function GoLiveGuide({ isDark }: Props) {
  const t = {
    card: isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
    text: isDark ? "text-slate-100" : "text-slate-800",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
    input: isDark ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-800",
    divider: isDark ? "border-slate-700" : "border-slate-200",
    highlight: isDark ? "bg-slate-700" : "bg-slate-100",
    codeBg: isDark ? "bg-slate-900" : "bg-slate-50",
  };

  const [expandedStep, setExpandedStep] = useState<string | null>("supabase");
  const [expandedGroup, setExpandedGroup] = useState<string | null>("WhatsApp Business API");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleStep = (id: string) => {
    setExpandedStep(expandedStep === id ? null : id);
  };

  const toggleComplete = (id: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  const completedCount = completedSteps.size;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${t.text} flex items-center gap-2`}>
            <Rocket size={22} className="text-purple-500" />
            Guia de Go-Live
          </h1>
          <p className={`text-sm ${t.textMuted} mt-1`}>
            Checklist técnico para colocar o Módulo IA em produção
          </p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${progress === 100 ? "text-emerald-500" : t.text}`}>
            {progress}%
          </p>
          <p className={`text-xs ${t.textMuted}`}>{completedCount}/{STEPS.length} etapas</p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-8">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${progress === 100 ? "bg-emerald-500" : "bg-purple-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-8">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isExpanded = expandedStep === step.id;
          const isDone = completedSteps.has(step.id);

          return (
            <div key={step.id} className={`rounded-xl border ${t.card} overflow-hidden`}>
              <div
                className={`flex items-center gap-3 p-4 cursor-pointer ${isDone ? "opacity-70" : ""}`}
                onClick={() => toggleStep(step.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleComplete(step.id); }}
                  className="flex-shrink-0"
                >
                  {isDone ? (
                    <CheckCircle size={20} className="text-emerald-500" />
                  ) : (
                    <Circle size={20} className={t.textMuted} />
                  )}
                </button>
                <div className={`w-8 h-8 rounded-lg ${t.highlight} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={15} className={step.color} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isDone ? "line-through " + t.textMuted : t.text}`}>
                    {step.title}
                  </p>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>{step.description}</p>
                </div>
                {isExpanded ? (
                  <ChevronDown size={16} className={t.textMuted} />
                ) : (
                  <ChevronRight size={16} className={t.textMuted} />
                )}
              </div>

              {isExpanded && step.instructions && (
                <div className={`px-4 pb-4 border-t ${t.divider}`}>
                  <ol className="space-y-2 mt-3">
                    {step.instructions.map((instruction, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`text-xs font-bold ${step.color} mt-0.5 flex-shrink-0`}>
                          {i + 1}.
                        </span>
                        <p className={`text-sm ${t.textMuted}`}>{instruction}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Variáveis de Ambiente */}
      <div className={`rounded-xl border ${t.card} overflow-hidden`}>
        <div className={`px-5 py-4 border-b ${t.divider} flex items-center gap-2`}>
          <Key size={16} className="text-amber-500" />
          <h2 className={`text-sm font-semibold ${t.text}`}>Variáveis de Ambiente</h2>
          <span className={`text-xs ${t.textMuted} ml-auto`}>Adicionar no Vercel → Settings → Environment Variables</span>
        </div>

        <div className="divide-y divide-slate-100">
          {ENV_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            const isGroupExpanded = expandedGroup === group.title;

            return (
              <div key={group.title}>
                <button
                  onClick={() => setExpandedGroup(isGroupExpanded ? null : group.title)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors`}
                >
                  <GroupIcon size={15} className={group.color} />
                  <span className={`text-sm font-medium ${t.text}`}>{group.title}</span>
                  <span className={`text-xs ${t.textMuted} ml-auto mr-2`}>
                    {group.vars.filter((v) => v.required).length} obrigatórias
                  </span>
                  {isGroupExpanded ? (
                    <ChevronDown size={14} className={t.textMuted} />
                  ) : (
                    <ChevronRight size={14} className={t.textMuted} />
                  )}
                </button>

                {isGroupExpanded && (
                  <div className={`${t.codeBg} border-t ${t.divider}`}>
                    {group.vars.map((envVar) => (
                      <div key={envVar.key} className={`px-5 py-3 border-b ${t.divider} last:border-b-0`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <code className={`text-xs font-mono font-bold ${t.text}`}>
                                {envVar.key}
                              </code>
                              {envVar.required ? (
                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">
                                  obrigatória
                                </span>
                              ) : (
                                <span className={`text-xs px-1.5 py-0.5 ${t.highlight} ${t.textMuted} rounded`}>
                                  opcional
                                </span>
                              )}
                            </div>
                            <p className={`text-xs ${t.textMuted} mb-1`}>{envVar.description}</p>
                            <code className={`text-xs ${t.textMuted} opacity-70`}>
                              Ex: {envVar.example}
                            </code>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => copyToClipboard(envVar.key)}
                              className={`p-1.5 rounded ${t.highlight} hover:opacity-80 transition-opacity`}
                              title="Copiar nome da variável"
                            >
                              {copiedKey === envVar.key ? (
                                <CheckCircle size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} className={t.textMuted} />
                              )}
                            </button>
                            {envVar.link && (
                              <a
                                href={envVar.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-1.5 rounded ${t.highlight} hover:opacity-80 transition-opacity`}
                                title="Abrir documentação"
                              >
                                <ExternalLink size={12} className={t.textMuted} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Aviso final */}
      {progress === 100 && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Pronto para o go-live!</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Todas as etapas foram concluídas. Ative o módulo para os primeiros clientes piloto e monitore as métricas na ActionInbox.
            </p>
          </div>
        </div>
      )}

      {progress < 100 && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Complete todas as etapas antes de ativar o módulo para clientes. Configurações incompletas podem causar falhas no envio de mensagens.
          </p>
        </div>
      )}
    </div>
  );
}
