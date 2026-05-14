'use client';

import React, { useState, useMemo } from 'react';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface TenantData {
  tenantId: string;
  companyName: string;
  plan: string;
  subscriptionStatus: string;
  daysAsClient: number | null;
  businessType: string;
  sector: string;
  nps: {
    score: number | null;
    avgScore: number | null;
    totalResponses: number;
    promotores: number;
    detratores: number;
    passivos: number;
    trend: 'up' | 'down' | 'stable';
    topComments: string[];
  };
  leads: {
    total: number;
    vendido: number;
    pipelineValue: number;
  };
  healthScore: number;
  city: string | null;
  state: string | null;
  niche: string | null;
  nicheData: {
    chairs?: number;
    dentists?: number;
    has_secretary?: boolean;
  };
}

interface Props {
  tenants: TenantData[];
  isDark: boolean;
}

// ─── Lista de estados do Brasil ────────────────────────────────────────────────
const BRAZIL_STATES = [
  { code: 'AC', name: 'Acre', region: 'Norte' },
  { code: 'AL', name: 'Alagoas', region: 'Nordeste' },
  { code: 'AP', name: 'Amapá', region: 'Norte' },
  { code: 'AM', name: 'Amazonas', region: 'Norte' },
  { code: 'BA', name: 'Bahia', region: 'Nordeste' },
  { code: 'CE', name: 'Ceará', region: 'Nordeste' },
  { code: 'DF', name: 'Distrito Federal', region: 'Centro-Oeste' },
  { code: 'ES', name: 'Espírito Santo', region: 'Sudeste' },
  { code: 'GO', name: 'Goiás', region: 'Centro-Oeste' },
  { code: 'MA', name: 'Maranhão', region: 'Nordeste' },
  { code: 'MT', name: 'Mato Grosso', region: 'Centro-Oeste' },
  { code: 'MS', name: 'Mato Grosso do Sul', region: 'Centro-Oeste' },
  { code: 'MG', name: 'Minas Gerais', region: 'Sudeste' },
  { code: 'PA', name: 'Pará', region: 'Norte' },
  { code: 'PB', name: 'Paraíba', region: 'Nordeste' },
  { code: 'PR', name: 'Paraná', region: 'Sul' },
  { code: 'PE', name: 'Pernambuco', region: 'Nordeste' },
  { code: 'PI', name: 'Piauí', region: 'Nordeste' },
  { code: 'RJ', name: 'Rio de Janeiro', region: 'Sudeste' },
  { code: 'RN', name: 'Rio Grande do Norte', region: 'Nordeste' },
  { code: 'RS', name: 'Rio Grande do Sul', region: 'Sul' },
  { code: 'RO', name: 'Rondônia', region: 'Norte' },
  { code: 'RR', name: 'Roraima', region: 'Norte' },
  { code: 'SC', name: 'Santa Catarina', region: 'Sul' },
  { code: 'SP', name: 'São Paulo', region: 'Sudeste' },
  { code: 'SE', name: 'Sergipe', region: 'Nordeste' },
  { code: 'TO', name: 'Tocantins', region: 'Norte' },
];

const NICHES = [
  'Todos',
  'Odontologia',
  'Alimentação',
  'Hotelaria',
  'Estética',
  'Fitness',
  'Pet/Veterinária',
  'Farmácia',
  'Varejo',
  'Educação',
  'Tecnologia',
  'Contabilidade',
  'Saúde',
  'Barbearia',
  'Outros',
];

