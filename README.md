# 🚀 HelloGrowth Platform - Next.js

Plataforma completa de CRM e gestão de vendas com IA integrada, reestruturada para escalar para 1000+ usuários.

## 📋 Sobre o Projeto

Sistema profissional de CRM com:
- ✅ Gestão de Leads e Oportunidades
- ✅ Campanhas NPS
- ✅ Formulários Digitais
- ✅ Sugestões de Mensagens com IA (Gemini)
- ✅ Integração Gmail OAuth2
- ✅ Dashboards e Analytics
- ✅ Jornada do Cliente

## 🏗️ Arquitetura

### Stack Tecnológico
- **Framework:** Next.js 14 (App Router)
- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **IA:** Google Gemini API
- **Email:** Gmail API (OAuth2)
- **Deploy:** Vercel
- **Versionamento:** GitHub

### Estrutura de Pastas

```
hellogrowth-nextjs/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── gmail/               # Gmail OAuth2 & Send
│   │   ├── auth/                # Autenticação
│   │   └── webhooks/            # Webhooks externos
│   ├── dashboard/               # Páginas do dashboard
│   ├── auth/                    # Páginas de autenticação
│   ├── layout.tsx               # Layout raiz
│   ├── page.tsx                 # Página inicial
│   └── globals.css              # Estilos globais
│
├── components/                   # Componentes React
│   ├── ui/                      # Componentes de UI
│   ├── forms/                   # Formulários
│   ├── dashboards/              # Dashboards
│   └── panels/                  # Painéis laterais
│
├── lib/                         # Bibliotecas e utilitários
│   ├── services/                # Serviços (Gmail, etc)
│   ├── utils/                   # Funções utilitárias
│   └── supabase.ts              # Cliente Supabase
│
├── types/                       # TypeScript types
│   └── index.ts                 # Types principais
│
├── public/                      # Arquivos estáticos
│
└── [arquivos de config]         # package.json, tsconfig, etc
```

## 🚀 Como Rodar Localmente

### 1. Pré-requisitos
- Node.js 18+ instalado
- Conta no Supabase
- Conta no Google Cloud (para Gemini e Gmail APIs)

### 2. Instalação

```bash
# Clone o repositório (ou extraia o ZIP)
cd hellogrowth-nextjs

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### 3. Configurar Variáveis de Ambiente

Edite o arquivo `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui

# Google AI (Gemini)
GEMINI_API_KEY=sua_chave_gemini_aqui

# Gmail OAuth2
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

### 4. Rodar o Projeto

```bash
# Modo desenvolvimento (com hot reload)
npm run dev

# Abra no navegador
# http://localhost:3000
```

### 5. Build para Produção

```bash
# Criar build otimizado
npm run build

# Rodar build de produção
npm start
```

## 📦 Deploy no Vercel

### Opção 1: Via GitHub (Recomendado)

1. **Crie um repositório no GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/seu-usuario/hellogrowth.git
   git push -u origin main
   ```

2. **Conecte ao Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Importe seu repositório GitHub
   - Configure as variáveis de ambiente
   - Clique em "Deploy"

3. **Configure o Domínio:**
   - No painel do Vercel, vá em "Settings" > "Domains"
   - Adicione `system.hellogrowth.online`
   - Siga as instruções para configurar DNS

### Opção 2: Via CLI do Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel --prod
```

## 🔐 Configuração do Gmail OAuth2

### 1. Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto ou selecione existente
3. Ative a **Gmail API**
4. Configure a **OAuth Consent Screen**
5. Crie credenciais OAuth 2.0
6. Adicione as Redirect URIs:
   - `http://localhost:3000/api/gmail/callback` (desenvolvimento)
   - `https://system.hellogrowth.online/api/gmail/callback` (produção)

### 2. Supabase - Criar Tabela

Execute no SQL Editor do Supabase:

```sql
CREATE TABLE gmail_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para busca rápida por user_id
CREATE INDEX idx_gmail_user_id ON gmail_connections(user_id);
```

## 🎯 Funcionalidades Principais

### 1. Sugestões de Mensagens com IA
- Geração automática via Gemini
- Contexto do cliente (NPS, Lead, Oportunidade)
- Múltiplas sugestões por situação
- Envio direto via WhatsApp ou Gmail

### 2. Integração Gmail
- OAuth2 seguro
- Envio de emails personalizados
- Renovação automática de tokens
- Gestão de múltiplas contas

### 3. Dashboards Inteligentes
- Analytics em tempo real
- Insights com IA
- Exportação de dados
- Filtros avançados

### 4. Gestão de Leads
- Kanban visual
- Automação de follow-ups
- Scoring automático
- Pipeline de vendas

## 🔧 Desenvolvimento

### Estrutura de Componentes

Todos os componentes devem seguir o padrão:

```typescript
'use client'; // Se usar hooks ou estado

import React from 'react';
import { ComponentProps } from '@/types';

export default function ComponentName({ prop1, prop2 }: ComponentProps) {
  return (
    <div className="...">
      {/* Conteúdo */}
    </div>
  );
}
```

### API Routes

Exemplo de API route:

```typescript
// app/api/exemplo/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Lógica aqui
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro' },
      { status: 500 }
    );
  }
}
```

### Adicionar Nova Funcionalidade

1. Crie o componente em `components/`
2. Se precisar de API, crie em `app/api/`
3. Adicione types em `types/index.ts`
4. Teste localmente
5. Commit e push (deploy automático)

## 📊 Monitoramento

### Logs no Vercel
- Acesse o painel do Vercel
- Vá em "Deployments" > Selecione deploy
- Clique em "Functions" para ver logs das APIs

### Supabase
- Logs de queries no painel do Supabase
- Monitoramento de performance

## 🐛 Troubleshooting

### Erro: "Missing environment variables"
- Verifique se todas as variáveis do `.env.local` estão configuradas
- No Vercel, configure em "Settings" > "Environment Variables"

### Erro: "Gmail not connected"
- Usuário precisa conectar Gmail nas Configurações
- Verifique se a tabela `gmail_connections` existe no Supabase

### Erro: "Token expired"
- O sistema renova automaticamente
- Se persistir, desconecte e reconecte o Gmail

## 📝 Próximos Passos

- [ ] Implementar testes automatizados
- [ ] Adicionar mais integrações (WhatsApp Business API)
- [ ] Sistema de notificações em tempo real
- [ ] App mobile (React Native)
- [ ] Multi-tenancy avançado

## 🤝 Suporte

- Email: contato@miraiconsult.com
- Website: https://system.hellogrowth.online

## 📄 Licença

Propriedade de HelloGrowth / Mirai Consult. Todos os direitos reservados.

---

**Desenvolvido com ❤️ para escalar!**
