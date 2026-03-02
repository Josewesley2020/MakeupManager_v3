// Servidor WhatsApp Web Automation
// Funciona com Node.js 14+ (versão compatível)

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

console.log('🚀 Iniciando servidor WhatsApp...');
console.log('📱 Node.js version:', process.version);

const app = express();
app.use(cors());
app.use(express.json());

let client;
let isReady = false;
let qrString = '';
let lastQRTime = 0;

// Inicializar cliente WhatsApp
function initializeWhatsApp() {
    console.log('🔄 Inicializando WhatsApp Web...');
    
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log('\n📱 QR Code recebido! Escaneie com seu celular:');
        console.log('👆 WhatsApp > Menu > Aparelhos conectados > Conectar um aparelho');
        qrcode.generate(qr, { small: true });
        qrString = qr;
        lastQRTime = Date.now();
    });

    client.on('ready', () => {
        console.log('✅ WhatsApp Web está pronto!');
        console.log('🌐 API disponível em: http://localhost:3002');
        isReady = true;
        qrString = '';
    });

    client.on('authenticated', () => {
        console.log('🔐 WhatsApp autenticado com sucesso!');
    });

    client.on('auth_failure', msg => {
        console.error('❌ Falha na autenticação:', msg);
        isReady = false;
    });

    client.on('disconnected', (reason) => {
        console.log('🔌 WhatsApp desconectado:', reason);
        isReady = false;
    });

    client.initialize();
}

// Status da API
app.get('/whatsapp/status', (req, res) => {
    res.json({
        ready: isReady,
        hasQR: qrString !== '',
        qrAge: qrString ? Date.now() - lastQRTime : 0,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
    });
});

// Enviar mensagem
app.post('/whatsapp/send', async (req, res) => {
    try {
        console.log('📤 Tentativa de envio:', req.body);

        if (!isReady) {
            return res.status(400).json({
                success: false,
                error: 'WhatsApp não está pronto. Verifique o status.'
            });
        }

        const { number, message } = req.body;
        
        if (!number || !message) {
            return res.status(400).json({
                success: false,
                error: 'Número e mensagem são obrigatórios'
            });
        }

        // Formatar número brasileiro
        let cleanNumber = number.replace(/\D/g, '');
        
        // Adicionar código do Brasil se necessário
        if (!cleanNumber.startsWith('55')) {
            cleanNumber = '55' + cleanNumber;
        }
        
        // Adicionar @c.us para WhatsApp
        const chatId = cleanNumber + '@c.us';
        
        console.log('📞 Enviando para:', chatId);
        console.log('💬 Mensagem:', message);
        
        // Enviar mensagem
        await client.sendMessage(chatId, message);
        
        console.log('✅ Mensagem enviada com sucesso!');
        
        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso',
            to: cleanNumber,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro interno do servidor'
        });
    }
});

// Rota de teste
app.get('/', (req, res) => {
    res.json({
        service: 'WhatsApp Web API',
        status: isReady ? 'ready' : 'connecting',
        nodeVersion: process.version,
        endpoints: [
            'GET /whatsapp/status',
            'POST /whatsapp/send'
        ]
    });
});

// Iniciar servidor
const PORT = 3002;
app.listen(PORT, () => {
    console.log(`🌐 Servidor WhatsApp rodando na porta ${PORT}`);
    console.log(`📡 Status: http://localhost:${PORT}/whatsapp/status`);
    console.log(`🔧 Node.js: ${process.version}`);
    console.log('');
    
    // Aguardar um pouco antes de inicializar WhatsApp
    setTimeout(() => {
        initializeWhatsApp();
    }, 1000);
});

// Capturar erros
process.on('uncaughtException', (error) => {
    console.error('💥 Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Promise rejeitada:', reason);
});