// ─── Mapa SVG do Brasil (paths simplificados por estado) ──────────────────────
const BRAZIL_SVG_PATHS: Record<string, string> = {
  AC: 'M 80 310 L 95 295 L 115 290 L 125 305 L 120 320 L 100 325 Z',
  AM: 'M 80 210 L 130 185 L 185 180 L 215 200 L 220 240 L 200 270 L 170 280 L 130 275 L 100 260 L 80 240 Z',
  RR: 'M 145 130 L 175 115 L 200 120 L 210 145 L 200 170 L 175 175 L 150 165 Z',
  PA: 'M 215 195 L 260 175 L 310 180 L 335 200 L 330 240 L 305 260 L 265 265 L 230 255 L 215 235 Z',
  AP: 'M 305 155 L 325 140 L 345 145 L 350 165 L 335 175 L 315 175 Z',
  TO: 'M 305 255 L 335 245 L 355 255 L 360 285 L 345 310 L 320 315 L 300 300 Z',
  MA: 'M 335 195 L 370 185 L 395 195 L 400 220 L 385 240 L 355 245 L 335 235 Z',
  PI: 'M 395 195 L 425 190 L 445 205 L 445 230 L 425 245 L 400 240 L 385 225 Z',
  CE: 'M 445 185 L 475 180 L 490 195 L 485 215 L 465 225 L 445 220 Z',
  RN: 'M 490 185 L 510 180 L 520 195 L 510 210 L 490 210 Z',
  PB: 'M 475 210 L 505 205 L 515 215 L 505 225 L 475 225 Z',
  PE: 'M 445 225 L 505 220 L 515 230 L 510 245 L 450 250 L 440 240 Z',
  AL: 'M 500 248 L 515 245 L 520 258 L 510 265 L 498 260 Z',
  SE: 'M 490 260 L 505 255 L 515 265 L 508 275 L 492 272 Z',
  BA: 'M 400 245 L 450 240 L 490 255 L 500 275 L 490 320 L 460 345 L 420 350 L 385 335 L 370 305 L 375 270 Z',
  MG: 'M 355 310 L 395 300 L 430 305 L 455 325 L 455 360 L 430 380 L 390 385 L 355 370 L 340 345 Z',
  ES: 'M 455 325 L 475 320 L 480 340 L 470 360 L 455 360 Z',
  RJ: 'M 420 375 L 455 360 L 470 370 L 465 390 L 440 400 L 415 395 Z',
  SP: 'M 340 345 L 390 340 L 420 355 L 420 390 L 395 410 L 355 415 L 325 400 L 315 375 Z',
  PR: 'M 315 375 L 355 370 L 390 380 L 395 410 L 370 430 L 335 435 L 305 420 L 300 400 Z',
  SC: 'M 300 400 L 335 395 L 365 405 L 370 425 L 345 440 L 310 440 L 290 425 Z',
  RS: 'M 285 420 L 310 415 L 345 420 L 365 440 L 360 470 L 335 490 L 300 490 L 270 470 L 265 445 Z',
  MS: 'M 280 325 L 320 315 L 350 325 L 355 360 L 335 385 L 300 390 L 270 375 L 265 350 Z',
  MT: 'M 210 255 L 265 245 L 305 255 L 320 285 L 315 320 L 280 330 L 240 330 L 205 315 L 195 285 Z',
  GO: 'M 320 285 L 355 275 L 380 285 L 385 315 L 365 340 L 335 345 L 310 335 L 305 310 Z',
  DF: 'M 358 305 L 368 300 L 374 308 L 368 316 L 358 313 Z',
  RO: 'M 130 270 L 170 265 L 200 275 L 205 305 L 185 320 L 150 320 L 125 305 Z',
};

