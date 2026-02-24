import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { InitialField } from '@/types';

interface InitialFieldsConfigProps {
  initialFields: InitialField[];
  onChange: (fields: InitialField[]) => void;
}

const InitialFieldsConfig: React.FC<InitialFieldsConfigProps> = ({ initialFields, onChange }) => {
  // Campos padrão se nenhum for fornecido
  const defaultFields: InitialField[] = [
    { field: 'name', label: 'Nome', placeholder: 'Digite seu nome', required: true, enabled: true },
    { field: 'email', label: 'E-mail', placeholder: 'Digite seu e-mail', required: true, enabled: true },
    { field: 'phone', label: 'Telefone', placeholder: 'Digite seu telefone', required: false, enabled: true }
  ];

  const fields = initialFields.length > 0 ? initialFields : defaultFields;

  const handleToggle = (index: number, property: 'required' | 'enabled') => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [property]: !newFields[index][property] };
    onChange(newFields);
  };

  const handleChange = (index: number, property: 'label' | 'placeholder', value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [property]: value };
    onChange(newFields);
  };

  const handleAddField = () => {
    const newField: InitialField = {
      field: `custom_${Date.now()}`,
      label: '',
      placeholder: '',
      required: false,
      enabled: true
    };
    onChange([...fields, newField]);
  };

  const handleRemoveField = (index: number) => {
    // Não permitir remover os 3 campos padrão
    if (index < 3) return;
    const newFields = fields.filter((_, i) => i !== index);
    onChange(newFields);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Campos de Identificação</h3>
        <p className="text-sm text-gray-600 mb-4">Configure quais dados serão solicitados ao cliente antes da pesquisa</p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.field} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={() => handleToggle(index, 'enabled')}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Ativo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={() => handleToggle(index, 'required')}
                    disabled={!field.enabled}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">Obrigatório</span>
                </label>
              </div>
              {index >= 3 && (
                <button
                  onClick={() => handleRemoveField(index)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Remover campo"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Título do campo</label>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => handleChange(index, 'label', e.target.value)}
                  disabled={!field.enabled}
                  placeholder="Ex: Nome"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder (exemplo)</label>
                <input
                  type="text"
                  value={field.placeholder}
                  onChange={(e) => handleChange(index, 'placeholder', e.target.value)}
                  disabled={!field.enabled}
                  placeholder="Ex: Digite seu nome"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddField}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Plus size={16} /> Adicionar campo
      </button>
    </div>
  );
};

export default InitialFieldsConfig;
