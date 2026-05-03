/**
 * Cron Job Inngest — Processador de Disparos Agendados
 * 
 * Executa a cada hora e processa a tabela `scheduled_dispatches`.
 * 
 * Tipos de disparo:
 * 1. pre_sale_form: Envia link do formulário de pré-venda 48h após cadastro do lead
 * 2. nps_survey: Envia link do NPS 2h após consulta agendada via CSV
 * 3. presale_followup: Follow-up para quem não respondeu o formulário
 */

import { inngest } from "@/lib/inngest-client";
import { createClient } from "@supabase/supabase-js";
import { sendTextMessage } from "@/lib/whatsapp-client";

// ============================================================
// TYPES
// ============================================================

interface ScheduledDispatch {
  id: string;
  tenant_id: string;
  contact_name: string;
  contact_phone: string;
  dispatch_type: "pre_sale_form" | "nps_survey" | "presale_followup";
  scheduled_for: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  metadata: Record<string, unknown>;
  retry_count: number;
  error_message?: string;
}

interface WaConnection {
  phone_number_id: string;
  access_token: string;
  api_key: string;
}

// ============================================================
// CRON FUNCTION — Executa a cada hora
// ============================================================

export const dispatchCron = inngest.createFunction(
  {
    id: "dispatch-cron",
    name: "Cron: Processar Disparos Agendados",
    concurrency: {
      limit: 1,
    },
  },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // --------------------------------------------------------
    // STEP 1: Buscar dispatches pendentes
    // --------------------------------------------------------
    const pendingDispatches = await step.run("fetch-pending-dispatches", async () => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("scheduled_dispatches")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_for", now)
        .lt("retry_count", 3)
        .order("scheduled_for", { ascending: true })
        .limit(50);

      if (error) {
        throw new Error(`Erro ao buscar dispatches: ${error.message}`);
      }

      return (data || []) as ScheduledDispatch[];
    });

    if (!pendingDispatches || pendingDispatches.length === 0) {
      return { processed: 0, message: "Nenhum dispatch pendente" };
    }

    // --------------------------------------------------------
    // STEP 2: Processar cada dispatch
    // --------------------------------------------------------
    const results = await step.run("process-dispatches", async () => {
      const processed: Array<{ id: string; status: "sent" | "failed"; error?: string }> = [];

      for (const dispatch of pendingDispatches) {
        try {
          // Buscar conexão WhatsApp do tenant
          const { data: waConnData } = await supabase
            .from("whatsapp_connections")
            .select("phone_number_id, access_token, api_key, status")
            .eq("tenant_id", dispatch.tenant_id)
            .eq("status", "connected")
            .single();

          if (!waConnData) {
            throw new Error(`Tenant ${dispatch.tenant_id} não tem WhatsApp conectado`);
          }

          const waConn = waConnData as WaConnection;

          // Processar de acordo com o tipo de disparo
          if (dispatch.dispatch_type === "pre_sale_form") {
            await processPreSaleFormDispatch(dispatch, waConn, supabase);
          } else if (dispatch.dispatch_type === "nps_survey") {
            await processNpsSurveyDispatch(dispatch, waConn, supabase);
          } else if (dispatch.dispatch_type === "presale_followup") {
            await processPreSaleFollowup(dispatch, waConn, supabase);
          }

          // Marcar como enviado
          await supabase
            .from("scheduled_dispatches")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", dispatch.id);

          processed.push({ id: dispatch.id, status: "sent" });

          // Pequena pausa entre envios para evitar rate limiting
          await new Promise<void>((resolve) => setTimeout(resolve, 500));
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";

          // Incrementar retry_count e marcar como failed se excedeu tentativas
          const newRetryCount = (dispatch.retry_count || 0) + 1;
          await supabase
            .from("scheduled_dispatches")
            .update({
              status: newRetryCount >= 3 ? "failed" : "pending",
              retry_count: newRetryCount,
              error_message: errorMsg,
            })
            .eq("id", dispatch.id);

          processed.push({ id: dispatch.id, status: "failed", error: errorMsg });
        }
      }

      return processed;
    });

    const sent = results.filter((r: { status: string }) => r.status === "sent").length;
    const failed = results.filter((r: { status: string }) => r.status === "failed").length;

    return {
      processed: results.length,
      sent,
      failed,
      details: results,
    };
  }
);

