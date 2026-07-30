/**
 * GUEPARDO LOJISTA — Template de Contrato em Visual Law
 * Versão: v1.0-2026-07
 * Paleta: Laranja Chocolate (marca Guepardo)
 *
 * Placeholders substituídos dinamicamente em runtime:
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
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contrato de Prestação de Serviços — Guepardo Deliveries</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Chakra+Petch:ital,wght@0,600;1,700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --primary: #FF6B00;
      --primary-dark: #c85200;
      --primary-light: #FFA433;
      --bg: #ffffff;
      --bg-card: #fff8f4;
      --bg-header: #1a0900;
      --text: #1a1a1a;
      --text-muted: #555;
      --border: #e8d5c8;
      --border-accent: rgba(255, 107, 0, 0.35);
      --table-head: #FF6B00;
      --table-even: #fff3eb;
      --badge-bg: rgba(255, 107, 0, 0.12);
      --shadow: 0 4px 24px rgba(255, 107, 0, 0.08);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      line-height: 1.7;
    }

    /* ── PAGE LAYOUT ── */
    .page {
      max-width: 794px; /* A4 width */
      margin: 0 auto;
      padding: 0 40px 60px;
      background: #fff;
    }

    @page {
      size: A4;
      margin: 15mm 20mm;
    }
    @media print {
      body { background: #fff !important; }
      .page { padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
      .clause { page-break-inside: avoid; }
    }

    /* ── HEADER ── */
    .doc-header {
      background: var(--bg-header);
      color: #fff;
      padding: 28px 36px;
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 0;
      border-radius: 0;
    }
    .doc-header .brand-icon {
      font-size: 48px;
      line-height: 1;
      filter: drop-shadow(0 0 10px rgba(255,107,0,0.6));
    }
    .doc-header .brand-text h1 {
      font-family: 'Chakra Petch', sans-serif;
      font-style: italic;
      font-size: 22px;
      color: #fff;
      letter-spacing: 1.5px;
    }
    .doc-header .brand-text h1 span { color: var(--primary); }
    .doc-header .brand-text p {
      font-size: 11px;
      color: rgba(255,255,255,0.55);
      margin-top: 3px;
      letter-spacing: 0.5px;
    }
    .doc-header .doc-badge {
      margin-left: auto;
      text-align: right;
    }
    .doc-header .doc-badge .version {
      display: inline-block;
      background: var(--primary);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      letter-spacing: 1px;
    }
    .doc-header .doc-badge .doc-type {
      display: block;
      font-size: 10px;
      color: rgba(255,255,255,0.4);
      margin-top: 5px;
    }

    /* ── ORANGE ACCENT BAR ── */
    .accent-bar {
      height: 5px;
      background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%);
      margin-bottom: 36px;
    }

    /* ── TITLE BLOCK ── */
    .doc-title-block {
      text-align: center;
      padding: 24px 0 20px;
      border-bottom: 2px solid var(--border-accent);
      margin-bottom: 32px;
    }
    .doc-title-block h2 {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-dark);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .doc-title-block p {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* ── PARTIES CARD ── */
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 32px;
    }
    .party-card {
      background: var(--bg-card);
      border: 1px solid var(--border-accent);
      border-radius: 10px;
      padding: 18px 20px;
    }
    .party-card .party-role {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--primary);
      margin-bottom: 10px;
    }
    .party-card .party-field {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    .party-card .party-field strong {
      color: var(--text);
      font-weight: 600;
    }

    /* ── SECTION / CLAUSE ── */
    .clause {
      margin-bottom: 28px;
    }
    .clause-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }
    .clause-number {
      background: var(--primary);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .clause-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--primary-dark);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .clause-body {
      font-size: 13px;
      color: var(--text);
      line-height: 1.75;
    }
    .clause-body p {
      margin-bottom: 10px;
    }

    /* ── SUBCLÁUSULAS ── */
    .sub-item {
      display: flex;
      gap: 10px;
      margin-bottom: 8px;
      padding-left: 8px;
    }
    .sub-item .sub-icon {
      font-size: 16px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .sub-item .sub-text {
      font-size: 13px;
      color: var(--text);
    }
    .sub-item .sub-text strong {
      color: var(--primary-dark);
    }

    /* ── MODALITIES TABLE ── */
    .modalities-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 20px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .modalities-table thead tr {
      background: var(--table-head);
      color: #fff;
    }
    .modalities-table thead th {
      padding: 12px 14px;
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .modalities-table tbody tr:nth-child(even) {
      background: var(--table-even);
    }
    .modalities-table tbody tr:hover {
      background: rgba(255,107,0,0.06);
    }
    .modalities-table tbody td {
      padding: 12px 14px;
      font-size: 12.5px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    .modality-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--badge-bg);
      border: 1px solid var(--border-accent);
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 600;
      color: var(--primary-dark);
      white-space: nowrap;
    }

    /* ── HIGHLIGHT BOX ── */
    .highlight-box {
      background: var(--bg-card);
      border-left: 4px solid var(--primary);
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
      margin: 14px 0;
      font-size: 12.5px;
    }
    .highlight-box.warning {
      border-left-color: #e53935;
      background: #fff5f5;
    }
    .highlight-box.success {
      border-left-color: #10B981;
      background: #f0fdf9;
    }

    /* ── INTEGRATION BADGES ── */
    .integration-chips {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 12px 0;
    }
    .integration-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #fff;
      border: 1.5px solid var(--border-accent);
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
    }
    .integration-chip .chip-icon { font-size: 18px; }

    /* ── AUDIT TRAIL BLOCK ── */
    .audit-block {
      background: #0d1117;
      color: #c9d1d9;
      border-radius: 10px;
      padding: 20px 24px;
      margin-top: 32px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      line-height: 1.9;
    }
    .audit-block .audit-title {
      color: var(--primary);
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .audit-row { display: flex; gap: 12px; }
    .audit-key { color: #79c0ff; flex-shrink: 0; min-width: 200px; }
    .audit-val { color: #a5d6ff; }

    /* ── SIGNATURE AREA ── */
    .signature-section {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 2px solid var(--border-accent);
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 20px;
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      border-top: 1.5px solid var(--text);
      padding-top: 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
    }
    .signature-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* ── FOOTER ── */
    .doc-footer {
      margin-top: 40px;
      padding-top: 16px;
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

  <!-- HEADER -->
  <div class="doc-header">
    <div class="brand-icon">🐆</div>
    <div class="brand-text">
      <h1>GUEPARDO <span>DELIVERIES</span></h1>
      <p>Plataforma de Intermediação Logística e Tecnologia</p>
    </div>
    <div class="doc-badge">
      <span class="version">{{VERSAO_CONTRATO}}</span>
      <span class="doc-type">Contrato — Aceite Eletrônico</span>
    </div>
  </div>
  <div class="accent-bar"></div>

  <!-- TITLE -->
  <div class="doc-title-block">
    <h2>Contrato de Prestação de Serviços de Intermediação Logística<br/>e Licenciamento de Plataforma Tecnológica</h2>
    <p>Instrumento Particular firmado eletronicamente entre as partes qualificadas abaixo.</p>
  </div>

  <!-- PARTIES -->
  <div class="parties-grid">
    <div class="party-card">
      <div class="party-role">🏢 Licenciante / Intermediadora</div>
      <div class="party-field"><strong>GUEPARDO DELIVERIES</strong></div>
      <div class="party-field">Plataforma digital de logística e tecnologia</div>
      <div class="party-field" style="margin-top:8px; font-size:11px; color:#999;">Representada em conformidade com seus atos constitutivos</div>
    </div>
    <div class="party-card">
      <div class="party-role">🏪 Contratante / Lojista</div>
      <div class="party-field"><strong>{{LOJISTA_RAZAO_SOCIAL}}</strong></div>
      <div class="party-field">Nome Fantasia: <strong>{{LOJISTA_NOME_FANTASIA}}</strong></div>
      <div class="party-field">CNPJ/CPF: <strong>{{LOJISTA_CNPJ_CPF}}</strong></div>
      <div class="party-field">Responsável: <strong>{{LOJISTA_RESPONSAVEL}}</strong></div>
      <div class="party-field">E-mail: <strong>{{LOJISTA_EMAIL}}</strong></div>
      <div class="party-field" style="margin-top:4px;">📍 {{LOJISTA_ENDERECO_COMPLETO}}</div>
    </div>
  </div>

  <!-- CLÁUSULA 1 — OBJETO -->
  <div class="clause">
    <div class="clause-header">
      <div class="clause-number">1</div>
      <div class="clause-title">Do Objeto</div>
    </div>
    <div class="clause-body">
      <p>O presente Contrato tem por objeto o <strong>licenciamento de uso não exclusivo</strong> do software <em>Guepardo Lojista</em> (painel operacional) e a <strong>intermediação de serviços de entrega</strong> de produtos e mercadorias sob demanda, realizados por entregadores autônomos cadastrados na plataforma através do aplicativo <em>Guepardo Entregador</em>.</p>
      <div class="highlight-box">
        <strong>⚠️ Natureza Jurídica:</strong> A plataforma Guepardo atua exclusivamente como <strong>intermediadora de tecnologia</strong> entre o Estabelecimento Comercial (Contratante) e o Prestador de Serviço Autônomo (Entregador), não possuindo qualquer vínculo empregatício com ambos.
      </div>
    </div>
  </div>

  <!-- CLÁUSULA 2 — MODALIDADES -->
  <div class="clause">
    <div class="clause-header">
      <div class="clause-number">2</div>
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
            <td><span class="modality-badge">⚡ Guepardo Flash</span><div style="font-size:10px;color:#888;margin-top:4px;">Modo Avulso</div></td>
            <td>Contratação sob demanda, sem exclusividade. Ideal para chamados rápidos.</td>
            <td>
              <strong>R$ 7,00</strong> taxa de saída<br/>
              + <strong>R$ 1,34/km</strong> rodado<br/>
              + <strong>R$ 3,00/parada</strong> extra<br/>
              <span style="font-size:10px;color:#888;">(máx. 4 paradas)</span>
            </td>
          </tr>
          <tr>
            <td><span class="modality-badge">🏪 Guepardo Open</span><div style="font-size:10px;color:#888;margin-top:4px;">Turno Exclusivo</div></td>
            <td>Reserva de entregador em regime de dedicação exclusiva durante um turno operacional.</td>
            <td>
              <strong>R$ 200,00</strong> por turno<br/>
              <span style="font-size:10px;color:#888;">Turno adicional (noite): +R$ 200,00</span>
            </td>
          </tr>
          <tr>
            <td><span class="modality-badge">🤝 Guepardo Híbrido</span><div style="font-size:10px;color:#888;margin-top:4px;">Fixo + Taxa</div></td>
            <td>Entregador fixo no estabelecimento com taxa reduzida por saída.</td>
            <td>
              <strong>R$ 50,00</strong> por turno (fixo)<br/>
              + <strong>R$ 7,00</strong> por saída:<br/>
              <span style="font-size:10px;">└ R$ 5,00 ao entregador</span><br/>
              <span style="font-size:10px;">└ R$ 2,00 à plataforma</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- CLÁUSULA 3 — INTEGRAÇÕES -->
  <div class="clause">
    <div class="clause-header">
      <div class="clause-number">3</div>
      <div class="clause-title">Das Integrações com Marketplaces (iFood &amp; 99Food)</div>
    </div>
    <div class="clause-body">
      <p>A Contratante poderá integrar seus canais de vendas externos à plataforma Guepardo, automatizando o fluxo de chamados de entrega:</p>
      <div class="integration-chips">
        <div class="integration-chip"><span class="chip-icon">🛵</span> <span>iFood</span></div>
        <div class="integration-chip"><span class="chip-icon">🚗</span> <span>99Food</span></div>
      </div>
      <div class="sub-item">
        <span class="sub-icon">📲</span>
        <span class="sub-text">A ativação/desativação de recebimento de pedidos de cada marketplace é controlada <strong>diretamente no painel Guepardo Lojista</strong>, na aba "Integrações".</span>
      </div>
      <div class="sub-item">
        <span class="sub-icon">🔧</span>
        <span class="sub-text">Cabe à Contratante <strong>seguir o passo a passo de configuração</strong> (inserção de chaves de API, credenciais e vínculo de loja) para ativação da integração.</span>
      </div>
      <div class="sub-item">
        <span class="sub-icon">✅</span>
        <span class="sub-text">Após integração ativa, os pedidos dos marketplaces são <strong>automaticamente importados</strong> para o painel Guepardo para despacho logístico.</span>
      </div>
    </div>
  </div>

  <!-- CLÁUSULA 4 — CARTEIRA DIGITAL -->
  <div class="clause">
    <div class="clause-header">
      <div class="clause-number">4</div>
      <div class="clause-title">Da Carteira Digital e Forma de Pagamento</div>
    </div>
    <div class="clause-body">
      <p>A utilização dos serviços ocorre sob regime <strong>pré-pago</strong>, mediante recarga de créditos na Carteira Digital da Contratante.</p>
      <div class="sub-item">
        <span class="sub-icon">⚡</span>
        <span class="sub-text"><strong>Pix Automático (Asaas):</strong> Compensação em segundos. Taxa fixa de <strong>R$ 1,99 por transação</strong>.</span>
      </div>
      <div class="sub-item">
        <span class="sub-icon">💳</span>
        <span class="sub-text"><strong>Cartão de Crédito:</strong> Taxa de <strong>2,99% sobre o valor + R$ 0,49</strong> por transação.</span>
      </div>
      <div class="sub-item">
        <span class="sub-icon">💎</span>
        <span class="sub-text"><strong>Pix Manual (Recomendado — Sem Taxas):</strong> Transferência via Pix CNPJ (Mercado Pago). Enviar comprovante ao suporte WhatsApp para ativação imediata.</span>
      </div>
      <div class="highlight-box warning">
        <strong>⚠️ Atenção:</strong> O saldo inserido é de uso exclusivo para contratação de corridas e pagamento de diárias. <strong>Não é passível de resgate ou saque</strong>, salvo em rescisão contratual definitiva.
      </div>
    </div>
  </div>

  <!-- CLÁUSULA 5 — SEGURANÇA OPERACIONAL -->
  <div class="clause">
    <div class="clause-header">
      <div class="clause-number">5</div>
      <div class="clause-title">Das Regras Operacionais e Segurança</div>
    </div>
    <div class="clause-body">
      <div class="sub-item">
        <span class="sub-icon">🔐</span>
        <span class="sub-text"><strong>Código de Coleta Seguro (PIN):</strong> A entrega da mercadoria ao entregador <em>somente</em> deve ser realizada após confirmação mútua do código gerado no painel e inserido no app do entregador.</span>
      </div>
      <div class="sub-item">
        <span class="sub-icon">📍</span>
        <span class="sub-text"><strong>Rastreamento:</strong> A plataforma disponibiliza link de rastreamento em tempo real para envio ao cliente final. A Contratante é responsável pela exatidão do endereço de entrega.</span>
      </div>
      <div class="sub-item">
        <span class="sub-icon">❌</span>
        <span class="sub-text"><strong>Cancelamentos:</strong> Corridas canceladas após aceite e deslocamento do entregador podem gerar taxa proporcional, debitada do saldo operacional.</span>
      </div>
    </div>
  </div>

  <!-- CLÁUSULA 6 — RESPONSABILIDADES -->
  <div class="clause">
    <div class="clause-header">
      <div class="clause-number">6</div>
      <div class="clause-title">Das Responsabilidades</div>
    </div>
    <div class="clause-body">
      <div class="sub-item">
        <span class="sub-icon">🏪</span>
        <span class="sub-text"><strong>Da Contratante:</strong> Responsabilidade exclusiva pela preparação, embalagem correta, conformidade sanitária e fiscal das mercadorias enviadas, bem como pela exatidão do endereço de entrega.</span>
      </div>
      <div class="sub-item">
        <span class="sub-icon">🐆</span>
        <span class="sub-text"><strong>Da Guepardo:</strong> Garantir o funcionamento e estabilidade do software, e a intermediação ativa dos chamados. A Guepardo não se responsabiliza por extravios decorrentes de culpa exclusiva do entregador autônomo, mas compromete-se a auxiliar na mediação de eventuais sinistros.</span>
      </div>
    </div>
  </div>

  <!-- CLÁUSULA 7 — VIGÊNCIA -->
  <div class="clause">
    <div class="clause-header">
      <div class="clause-number">7</div>
      <div class="clause-title">Vigência e Rescisão</div>
    </div>
    <div class="clause-body">
      <p>O presente instrumento vigorará por <strong>prazo indeterminado</strong> a partir da aceitação eletrônica abaixo registrada. Qualquer das partes poderá rescindir o contrato, sem ônus, mediante aviso prévio de <strong>5 (cinco) dias</strong>, bastando solicitação ao suporte oficial.</p>
    </div>
  </div>

  <!-- AUDIT TRAIL -->
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

  <!-- SIGNATURE -->
  <div class="signature-section">
    <p style="font-size:12px; color:#555; text-align:center;">Aceite eletrônico realizado por <strong>{{LOJISTA_RESPONSAVEL}}</strong> em <strong>{{DATA_HORA_ACEITE}}</strong>, com força de assinatura digital nos termos da Lei nº 14.063/2020 (Assinaturas Eletrônicas).</p>
    <div class="signature-grid" style="margin-top:30px;">
      <div class="signature-box">
        <div style="height:50px;"></div>
        <div class="signature-line">{{LOJISTA_RAZAO_SOCIAL}}</div>
        <div class="signature-sub">CONTRATANTE — {{LOJISTA_CNPJ_CPF}}</div>
      </div>
      <div class="signature-box">
        <div style="height:50px;"></div>
        <div class="signature-line">GUEPARDO DELIVERIES</div>
        <div class="signature-sub">LICENCIANTE / INTERMEDIADORA</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="doc-footer">
    <span>Guepardo Deliveries — Plataforma de Logística e Tecnologia</span>
    <span>Versão {{VERSAO_CONTRATO}} — Gerado em {{DATA_HORA_ACEITE}}</span>
  </div>

</div>
</body>
</html>`;
}
