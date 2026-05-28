import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:/Users/marci/.gemini/antigravity/brain/ebcde4f8-f205-41b5-bb45-02efac1bd546';
const targetDir = 'g:/Outros computadores/Notebook Márcio Augusto/Projetos/GUEPARDO-LOJISTA/public/manual';

const filesToCopy = [
  { src: 'media__1779540425257.png', dest: 'cadastro_2_dados.png' },
  { src: 'media__1779540591845.png', dest: 'cadastro_2_endereco.png' },
  { src: 'media__1779540669593.png', dest: 'cadastro_2_acesso.png' }
];

console.log('Iniciando cópia das novas imagens de cadastro...');

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

console.log('Cópia finalizada!');
