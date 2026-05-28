import fs from 'fs';
import path from 'path';
import vm from 'vm';

const htmlPath = 'g:/Outros computadores/Notebook Márcio Augusto/Projetos/GUEPARDO-LOJISTA/manual_lojista.html';

if (!fs.existsSync(htmlPath)) {
  console.error('Arquivo não encontrado!');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');

// Extrair conteúdo entre as tags <script> no final do arquivo
// Para simplificar, pegamos o último bloco <script>
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);

if (!scriptMatch) {
  console.error('Nenhum bloco de script encontrado!');
  process.exit(1);
}

const jsCode = scriptMatch[1];

// Simular alguns objetos globais para que a sintaxe seja verificada sem erros de execução
// se quisermos apenas verificar a sintaxe, podemos usar o construtor vm.Script
try {
  new vm.Script(jsCode);
  console.log('Sintaxe JS verificada com SUCESSO! Nenhum erro de sintaxe encontrado.');
} catch (err) {
  console.error('ERRO DE SINTAXE ENCONTRADO:');
  console.error(err.message);
  console.error('Localização do erro:');
  console.error(err.stack);
}
