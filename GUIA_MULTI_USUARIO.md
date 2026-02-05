# 🚀 Guia de Implementação - Sistema Multi-Usuário

## Visão Geral

Sistema completo de gerenciamento de equipe com níveis de acesso, convites por email e controle de permissões.

---

## 📋 Funcionalidades Implementadas

### 1. **4 Níveis de Acesso**

| Nível | Permissões |
|-------|-----------|
| **Admin** (Dono) | Acesso total incluindo gerenciar equipe |
| **Manager** (Gerente) | Gerenciar formulários, leads, produtos, analytics, mensagens e exportar dados |
| **Member** (Membro) | Gerenciar leads, visualizar analytics e enviar mensagens |
| **Viewer** (Visualizador) | Apenas visualizar relatórios e analytics |

### 2. **Gerenciamento de Equipe**
- ✅ Listar todos os membros da equipe
- ✅ Convidar novos membros por email
- ✅ Definir nível de acesso ao convidar
- ✅ Suspender/reativar membros
- ✅ Remover membros da equipe
- ✅ Visualizar status (Pendente, Ativo, Suspenso)

### 3. **Sistema de Convites**
- ✅ Email automático com senha temporária
- ✅ Link de aceite de convite
- ✅ Convites expiram em 7 dias
- ✅ Forçar troca de senha no primeiro login
- ✅ Criação automática de usuário no Supabase Auth

### 4. **Controle de Permissões**
- ✅ Hook `usePermissions` para verificar permissões
- ✅ Componente `ProtectedRoute` para proteger rotas
- ✅ Row Level Security (RLS) no banco de dados
- ✅ Middleware de permissões

---

## 🗄️ Estrutura de Banco de Dados

### Tabelas Criadas

1. **`team_members`** - Membros da equipe
2. **`role_permissions`** - Permissões por role
3. **`team_invites`** - Convites pendentes

### Executar no Supabase

```sql
-- Copie e execute o conteúdo de:
database/team_members.sql
```

---

## 📁 Arquivos Criados

### Componentes
- `components/TeamManagement.tsx` - Tela de gerenciamento de equipe
- `app/accept-invite/page.tsx` - Página de aceite de convite

### Hooks
- `hooks/usePermissions.ts` - Hook de permissões e componente ProtectedRoute

### Edge Functions
- `supabase/functions/send-team-invite/index.ts` - Envio de emails de convite

### Documentação
- `components/Navigation_UPDATE.tsx` - Instruções para atualizar navegação

---

## 🔧 Passos de Instalação

### 1. Criar Tabelas no Supabase

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Copie e execute o conteúdo de `database/team_members.sql`

### 2. Configurar Edge Function

```bash
# Instalar Supabase CLI
npm install -g supabase

# Fazer deploy da função
cd hellogrowth-platform
supabase functions deploy send-team-invite --project-ref SEU_PROJECT_REF
```

### 3. Configurar Variáveis de Ambiente

Adicione no Supabase Dashboard > Settings > Edge Functions:

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 4. Atualizar Navigation.tsx

Adicione o item de menu "Equipe" seguindo as instruções em `components/Navigation_UPDATE.tsx`

### 5. Atualizar MainApp.tsx

Adicione o case para renderizar TeamManagement:

```typescript
import TeamManagement from '@/components/TeamManagement';
import { ProtectedRoute } from '@/hooks/usePermissions';

// No switch do activeView:
case 'team':
  return (
    <ProtectedRoute requiredPermission="manage_team" currentUser={currentUser}>
      <TeamManagement currentUser={currentUser} />
    </ProtectedRoute>
  );
```

---

## 🎯 Como Usar

### Para Admins (Donos)

1. Acesse **Equipe** no menu
2. Clique em **Convidar Membro**
3. Preencha nome, email e nível de acesso
4. Clique em **Enviar Convite**
5. O membro receberá um email com senha temporária

### Para Membros Convidados

