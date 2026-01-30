
import React, { useState } from 'react';
import { Lead, NPSResponse, Campaign, Form, User } from '@/types';
import { Users, Contact, BarChart3, Database, Download, Loader2 } from 'lucide-react';

interface DatabaseExportProps {
  leads: Lead[];
  npsData: NPSResponse[];
  campaigns: Campaign[];
  forms: Form[];
  users: User[]; // Assuming we get a list of users
}

// Helper to escape HTML characters
const escapeHtml = (unsafe: string) => {
    if (typeof unsafe !== 'string') {
        return String(unsafe);
    }
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Helper to convert array of objects to an HTML table string
const arrayToHtmlTable = (data: any[]) => {
  if (data.length === 0) return '';
  const columns = Object.keys(data[0]);
  let table = '<table border="1">';
  
  table += '<thead><tr>';
  columns.forEach(col => {
    table += `<th>${escapeHtml(col)}</th>`;
  });
  table += '</tr></thead>';

  table += '<tbody>';
  data.forEach(obj => {
    table += '<tr>';
    columns.forEach(col => {
      let value = obj[col];
      if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      table += `<td>${escapeHtml(String(value))}</td>`;
    });
    table += '</tr>';
  });
  table += '</tbody></table>';
  return table;
};


const DatabaseExport: React.FC<DatabaseExportProps> = ({ leads, npsData, campaigns, forms, users }) => {
  const dataModules = {
    crm: [
      { id: 'clientes', name: 'Clientes', icon: Users, count: leads.length, data: leads },
      { id: 'contatos', name: 'Contatos', icon: Contact, count: npsData.length, data: npsData },
      { id: 'negocios', name: 'Negócios (Pipeline)', icon: BarChart3, count: leads.length, data: leads },
    ]
  };

  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const handleToggleModule = (id: string) => {
    setSelectedModules(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    if (selectedModules.length === 0) return;
    
    setIsExporting(true);

    setTimeout(() => {
        const xlsxTemplate = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>Dados Exportados</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              table, th, td { border: 1px solid black; border-collapse: collapse; }
              th, td { padding: 5px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              h2 { font-size: 16px; font-weight: bold; }
            </style>
          </head>
          <body>
            {content}
          </body>
          </html>
        `;

        let content = '';
        const allModules = [...dataModules.crm];

        selectedModules.forEach(id => {
            const module = allModules.find(m => m.id === id);
            if (module && module.data.length > 0) {
                content += `<h2>${escapeHtml(module.name)}</h2>`;
                content += arrayToHtmlTable(module.data);
                content += '<br/><br/>';
            }
        });

        if (content) {
            const fullHtml = xlsxTemplate.replace('{content}', content);
            const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel' });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `export_hellogrowth_${new Date().toISOString().split('T')[0]}.xls`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
        setIsExporting(false);
    }, 1000);
  };
  
  const getModuleById = (id: string) => {
    return [...dataModules.crm].find(m => m.id === id);
  }

  return (
    <div className="p-8 min-h-screen bg-gray-100" style={{ colorScheme: 'light' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Database size={32} className="text-gray-500"/>
            Banco de Dados
          </h1>
          <p className="text-gray-500 mt-2">Selecione os dados que deseja exportar do sistema.</p>
        </div>

        <div className="space-y-10">
          {/* CRM Section */}
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Dados de CRM</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dataModules.crm.map(module => (
                <div 
                  key={module.id} 
                  onClick={() => handleToggleModule(module.id)}
                  className={`bg-white rounded-xl border-2 p-5 flex items-start gap-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                    selectedModules.includes(module.id) ? 'border-primary-500 shadow-md' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(module.id)}
                    onChange={() => {}}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <module.icon className="w-5 h-5 text-gray-500"/>
                      <h3 className="font-bold text-gray-800">{module.name}</h3>
                    </div>
                    <p className="text-sm text-gray-500">{module.count} registros no banco</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col items-center">
            {selectedModules.length > 0 && (
                <div className="mb-4 text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
                    {selectedModules.length} {selectedModules.length === 1 ? 'módulo selecionado' : 'módulos selecionados'}
                </div>
            )}
            <button 
                onClick={handleExport}
                disabled={selectedModules.length === 0 || isExporting}
                className="px-8 py-4 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-3 text-lg"
            >
                {isExporting ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
                {isExporting ? 'Exportando...' : 'Exportar Dados Selecionados'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseExport;
