import React, { useState } from 'react';
import { FileText, Plus, MoreVertical, Edit3, Eye, X } from 'lucide-react';

const DocumentTemplates = () => {
  const [templates, setTemplates] = useState([
    { id: '1', name: 'Proposta Comercial Padrão', type: 'Proposta', lastModified: '2023-11-01', content: 'Prezado cliente, segue proposta comercial referente aos serviços de...' },
    { id: '2', name: 'Contrato de Prestação de Serviços', type: 'Contrato', lastModified: '2023-10-25', content: 'CONTRATO DE SERVIÇOS\n\nPelo presente instrumento particular, as partes...' },
    { id: '3', name: 'Orçamento Odontológico', type: 'Orçamento', lastModified: '2023-10-20', content: 'ORÇAMENTO ODONTOLÓGICO\n\nPaciente: [Nome]\nProcedimento: Implante Dentário\nValor: R$ 3.500,00' },
  ]);

  const [viewingDoc, setViewingDoc] = useState<any>(null);

  return (
    <div className="p-8 min-h-screen bg-gray-50">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelos de Documentos</h1>
          <p className="text-gray-500">Gerencie contratos, propostas e orçamentos.</p>
        </div>
        <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 shadow-sm flex items-center gap-2">
            <Plus size={18} /> Novo Modelo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(doc => (
            <div key={doc.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <FileText size={24} />
                    </div>
                    <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={20}/></button>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{doc.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{doc.type} • Editado em {doc.lastModified}</p>
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2">
                        <Edit3 size={16} /> Editar
                    </button>
                    <button 
                        onClick={() => setViewingDoc(doc)}
                        className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" 
                        title="Visualizar"
                    >
                        <Eye size={16} />
                    </button>
                </div>
            </div>
        ))}
         <button className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50 transition-all min-h-[200px]">
             <Plus size={32} className="mb-2" />
             <span className="font-medium">Criar novo modelo</span>
          </button>
      </div>

      {/* Preview Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-in zoom-in-95">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <FileText size={20} className="text-blue-600"/>
                        <h3 className="font-bold text-gray-900">{viewingDoc.name}</h3>
                    </div>
                    <button onClick={() => setViewingDoc(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 bg-gray-100 p-8 overflow-y-auto">
                    <div className="bg-white shadow-sm min-h-full p-8 mx-auto max-w-xl text-sm leading-relaxed whitespace-pre-wrap font-serif text-gray-800">
                        {viewingDoc.content}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-white rounded-b-xl">
                    <button onClick={() => setViewingDoc(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium">Fechar</button>
                    <button className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium shadow-sm flex items-center gap-2">
                        <Edit3 size={16} /> Editar Documento
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default DocumentTemplates;
