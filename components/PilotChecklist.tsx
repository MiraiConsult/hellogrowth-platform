"use client";

import { useState, useEffect, useCallback } from "react";

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  docUrl?: string;
  action?: string;
}

interface PilotClient {
  id: string;
  name: string;
  segment: string;
  contactName: string;
  contactPhone: string;
  status: "pending" | "in_progress" | "ready" | "live";
  progress: number;
  createdAt: string;
}

const CHECKLIST_TEMPLATE: Omit<ChecklistItem, "completed">[] = [
  // Configuração Técnica
  {
    id: "whatsapp_connected",
    category: "Configuração Técnica",
    title: "WhatsApp Business API conectado",
    description: "Número de WhatsApp Business configurado com phone_number_id e business_token válidos.",
    required: true,
    action: "Ir para Configurações → WhatsApp",
  },
  {
    id: "webhook_verified",
    category: "Configuração Técnica",
    title: "Webhook verificado pela Meta",
    description: "URL do webhook confirmada no painel Meta Business Suite com verify_token correto.",
    required: true,
    docUrl: "https://developers.facebook.com/docs/whatsapp/webhooks",
  },
  {
    id: "inngest_configured",
    category: "Configuração Técnica",
    title: "Inngest configurado no Vercel",
    description: "Variáveis INNGEST_EVENT_KEY e INNGEST_SIGNING_KEY configuradas no ambiente de produção.",
    required: true,
    action: "Configurar no Vercel Dashboard",
  },
  {
    id: "ai_key_configured",
    category: "Configuração Técnica",
    title: "Chave de IA configurada",
    description: "OPENAI_API_KEY ou GEMINI_API_KEY configurada nas variáveis de ambiente do Vercel.",
    required: true,
    action: "Configurar no Vercel Dashboard",
  },
  // Configuração da Clínica
  {
    id: "business_profile",
    category: "Configuração da Clínica",
    title: "Perfil da empresa preenchido",
    description: "Nome, segmento, descrição dos serviços e informações de contato completos.",
    required: true,
    action: "Ir para Configurações → Perfil",
  },
  {
    id: "google_review_link",
    category: "Configuração da Clínica",
    title: "Link do Google Reviews configurado",
    description: "URL de avaliação do Google configurada para o fluxo de promotores (NPS 9-10).",
    required: false,
    action: "Ir para Configurações → WhatsApp → Link Google",
  },
  {
    id: "referral_reward",
    category: "Configuração da Clínica",
    title: "Prêmio de indicação cadastrado",
    description: "Pelo menos um prêmio ativo para o programa de indicações.",
    required: false,
    action: "Ir para Ações → Prêmios de Indicação",
  },
  {
    id: "ai_persona",
    category: "Configuração da Clínica",
    title: "Persona da IA configurada",
    description: "Nome e tom de comunicação da IA definidos (ex: 'Ana', 'profissional e empático').",
    required: false,
    action: "Ir para Configurações → WhatsApp → Persona",
  },
  // Fluxos NPS
  {
    id: "nps_campaign_active",
    category: "Fluxos NPS",
    title: "Campanha NPS ativa",
    description: "Pelo menos uma campanha NPS configurada e ativa para disparar o fluxo de IA.",
    required: true,
    action: "Ir para Campanhas → Nova Campanha",
  },
  {
    id: "nps_flow_tested",
    category: "Fluxos NPS",
    title: "Fluxo NPS testado",
    description: "Teste completo do fluxo: resposta NPS → criação de conversa IA → mensagem gerada.",
    required: true,
  },
  {
    id: "copilot_mode_review",
    category: "Fluxos NPS",
    title: "Modo Copiloto ativado",
    description: "Confirmar que o modo Copiloto está ativo para revisão manual das primeiras mensagens.",
    required: true,
    action: "Ir para Configurações → WhatsApp → Modo",
  },
  // Fluxo Pré-Venda
  {
    id: "presale_form_active",
    category: "Fluxo Pré-Venda",
    title: "Formulário de pré-venda ativo",
    description: "Formulário de qualificação de leads configurado e publicado.",
    required: false,
    action: "Ir para Formulários → Novo Formulário",
  },
  {
    id: "presale_flow_tested",
    category: "Fluxo Pré-Venda",
    title: "Fluxo Pré-Venda testado",
    description: "Teste completo: preenchimento do formulário → criação de conversa → mensagem gerada.",
    required: false,
  },
  // Treinamento
  {
    id: "team_trained",
    category: "Treinamento",
    title: "Equipe treinada no ActionInbox",
    description: "Responsável pela aprovação de mensagens treinado no uso do painel ActionInbox.",
    required: true,
    action: "Ir para Ações → Caixa de Ação IA",
  },
  {
    id: "escalation_process",
    category: "Treinamento",
    title: "Processo de escalada definido",
    description: "Quem recebe notificação quando uma conversa é escalada para humano.",
    required: true,
  },
  {
    id: "opt_out_process",
    category: "Treinamento",
    title: "Processo de opt-out comunicado",
    description: "Equipe ciente que clientes que responderem 'PARAR' serão removidos automaticamente.",
    required: true,
  },
];

