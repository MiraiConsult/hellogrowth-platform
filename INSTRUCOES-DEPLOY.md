# Instruções de Deploy - Ajustes Estratégico HelloGrowth

## Arquivos Modificados

Os seguintes arquivos foram atualizados com os 6 ajustes solicitados:

1. **InsightDetailView.tsx** - Componente de detalhes do cliente
2. **IntelligenceCenter.tsx** - Componente principal do Centro de Inteligência

## Ajustes Implementados

| # | Ajuste | Descrição |
|---|--------|-----------|
| 1 | Contagem desconsiderando concluídos | Os cards de insight agora mostram apenas clientes ativos (não concluídos/dispensados) |
| 2 | Corrigir discrepância 9 vs 7 | A contagem está alinhada entre os componentes |
| 3 | Reorganizar layout | Tela de detalhes mais compacta, mensagens na posição correta |
| 4 | Coach IA nos detalhes | Botão "Coach de Vendas IA" agora aparece dentro da tela de detalhes |
| 5 | Botão Salvar anotações | Botão explícito com exibição de data/hora da última atualização |
| 6 | Histórico de interações | Nova seção que registra todas as atividades do cliente |

## Tabela Criada no Supabase

Uma nova tabela `interaction_history` foi criada automaticamente no banco de dados para armazenar o histórico de interações. Não é necessária nenhuma ação adicional.

## Passos para Deploy via GitHub Desktop

### 1. Abrir o repositório no GitHub Desktop
- Abra o GitHub Desktop
- Selecione o repositório `hellogrowth-platform`

### 2. Substituir os arquivos
Copie os dois arquivos desta pasta para a pasta `components/` do seu repositório local:
- `InsightDetailView.tsx` → `components/InsightDetailView.tsx`
- `IntelligenceCenter.tsx` → `components/IntelligenceCenter.tsx`

### 3. Commit das alterações
- No GitHub Desktop, você verá as alterações nos dois arquivos
- Escreva uma mensagem de commit, por exemplo: "Ajustes na parte Estratégico - contagem, layout, Coach IA, histórico"
- Clique em "Commit to main"

### 4. Push para o GitHub
- Clique em "Push origin" para enviar as alterações

### 5. Deploy automático na Vercel
- A Vercel detectará automaticamente as alterações e fará o deploy
- Aguarde alguns minutos e acesse: https://hellogrowth-platform1-mirai-consult.vercel.app

## Verificação Pós-Deploy

Após o deploy, verifique os seguintes pontos:

1. **Centro de Inteligência** - Os cards devem mostrar apenas clientes ativos
2. **Tela de Detalhes** - O botão "Coach de Vendas IA" deve aparecer no topo da coluna direita
3. **Anotações** - Deve haver um botão "Salvar" e a data da última atualização
4. **Histórico** - Clique em "Histórico de Interações" para expandir e ver as atividades registradas

## Suporte

Em caso de dúvidas ou problemas, entre em contato.
