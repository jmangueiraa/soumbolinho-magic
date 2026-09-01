import React, { useState } from 'react';
import { QrCode, Copy, Check, Sparkles, ShieldCheck, Zap, Smartphone } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface PixPaymentBoxProps {
  totalAmount: number;
  pixKey?: string;
}

export const PixPaymentBox: React.FC<PixPaymentBoxProps> = ({
  totalAmount,
  pixKey = '21974975884',
}) => {
  const [copied, setCopied] = useState(false);

  // Gera uma string simulada de Pix Copia e Cola padrão BR Code compatível
  const pixCode = `00020126580014br.gov.bcb.pix0136${pixKey}520400005303986540${totalAmount.toFixed(2)}5802BR5925ENCANTANDO FESTA ATELIE6009RIO DE JANEIRO62070503***6304`;

  const handleCopyPix = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pixCode);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = pixCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    pixCode
  )}&bgcolor=ffffff&color=0d9488&margin=1`;

  return (
    <div className="p-4 sm:p-5 bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-teal-50/80 rounded-3xl border-2 border-teal-400 shadow-sm space-y-4 animate-in fade-in duration-300">
      
      {/* Header com Badge Pix */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
            💠
          </div>
          <div>
            <h4 className="font-festive font-bold text-teal-950 text-sm sm:text-base flex items-center gap-1.5">
              <span>Pagamento Instantâneo via Pix</span>
              <span className="bg-teal-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                <Zap className="w-3 h-3 fill-current" /> Recomendado
              </span>
            </h4>
            <p className="text-[11px] text-teal-800 font-medium">
              Aprovação imediata • Sem taxa adicional
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[10px] text-slate-500 block uppercase font-bold">Total a Pagar</span>
          <span className="text-base font-black text-teal-900">{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* QR Code e Instruções */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-white p-4 rounded-2xl border border-teal-200/80 shadow-xs">
        
        {/* Imagem do QR Code */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-2 bg-slate-50 rounded-xl border border-slate-200/80">
          <img
            src={qrCodeUrl}
            alt="QR Code Pix"
            className="w-36 h-36 sm:w-40 sm:h-40 rounded-lg object-contain shadow-xs"
            loading="lazy"
          />
          <span className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1 font-semibold">
            <QrCode className="w-3 h-3 text-teal-600" />
            Escaneie no app do seu banco
          </span>
        </div>

        {/* Instruções passo a passo */}
        <div className="sm:col-span-7 space-y-2.5 text-xs text-slate-700">
          <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
            <Smartphone className="w-4 h-4 text-teal-600" />
            Como pagar com Pix:
          </p>
          <ol className="space-y-1.5 text-[11px] text-slate-600 pl-1 list-decimal list-inside">
            <li>Abra o aplicativo do seu banco ou carteira digital.</li>
            <li>Acesse a opção <strong>Pix &gt; Ler QR Code</strong> ou <strong>Pix Copia e Cola</strong>.</li>
            <li>Cole o código abaixo ou aponte a câmera para o QR Code.</li>
            <li>Confirme o valor de <strong>{formatCurrency(totalAmount)}</strong> e envie o comprovante.</li>
          </ol>
        </div>

      </div>

      {/* Campo Pix Copia e Cola com Botão de Copiar */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-teal-950 flex items-center justify-between">
          <span>Código Pix Copia e Cola:</span>
          <span className="text-[10px] text-teal-700 font-normal">Chave Celular: (21) 97497-5884</span>
        </label>
        
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={pixCode}
            className="flex-1 text-[11px] font-mono px-3 py-2.5 bg-white border border-teal-300 rounded-xl text-slate-600 outline-none select-all truncate"
          />

          <button
            type="button"
            onClick={handleCopyPix}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-teal-600 hover:bg-teal-700 text-white active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Código</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rodapé de Segurança */}
      <div className="flex items-center justify-between pt-1 text-[10px] text-teal-800 font-medium">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          Pagamento 100% Seguro com Envio Automático
        </span>
        <span className="flex items-center gap-0.5 text-teal-700">
          <Sparkles className="w-3 h-3 text-teal-500" />
          Disponível 24 Horas
        </span>
      </div>

    </div>
  );
};
