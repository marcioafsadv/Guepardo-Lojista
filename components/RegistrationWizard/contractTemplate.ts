/**
 * GUEPARDO LOJISTA — Template de Contrato em Visual Law
 * Versão: v1.0-2026-07
 * Design baseado no arquivo: contrato_visual_law_guepardo_v6.pdf
 *
 * Placeholders substituídos dinamicamente:
 *  {{LOJISTA_RAZAO_SOCIAL}}      — Razão Social / Nome do Lojista
 *  {{LOJISTA_CNPJ_CPF}}          — CNPJ ou CPF
 *  {{LOJISTA_NOME_FANTASIA}}     — Nome Fantasia
 *  {{LOJISTA_ENDERECO_COMPLETO}} — Endereço completo formatado
 *  {{LOJISTA_EMAIL}}             — E-mail cadastrado
 *  {{LOJISTA_RESPONSAVEL}}       — Representante Legal / Contato
 *  {{DATA_HORA_ACEITE}}          — Data/hora exata do aceite eletrônico
 *  {{IP_CONEXAO}}                — IP do cliente no momento do aceite
 *  {{CONTA_ID}}                  — UUID da conta no banco de dados
 *  {{VERSAO_CONTRATO}}           — Versão do contrato (ex: v1.0-2026-07)
 */

export const CONTRACT_VERSION = 'v1.0-2026-07';

export function buildContractHtml(data: {
  razaoSocial: string;
  cnpjCpf: string;
  nomeFantasia: string;
  enderecoCompleto: string;
  email: string;
  responsavel: string;
  dataHoraAceite: string;
  ipConexao: string;
  contaId: string;
}): string {
  const template = getContractTemplate();
  return template
    .replace(/\{\{LOJISTA_RAZAO_SOCIAL\}\}/g, data.razaoSocial)
    .replace(/\{\{LOJISTA_CNPJ_CPF\}\}/g, data.cnpjCpf)
    .replace(/\{\{LOJISTA_NOME_FANTASIA\}\}/g, data.nomeFantasia)
    .replace(/\{\{LOJISTA_ENDERECO_COMPLETO\}\}/g, data.enderecoCompleto)
    .replace(/\{\{LOJISTA_EMAIL\}\}/g, data.email)
    .replace(/\{\{LOJISTA_RESPONSAVEL\}\}/g, data.responsavel)
    .replace(/\{\{DATA_HORA_ACEITE\}\}/g, data.dataHoraAceite)
    .replace(/\{\{IP_CONEXAO\}\}/g, data.ipConexao)
    .replace(/\{\{CONTA_ID\}\}/g, data.contaId)
    .replace(/\{\{VERSAO_CONTRATO\}\}/g, CONTRACT_VERSION);
}

