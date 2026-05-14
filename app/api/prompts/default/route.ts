/**
 * /api/prompts/default
 * 
 * GET — Retorna o prompt padrão do sistema para um flow_type
 * Usado pelo PromptManager para mostrar o prompt base antes de customizar
 */

import { NextRequest, NextResponse } from "next/server";
import { buildPrompt, type FlowType } from "@/lib/prompts";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const flowType = searchParams.get("flow_type") as FlowType | null;

    if (!flowType) {
      return NextResponse.json({ error: "flow_type obrigatório" }, { status: 400 });
    }

    const validFlowTypes: FlowType[] = ["detractor", "promoter", "passive", "pre_sale"];
    if (!validFlowTypes.includes(flowType)) {
      return NextResponse.json(
        { error: `flow_type inválido. Use: ${validFlowTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Gerar prompt com dados de exemplo para preview
    const previewPrompt = buildPrompt({
      flowType,
      companyName: "[Nome da Clínica]",
      companySegment: "[Segmento]",
      contactName: "Maria Silva",
      npsScore: flowType === "detractor" ? 3 : flowType === "promoter" ? 10 : flowType === "passive" ? 7 : undefined,
      npsComment: flowType !== "pre_sale" ? "Exemplo de comentário do paciente" : undefined,
      referralReward: flowType === "promoter" ? "desconto de 20% na próxima consulta" : undefined,
      googleReviewLink: flowType === "promoter" ? "https://g.page/r/exemplo" : undefined,
      interestedServices: flowType === "pre_sale" ? ["Exemplo de Serviço"] : undefined,
      formResponses: flowType === "pre_sale" ? { "Qual seu objetivo?": "Exemplo de resposta" } : undefined,
      turnNumber: 1,
    });

    const flowLabels: Record<FlowType, string> = {
      detractor: "Reconquista (NPS 0-6)",
      promoter: "Indicação (NPS 9-10)",
      passive: "Feedback (NPS 7-8)",
      pre_sale: "Pré-Venda",
    };

    return NextResponse.json({
      flow_type: flowType,
      flow_label: flowLabels[flowType],
      default_prompt: previewPrompt,
      note: "Este é o prompt padrão do sistema. Você pode criar uma versão customizada para sua clínica.",
    });
  } catch (err: any) {
    console.error("[Prompts Default API] Erro:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
