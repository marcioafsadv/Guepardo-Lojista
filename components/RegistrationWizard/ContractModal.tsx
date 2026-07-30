import React, { useRef } from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';

interface ContractModalProps {
  htmlContent: string;
  onClose: () => void;
}

const ContractModal: React.FC<ContractModalProps> = ({ htmlContent, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <div className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: '1px solid rgba(255,107,0,0.3)' }}>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: '#1a0900', borderBottom: '1px solid rgba(255,107,0,0.25)' }}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#FF6B00]" />
            <div>
              <p className="text-white font-semibold text-sm">Contrato de Prestação de Serviços</p>
              <p className="text-zinc-400 text-xs">Guepardo Deliveries — Leia com atenção antes de aceitar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(255,107,0,0.15)', border: '1px solid rgba(255,107,0,0.4)', color: '#FF6B00' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,0,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,107,0,0.15)')}
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contract Content — rendered inside iframe for CSS isolation */}
        <div className="flex-1 overflow-hidden bg-white">
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title="Contrato de Prestação de Serviços Guepardo"
            className="w-full h-full border-none"
            sandbox="allow-same-origin allow-scripts allow-modals"
          />
        </div>
      </div>
    </div>
  );
};

export default ContractModal;
