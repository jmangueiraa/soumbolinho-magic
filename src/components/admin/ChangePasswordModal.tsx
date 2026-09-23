import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useStoreData } from '../../context/StoreDataContext';
import { supabase } from '../../lib/supabase';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { currentStore, updateCurrentStore } = useTenant();
  const { showNotification } = useStoreData();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentStoreId = currentStore?.id || '';
  const storeName = currentStore?.store_name || currentStore?.name || 'sua loja';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPass) {
      setErrorMessage('Por favor, informe a nova senha de acesso.');
      return;
    }

    if (cleanPass.length < 4) {
      setErrorMessage('A nova senha deve possuir pelo menos 4 caracteres.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setErrorMessage('A confirmação de senha não confere com a nova senha digitada.');
      return;
    }

    if (!currentStoreId || currentStoreId === '__resolving_tenant__') {
      setErrorMessage('Não foi possível identificar a loja ativa. Aguarde o carregamento e tente novamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      let isSuccess = false;

      // 1. Atualiza na tabela stores por ID
      const { data: updatedById, error: errId } = await supabase
        .from('stores')
        .update({ admin_password: cleanPass })
        .eq('id', currentStoreId)
        .select();

      if (!errId && updatedById && updatedById.length > 0) {
        isSuccess = true;
      }

      // 2. Fallback por slug se necessário
      if (!isSuccess && currentStore?.slug) {
        const { data: updatedBySlug, error: errSlug } = await supabase
          .from('stores')
          .update({ admin_password: cleanPass })
          .eq('slug', currentStore.slug)
          .select();

        if (!errSlug && updatedBySlug && updatedBySlug.length > 0) {
          isSuccess = true;
        }
      }

      // 3. Fallback especial se for matriz
      if (!isSuccess && (Boolean(currentStore?.is_matriz) || currentStore?.slug === 'ajpstore' || currentStoreId === 'store_ajpstore')) {
        const { data: updatedMatriz, error: errMatriz } = await supabase
          .from('stores')
          .update({ admin_password: cleanPass })
          .or('slug.eq.ajpstore,id.eq.store_ajpstore,is_matriz.eq.true')
          .select();

        if (!errMatriz && updatedMatriz && updatedMatriz.length > 0) {
          isSuccess = true;
        }
      }

      // 4. Atualiza também na tabela store_users se ela existir
      try {
        await supabase
          .from('store_users')
          .update({ password_hash: cleanPass })
          .eq('store_id', currentStoreId);
      } catch (userErr) {
        console.warn('[ChangePasswordModal] Aviso store_users:', userErr);
      }

      // 5. Atualiza estado em memória e localStorage para persistência e login instantâneo
      if (updateCurrentStore) {
        updateCurrentStore({ admin_password: cleanPass });
      }

      try {
        localStorage.setItem(`store_${currentStoreId}_admin_password`, cleanPass);
        if (currentStore?.slug) {
          localStorage.setItem(`store_${currentStore.slug}_admin_password`, cleanPass);
        }
        localStorage.setItem('soumbolinho_admin_password', cleanPass);
      } catch (lsErr) {
        console.warn('[ChangePasswordModal] localStorage cache error:', lsErr);
      }

      showNotification('Senha do painel admin atualizada com sucesso!', 'success');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      console.error('[ChangePasswordModal] Erro ao salvar senha:', err);
      setErrorMessage(err.message || 'Ocorreu um erro ao atualizar a senha. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Alterar Senha Admin
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Painel da loja: <strong className="text-slate-700 font-semibold">{storeName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 text-indigo-900 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Esta é a senha utilizada para fazer login no painel administrativo <strong className="font-bold">/admin</strong> desta loja. Guarde-a com segurança.
            </p>
          </div>

          {/* Campo Nova Senha */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nova Senha de Acesso
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha (mínimo 4 caracteres)"
                className="w-full pl-10 pr-11 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Campo Confirmar Senha */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Confirmar Nova Senha
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha exatamente igual"
                className="w-full pl-10 pr-11 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title={showConfirm ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                As senhas não coincidem.
              </p>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newPassword.trim() || newPassword !== confirmPassword}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Salvar Nova Senha</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
