
import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';

interface PickupValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onValidate: (code: string) => void;
  courierName: string;
  correctCode?: string; // KEEP FOR BACKWARD COMPATIBILITY but optional
  validCodes?: string[]; // NEW: Array of valid codes for the batch
}

export const PickupValidationModal: React.FC<PickupValidationModalProps> = ({ isOpen, onClose, onValidate, courierName, correctCode, validCodes }) => {
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
      setCode(['', '', '', '']);
      setError(false);
      // Reset refs array to ensure clean slate
      inputsRef.current = inputsRef.current.slice(0, 4);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    // Strict digit only validation
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next
    if (value && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit on fill (check current value + previous state)
    if (index === 3 && value) {
      // Construct the full code using the new value for the current index
      const fullCode = newCode.join('');

      // CHECK: If validCodes is provided, check if fullCode is in it.
      // ELSE: Check against correctCode.
      const isValid = validCodes && validCodes.length > 0
        ? validCodes.includes(fullCode)
        : fullCode === correctCode;

      if (isValid) {
        onValidate(fullCode);
      } else {
        setError(true);
        // Clear code after brief error display
        setTimeout(() => {
          if (isOpen) { // Check if still open to avoid state update on unmount
            setCode(['', '', '', '']);
            inputsRef.current[0]?.focus();
            setError(false);
          }
        }, 1000);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-guepardo-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <X size={20} />
        </button>

        <div className="bg-guepardo-accent p-6 flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold uppercase tracking-wide">Validação de Coleta</h2>
          <p className="text-sm font-medium opacity-80 text-center mt-1">
            Solicite o código ao entregador<br /><strong>{courierName}</strong>
          </p>
        </div>

        <div className="p-8">
          <div className="flex justify-center gap-3 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputsRef.current[index] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none transition-all bg-white dark:bg-guepardo-gray-900 text-gray-900 dark:text-white ${error
                  ? 'border-red-500 bg-red-50 text-red-600 animate-shake'
                  : 'border-gray-200 focus:border-guepardo-accent focus:ring-4 focus:ring-guepardo-accent/20'
                  }`}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                autoComplete="off"
              />
            ))}
          </div>

          <p className="text-xs text-center text-gray-500 mb-6">
            O código está visível na tela do celular do entregador.
          </p>

          {error && (
            <p className="text-center text-red-600 font-bold text-sm mb-4 animate-pulse">
              Código incorreto. Tente novamente.
            </p>
          )}

          <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 flex items-center gap-3 border border-gray-100 dark:border-white/5">
            <ShieldCheck className="text-green-600" size={20} />
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
              Esta validação garante que o pedido correto foi entregue ao profissional correto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
