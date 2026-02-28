
async function sendWhatsAppMessage() {
    const baseUrl = 'http://localhost:8080';
    const apikey = 'sb_secret_qHGa2O1Tfmcf_KesbX0HMg_LqX78sjL';
    const instance = 'lojista';
    const phoneNumber = '5511955996164';
    const message = '🚀 *Teste de Conexão Guepardo Lojista*\n\nSeu WhatsApp foi conectado com sucesso via Docker Evolution API!\n\n✅ Integração 100% Funcional.';

    console.log(`📡 Enviando mensagem para ${phoneNumber}...`);

    try {
        // Formato simplificado compatível com Evolution API v2
        const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apikey
            },
            body: JSON.stringify({
                number: phoneNumber,
                text: message,
                delay: 1200,
                linkPreview: false
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Resposta da API:', JSON.stringify(data, null, 2));
            console.log('\n--- TESTE CONCLUÍDO COM SUCESSO ---');
        } else {
            console.error('❌ Erro da API:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ Erro no envio:', error.message);
    }
}

sendWhatsAppMessage();
