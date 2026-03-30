'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Package, Save, X, DollarSign, Tag } from 'lucide-react'

interface CatalogProduct {
  name: string
  value_min: number
  value_max: number
  description: string
}

interface ProductCatalog {
  id: string
  segment: string
  segment_label: string
  segment_icon: string
  products: CatalogProduct[]
  created_at: string
  updated_at: string
}

const SEGMENT_OPTIONS = [
  { value: 'odontologia', label: 'Clínica Odontológica', icon: '🦷' },
  { value: 'estetica', label: 'Clínica de Estética', icon: '💆' },
  { value: 'saude', label: 'Clínica de Saúde / Médica', icon: '🏥' },
  { value: 'academia', label: 'Academia / Fitness', icon: '💪' },
  { value: 'restaurante', label: 'Restaurante / Alimentação', icon: '🍽️' },
  { value: 'salao', label: 'Salão de Beleza / Barbearia', icon: '✂️' },
  { value: 'educacao', label: 'Escola / Educação', icon: '📚' },
  { value: 'varejo', label: 'Varejo / Loja', icon: '🛍️' },
  { value: 'imoveis', label: 'Imobiliária / Construtora', icon: '🏠' },
  { value: 'tecnologia', label: 'Tecnologia / Software', icon: '💻' },
  { value: 'pets', label: 'Pet Shop / Veterinária', icon: '🐾' },
  { value: 'automoveis', label: 'Automóveis / Oficina', icon: '🚗' },
]