function getContractTemplate(): string {
  // Imagem do mascote em base64-src relativa — usa a URL pública do app
  const mascotSrc = '/cheetah-scooter.png';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Contrato de Prestação de Serviços — Guepardo Deliveries</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Chakra+Petch:ital,wght@0,600;1,700&display=swap" rel="stylesheet"/>
  <style>
    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --orange:        #FF6B00;
      --orange-dark:   #c85200;
      --orange-light:  #FFA433;
      --orange-bg:     #fff8f4;
      --orange-border: rgba(255,107,0,0.25);
      --dark-header:   #1a0900;
      --text:          #1a1a1a;
      --text-muted:    #666;
      --text-link:     #c85200;
      --border:        #e8d5c8;
      --bg:            #ffffff;
      --shadow-card:   0 2px 12px rgba(255,107,0,0.06);
      --mono:          'Courier New', 'Lucida Console', monospace;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 13.5px;
      line-height: 1.75;
      -webkit-font-smoothing: antialiased;
    }

    a { color: var(--text-link); }

    /* ── Page Layout ── */
    .page {
      max-width: 794px;
      margin: 0 auto;
      background: #fff;
      padding-bottom: 60px;
    }

    @page { size: A4; margin: 14mm 18mm; }
    @media print {
      body  { background: #fff !important; }
      .page { max-width: 100%; padding: 0; }
      .no-print { display: none !important; }
      .clause { page-break-inside: avoid; }
    }

    /* ── HEADER ── */
    .doc-header {
      background: var(--dark-header);
      padding: 22px 32px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .doc-header .mascot {
      height: 62px;
      width: auto;
      flex-shrink: 0;
      filter: drop-shadow(0 0 12px rgba(255,107,0,0.55));
    }
    .doc-header .brand-text {
      flex: 1;
    }
    .doc-header .brand-name {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 1.5px;
      line-height: 1;
    }
    .doc-header .brand-name span { color: var(--orange); }
    .doc-header .brand-sub {
      font-size: 11px;
      color: rgba(255,255,255,0.5);
      margin-top: 5px;
      letter-spacing: 0.4px;
    }
    .doc-header .doc-meta {
      text-align: right;
      flex-shrink: 0;
    }
    .version-badge {
      display: inline-block;
      background: var(--orange);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      letter-spacing: 1px;
    }
    .doc-meta .doc-type {
      display: block;
      font-size: 10px;
      color: rgba(255,255,255,0.38);
      margin-top: 6px;
    }

    /* ── ORANGE RULE ── */
    .orange-rule {
      height: 5px;
      background: linear-gradient(90deg, var(--orange) 0%, var(--orange-light) 100%);
    }

    /* ── DOCUMENT TITLE ── */
    .doc-title-wrap {
      padding: 32px 40px 24px;
      text-align: center;
      border-bottom: 2px solid var(--orange-border);
    }
    .doc-title-wrap h1 {
      font-family: 'Inter', sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--orange-dark);
      text-transform: uppercase;
      letter-spacing: 1.8px;
      line-height: 1.6;
    }
    .doc-title-wrap p {
      margin-top: 8px;
      font-size: 12px;
      color: var(--text-muted);
    }

    /* ── CONTENT PADDING ── */
    .content { padding: 0 40px; }

    /* ── PARTIES ── */
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin: 28px 0;
    }
    .party-card {
      background: var(--orange-bg);
      border: 1px solid var(--orange-border);
      border-radius: 10px;
      padding: 18px 20px;
    }
    .party-role {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--orange);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .party-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 6px;
    }
    .party-field {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 3px;
      line-height: 1.5;
    }
    .party-field strong { color: var(--text); font-weight: 600; }
    .party-address {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 8px;
      display: flex;
      gap: 4px;
      align-items: flex-start;
    }
    .party-address .pin { flex-shrink: 0; }

    /* ── SECTION / CLAUSE ── */
    .clause { margin-bottom: 30px; }

    .clause-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .clause-num {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--orange);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .clause-title {
      font-size: 12.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--orange-dark);
    }
    .clause-body {
      font-size: 13px;
      line-height: 1.8;
      color: var(--text);
    }
    .clause-body p { margin-bottom: 12px; }

    /* Inline colored links/emphasis like the PDF */
    .clause-body em   { color: var(--orange); font-style: normal; }
    .clause-body strong { font-weight: 600; }

    /* ── HIGHLIGHT / CALLOUT BOX ── */
    .callout {
      display: flex;
      gap: 10px;
      background: var(--orange-bg);
      border-left: 4px solid var(--orange);
      border-radius: 0 8px 8px 0;
      padding: 13px 16px;
      margin: 14px 0;
      font-size: 12.5px;
      line-height: 1.65;
    }
    .callout .callout-icon { flex-shrink: 0; font-size: 15px; margin-top: 1px; }
    .callout.warning { border-left-color: #e53935; background: #fff5f5; }
    .callout.success { border-left-color: #10B981; background: #f0fdf9; }

    /* ── MODALITIES TABLE ── */
    .modalities-table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 10px;
      overflow: hidden;
      margin: 16px 0 22px;
      box-shadow: var(--shadow-card);
    }
    .modalities-table thead tr { background: var(--orange); }
    .modalities-table thead th {
      padding: 11px 14px;
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.4px;
    }
    .modalities-table tbody tr { border-bottom: 1px solid var(--border); }
    .modalities-table tbody tr:nth-child(even) { background: var(--orange-bg); }
    .modalities-table tbody td {
      padding: 14px;
      font-size: 12.5px;
      vertical-align: top;
      line-height: 1.6;
    }
    .modalities-table tbody td strong { color: var(--text); }
    .modalities-table tbody td span.small { font-size: 10.5px; color: #888; display: block; margin-top: 2px; }

    /* Modality badge (chip inside table) */
    .mod-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fff;
      border: 1.5px solid var(--orange-border);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 600;
      color: var(--orange-dark);
      white-space: nowrap;
      margin-bottom: 4px;
    }
    .mod-badge .mod-icon { font-size: 14px; }
    .mod-sub { font-size: 10.5px; color: #999; padding-left: 2px; margin-top: 3px; }

    /* ── INTEGRATION CHIPS ── */
    .integration-chips {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 14px 0;
    }
    .integration-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff;
      border: 1.5px solid var(--orange-border);
      border-radius: 9px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    .integration-chip .chip-icon { font-size: 20px; }

    /* ── SUB-ITEMS (icon + text rows) ── */
    .sub-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 10px;
      padding-left: 4px;
    }
    .sub-item .si-icon {
      font-size: 17px;
      flex-shrink: 0;
      margin-top: 1px;
      width: 22px;
      text-align: center;
    }
    .sub-item .si-text {
      font-size: 13px;
      line-height: 1.7;
      color: var(--text);
    }
    .sub-item .si-text strong { color: var(--orange-dark); }
    /* Colored link-style text matching the PDF */
    .si-text .link { color: var(--orange); }

    /* ── AUDIT TRAIL ── */
    .audit-block {
      background: #0d1117;
      border-radius: 10px;
      padding: 22px 26px;
      margin-top: 36px;
      color: #c9d1d9;
    }
    .audit-title {
      font-family: 'Inter', sans-serif;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--orange);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 16px;
    }
    .audit-row {
      display: flex;
      gap: 0;
      font-family: var(--mono);
      font-size: 11px;
      line-height: 2;
    }
    .audit-key { color: #79c0ff; min-width: 210px; flex-shrink: 0; }
    .audit-val { color: #a5d6ff; }

    /* ── SIGNATURE ── */
    .signature-section {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 2px solid var(--orange-border);
    }
    .acceptance-text {
      font-size: 12px;
      color: var(--text-muted);
      text-align: center;
      margin-bottom: 30px;
      line-height: 1.7;
    }
    .acceptance-text strong { color: var(--text); }
    .acceptance-text a { color: var(--orange); text-decoration: underline; }
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .sig-box { text-align: center; }
    .sig-line-space { height: 48px; }
    .sig-line {
      border-top: 1.5px solid var(--text);
      padding-top: 8px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
    }
    .sig-sub {
      font-size: 10.5px;
      color: var(--orange);
      letter-spacing: 0.5px;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .sig-doc {
      font-size: 10.5px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* ── FOOTER ── */
    .doc-footer {
      margin: 40px 40px 0;
      padding-top: 14px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #aaa;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ═══ HEADER ═══ -->
  <div class="doc-header">
    <img src="${mascotSrc}" alt="Guepardo Mascote" class="mascot"/>
    <div class="brand-text">
      <div class="brand-name">GUEPARDO <span>DELIVERIES</span></div>
      <div class="brand-sub">Plataforma de Intermediação Logística e Tecnologia</div>
    </div>
    <div class="doc-meta">
      <span class="version-badge">{{VERSAO_CONTRATO}}</span>
      <span class="doc-type">Contrato — Aceite Eletrônico</span>
    </div>
  </div>
  <div class="orange-rule"></div>

  <!-- ═══ TITLE ═══ -->
  <div class="doc-title-wrap">
    <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INTERMEDIAÇÃO LOGÍSTICA<br/>E LICENCIAMENTO DE PLATAFORMA TECNOLÓGICA</h1>
    <p>Instrumento Particular firmado <a href="#">eletronicamente</a> entre as partes qualificadas abaixo.</p>
  </div>

  <div class="content">

    <!-- ═══ PARTIES ═══ -->
    <div class="parties-grid">
      <div class="party-card">
        <div class="party-role">🏢 Licenciante / Intermediadora</div>
        <div class="party-name">GUEPARDO DELIVERIES</div>
        <div class="party-field">Plataforma digital de logística e tecnologia</div>
        <div class="party-field" style="margin-top:8px; font-size:11px; color:#bbb;">Representada em conformidade com seus atos constitutivos</div>
      </div>
      <div class="party-card">
        <div class="party-role">🏪 Contratante / Lojista</div>
        <div class="party-name">{{LOJISTA_RAZAO_SOCIAL}}</div>
        <div class="party-field">Nome Fantasia: <strong>{{LOJISTA_NOME_FANTASIA}}</strong></div>
        <div class="party-field">CNPJ/CPF: <strong>{{LOJISTA_CNPJ_CPF}}</strong></div>
        <div class="party-field">Responsável: <strong>{{LOJISTA_RESPONSAVEL}}</strong></div>
        <div class="party-field">E-mail: <strong>{{LOJISTA_EMAIL}}</strong></div>
        <div class="party-address"><span class="pin">📍</span> {{LOJISTA_ENDERECO_COMPLETO}}</div>
      </div>
    </div>

    <!-- ═══ CLÁUSULA 1 — OBJETO ═══ -->
    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">1</div>
        <div class="clause-title">Do Objeto</div>
      </div>
      <div class="clause-body">
        <p>O presente Contrato tem por objeto o <strong>licenciamento de uso não exclusivo</strong> do software <em>Guepardo Lojista</em> (<a href="#">painel operacional</a>) e a <strong>intermediação de serviços de entrega</strong> de produtos e <a href="#">mercadorias</a> sob demanda, realizados por entregadores <a href="#">autônomos</a> cadastrados na <a href="#">plataforma</a> através do aplicativo <em>Guepardo Entregador</em>.</p>
        <div class="callout">
          <span class="callout-icon">⚠️</span>
          <span><strong>Natureza Jurídica:</strong> A plataforma Guepardo atua exclusivamente como <strong>intermediadora de tecnologia</strong> entre o Estabelecimento Comercial (Contratante) e o Prestador de Serviço Autônomo (Entregador), não possuindo qualquer <a href="#">vínculo empregatício</a> com ambos.</span>
        </div>
      </div>
    </div>

    <!-- ═══ CLÁUSULA 2 — MODALIDADES ═══ -->
    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">2</div>
        <div class="clause-title">Das Modalidades de Serviço</div>
      </div>
      <div class="clause-body">
        <p>A plataforma disponibiliza <strong>3 (três) modalidades</strong> de contratação de entregas no painel operacional:</p>
        <table class="modalities-table">
          <thead>
            <tr>
              <th>Modalidade</th>
              <th>Definição</th>
              <th>Tarifas</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="mod-badge"><span class="mod-icon">⚡</span> Guepardo Flash</div>
                <div class="mod-sub">Modo Avulso</div>
              </td>
              <td>Contratação <a href="#">sob demanda</a>, sem exclusividade. <a href="#">Ideal para</a> chamados rápidos.</td>
              <td>
                <strong>R$ 7,00</strong> taxa de saída<br/>
                + <strong>R$ 1,34/km</strong> rodado<br/>
                + <strong>R$ 3,00/parada</strong> extra<br/>
                <span class="small">(máx. 4 paradas)</span>
              </td>
            </tr>
            <tr>
              <td>
                <div class="mod-badge"><span class="mod-icon">🏪</span> Guepardo Open</div>
                <div class="mod-sub">Turno Exclusivo</div>
              </td>
              <td>Reserva de entregador em regime de <a href="#">dedicação exclusiva</a> durante um turno operacional.</td>
              <td>
                <strong>R$ 200,00</strong> por turno<br/>
                <span class="small">Turno adicional (noite): +R$ 200,00</span>
              </td>
            </tr>
            <tr>
              <td>
                <div class="mod-badge"><span class="mod-icon">🤝</span> Guepardo Híbrido</div>
                <div class="mod-sub">Fixo + Taxa</div>
              </td>
              <td>Entregador fixo no estabelecimento com taxa reduzida por saída.</td>
              <td>
                <strong>R$ 50,00</strong> por turno (fixo)<br/>
                + <strong>R$ 7,00</strong> por saída:<br/>
                <span class="small">└ R$ 5,00 ao entregador</span><br/>
                <span class="small">└ R$ 2,00 à plataforma</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ CLÁUSULA 3 — INTEGRAÇÕES ═══ -->
    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">3</div>
        <div class="clause-title">Das Integrações com Marketplaces (iFood &amp; 99Food)</div>
      </div>
      <div class="clause-body">
        <p>A Contratante poderá integrar seus <a href="#">canais de vendas externos</a> à plataforma Guepardo, automatizando o <a href="#">fluxo de chamados</a> de entrega:</p>
        <div class="integration-chips">
          <div class="integration-chip"><span class="chip-icon">🛵</span> iFood</div>
          <div class="integration-chip"><span class="chip-icon">🚗</span> 99Food</div>
        </div>
        <div class="sub-item">
          <span class="si-icon">🏠</span>
          <span class="si-text">A ativação/desativação de recebimento de pedidos de cada marketplace é controlada <strong><span class="link">diretamente no painel Guepardo Lojista</span></strong>, na aba <span class="link">"Integrações"</span>.</span>
        </div>
        <div class="sub-item">
          <span class="si-icon">🔧</span>
          <span class="si-text">Cabe à Contratante <strong>seguir o passo a passo de configuração</strong> (inserção de <a href="#">chaves de API</a>, <a href="#">credenciais</a> e <a href="#">vínculo de loja</a>) para ativação da integração.</span>
        </div>
        <div class="sub-item">
          <span class="si-icon">✅</span>
          <span class="si-text">Após integração ativa, os <a href="#">pedidos</a> dos marketplaces são <strong><span class="link">automaticamente importados</span></strong> para o <span class="link">painel Guepardo</span> para despacho logístico.</span>
        </div>
      </div>
    </div>

    <!-- ═══ CLÁUSULA 4 — CARTEIRA DIGITAL ═══ -->
    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">4</div>
        <div class="clause-title">Da Carteira Digital e Forma de Pagamento</div>
      </div>
      <div class="clause-body">
        <p>A utilização dos serviços ocorre sob regime <strong>pré-pago</strong>, mediante <a href="#">recarga de créditos</a> na <a href="#">Carteira Digital</a> da Contratante.</p>
        <div class="sub-item">
          <span class="si-icon">⚡</span>
          <span class="si-text"><strong>Pix Automático (Asaas):</strong> Compensação em segundos. Taxa fixa de <strong>R$ 1,99 por transação</strong>.</span>
        </div>
        <div class="sub-item">
          <span class="si-icon">💳</span>
          <span class="si-text"><strong>Cartão de Crédito:</strong> Taxa de <strong><a href="#">2,99% sobre o valor</a> + R$ 0,49</strong> por transação.</span>
        </div>
        <div class="sub-item">
          <span class="si-icon">💎</span>
          <span class="si-text"><strong>Pix Manual (Recomendado — Sem Taxas):</strong> Transferência via Pix CNPJ (Mercado Pago). Enviar comprovante ao <a href="#">suporte WhatsApp</a> para ativação imediata.</span>
        </div>
        <div class="callout warning" style="margin-top:16px;">
          <span class="callout-icon">⚠️</span>
          <span><strong>Atenção:</strong> O saldo inserido é de uso exclusivo para contratação de corridas e pagamento de diárias. <strong>Não é passível de resgate ou saque</strong>, salvo em rescisão contratual definitiva.</span>
        </div>
      </div>
    </div>

    <!-- ═══ CLÁUSULA 5 — SEGURANÇA ═══ -->
    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">5</div>
        <div class="clause-title">Das Regras Operacionais e Segurança</div>
      </div>
      <div class="clause-body">
        <div class="sub-item">
          <span class="si-icon">🔐</span>
          <span class="si-text"><strong>Código de Coleta Seguro (PIN):</strong> A entrega da mercadoria ao <a href="#">entregador</a> <em>somente</em> deve ser realizada após confirmação <a href="#">mútua</a> do código gerado no painel e inserido no app do entregador.</span>
        </div>
        <div class="sub-item">
          <span class="si-icon">📍</span>
          <span class="si-text"><strong>Rastreamento:</strong> A plataforma disponibiliza <a href="#">link de rastreamento</a> em tempo real para envio ao <a href="#">cliente final</a>. A Contratante é responsável pela exatidão do endereço de entrega.</span>
        </div>
        <div class="sub-item">
          <span class="si-icon">❌</span>
          <span class="si-text"><strong>Cancelamentos:</strong> Corridas canceladas após aceite e <a href="#">deslocamento</a> do entregador podem gerar taxa proporcional, debitada do <a href="#">saldo operacional</a>.</span>
        </div>
      </div>
    </div>

    <!-- ═══ CLÁUSULA 6 — RESPONSABILIDADES ═══ -->
    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">6</div>
        <div class="clause-title">Das Responsabilidades</div>
      </div>
      <div class="clause-body">
        <div class="sub-item">
          <span class="si-icon">🏪</span>
          <span class="si-text"><strong>Da Contratante:</strong> Responsabilidade exclusiva pela preparação, embalagem correta, conformidade sanitária e fiscal das mercadorias enviadas, bem como pela exatidão do endereço de entrega.</span>
        </div>
        <div class="sub-item">
          <span class="si-icon">🐆</span>
          <span class="si-text"><strong>Da Guepardo:</strong> Garantir o funcionamento e <a href="#">estabilidade do software</a>, e a <a href="#">intermediação ativa dos chamados</a>. A Guepardo não se responsabiliza por extravios decorrentes de culpa exclusiva do entregador autônomo, mas compromete-se a auxiliar na mediação de eventuais sinistros.</span>
        </div>
      </div>
    </div>

    <!-- ═══ CLÁUSULA 7 — VIGÊNCIA ═══ -->
    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">7</div>
        <div class="clause-title">Vigência e Rescisão</div>
      </div>
      <div class="clause-body">
        <p>O presente instrumento vigorará por <strong>prazo indeterminado</strong> a partir da aceitação eletrônica abaixo registrada. Qualquer das partes poderá rescindir o contrato, sem ônus, mediante aviso prévio de <strong>5 (cinco) dias</strong>, bastando solicitação ao suporte oficial.</p>
      </div>
    </div>

    <!-- ═══ AUDIT TRAIL ═══ -->
    <div class="audit-block">
      <div class="audit-title">🔒 Registro de Aceite Eletrônico — Audit Trail</div>
      <div class="audit-row"><span class="audit-key">contrato_versao:</span><span class="audit-val">{{VERSAO_CONTRATO}}</span></div>
      <div class="audit-row"><span class="audit-key">conta_id:</span><span class="audit-val">{{CONTA_ID}}</span></div>
      <div class="audit-row"><span class="audit-key">lojista_cnpj_cpf:</span><span class="audit-val">{{LOJISTA_CNPJ_CPF}}</span></div>
      <div class="audit-row"><span class="audit-key">responsavel:</span><span class="audit-val">{{LOJISTA_RESPONSAVEL}}</span></div>
      <div class="audit-row"><span class="audit-key">email:</span><span class="audit-val">{{LOJISTA_EMAIL}}</span></div>
      <div class="audit-row"><span class="audit-key">data_hora_aceite:</span><span class="audit-val">{{DATA_HORA_ACEITE}}</span></div>
      <div class="audit-row"><span class="audit-key">ip_conexao:</span><span class="audit-val">{{IP_CONEXAO}}</span></div>
      <div class="audit-row"><span class="audit-key">metodo:</span><span class="audit-val">aceite_checkbox_digital</span></div>
    </div>

    <!-- ═══ SIGNATURE ═══ -->
    <div class="signature-section">
      <p class="acceptance-text">
        Aceite eletrônico realizado por <strong>{{LOJISTA_RESPONSAVEL}}</strong> em <strong>{{DATA_HORA_ACEITE}}</strong>, com força de assinatura digital nos termos da <a href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm">Lei nº 14.063/2020</a> (Assinaturas Eletrônicas).
      </p>
      <div class="sig-grid">
        <div class="sig-box">
          <div class="sig-line-space"></div>
          <div class="sig-line">{{LOJISTA_RAZAO_SOCIAL}}</div>
          <div class="sig-sub">Contratante — {{LOJISTA_CNPJ_CPF}}</div>
        </div>
        <div class="sig-box">
          <div class="sig-line-space"></div>
          <div class="sig-line">GUEPARDO DELIVERIES</div>
          <div class="sig-sub">Licenciante / Intermediadora</div>
        </div>
      </div>
    </div>

  </div><!-- /content -->

  <!-- ═══ FOOTER ═══ -->
  <div class="doc-footer">
    <span>Guepardo Deliveries — Plataforma de Logística e Tecnologia</span>
    <span>{{VERSAO_CONTRATO}} — Gerado em {{DATA_HORA_ACEITE}}</span>
  </div>

</div>
</body>
</html>`;
}
