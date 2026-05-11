# Guia de Configuração de Variáveis de Ambiente no Vercel

Para que o **Hello Growth Platform** funcione perfeitamente em produção, você precisará configurar as variáveis de ambiente no painel do Vercel. 

Este guia lista todas as variáveis exigidas pelo projeto, agrupadas por serviço, e explica exatamente onde obter cada valor.

---

## 1. Como adicionar variáveis no Vercel

1. Acesse o [painel do Vercel](https://vercel.com/dashboard) e clique no seu projeto (`hellogrowth-platform`).
2. No menu superior, clique em **Settings** (Configurações).
3. No menu lateral esquerdo, clique em **Environment Variables**.
4. Para cada variável listada abaixo, cole o nome no campo **Key** e o valor no campo **Value**.
5. Clique em **Save**.

> **Dica de Ouro:** Não é necessário fazer o upload de arquivos `.env` para o GitHub. Na verdade, por segurança, arquivos `.env` nunca devem ser commitados no repositório. O Vercel injetará essas variáveis automaticamente durante o deploy e a execução [1].

---

## 2. Variáveis de Banco de Dados (Supabase)

Essas chaves conectam sua aplicação ao banco de dados e à autenticação.

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | No painel do Supabase: Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No painel do Supabase: Project Settings > API > Project API Keys (anon, public) |
| `SUPABASE_SERVICE_ROLE_KEY` | No painel do Supabase: Project Settings > API > Project API Keys (service_role, secret). **Atenção:** Esta chave tem poderes de admin e nunca deve ser exposta no frontend. |
| `SUPABASE_WEBHOOK_SIGNING_SECRET` | Usado para validar webhooks que vêm do Supabase. Configure um secret forte e coloque o mesmo valor aqui e na configuração do webhook no Supabase. |

---

## 3. Variáveis de Inteligência Artificial (OpenAI & Gemini)

Responsáveis pelo cérebro da IA (análise de leads, geração de respostas, etc).

| Variável | Onde encontrar |
|---|---|
| `OPENAI_API_KEY` | No painel da OpenAI: [API Keys](https://platform.openai.com/api-keys). Crie uma nova secret key. |
| `GEMINI_API_KEY` | No Google AI Studio: [Get API Key](https://aistudio.google.com/app/apikey). Necessário para as integrações que usam o modelo do Google. |

---

## 4. Variáveis de Mensageria (WhatsApp Cloud API)

Essas chaves permitem que a plataforma envie e receba mensagens do WhatsApp oficialmente pela Meta.

| Variável | Onde encontrar |
|---|---|
| `WHATSAPP_API_KEY` ou `WHATSAPP_BUSINESS_TOKEN` | No painel de Desenvolvedores da Meta (App Dashboard) > WhatsApp > API Setup > Temporary access token (ou Token permanente via System User). |
| `WHATSAPP_PHONE_NUMBER_ID` | No mesmo painel acima (API Setup), procure por "Phone number ID". |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Uma senha criada por você. Ao configurar o Webhook no painel da Meta, você inventa um token (ex: `hello_growth_token_2026`). Coloque esse mesmo valor nesta variável. |
| `WHATSAPP_WEBHOOK_SIGNING_SECRET` | No App Dashboard da Meta > App Settings > Basic > App Secret. |

---

## 5. Variáveis de Processamento em Background (Inngest)

O Inngest gerencia os cron jobs (como o relatório semanal) e filas de mensagens.

| Variável | Onde encontrar |
|---|---|
| `INNGEST_EVENT_KEY` | No painel do Inngest: [Event Keys](https://app.inngest.com/env/production/keys). Crie uma nova chave para enviar eventos. |
| `INNGEST_SIGNING_KEY` | No painel do Inngest, após vincular sua URL do Vercel, o Inngest fornecerá uma Signing Key para validar que as requisições estão vindo deles. |

---

## 6. Variáveis de Pagamento (Stripe & Asaas)

Gerenciam as assinaturas dos clientes (tenants) da plataforma.

| Variável | Onde encontrar |
|---|---|
| `STRIPE_SECRET_KEY` | No painel do Stripe: Developers > API keys > Secret key. Começa com `sk_live_...` ou `sk_test_...`. |
| `STRIPE_WEBHOOK_SECRET` | No painel do Stripe: Developers > Webhooks. Após adicionar seu endpoint (ex: `https://seu-app.vercel.app/api/stripe/webhook`), clique em "Reveal" no Signing secret. Começa com `whsec_...`. |
| `ASAAS_API_KEY` | (Opcional, caso use Asaas como gateway alternativo). No painel do Asaas: Configurações > Integração > Chave de API. |

---

## 7. Variáveis de Email (Resend)

Responsáveis pelo envio de relatórios semanais e notificações de escalada.

| Variável | Onde encontrar |
|---|---|
| `RESEND_API_KEY` | No painel do Resend: [API Keys](https://resend.com/api-keys). Crie uma chave com permissão de envio. |
| `ANALYSIS_EMAIL_FROM` | O email remetente. Exemplo: `relatorios@hellogrowth.com.br` (precisa estar verificado no Resend). |
| `ANALYSIS_EMAIL_FROM_NAME` | O nome do remetente. Exemplo: `Hello Growth`. |

---

## 8. Variáveis do Google (Login e Places)

| Variável | Onde encontrar |
|---|---|
| `GOOGLE_CLIENT_ID` | No [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials > OAuth 2.0 Client IDs [2]. |
| `GOOGLE_CLIENT_SECRET` | Na mesma tela acima, ao clicar no seu Client ID. |
| `GOOGLE_PLACES_API_KEY` | No Google Cloud Console > APIs & Services > Credentials > API Keys (com a API do Google Places ativada). |

---

## 9. Variáveis do Sistema

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_APP_URL` | A URL final do seu projeto no Vercel (ex: `https://app.hellogrowth.com.br`). |
| `NODE_ENV` | Use `production` para o ambiente final. |
| `CRON_SECRET` | Uma senha segura criada por você para proteger rotas de cron manuais (caso existam fora do Inngest). |

---

## Próximos Passos após Configurar as Variáveis

1. Após salvar todas as variáveis no Vercel, você precisará fazer um **Redeploy** para que as mudanças tenham efeito.
2. Vá na aba **Deployments** do Vercel, clique nos três pontos ao lado do último deploy e selecione **Redeploy**.
3. Acesse a plataforma e verifique a página **Saúde do Sistema** (System Health) para confirmar se os serviços conectaram com sucesso.

---
### Referências
[1] Base de Conhecimento do Agente: "Não Fazer Upload de Arquivos .env para GitHub"
[2] Base de Conhecimento do Agente: "Como Obter Credenciais de Service Account do Google Cloud"
