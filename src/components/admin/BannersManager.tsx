import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Sliders, 
  Sparkles, 
  Eye, 
  FileText, 
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

  const sortedBanners = [...banners].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#FFA6DF]/40 shadow-sm">
        <div>
          <h2 className="font-festive text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#FF1493]" />
            <span>Gerenciar Banners / Slides do Topo</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFEBF6] text-[#FF1493] font-bold">
              {banners.length} {banners.length === 1 ? 'slide' : 'slides'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Adicione avisos, promoções e banners rotativos com transição automática no topo da loja
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 border border-black"
        >
          <Plus className="w-4 h-4 text-[#FFD1EC]" />
          <span>Novo Banner / Slide</span>
        </button>
      </div>

      {/* Banners Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sortedBanners.map((banner, index) => (
          <div
            key={banner.id}
            className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
              banner.isActive ? 'border-[#FFA6DF]/60' : 'border-slate-200 opacity-60'
            }`}
          >
            {/* Slide Header with Order and Badges */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                  #{banner.order || index + 1}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                  banner.type === 'text'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {banner.type === 'text' ? (
                    <>
                      <FileText className="w-3 h-3" />
                      <span>Texto Informativo</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3 h-3" />
                      <span>Imagem Completa</span>
                    </>
                  )}
                </span>
              </div>

              {/* Status Toggle */}
              <button
                onClick={() => toggleBannerStatus(banner.id)}
                className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${
                  banner.isActive
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                title="Alternar Ativo/Inativo"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${banner.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span>{banner.isActive ? 'Ativo no Topo' : 'Pausado'}</span>
              </button>
            </div>

            {/* Slide Visual Preview Card */}
            <div className="rounded-2xl p-4 bg-gradient-to-r from-[#FFD1EC]/40 via-[#F3EAFF]/40 to-[#FFD1EC]/40 border border-[#FFA6DF]/40">
              {banner.type === 'image' && banner.imageUrl ? (
                <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-100">
                  <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="bg-white/90 p-3 rounded-xl border border-slate-200/80 text-center space-y-1">
                  {banner.tag && (
                    <span className="text-[10px] font-bold text-[#FF1493] block">
                      {banner.tag}
                    </span>
                  )}
                  <h4 className="font-festive font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                    {banner.title || 'Sem título'}
                  </h4>
                  {banner.subtitle && (
                    <p className="text-[11px] text-slate-600 line-clamp-1">
                      {banner.subtitle}
                    </p>
                  )}
                  {banner.highlightText && (
                    <p className="text-[10px] text-[#FF1493] font-bold line-clamp-1">
                      {banner.highlightText}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="text-slate-400 text-[11px]">
                {banner.linkUrl ? `Link: ${banner.linkUrl}` : 'Sem link de clique'}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(banner)}
                  className="p-1.5 text-slate-600 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
                  title="Editar dados do banner"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteModalState({ isOpen: true, banner })}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Excluir banner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

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
        message="Deseja realmente remover este banner rotativo do catálogo?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalState({ isOpen: false, banner: null })}
      />

    </div>
  );
};
