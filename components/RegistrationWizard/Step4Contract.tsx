import React, { useState, useEffect, useCallback } from 'react';
import { StepProps } from './types';
import { buildContractHtml, CONTRACT_VERSION } from './contractTemplate';
import ContractModal from './ContractModal';
import { FileText, ShieldCheck, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Fetches the client's public IP via ipify (lightweight, free, no auth required). */
async function fetchPublicIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('ipify response not ok');
    const data = await res.json();
    return data.ip ?? '0.0.0.0';
  } catch {
    return '0.0.0.0';
  }
}

/** Formats a Date to "AAAA-MM-DD HH:mm:ss UTC-3" */
function formatBrazilianTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const offset = -3; // BRT
  const local = new Date(date.getTime() + offset * 60 * 60 * 1000);
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ` +
    `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())} UTC${offset}`
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

const Step4Contract: React.FC<StepProps> = ({
  formData,
  updateFormData,
  nextStep,
  prevStep,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ipAddress, setIpAddress] = useState<string>('...');
  const [contractHtml, setContractHtml] = useState<string>('');

  // Pre-fetch IP when step mounts
  useEffect(() => {
    fetchPublicIp().then(ip => setIpAddress(ip));
  }, []);

  // Build the contract HTML with real data (placeholders replaced)
  const buildHtml = useCallback((acceptedAt: string, ip: string): string => {
    const enderecoCompleto = [
      formData.rua,
      formData.numero,
      formData.complemento,
      formData.bairro,
      `${formData.cidade}/${formData.estado}`,
      `CEP ${formData.cep}`,
    ]
      .filter(Boolean)
      .join(', ');

    return buildContractHtml({
      razaoSocial: formData.razaoSocial || formData.nomeFantasia || 'Não informado',
      cnpjCpf: formData.cnpj || 'Não informado',
      nomeFantasia: formData.nomeFantasia || formData.razaoSocial || 'Não informado',
      enderecoCompleto,
      email: formData.email,
      responsavel: formData.nomeResponsavel,
      dataHoraAceite: acceptedAt,
      ipConexao: ip,
      contaId: '[Será gerado após cadastro]',
    });
  }, [formData]);

  // Build preview HTML for the modal (using current time as preview)
  const handleOpenModal = () => {
    const previewTimestamp = formatBrazilianTimestamp(new Date());
    const html = buildHtml(previewTimestamp, ipAddress);
    setContractHtml(html);
    setShowModal(true);
    setHasScrolled(true); // Mark as "viewed" once opened
  };

  // Handle the final acceptance
  const handleAccept = async () => {
    if (!accepted) return;
    setIsLoading(true);

    try {
      const now = new Date();
      const acceptedAt = formatBrazilianTimestamp(now);
      const userAgent = navigator.userAgent;

      // Update wizard form data with audit trail metadata
      updateFormData({
        contractAccepted: true,
        contractAcceptedAt: now.toISOString(),
        contractIpAddress: ipAddress,
        contractUserAgent: userAgent,
        contractVersion: CONTRACT_VERSION,
      });

      // A small delay to ensure state is flushed before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      nextStep(); // Calls handleFinish in WizardForm
    } catch (err) {
      console.error('[Step4Contract] Error during accept:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isFinishEnabled = accepted;

  return (
    <>
      {/* Contract Preview Modal */}
      {showModal && (
        <ContractModal
          htmlContent={contractHtml}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.3)' }}>
              <FileText className="w-6 h-6 text-[#FF6B00]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Termos e Contrato</h2>
              <p className="text-zinc-400 text-sm">Última etapa antes de ativar sua conta.</p>
            </div>
          </div>
        </div>

        {/* Contract Preview Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,107,0,0.2)', background: 'rgba(26,9,0,0.6)' }}
        >
          {/* Card Header */}
          <div className="px-5 py-4 flex items-center gap-3" style={{ background: 'rgba(255,107,0,0.08)', borderBottom: '1px solid rgba(255,107,0,0.15)' }}>
            <ShieldCheck className="w-5 h-5 text-[#FF6B00] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Contrato de Prestação de Serviços</p>
              <p className="text-zinc-400 text-xs truncate">Guepardo Deliveries — Intermediação Logística e Licenciamento de Plataforma</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ background: 'rgba(255,107,0,0.2)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.4)' }}>
              {CONTRACT_VERSION}
            </span>
          </div>

          {/* Summary of Key Points */}
          <div className="p-5 space-y-3">
            {[
              { icon: '⚡', label: 'Guepardo Flash', desc: 'R$ 7,00 saída + R$ 1,34/km' },
              { icon: '🏪', label: 'Guepardo Open', desc: 'R$ 200,00 por turno exclusivo' },
              { icon: '🤝', label: 'Guepardo Híbrido', desc: 'R$ 50,00 fixo + R$ 7,00/saída' },
              { icon: '🛵', label: 'Integrações', desc: 'iFood & 99Food via painel' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-lg w-7 text-center flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-white text-sm font-medium">{item.label}</p>
                  <p className="text-zinc-500 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Open Contract Button */}
          <div className="px-5 pb-5">
            <button
              onClick={handleOpenModal}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: hasScrolled ? 'rgba(16,185,129,0.1)' : 'rgba(255,107,0,0.12)',
                border: `1px solid ${hasScrolled ? 'rgba(16,185,129,0.4)' : 'rgba(255,107,0,0.4)'}`,
                color: hasScrolled ? '#10B981' : '#FF6B00',
              }}
            >
              {hasScrolled ? <CheckCircle2 className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
              {hasScrolled ? 'Contrato Visualizado ✓' : 'Ler o Contrato Completo'}
            </button>
          </div>
        </div>

        {/* Acceptance Checkbox */}
        <label
          className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all select-none"
          style={{
            background: accepted ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${accepted ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              className="sr-only"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              id="contract-accept-checkbox"
            />
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
              style={{
                background: accepted ? '#10B981' : 'rgba(255,255,255,0.08)',
                border: `2px solid ${accepted ? '#10B981' : 'rgba(255,255,255,0.2)'}`,
              }}
            >
              {accepted && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white leading-snug">
              Li e concordo com o <span className="text-[#FF6B00]">Contrato de Prestação de Serviços de Intermediação Logística e Licenciamento de Plataforma</span> da Guepardo Deliveries.
            </p>
            <p className="text-xs text-zinc-500 mt-1.5">
              Ao aceitar, você concorda que este documento possui validade jurídica nos termos da Lei nº 14.063/2020.
            </p>
          </div>
        </label>

        {/* IP / Audit Info */}
        {accepted && (
          <div className="rounded-xl px-4 py-3 text-xs space-y-1 animate-in fade-in duration-300"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,107,0,0.15)', fontFamily: 'monospace' }}>
            <p className="text-zinc-500">🔒 Metadados que serão registrados no aceite:</p>
            <p className="text-zinc-400">📅 Data/Hora: <span className="text-[#FF6B00]">{formatBrazilianTimestamp(new Date())}</span></p>
            <p className="text-zinc-400">🌐 IP: <span className="text-[#FF6B00]">{ipAddress}</span></p>
            <p className="text-zinc-400">📄 Versão: <span className="text-[#FF6B00]">{CONTRACT_VERSION}</span></p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-2">
          <button
            onClick={prevStep}
            disabled={isLoading}
            className="text-zinc-500 font-semibold px-6 py-3 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            Voltar
          </button>
          <button
            onClick={handleAccept}
            disabled={!isFinishEnabled || isLoading}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg"
            style={{
              background: isFinishEnabled && !isLoading
                ? 'linear-gradient(135deg, #FF6B00 0%, #FFA433 100%)'
                : 'rgba(255,255,255,0.08)',
              color: isFinishEnabled && !isLoading ? '#fff' : '#555',
              boxShadow: isFinishEnabled && !isLoading ? '0 4px 20px rgba(255,107,0,0.4)' : 'none',
              cursor: isFinishEnabled && !isLoading ? 'pointer' : 'not-allowed',
              transform: isFinishEnabled && !isLoading ? undefined : 'none',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando Aceite...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Aceitar e Finalizar Cadastro
              </>
            )}
          </button>
        </div>

        {/* Warning if not yet accepted */}
        {!accepted && (
          <div className="flex items-center gap-2 text-xs text-amber-500/70 px-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>É necessário aceitar o contrato para concluir o cadastro.</span>
          </div>
        )}
      </div>
    </>
  );
};

export default Step4Contract;
