import React, { useState, useEffect, useRef } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { Campaign, CampaignQuestion, User, InitialField } from '@/types';
import { getSurveyLink } from '@/lib/utils/getBaseUrl';
import { Plus, X, Share2, MoreVertical, Star, Link as LinkIcon, ExternalLink, Sparkles, Trash2, Check, Pause, Play, Edit, Eye, Loader2, MapPin, Send, Upload, FileSpreadsheet, QrCode, Download, FileText, AlertCircle, GripVertical, ArrowUp, ArrowDown, ArrowLeft, Gift } from 'lucide-react';
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
}

const NPSCampaigns: React.FC<NPSCampaignsProps> = ({ campaigns, onSaveCampaign, onDeleteCampaign, navigateToAnalytics, onPreview, onViewReport, currentUser, businessProfile }) => {
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

  // States antigos removidos - agora usa apenas NPSConsultant

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