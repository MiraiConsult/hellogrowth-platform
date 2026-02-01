// ProductsManagement.tsx - Gestão de Produtos e Serviços com Importação XLSX
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
  Filter,
  MoreVertical,
  Eye,
  Target,
  MessageSquare
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

const ProductsManagement: React.FC<ProductsManagementProps> = ({ supabase, userId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
    if (!supabase) return;
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
        // Tenta fazer parse do JSON da resposta
        const cleanResponse = data.response
          .replace(/```json\n?|\n?```/g, "")
          .trim();
        insights = JSON.parse(cleanResponse);
      } catch {
        throw new Error("Resposta da IA inválida");
      }

      // Atualiza no banco de dados
      const { error } = await supabase!
        .from("products_services")
        .update({
          ai_description: insights.description,
          ai_persona: insights.persona,
          ai_strategy: insights.strategy,
        })
        .eq("id", productId);

      if (error) throw error;

      // Atualiza estado local
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                ai_description: insights.description,
                ai_persona: insights.persona,
                ai_strategy: insights.strategy,
              }
            : p
        )
      );

      showNotification("success", "Insights gerados com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar insights:", error);
      showNotification("error", "Erro ao gerar insights da IA");
    } finally {
      setGeneratingAI(null);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.value || !supabase) return;

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

      // Gera insights automaticamente
      if (data) {
        generateAIInsights(data.id, data.name, data.value);
      }
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      showNotification("error", "Erro ao adicionar produto");
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
        .update({
          name: editingProduct.name,
          value: editingProduct.value,
        })
        .eq("id", editingProduct.id);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? editingProduct : p))
      );
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
    if (!supabase || !confirm("Tem certeza que deseja excluir este produto?"))
      return;

    try {
      const { error } = await supabase
        .from("products_services")
        .delete()
        .eq("id", productId);

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

        // Valida estrutura
        if (jsonData.length === 0) {
          setImportError("A planilha está vazia");
          return;
        }

        const firstRow = jsonData[0] as any;
        const hasName =
          "nome" in firstRow ||
          "Nome" in firstRow ||
          "name" in firstRow ||
          "Name" in firstRow ||
          "produto" in firstRow ||
          "Produto" in firstRow;
        const hasValue =
          "valor" in firstRow ||
          "Valor" in firstRow ||
          "value" in firstRow ||
          "Value" in firstRow ||
          "preco" in firstRow ||
          "Preco" in firstRow ||
          "preço" in firstRow ||
          "Preço" in firstRow;

        if (!hasName || !hasValue) {
          setImportError(
            'A planilha deve conter colunas "Nome" e "Valor" (ou variações como "Produto", "Preço")'
          );
          return;
        }

        // Normaliza dados
        const normalizedData = jsonData
          .map((row: any) => ({
            name:
              row.nome ||
              row.Nome ||
              row.name ||
              row.Name ||
              row.produto ||
              row.Produto,
            value: parseFloat(
              String(
                row.valor ||
                  row.Valor ||
                  row.value ||
                  row.Value ||
                  row.preco ||
                  row.Preco ||
                  row.preço ||
                  row.Preço ||
                  0
              ).replace(",", ".")
            ),
          }))
          .filter((item) => item.name && !isNaN(item.value));

        setImportData(normalizedData);
        setShowImportModal(true);
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        setImportError(
          "Erro ao processar o arquivo. Verifique se é um arquivo Excel válido."
        );
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportConfirm = async () => {
    if (!supabase || importData.length === 0) return;

    setSaving(true);
    try {
      const productsToInsert = importData.map((item) => ({
        user_id: userId,
        name: item.name,
        value: item.value,
      }));

      const { data, error } = await supabase
        .from("products_services")
        .insert(productsToInsert)
        .select();

      if (error) throw error;

      setProducts((prev) => [...(data || []), ...prev]);
      setShowImportModal(false);
      setImportData([]);
      showNotification(
        "success",
        `${data?.length || 0} produtos importados com sucesso!`
      );

      // Gera insights para cada produto importado
      if (data) {
        for (const product of data) {
          await generateAIInsights(product.id, product.name, product.value);
        }
      }
    } catch (error) {
      console.error("Erro ao importar produtos:", error);
      showNotification("error", "Erro ao importar produtos");
    } finally {
      setSaving(false);
    }
  };

  const handleExportTemplate = () => {
    const template = [
      { Nome: "Exemplo de Produto 1", Valor: 100.0 },
      { Nome: "Exemplo de Serviço 2", Valor: 250.5 },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "template_produtos_hellogrowth.xlsx");
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Package className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Produtos e Serviços
              </h1>
              <p className="text-slate-500 text-sm">
                Gerencie seu catálogo e deixe a IA criar estratégias de venda
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportTemplate}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Baixar Template</span>
            </button>
            <label className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all cursor-pointer">
              <Upload size={18} />
              <span className="hidden sm:inline">Importar Excel</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Novo Produto</span>
            </button>
          </div>
        </div>

        {importError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <span>{importError}</span>
            <button onClick={() => setImportError(null)} className="ml-auto">
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Package className="mx-auto text-slate-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-slate-600 mb-2">
            Nenhum produto cadastrado
          </h3>
          <p className="text-slate-400 mb-6">
            Comece adicionando seus produtos ou importe uma planilha
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all"
          >
            <Plus size={20} />
            Adicionar Primeiro Produto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-slate-800 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-2xl font-bold text-emerald-600">
                      R${" "}
                      {product.value.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {product.ai_description ? (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Descrição (IA)
                      </h4>
                      <p className="text-sm text-slate-600">
                        {product.ai_description}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Perfil do Cliente (IA)
                      </h4>
                      <p className="text-sm text-slate-600">
                        {product.ai_persona}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Estratégia de Venda (IA)
                      </h4>
                      <p className="text-sm text-slate-600">
                        {product.ai_strategy}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <button
                      onClick={() =>
                        generateAIInsights(
                          product.id,
                          product.name,
                          product.value
                        )
                      }
                      disabled={generatingAI === product.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-md transition-all"
                    >
                      {generatingAI === product.id ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Sparkles size={18} />
                      )}
                      Gerar Insights com IA
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingProduct) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingProduct ? "Editar Produto" : "Adicionar Novo Produto"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X />
              </button>
            </div>
            <div className="space-y-4 mb-8">
              <input
                type="text"
                placeholder="Nome do Produto/Serviço"
                value={editingProduct ? editingProduct.name : newProduct.name}
                onChange={(e) =>
                  editingProduct
                    ? setEditingProduct({ ...editingProduct, name: e.target.value })
                    : setNewProduct({ ...newProduct, name: e.target.value })
                }
                className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg"
              />
              <input
                type="text"
                placeholder="Valor (Ex: 1200,00)"
                value={editingProduct ? editingProduct.value : newProduct.value}
                onChange={(e) =>
                  editingProduct
                    ? setEditingProduct({
                        ...editingProduct,
                        value: parseFloat(e.target.value.replace(",", ".") || "0"),
                      })
                    : setNewProduct({ ...newProduct, value: e.target.value })
                }
                className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg"
              />
            </div>
            <button
              onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Save size={20} /> {editingProduct ? "Salvar Alterações" : "Salvar Produto"}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Confirmar Importação
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X />
              </button>
            </div>
            <p className="text-slate-500 mb-4">
              Encontramos {importData.length} produtos para importar. A IA irá gerar
              insights para cada um após a importação.
            </p>
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-4 mb-6">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="p-2 text-sm font-semibold text-slate-600">
                      Nome
                    </th>
                    <th className="p-2 text-sm font-semibold text-slate-600">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((item, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">
                        R${" "}
                        {item.value.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleImportConfirm}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <CheckCircle size={20} /> Confirmar e Importar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div
          className={`fixed bottom-8 right-8 p-4 rounded-xl shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-bottom-4 ${
            notification.type === "success"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
              : "bg-gradient-to-r from-red-500 to-pink-500"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle size={24} />
          ) : (
            <AlertCircle size={24} />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default ProductsManagement;
