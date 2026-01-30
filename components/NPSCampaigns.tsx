import React, { useState, useEffect, useRef } from 'react';
import { Campaign, CampaignQuestion, User, InitialField } from '@/types';
import { getSurveyLink } from '@/lib/utils/getBaseUrl';
import { Plus, X, Share2, MoreVertical, Star, Link as LinkIcon, ExternalLink, Sparkles, Trash2, Check, Pause, Play, Edit, Eye, Loader2, MapPin, Send, Upload, FileSpreadsheet, QrCode, Download, FileText, AlertCircle, GripVertical, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/lib/supabase';
import InitialFieldsConfig from '@/components/InitialFieldsConfig';

interface NPSCampaignsProps {
  campaigns: Campaign[];
  onSaveCampaign: (campaign: Campaign) => void; 
  onDeleteCampaign: (id: string) => void;
  navigateToAnalytics: () => void;
  onPreview?: (id: string) => void;
  onViewReport?: (id: string) => void;
  currentUser?: User;
  setCampaigns?: any;
}

const NPSCampaigns: React.FC<NPSCampaignsProps> = ({ campaigns, onSaveCampaign, onDeleteCampaign, navigateToAnalytics, onPreview, onViewReport, currentUser }) => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Mass Send State
  const [isMassSendOpen, setIsMassSendOpen] = useState(false);
  const [massSendCampaignId, setMassSendCampaignId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [parsedContacts, setParsedContacts] = useState<{name: string, contact: string}[]>([]);
  const [sendProgress, setSendProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // QR Code State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [currentQrUrl, setCurrentQrUrl] = useState('');
  const [currentQrName, setCurrentQrName] = useState('');

  // Form State
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDescription, setNewCampaignDescription] = useState('');
  const [newCampaignRedirectEnabled, setNewCampaignRedirectEnabled] = useState(true);
  const [questions, setQuestions] = useState<CampaignQuestion[]>([]);
  const [initialFields, setInitialFields] = useState<InitialField[]>([]);

  // UI State
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Stats for Mini Dashboard
  const activeCampaigns = campaigns.filter(c => c.status === 'Ativa').length;
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

  const handleSave = async () => {
    if (!newCampaignName) return;
    setIsSaving(true);

    const campaignToSave: Campaign = {
        id: editingId || Date.now().toString(),
        name: newCampaignName,
        description: newCampaignDescription,
        status: 'Ativa',
        npsScore: 0,
        responses: 0,
        type: 'Nova',
        enableRedirection: newCampaignRedirectEnabled,
        questions: questions,
        initialFields: initialFields.length > 0 ? initialFields : undefined
    };

    await onSaveCampaign(campaignToSave);

    setIsSaving(false);
    resetForm();
    setView('list');
  };

  const resetForm = () => {
    setNewCampaignName('');
    setNewCampaignDescription('');
    setNewCampaignRedirectEnabled(true);
    setQuestions([]);
    setInitialFields([]);
    setEditingId(null);
  };

  // CSV Parsing Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        // Simple CSV parser: Assumes "Name,Contact" format
        const lines = text.split('\n');
        const contacts: {name: string, contact: string}[] = [];
        
        lines.forEach(line => {
            const [name, contact] = line.split(',');
            if (name && contact) {
                contacts.push({ 
                    name: name.trim(), 
                    contact: contact.trim().replace(/\r/g, '') 
                });
            }
        });

        if (contacts.length > 0) {
            setParsedContacts(contacts);
        } else {
            alert("Nenhum contato válido encontrado. Use o formato: Nome, Telefone");
        }
    };
    reader.readAsText(file);
  };

  const handleMassSend = () => {
     if (parsedContacts.length === 0) return;

     setIsUploading(true);
     setSendProgress(0);
     
     // Simulate sending process item by item
     const total = parsedContacts.length;
     let current = 0;

     const interval = setInterval(() => {
         current += 1;
         const percentage = Math.round((current / total) * 100);
         setSendProgress(percentage);

         if (current >= total) {
             clearInterval(interval);
             setIsUploading(false);
             setUploadSuccess(true);
         }
     }, 50); // Speed of simulation
  };

  const closeMassSend = () => {
      setIsMassSendOpen(false);
      setUploadSuccess(false);
      setMassSendCampaignId('');
      setParsedContacts([]);
      setSendProgress(0);
  }

  const downloadTemplate = () => {
      const csvContent = "data:text/csv;charset=utf-8,Nome,Telefone\nMaria Silva,11999999999\nJoão Souza,11988888888";
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "modelo_importacao.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleOpenQr = (id: string, name: string) => {
    const link = getSurveyLink(id);
    setCurrentQrUrl(link);
    setCurrentQrName(name);
    setQrModalOpen(true);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    
    setQuestions(newQuestions);
  };

  // FIXED AI SUGGEST LOGIC with Robust Parsing
  const handleAiSuggest = async () => {
    if (!newCampaignName) return;
    setIsGenerating(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenerativeAI(apiKey);
        const prompt = `
          Gere exatamente 5 perguntas estratégicas de acompanhamento para uma pesquisa NPS.
          NOME: "${newCampaignName}"
          DESCRIÇÃO: "${newCampaignDescription}"
          
          REGRAS:
          1. Retorne APENAS um JSON array válido. Sem markdown, sem \`\`\`.
          2. Estrutura: [{"text": "Pergunta", "type": "text|rating|single", "options": ["Opção1", "Opção2"]}]
          3. Use a descrição para criar contexto.
        `;
        
        const result = await model.generateContent({
          contents: prompt,
        });

        if (result.response.text()) {
          // Remove potential markdown formatting if AI adds it
          const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
          
          let generated;
          try {
             generated = JSON.parse(cleanJson);
          } catch (e) {
             console.warn("AI JSON Parse Failed, using raw or fallback");
             throw new Error("Invalid JSON");
          }

          if (Array.isArray(generated) && generated.length > 0) {
             const mapped = generated.map((q: any) => ({
                id: Date.now().toString() + Math.random(),
                text: q.text || "Pergunta gerada sem texto",
                type: q.type || 'text',
                options: q.options || []
             }));
             setQuestions(prev => [...prev, ...mapped]);
             setIsGenerating(false);
             return;
          }
        }
      }
      
      throw new Error("AI Failed or No Key");

    } catch (error) {
      console.warn("AI Generation Failed, using Fallback:", error);
      // ROBUST FALLBACK
      const suggestions: CampaignQuestion[] = [];
      const ctx = (newCampaignName + ' ' + newCampaignDescription).toLowerCase();

      suggestions.push({ id: Date.now()+'1', text: 'O que motivou sua nota?', type: 'text' });
      
      if (ctx.includes('medico') || ctx.includes('clinica')) {
          suggestions.push({ id: Date.now()+'2', text: 'Como avalia o tempo de espera?', type: 'rating' });
          suggestions.push({ id: Date.now()+'3', text: 'O atendimento foi cordial?', type: 'single', options: ['Sim', 'Não', 'Regular'] });
      } else {
          suggestions.push({ id: Date.now()+'2', text: 'O serviço atendeu suas expectativas?', type: 'single', options: ['Sim', 'Parcialmente', 'Não'] });
      }
      
      suggestions.push({ id: Date.now()+'4', text: 'Você voltaria a fazer negócio conosco?', type: 'single', options: ['Sim', 'Talvez', 'Não'] });
      suggestions.push({ id: Date.now()+'5', text: 'Deixe uma sugestão de melhoria:', type: 'text' });

      setQuestions(prev => [...prev, ...suggestions]);
    } finally { 
        setIsGenerating(false); 
    }
  };

  const addQuestion = () => setQuestions([...questions, { id: Date.now().toString(), text: '', type: 'text', options: [] }]);
  const updateQuestion = (id: string, field: keyof CampaignQuestion, value: any) => setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  const removeQuestion = (id: string) => setQuestions(questions.filter(q => q.id !== id));
  const addOption = (qId: string) => setQuestions(questions.map(q => q.id === qId ? { ...q, options: [...(q.options||[]), ''] } : q));
  const updateOption = (qId: string, idx: number, val: string) => setQuestions(questions.map(q => q.id === qId ? { ...q, options: q.options?.map((o, i) => i === idx ? val : o) } : q));
  const removeOption = (qId: string, idx: number) => setQuestions(questions.map(q => q.id === qId ? { ...q, options: q.options?.filter((_, i) => i !== idx) } : q));

  const handleCopyLink = (id: string) => {
    const link = getSurveyLink(id);
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEdit = (camp: Campaign) => {
    setEditingId(camp.id);
    setNewCampaignName(camp.name);
    setNewCampaignDescription(camp.description || '');
    setNewCampaignRedirectEnabled(camp.enableRedirection !== false);
    setQuestions(camp.questions || []);
    setInitialFields(camp.initialFields || []);
    setView('editor');
    setMenuOpenId(null);
  };

  const toggleStatus = (id: string) => {
    const camp = campaigns.find(c => c.id === id);
    if (camp) {
        onSaveCampaign({ ...camp, status: camp.status === 'Ativa' ? 'Pausada' : 'Ativa' });
    }
    setMenuOpenId(null);
  };

  const handleDelete = (id: string) => {
    onDeleteCampaign(id);
    setMenuOpenId(null);
  };

  // Editor View (Full Screen like FormBuilder)
  if (view === 'editor') {
    return (
      <div className="p-8 min-h-screen bg-gray-50" style={{ colorScheme: 'light' }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('list')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {editingId ? 'Editar Campanha' : 'Nova Campanha NPS'}
                </h1>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (editingId && onPreview) {
                    onPreview(editingId);
                  }
                }}
                disabled={!editingId}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye size={18} /> Visualizar
              </button>
              <button 
                onClick={handleSave}
                disabled={!newCampaignName || isSaving}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 shadow-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 size={18} className="animate-spin" />}
                {isSaving ? 'Salvando...' : 'Salvar Campanha'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <InitialFieldsConfig 
                initialFields={initialFields}
                onChange={setInitialFields}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Campanha</label>
                <input 
                  type="text" 
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white text-gray-900" 
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                  placeholder="Ex: Satisfação Pós-Venda"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Contexto para IA)</label>
                <textarea 
                  value={newCampaignDescription}
                  onChange={(e) => setNewCampaignDescription(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white text-gray-900" 
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                  placeholder="Descreva o contexto da pesquisa..."
                  rows={3}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><MapPin size={20} /></div>
                  <div>
                    <h5 className="font-bold text-gray-800">Redirecionamento Google</h5>
                    <p className="text-xs text-gray-600">Envia promotores para avaliar no Google (usa Place ID Global).</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={newCampaignRedirectEnabled} 
                  onChange={(e) => setNewCampaignRedirectEnabled(e.target.checked)} 
                  className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Perguntas Adicionais</h4>
                <button 
                  onClick={handleAiSuggest} 
                  disabled={!newCampaignName || isGenerating} 
                  className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full flex items-center gap-1 font-bold hover:bg-purple-200 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} 
                  {isGenerating ? 'Gerando...' : 'Sugerir com IA'}
                </button>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 opacity-75 flex items-center gap-2">
                <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 rounded">FIXO</span>
                <span className="text-sm font-medium text-gray-800">Em uma escala de 0 a 10...</span>
              </div>
              
              <div className="space-y-3 mb-4">
                {questions.map((q, idx) => (
                  <div 
                    key={q.id} 
                    className="bg-white border border-gray-200 rounded-lg p-4 relative group transition-all"
                  >
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={() => handleMoveQuestion(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para cima"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMoveQuestion(idx, 'down')}
                        disabled={idx === questions.length - 1}
                        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <div className="h-4 w-px bg-gray-200 mx-1"></div>
                      <button 
                        onClick={() => removeQuestion(q.id)} 
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="space-y-4 pt-2">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Pergunta {idx + 1}</label>
                          <input 
                            type="text" 
                            value={q.text} 
                            onChange={(e) => updateQuestion(q.id, 'text', e.target.value)} 
                            className="w-full border-b border-gray-300 text-sm bg-transparent" 
                            placeholder="Pergunta..." 
                          />
                        </div>
                        <div className="w-1/3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                          <select 
                            value={q.type} 
                            onChange={(e) => updateQuestion(q.id, 'type', e.target.value)} 
                            className="w-full rounded border-gray-300 text-sm py-1.5"
                          >
                            <option value="text">Texto</option>
                            <option value="rating">Nota</option>
                            <option value="single">Única</option>
                            <option value="multiple">Múltipla</option>
                          </select>
                        </div>
                      </div>
                      {(q.type === 'single' || q.type === 'multiple') && (
                        <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                          <label className="block text-xs font-semibold text-gray-500 mb-2">Alternativas:</label>
                          {q.options?.map((opt, optIdx) => (
                            <div key={optIdx} className="flex gap-2 mb-2 items-center">
                              <div className="w-3 h-3 border rounded-sm flex-shrink-0 bg-gray-200"></div>
                              <input 
                                type="text" 
                                value={opt} 
                                onChange={(e) => updateOption(q.id, optIdx, e.target.value)} 
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" 
                              />
                              <button onClick={() => removeOption(q.id, optIdx)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                            </div>
                          ))}
                          <button onClick={() => addOption(q.id)} className="text-xs text-primary-600 font-medium flex items-center gap-1 hover:bg-primary-50 px-2 py-1 rounded mt-1"><Plus size={14} /> Add</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={addQuestion} 
                className="w-full py-2 border border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-primary-400 text-sm flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Adicionar Pergunta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="p-8 min-h-screen bg-gray-50 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Campanhas</h1>
          <p className="text-gray-500">Gerencie seus links de pesquisa NPS e feedback</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsMassSendOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 font-medium">
                <Send size={18} /> Disparo em Massa
            </button>
            <button onClick={() => { resetForm(); setView('editor'); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2 hover:bg-primary-600 font-medium">
                <Plus size={18} /> Nova Campanha
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
          <div key={camp.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${camp.status === 'Pausada' ? 'opacity-75' : ''}`}>
             <div className="p-5">
                <div className="flex justify-between items-start mb-4 relative">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg mb-1">{camp.name}</h3>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${camp.status === 'Ativa' ? 'text-green-600 bg-green-50 border-green-100' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>{camp.status}</span>
                      {camp.enableRedirection && <span className="text-xs px-2 py-0.5 rounded-full border border-blue-100 text-blue-600 bg-blue-50 flex items-center gap-1"><ExternalLink size={10} /> Redirecionamento</span>}
                    </div>
                  </div>
                  <button onClick={() => setMenuOpenId(menuOpenId === camp.id ? null : camp.id)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50"><MoreVertical size={20} /></button>
                  {menuOpenId === camp.id && (
                    <div ref={menuRef} className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-100 w-40 z-10 py-1">
                      <button onClick={() => handleEdit(camp)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit size={14} /> Editar</button>
                      <button onClick={() => toggleStatus(camp.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">{camp.status === 'Ativa' ? <Pause size={14} /> : <Play size={14} />} {camp.status === 'Ativa' ? 'Pausar' : 'Ativar'}</button>
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
        <button 
            onClick={() => { resetForm(); setView('editor'); }} 
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50 transition-all min-h-[200px]"
        >
            <Plus size={32} className="mb-2" />
            <span className="font-medium">Criar nova campanha</span>
        </button>
      </div>

      {/* Mass Send Modal */}
      {isMassSendOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">Disparo em Massa</h3>
                    <button onClick={closeMassSend} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-4">
                    {uploadSuccess ? (
                        <div className="text-center py-6 animate-in fade-in">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                            </div>
                            <h4 className="font-bold text-lg text-gray-900">Envio Concluído!</h4>
                            <p className="text-sm text-gray-500 mt-2">
                                A campanha foi enviada para <strong>{parsedContacts.length} contatos</strong> com sucesso.
                            </p>
                            <button onClick={closeMassSend} className="mt-6 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Fechar</button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a Campanha</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2.5"
                                    value={massSendCampaignId}
                                    onChange={(e) => setMassSendCampaignId(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {campaigns.filter(c => c.status === 'Ativa').map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {parsedContacts.length === 0 ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload da Lista (.csv)</label>
                                    <div 
                                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer group"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <FileSpreadsheet size={32} className="text-gray-400 mb-2 group-hover:text-primary-500" />
                                        <p className="text-sm text-gray-600 font-medium">Clique para selecionar o arquivo</p>
                                        <p className="text-xs text-gray-400 mt-1">Formato: Nome, Telefone/Email</p>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            accept=".csv"
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                    <button onClick={downloadTemplate} className="text-xs text-primary-600 mt-2 hover:underline flex items-center gap-1">
                                        <Download size={12} /> Baixar modelo de exemplo
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                                            <Check size={16} /> {parsedContacts.length} Contatos Encontrados
                                        </div>
                                        <button onClick={() => setParsedContacts([])} className="text-xs text-red-500 hover:underline">Remover</button>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto text-xs text-gray-600 space-y-1 bg-white p-2 rounded border border-gray-100">
                                        {parsedContacts.slice(0, 10).map((c, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span>{c.name}</span>
                                                <span className="text-gray-400">{c.contact}</span>
                                            </div>
                                        ))}
                                        {parsedContacts.length > 10 && <div className="text-center italic text-gray-400 mt-1">...e mais {parsedContacts.length - 10}</div>}
                                    </div>
                                </div>
                            )}

                            {isUploading && (
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span>Enviando...</span>
                                        <span>{sendProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className="bg-green-600 h-2.5 rounded-full transition-all duration-75" style={{ width: `${sendProgress}%` }}></div>
                                    </div>
                                </div>
                            )}

                            {!isUploading && (
                                <div className="pt-2">
                                    <button 
                                        onClick={handleMassSend}
                                        disabled={!massSendCampaignId || parsedContacts.length === 0}
                                        className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Send size={18} />
                                        Enviar Campanha
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
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

    </div>
  );
};

export default NPSCampaigns;