import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:/Users/marci/.gemini/antigravity/brain/ebcde4f8-f205-41b5-bb45-02efac1bd546';
const targetDir = 'g:/Outros computadores/Notebook Márcio Augusto/Projetos/GUEPARDO-LOJISTA/public/manual';

const filesToCopy = [
  { src: 'media__1779541554829.png', dest: 'painel_3_operacional.png' },
  { src: 'media__1779541634452.png', dest: 'painel_3_filtros.png' }
];

console.log('Iniciando cópia das imagens do dashboard...');

for (const file of filesToCopy) {
  const srcPath = path.join(artifactsDir, file.src);
  const destPath = path.join(targetDir, file.dest);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copiado: ${file.src} -> ${file.dest}`);
  } else {
    console.error(`Erro: Arquivo fonte não encontrado em ${srcPath}`);
  }
}

console.log('Cópia concluída!');
