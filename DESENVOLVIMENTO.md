# 💻 Guia de Desenvolvimento - HelloGrowth

Este guia te ajudará a fazer modificações no sistema de forma profissional e segura.

---

## 🚀 **Como Fazer Mudanças no Sistema**

### **Fluxo Básico:**

1. **Edite o código** no seu editor (VS Code recomendado)
2. **Teste localmente** rodando `npm run dev`
3. **Faça commit** das mudanças
4. **Envie para o GitHub** com `git push`
5. **Deploy automático** no Vercel em ~1 minuto

---

## 🛠️ **Comandos Essenciais**

### **Desenvolvimento Local:**

```bash
# Instalar dependências (primeira vez)
npm install

# Rodar em modo desenvolvimento (com hot reload)
npm run dev

# Abrir no navegador
# http://localhost:3000
```

### **Git (Versionamento):**

```bash
# Ver o que mudou
git status

# Adicionar todas as mudanças
git add .

# Salvar as mudanças com uma mensagem
git commit -m "Descrição do que você mudou"

# Enviar para o GitHub (deploy automático)
git push
```

### **Build de Produção:**

```bash
# Criar build otimizado
npm run build

# Testar build localmente
npm start
```

---

## 📁 **Onde Está Cada Coisa**

### **Componentes (Interface):**
```
components/
├── Auth.tsx              → Tela de login
├── MainApp.tsx           → App principal
├── Dashboard.tsx         → Dashboard geral
├── Kanban.tsx            → Gestão de leads
├── NPSCampaigns.tsx      → Campanhas NPS
├── CustomerJourney.tsx   → Jornada do cliente
└── ...
```

### **APIs (Backend):**
```
app/api/
├── gmail/
│   ├── auth/route.ts     → Inicia OAuth Gmail
│   ├── callback/route.ts → Processa retorno do Google
│   ├── send/route.ts     → Envia emails
│   └── disconnect/route.ts → Desconecta Gmail
└── ...
```

### **Serviços (Lógica de Negócio):**
```
lib/services/
├── gmailAuth.ts          → Autenticação Gmail
└── gmailSender.ts        → Envio de emails
```

### **Configurações:**
```
.env.local                → Variáveis de ambiente (NÃO commitar!)
next.config.js            → Configurações do Next.js
tailwind.config.js        → Configurações do Tailwind CSS
tsconfig.json             → Configurações do TypeScript
```

---

## 🎨 **Como Adicionar uma Nova Tela**

### **Exemplo: Criar tela de "Relatórios"**

1. **Crie o componente:**
```typescript
// components/Reports.tsx
'use client';

import React from 'react';

export default function Reports() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>
      {/* Seu conteúdo aqui */}
    </div>
  );
}
```

2. **Adicione no menu de navegação:**
```typescript
// components/Navigation.tsx
// Adicione um novo item no array de menus
{
  icon: FileText,
  label: 'Relatórios',
  view: 'reports'
}
```

3. **Adicione no MainApp:**
```typescript
// components/MainApp.tsx
import Reports from '@/components/Reports';

// No switch/case:
case 'reports':
  return <Reports />;
```

---

## 🔌 **Como Adicionar uma Nova API**

### **Exemplo: API para buscar clientes**

1. **Crie o arquivo da rota:**
```typescript
// app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*');

    if (error) throw error;

    return NextResponse.json({ customers: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

2. **Use no componente:**
```typescript
const fetchCustomers = async () => {
  const response = await fetch('/api/customers');
  const data = await response.json();
  console.log(data.customers);
};
```

---

## 🎨 **Como Mudar Cores e Estilos**

### **Cores Principais:**
Edite `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#0ea5e9', // Cor principal
        600: '#0284c7', // Hover
      },
    },
  },
}
```

### **Estilos Globais:**
Edite `app/globals.css`:

```css
body {
  font-family: 'Inter', sans-serif;
}
```

---

## 🤖 **Como Usar a IA (Gemini)**

### **Exemplo: Gerar texto com IA**

```typescript
const generateText = async (prompt: string) => {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};
```

---

## 🐛 **Como Debugar**

### **Ver Logs no Navegador:**
```typescript
console.log('Debug:', variavel);
```

### **Ver Logs das APIs:**
- **Localmente:** Aparecem no terminal onde você rodou `npm run dev`
- **Produção:** Acesse o painel do Vercel > Deployments > Functions

### **Erro Comum: "Module not found"**
```bash
# Reinstale as dependências
rm -rf node_modules package-lock.json
npm install
```

---

## 🔐 **Segurança**

### **NUNCA commite:**
- `.env.local` (já está no .gitignore)
- Senhas ou API keys no código

### **SEMPRE use:**
- Variáveis de ambiente para credenciais
- `process.env.NOME_DA_VARIAVEL`

---

## 📦 **Como Adicionar uma Nova Biblioteca**

```bash
# Instalar biblioteca
npm install nome-da-biblioteca

# Exemplo: Adicionar biblioteca de datas
npm install date-fns

# Usar no código
import { format } from 'date-fns';
```

---

## 🚨 **Se Algo Der Errado**

### **Voltar para versão anterior:**
```bash
# Ver histórico de commits
git log --oneline

# Voltar para um commit específico
git reset --hard abc123

# Forçar push (cuidado!)
git push --force
```

### **Ou usar o Vercel:**
- Acesse o painel do Vercel
- Vá em "Deployments"
- Clique em "..." no deploy que funcionava
- Clique em "Promote to Production"

---

## 💡 **Dicas Profissionais**

1. **Sempre teste localmente** antes de fazer push
2. **Commits pequenos e frequentes** são melhores que commits gigantes
3. **Mensagens de commit claras**: "Adiciona botão de exportar" é melhor que "update"
4. **Use branches** para features grandes:
   ```bash
   git checkout -b feature/nova-funcionalidade
   # Faça suas mudanças
   git push origin feature/nova-funcionalidade
   ```

---

## 🆘 **Precisa de Ajuda?**

Se travar em algo:
1. Verifique os logs (console ou Vercel)
2. Confira se as variáveis de ambiente estão corretas
3. Tente rodar `npm install` novamente
4. Me chame no Manus! 😊

---

**Boa codificação! 🚀**
