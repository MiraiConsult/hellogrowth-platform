'use client';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const WHATSAPP_URL =
  'https://wa.me/5551996331212?text=Ol%C3%A1%20Giulia%2C%20preciso%20de%20ajuda%20com%20o%20HelloGrowth!';

const GIULIA_PHOTO = '/giulia-cs.png';

const STORAGE_KEY = 'giulia_popup_last_shown';

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const GiuliaWhatsApp: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // Verificar se deve exibir o popup hoje
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; // "2026-03-19"
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (lastShown !== today) {
      // Aguardar 1.5s antes de mostrar para não aparecer imediatamente
      const timer = setTimeout(() => {
        setShowPopup(true);
        localStorage.setItem(STORAGE_KEY, today);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const closePopup = () => setShowPopup(false);

  return (
    <>
      {/* Popup diário de boas-vindas */}
      {showPopup && (
        <div
          className="fixed bottom-20 right-5 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          style={{ animation: 'slideUpFade 0.35s ease-out' }}
        >
          {/* Header verde */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: '#25D366' }}>
            <img
              src={GIULIA_PHOTO}
              alt="Giulia"
              className="w-10 h-10 rounded-full object-cover border-2 border-white flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">Giulia</p>
              <p className="text-green-100 text-xs">Customer Success</p>
            </div>
            <button
              onClick={closePopup}
              className="text-white/80 hover:text-white transition-colors flex-shrink-0"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Mensagem */}
          <div className="px-4 py-3">
            <div className="bg-gray-50 rounded-xl rounded-tl-none px-3 py-2.5 text-sm text-gray-700 leading-relaxed">
              Oi! Meu nome é Giulia e qualquer dúvida que tiver no sistema é só me chamar! 😊
            </div>
          </div>

          {/* Botão chamar */}
          <div className="px-4 pb-4">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closePopup}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#25D366' }}
            >
              <WhatsAppIcon />
              Chamar no WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        {/* Tooltip ao hover */}
        {showTooltip && (
          <div
            className="flex items-center gap-3 bg-white rounded-2xl shadow-xl border border-gray-100 px-3 py-2.5 mb-1 max-w-xs"
            style={{ animation: 'slideUpFade 0.2s ease-out' }}
          >
            <img
              src={GIULIA_PHOTO}
              alt="Giulia"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-green-200"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 leading-tight">Giulia</p>
              <p className="text-xs text-gray-500 leading-tight">Customer Success</p>
              <p className="text-xs text-gray-600 mt-1 leading-snug">
                Oi! Meu nome é Giulia e qualquer dúvida que tiver no sistema é só me chamar!
              </p>
            </div>
          </div>
        )}

        {/* Botão WhatsApp */}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          aria-label="Falar com Giulia no WhatsApp"
          className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
          style={{ backgroundColor: '#25D366' }}
        >
          <WhatsAppIcon />
        </a>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default GiuliaWhatsApp;
