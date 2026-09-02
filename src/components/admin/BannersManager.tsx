import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Sliders, 
  Image as ImageIcon,
  CheckCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { BannerSlide } from '../../types';
import { useStoreData } from '../../context/StoreDataContext';
import { BannerFormModal } from './BannerFormModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const BannersManager: React.FC = () => {
  const { banners, deleteBanner, toggleBannerStatus } = useStoreData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bannerToEdit, setBannerToEdit] = useState<BannerSlide | null>(null);

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    banner: BannerSlide | null;
  }>({
    isOpen: false,
    banner: null,
  });

  const handleOpenCreate = () => {
    setBannerToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (banner: BannerSlide) => {
    setBannerToEdit(banner);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteModalState.banner) {
      deleteBanner(deleteModalState.banner.id);
    }
    setDeleteModalState({ isOpen: false, banner: null });
  };

  const mainBanner = banners[0] || null;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#FFA6DF]/40 shadow-sm">
        <div>
          <h2 className="font-festive text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#FF1493]" />
            <span>Banner Principal do Topo (Imagem Única)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure a imagem do banner em destaque no topo da sua loja
          </p>
        </div>

        <button
          onClick={() => {
            if (mainBanner) {
              handleOpenEdit(mainBanner);
            } else {
              handleOpenCreate();
            }
          }}
          className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 border border-black"
        >
          <ImageIcon className="w-4 h-4 text-[#FFD1EC]" />
          <span>{mainBanner ? 'Alterar Imagem do Banner' : 'Adicionar Banner'}</span>
        </button>
      </div>

      {/* Visualização do Banner Principal */}
      {mainBanner ? (
        <div className="bg-white rounded-3xl p-6 border border-[#FFA6DF]/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Status na Loja:
              </span>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                mainBanner.isActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {mainBanner.isActive ? '● Ativo e Visível' : '○ Pausado'}
              </span>
            </div>

            <button
              onClick={() => toggleBannerStatus(mainBanner.id)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer ${
                mainBanner.isActive
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mainBanner.isActive ? 'Pausar Exibição' : 'Ativar Exibição'}
            </button>
          </div>

          {/* Imagem do Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-[300px] bg-slate-50">
            {mainBanner.imageUrl ? (
              <img
                src={mainBanner.imageUrl}
                alt={mainBanner.altText || 'Banner'}
                className="w-full h-auto max-h-[300px] object-cover rounded-2xl block"
              />
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                Nenhuma imagem definida para o banner.
              </div>
            )}
          </div>

          {/* Ações e Link */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              {mainBanner.linkUrl ? (
                <span>Link ao clicar: <strong>{mainBanner.linkUrl}</strong></span>
              ) : (
                <span>Sem link de redirecionamento</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEdit(mainBanner)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Imagem / Link</span>
              </button>

              <button
                onClick={() => setDeleteModalState({ isOpen: true, banner: mainBanner })}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                title="Remover banner"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">Nenhum banner cadastrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Clique no botão acima para adicionar a imagem do banner principal do topo da loja.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-black text-white text-xs font-bold rounded-xl"
          >
            Adicionar Imagem do Banner
          </button>
        </div>
      )}

      {/* Modal Form */}
      <BannerFormModal
        isOpen={isModalOpen}
        bannerToEdit={bannerToEdit}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        title="Excluir Banner"
        message="Deseja realmente remover o banner do topo da loja?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalState({ isOpen: false, banner: null })}
      />

    </div>
  );
};

export default BannersManager;
