'use client';

import { useState } from 'react';

// Componente para visualizar imágenes y videos a pantalla completa
// con navegación entre ellos
export default function ImageViewer({ images, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Obtener imagen o video actual
  const currentMedia = images[currentIndex];
  
  // Navegar a la imagen anterior
  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };
  
  // Navegar a la imagen siguiente
  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };
  
  // Si no hay imágenes, no mostrar nada
  if (!images || images.length === 0) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 z-50">
        <button 
          className="text-white text-4xl font-light hover:text-orange-400"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
      
      <div className="absolute bottom-4 left-0 right-0 text-center text-white">
        {currentMedia.caption && (
          <div className="mb-2 px-4 text-lg max-w-2xl mx-auto">
            {currentMedia.caption}
          </div>
        )}
        <div className="text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
      
      <button 
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/80"
        onClick={prevImage}
        aria-label="Anterior"
      >
        &#10094;
      </button>
      
      <div className="max-h-[80vh] max-w-[90vw] relative">
        {currentMedia.type === 'video' && currentMedia.videoUrl ? (
          <video 
            controls 
            autoPlay
            className="max-h-[80vh] max-w-[90vw]" 
            onClick={(e) => e.stopPropagation()}
          >
            <source src={currentMedia.videoUrl} type="video/mp4" />
            Tu navegador no soporta videos.
          </video>
        ) : (
          <img 
            src={currentMedia.url} 
            alt={currentMedia.caption || `Foto ${currentIndex + 1}`}
            className="max-h-[80vh] max-w-[90vw] object-contain"
          />
        )}
      </div>
      
      <button 
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/80"
        onClick={nextImage}
        aria-label="Siguiente"
      >
        &#10095;
      </button>
    </div>
  );
} 