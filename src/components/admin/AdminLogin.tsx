import React, { useState, useEffect } from 'react';
import { Lock, ArrowLeft, KeyRound, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { supabase } from '../../lib/supabase';
import { applyThemeToDocument } from '../../utils/theme';

interface AdminLoginProps {
  onBackToStore: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onBackToStore }) => {
  const { login, storeConfig, isLoading: isStoreDataLoading } = useStoreData();
  const { currentStore, isResolvingTenant } = useTenant();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const primary = currentStore?.theme_settings?.primary_color || storeConfig.primaryColor;
    if (primary) {
      applyThemeToDocument(storeConfig.colorPalette, primary, storeConfig.themeLayout);
    }
  }, [currentStore?.theme_settings?.primary_color, storeConfig.primaryColor, storeConfig.colorPalette, storeConfig.themeLayout]);

  if (isResolvingTenant || isStoreDataLoading || currentStore.id === '__resolving_tenant__') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-3 font-sans">
        <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
        <p className="text-sm font-semibold text-slate-300">Carregando loja...</p>
      </div>
    );
  }

  const storeName = currentStore?.store_name || currentStore?.name || storeConfig.storeName || 'sua loja';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor, digite a senha de acesso.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // 1. Tenta login síncrono via contexto (currentStore.admin_password ou admin)
    const success = login(password);
    if (success) {
      setIsSubmitting(false);
      return;
    }

    // 2. Consulta direta no banco de dados na tabela stores e store_users
    try {
      if (currentStore?.id) {
        const { data: storeRow } = await supabase
          .from('stores')
          .select('admin_password')
          .eq('id', currentStore.id)
          .maybeSingle();

        if (storeRow?.admin_password && storeRow.admin_password.trim() === password.trim()) {
          sessionStorage.setItem('soumbolinho_admin_auth_session', 'true');
          window.location.reload();
          return;
        }

        const { data: userRow } = await supabase
          .from('store_users')
          .select('password_hash')
          .eq('store_id', currentStore.id)
          .maybeSingle();

        if (userRow?.password_hash && userRow.password_hash.trim() === password.trim()) {
          sessionStorage.setItem('soumbolinho_admin_auth_session', 'true');
          window.location.reload();
          return;
        }
      }
    } catch (err: any) {
      console.warn('Erro ao consultar credenciais no Supabase:', err);
    } finally {
      setIsSubmitting(false);
    }

    setError('Senha incorreta! Digite a senha cadastrada para o painel desta loja.');
  };

  return (
    <div className="min-h-screen bg-theme-light flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-theme-primary/20 animate-in zoom-in-95 duration-200">
        
        {/* Top Back Link */}
        <button
          onClick={onBackToStore}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-theme-primary transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para o Catálogo</span>
        </button>

        {/* Lock Icon & Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-theme-primary text-white flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="font-festive text-2xl font-bold text-slate-900">
            Painel Administrativo
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Acesso restrito para gerenciar o catálogo, preços e categorias da <strong>{storeName}</strong>
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-theme-primary" />
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
              className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
            />
            {error && (
              <p className="text-xs text-rose-500 font-medium mt-1.5 animate-in fade-in">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-black hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Verificando Acesso...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Entrar no Painel</span>
              </>
            )}
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
