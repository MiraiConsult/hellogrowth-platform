// HelloGrowthLogo.tsx - Logo HelloGrowth Inline
import React from 'react';

interface HelloGrowthLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const HelloGrowthLogo: React.FC<HelloGrowthLogoProps> = ({ className = '', size = 'md' }) => {
  // Tamanhos predefinidos
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12'
  };

  return (
    <img 
      src="/hello_growth_logo.png"
      alt="HelloGrowth" 
      className={`${sizeClasses[size]} w-auto ${className}`}
      onError={(e) => {
        // Fallback para texto se a imagem não carregar
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = 'text-emerald-600 font-bold text-xl';
        fallback.textContent = 'HelloGrowth';
        target.parentNode?.appendChild(fallback);
      }}
    />
  );
};

// Componente alternativo: Logo como texto estilizado (fallback)
export const HelloGrowthLogoText: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <span className="font-bold text-2xl tracking-tight">
        <span className="text-emerald-600">Hello</span>
        <span className="text-emerald-500">Growth</span>
      </span>
    </div>
  );
};

// Componente: Logo como SVG (versão simplificada)
export const HelloGrowthLogoSVG: React.FC<{ className?: string; size?: number }> = ({ 
  className = '', 
  size = 32 
}) => {
  return (
    <svg 
      width={size * 6} 
      height={size} 
      viewBox="0 0 600 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text 
        x="10" 
        y="70" 
        fontFamily="Arial, sans-serif" 
        fontSize="60" 
        fontWeight="bold"
        fill="#10b981"
      >
        HelloGrowth
      </text>
    </svg>
  );
};

export default HelloGrowthLogo;