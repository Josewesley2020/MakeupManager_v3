-- Fix: Garantir que a relationship entre appointments e partners existe
-- Execute este arquivo se houver erro "Could not find a relationship"

-- 1. Verificar se a FK existe
DO $$
BEGIN
  -- Remover FK antiga se existir (pode estar mal configurada)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'appointments_partner_id_fkey'
  ) THEN
    ALTER TABLE appointments DROP CONSTRAINT appointments_partner_id_fkey;
  END IF;
END $$;

-- 2. Adicionar coluna partner_id se não existir
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS partner_id UUID;

-- 2.5. LIMPAR DADOS ÓRFÃOS (partner_ids que não existem em partners)
-- Isso resolve o erro de FK violation
UPDATE appointments 
SET partner_id = NULL 
WHERE partner_id IS NOT NULL 
  AND partner_id NOT IN (SELECT id FROM partners);

-- Mostrar quantos registros foram limpos
DO $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cleaned_count 
  FROM appointments 
  WHERE partner_id IS NOT NULL 
    AND partner_id NOT IN (SELECT id FROM partners);
  
  RAISE NOTICE 'Registros com partner_id órfão limpos: %', cleaned_count;
END $$;

-- 3. Criar FK corretamente
ALTER TABLE appointments 
  ADD CONSTRAINT appointments_partner_id_fkey 
  FOREIGN KEY (partner_id) 
  REFERENCES partners(id) 
  ON DELETE SET NULL;

-- 4. Resetar cache do schema do PostgREST (força refresh)
NOTIFY pgrst, 'reload schema';

-- 5. Verificação final
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='appointments'
  AND kcu.column_name='partner_id';