// ─── Componente principal ──────────────────────────────────────────────────────
export default function AdminMarketIntelligence({ tenants, isDark }: Props) {
  const [selectedNiche, setSelectedNiche] = useState<string>('Todos');
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [sortField, setSortField] = useState<'leads' | 'nps' | 'health'>('leads');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // Filtrar tenants pelo nicho selecionado
  const filteredTenants = useMemo(() => {
    if (selectedNiche === 'Todos') return tenants;
    return tenants.filter(t => {
      const s = (t.sector || t.niche || '').toLowerCase();
      return s.includes(selectedNiche.toLowerCase()) ||
        (t.sector || '').toLowerCase() === selectedNiche.toLowerCase() ||
        (t.niche || '').toLowerCase() === selectedNiche.toLowerCase();
    });
  }, [tenants, selectedNiche]);

  // Contagem de clientes por estado
  const stateCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredTenants) {
      if (t.state) {
        const st = t.state.toUpperCase().trim();
        map[st] = (map[st] || 0) + 1;
      }
    }
    return map;
  }, [filteredTenants]);

  // Máximo para escala de cores
  const maxCount = useMemo(() => Math.max(1, ...Object.values(stateCount)), [stateCount]);

  // Cor do estado baseada na intensidade
  function getStateColor(code: string): string {
    const count = stateCount[code] || 0;
    if (count === 0) return isDark ? '#2a2a3a' : '#e8e8f0';
    const intensity = count / maxCount;
    if (intensity < 0.2) return isDark ? '#1a4a2e' : '#bbf7d0';
    if (intensity < 0.5) return isDark ? '#166534' : '#4ade80';
    if (intensity < 0.8) return isDark ? '#15803d' : '#16a34a';
    return isDark ? '#14532d' : '#166534';
  }

  // Dados do estado no tooltip
  function getStateInfo(code: string) {
    const state = BRAZIL_STATES.find(s => s.code === code);
    const count = stateCount[code] || 0;
    const stateTenants = filteredTenants.filter(t => (t.state || '').toUpperCase().trim() === code);
    const avgNps = stateTenants.length > 0
      ? Math.round(stateTenants.reduce((sum, t) => sum + (t.nps.score || 0), 0) / stateTenants.length)
      : null;
    const totalLeads = stateTenants.reduce((sum, t) => sum + t.leads.total, 0);
    return { name: state?.name || code, count, avgNps, totalLeads };
  }

  // Métricas resumidas do nicho selecionado
  const nicheMetrics = useMemo(() => {
    const total = filteredTenants.length;
    const totalLeads = filteredTenants.reduce((sum, t) => sum + t.leads.total, 0);
    const totalVendidos = filteredTenants.reduce((sum, t) => sum + t.leads.vendido, 0);
    const npsScores = filteredTenants.map(t => t.nps.score).filter(s => s !== null) as number[];
    const avgNps = npsScores.length > 0
      ? Math.round(npsScores.reduce((a, b) => a + b, 0) / npsScores.length)
      : null;
    const convRate = totalLeads > 0 ? Math.round((totalVendidos / totalLeads) * 100) : 0;
    const totalPipeline = filteredTenants.reduce((sum, t) => sum + t.leads.pipelineValue, 0);
    return { total, totalLeads, totalVendidos, avgNps, convRate, totalPipeline };
  }, [filteredTenants]);

  // Distribuição por nicho (para "Todos")
  const nicheDistribution = useMemo(() => {
    const map: Record<string, { count: number; leads: number; npsScores: number[] }> = {};
    for (const t of tenants) {
      const n = t.sector || 'Outros';
      if (!map[n]) map[n] = { count: 0, leads: 0, npsScores: [] };
      map[n].count++;
      map[n].leads += t.leads.total;
      if (t.nps.score !== null) map[n].npsScores.push(t.nps.score);
    }
    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        count: data.count,
        leads: data.leads,
        avgNps: data.npsScores.length > 0
          ? Math.round(data.npsScores.reduce((a, b) => a + b, 0) / data.npsScores.length)
          : null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [tenants]);

  // Tabela ICP — ordenável
  const icpData = useMemo(() => {
    return [...filteredTenants]
      .sort((a, b) => {
        if (sortField === 'leads') return sortDir === 'desc' ? b.leads.total - a.leads.total : a.leads.total - b.leads.total;
        if (sortField === 'nps') return sortDir === 'desc' ? (b.nps.score || -999) - (a.nps.score || -999) : (a.nps.score || -999) - (b.nps.score || -999);
        return sortDir === 'desc' ? b.healthScore - a.healthScore : a.healthScore - b.healthScore;
      })
      .slice(0, 20);
  }, [filteredTenants, sortField, sortDir]);

  // Dados exclusivos de Odontologia
  const dentalData = useMemo(() => {
    const dental = tenants.filter(t =>
      (t.sector || '').toLowerCase().includes('odonto') ||
      (t.niche || '').toLowerCase().includes('odonto')
    );
    const chairsDist: Record<string, number> = { '1-2': 0, '3-5': 0, '6+': 0 };
    const dentistsDist: Record<string, number> = { '1': 0, '2-3': 0, '4+': 0 };
    let withSecretary = 0;
    let withoutSecretary = 0;
    const sizeLeads: { label: string; leads: number; nps: number | null }[] = [];

    for (const t of dental) {
      const chairs = t.nicheData?.chairs || 0;
      const dentists = t.nicheData?.dentists || 0;
      const hasSecretary = t.nicheData?.has_secretary;

      if (chairs <= 2) chairsDist['1-2']++;
      else if (chairs <= 5) chairsDist['3-5']++;
      else chairsDist['6+']++;

      if (dentists <= 1) dentistsDist['1']++;
      else if (dentists <= 3) dentistsDist['2-3']++;
      else dentistsDist['4+']++;

      if (hasSecretary) withSecretary++;
      else withoutSecretary++;

      const sizeLabel = chairs <= 2 ? 'Pequeno (1-2 cadeiras)' : chairs <= 5 ? 'Médio (3-5 cadeiras)' : 'Grande (6+ cadeiras)';
      const existing = sizeLeads.find(s => s.label === sizeLabel);
      if (existing) {
        existing.leads += t.leads.total;
        if (t.nps.score !== null) existing.nps = existing.nps !== null ? Math.round((existing.nps + t.nps.score) / 2) : t.nps.score;
      } else {
        sizeLeads.push({ label: sizeLabel, leads: t.leads.total, nps: t.nps.score });
      }
    }

    return { total: dental.length, chairsDist, dentistsDist, withSecretary, withoutSecretary, sizeLeads };
  }, [tenants]);

  // ─── Estilos dinâmicos ─────────────────────────────────────────────────────
  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const text = isDark ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-gray-700' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900';
  const tableRowHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  function SortButton({ field, label }: { field: 'leads' | 'nps' | 'health'; label: string }) {
    const active = sortField === field;
    return (
      <button
        onClick={() => { if (active) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortField(field); setSortDir('desc'); } }}
        className={`flex items-center gap-1 text-xs font-medium ${active ? 'text-green-500' : textMuted}`}
      >
        {label}
        <span className="text-xs">{active ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
      </button>
    );
  }

  function NpsBar({ score }: { score: number | null }) {
    if (score === null) return <span className={`text-xs ${textMuted}`}>—</span>;
    const color = score >= 50 ? 'bg-green-500' : score >= 0 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, Math.max(0, (score + 100) / 2))}%` }} />
        </div>
        <span className={`text-xs font-medium ${score >= 50 ? 'text-green-500' : score >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>{score}</span>
      </div>
    );
  }

  function PieChart({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return <p className={`text-xs ${textMuted} text-center py-4`}>Sem dados</p>;
    let cumAngle = -90;
    const cx = 60, cy = 60, r = 50;
    const slices = data.map((d, i) => {
      const angle = (d.value / total) * 360;
      const startRad = (cumAngle * Math.PI) / 180;
      cumAngle += angle;
      const endRad = (cumAngle * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const large = angle > 180 ? 1 : 0;
      return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: colors[i % colors.length], label: d.label, value: d.value, pct: Math.round((d.value / total) * 100) };
    });
    return (
      <div className="flex items-center gap-4">
        <svg width="120" height="120" viewBox="0 0 120 120">
          {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke={isDark ? '#1f2937' : '#fff'} strokeWidth="1.5" />)}
        </svg>
        <div className="flex flex-col gap-1">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className={`text-xs ${textMuted}`}>{s.label}</span>
              <span className={`text-xs font-medium ${text}`}>{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const showDental = selectedNiche === 'Todos' || selectedNiche === 'Odontologia';

  return (
    <div className={`space-y-6 ${text}`}>
      {/* ── Header + Dropdown de nicho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Central de Inteligência de Mercado</h2>
          <p className={`text-sm ${textMuted} mt-0.5`}>Análise geográfica, por nicho e correlação de perfil de cliente</p>
        </div>
        <select
          value={selectedNiche}
          onChange={e => setSelectedNiche(e.target.value)}
          className={`px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 ${inputBg}`}
        >
          {NICHES.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Clientes no Nicho', value: nicheMetrics.total.toString(), icon: '🏢', color: 'text-blue-500' },
          { label: 'Leads Gerados', value: nicheMetrics.totalLeads.toLocaleString('pt-BR'), icon: '📊', color: 'text-purple-500' },
          { label: 'NPS Médio', value: nicheMetrics.avgNps !== null ? nicheMetrics.avgNps.toString() : '—', icon: '⭐', color: nicheMetrics.avgNps !== null && nicheMetrics.avgNps >= 50 ? 'text-green-500' : 'text-yellow-500' },
          { label: 'Taxa de Conversão', value: `${nicheMetrics.convRate}%`, icon: '🎯', color: 'text-orange-500' },
        ].map((card, i) => (
          <div key={i} className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{card.icon}</span>
              <span className={`text-xs ${textMuted}`}>{card.label}</span>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Mapa do Brasil + Distribuição por estado ── */}
      <div className={`rounded-xl border p-5 ${cardBg}`}>
        <h3 className="text-base font-semibold mb-4">Presença Geográfica</h3>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mapa SVG */}
          <div className="relative flex-shrink-0">
            <svg
              viewBox="60 110 480 400"
              className="w-full max-w-sm mx-auto lg:mx-0"
              style={{ height: '320px' }}
              onMouseLeave={() => setHoveredState(null)}
            >
              {Object.entries(BRAZIL_SVG_PATHS).map(([code, path]) => (
                <path
                  key={code}
                  d={path}
                  fill={getStateColor(code)}
                  stroke={isDark ? '#374151' : '#9ca3af'}
                  strokeWidth="0.8"
                  className="cursor-pointer transition-opacity duration-150"
                  style={{ opacity: hoveredState === code ? 0.8 : 1 }}
                  onMouseEnter={(e) => {
                    setHoveredState(code);
                    const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
                    if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseMove={(e) => {
                    const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
                    if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                />
              ))}
              {/* Labels dos estados principais */}
              {[
                { code: 'SP', x: 360, y: 385 },
                { code: 'RJ', x: 445, y: 382 },
                { code: 'MG', x: 400, y: 345 },
                { code: 'RS', x: 310, y: 455 },
                { code: 'PR', x: 345, y: 405 },
                { code: 'SC', x: 330, y: 425 },
                { code: 'BA', x: 430, y: 295 },
                { code: 'GO', x: 345, y: 310 },
                { code: 'MT', x: 255, y: 290 },
                { code: 'AM', x: 150, y: 225 },
                { code: 'PA', x: 270, y: 220 },
              ].map(({ code, x, y }) => (
                <text key={code} x={x} y={y} textAnchor="middle" fontSize="7" fill={isDark ? '#9ca3af' : '#6b7280'} className="pointer-events-none select-none">
                  {code}
                </text>
              ))}
              {/* Tooltip */}
              {hoveredState && (() => {
                const info = getStateInfo(hoveredState);
                const tx = Math.min(tooltipPos.x + 10, 350);
                const ty = Math.max(tooltipPos.y - 10, 10);
                return (
                  <g>
                    <rect x={tx} y={ty} width="130" height={info.count > 0 ? 62 : 38} rx="6" fill={isDark ? '#1f2937' : '#ffffff'} stroke={isDark ? '#374151' : '#e5e7eb'} strokeWidth="1" />
                    <text x={tx + 8} y={ty + 14} fontSize="8" fontWeight="bold" fill={isDark ? '#f9fafb' : '#111827'}>{info.name}</text>
                    <text x={tx + 8} y={ty + 26} fontSize="7" fill={isDark ? '#9ca3af' : '#6b7280'}>Clientes: {info.count}</text>
                    {info.count > 0 && <>
                      <text x={tx + 8} y={ty + 38} fontSize="7" fill={isDark ? '#9ca3af' : '#6b7280'}>Leads: {info.totalLeads}</text>
                      <text x={tx + 8} y={ty + 50} fontSize="7" fill={isDark ? '#9ca3af' : '#6b7280'}>NPS médio: {info.avgNps !== null ? info.avgNps : '—'}</text>
                    </>}
                    {info.count === 0 && <text x={tx + 8} y={ty + 30} fontSize="7" fill="#f59e0b">Oportunidade</text>}
                  </g>
                );
              })()}
            </svg>
            {/* Legenda */}
            <div className="flex items-center gap-3 mt-2 justify-center lg:justify-start">
              {[
                { color: isDark ? '#2a2a3a' : '#e8e8f0', label: 'Sem clientes' },
                { color: isDark ? '#1a4a2e' : '#bbf7d0', label: '1-2' },
                { color: isDark ? '#15803d' : '#4ade80', label: '3-5' },
                { color: isDark ? '#14532d' : '#166534', label: '6+' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color, border: `1px solid ${isDark ? '#374151' : '#9ca3af'}` }} />
                  <span className={`text-xs ${textMuted}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de estados */}
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-medium ${textMuted} mb-3`}>Clientes por Estado</h4>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {BRAZIL_STATES
                .map(s => ({ ...s, count: stateCount[s.code] || 0 }))
                .sort((a, b) => b.count - a.count)
                .map(s => (
                  <div key={s.code} className={`flex items-center gap-3 py-1.5 px-2 rounded-lg ${s.count > 0 ? (isDark ? 'bg-gray-700/50' : 'bg-gray-50') : ''}`}>
                    <span className={`text-xs font-mono font-bold w-6 ${s.count > 0 ? 'text-green-500' : textMuted}`}>{s.code}</span>
                    <span className={`text-xs flex-1 ${s.count > 0 ? text : textMuted}`}>{s.name}</span>
                    {s.count > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium text-green-500 w-4 text-right">{s.count}</span>
                      </div>
                    ) : (
                      <span className={`text-xs ${textMuted}`}>—</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Distribuição por nicho (só quando "Todos") ── */}
      {selectedNiche === 'Todos' && (
        <div className={`rounded-xl border p-5 ${cardBg}`}>
          <h3 className="text-base font-semibold mb-4">Distribuição por Nicho</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${border}`}>
                  <th className={`text-left py-2 pr-4 text-xs font-medium ${textMuted}`}>Nicho</th>
                  <th className={`text-right py-2 px-4 text-xs font-medium ${textMuted}`}>Clientes</th>
                  <th className={`text-right py-2 px-4 text-xs font-medium ${textMuted}`}>Leads</th>
                  <th className={`text-right py-2 pl-4 text-xs font-medium ${textMuted}`}>NPS Médio</th>
                </tr>
              </thead>
              <tbody>
                {nicheDistribution.map((n, i) => (
                  <tr key={i} className={`border-b ${border} ${tableRowHover} cursor-pointer`} onClick={() => setSelectedNiche(n.name)}>
                    <td className="py-2 pr-4">
                      <span className={`text-sm font-medium ${text}`}>{n.name}</span>
                    </td>
                    <td className="text-right py-2 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(n.count / (nicheDistribution[0]?.count || 1)) * 100}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${text}`}>{n.count}</span>
                      </div>
                    </td>
                    <td className={`text-right py-2 px-4 text-xs ${text}`}>{n.leads.toLocaleString('pt-BR')}</td>
                    <td className="text-right py-2 pl-4">
                      {n.avgNps !== null ? (
                        <span className={`text-xs font-medium ${n.avgNps >= 50 ? 'text-green-500' : n.avgNps >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>{n.avgNps}</span>
                      ) : <span className={`text-xs ${textMuted}`}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`text-xs ${textMuted} mt-2`}>Clique em um nicho para filtrar todos os painéis</p>
        </div>
      )}

      {/* ── Correlação ICP ── */}
      <div className={`rounded-xl border p-5 ${cardBg}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Correlação ICP</h3>
            <p className={`text-xs ${textMuted} mt-0.5`}>Perfil de cliente ideal — leads gerados × NPS × saúde</p>
          </div>
          <span className={`text-xs ${textMuted}`}>{filteredTenants.length} clientes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${border}`}>
                <th className={`text-left py-2 pr-4 text-xs font-medium ${textMuted}`}>Empresa</th>
                <th className={`text-left py-2 px-4 text-xs font-medium ${textMuted}`}>Estado</th>
                <th className={`text-right py-2 px-4 text-xs font-medium ${textMuted}`}>
                  <SortButton field="leads" label="Leads" />
                </th>
                <th className={`text-right py-2 px-4 text-xs font-medium ${textMuted}`}>Conv.</th>
                <th className={`text-right py-2 px-4 text-xs font-medium ${textMuted}`}>
                  <SortButton field="nps" label="NPS" />
                </th>
                <th className={`text-right py-2 pl-4 text-xs font-medium ${textMuted}`}>
                  <SortButton field="health" label="Saúde" />
                </th>
              </tr>
            </thead>
            <tbody>
              {icpData.map((t, i) => {
                const convRate = t.leads.total > 0 ? Math.round((t.leads.vendido / t.leads.total) * 100) : 0;
                return (
                  <tr key={t.tenantId} className={`border-b ${border} ${tableRowHover}`}>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${textMuted} w-5`}>{i + 1}</span>
                        <span className={`text-sm font-medium ${text} truncate max-w-32`}>{t.companyName}</span>
                      </div>
                    </td>
                    <td className={`py-2 px-4 text-xs ${textMuted}`}>{t.state || '—'}</td>
                    <td className={`text-right py-2 px-4 text-xs font-medium ${text}`}>{t.leads.total}</td>
                    <td className="text-right py-2 px-4">
                      <span className={`text-xs font-medium ${convRate >= 20 ? 'text-green-500' : convRate >= 10 ? 'text-yellow-500' : textMuted}`}>{convRate}%</span>
                    </td>
                    <td className="text-right py-2 px-4">
                      <NpsBar score={t.nps.score} />
                    </td>
                    <td className="text-right py-2 pl-4">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${t.healthScore >= 70 ? 'bg-green-500' : t.healthScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${t.healthScore}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${t.healthScore >= 70 ? 'text-green-500' : t.healthScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>{t.healthScore}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {icpData.length === 0 && (
                <tr>
                  <td colSpan={6} className={`text-center py-8 text-sm ${textMuted}`}>Nenhum cliente neste nicho</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredTenants.length > 20 && (
          <p className={`text-xs ${textMuted} mt-2 text-center`}>Exibindo top 20 de {filteredTenants.length} clientes</p>
        )}
      </div>

      {/* ── Seção exclusiva Odontologia ── */}
      {showDental && dentalData.total > 0 && (
        <div className={`rounded-xl border p-5 ${cardBg}`}>
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">🦷</span>
            <div>
              <h3 className="text-base font-semibold">Inteligência — Clínicas Odontológicas</h3>
              <p className={`text-xs ${textMuted}`}>{dentalData.total} clínicas cadastradas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Distribuição de Cadeiras */}
            <div>
              <h4 className={`text-sm font-medium ${text} mb-3`}>Cadeiras por Clínica</h4>
              <PieChart
                data={[
                  { label: '1-2 cadeiras', value: dentalData.chairsDist['1-2'] },
                  { label: '3-5 cadeiras', value: dentalData.chairsDist['3-5'] },
                  { label: '6+ cadeiras', value: dentalData.chairsDist['6+'] },
                ]}
                colors={['#3b82f6', '#10b981', '#f59e0b']}
              />
            </div>

            {/* Distribuição de Dentistas */}
            <div>
              <h4 className={`text-sm font-medium ${text} mb-3`}>Dentistas por Clínica</h4>
              <PieChart
                data={[
                  { label: '1 dentista', value: dentalData.dentistsDist['1'] },
                  { label: '2-3 dentistas', value: dentalData.dentistsDist['2-3'] },
                  { label: '4+ dentistas', value: dentalData.dentistsDist['4+'] },
                ]}
                colors={['#8b5cf6', '#ec4899', '#14b8a6']}
              />
            </div>

            {/* Secretária */}
            <div>
              <h4 className={`text-sm font-medium ${text} mb-3`}>Possui Secretária?</h4>
              <PieChart
                data={[
                  { label: 'Sim', value: dentalData.withSecretary },
                  { label: 'Não', value: dentalData.withoutSecretary },
                ]}
                colors={['#10b981', '#ef4444']}
              />
            </div>
          </div>

          {/* Correlação porte × performance */}
          {dentalData.sizeLeads.length > 0 && (
            <div className="mt-6">
              <h4 className={`text-sm font-medium ${text} mb-3`}>Porte × Performance</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${border}`}>
                      <th className={`text-left py-2 pr-4 text-xs font-medium ${textMuted}`}>Porte</th>
                      <th className={`text-right py-2 px-4 text-xs font-medium ${textMuted}`}>Leads Gerados</th>
                      <th className={`text-right py-2 pl-4 text-xs font-medium ${textMuted}`}>NPS Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dentalData.sizeLeads
                      .sort((a, b) => b.leads - a.leads)
                      .map((row, i) => (
                        <tr key={i} className={`border-b ${border} ${tableRowHover}`}>
                          <td className={`py-2 pr-4 text-sm font-medium ${text}`}>{row.label}</td>
                          <td className="text-right py-2 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(row.leads / Math.max(...dentalData.sizeLeads.map(r => r.leads), 1)) * 100}%` }} />
                              </div>
                              <span className={`text-xs font-medium ${text}`}>{row.leads}</span>
                            </div>
                          </td>
                          <td className="text-right py-2 pl-4">
                            {row.nps !== null ? (
                              <span className={`text-xs font-medium ${row.nps >= 50 ? 'text-green-500' : row.nps >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>{row.nps}</span>
                            ) : <span className={`text-xs ${textMuted}`}>—</span>}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Insights de oportunidade ── */}
      <div className={`rounded-xl border p-5 ${cardBg}`}>
        <h3 className="text-base font-semibold mb-4">Oportunidades de Expansão</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BRAZIL_STATES
            .filter(s => !stateCount[s.code])
            .slice(0, 6)
            .map(s => (
              <div key={s.code} className={`flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'border-yellow-800/40 bg-yellow-900/10' : 'border-yellow-200 bg-yellow-50'}`}>
                <span className="text-lg">📍</span>
                <div>
                  <p className={`text-sm font-medium ${text}`}>{s.name}</p>
                  <p className={`text-xs ${textMuted}`}>{s.region} · Sem clientes</p>
                </div>
              </div>
            ))}
          {BRAZIL_STATES.filter(s => !stateCount[s.code]).length === 0 && (
            <p className={`text-sm ${textMuted} col-span-3`}>Presença em todos os estados! 🎉</p>
          )}
        </div>
      </div>
    </div>
  );
}
