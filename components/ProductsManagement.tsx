import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { 
  Package, 
  Plus, 
  Upload, 
  Download, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
  Eye,
  Target,
  MessageSquare,
  ChevronRight,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  ShieldAlert
} from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

interface Product {
  id: string;
  user_id: string;
  name: string;
  value: number;
  ai_description: string | null;
  ai_criteria: string | null;
  created_at: string;
  tenant_id?: string;
}

interface ProductsManagementProps {
  supabase: SupabaseClient | null;
  userId: string;
  // Onboarding: abrir modais nativos diretamente
  onboardingOpenCatalog?: number;
  onboardingOpenAI?: number;
  onboardingOpenManual?: number;
  onProductsCreated?: () => void;
}

const ProductsManagement: React.FC<ProductsManagementProps> = ({ supabase, userId, onboardingOpenCatalog, onboardingOpenAI, onboardingOpenManual, onProductsCreated }) => {
  const tenantId = useTenantId()

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', value: '' });
  const [importData, setImportData] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingField, setEditingField] = useState<{ productId: string; field: 'description' | 'criteria' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Visão grade ou lista
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('products_view_mode') as 'grid' | 'list') || 'grid';
    }
    return 'grid';
  });

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('products_view_mode', mode);
    }
  };

  // Onboarding por catálogo
  const [showCatalogOnboarding, setShowCatalogOnboarding] = useState(false);
  const [catalogData, setCatalogData] = useState<any>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState<{name: string; value: string; selected: boolean; description?: string}[]>([]);
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [allSegments, setAllSegments] = useState<any[]>([]);
  const [detectedSegment, setDetectedSegment] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  // Multi-segmento: mapa de segmento -> itens selecionados
  const [multiSegmentSelections, setMultiSegmentSelections] = useState<Record<string, {name: string; value: string; selected: boolean; description?: string}[]>>({});

  // Geração em massa de descrições
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // Seleção e exclusão em massa
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const toggleSelectProduct = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // toggleSelectAll usa filteredProducts que é definido no render — usa ref para evitar stale closure
  const filteredProductsRef = useRef<Product[]>([]);
  const toggleSelectAll = useCallback(() => {
    const fp = filteredProductsRef.current;
    setSelectedIds(prev => prev.size === fp.length ? new Set() : new Set(fp.map(p => p.id)));
  }, []);

  const exitBulkMode = useCallback(() => {
    setBulkSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    if (!supabase || selectedIds.size === 0) return;
    setDeletingBulk(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('products_services')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
      showNotification('success', `${ids.length} produto${ids.length !== 1 ? 's' : ''} excluído${ids.length !== 1 ? 's' : ''} com sucesso!`);
      setSelectedIds(new Set());
      setBulkSelectMode(false);
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Erro ao excluir em massa:', error);
      showNotification('error', 'Erro ao excluir produtos');
    } finally {
      setDeletingBulk(false);
    }
  };

  useEffect(() => {
    if (supabase && userId && tenantId) {
      fetchProducts();
    }
  }, [supabase, userId, tenantId]);

  // Onboarding: abrir modais nativos quando sinalizado pelo wizard
  // Só abre se não houver produtos já cadastrados
  useEffect(() => {
    if (onboardingOpenCatalog && products.length === 0) { fetchCatalogForBusiness(); }
  }, [onboardingOpenCatalog]);

  useEffect(() => {
    if (onboardingOpenManual && products.length === 0) { setShowAddModal(true); }
  }, [onboardingOpenManual]);

  const fetchProducts = async () => {
    if (!supabase || !userId || !tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      showNotification('error', 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  // Busca todos os segmentos e detecta o do cliente
  const fetchCatalogForBusiness = async () => {
    if (!supabase || !tenantId) return;
    setCatalogLoading(true);
    try {
      // Buscar business_type do perfil
      const { data: profile } = await supabase
        .from('business_profile')
        .select('business_type')
        .eq('tenant_id', tenantId)
        .single();

      const businessType = profile?.business_type?.toLowerCase() || '';

      // Mapeamento de palavras-chave para segmentos
      const segmentMap: Record<string, string> = {
        'odontol': 'odontologia', 'dent': 'odontologia', 'dental': 'odontologia',
        'estétic': 'estetica', 'estetica': 'estetica', 'derma': 'estetica', 'beleza': 'estetica',
        'restaur': 'restaurante', 'aliment': 'restaurante', 'lanche': 'restaurante', 'café': 'restaurante',
        'academ': 'academia', 'fitness': 'academia', 'gym': 'academia', 'personal': 'academia',
        'saúde': 'saude', 'clínica': 'saude', 'médic': 'saude', 'fisio': 'saude',
        'salão': 'salao', 'barbearia': 'salao', 'cabeleir': 'salao',
        'escola': 'educacao', 'educa': 'educacao', 'curso': 'educacao',
        'varejo': 'varejo', 'loja': 'varejo', 'comércio': 'varejo',
        'imobil': 'imoveis', 'imóvel': 'imoveis', 'constru': 'imoveis',
        'tecnolog': 'tecnologia', 'software': 'tecnologia', 'ti ': 'tecnologia',
        'pet': 'pets', 'veterinár': 'pets', 'animal': 'pets',
        'auto': 'automoveis', 'oficina': 'automoveis', 'mecân': 'automoveis', 'carro': 'automoveis',
      };

      let detected = '';
      for (const [keyword, segment] of Object.entries(segmentMap)) {
        if (businessType.includes(keyword)) { detected = segment; break; }
      }

      // Buscar todos os segmentos disponíveis
      const allRes = await fetch('/api/product-catalog');
      const allData = await allRes.json();
      const segments = Array.isArray(allData) ? allData : [];
      setAllSegments(segments);
      setDetectedSegment(detected);

      // Carregar o segmento detectado (ou o primeiro se não detectado)
      const segmentToLoad = detected || (segments[0]?.segment || '');
      if (segmentToLoad) {
        await loadSegmentProducts(segmentToLoad);
      }
      setShowCatalogOnboarding(true);
    } catch (e) {
      console.error(e);
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadSegmentProducts = async (segment: string) => {
    setSelectedSegment(segment);
    setCatalogLoading(true);
    try {
      const res = await fetch(`/api/product-catalog?segment=${segment}`);
      const data = await res.json();
      if (data && data.products) {
        setCatalogData(data);
        // Se já há seleções salvas para este segmento, restaurar; senão inicializar
        if (multiSegmentSelections[segment]) {
          setCatalogItems(multiSegmentSelections[segment]);
        } else {
          const items = data.products.map((p: any) => ({
            name: p.name,
            // Suporta campo 'value' direto, 'value_suggested', ou média de value_min/value_max
            value: p.value
              ? String(p.value)
              : p.value_suggested
                ? String(p.value_suggested)
                : (p.value_min != null && p.value_max != null)
                  ? String(Math.round((p.value_min + p.value_max) / 2))
                  : '',
            selected: false, // começa desmarcado em outros segmentos
            description: p.description || ''
          }));
          setCatalogItems(items);
        }
      }
    } finally {
      setCatalogLoading(false);
    }
  };

  // Salva o estado atual dos itens no mapa multi-segmento
  const saveCurrentSegmentSelections = (items: typeof catalogItems) => {
    if (!selectedSegment) return;
    setMultiSegmentSelections(prev => ({ ...prev, [selectedSegment]: items }));
  };

  // Conta total de produtos selecionados em todos os segmentos
  const totalSelectedCount = () => {
    // Itens do segmento atual (ainda não salvos no mapa)
    const currentSelected = catalogItems.filter(i => i.selected).length;
    // Itens dos outros segmentos já salvos
    const otherSelected = Object.entries(multiSegmentSelections)
      .filter(([seg]) => seg !== selectedSegment)
      .reduce((acc, [, items]) => acc + items.filter(i => i.selected).length, 0);
    return currentSelected + otherSelected;
  };

  // Retorna todos os itens selecionados de todos os segmentos
  const getAllSelectedItems = () => {
    const allItems: {name: string; value: string}[] = [];
    // Itens do segmento atual
    catalogItems.filter(i => i.selected && i.name.trim()).forEach(i => allItems.push(i));
    // Itens dos outros segmentos
    Object.entries(multiSegmentSelections)
      .filter(([seg]) => seg !== selectedSegment)
      .forEach(([, items]) => items.filter(i => i.selected && i.name.trim()).forEach(i => allItems.push(i)));
    return allItems;
  };

  // Geração em massa de descrições IA para todos os produtos sem descrição
  const generateBulkDescriptions = async () => {
    const withoutDesc = products.filter(p => !p.ai_description);
    if (!withoutDesc.length) {
      showNotification('success', 'Todos os produtos já têm descrição gerada!');
      return;
    }
    setGeneratingBulk(true);
    setBulkProgress({ current: 0, total: withoutDesc.length });
    let successCount = 0;
    for (let i = 0; i < withoutDesc.length; i++) {
      const product = withoutDesc[i];
      setBulkProgress({ current: i + 1, total: withoutDesc.length });
      try {
        await generateAIInsights(product.id, product.name, product.value);
        successCount++;
      } catch (e) {
        console.error(`Erro ao gerar para ${product.name}:`, e);
      }
      // Delay para não sobrecarregar a API
      if (i < withoutDesc.length - 1) await new Promise(r => setTimeout(r, 800));
    }
    setGeneratingBulk(false);
    setBulkProgress({ current: 0, total: 0 });
    showNotification('success', `${successCount} descrições geradas com sucesso!`);
  };

  const importCatalogProducts = async () => {
    // Salvar estado atual antes de importar
    saveCurrentSegmentSelections(catalogItems);
    const allSelected = getAllSelectedItems();
    if (!allSelected.length || !supabase || !userId || !tenantId) return;
    setImportingCatalog(true);
    try {
      const toInsert = allSelected.map(p => ({
        user_id: userId,
        tenant_id: tenantId,
        name: p.name,
        value: parseFloat(p.value) || 0
      }));
      await supabase.from('products_services').insert(toInsert);
      await fetchProducts();
      setShowCatalogOnboarding(false);
      setMultiSegmentSelections({});
      showNotification('success', `${allSelected.length} produtos importados com sucesso!`);
      // Sinalizar onboarding que produtos foram criados
      if (onProductsCreated) onProductsCreated();
    } finally {
      setImportingCatalog(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const generateAIInsights = async (productId: string, productName: string, productValue: number) => {
    setGeneratingAI(productId);
    try {
      // Fetch business profile to get context
      const { data: profileData, error: profileError } = await supabase!
        .from('business_profile')
        .select('company_name, business_type, business_description, target_audience, brand_tone, differentials')
        .eq('tenant_id', tenantId)
        .single();

      if (profileError) {
        console.warn('Perfil do negócio não encontrado, gerando sem contexto');
      }

      const businessContext = profileData ? `
Contexto do Negócio:
- Nome da Empresa: ${profileData.company_name || 'Não informado'}
- Tipo de Negócio: ${profileData.business_type || 'Não informado'}
- Descrição do Negócio: ${profileData.business_description || 'Não informado'}
- Público-Alvo: ${profileData.target_audience || 'Não informado'}
- Tom da Marca: ${profileData.brand_tone || 'Não informado'}
- Diferenciais: ${profileData.differentials || 'Não informado'}
` : '';

      const prompt = `Você é um especialista em marketing e vendas. Analise este produto/serviço considerando o contexto do negócio e gere dois textos distintos:
1. Uma descrição comercial atraente para o cliente final
2. Critérios técnicos de indicação para a IA usar ao sugerir este produto para leads
${businessContext}
Produto/Serviço: ${productName}
Valor: R$ ${productValue.toFixed(2)}
IMPORTANTE: Considere o tipo de negócio ao gerar os textos. Por exemplo:
- Se for uma pet shop, a "Limpeza Dentária" é para animais de estimação
- Se for uma clínica médica, a "Limpeza Dentária" é para humanos
- Se for um salão de beleza, "Corte" refere-se a cabelo
Responda EXATAMENTE neste formato JSON (sem markdown, apenas JSON puro):
{
  "description": "Uma descrição comercial atraente do produto/serviço em 2-3 frases, considerando o contexto do negócio e o público-alvo",
  "criteria": "Critérios técnicos objetivos para a IA sugerir este produto: quando indicar (perfil do lead, sinais de interesse, respostas que indicam necessidade), quando NÃO indicar, e qual problema/necessidade este produto resolve. Seja específico e objetivo, sem linguagem comercial."
}`;
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error("Erro na API");

      const data = await response.json();
      let insights;

      try {
        const cleanResponse = data.response.replace(/```json\n?|\n?```/g, "").trim();
        insights = JSON.parse(cleanResponse);
      } catch {
        throw new Error("Resposta da IA inválida");
      }
      const { error } = await supabase!
        .from('products_services')
        .update({
          ai_description: insights.description,
          ai_criteria: insights.criteria || null,
        })
        .eq('id', productId);
      if (error) throw error;
      const updatedProduct = {
        ai_description: insights.description,
        ai_criteria: insights.criteria || null,
      };
      setProducts((prev) =>
        prev.map((p) => p.id === productId ? { ...p, ...updatedProduct } : p)
      );
      if (selectedProduct && selectedProduct.id === productId) {
        setSelectedProduct({ ...selectedProduct, ...updatedProduct });
      }
      showNotification("success", "Insights gerados com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar insights:", error);
      showNotification("error", "Erro ao gerar insights da IA");
    } finally {
      setGeneratingAI(null);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.value || !supabase || !userId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("products_services")
        .insert({
          user_id: userId, tenant_id: tenantId,
          name: newProduct.name,
          value: parseFloat(newProduct.value.replace(",", ".")),
        })
        .select()
        .single();

      if (error) throw error;

      setProducts((prev) => [data, ...prev]);
      setNewProduct({ name: "", value: "" });
      setShowAddModal(false);
      showNotification("success", "Produto adicionado com sucesso!");
      // Sinalizar onboarding que produto foi criado
      if (onProductsCreated) onProductsCreated();

      if (data) {
        generateAIInsights(data.id, data.name, data.value);
      }
    } catch (error: any) {
      console.error("Erro ao adicionar produto:", error);
      showNotification("error", `Erro ao adicionar produto: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("products_services")
        .update({ name: editingProduct.name, value: editingProduct.value })
        .eq("id", editingProduct.id);

      if (error) throw error;

      setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? editingProduct : p)));
      setEditingProduct(null);
      showNotification("success", "Produto atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      showNotification("error", "Erro ao atualizar produto");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!supabase || !confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      const { error } = await supabase.from("products_services").update({ deleted_at: new Date().toISOString() }).eq("id", productId);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showNotification("success", "Produto excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      showNotification("error", "Erro ao excluir produto");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          setImportError("A planilha está vazia");
          return;
        }

        const firstRow = jsonData[0] as any;
        const hasName = "nome" in firstRow || "Nome" in firstRow || "name" in firstRow || "produto" in firstRow || "Produto" in firstRow;
        const hasValue = "valor" in firstRow || "Valor" in firstRow || "value" in firstRow || "preco" in firstRow || "Preco" in firstRow || "preço" in firstRow || "Preço" in firstRow;

        if (!hasName || !hasValue) {
          setImportError('A planilha deve conter colunas "Nome" e "Valor"');
          return;
        }

        const normalizedData = jsonData
          .map((row: any) => ({
            name: row.nome || row.Nome || row.name || row.produto || row.Produto,
            value: parseFloat(String(row.valor || row.Valor || row.value || row.preco || row.Preco || row.preço || row.Preço || 0).replace(",", ".")),
          }))
          .filter((item) => item.name && !isNaN(item.value));

        setImportData(normalizedData);
        setShowImportModal(true);
      } catch (error) {
        setImportError("Erro ao processar o arquivo.");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportConfirm = async () => {
    if (!supabase || importData.length === 0 || !userId) return;
    setSaving(true);
    try {
      const productsToInsert = importData.map((item) => ({ user_id: userId, tenant_id: tenantId, name: item.name, value: item.value }));
      const { data, error } = await supabase.from("products_services").insert(productsToInsert).select();
      if (error) throw error;
      setProducts((prev) => [...(data || []), ...prev]);
      setImportData([]);
      setShowImportModal(false);
      showNotification("success", `${data?.length || 0} produtos importados!`);
      // Sinalizar onboarding que produtos foram criados
      if (onProductsCreated && data && data.length > 0) onProductsCreated();
      if (data) {
        for (const product of data) {
          await generateAIInsights(product.id, product.name, product.value);
        }
      }
    } catch (error) {
      showNotification("error", "Erro ao importar produtos");
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const template = [{ Nome: "Exemplo Produto 1", Valor: 100.00 }, { Nome: "Exemplo Produto 2", Valor: 250.50 }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "template_produtos.xlsx");
  };

  const exportToExcel = () => {
    const exportData = filteredProducts.map((p) => ({
      Nome: p.name,
      Valor: p.value,
      'Descrição IA': p.ai_description || '',
      'Cadastrado em': p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 40 }, // Nome
      { wch: 15 }, // Valor
      { wch: 60 }, // Descrição IA
      { wch: 18 }, // Cadastrado em
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    const fileName = `produtos_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  filteredProductsRef.current = filteredProducts;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg">
            <Package className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Produtos e Serviços</h1>
            <p className="text-slate-500">Gerencie seu catálogo e deixe a IA criar estratégias de venda</p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          <Download size={18} />
          Baixar Template
        </button>
        <label className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
          <Upload size={18} />
          Importar Excel
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
        </label>
        {products.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
            title={`Exportar ${filteredProducts.length} produto(s) para Excel`}
          >
            <FileSpreadsheet size={18} />
            Exportar Excel
          </button>
        )}
        <button
          onClick={fetchCatalogForBusiness}
          disabled={catalogLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
        >
          {catalogLoading ? <Loader2 size={18} className="animate-spin" /> : <Package size={18} />}
          Catálogo do Segmento
        </button>
        {products.filter(p => !p.ai_description).length > 0 && (
          <button
            onClick={generateBulkDescriptions}
            disabled={generatingBulk}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors shadow-lg shadow-purple-500/25 disabled:opacity-60"
          >
            {generatingBulk ? (
              <><Loader2 size={18} className="animate-spin" />Gerando {bulkProgress.current}/{bulkProgress.total}...</>
            ) : (
              <><Sparkles size={18} />Gerar Descrições em Massa ({products.filter(p => !p.ai_description).length})</>
            )}
          </button>
        )}
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-colors shadow-lg shadow-emerald-500/25">
          <Plus size={18} />
          Novo Produto
        </button>
        {filteredProducts.length > 0 && (
          <button
            onClick={() => { setBulkSelectMode(v => !v); setSelectedIds(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
              bulkSelectMode
                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {bulkSelectMode ? <X size={18} /> : <CheckSquare size={18} />}
            {bulkSelectMode ? 'Cancelar Seleção' : 'Selecionar'}
          </button>
        )}
      </div>

      {/* Barra flutuante de ações em massa */}
      {bulkSelectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/40 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">
            {selectedIds.size} produto{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <div className="w-px h-5 bg-slate-600" />
          <button
            onClick={() => setShowBulkDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Trash2 size={15} />
            Excluir {selectedIds.size}
          </button>
          <button
            onClick={exitBulkMode}
            className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Bulk generation progress bar */}
      {generatingBulk && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">Gerando descrições com IA...</span>
            <span className="text-sm text-purple-600">{bulkProgress.current} de {bulkProgress.total}</span>
          </div>
          <div className="w-full bg-purple-100 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
              style={{ width: bulkProgress.total > 0 ? `${(bulkProgress.current / bulkProgress.total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {importError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          {importError}
        </div>
      )}

      {/* Search + View Toggle */}
      <div className="flex items-center gap-3 mb-6">
        {bulkSelectMode && (
          <button
            onClick={toggleSelectAll}
            title={selectedIds.size === filteredProducts.length ? 'Desmarcar todos' : 'Selecionar todos'}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            {selectedIds.size === filteredProducts.length && filteredProducts.length > 0
              ? <CheckSquare size={18} className="text-emerald-600" />
              : <Square size={18} className="text-slate-400" />}
            Todos
          </button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
        </div>
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => toggleViewMode('grid')}
            title="Visão em grade"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => toggleViewMode('list')}
            title="Visão em lista"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl">
          <Package className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-600 mb-2">Nenhum produto cadastrado</h3>
          <p className="text-slate-500 mb-4">Comece adicionando seus produtos e serviços</p>
          <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
            <Plus size={20} />
            Adicionar Primeiro Produto
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={(e) => bulkSelectMode ? toggleSelectProduct(product.id, e) : handleProductClick(product)}
              className={`bg-white rounded-2xl border-2 p-6 hover:shadow-lg transition-all cursor-pointer group ${
                bulkSelectMode && selectedIds.has(product.id)
                  ? 'border-emerald-400 bg-emerald-50/40 shadow-sm'
                  : 'border-slate-200 hover:border-emerald-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {bulkSelectMode && (
                    <div
                      onClick={(e) => toggleSelectProduct(product.id, e)}
                      className="mt-1 flex-shrink-0"
                    >
                      {selectedIds.has(product.id)
                        ? <CheckSquare size={20} className="text-emerald-500" />
                        : <Square size={20} className="text-slate-300 group-hover:text-slate-400" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-slate-800 group-hover:text-emerald-600 transition-colors truncate">{product.name}</h3>
                    <p className="text-2xl font-bold text-emerald-600">
                      R$ {(typeof product.value === 'number' ? product.value : parseFloat(String(product.value)) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                {!bulkSelectMode && (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEditingProduct(product)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
                )}
              </div>
              {product.ai_description ? (
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-500" />
                    {product.ai_criteria ? 'Insights + Critérios IA' : 'Insights disponíveis'}
                  </span>
                  <div className="flex items-center gap-2">
                    {!product.ai_criteria && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Critérios pendentes</span>
                    )}
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); generateAIInsights(product.id, product.name, product.value); }} disabled={generatingAI === product.id} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50">
                  {generatingAI === product.id ? (<><Loader2 className="animate-spin" size={18} />Gerando...</>) : (<><Sparkles size={18} />Gerar Insights com IA</>)}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Visão Lista */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {bulkSelectMode && (
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll}>
                      {selectedIds.size === filteredProducts.length && filteredProducts.length > 0
                        ? <CheckSquare size={16} className="text-emerald-600" />
                        : <Square size={16} className="text-slate-400" />}
                    </button>
                  </th>
                )}
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Produto / Serviço</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Valor</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Insights IA</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  onClick={(e) => bulkSelectMode ? toggleSelectProduct(product.id, e) : handleProductClick(product)}
                  className={`transition-colors cursor-pointer group ${
                    bulkSelectMode && selectedIds.has(product.id)
                      ? 'bg-emerald-50/60'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {bulkSelectMode && (
                    <td className="px-4 py-4" onClick={(e) => toggleSelectProduct(product.id, e)}>
                      {selectedIds.has(product.id)
                        ? <CheckSquare size={18} className="text-emerald-500" />
                        : <Square size={18} className="text-slate-300 group-hover:text-slate-400" />}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-emerald-600" />
                      </div>
                      <span className="font-medium text-slate-800 group-hover:text-emerald-600 transition-colors">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-emerald-600">
                      R$ {(typeof product.value === 'number' ? product.value : parseFloat(String(product.value)) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {product.ai_description ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                        <Sparkles size={12} />
                        Disponível
                      </span>
                    ) : (
                      <button
                        onClick={() => generateAIInsights(product.id, product.name, product.value)}
                        disabled={generatingAI === product.id}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 bg-slate-100 hover:bg-purple-50 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
                      >
                        {generatingAI === product.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {generatingAI === product.id ? 'Gerando...' : 'Gerar'}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
            <span className="text-xs text-slate-400">{filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedProduct.name}</h2>
                <p className="text-2xl font-bold text-emerald-600">
                  R$ {(typeof selectedProduct.value === 'number' ? selectedProduct.value : parseFloat(String(selectedProduct.value)) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {selectedProduct.ai_description ? (
                <>
                  <div className="bg-slate-50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Eye size={18} className="text-slate-600" />
                        <h3 className="font-semibold text-slate-800">Descrição Comercial</h3>
                      </div>
                      {editingField?.productId === selectedProduct.id && editingField?.field === 'description' ? (
                        <button
                          onClick={async () => {
                            try {
                              setSaving(true);
                              const { error } = await supabase!.from("products_services").update({ ai_description: selectedProduct.ai_description }).eq("id", selectedProduct.id);
                              if (error) throw error;
                              showNotification('success', 'Descrição salva com sucesso!');
                              setEditingField(null);
                              await fetchProducts(); // Recarregar produtos para sincronizar
                            } catch (error) {
                              console.error('Erro ao salvar descrição:', error);
                              showNotification('error', 'Erro ao salvar descrição');
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingField({ productId: selectedProduct.id, field: 'description' })}
                          className="flex items-center gap-1 px-3 py-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                        >
                          <Edit3 size={14} />
                          Editar
                        </button>
                      )}
                    </div>
                    {editingField?.productId === selectedProduct.id && editingField?.field === 'description' ? (
                      <textarea
                        value={String(selectedProduct.ai_description || '')}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, ai_description: e.target.value })}
                        className="w-full text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-slate-700 leading-relaxed">{String(selectedProduct.ai_description || '')}</p>
                    )}
                  </div>

                  {/* Critérios de Indicação (IA) */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Target size={18} className="text-blue-600" />
                        <h3 className="font-semibold text-slate-800">Critérios de Indicação (IA)</h3>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Uso Interno IA</span>
                      </div>
                      {editingField?.productId === selectedProduct.id && editingField?.field === 'criteria' ? (
                        <button
                          onClick={async () => {
                            try {
                              setSaving(true);
                              const { error } = await supabase!.from('products_services').update({ ai_criteria: selectedProduct.ai_criteria }).eq('id', selectedProduct.id);
                              if (error) throw error;
                              showNotification('success', 'Critérios salvos com sucesso!');
                              setEditingField(null);
                              await fetchProducts();
                            } catch (error) {
                              console.error('Erro ao salvar critérios:', error);
                              showNotification('error', 'Erro ao salvar critérios');
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingField({ productId: selectedProduct.id, field: 'criteria' })}
                          className="flex items-center gap-1 px-3 py-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                        >
                          <Edit3 size={14} />
                          Editar
                        </button>
                      )}
                    </div>
                    {selectedProduct.ai_criteria ? (
                      editingField?.productId === selectedProduct.id && editingField?.field === 'criteria' ? (
                        <textarea
                          value={String(selectedProduct.ai_criteria || '')}
                          onChange={(e) => setSelectedProduct({ ...selectedProduct, ai_criteria: e.target.value })}
                          className="w-full text-slate-700 leading-relaxed bg-white border border-blue-200 rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-slate-700 leading-relaxed text-sm">{String(selectedProduct.ai_criteria || '')}</p>
                      )
                    ) : (
                      <p className="text-slate-400 text-sm italic">Critérios não gerados. Clique em Regenerar Insights para gerar.</p>
                    )}
                    <p className="text-xs text-blue-500 mt-2">Este campo é lido pela IA para decidir quando sugerir este produto. Não é exibido ao cliente.</p>
                  </div>

                  <button onClick={() => generateAIInsights(selectedProduct.id, selectedProduct.name, selectedProduct.value)} disabled={generatingAI === selectedProduct.id} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-purple-200 text-purple-600 rounded-xl hover:bg-purple-50 transition-colors disabled:opacity-50">
                    {generatingAI === selectedProduct.id ? (<><Loader2 className="animate-spin" size={18} />Regenerando...</>) : (<><Sparkles size={18} />Regenerar Insights</>)}
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="mx-auto text-slate-300 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-slate-600 mb-2">Insights não gerados</h3>
                  <p className="text-slate-500 mb-4">Clique abaixo para gerar insights com IA</p>
                  <button onClick={() => generateAIInsights(selectedProduct.id, selectedProduct.name, selectedProduct.value)} disabled={generatingAI === selectedProduct.id} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50">
                    {generatingAI === selectedProduct.id ? (<><Loader2 className="animate-spin" size={18} />Gerando...</>) : (<><Sparkles size={18} />Gerar Insights com IA</>)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Adicionar Novo Produto</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto/Serviço</label>
                <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Ex: Botox, Consultoria..." className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                <input type="text" value={newProduct.value} onChange={(e) => setNewProduct({ ...newProduct, value: e.target.value })} placeholder="Ex: 1000 ou 1000,00" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button onClick={handleAddProduct} disabled={saving || !newProduct.name || !newProduct.value} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl disabled:opacity-50">
                {saving ? (<><Loader2 className="animate-spin" size={18} />Salvando...</>) : (<><Save size={18} />Salvar Produto</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Editar Produto</h2>
              <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto/Serviço</label>
                <input type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                <input type="number" value={editingProduct.value} onChange={(e) => setEditingProduct({ ...editingProduct, value: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditingProduct(null)} className="flex-1 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50">Cancelar</button>
                <button onClick={handleUpdateProduct} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Confirmar Importação</h2>
              <button onClick={() => { setShowImportModal(false); setImportData([]); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <p className="text-slate-600 mb-4">{importData.length} produtos encontrados. Confirme para importar:</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nome</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-800">{item.name}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importData.length > 10 && <div className="px-4 py-3 bg-slate-50 text-center text-sm text-slate-500">... e mais {importData.length - 10} produtos</div>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowImportModal(false); setImportData([]); }} className="flex-1 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={handleImportConfirm} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl disabled:opacity-50">
                {saving ? (<><Loader2 className="animate-spin" size={18} />Importando...</>) : (<><FileSpreadsheet size={18} />Confirmar Importação</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Onboarding Modal - Premium Layout */}
      {showCatalogOnboarding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl shadow">
                  <Package className="text-white" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Catálogo de Produtos</h2>
                  <p className="text-sm text-slate-500">Escolha o segmento e selecione os produtos para importar</p>
                </div>
              </div>
              <button onClick={() => setShowCatalogOnboarding(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Body: sidebar + content */}
            <div className="flex flex-1 overflow-hidden">

              {/* Sidebar de segmentos */}
              <div className="w-64 flex-shrink-0 border-r border-slate-100 overflow-y-auto bg-slate-50/50 py-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 mb-4">Segmentos</p>
                {allSegments.map((seg: any) => {
                  const isDetected = seg.segment === detectedSegment;
                  const isActive = seg.segment === selectedSegment;
                  // Conta selecionados neste segmento
                  const segItems = seg.segment === selectedSegment
                    ? catalogItems
                    : (multiSegmentSelections[seg.segment] || []);
                  const segCount = segItems.filter(i => i.selected).length;
                  return (
                    <button
                      key={seg.segment}
                      onClick={() => {
                        // Salvar estado atual antes de trocar
                        saveCurrentSegmentSelections(catalogItems);
                        loadSegmentProducts(seg.segment);
                      }}
                      disabled={catalogLoading}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all ${
                        isActive
                          ? 'bg-white border-r-[3px] border-emerald-500 text-emerald-700 shadow-sm'
                          : 'hover:bg-white text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{seg.segment_icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold block truncate">{seg.segment_label}</span>
                        {isDetected && (
                          <span className="text-xs text-emerald-600 font-semibold">✦ Seu segmento</span>
                        )}
                      </div>
                      {segCount > 0 && (
                        <span className="flex-shrink-0 min-w-[22px] h-[22px] bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                          {segCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Conteúdo: lista de produtos do segmento */}
              <div className="flex-1 overflow-y-auto">
                {catalogLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="animate-spin text-emerald-500 mx-auto mb-3" size={32} />
                      <p className="text-slate-500 text-sm">Carregando produtos...</p>
                    </div>
                  </div>
                ) : catalogData ? (
                  <div className="p-6">
                    {/* Cabeçalho do segmento */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{catalogData.segment_icon}</span>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">{catalogData.segment_label}</h3>
                          <p className="text-sm text-slate-500">{catalogItems.length} produtos disponíveis</p>
                        </div>
                        {detectedSegment === selectedSegment && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Seu segmento</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCatalogItems(catalogItems.map(i => ({ ...i, selected: true })))}
                          className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => setCatalogItems(catalogItems.map(i => ({ ...i, selected: false })))}
                          className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                        >
                          Nenhum
                        </button>
                      </div>
                    </div>

                    {/* Grid de produtos */}
                    <div className="grid grid-cols-1 gap-3">
                      {catalogItems.map((item, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            const updated = [...catalogItems];
                            updated[i] = { ...updated[i], selected: !updated[i].selected };
                            setCatalogItems(updated);
                          }}
                          className={`group flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            item.selected
                              ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm'
                              : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                          }`}
                        >
                          {/* Checkbox visual */}
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            item.selected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-emerald-300'
                          }`}>
                            {item.selected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {/* Nome editável */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.name}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const updated = [...catalogItems];
                                updated[i] = { ...updated[i], name: e.target.value };
                                setCatalogItems(updated);
                              }}
                              className="font-semibold text-slate-800 bg-transparent border-none outline-none w-full text-sm focus:bg-white focus:px-2 focus:rounded-lg transition-all"
                            />
                            {item.description && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>
                            )}
                          </div>

                          {/* Preço editável */}
                          <div
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
                              item.selected ? 'bg-white border-emerald-200' : 'bg-slate-50 border-slate-200'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-xs font-medium text-slate-400">R$</span>
                            <input
                              type="number"
                              value={item.value}
                              onChange={(e) => {
                                const updated = [...catalogItems];
                                updated[i] = { ...updated[i], value: e.target.value };
                                setCatalogItems(updated);
                              }}
                              className="w-20 text-right text-sm font-bold text-emerald-700 bg-transparent border-none outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
              <div className="text-sm">
                {totalSelectedCount() > 0 ? (
                  <div>
                    <span className="font-bold text-slate-800 text-base">{totalSelectedCount()}</span>
                    <span className="text-slate-500"> produto{totalSelectedCount() !== 1 ? 's' : ''} selecionado{totalSelectedCount() !== 1 ? 's' : ''}</span>
                    {Object.values(multiSegmentSelections).some(items => items.some(i => i.selected)) && (
                      <span className="ml-2 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                        de múltiplos segmentos
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">Nenhum produto selecionado ainda</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCatalogOnboarding(false); setMultiSegmentSelections({}); }}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={importCatalogProducts}
                  disabled={importingCatalog || totalSelectedCount() === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 shadow-lg shadow-emerald-500/25 transition-all"
                >
                  {importingCatalog ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Importar {totalSelectedCount()} produto{totalSelectedCount() !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão em Massa */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <ShieldAlert size={24} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Confirmar Exclusão</h2>
                <p className="text-sm text-slate-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-slate-700 mb-6">
              Você está prestes a excluir permanentemente{' '}
              <strong className="text-red-600">{selectedIds.size} produto{selectedIds.size !== 1 ? 's' : ''}</strong>.
              Deseja continuar?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={deletingBulk}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deletingBulk}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
              >
                {deletingBulk
                  ? <><Loader2 className="animate-spin" size={18} />Excluindo...</>
                  : <><Trash2 size={18} />Excluir {selectedIds.size}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg z-50 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default ProductsManagement;
