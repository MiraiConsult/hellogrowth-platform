/**
 * CSV Import — Upload de agenda para disparos programados
 * 
 * A secretária exporta a agenda da Clinicorp (ou outro sistema) em CSV
 * e faz upload aqui. O sistema lê a lista e programa os disparos:
 * - Pré-venda: 24h ANTES da consulta
 * - NPS: 2h DEPOIS da consulta
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface CSVRow {
  name: string;
  phone: string;
  email?: string;
  date: string; // data da consulta
  time?: string; // horário da consulta
  procedure?: string;
  type?: "pre_sale" | "nps"; // tipo de disparo
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  // Detectar separador (vírgula ou ponto-e-vírgula)
  const header = lines[0];
  const separator = header.includes(";") ? ";" : ",";

  const headers = header.split(separator).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  // Mapear nomes de colunas comuns
  const nameIdx = headers.findIndex((h) =>
    ["nome", "name", "paciente", "cliente"].includes(h)
  );
  const phoneIdx = headers.findIndex((h) =>
    ["telefone", "phone", "celular", "whatsapp", "tel"].includes(h)
  );
  const emailIdx = headers.findIndex((h) =>
    ["email", "e-mail"].includes(h)
  );
  const dateIdx = headers.findIndex((h) =>
    ["data", "date", "data_consulta", "data consulta", "appointment_date"].includes(h)
  );
  const timeIdx = headers.findIndex((h) =>
    ["hora", "horario", "time", "horário", "hora_consulta"].includes(h)
  );
  const procedureIdx = headers.findIndex((h) =>
    ["procedimento", "procedure", "servico", "serviço", "tratamento"].includes(h)
  );

  if (nameIdx === -1 || phoneIdx === -1 || dateIdx === -1) {
    throw new Error(
      "CSV deve conter colunas: nome, telefone e data. Colunas encontradas: " +
        headers.join(", ")
    );
  }

  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map((v) => v.trim().replace(/"/g, ""));
    if (values.length < 3) continue;

    const name = values[nameIdx] || "";
    const phone = normalizePhone(values[phoneIdx] || "");
    const date = values[dateIdx] || "";
    const time = timeIdx >= 0 ? values[timeIdx] || "" : "";
    const email = emailIdx >= 0 ? values[emailIdx] || "" : "";
    const procedure = procedureIdx >= 0 ? values[procedureIdx] || "" : "";

    if (!name || !phone || !date) continue;

    rows.push({ name, phone, email, date, time, procedure });
  }

  return rows;
}

function normalizePhone(phone: string): string {
  // Remove tudo que não é número
  let digits = phone.replace(/\D/g, "");

  // Adicionar código do país se não tiver
  if (digits.length === 10 || digits.length === 11) {
    digits = "55" + digits;
  }

  return digits;
}

function parseDate(dateStr: string, timeStr?: string): Date | null {
  // Tentar formatos comuns: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
  let date: Date | null = null;

  // DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    date = new Date(Number(year), Number(month) - 1, Number(day));
  }

  // YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    date = new Date(Number(year), Number(month) - 1, Number(day));
  }

  if (!date || isNaN(date.getTime())) return null;

  // Adicionar horário se disponível
  if (timeStr) {
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      date.setHours(Number(timeMatch[1]), Number(timeMatch[2]));
    }
  }

  return date;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const tenantId = formData.get("tenantId") as string;
    const dispatchType = (formData.get("type") as string) || "both"; // "pre_sale", "nps", "both"

    if (!file || !tenantId) {
      return NextResponse.json(
        { error: "Arquivo CSV e tenantId são obrigatórios" },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Nenhum registro válido encontrado no CSV. Verifique se tem colunas: nome, telefone, data." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Salvar registro do import
    const { data: importRecord, error: importError } = await supabase
      .from("csv_imports")
      .insert({
        tenant_id: tenantId,
        file_name: file.name,
        total_rows: rows.length,
        status: "processing",
      })
      .select("id")
      .single();

    if (importError) {
      return NextResponse.json(
        { error: "Erro ao salvar import: " + importError.message },
        { status: 500 }
      );
    }

    const importId = importRecord!.id;
    const dispatches: Array<Record<string, unknown>> = [];
    const errors: string[] = [];
    const now = new Date();

    for (const row of rows) {
      const appointmentDate = parseDate(row.date, row.time);

      if (!appointmentDate) {
        errors.push(`Linha ignorada: data inválida "${row.date}" para ${row.name}`);
        continue;
      }

      // Pré-venda: 24h antes da consulta
      if (dispatchType === "pre_sale" || dispatchType === "both") {
        const preSaleDate = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
        
        // Só agendar se a data for no futuro
        if (preSaleDate > now) {
          dispatches.push({
            tenant_id: tenantId,
            csv_import_id: importId,
            contact_name: row.name,
            contact_phone: row.phone,
            contact_email: row.email || null,
            dispatch_type: "pre_sale_form",
            scheduled_for: preSaleDate.toISOString(),
            appointment_date: appointmentDate.toISOString(),
            metadata: { procedure: row.procedure || null },
            status: "scheduled",
          });
        }
      }

      // NPS: 2h depois da consulta
      if (dispatchType === "nps" || dispatchType === "both") {
        const npsDate = new Date(appointmentDate.getTime() + 2 * 60 * 60 * 1000);

        // Se não tem horário, agendar para 18h do dia da consulta
        if (!row.time) {
          npsDate.setHours(18, 0, 0, 0);
        }

        if (npsDate > now) {
          dispatches.push({
            tenant_id: tenantId,
            csv_import_id: importId,
            contact_name: row.name,
            contact_phone: row.phone,
            contact_email: row.email || null,
            dispatch_type: "nps_survey",
            scheduled_for: npsDate.toISOString(),
            appointment_date: appointmentDate.toISOString(),
            metadata: { procedure: row.procedure || null },
            status: "scheduled",
          });
        }
      }
    }

    // Inserir dispatches em batch
    if (dispatches.length > 0) {
      const { error: dispatchError } = await supabase
        .from("scheduled_dispatches")
        .insert(dispatches);

      if (dispatchError) {
        await supabase
          .from("csv_imports")
          .update({ status: "error", error_message: dispatchError.message })
          .eq("id", importId);

        return NextResponse.json(
          { error: "Erro ao agendar disparos: " + dispatchError.message },
          { status: 500 }
        );
      }
    }

    // Atualizar status do import
    await supabase
      .from("csv_imports")
      .update({
        status: "completed",
        processed_rows: rows.length,
        scheduled_count: dispatches.length,
        error_message: errors.length > 0 ? errors.join("; ") : null,
      })
      .eq("id", importId);

    return NextResponse.json({
      status: "success",
      importId,
      totalRows: rows.length,
      scheduledDispatches: dispatches.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${dispatches.length} disparos agendados a partir de ${rows.length} registros.`,
    });
  } catch (error: any) {
    console.error("[CSV Import] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

// GET: Listar imports anteriores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId obrigatório" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("csv_imports")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ imports: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
