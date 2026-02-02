
import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

interface Product {
  id: string;
  user_id: string;
  name: string;
  value: number;
  ai_description: string | null;
  ai_persona: string | null;
  ai_strategy: string | null;
  created_at: string;
}

interface ProductsManagementProps {
  supabase: SupabaseClient | null;
  userId: string;
}

const parseJsonField = (field: any): any => {
  if (!field) return null;
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch {
    return field;
  }
};

const formatPersona = (persona: any): string => {
  if (!persona) return '';
  if (typeof persona === 'string') return persona;
  const parts: string[] = [];
  if (persona.demographics) {
    if (persona.demographics.age) parts.push(`Idade: ${persona.demographics.age}`);
    if (persona.demographics.gender) parts.push(`Gênero: ${persona.demographics.gender}`);
    if (persona.demographics.income) parts.push(`Renda: ${persona.demographics.income}`);
    if (persona.demographics.location) parts.push(`Localização: ${persona.demographics.location}`);
  }
  if (persona.behavioral) {
    if (persona.behavioral.lifestyle) parts.push(`Estilo de vida: ${persona.behavioral.lifestyle}`);
    if (persona.behavioral.spending_habits) parts.push(`Hábitos de consumo: ${persona.behavioral.spending_habits}`);
  }
  return parts.join(' • ');
};

const formatStrategy = (strategy: any): string => {
  if (!strategy) return '';
  if (typeof strategy === 'string') return strategy;
  const parts: string[] = [];
  if (strategy.approach) parts.push(`Abordagem: ${strategy.approach}`);
  if (strategy.emotional_triggers && Array.isArray(strategy.emotional_triggers)) {
    parts.push(`Gatilhos: ${strategy.emotional_triggers.join(', ')}`);
  }
  if (strategy.objections && Array.isArray(strategy.objections)) {
    parts.push(`Objeções: ${strategy.objections.join(', ')}`);
  }
  if (strategy.closing) parts.push(`Fechamento: ${strategy.closing}`);
  return parts.join(' • ');
};

const ProductsManagement: React.FC<ProductsManagementProps> = ({ supabase, userId }) => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (supabase && userId) {
      fetchProducts();
    }
  }, [supabase, userId]);

  const fetchProducts = async () => {
    if (!supabase || !userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('user_id', userId)
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

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const generateAIInsights = async (productId: string, productName: string, productValue: number) => {
    setGeneratingAI(productId);
    try {
      const prompt = `Você é um consultor de vendas especializado. Analise este produto/serviço e gere insights estratégicos:

Produto: ${productName}
Valor: R$ ${productValue.toFixed(2)}

Responda EXATAMENTE neste formato JSON (sem markdown, apenas JSON puro):
{
  "description": "Uma descrição comercial atraente do produto em 2-3 frases",
  "persona": "Perfil detalhado do cliente ideal para este produto (características demográficas, comportamentais e psicográficas)",
  "strategy": "Estratégia de venda: gatilhos emocionais, objeções comuns e como superá-las, melhor abordagem de fechamento"
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
        .from("products_services")
        .update({
          ai_description: insights.description,
          ai_persona: insights.persona,
          ai_strategy: insights.strategy,
        })
        .eq("id", productId);

      if (error) throw error;

      const updatedProduct = {
        ai_description: insights.description,
        ai_persona: insights.persona,
        ai_strategy: insights.strategy,
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
          user_id: userId,
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
      const { error } = await supabase.from("products_services").delete().eq("id", productId);
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
      const productsToInsert = importData.map((item) => ({ user_id: userId, name: item.name, value: item.value }));
      const { data, error } = await supabase.from("products_services").insert(productsToInsert).select();
      if (error) throw error;
      setProducts((prev) => [...(data || []), ...prev]);
      setImportData([]);
      setShowImportModal(false);
      showNotification("success", `${data?.length || 0} produtos importados!`);
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

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-colors shadow-lg shadow-emerald-500/25">
          <Plus size={18} />
          Novo Produto
        </button>
      </div>

      {importError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          {importError}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input type="text" placeholder="Buscar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-slate-800 group-hover:text-emerald-600 transition-colors">{product.name}</h3>
                  <p className="text-2xl font-bold text-emerald-600">
                    R$ {(typeof product.value === 'number' ? product.value : parseFloat(String(product.value)) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEditingProduct(product)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {product.ai_description ? (
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-500" />
                    Insights disponíveis
                  </span>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); generateAIInsights(product.id, product.name, product.value); }} disabled={generatingAI === product.id} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50">
                  {generatingAI === product.id ? (<><Loader2 className="animate-spin" size={18} />Gerando...</>) : (<><Sparkles size={18} />Gerar Insights com IA</>)}
                </button>
              )}
            </div>
          ))}
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
                    <div className="flex items-center gap-2 mb-3">
                      <Eye size={18} className="text-slate-600" />
                      <h3 className="font-semibold text-slate-800">Descrição Comercial</h3>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{String(selectedProduct.ai_description || '')}</p>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={18} className="text-blue-600" />
                      <h3 className="font-semibold text-blue-800">Cliente Ideal</h3>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      {formatPersona(parseJsonField(selectedProduct.ai_persona)) || String(selectedProduct.ai_persona || '')}
                    </p>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare size={18} className="text-amber-600" />
                      <h3 className="font-semibold text-amber-800">Estratégia de Venda</h3>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      {formatStrategy(parseJsonField(selectedProduct.ai_strategy)) || String(selectedProduct.ai_strategy || '')}
                    </p>
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
