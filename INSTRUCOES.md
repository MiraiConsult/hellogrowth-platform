# 🚀 Guia Rápido de Instalação - HelloGrowth 2.0

Parabéns! Seu sistema foi reestruturado para uma arquitetura profissional. Siga estes passos para colocar no ar.

---

## 🎯 **Passo 1: Criar o Repositório no GitHub**

1.  **Acesse o GitHub:** [github.com/new](https://github.com/new)
2.  **Nome do Repositório:** `hellogrowth-platform`
3.  **Tipo:** Marque como **Privado** (muito importante!)
4.  Clique em **"Create repository"**.

5.  **Copie a URL do repositório**. Será algo como `https://github.com/seu-usuario/hellogrowth-platform.git`.

---

## 🎯 **Passo 2: Enviar o Código para o GitHub**

Abra o terminal na pasta deste projeto (`hellogrowth-nextjs`) e execute os comandos abaixo, **substituindo a URL** pela que você copiou:

```bash
# Conecta seu projeto local com o repositório no GitHub
git remote add origin https://github.com/seu-usuario/hellogrowth-platform.git

# Envia o código para o GitHub
git push -u origin main
```

Pronto! Seu código está seguro e versionado.

---

## 🎯 **Passo 3: Deploy no Vercel**

1.  **Crie uma conta gratuita no Vercel:** [vercel.com/signup](https://vercel.com/signup)
    *   Recomendo usar a opção **"Continue with GitHub"**.

2.  **Crie um Novo Projeto:**
    *   No seu dashboard, clique em **"Add New..."** > **"Project"**.
    *   Na lista, encontre e clique em **"Import"** no repositório `hellogrowth-platform`.

3.  **Configure o Projeto:**
    *   **Framework Preset:** Deve detectar **Next.js** automaticamente.
    *   **Environment Variables (Variáveis de Ambiente):**
        *   Abra esta seção e adicione todas as chaves do seu arquivo `.env.local`.
        *   **IMPORTANTE:** Cole a chave real do `GEMINI_API_KEY`.

4.  **Clique em "Deploy"** e aguarde a mágica acontecer!

---

## 🎯 **Passo 4: Configurar o Domínio**

1.  Após o deploy, no painel do seu projeto no Vercel, vá para **"Settings"** > **"Domains"**.
2.  Digite `system.hellogrowth.online` e clique em **"Add"**.
3.  O Vercel te dará as instruções de DNS. Você precisará ir no seu provedor de domínio (GoDaddy, HostGator, etc.) e atualizar os registros conforme o Vercel indicar.

---

## 🎯 **Passo 5: SQL no Supabase**

Não se esqueça de executar o script SQL para a integração com o Gmail.

1.  Acesse seu projeto no Supabase.
2.  Vá para **"SQL Editor"**.
3.  Cole e execute o seguinte código:

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

CREATE INDEX idx_gmail_user_id ON gmail_connections(user_id);
```

---

## 🎉 **Pronto!**

Seu sistema está no ar, com arquitetura profissional, deploy automático e pronto para escalar!

**Qualquer dúvida, é só me chamar!**
