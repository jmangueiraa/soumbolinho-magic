import React, { useState } from 'react';
import { X, Copy, Check, Globe, HelpCircle, Share2 } from 'lucide-react';
import { Store } from '../../types';

interface DnsInstructionsModalProps {
  isOpen: boolean;
  store: Store | null;
  onClose: () => void;
}

export const DnsInstructionsModal: React.FC<DnsInstructionsModalProps> = ({
  isOpen,
  store,
  onClose,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen || !store) return null;

  const rawDomain = store.custom_domain || `${store.slug}.meudominio.com.br`;
  const cleanDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const apexDomain = cleanDomain.replace(/^www\./, '');

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const whatsappMessage = `👋 Olá! Seguem as instruções para apontar o seu domínio próprio para a sua nova loja virtual (${store.name}):

🌐 *Domínio:* ${cleanDomain}

Para ativar, acesse o painel onde registrou seu domínio (Registro.br, Cloudflare, GoDaddy, Hostinger, etc.) e adicione as 2 entradas DNS abaixo:

1️⃣ *Registro CNAME:*
- Nome / Host: *www*
- Destino / Valor: *cname.vercel-dns.com*

2️⃣ *Registro A (Tipo A):*
- Nome / Host: *@* (ou deixe vazio se o painel pedir)
- Endereço IPv4: *76.76.21.21*

⏱️ *Tempo de propagação:* De 15 minutos até 24 horas. Assim que propagar, seu site estará no ar automaticamente com certificado de segurança SSL (HTTPS) ativo!

Qualquer dúvida, estamos à disposição.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0284c7] flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Instruções de Apontamento DNS
            </h2>
            <p className="text-xs text-slate-500">
              Loja: <strong className="text-slate-800">{store.name}</strong> • Domínio: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sky-700 font-bold">{cleanDomain}</code>
            </p>
          </div>
        </div>

        {/* Informative Alert */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5 mb-5">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            O cliente deve adicionar estas duas entradas no gerenciador de DNS (Registro.br, Cloudflare, Hostinger, etc.). Não é necessário alterar servidores NS, apenas criar os registros abaixo.
          </p>
        </div>

        {/* DNS Records Table */}
        <div className="space-y-3 mb-6">
          {/* Record 1: CNAME */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                Registro CNAME
              </span>
              <button
                onClick={() => copyToClipboard('cname.vercel-dns.com', 'cname')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedType === 'cname' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Destino</span>
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Nome / Host:</span>
                <code className="font-bold text-slate-800">www</code>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Destino / Valor:</span>
                <code className="font-mono text-sky-700 font-bold text-[11px]">cname.vercel-dns.com</code>
              </div>
            </div>
          </div>

          {/* Record 2: Apex A Record */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                Registro A (Apex / Raiz)
              </span>
              <button
                onClick={() => copyToClipboard('76.76.21.21', 'a')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedType === 'a' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar IP</span>
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Nome / Host:</span>
                <code className="font-bold text-slate-800">@ <span className="text-slate-400 font-normal">(ou {apexDomain})</span></code>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Endereço IPv4:</span>
                <code className="font-mono text-sky-700 font-bold text-[11px]">76.76.21.21</code>
              </div>
            </div>
          </div>
        </div>

        {/* Action: Copy WhatsApp text */}
        <div className="space-y-3">
          <button
            onClick={() => copyToClipboard(whatsappMessage, 'whatsapp')}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {copiedType === 'whatsapp' ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>Mensagem Pronta Copiada!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Copiar Mensagem Pronta para o WhatsApp</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