const STATUS_LABELS: Record<PilotClient["status"], string> = {
  pending: "Aguardando",
  in_progress: "Em Configuração",
  ready: "Pronto para Go-Live",
  live: "Ao Vivo",
};

const STATUS_COLORS: Record<PilotClient["status"], string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-yellow-100 text-yellow-700",
  ready: "bg-blue-100 text-blue-700",
  live: "bg-green-100 text-green-700",
};

export default function PilotChecklist() {
  const [clients, setClients] = useState<PilotClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    segment: "",
    contactName: "",
    contactPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(CHECKLIST_TEMPLATE.map((i) => i.category)))];

  const loadClientsFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem("pilot_clients");
      if (stored) {
        const parsed = JSON.parse(stored) as PilotClient[];
        setClients(parsed);
        if (parsed.length > 0 && !selectedClient) {
          setSelectedClient(parsed[0].id);
        }
      }
    } catch {
      // ignore
    }
  }, [selectedClient]);

  const loadChecklistFromStorage = useCallback((clientId: string) => {
    try {
      const stored = localStorage.getItem(`checklist_${clientId}`);
      if (stored) {
        setChecklist(JSON.parse(stored) as ChecklistItem[]);
      } else {
        const fresh = CHECKLIST_TEMPLATE.map((item) => ({ ...item, completed: false }));
        setChecklist(fresh);
        localStorage.setItem(`checklist_${clientId}`, JSON.stringify(fresh));
      }
    } catch {
      const fresh = CHECKLIST_TEMPLATE.map((item) => ({ ...item, completed: false }));
      setChecklist(fresh);
    }
  }, []);

  useEffect(() => {
    loadClientsFromStorage();
  }, [loadClientsFromStorage]);

  useEffect(() => {
    if (selectedClient) {
      loadChecklistFromStorage(selectedClient);
    }
  }, [selectedClient, loadChecklistFromStorage]);

  const saveClients = (updated: PilotClient[]) => {
    setClients(updated);
    localStorage.setItem("pilot_clients", JSON.stringify(updated));
  };

  const saveChecklist = (clientId: string, updated: ChecklistItem[]) => {
    setChecklist(updated);
    localStorage.setItem(`checklist_${clientId}`, JSON.stringify(updated));

    // Atualizar progresso do cliente
    const total = updated.length;
    const done = updated.filter((i) => i.completed).length;
    const progress = Math.round((done / total) * 100);
    const requiredDone = updated.filter((i) => i.required && !i.completed).length === 0;

    setClients((prev) => {
      const updated2 = prev.map((c) => {
        if (c.id !== clientId) return c;
        const newStatus: PilotClient["status"] =
          c.status === "live"
            ? "live"
            : requiredDone && progress >= 80
            ? "ready"
            : progress > 0
            ? "in_progress"
            : "pending";
        return { ...c, progress, status: newStatus };
      });
      localStorage.setItem("pilot_clients", JSON.stringify(updated2));
      return updated2;
    });
  };

  const toggleItem = (itemId: string) => {
    if (!selectedClient) return;
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    saveChecklist(selectedClient, updated);
  };

  const addClient = () => {
    if (!newClient.name.trim()) return;
    setLoading(true);
    const client: PilotClient = {
      id: `client_${Date.now()}`,
      name: newClient.name,
      segment: newClient.segment,
      contactName: newClient.contactName,
      contactPhone: newClient.contactPhone,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [...clients, client];
    saveClients(updated);
    setSelectedClient(client.id);
    setNewClient({ name: "", segment: "", contactName: "", contactPhone: "" });
    setShowAddClient(false);
    setLoading(false);
  };

  const markAsLive = (clientId: string) => {
    setClients((prev) => {
      const updated = prev.map((c) =>
        c.id === clientId ? { ...c, status: "live" as const } : c
      );
      localStorage.setItem("pilot_clients", JSON.stringify(updated));
      return updated;
    });
  };

  const removeClient = (clientId: string) => {
    const updated = clients.filter((c) => c.id !== clientId);
    saveClients(updated);
    localStorage.removeItem(`checklist_${clientId}`);
    if (selectedClient === clientId) {
      setSelectedClient(updated.length > 0 ? updated[0].id : null);
    }
  };

  const currentClient = clients.find((c) => c.id === selectedClient);
  const filteredChecklist =
    activeCategory === "all"
      ? checklist
      : checklist.filter((i) => i.category === activeCategory);

  const completedCount = checklist.filter((i) => i.completed).length;
  const requiredPending = checklist.filter((i) => i.required && !i.completed).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist de Piloto</h1>
          <p className="text-gray-500 text-sm mt-1">
            Acompanhe a configuração dos primeiros clientes piloto do módulo IA
          </p>
        </div>
        <button
          onClick={() => setShowAddClient(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <span>+</span> Adicionar Cliente Piloto
        </button>
      </div>

      {/* Modal Adicionar Cliente */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Novo Cliente Piloto</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa *</label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Clínica Saúde & Vida"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
                <input
                  type="text"
                  value={newClient.segment}
                  onChange={(e) => setNewClient((p) => ({ ...p, segment: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Clínica de Estética, Odontologia..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                <input
                  type="text"
                  value={newClient.contactName}
                  onChange={(e) => setNewClient((p) => ({ ...p, contactName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={newClient.contactPhone}
                  onChange={(e) => setNewClient((p) => ({ ...p, contactPhone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5511999999999"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddClient(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={addClient}
                disabled={!newClient.name.trim() || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Adicionando..." : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Lista de Clientes */}
        <div className="col-span-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">
                Clientes Piloto ({clients.length})
              </h2>
            </div>
            {clients.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                <div className="text-3xl mb-2">🚀</div>
                <p>Nenhum cliente piloto cadastrado.</p>
                <p className="mt-1">Clique em "Adicionar" para começar.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedClient === client.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{client.name}</p>
                        {client.segment && (
                          <p className="text-xs text-gray-500 mt-0.5">{client.segment}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[client.status]}`}
                          >
                            {STATUS_LABELS[client.status]}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 text-right">
                        <div className="text-lg font-bold text-gray-900">{client.progress}%</div>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              client.progress >= 80 ? "bg-green-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${client.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo Geral */}
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumo do Piloto</h3>
            <div className="space-y-2">
              {(["pending", "in_progress", "ready", "live"] as const).map((status) => {
                const count = clients.filter((c) => c.status === status).length;
                return (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Checklist do Cliente Selecionado */}
        <div className="col-span-8">
          {!currentClient ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-lg font-medium">Selecione um cliente piloto</p>
              <p className="text-sm mt-1">ou adicione um novo para começar o checklist</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Header do Cliente */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{currentClient.name}</h2>
                    {currentClient.segment && (
                      <p className="text-sm text-gray-500">{currentClient.segment}</p>
                    )}
                    {currentClient.contactName && (
                      <p className="text-xs text-gray-400 mt-1">
                        Responsável: {currentClient.contactName}
                        {currentClient.contactPhone && ` · ${currentClient.contactPhone}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {currentClient.status === "ready" && (
                      <button
                        onClick={() => markAsLive(currentClient.id)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                      >
                        🚀 Marcar como Ao Vivo
                      </button>
                    )}
                    <button
                      onClick={() => removeClient(currentClient.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="Remover cliente"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-600">
                      {completedCount}/{checklist.length} itens concluídos
                    </span>
                    {requiredPending > 0 && (
                      <span className="text-orange-600 text-xs font-medium">
                        ⚠ {requiredPending} obrigatório(s) pendente(s)
                      </span>
                    )}
                    {requiredPending === 0 && completedCount > 0 && (
                      <span className="text-green-600 text-xs font-medium">
                        ✓ Todos os itens obrigatórios concluídos
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        currentClient.progress >= 80 ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${currentClient.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Filtros de Categoria */}
              <div className="px-5 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      activeCategory === cat
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat === "all" ? "Todos" : cat}
                  </button>
                ))}
              </div>

              {/* Itens do Checklist */}
              <div className="divide-y divide-gray-100">
                {filteredChecklist.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      item.completed ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleItem(item.id)}
                        className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                          item.completed
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 hover:border-blue-400"
                        }`}
                      >
                        {item.completed && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              item.completed ? "line-through text-gray-400" : "text-gray-900"
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.required && !item.completed && (
                            <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded font-medium">
                              Obrigatório
                            </span>
                          )}
                          {item.completed && (
                            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-600 rounded font-medium">
                              ✓ Concluído
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                        {(item.action || item.docUrl) && !item.completed && (
                          <div className="flex gap-3 mt-2">
                            {item.action && (
                              <span className="text-xs text-blue-600 font-medium">
                                → {item.action}
                              </span>
                            )}
                            {item.docUrl && (
                              <a
                                href={item.docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                📖 Documentação
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Cliente adicionado em{" "}
                    {new Date(currentClient.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                  <button
                    onClick={() => {
                      if (selectedClient) {
                        const reset = CHECKLIST_TEMPLATE.map((item) => ({ ...item, completed: false }));
                        saveChecklist(selectedClient, reset);
                      }
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    Resetar checklist
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
