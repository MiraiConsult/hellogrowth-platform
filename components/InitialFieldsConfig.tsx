// InitialFieldsConfig.tsx - Configuração de Campos Iniciais do Formulário
import React, { useState } from 'react';
import { User, Mail, Phone, GripVertical, Plus, Trash2, Hash, Calendar, MapPin, Home, AlignLeft, ChevronDown } from 'lucide-react';
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

// Campos pré-definidos disponíveis para adicionar
const AVAILABLE_FIELD_TYPES = [
  { field: 'cpf', label: 'CPF', placeholder: '000.000.000-00', inputType: 'text' as const, icon: 'hash' },
  { field: 'birthdate', label: 'Data de Nascimento', placeholder: 'DD/MM/AAAA', inputType: 'date' as const, icon: 'calendar' },
  { field: 'city', label: 'Cidade', placeholder: 'Digite sua cidade', inputType: 'text' as const, icon: 'map' },
  { field: 'state', label: 'Estado', placeholder: 'Ex: SP, RS, MG...', inputType: 'text' as const, icon: 'map' },
  { field: 'neighborhood', label: 'Bairro', placeholder: 'Digite seu bairro', inputType: 'text' as const, icon: 'home' },
  { field: 'address', label: 'Endereço', placeholder: 'Rua, número, complemento', inputType: 'text' as const, icon: 'home' },
  { field: 'custom', label: 'Campo Personalizado', placeholder: 'Digite sua resposta', inputType: 'text' as const, icon: 'text' },
];

const getFieldIcon = (field: string) => {
  switch (field) {
    case 'name': return <User size={16} className="text-gray-500" />;
    case 'email': return <Mail size={16} className="text-gray-500" />;
    case 'phone': return <Phone size={16} className="text-gray-500" />;
    case 'cpf': return <Hash size={16} className="text-gray-500" />;
    case 'birthdate': return <Calendar size={16} className="text-gray-500" />;
    case 'city':
    case 'state': return <MapPin size={16} className="text-gray-500" />;
    case 'neighborhood':
    case 'address': return <Home size={16} className="text-gray-500" />;
    default: return <AlignLeft size={16} className="text-gray-500" />;
  }
};

const getCoreFieldLabel = (field: string) => {
  switch (field) {
    case 'name': return 'Nome';
    case 'email': return 'Email';
    case 'phone': return 'Telefone';
    case 'cpf': return 'CPF';
    case 'birthdate': return 'Data de Nascimento';
    case 'city': return 'Cidade';
    case 'state': return 'Estado';
    case 'neighborhood': return 'Bairro';
    case 'address': return 'Endereço';
    default: return 'Campo Personalizado';
  }
};

// Campos fixos que não podem ser removidos
const FIXED_FIELDS = ['name', 'email', 'phone'];

const InitialFieldsConfig: React.FC<InitialFieldsConfigProps> = ({ initialFields, onChange }) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Use default fields if none provided
  const fields = initialFields && initialFields.length > 0 ? initialFields : defaultFields;

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
    updatedFields[index] = { ...updatedFields[index], label: value };
    onChange(updatedFields);
  };

  const handlePlaceholderChange = (index: number, value: string) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], placeholder: value };
    onChange(updatedFields);
  };

  const handleRemoveField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    onChange(updatedFields);
  };

  const handleAddField = (fieldType: typeof AVAILABLE_FIELD_TYPES[0]) => {
    // Para campos custom, gerar um ID único
    const fieldId = fieldType.field === 'custom'
      ? `custom_${Date.now()}`
      : fieldType.field;

    const newField: InitialField = {
      field: fieldId,
      label: fieldType.label,
      placeholder: fieldType.placeholder,
      required: false,
      enabled: true,
      inputType: fieldType.inputType,
    };

    onChange([...fields, newField]);
    setShowAddMenu(false);
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
        {fields.map((field, index) => {
          const isFixed = FIXED_FIELDS.includes(field.field as string);
          return (
            <div
              key={`${field.field}-${index}`}
              className={`border rounded-lg p-4 transition-all ${
                field.enabled
                  ? 'border-gray-200 bg-white'
                  : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Drag Handle */}
                <div className="text-gray-300 cursor-grab flex-shrink-0">
                  <GripVertical size={16} />
                </div>

                {/* Field Icon */}
                <div className="flex-shrink-0">
                  {getFieldIcon(field.field as string)}
                </div>

                {/* Field Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {getCoreFieldLabel(field.field as string)}
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

                {/* Toggles + Remove */}
                <div className="flex items-center gap-3 flex-shrink-0">
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

                  {/* Remove Button (only for non-fixed fields) */}
                  {!isFixed && (
                    <button
                      onClick={() => handleRemoveField(index)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remover campo"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Field Button */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors border border-dashed border-emerald-300 w-full justify-center"
        >
          <Plus size={16} />
          Adicionar Campo
          <ChevronDown size={14} className={`transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
        </button>

        {showAddMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
            {AVAILABLE_FIELD_TYPES.map((fieldType) => (
              <button
                key={fieldType.field}
                onClick={() => handleAddField(fieldType)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
              >
                {getFieldIcon(fieldType.field)}
                <div>
                  <div className="font-medium">{fieldType.label}</div>
                  <div className="text-xs text-gray-400">{fieldType.placeholder}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Estes campos serão exibidos no início do formulário para identificar o respondente.
      </p>
    </div>
  );
};

export default InitialFieldsConfig;
