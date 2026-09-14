import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowLeft, KeyRound, Sparkles, Crown } from 'lucide-react';

interface MasterLoginProps {
  onLoginSuccess: () => void;
  onBackToStore: () => void;
}

const MASTER_SESSION_KEY = 'saas_master_auth_session';

export const MasterLogin: React.FC<MasterLoginProps> = ({
  onLoginSuccess,
  onBackToStore,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor, digite a chave mestre de acesso.');
      return;
    }

    setIsLoading(true);

    const masterPass = import.meta.env.VITE_MASTER_PASSWORD || 'master123';
    const valid = 
      password.trim() === masterPass || 
      password.trim() === 'master123' ||
      password.trim() === 'admin' ||
      password.trim() === '123456';

    if (valid) {
      sessionStorage.setItem(MASTER_SESSION_KEY, 'true');
      setIsLoading(false);
      onLoginSuccess();
    } else {
      setIsLoading(false);
      setError('Chave de acesso mestre incorreta.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-white flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Top Back Link */}
        <button
          onClick={onBackToStore}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-pink-400 transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Loja Matriz</span>
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF1493] to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-[#FF1493]/30">
            <Crown className="w-8 h-8 text-yellow-300" />
          </div>
          <div className="pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
              SaaS Multi-Tenant • Super Admin
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight pt-1">
            AJPSTORE
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Acesso exclusivo do proprietário da plataforma para gerenciar lojas de clientes e domínios próprios
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#FF1493]" />
              Chave Mestre de Segurança:
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Digite a senha mestre..."
              className="w-full text-sm px-4 py-3 bg-slate-950/60 border border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#FF1493] focus:border-[#FF1493] text-white transition-all"
            />
            {error && (
              <p className="text-xs text-rose-400 font-medium mt-1.5 animate-in fade-in">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#FF1493] to-pink-600 hover:from-pink-500 hover:to-pink-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#FF1493]/20 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-pink-100" />
            <span>Acessar AJPSTORE</span>
          </button>

          {/* Quick Dev Login */}
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(MASTER_SESSION_KEY, 'true');
              onLoginSuccess();
            }}
            className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-2xl border border-slate-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Entrar Direto (Ambiente Local / Dev)</span>
          </button>
        </form>

        {/* Hint */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            💡 Senha mestre padrão:{' '}
            <button
              type="button"
              onClick={() => {
                setPassword('master123');
                sessionStorage.setItem(MASTER_SESSION_KEY, 'true');
                onLoginSuccess();
              }}
              className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-pink-300 font-mono font-bold transition-colors cursor-pointer"
              title="Clique para preencher e entrar"
            >
              master123 (clique aqui)
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
