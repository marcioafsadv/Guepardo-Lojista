import fs from 'fs';
import path from 'path';

const projectRoot = 'g:/Outros computadores/Notebook Márcio Augusto/Projetos/GUEPARDO-LOJISTA';
const htmlPath = path.join(projectRoot, 'manual_lojista.html');
const outputPath = path.join(projectRoot, 'manual_lojista_portatil.html');

console.log('Iniciando compilação do manual portátil...');

if (!fs.existsSync(htmlPath)) {
  console.error(`Erro: Arquivo original não encontrado em ${htmlPath}`);
  process.exit(1);
}

let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Lista de arquivos para converter
// 1. Áudio
// 2. Imagem da logo
// 3. Imagens do manual
const assets = [
  { ref: 'Rugido do Guepardo - Principal.mpeg', type: 'audio/mpeg' },
  { ref: 'public/cheetah-scooter.png', type: 'image/png' },
  { ref: 'public/manual/capa.png', type: 'image/png' },
  { ref: 'public/manual/cadastro_1_login.png', type: 'image/png' },
  { ref: 'public/manual/cadastro_2_dados.png', type: 'image/png' },
  { ref: 'public/manual/cadastro_2_endereco.png', type: 'image/png' },
  { ref: 'public/manual/cadastro_2_acesso.png', type: 'image/png' },
  { ref: 'public/manual/painel_3_operacional.png', type: 'image/png' },
  { ref: 'public/manual/painel_3_filtros.png', type: 'image/png' },
  { ref: 'public/manual/pedido_4_chamar.png', type: 'image/png' },
  { ref: 'public/manual/pedido_4_paradas.png', type: 'image/png' },
  { ref: 'public/manual/pedido_4_roteiro.png', type: 'image/png' },
  { ref: 'public/manual/pedido_4_direcionar.png', type: 'image/png' },
  { ref: 'public/manual/pedido_5_monitoramento.png', type: 'image/png' },
  { ref: 'public/manual/pedido_5_codigo.png', type: 'image/png' },
  { ref: 'public/manual/pedido_6_rastreio.png', type: 'image/png' },
  { ref: 'public/manual/cadastro_3_clientes.png', type: 'image/png' },
  { ref: 'public/manual/carteira_4_dashboard.png', type: 'image/png' },
  { ref: 'public/manual/carteira_5_recarga.png', type: 'image/png' },
  { ref: 'public/manual/carteira_6_manual.png', type: 'image/png' },
  { ref: 'public/manual/carteira_7_qrcode.png', type: 'image/png' },
  { ref: 'public/manual/historico_1_lista.png', type: 'image/png' },
  { ref: 'public/manual/historico_2_detalhes.png', type: 'image/png' },
  { ref: 'public/manual/historico_3_desempenho.png', type: 'image/png' },
  { ref: 'public/manual/config_1_dados.png', type: 'image/png' },
  { ref: 'public/manual/config_2_logistica.png', type: 'image/png' },
  { ref: 'public/manual/config_3_suporte.png', type: 'image/png' },
  { ref: 'public/manual/config_4_alertas.png', type: 'image/png' },
  { ref: 'public/manual/contatos.png', type: 'image/png' }
];

let replacedCount = 0;

for (const asset of assets) {
  const assetPath = path.join(projectRoot, asset.ref);
  if (fs.existsSync(assetPath)) {
    console.log(`Convertendo: ${asset.ref}...`);
    const fileBuffer = fs.readFileSync(assetPath);
    const base64String = fileBuffer.toString('base64');
    const dataUri = `data:${asset.type};base64,${base64String}`;
    
    // Substituir src="ref" ou src='ref' ou simplesmente a referência de texto no script
    // Usar RegExp para substituir todas as ocorrências de forma segura
    const escapedRef = asset.ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Expressões regulares para cobrir src= e src= com aspas simples/duplas e caminhos simples
    const regexSrcDouble = new RegExp(`src="` + escapedRef + `"`, 'g');
    const regexSrcSingle = new RegExp(`src='` + escapedRef + `'`, 'g');
    const regexPlain = new RegExp(`'${escapedRef}'`, 'g');
    const regexPlainDouble = new RegExp(`"${escapedRef}"`, 'g');

    let matches = 0;
    
    if (htmlContent.match(regexSrcDouble)) {
      htmlContent = htmlContent.replace(regexSrcDouble, `src="${dataUri}"`);
      matches++;
    }
    if (htmlContent.match(regexSrcSingle)) {
      htmlContent = htmlContent.replace(regexSrcSingle, `src='${dataUri}'`);
      matches++;
    }
    if (htmlContent.match(regexPlain)) {
      htmlContent = htmlContent.replace(regexPlain, `'${dataUri}'`);
      matches++;
    }
    if (htmlContent.match(regexPlainDouble)) {
      htmlContent = htmlContent.replace(regexPlainDouble, `"${dataUri}"`);
      matches++;
    }

    if (matches > 0) {
      replacedCount++;
    } else {
      console.warn(`Aviso: Referência não encontrada no HTML para ${asset.ref}`);
    }
  } else {
    console.error(`Erro: Arquivo não encontrado em ${assetPath}`);
  }
}

fs.writeFileSync(outputPath, htmlContent, 'utf8');
console.log(`Compilação concluída com sucesso!`);
console.log(`Arquivo portátil salvo em: ${outputPath}`);
console.log(`Total de ativos convertidos e embutidos: ${replacedCount}`);
const stats = fs.statSync(outputPath);
console.log(`Tamanho final do arquivo: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
