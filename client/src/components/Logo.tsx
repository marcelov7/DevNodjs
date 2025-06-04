import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 64, className = "" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        {/* Gradientes para tema claro */}
        <defs>
          <radialGradient id="outerGradientLight" cx="0.5" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>
          <radialGradient id="middleGradientLight" cx="0.5" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </radialGradient>
          <radialGradient id="innerGradientLight" cx="0.5" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1e40af" />
          </radialGradient>
          
          {/* Gradientes para tema escuro */}
          <radialGradient id="outerGradientDark" cx="0.5" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </radialGradient>
          <radialGradient id="middleGradientDark" cx="0.5" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </radialGradient>
          <radialGradient id="innerGradientDark" cx="0.5" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3b82f6" />
          </radialGradient>
        </defs>
        
        {/* Círculo externo */}
        <circle cx="100" cy="100" r="95" fill="url(#outerGradientLight)" className="dark:fill-[url(#outerGradientDark)]" />
        
        {/* Pontos externos */}
        <circle cx="100" cy="15" r="2.5" fill="#f3f4f6" className="dark:fill-gray-300" opacity="0.9" />
        <circle cx="161" cy="39" r="2.5" fill="#f3f4f6" className="dark:fill-gray-300" opacity="0.9" />
        <circle cx="185" cy="100" r="2.5" fill="#f3f4f6" className="dark:fill-gray-300" opacity="0.9" />
        <circle cx="161" cy="161" r="2.5" fill="#f3f4f6" className="dark:fill-gray-300" opacity="0.9" />
        <circle cx="100" cy="185" r="2.5" fill="#f3f4f6" className="dark:fill-gray-300" opacity="0.9" />
        <circle cx="39" cy="161" r="2.5" fill="#f3f4f6" className="dark:fill-gray-300" opacity="0.9" />
        <circle cx="15" cy="100" r="2.5" fill="#f3f4f6" className="dark:fill-gray-300" opacity="0.9" />
        <circle cx="39" cy="39" r="2.5" fill="#f3f4f6" className="dark:fill-gray-300" opacity="0.9" />
        
        {/* Segundo círculo */}
        <circle cx="100" cy="100" r="78" fill="url(#middleGradientLight)" className="dark:fill-[url(#middleGradientDark)]" />
        
        {/* Terceiro círculo */}
        <circle cx="100" cy="100" r="62" fill="#1e40af" className="dark:fill-blue-500" />
        
        {/* Quarto círculo */}
        <circle cx="100" cy="100" r="48" fill="url(#innerGradientLight)" className="dark:fill-[url(#innerGradientDark)]" />
        
        {/* Círculo central */}
        <circle cx="100" cy="100" r="32" fill="#1e3a8a" className="dark:fill-blue-600" />
        
        {/* Elementos brancos */}
        <rect x="108" y="108" width="10" height="10" fill="white" className="dark:fill-gray-100" rx="1.5" />
        
        <path 
          d="M 92 110 
             C 92 105, 96 102, 100 104
             C 104 106, 106 110, 104 114
             C 102 118, 98 120, 94 118
             C 90 116, 90 112, 92 110 Z" 
          fill="white" 
          className="dark:fill-gray-100"
        />
      </svg>
    </div>
  );
};

export default Logo; 