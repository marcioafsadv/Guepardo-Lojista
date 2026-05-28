import fs from 'fs';
import path from 'path';

const projectRoot = 'g:/Outros computadores/Notebook Márcio Augusto/Projetos/GUEPARDO-LOJISTA';
const htmlPath = path.join(projectRoot, 'manual_lojista.html');

if (!fs.existsSync(htmlPath)) {
  console.error('Erro: Arquivo manual_lojista.html não encontrado!');
  process.exit(1);
}

let content = fs.readFileSync(htmlPath, 'utf8');

const targetComment = '    // Slide 8 - Alternância de Imagens';

const switchSlide3MediaCode = `    // Slide 3 - Alternância de Imagens
    let slide3MediaState = 'chamar'; // 'chamar', 'paradas', 'roteiro' ou 'direcionar'
    const slide3Img = document.getElementById('slide3-img');
    const slide3Wrapper = document.getElementById('slide3-wrapper');

    function switchSlide3Media(type) {
      if (type === slide3MediaState) return;
      slide3MediaState = type;

      // Alterar botões ativos
      const tabs = document.querySelectorAll('#slide-3 .media-tab');
      tabs.forEach(tab => {
        if ((type === 'chamar' && tab.innerText.includes('Chamado')) || 
            (type === 'paradas' && tab.innerText.includes('Paradas')) ||
            (type === 'roteiro' && tab.innerText.includes('Roteirização')) ||
            (type === 'direcionar' && tab.innerText.includes('Direcionar'))) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      // Limpar hotspots antigos do slide 3
      const oldHotspots = slide3Wrapper.querySelectorAll('.hotspot');
      oldHotspots.forEach(hs => hs.remove());
      closeHotspotCard(3);

      if (type === 'chamar') {
        slide3Img.src = 'public/manual/pedido_4_chamar.png';
        
        // Criar hotspots de chamar
        const hs1 = document.createElement('div');
        hs1.className = 'hotspot';
        hs1.id = 'hs-3-1';
        hs1.style.top = '42%';
        hs1.style.left = '68%';
        hs1.innerText = '1';
        hs1.onclick = () => showHotspotCard(3, 1, 'Forma de Pagamento', 'Escolha entre Pix, Cartão ou Dinheiro. Para Cartão (Maq.) e Dinheiro, o entregador retorna obrigatoriamente à loja.');
        
        const hs2 = document.createElement('div');
        hs2.className = 'hotspot';
        hs2.id = 'hs-3-2';
        hs2.style.top = '48%';
        hs2.style.left = '50%';
        hs2.innerText = '2';
        hs2.onclick = () => showHotspotCard(3, 2, 'Adicionar Paradas', 'Clique no botão \\'Adicionar Outra Parada (+)\\' para incluir múltiplos clientes em sequência e otimizar a sua logística.');

        slide3Wrapper.appendChild(hs1);
        slide3Wrapper.appendChild(hs2);
      } else if (type === 'paradas') {
        slide3Img.src = 'public/manual/pedido_4_paradas.png';

        // Criar hotspots de paradas
        const hs3 = document.createElement('div');
        hs3.className = 'hotspot';
        hs3.id = 'hs-3-3';
        hs3.style.top = '59%';
        hs3.style.left = '59%';
        hs3.innerText = '3';
        hs3.onclick = () => showHotspotCard(3, 3, 'Rota com 2 Paradas', 'Exemplo de rota roteirizada no mapa ligando a Parada 1 e a Parada 2 de forma direta e sequencial.');

        const hs4 = document.createElement('div');
        hs4.className = 'hotspot';
        hs4.id = 'hs-3-4';
        hs4.style.top = '50%';
        hs4.style.left = '14%';
        hs4.innerText = '4';
        hs4.onclick = () => showHotspotCard(3, 4, 'Custo de Paradas Adicionais', 'Cada parada adicional custa R$ 3,00 + R$ 1,34 por km. Muito lucrativo: você cobra a taxa cheia do cliente e paga menos da metade à plataforma.');

        slide3Wrapper.appendChild(hs3);
        slide3Wrapper.appendChild(hs4);
      } else if (type === 'roteiro') {
        slide3Img.src = 'public/manual/pedido_4_roteiro.png';

        // Criar hotspots de roteiro
        const hs5 = document.createElement('div');
        hs5.className = 'hotspot';
        hs5.id = 'hs-3-5';
        hs5.style.top = '25%';
        hs5.style.left = '88%';
        hs5.innerText = '5';
        hs5.onclick = () => showHotspotCard(3, 5, 'Roteirização Inteligente de até 4 Entregas', 'O sistema organiza e otimiza automaticamente rotas de até 4 entregas simultâneas de forma sequencial inteligente, sem que você precise conhecer as rotas.');

        slide3Wrapper.appendChild(hs5);
      } else if (type === 'direcionar') {
        slide3Img.src = 'public/manual/pedido_4_direcionar.png';

        // Criar hotspots de direcionar
        const hs6 = document.createElement('div');
        hs6.className = 'hotspot';
        hs6.id = 'hs-3-6';
        hs6.style.top = '29%';
        hs6.style.left = '50%';
        hs6.innerText = '6';
        hs6.onclick = () => showHotspotCard(3, 6, 'Direcionamento Direto', 'Selecione e direcione para um entregador específico mais próximo no mapa ou escolha-o diretamente na lista suspensa do painel.');

        slide3Wrapper.appendChild(hs6);
      }
    }

`;

if (content.includes(targetComment)) {
  content = content.replace(targetComment, switchSlide3MediaCode + '\n' + targetComment);
  fs.writeFileSync(htmlPath, content, 'utf8');
  console.log('Função switchSlide3Media inserida com sucesso no HTML!');
} else {
  console.error('Erro: Comentário alvo não encontrado no HTML!');
  process.exit(1);
}