1. Abra o email de convite
2. Copie a senha temporária
3. Clique no link de aceite
4. Cole a senha temporária
5. Defina uma nova senha
6. Clique em **Aceitar Convite e Entrar**

---

## 🔒 Controle de Acesso

### Proteger uma Funcionalidade

```typescript
import { ProtectedRoute } from '@/hooks/usePermissions';

<ProtectedRoute 
  requiredPermission="manage_forms" 
  currentUser={currentUser}
>
  <FormularioComponent />
</ProtectedRoute>
```

### Verificar Permissão no Código

```typescript
import { usePermissions } from '@/hooks/usePermissions';

const { hasPermission, role, isOwner } = usePermissions(currentUser);

if (hasPermission('manage_team')) {
  // Mostrar botão de gerenciar equipe
}

if (isOwner) {
  // Funcionalidade exclusiva do dono
}
```

### Ocultar Botões Baseado em Permissão

```typescript
{hasPermission('export_data') && (
  <button onClick={handleExport}>
    Exportar Dados
  </button>
)}
```

---

## 📧 Configurar Resend (Envio de Emails)

1. Crie uma conta em [resend.com](https://resend.com)
2. Adicione seu domínio e verifique DNS
3. Gere uma API Key
4. Adicione a API Key nas variáveis de ambiente do Supabase

---

## 🧪 Testar o Sistema

### Teste 1: Convidar Membro

1. Login como admin
2. Acesse "Equipe"
3. Convide um membro com email válido
4. Verifique se o email foi recebido
5. Aceite o convite e faça login

### Teste 2: Verificar Permissões

1. Login como membro (não admin)
2. Tente acessar "Equipe" - deve ser bloqueado
3. Acesse "Oportunidades" - deve funcionar

### Teste 3: Suspender Membro

1. Login como admin
2. Suspenda um membro
3. Tente fazer login com o membro suspenso
4. Deve ser bloqueado

---

## 🎨 Personalização

### Adicionar Nova Permissão

1. Adicione na tabela `role_permissions`:

```sql
INSERT INTO role_permissions (role, permission) VALUES
  ('manager', 'nova_permissao');
```

2. Adicione no tipo `Permission` em `usePermissions.ts`:

```typescript
export type Permission = 
  | 'manage_team'
  | 'nova_permissao' // Nova permissão
  | ...
```

3. Use no código:

```typescript
{hasPermission('nova_permissao') && (
  <NovaFuncionalidade />
)}
```

---

## 🐛 Troubleshooting

### Email não está sendo enviado

- Verifique se a API Key do Resend está correta
- Verifique os logs da Edge Function no Supabase
- Teste manualmente a Edge Function

### Membro não consegue fazer login

- Verifique se o status é "active" na tabela `team_members`
- Verifique se o usuário foi criado no Supabase Auth
- Verifique se a senha está correta

### Permissões não estão funcionando

- Verifique se as permissões foram inseridas na tabela `role_permissions`
- Verifique se o hook `usePermissions` está sendo usado corretamente
- Verifique os logs do console do navegador

---

## 📊 Monitoramento

### Verificar Membros Ativos

```sql
SELECT * FROM team_members WHERE status = 'active';
```

### Verificar Convites Pendentes

```sql
SELECT * FROM team_invites WHERE expires_at > NOW();
```

### Verificar Permissões de um Role

```sql
SELECT * FROM role_permissions WHERE role = 'manager';
```

---

## 🚀 Próximos Passos (Opcional)

1. **Logs de Auditoria** - Registrar todas as ações dos membros
2. **Notificações** - Notificar admin quando membro aceita convite
3. **Convite em Massa** - Convidar múltiplos membros de uma vez
4. **Roles Customizados** - Permitir criar roles personalizados
5. **Limite de Membros** - Limitar número de membros por plano

---

## 📞 Suporte

Se tiver dúvidas ou problemas, verifique:
- Logs do Supabase Dashboard
- Console do navegador (F12)
- Logs da Edge Function

---

**Desenvolvido com ❤️ para HelloGrowth**
