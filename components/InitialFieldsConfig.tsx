import React from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { InitialField } from '@/types';

interface InitialFieldsConfigProps {
  initialFields: InitialField[];
  onChange: (fields: InitialField[]) => void;
}

const InitialFieldsConfig: React.FC<InitialFieldsConfigProps> = ({ initialFields, onChange }) => {
  // Campos padrão se nenhum for fornecido
  const defaultFields: InitialField[] = [
    { field: 'name', label: 'Nome Completo', placeholder: 'Seu nome', required: true, enabled: true },
    { field: 'email', label: 'Email', placeholder: 'seu@email.com', required: true, enabled: true },
    { field: 'phone', label: 'Telefone / WhatsApp', placeholder: '(00) 00000-0000', required: false, enabled: true }
  ];

  const fields = initialFields.length > 0 ? initialFields : defaultFields;

  const handleToggle = (fieldKey: string, property: 'required' | 'enabled') => {
    const newFields = fields.map(f => {
      if (f.field === fieldKey) {
        // O campo 'name' deve estar sempre habilitado e ser obrigatório para o CRM funcionar bem
        if (fieldKey === 'name') return f;
        return { ...f, [property]: !f[property] };
      }
      return f;
    });
    onChange(newFields);
  };

  const handleLabelChange = (fieldKey: string, newLabel: string) => {
    const newFields = fields.map(f => {
      if (f.field === fieldKey) {
        return { ...f, label: newLabel };
      }
      return f;
    });
    onChange(newFields);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {fields.map((f) => (
          <div 
            key={f.field} 
            className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border transition-all ${
              f.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
            }`}
          >
            <div className="flex-1 flex items-center gap-3 mb-3 md:mb-0">
              <div className={`p-2 rounded-md ${f.enabled ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                <Edit2 size={16} />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={f.label}
                  onChange={(e) => handleLabelChange(f.field, e.target.value)}
                  disabled={!f.enabled}
                  className="bg-transparent border-none p-0 font-medium text-gray-900 focus:ring-0 w-full"
                  placeholder="Rótulo do campo"
                />
                <p className="text-xs text-gray-400">ID do campo: {f.field}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Habilitado</span>
                <button
                  onClick={() => handleToggle(f.field, 'enabled')}
                  disabled={f.field === 'name'}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                    f.enabled ? 'bg-green-500' : 'bg-gray-300'
                  } ${f.field === 'name' ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    f.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Obrigatório</span>
                <button
                  onClick={() => handleToggle(f.field, 'required')}
                  disabled={!f.enabled || f.field === 'name'}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                    f.required ? 'bg-primary-500' : 'bg-gray-300'
                  } ${(!f.enabled || f.field === 'name') ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    f.required ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 italic">
        * O campo 'Nome' é essencial para a organização do seu Kanban e não pode ser desabilitado.
      </p>
    </div>
  );
};

export default InitialFieldsConfig;