// ============================================================
// HANDLERS POR TIPO DE DISPARO
// ============================================================

async function processPreSaleFormDispatch(
  dispatch: ScheduledDispatch,
  waConn: WaConnection,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const { contact_name, contact_phone, tenant_id, metadata } = dispatch;
  const firstName = contact_name.split(" ")[0];

  // Buscar dados do tenant
  const { data: companyData } = await supabase
    .from("companies")
    .select("name, pre_sale_form_url")
    .eq("id", tenant_id)
    .single();

  const company = companyData as { name: string; pre_sale_form_url?: string } | null;
  const formUrl = (metadata?.form_url as string) || company?.pre_sale_form_url || null;
  const companyName = company?.name || "nossa equipe";

  const message = formUrl
    ? `Oi ${firstName}! 👋 Aqui é da ${companyName}. Vi que você demonstrou interesse em nossos serviços.\n\nPreparei um formulário rápido para entendermos melhor como podemos te ajudar: ${formUrl}\n\nQualquer dúvida, é só responder aqui! 😊`
    : `Oi ${firstName}! 👋 Aqui é da ${companyName}. Vi que você demonstrou interesse em nossos serviços. Posso te ajudar com mais informações?`;

  await sendTextMessage({
    to: contact_phone,
    text: message,
    phoneNumberId: waConn.phone_number_id,
    accessToken: waConn.access_token || waConn.api_key,
  });

  // Registrar conversa no banco
  await supabase.from("ai_conversations").insert({
    tenant_id,
    contact_name,
    contact_phone,
    flow_type: "pre_sale",
    status: "waiting_reply",
    mode: "copilot",
    triggered_by: "scheduled_dispatch",
    metadata: { dispatch_id: dispatch.id, ...metadata },
  });
}

async function processNpsSurveyDispatch(
  dispatch: ScheduledDispatch,
  waConn: WaConnection,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const { contact_name, contact_phone, tenant_id, metadata } = dispatch;
  const firstName = contact_name.split(" ")[0];

  // Buscar dados do tenant
  const { data: companyData } = await supabase
    .from("companies")
    .select("name, nps_survey_url")
    .eq("id", tenant_id)
    .single();

  const company = companyData as { name: string; nps_survey_url?: string } | null;
  const surveyUrl = (metadata?.survey_url as string) || company?.nps_survey_url || null;
  const companyName = company?.name || "nossa equipe";

  const message = surveyUrl
    ? `Oi ${firstName}! Esperamos que sua consulta tenha sido ótima 😊\n\nSua opinião é muito importante para nós. Leva menos de 1 minuto: ${surveyUrl}`
    : `Oi ${firstName}! Esperamos que sua consulta tenha sido ótima 😊 Como foi sua experiência conosco?`;

  await sendTextMessage({
    to: contact_phone,
    text: message,
    phoneNumberId: waConn.phone_number_id,
    accessToken: waConn.access_token || waConn.api_key,
  });
}

async function processPreSaleFollowup(
  dispatch: ScheduledDispatch,
  waConn: WaConnection,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const { contact_name, contact_phone, tenant_id } = dispatch;
  const firstName = contact_name.split(" ")[0];

  // Buscar dados do tenant
  const { data: companyData } = await supabase
    .from("companies")
    .select("name")
    .eq("id", tenant_id)
    .single();

  const company = companyData as { name: string } | null;
  const companyName = company?.name || "nossa equipe";

  // Suprimir aviso de variável não usada
  void companyName;

  const message = `Oi ${firstName}! Passando para ver se você teve alguma dúvida sobre nossos serviços 😊 Posso te ajudar com alguma informação?`;

  await sendTextMessage({
    to: contact_phone,
    text: message,
    phoneNumberId: waConn.phone_number_id,
    accessToken: waConn.access_token || waConn.api_key,
  });
}
