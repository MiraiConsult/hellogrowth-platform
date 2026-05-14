'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Calendar, Clock, X, Download } from 'lucide-react';

interface CSVImportProps {
  tenantId: string;
}

interface ImportRecord {
  id: string;
  file_name: string;
  total_rows: number;
  processed_rows: number;
  scheduled_count: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export default function CSVImport({ tenantId }: CSVImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [dispatchType, setDispatchType] = useState<string>('both');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchImports();
  }, [tenantId]);

  const fetchImports = async () => {
    try {
      const res = await fetch(`/api/csv-import?tenantId=${tenantId}`);
      const data = await res.json();
      if (data.imports) setImports(data.imports);
    } catch (e) {
      console.error('Erro ao buscar imports:', e);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Apenas arquivos CSV são aceitos.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenantId', tenantId);
      formData.append('type', dispatchType);

      const res = await fetch('/api/csv-import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        fetchImports();
      } else {
        setError(data.error || 'Erro ao processar CSV');
      }
    } catch (e: any) {
      setError('Erro de conexão: ' + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Importar Agenda (CSV)</h3>
        <p className="text-sm text-gray-500 mt-1">
          Exporte a agenda da Clinicorp ou outro sistema em CSV e faça upload aqui.
          O sistema programa os disparos automaticamente.
        </p>
      </div>

      {/* Tipo de disparo */}
      <div className="flex gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="dispatchType"
            value="both"
            checked={dispatchType === 'both'}
            onChange={(e) => setDispatchType(e.target.value)}
            className="text-purple-600"
          />
          <span className="text-sm">Pré-venda + NPS</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="dispatchType"
            value="pre_sale"
            checked={dispatchType === 'pre_sale'}
            onChange={(e) => setDispatchType(e.target.value)}
            className="text-purple-600"
          />
          <span className="text-sm">Apenas Pré-venda</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="dispatchType"
            value="nps"
            checked={dispatchType === 'nps'}
            onChange={(e) => setDispatchType(e.target.value)}
            className="text-purple-600"
          />
          <span className="text-sm">Apenas NPS</span>
        </label>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={40} className="text-purple-500 animate-spin" />
            <p className="text-sm text-gray-600">Processando agenda...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={40} className="text-gray-400" />
            <p className="text-sm text-gray-600">
              <span className="font-medium text-purple-600">Clique para selecionar</span> ou arraste o CSV aqui
            </p>
            <p className="text-xs text-gray-400">
              Colunas obrigatórias: nome, telefone, data. Opcionais: hora, procedimento, email
            </p>
          </div>
        )}
      </div>

      {/* Resultado */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-600" />
            <span className="font-medium text-green-800">Upload concluído!</span>
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <p>{result.totalRows} registros lidos do CSV</p>
            <p>{result.scheduledDispatches} disparos agendados</p>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2 text-xs text-amber-600">
              <p className="font-medium">Avisos:</p>
              {result.errors.map((err: string, i: number) => (
                <p key={i}>- {err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Modelo CSV */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Modelo de CSV</span>
          <button
            onClick={() => {
              const csv = 'nome;telefone;data;hora;procedimento;email\nJoão Silva;11999887766;15/06/2026;09:00;Limpeza;joao@email.com\nMaria Santos;11988776655;15/06/2026;10:30;Clareamento;';
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'modelo_agenda_hellogrowth.csv';
              a.click();
            }}
            className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
          >
            <Download size={12} />
            Baixar modelo
          </button>
        </div>
        <code className="text-xs text-gray-500 block">
          nome;telefone;data;hora;procedimento;email
        </code>
      </div>

      {/* Histórico de imports */}
      {imports.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Importações anteriores</h4>
          <div className="space-y-2">
            {imports.map((imp) => (
              <div
                key={imp.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{imp.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(imp.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-500">{imp.total_rows} registros</span>
                  <span className="text-green-600">{imp.scheduled_count || 0} agendados</span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      imp.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : imp.status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {imp.status === 'completed' ? 'Concluído' : imp.status === 'error' ? 'Erro' : 'Processando'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
