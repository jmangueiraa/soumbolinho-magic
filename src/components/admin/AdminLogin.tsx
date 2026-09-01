import React, { useState } from 'react';
import { Lock, ArrowLeft, KeyRound, Sparkles, ShieldCheck } from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';

interface AdminLoginProps {
  onBackToStore: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onBackToStore }) => {
  const { login, storeConfig } = useStoreData();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor, digite a senha de acesso.');
      return;
    }

    const success = login(password);
    if (!success) {
      setError('Senha incorreta! Dica: a senha padrão é "admin".');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFEBF6] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#FFA6DF]/50 animate-in zoom-in-95 duration-200">
        
        {/* Top Back Link */}
        <button
          onClick={onBackToStore}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B3A8C] hover:text-[#FF1493] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para o Catálogo</span>
        </button>

        {/* Lock Icon & Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF1493] to-[#D8B4F8] text-white flex items-center justify-center mx-auto shadow-md shadow-[#FF1493]/20">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="font-festive text-2xl font-bold text-slate-900">
            Painel Administrativo
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Acesso restrito para gerenciar o catálogo, preços e categorias da <strong>{storeConfig.storeName}</strong>
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#FF1493]" />
              Senha de Administrador:
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Digite a senha..."
              className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493] focus:border-[#FF1493] transition-all"
            />
            {error && (
              <p className="text-xs text-rose-500 font-medium mt-1.5 animate-in fade-in">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-black hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-[#FFD1EC]" />
            <span>Entrar no Painel</span>
          </button>
        </form>

        {/* Hint Box */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            💡 Senha de demonstração: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700 font-bold">admin</code>
          </p>
        </div>

      </div>
    </div>
  );
};
