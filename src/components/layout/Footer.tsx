import React from 'react';
import { Heart, MessageCircle, Instagram, MapPin, Clock, ShieldCheck, Truck, Sparkles, Lock } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { useStoreData } from '../../context/StoreDataContext';

export const Footer: React.FC = () => {
  const { storeConfig, categories } = useStoreData();
  const { setSelectedCategory } = useFilter();

  const handleOpenAdmin = () => {
    window.location.hash = '/admin';
  };

  return (
    <footer className="bg-slate-950 text-slate-300 mt-20 border-t border-slate-800">
      {/* Benefit Highlights */}
      <div className="border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-800/30 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-pastel-pink/20 text-[#F8A4D8] flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Papelaria Afetiva</h4>
                <p className="text-xs text-slate-400">Feito à mão com muito carinho</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-800/30 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-[#D8B4F8] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Arte Personalizada</h4>
                <p className="text-xs text-slate-400">Prévia enviada para aprovação</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-800/30 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Envio & Retirada</h4>
                <p className="text-xs text-slate-400">Retirada no RJ ou envio por Sedex</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-800/30 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Atendimento Rápido</h4>
                <p className="text-xs text-slate-400">{storeConfig.whatsappDisplay}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F8A4D8] to-[#D8B4F8] text-slate-900 flex items-center justify-center shadow-md font-bold text-xl">
                🎀
              </div>
              <span className="font-festive text-xl font-bold text-white tracking-tight">
                {storeConfig.storeName}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {storeConfig.slogan}. Criamos itens exclusivos para tornar o aniversário do seu filho um momento mágico e encantador.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href={`https://instagram.com/${storeConfig.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-[#F8A4D8] text-slate-300 hover:text-slate-900 flex items-center justify-center transition-colors"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${storeConfig.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Categories Quick Links */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F8A4D8]" />
              Categorias
            </h3>
            <ul className="space-y-2 text-xs">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-slate-400 hover:text-[#F8A4D8] transition-colors"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Business & Location Info */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Atendimento & Contato
            </h3>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F8A4D8] shrink-0 mt-0.5" />
                <span>{storeConfig.address}</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#D8B4F8] shrink-0 mt-0.5" />
                <span>{storeConfig.workingHours}</span>
              </li>
              <li className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="font-bold text-slate-200">{storeConfig.whatsappDisplay}</span>
              </li>
            </ul>
          </div>

          {/* How to Order */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Como Funciona?
            </h3>
            <ol className="space-y-2 text-xs text-slate-400 list-decimal list-inside leading-relaxed">
              <li>Escolha os itens desejados no catálogo.</li>
              <li>Preencha nome e tema para personalização.</li>
              <li>Finalize o pedido e envie para o WhatsApp.</li>
              <li>Aprove as artes antes da confecção!</li>
            </ol>
          </div>

        </div>

        {/* Bottom Copyright & Admin Access */}
        <div className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {storeConfig.storeName}. Todos os direitos reservados.</p>
          
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Papelaria Personalizada com Amor 💕
            </span>
            <button
              onClick={handleOpenAdmin}
              className="text-slate-600 hover:text-slate-400 flex items-center gap-1 text-[11px] hover:underline transition-colors"
              title="Acessar Painel Administrativo (/admin)"
            >
              <Lock className="w-3 h-3" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
