from supabase import create_client
import os

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])

print("Adicionando coluna 'keywords' à tabela products_services...")

# Note: Supabase Python client doesn't support ALTER TABLE directly
# We need to use the SQL editor in Supabase dashboard or use a migration
# For now, let's document the SQL that needs to be run

sql_command = """
-- Add keywords column to products_services table
ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Add comment to the column
COMMENT ON COLUMN products_services.keywords IS '10 palavras-chave geradas por IA para o produto/serviço';
"""

print("\nSQL para executar no Supabase SQL Editor:")
print("=" * 60)
print(sql_command)
print("=" * 60)

print("\nNOTA: Execute este SQL no painel do Supabase em:")
print("https://supabase.com/dashboard/project/[seu-project-id]/sql")
