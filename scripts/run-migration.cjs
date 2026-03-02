const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('Executando migração: Adicionando campo payment_down_payment_expected...')

    // Usar uma abordagem diferente - executar SQL diretamente
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Erro ao conectar ao banco:', error)
      return
    }

    console.log('✅ Conexão com banco estabelecida!')
    console.log('⚠️  Execute manualmente no Supabase Dashboard o SQL:')
    console.log(`
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_down_payment_expected DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN appointments.payment_down_payment_expected IS 'Valor da entrada esperado/planejado para o cliente';
    `)

  } catch (error) {
    console.error('Erro:', error)
  }
}

runMigration()