function formatCurrency(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`
  return `R$ ${value.toLocaleString('pt-BR')}`
}

export default function AdminCatalogs() {
  const [catalogs, setCatalogs] = useState<ProductCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingCatalog, setEditingCatalog] = useState<ProductCatalog | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Novo catálogo
  const [newSegment, setNewSegment] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [newProducts, setNewProducts] = useState<CatalogProduct[]>([
    { name: '', value_min: 0, value_max: 0, description: '' }
  ])

  useEffect(() => {
    fetchCatalogs()
  }, [])

  async function fetchCatalogs() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/catalogs')
      const data = await res.json()
      setCatalogs(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function saveCatalog() {
    if (!editingCatalog) return
    setSaving(true)
    try {
      await fetch('/api/admin/catalogs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCatalog.id,
          segment_label: editingCatalog.segment_label,
          segment_icon: editingCatalog.segment_icon,
          products: editingCatalog.products
        })
      })
      await fetchCatalogs()
      setEditingCatalog(null)
    } finally {
      setSaving(false)
    }
  }

  async function createCatalog() {
    if (!newSegment || !newLabel) return
    const option = SEGMENT_OPTIONS.find(o => o.value === newSegment)
    setSaving(true)
    try {
      await fetch('/api/admin/catalogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment: newSegment,
          segment_label: newLabel,
          segment_icon: newIcon || option?.icon || '📦',
          products: newProducts.filter(p => p.name.trim())
        })
      })
      await fetchCatalogs()
      setShowNewForm(false)
      setNewSegment('')
      setNewLabel('')
      setNewIcon('')
      setNewProducts([{ name: '', value_min: 0, value_max: 0, description: '' }])
    } finally {
      setSaving(false)
    }
  }

  async function deleteCatalog(id: string) {
    if (!confirm('Remover este catálogo?')) return
    await fetch(`/api/admin/catalogs?id=${id}`, { method: 'DELETE' })
    await fetchCatalogs()
  }

  function updateEditProduct(index: number, field: keyof CatalogProduct, value: string | number) {
    if (!editingCatalog) return
    const updated = [...editingCatalog.products]
    updated[index] = { ...updated[index], [field]: value }
    setEditingCatalog({ ...editingCatalog, products: updated })
  }

  function addEditProduct() {
    if (!editingCatalog) return
    setEditingCatalog({
      ...editingCatalog,
      products: [...editingCatalog.products, { name: '', value_min: 0, value_max: 0, description: '' }]
    })
  }

  function removeEditProduct(index: number) {
    if (!editingCatalog) return
    const updated = editingCatalog.products.filter((_, i) => i !== index)
    setEditingCatalog({ ...editingCatalog, products: updated })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Catálogos de Produtos por Segmento</h2>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os produtos genéricos pré-definidos para cada segmento de negócio. Os clientes usam esses catálogos como ponto de partida.
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Novo Segmento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-800">{catalogs.length}</div>
          <div className="text-sm text-slate-500">Segmentos cadastrados</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-800">
            {catalogs.reduce((sum, c) => sum + c.products.length, 0)}
          </div>
          <div className="text-sm text-slate-500">Produtos genéricos no total</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-800">
            {Math.round(catalogs.reduce((sum, c) => sum + c.products.length, 0) / Math.max(catalogs.length, 1))}
          </div>
          <div className="text-sm text-slate-500">Média de produtos por segmento</div>
        </div>
      </div>

      {/* Novo catálogo form */}
      {showNewForm && (
        <div className="bg-white border border-emerald-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Novo Segmento</h3>
            <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Segmento (slug)</label>
              <select
                value={newSegment}
                onChange={(e) => {
                  const opt = SEGMENT_OPTIONS.find(o => o.value === e.target.value)
                  setNewSegment(e.target.value)
                  if (opt) { setNewLabel(opt.label); setNewIcon(opt.icon) }
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {SEGMENT_OPTIONS.filter(o => !catalogs.find(c => c.segment === o.value)).map(o => (
                  <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                ))}
                <option value="outro">Outro (personalizado)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nome do Segmento</label>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Clínica Odontológica"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Emoji / Ícone</label>
              <input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="🦷"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Produtos Genéricos</label>
              <button
                onClick={() => setNewProducts([...newProducts, { name: '', value_min: 0, value_max: 0, description: '' }])}
                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <Plus size={12} /> Adicionar produto
              </button>
            </div>
            <div className="space-y-2">
              {newProducts.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    value={p.name}
                    onChange={(e) => {
                      const updated = [...newProducts]
                      updated[i] = { ...updated[i], name: e.target.value }
                      setNewProducts(updated)
                    }}
                    placeholder="Nome do produto/serviço"
                    className="col-span-4 border border-slate-200 rounded px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    value={p.value_min || ''}
                    onChange={(e) => {
                      const updated = [...newProducts]
                      updated[i] = { ...updated[i], value_min: Number(e.target.value) }
                      setNewProducts(updated)
                    }}
                    placeholder="Valor mín R$"
                    className="col-span-2 border border-slate-200 rounded px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    value={p.value_max || ''}
                    onChange={(e) => {
                      const updated = [...newProducts]
                      updated[i] = { ...updated[i], value_max: Number(e.target.value) }
                      setNewProducts(updated)
                    }}
                    placeholder="Valor máx R$"
                    className="col-span-2 border border-slate-200 rounded px-2 py-1.5 text-sm"
                  />
                  <input
                    value={p.description}
                    onChange={(e) => {
                      const updated = [...newProducts]
                      updated[i] = { ...updated[i], description: e.target.value }
                      setNewProducts(updated)
                    }}
                    placeholder="Descrição breve"
                    className="col-span-3 border border-slate-200 rounded px-2 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => setNewProducts(newProducts.filter((_, idx) => idx !== i))}
                    className="col-span-1 text-red-400 hover:text-red-600 flex justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
              Cancelar
            </button>
            <button
              onClick={createCatalog}
              disabled={saving || !newSegment || !newLabel}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Criar Catálogo'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de catálogos */}
      <div className="space-y-3">
        {catalogs.map((catalog) => (
          <div key={catalog.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Header do catálogo */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
              onClick={() => setExpandedId(expandedId === catalog.id ? null : catalog.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{catalog.segment_icon}</span>
                <div>
                  <div className="font-semibold text-slate-800">{catalog.segment_label}</div>
                  <div className="text-xs text-slate-500">{catalog.products.length} produtos genéricos · slug: <code className="bg-slate-100 px-1 rounded">{catalog.segment}</code></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingCatalog(catalog); setExpandedId(catalog.id) }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCatalog(catalog.id) }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={14} />
                </button>
                {expandedId === catalog.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>
            </div>

            {/* Conteúdo expandido */}
            {expandedId === catalog.id && (
              <div className="border-t border-slate-100 p-4">
                {editingCatalog?.id === catalog.id ? (
                  /* Modo edição */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Nome do Segmento</label>
                        <input
                          value={editingCatalog.segment_label}
                          onChange={(e) => setEditingCatalog({ ...editingCatalog, segment_label: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Emoji / Ícone</label>
                        <input
                          value={editingCatalog.segment_icon}
                          onChange={(e) => setEditingCatalog({ ...editingCatalog, segment_icon: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-slate-600">Produtos Genéricos</label>
                        <button onClick={addEditProduct} className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                          <Plus size={12} /> Adicionar
                        </button>
                      </div>
                      <div className="space-y-2">
                        {editingCatalog.products.map((p, i) => (
                          <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-lg p-2">
                            <input
                              value={p.name}
                              onChange={(e) => updateEditProduct(i, 'name', e.target.value)}
                              placeholder="Nome do produto/serviço"
                              className="col-span-4 border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                            />
                            <div className="col-span-2 flex items-center gap-1">
                              <span className="text-xs text-slate-400">Mín</span>
                              <input
                                type="number"
                                value={p.value_min || ''}
                                onChange={(e) => updateEditProduct(i, 'value_min', Number(e.target.value))}
                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                              />
                            </div>
                            <div className="col-span-2 flex items-center gap-1">
                              <span className="text-xs text-slate-400">Máx</span>
                              <input
                                type="number"
                                value={p.value_max || ''}
                                onChange={(e) => updateEditProduct(i, 'value_max', Number(e.target.value))}
                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                              />
                            </div>
                            <input
                              value={p.description}
                              onChange={(e) => updateEditProduct(i, 'description', e.target.value)}
                              placeholder="Descrição breve"
                              className="col-span-3 border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                            />
                            <button onClick={() => removeEditProduct(i)} className="col-span-1 text-red-400 hover:text-red-600 flex justify-center">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setEditingCatalog(null)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
                      <button
                        onClick={saveCatalog}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        <Save size={14} />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Modo visualização */
                  <div className="grid grid-cols-2 gap-3">
                    {catalog.products.map((p, i) => (
                      <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package size={14} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 text-sm">{p.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">{p.description}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <DollarSign size={10} className="text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-700">
                              {formatCurrency(p.value_min)} – {formatCurrency(p.value_max)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
