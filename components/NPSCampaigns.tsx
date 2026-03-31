import React, { useState, useEffect, useRef } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { Campaign, CampaignQuestion, User, InitialField } from '@/types';
import { getSurveyLink } from '@/lib/utils/getBaseUrl';
import { Plus, X, Share2, MoreVertical, Star, Link as LinkIcon, ExternalLink, Sparkles, Trash2, Check, Pause, Play, Edit, Eye, Loader2, MapPin, Send, Upload, FileSpreadsheet, QrCode, Download, FileText, AlertCircle, GripVertical, ArrowUp, ArrowDown, ArrowLeft, Gift, BookOpen, Search, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/lib/supabase';
import InitialFieldsConfig from '@/components/InitialFieldsConfig';
import NPSConsultant from '@/components/NPSConsultant';
import MassDispatchModal from '@/components/MassDispatchModal';

interface NPSCampaignsProps {
  campaigns: Campaign[];
  onSaveCampaign: (campaign: Campaign) => void; 
  onDeleteCampaign: (id: string) => void;
  navigateToAnalytics: () => void;
  onPreview?: (id: string) => void;
  onViewReport?: (id: string) => void;
  currentUser?: User;
  setCampaigns?: any;
  businessProfile?: any;
  // Onboarding: abrir modais nativos diretamente
  onboardingOpenTemplates?: number;
  onboardingOpenAI?: number;
  onboardingOpenManual?: number;
}

const NPSCampaigns: React.FC<NPSCampaignsProps> = ({ campaigns, onSaveCampaign, onDeleteCampaign, navigateToAnalytics, onPreview, onViewReport, currentUser, businessProfile, onboardingOpenTemplates, onboardingOpenAI, onboardingOpenManual }) => {
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'active': 'Ativa',
      'paused': 'Pausada',
      'Ativa': 'Ativa',
      'Pausada': 'Pausada'
    };
    return labels[status] || status;
  };
  const tenantId = useTenantId()

  const [showNPSConsultant, setShowNPSConsultant] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mass Send State
  const [isMassSendOpen, setIsMassSendOpen] = useState(false);
  
  // QR Code State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [currentQrUrl, setCurrentQrUrl] = useState('');
  const [currentQrName, setCurrentQrName] = useState('');

  // Card para impressão
  const [printCardOpen, setPrintCardOpen] = useState(false);
  const [printCardUrl, setPrintCardUrl] = useState('');
  const [printCardName, setPrintCardName] = useState('');
  const [printCardLogo, setPrintCardLogo] = useState<string | null>(null);
  const [printCardGenerating, setPrintCardGenerating] = useState(false);
  const [printCardPreview, setPrintCardPreview] = useState<string | null>(null);

  const openPrintCard = (surveyUrl: string, surveyName: string) => {
    setPrintCardUrl(surveyUrl);
    setPrintCardName(surveyName);
    setPrintCardLogo(null);
    setPrintCardPreview(null);
    setPrintCardOpen(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPrintCardLogo(result);
    };
    reader.readAsDataURL(file);
  };

  const generatePrintCard = async () => {
    setPrintCardGenerating(true);
    try {
      // Layout 10x15cm retrato — Canvas puro
      // Ordem: fundo → círculos → onda → card branco → conteúdo → rodapé
      const W = 500, H = 750;

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
        ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
        ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
        ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
      };

      // 1. FUNDO
      ctx.fillStyle = '#1a5c2a';
      ctx.fillRect(0, 0, W, H);

      // 2. CÍRCULOS (antes do card — ficam atrás)
      const circ = (cx: number, cy: number, r: number, c: string, a: number) => {
        ctx.save(); ctx.fillStyle=c; ctx.globalAlpha=a;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI); ctx.fill(); ctx.restore();
      };
      circ(-25, 190, 105, '#7ed957', 0.92);
      circ(22, 290, 48, '#2d7a3a', 0.95);
      circ(W+22, 90, 70, '#7ed957', 0.80);
      circ(W+40, H-180, 125, '#7ed957', 0.80);
      circ(W-10, H-250, 50, '#2d7a3a', 0.95);

      // 3. ONDA
      ctx.save(); ctx.fillStyle='#b8f060'; ctx.globalAlpha=0.55;
      ctx.beginPath();
      ctx.ellipse(W/2, H+8, W*0.56, 95, 0, Math.PI, 2*Math.PI);
      ctx.fill(); ctx.restore();

      // 4. CARD BRANCO — maior, mais próximo do rodapé
      const cX = 45, cY = 18;
      const cW = W - 90, cH = 580;
      ctx.save();
      ctx.shadowColor='rgba(0,0,0,0.20)'; ctx.shadowBlur=35; ctx.shadowOffsetY=8;
      ctx.fillStyle='#ffffff';
      rr(cX, cY, cW, cH, 24);
      ctx.fill(); ctx.restore();

      // 5. CONTEÚDO DO CARD
      // Logo / nome
      if (printCardLogo) {
        await new Promise<void>(res => {
          const img = new Image();
          img.onload = () => {
            const mW=cW-40, mH=50;
            let iw=img.width, ih=img.height;
            const sc=Math.min(mW/iw, mH/ih, 1); iw*=sc; ih*=sc;
            ctx.drawImage(img, W/2-iw/2, cY+20+(50-ih)/2, iw, ih);
            res();
          };
          img.onerror=()=>res();
          img.src=printCardLogo;
        });
      } else if (businessProfile?.company_name) {
        ctx.fillStyle='#1a5c2a';
        ctx.font='bold 20px Arial,Helvetica,sans-serif';
        ctx.textAlign='center';
        ctx.fillText(businessProfile.company_name, W/2, cY+56);
      }

      // Divisória
      const divY = cY+82;
      ctx.strokeStyle='#e0e0e0'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(cX+18, divY); ctx.lineTo(cX+cW-18, divY); ctx.stroke();

      // Título
      const titleY = divY+58;
      ctx.fillStyle='#1a5c2a';
      ctx.font='bold italic 23px Arial,Helvetica,sans-serif';
      ctx.textAlign='center';
      ctx.fillText('FAÇA SUA AVALIAÇÃO', W/2, titleY);

      // Subtítulo
      ctx.fillStyle='#555555';
      ctx.font='13px Arial,Helvetica,sans-serif';
      ctx.fillText('Escaneie o QR code com', W/2, titleY+36);
      ctx.font='bold 13px Arial,Helvetica,sans-serif';
      ctx.fillText('a câmera do seu celular', W/2, titleY+56);

      // QR Code
      const qrSize=210, qrPad=10, qrBR=12;
      const qrX=W/2-qrSize/2, qrY=titleY+80;
      ctx.save(); ctx.fillStyle='#fff'; ctx.strokeStyle='#e0e0e0'; ctx.lineWidth=1.5;
      rr(qrX-qrPad, qrY-qrPad, qrSize+qrPad*2, qrSize+qrPad*2, qrBR);
      ctx.fill(); ctx.stroke(); ctx.restore();

      await new Promise<void>(res => {
        const qi = new Image();
        qi.crossOrigin='anonymous';
        qi.onload=()=>{ ctx.drawImage(qi, qrX, qrY, qrSize, qrSize); res(); };
        qi.onerror=()=>res();
        qi.src=`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(printCardUrl)}&ecc=H&margin=2`;
      });

      // Estrelas
      const starsY = qrY+qrSize+qrPad*2+34;
      ctx.fillStyle='#F5C518';
      ctx.font='30px Arial,Helvetica,sans-serif';
      ctx.textAlign='center';
      ctx.fillText('★★★★★', W/2, starsY);

      // 6. RODAPÉ HelloGrowth (fora do card)
      const fY=H-24;
      ctx.font='bold 24px Arial,Helvetica,sans-serif';
      ctx.textAlign='left';
      const hW=ctx.measureText('Hello').width, gW=ctx.measureText('Growth').width;
      const fX=W/2-(hW+gW)/2;
      ctx.fillStyle='#b8f060'; ctx.fillText('Hello', fX, fY);
      ctx.fillStyle='#ffffff'; ctx.fillText('Growth', fX+hW, fY);

      setPrintCardPreview(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error('Erro ao gerar card:', err);
    } finally {
      setPrintCardGenerating(false);
    }
  };

  const downloadPrintCard = () => {
    if (!printCardPreview) return;
    const a = document.createElement('a');
    a.href = printCardPreview;
    a.download = `card-avaliacao-${printCardName.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  // States antigos removidos - agora usa apenas NPSConsultant

  // Template Library State — novo design estilo catálogo
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Onboarding: abrir modais nativos quando sinalizado pelo wizard
  // Só abre se o sinal for truthy (número > 0) e não houver campanhas criadas
  useEffect(() => {
    if (onboardingOpenTemplates && campaigns.length === 0) {
      setShowTemplateModal(true);
      loadTemplates();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingOpenTemplates]);
  useEffect(() => {
    if (onboardingOpenAI && campaigns.length === 0) { setManualMode(false); setEditingCampaign(null); setShowNPSConsultant(true); }
  }, [onboardingOpenAI]);
  useEffect(() => {
    if (onboardingOpenManual && campaigns.length === 0) { setManualMode(true); setEditingCampaign(null); setShowNPSConsultant(true); }
  }, [onboardingOpenManual]);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [templateSegments, setTemplateSegments] = useState<string[]>([]);
  const [activeTemplateSegment, setActiveTemplateSegment] = useState<string>('Todos');
  const [templateSearch, setTemplateSearch] = useState('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isUsingTemplate, setIsUsingTemplate] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  const SEGMENT_ICONS: Record<string, string> = {
    'Todos': '📋', 'Clínica Odontológica': '🦷', 'Clínica de Estética': '💆', 'Restaurante / Alimentação': '🍽️',
    'Academia / Fitness': '💪', 'Clínica de Saúde / Médica': '🏥', 'Salão de Beleza / Barbearia': '✂️',
    'Escola / Educação': '🎓', 'Varejo / Loja': '🛍️', 'Imobiliária / Construção': '🏠',
    'Tecnologia / Software': '💻', 'Pet Shop / Veterinária': '🐾', 'Automóveis / Oficina': '🚗',
    'Geral': '📝',
  };

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch('/api/templates?tipoVenda=pos_venda');
      const data = await res.json();
      const tmps = data.templates || [];
      setAllTemplates(tmps);
      const segs = ['Todos', ...Array.from(new Set(tmps.map((t: any) => t.ramo_negocio || t.segment || 'Geral').filter(Boolean))) as string[]];
      setTemplateSegments(segs);
      // Detectar segmento do cliente pelo businessProfile
      if (businessProfile?.business_type) {
        const bt = businessProfile.business_type.toLowerCase();
        const match = segs.find(s => s !== 'Todos' && bt.includes(s.toLowerCase().split('/')[0].trim().toLowerCase()));
        if (match) setActiveTemplateSegment(match);
      }
    } finally { setIsLoadingTemplates(false); }
  };

  const openTemplateModal = () => {
    setShowTemplateModal(true);
    loadTemplates();
  };

  const useTemplate = async (templateId: string, templateName: string) => {
    if (!tenantId) return;
    setIsUsingTemplate(templateId);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, tenantId, campaignName: `${templateName} (cópia)` }),
      });
      const data = await res.json();
      if (data.campaign) {
        setTemplateSuccess(templateId);
        setTimeout(() => {
          setTemplateSuccess(null);
          setShowTemplateModal(false);
          onSaveCampaign(data.campaign);
        }, 1500);
      }
    } finally { setIsUsingTemplate(null); }
  };

  // UI State
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Stats for Mini Dashboard
  const activeCampaigns = campaigns.filter(c => c.status === 'Ativa' || c.status === 'active').length;
  const totalResponses = campaigns.reduce((acc, curr) => acc + (curr.responses || 0), 0);
  const avgNps = campaigns.length > 0 
      ? Math.round(campaigns.reduce((acc, curr) => acc + curr.npsScore, 0) / campaigns.length) 
      : 0;


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Funções antigas do editor removidas - agora usa apenas NPSConsultant

  const closeMassSend = () => setIsMassSendOpen(false);

  const handleOpenQr = (id: string, name: string) => {
    const link = getSurveyLink(id);
    setCurrentQrUrl(link);
    setCurrentQrName(name);
    setQrModalOpen(true);
  };







  const handleCopyLink = (id: string) => {
    const link = getSurveyLink(id);
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEdit = (camp: Campaign) => {
    setEditingCampaign(camp);
    setShowNPSConsultant(true);
    setMenuOpenId(null);
  };

  const toggleStatus = (id: string) => {
    const camp = campaigns.find(c => c.id === id);
    if (camp) {
        const currentIsActive = camp.status === 'Ativa' || camp.status === 'active';
        onSaveCampaign({ ...camp, status: currentIsActive ? 'Pausada' : 'Ativa' });
    }
    setMenuOpenId(null);
  };

  const handleDelete = (id: string) => {
    onDeleteCampaign(id);
    setMenuOpenId(null);
  };

  // Editor antigo removido - agora usa apenas NPSConsultant

  // List View
  return (
    <div className="p-8 min-h-screen bg-gray-50 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Campanhas</h1>
          <p className="text-gray-500">Gerencie seus links de pesquisa NPS e feedback</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsMassSendOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 font-medium relative">
                <Send size={18} /> Disparo em Massa
                <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full font-semibold">NOVO</span>
            </button>
            <button onClick={() => { setManualMode(true); setEditingCampaign(null); setShowNPSConsultant(true); }} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 font-medium">
                <Edit size={18} /> Criar manualmente
            </button>
            <button onClick={openTemplateModal} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 font-medium">
                <BookOpen size={18} /> Usar Template
            </button>
            <button onClick={() => { setManualMode(false); setShowNPSConsultant(true); }} className="px-4 py-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg flex items-center gap-2 hover:shadow-lg transition-all font-medium">
                <Sparkles size={18} /> Nova Campanha com IA
            </button>
        </div>
      </div>

       {/* Mini Dashboard */}
       <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Check size={24}/></div>
                 <div>
                     <p className="text-sm text-gray-500 font-medium">Campanhas Ativas</p>
                     <h3 className="text-2xl font-bold text-gray-800">{activeCampaigns}</h3>
                 </div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                 <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Star size={24}/></div>
                 <div>
                     <p className="text-sm text-gray-500 font-medium">Score Médio</p>
                     <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-gray-800">{avgNps}</h3>
                        <span className="text-xs text-gray-400">({totalResponses} respostas)</span>
                     </div>
                 </div>
             </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((camp) => (
          <div key={camp.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${(camp.status === 'Pausada' || camp.status === 'paused') ? 'opacity-75' : ''}`}>
             <div className="p-5">
                <div className="flex justify-between items-start mb-4 relative">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg mb-1">{camp.name}</h3>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${(camp.status === 'Ativa' || camp.status === 'active') ? 'text-green-600 bg-green-50 border-green-100' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>{getStatusLabel(camp.status)}</span>
                      {camp.offer_prize && <span className="text-xs px-2 py-0.5 rounded-full border border-purple-100 text-purple-600 bg-purple-50 flex items-center gap-1"><Gift size={10} /> Game Ativo</span>}
                      {!camp.offer_prize && <span className="text-xs px-2 py-0.5 rounded-full border border-gray-100 text-gray-400 bg-gray-50 flex items-center gap-1">Sem Game</span>}
                      {camp.enableRedirection && <span className="text-xs px-2 py-0.5 rounded-full border border-blue-100 text-blue-600 bg-blue-50 flex items-center gap-1"><ExternalLink size={10} /> Redirecionamento</span>}
                    </div>
                  </div>
                  <button onClick={() => setMenuOpenId(menuOpenId === camp.id ? null : camp.id)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50"><MoreVertical size={20} /></button>
                  {menuOpenId === camp.id && (
                    <div ref={menuRef} className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-100 w-40 z-10 py-1">
                      <button onClick={() => handleEdit(camp)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit size={14} /> Editar</button>
                      <button onClick={() => toggleStatus(camp.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">{(camp.status === 'Ativa' || camp.status === 'active') ? <Pause size={14} /> : <Play size={14} />} {(camp.status === 'Ativa' || camp.status === 'active') ? 'Pausar' : 'Ativar'}</button>
                      <button onClick={() => handleDelete(camp.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Excluir</button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center"><span className="block text-2xl font-bold text-gray-900">{camp.npsScore}</span><span className="text-xs text-gray-500 uppercase font-semibold">Score</span></div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center"><span className="block text-2xl font-bold text-gray-900">{camp.responses}</span><span className="text-xs text-gray-500 uppercase font-semibold">Respostas</span></div>
                </div>
                {camp.questions && camp.questions.length > 0 && <p className="text-xs text-gray-400 mt-3 text-center">+ {camp.questions.length} perguntas personalizadas</p>}
             </div>
             <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                <button onClick={() => handleCopyLink(camp.id)} className={`text-sm font-medium flex items-center gap-2 transition-colors ${copiedId === camp.id ? 'text-green-600' : 'text-gray-600 hover:text-primary-600'}`}>{copiedId === camp.id ? <Check size={16} /> : <Share2 size={16} />} {copiedId === camp.id ? 'Copiado!' : 'Copiar Link'}</button>
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleOpenQr(camp.id, camp.name)} 
                        className="text-sm text-gray-500 hover:text-primary-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        title="QR Code"
                    >
                        <QrCode size={16} />
                    </button>
                    <button 
                        onClick={() => openPrintCard(getSurveyLink(camp.id), camp.name)} 
                        className="text-sm text-gray-500 hover:text-emerald-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
                        title="Card para impressão"
                    >
                        <FileText size={16} />
                    </button>
                    <button onClick={() => onPreview && onPreview(camp.id)} className="text-sm text-gray-500 font-medium hover:text-primary-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors" title="Visualizar"><Eye size={16} /></button>
                    <button onClick={() => onViewReport ? onViewReport(camp.id) : navigateToAnalytics()} className="text-sm text-primary-600 font-medium hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50 transition-colors">Ver Relatório</button>
                </div>
             </div>
          </div>
        ))}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 min-h-[200px] hover:border-gray-400 transition-all">
            <Plus size={32} className="text-gray-400" />
            <span className="font-medium text-gray-400">Criar nova campanha</span>
            <div className="flex flex-col gap-2 w-full mt-1">
              <button 
                onClick={() => { setManualMode(false); setEditingCampaign(null); setShowNPSConsultant(true); }}
                className="w-full px-3 py-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all text-sm font-medium"
              >
                <Sparkles size={15} /> Com IA
              </button>
              <button 
                onClick={() => { setManualMode(true); setEditingCampaign(null); setShowNPSConsultant(true); }}
                className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-all text-sm font-medium"
              >
                <Edit size={15} /> Manualmente
              </button>
              <button 
                onClick={openTemplateModal}
                className="w-full px-3 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all text-sm font-medium"
              >
                <BookOpen size={15} /> Usar Template
              </button>
            </div>
        </div>
      </div>

      {/* Mass Send Modal */}
      {isMassSendOpen && (
        <MassDispatchModal
          campaigns={campaigns}
          tenantId={tenantId || ''}
          onClose={closeMassSend}
        />
      )}

      {/* QR Code Modal */}
      {qrModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center relative animate-in zoom-in-95">
                    <button 
                        onClick={() => setQrModalOpen(false)} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
                    >
                        <X size={20}/>
                    </button>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">QR Code da Pesquisa</h3>
                    <p className="text-sm text-gray-500 mb-6 truncate px-4">{currentQrName}</p>
                    
                    <div className="bg-white p-2 border border-gray-200 rounded-xl inline-block mb-6 shadow-sm">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentQrUrl)}`} 
                            alt="QR Code" 
                            className="w-48 h-48"
                        />
                    </div>
                    
                    <div className="flex justify-center">
                        <a 
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentQrUrl)}`} 
                            download="qrcode.png" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm transition-colors"
                        >
                            <Download size={18}/> Baixar Imagem
                        </a>
                    </div>
                </div>
            </div>
       )}

      {/* Modal Card para Impressão */}
      {printCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <FileText size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Card para Impressão</h3>
                  <p className="text-xs text-gray-500 truncate max-w-xs">{printCardName}</p>
                </div>
              </div>
              <button onClick={() => { setPrintCardOpen(false); if (printCardPreview) URL.revokeObjectURL(printCardPreview); }} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-0">
              {/* Painel esquerdo: configurações */}
              <div className="w-72 shrink-0 border-r border-slate-200 p-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Layout</p>
                  <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-3 flex items-center gap-2">
                    <div className="w-8 h-11 rounded bg-emerald-600 flex items-center justify-center shrink-0">
                      <QrCode size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">HelloGrowth Padrão</p>
                      <p className="text-[10px] text-gray-500">Verde · QR Code · Estrelas</p>
                    </div>
                    <Check size={14} className="ml-auto text-emerald-600" />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Logo da empresa <span className="font-normal text-gray-400">(opcional)</span></p>
                  {printCardLogo ? (
                    <div className="relative">
                      <img src={printCardLogo} alt="Logo" className="w-full h-24 object-contain rounded-lg border border-slate-200 bg-slate-50 p-2" />
                      <button
                        onClick={() => setPrintCardLogo(null)}
                        className="absolute top-1 right-1 p-1 bg-white rounded-full shadow border border-slate-200 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-all">
                      <Upload size={20} className="text-slate-400" />
                      <span className="text-xs text-slate-500">Clique para enviar logo</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG, SVG</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>

                <button
                  onClick={generatePrintCard}
                  disabled={printCardGenerating}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  {printCardGenerating ? (
                    <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                  ) : (
                    <><Sparkles size={16} /> Gerar Card</>
                  )}
                </button>

                {printCardPreview && (
                  <button
                    onClick={downloadPrintCard}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    <Download size={16} /> Baixar PNG
                  </button>
                )}

                <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                  Imagem em alta resolução (A4) pronta para impressão. Recomendamos imprimir em papel fosco.
                </p>
              </div>

              {/* Painel direito: preview */}
              <div className="flex-1 bg-slate-100 flex items-center justify-center p-6 min-h-[420px]">
                {printCardPreview ? (
                  <img
                    src={printCardPreview}
                    alt="Preview do card"
                    className="max-h-[500px] max-w-full rounded-xl shadow-xl object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center">
                      <FileText size={36} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Preview do card</p>
                      <p className="text-xs text-gray-400 mt-1">Adicione a logo e clique em<br/>"Gerar Card" para visualizar</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Library Modal — novo design estilo catálogo */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <BookOpen size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Templates de Pesquisa NPS</h3>
                  <p className="text-xs text-gray-500">Escolha por segmento e crie sua campanha em segundos</p>
                </div>
              </div>
              <button onClick={() => { setShowTemplateModal(false); setTemplateSearch(''); }} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"><X size={16} /></button>
            </div>
            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar segmentos */}
              <div className="w-64 border-r border-slate-100 bg-slate-50 overflow-y-auto shrink-0 py-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 mb-2">Segmentos</p>
                {isLoadingTemplates ? (
                  <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
                ) : templateSegments.map(seg => {
                  const count = seg === 'Todos' ? allTemplates.length : allTemplates.filter(t => (t.ramo_negocio || t.segment || 'Geral') === seg).length;
                  const isActive = activeTemplateSegment === seg;
                  const isClientSeg = businessProfile?.business_type && seg !== 'Todos' && businessProfile.business_type.toLowerCase().includes(seg.toLowerCase().split('/')[0].trim().toLowerCase());
                  return (
                    <button key={seg} onClick={() => setActiveTemplateSegment(seg)}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all ${
                        isActive ? 'bg-white border-r-[3px] border-emerald-500 text-emerald-700' : 'text-slate-600 hover:bg-white/70'
                      }`}>
                      <span className="text-xl shrink-0">{SEGMENT_ICONS[seg] || '📋'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-semibold truncate ${isActive ? 'text-emerald-700' : ''}`}>{seg}</span>
                          {isClientSeg && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">Seu</span>}
                        </div>
                        {count > 0 && <span className="text-[11px] text-slate-400">{count} template{count !== 1 ? 's' : ''}</span>}
                      </div>
                      {count > 0 && <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                      }`}>{count}</span>}
                    </button>
                  );
                })}
              </div>
              {/* Conteúdo */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Barra de busca */}
                <div className="px-5 py-3 border-b border-slate-100 shrink-0">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Buscar template..." value={templateSearch} onChange={e => setTemplateSearch(e.target.value)}
                      className="w-full text-sm pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors" />
                  </div>
                </div>
                {/* Lista de templates */}
                <div className="flex-1 overflow-y-auto p-5">
                  {isLoadingTemplates ? (
                    <div className="flex items-center justify-center h-full"><Loader2 size={28} className="animate-spin text-emerald-500" /></div>
                  ) : (() => {
                    const filtered = allTemplates.filter(t => {
                      const seg = t.ramo_negocio || t.segment || 'Geral';
                      const matchSeg = activeTemplateSegment === 'Todos' || seg === activeTemplateSegment;
                      const matchSearch = !templateSearch || t.name?.toLowerCase().includes(templateSearch.toLowerCase()) || t.description?.toLowerCase().includes(templateSearch.toLowerCase());
                      return matchSeg && matchSearch;
                    });
                    if (filtered.length === 0) return (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <BookOpen size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">Nenhum template neste segmento</p>
                        <p className="text-xs mt-1">Tente outro segmento ou peça ao administrador para publicar templates.</p>
                      </div>
                    );
                    return (
                      <div className="grid grid-cols-1 gap-4">
                        {filtered.map(template => (
                          <div key={template.id} className={`border-2 rounded-2xl p-5 transition-all hover:shadow-md ${
                            templateSuccess === template.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 bg-white'
                          }`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <span className="text-sm font-bold text-gray-900">{template.name}</span>
                                  {template.ramo_negocio && (
                                    <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">{template.ramo_negocio}</span>
                                  )}
                                  {template.category && template.category !== 'Geral' && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{template.category}</span>
                                  )}
                                </div>
                                {template.description && (
                                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">{template.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs">
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <HelpCircle size={11} className="text-slate-400" />
                                    <span className="font-medium text-slate-700">{template.questions?.length || 0}</span> perguntas
                                  </span>
                                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                                    <Star size={11} className="fill-amber-400 text-amber-400" />
                                    {template.use_count || 0} uso{(template.use_count || 0) !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {/* Preview das perguntas */}
                                {previewTemplateId === template.id && (template.questions || []).length > 0 && (
                                  <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Perguntas do template</span>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                      {(template.questions || []).map((q: any, idx: number) => (
                                        <div key={q.id || idx} className="px-4 py-3 flex items-start gap-3">
                                          <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-800 leading-snug">{q.text}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                                                {q.type === 'scale' ? 'Escala 0–10' : q.type === 'single' ? 'Múltipla escolha' : q.type === 'text' ? 'Texto livre' : q.type}
                                              </span>
                                              {q.required && <span className="text-[10px] text-red-400 font-medium">Obrigatória</span>}
                                            </div>
                                            {(q.options || []).length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1.5">
                                                {q.options.map((opt: string) => (
                                                  <span key={opt} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">{opt}</span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {(template.tags || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-3">
                                    {template.tags.map((tag: string) => (
                                      <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2 shrink-0">
                                <button
                                  onClick={() => setPreviewTemplateId(previewTemplateId === template.id ? null : template.id)}
                                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                                >
                                  {previewTemplateId === template.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  {previewTemplateId === template.id ? 'Ocultar' : 'Ver perguntas'}
                                </button>
                                <button
                                  onClick={() => useTemplate(template.id, template.name)}
                                  disabled={!!isUsingTemplate}
                                  className={`flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm ${
                                    templateSuccess === template.id
                                      ? 'bg-emerald-500 text-white shadow-emerald-200'
                                      : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white disabled:opacity-50'
                                  }`}
                                >
                                  {isUsingTemplate === template.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : templateSuccess === template.id ? (
                                    <Check size={14} />
                                  ) : (
                                    <Plus size={14} />
                                  )}
                                  {templateSuccess === template.id ? 'Criado!' : 'Usar Template'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NPS Consultant Modal */}
      {showNPSConsultant && (
        <NPSConsultant
          supabase={supabase}
          userId={currentUser?.id || ''}
          initialBusinessProfile={businessProfile}
          onClose={() => {
            setShowNPSConsultant(false);
            setEditingCampaign(null);
            setManualMode(false);
          }}
          onSaveCampaign={(campaignData) => {
            onSaveCampaign(campaignData);
            setShowNPSConsultant(false);
            setEditingCampaign(null);
            setManualMode(false);
          }}
          existingCampaign={editingCampaign}
          startInManualMode={manualMode}
        />
      )}
    </div>
  );
};
export default NPSCampaigns;;