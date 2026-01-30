# Deploy - Minha Presença Digital + Remoção Jornada do Cliente

## Alterações Realizadas

### 1. Nova Tela "Minha Presença Digital"
A tela foi completamente refeita para:
- **Buscar dados reais do Google** via Google Places API
- **Analisar com IA (Gemini)** para gerar insights personalizados
- **Mostrar pontos fortes e fracos** do perfil
- **Gerar recomendações específicas** de melhoria
- **Exibir últimas avaliações** do Google

### 2. Remoção da "Jornada do Cliente"
- Removida do menu de navegação
- Removida do MainApp
- Referências atualizadas no IntelligenceCenter

## Arquivos para Deploy

### Pasta `components/` (substituir)
- `DigitalDiagnostic.tsx` - Nova tela de presença digital
- `Navigation.tsx` - Menu sem Jornada do Cliente
- `MainApp.tsx` - Sem referência à CustomerJourney
- `IntelligenceCenter.tsx` - Atualizado

### Pasta `app/api/google-places/` (criar)
- `route.ts` - API para buscar dados do Google Places

## Configuração

O arquivo `.env.local` já está incluído com a chave do Google Places API configurada:
```
GOOGLE_PLACES_API_KEY=AIzaSyBsyDdAB-ZzDr9Grw0xpAfSUOPngM37Qnk
```

**Importante**: Substitua o `.env.local` existente pelo novo arquivo incluído neste pacote.

## Passos para Deploy

1. Extraia os arquivos do ZIP
2. Copie os arquivos `.tsx` para `components/`
3. Crie a pasta `app/api/google-places/` e copie `route.ts`
4. (Opcional) Adicione `GOOGLE_PLACES_API_KEY` no `.env.local`
5. Faça commit e push no GitHub Desktop
6. A Vercel fará o deploy automaticamente

## Notas

- A tabela `digital_diagnostics` já foi atualizada no Supabase com os novos campos
- Se não configurar a API do Google, o sistema ainda funciona com análise básica
- O Gemini já está configurado e será usado para gerar análises
