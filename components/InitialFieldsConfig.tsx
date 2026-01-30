// InitialFieldsConfig.tsx - Configuração de Campos Iniciais do Formulário
import React from 'react';
import { User, Mail, Phone, GripVertical } from 'lucide-react';
import { InitialField } from '@/types';

interface InitialFieldsConfigProps {
  initialFields: InitialField[];
  onChange: (fields: InitialField[]) => void;
}

const defaultFields: InitialField[] = [
  { field: 'name', label: 'Nome', placeholder: 'Digite seu nome', required: true, enabled: true },
  { field: 'email', label: 'Email', placeholder: 'Digite seu email', required: true, enabled: true },
  { field: 'phone', label: 'Telefone', placeholder: 'Digite seu telefone', required: false, enabled: true },
];

const InitialFieldsConfig: React.FC<InitialFieldsConfigProps> = ({ initialFields, onChange }) => {
  // Use default fields if none provided
  const fields = initialFields && initialFields.length > 0 ? initialFields : defaultFields;

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'name': return <User size={16} className="text-gray-500" />;
      case 'email': return <Mail size={16} className="text-gray-500" />;
      case 'phone': return <Phone size={16} className="text-gray-500" />;
      default: return null;
    }
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'name': return 'Nome';
      case 'email': return 'Email';
      case 'phone': return 'Telefone';
      default: return field;
    }
  };

  const handleToggleEnabled = (index: number) => {
    const updatedFields = [...fields];
    updatedFields[index] = {
      ...updatedFields[index],
      enabled: !updatedFields[index].enabled
    };
    onChange(updatedFields);
  };

  const handleToggleRequired = (index: number) => {
    const updatedFields = [...fields];
    updatedFields[index] = {
      ...updatedFields[index],
      required: !updatedFields[index].required
    };
    onChange(updatedFields);
  };

  const handleLabelChange = (index: number, value: string) => {
    const updatedFields = [...fields];
    updatedFields[index] = {
      ...updatedFields[index],
      label: value
    };
    onChange(updatedFields);
  };

  const handlePlaceholderChange = (index: number, value: string) => {
    const updatedFields = [...fields];
    updatedFields[index] = {
      ...updatedFields[index],
      placeholder: value
    };
    onChange(updatedFields);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
          Campos de Identificação
        </h3>
        <span className="text-xs text-gray-500">
          Configure os campos iniciais do formulário
        </span>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div 
            key={field.field}
            className={`border rounded-lg p-4 transition-all ${
              field.enabled 
                ? 'border-gray-200 bg-white' 
                : 'border-gray-100 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Drag Handle */}
              <div className="text-gray-300 cursor-grab">
                <GripVertical size={16} />
              </div>

              {/* Field Icon */}
              <div className="flex-shrink-0">
                {getFieldIcon(field.field)}
              </div>

              {/* Field Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {getFieldLabel(field.field)}
                  </span>
                  {field.required && field.enabled && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      Obrigatório
                    </span>
                  )}
                </div>

                {field.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rótulo</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleLabelChange(index, e.target.value)}
                        className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Rótulo do campo"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={field.placeholder}
                        onChange={(e) => handlePlaceholderChange(index, e.target.value)}
                        className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Texto de exemplo"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Required Toggle */}
                {field.enabled && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500">Obrigatório</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={() => handleToggleRequired(index)}
                        className="sr-only"
                      />
                      <div className={`w-9 h-5 rounded-full transition-colors ${
                        field.required ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          field.required ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                  </label>
                )}

                {/* Enabled Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">Ativo</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={field.enabled}
                      onChange={() => handleToggleEnabled(index)}
                      className="sr-only"
                    />
                    <div className={`w-9 h-5 rounded-full transition-colors ${
                      field.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        field.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Estes campos serão exibidos no início do formulário para identificar o respondente.
      </p>
    </div>
  );
};

export default InitialFieldsConfig;
