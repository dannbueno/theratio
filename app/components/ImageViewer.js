'use client';

import { useState } from 'react';

// Componente simplificado para depuración
export default function ImageViewer({ images, initialIndex = 0, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div className="max-h-[80vh] max-w-[90vw]">
        <img 
          src={images[initialIndex].url} 
          alt={"Imagen"}
          className="max-h-[80vh] max-w-[90vw] object-contain"
        />
      </div>
    </div>
  );
} 