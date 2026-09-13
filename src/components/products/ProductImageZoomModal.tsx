import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Maximize2
} from 'lucide-react';

interface MediaItem {
  url: string;
  isVideo?: boolean;
}

interface ProductImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaList: MediaItem[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  productName: string;
}

const ZOOM_STEPS = [1, 1.5, 2, 2.5, 3];

export const ProductImageZoomModal: React.FC<ProductImageZoomModalProps> = ({
  isOpen,
  onClose,
  mediaList,
  activeIndex,
  onIndexChange,
  productName,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const positionStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMedia = mediaList[activeIndex] || mediaList[0] || null;
  const isVideo = Boolean(currentMedia?.isVideo);

  // Reseta o zoom e a posição sempre que mudar de mídia ou fechar
  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetZoom();
  }, [activeIndex, isOpen, resetZoom]);

  // Bloqueia rolagem da página quando o modal estiver aberto
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Navegação de fotos
  const handlePrev = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (mediaList.length <= 1) return;
    onIndexChange(activeIndex === 0 ? mediaList.length - 1 : activeIndex - 1);
  }, [activeIndex, mediaList.length, onIndexChange]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (mediaList.length <= 1) return;
    onIndexChange(activeIndex === mediaList.length - 1 ? 0 : activeIndex + 1);
  }, [activeIndex, mediaList.length, onIndexChange]);

  // Controles de zoom
  const handleZoomIn = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomLevel((prev) => {
      const nextIndex = ZOOM_STEPS.findIndex((s) => s > prev);
      return nextIndex !== -1 ? ZOOM_STEPS[nextIndex] : prev;
    });
  }, []);

  const handleZoomOut = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomLevel((prev) => {
      const reversed = [...ZOOM_STEPS].reverse();
      const next = reversed.find((s) => s < prev);
      const val = next !== undefined ? next : 1;
      if (val === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return val;
    });
  }, []);

  // Atalhos de teclado (ESC, setas, +, -, 0)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut, resetZoom]);

  // Alterna zoom com duplo clique ou clique simples (1x <-> 2x)
  const handleToggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVideo) return;

    if (zoomLevel === 1) {
      setZoomLevel(2);
      setPosition({ x: 0, y: 0 });
    } else {
      resetZoom();
    }
  };

  // Suporte a Mouse Drag quando ampliado
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1 || isVideo) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1 || isVideo) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    setPosition({
      x: positionStartRef.current.x + deltaX,
      y: positionStartRef.current.y + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Suporte a Touch Drag em dispositivos móveis
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomLevel <= 1 || isVideo || e.touches.length !== 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    positionStartRef.current = { ...position };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || zoomLevel <= 1 || isVideo || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStartRef.current.x;
    const deltaY = e.touches[0].clientY - dragStartRef.current.y;
    setPosition({
      x: positionStartRef.current.x + deltaX,
      y: positionStartRef.current.y + deltaY,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Suporte a Zoom com Scroll do Mouse
  const handleWheel = (e: React.WheelEvent) => {
    if (isVideo) return;
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  if (!isOpen || !currentMedia) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onClick={() => {
        if (zoomLevel === 1) onClose();
      }}
    >
      {/* BARRA SUPERIOR (HEADER): Título, contador, controles de zoom e fechar */}
      <div 
        className="w-full px-4 sm:px-6 py-3 bg-slate-900/80 border-b border-white/10 flex items-center justify-between gap-4 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Título e contador de fotos */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
            <Maximize2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
              {productName}
            </h3>
            {mediaList.length > 1 && (
              <p className="text-xs text-slate-400">
                Imagem {activeIndex + 1} de {mediaList.length}
              </p>
            )}
          </div>
        </div>

        {/* Barra de Ferramentas de Zoom & Botão Fechar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isVideo && (
            <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                title="Diminuir Zoom (-)"
              >
                <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <span className="text-xs sm:text-sm font-bold text-white px-2 min-w-[50px] text-center font-mono">
                {Math.round(zoomLevel * 100)}%
              </span>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                title="Aumentar Zoom (+)"
              >
                <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {zoomLevel > 1 && (
                <button
                  type="button"
                  onClick={resetZoom}
                  className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-white/10 rounded-lg transition-colors ml-1 cursor-pointer"
                  title="Restaurar tamanho original (0)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Botão Fechar Modal */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors shadow-sm ml-1 cursor-pointer"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* ÁREA CENTRAL: Imagem com Pan/Zoom Interativo ou Player de Vídeo */}
      <div 
        ref={containerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-default"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Setas de navegação anterior/próxima (se houver mais de 1 mídia) */}
        {mediaList.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 sm:left-6 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-white/20 text-white flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
              title="Imagem anterior (Seta esquerda)"
            >
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 sm:right-6 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-white/20 text-white flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
              title="Próxima imagem (Seta direita)"
            >
              <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          </>
        )}

        {/* Exibição da Mídia */}
        {isVideo ? (
          <div className="max-w-4xl max-h-[75vh] w-full p-4 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <video
              src={currentMedia.url}
              controls
              autoPlay
              playsInline
              className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        ) : (
          <div 
            className="flex items-center justify-center w-full h-full p-2 sm:p-6"
            onClick={handleToggleZoom}
          >
            <img
              src={currentMedia.url}
              alt={productName}
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                cursor: zoomLevel > 1 
                  ? (isDragging ? 'grabbing' : 'grab') 
                  : 'zoom-in',
                maxHeight: '80vh',
                maxWidth: '92vw',
              }}
              className="object-contain rounded-xl shadow-2xl transition-all select-none"
            />
          </div>
        )}

        {/* Dica de uso sutil flutuante */}
        {!isVideo && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-10 hidden sm:block">
            <span className="bg-slate-900/85 backdrop-blur-md text-slate-300 text-xs px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
              {zoomLevel > 1 
                ? 'Arraste para mover • Duplo clique para voltar ao normal' 
                : 'Clique na imagem para aproximar • Use o scroll do mouse para zoom'}
            </span>
          </div>
        )}
      </div>

      {/* BARRA INFERIOR: Miniaturas das imagens da galeria */}
      {mediaList.length > 1 && (
        <div 
          className="w-full py-3 px-4 bg-slate-900/80 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto scrollbar-thin z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {mediaList.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onIndexChange(idx)}
              className={`relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-800 ${
                activeIndex === idx
                  ? 'border-pink-500 scale-105 ring-2 ring-pink-500/50'
                  : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              {item.isVideo ? (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white bg-slate-800">
                  Vídeo
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={`Miniatura ${idx + 1}`}
                  className="w-full h-full object-contain p-0.5"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
