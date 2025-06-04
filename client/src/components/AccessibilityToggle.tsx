import React, { useState, useRef, useEffect } from 'react';
import { 
  Accessibility, 
  Eye, 
  Type, 
  Palette, 
  X,
  Check
} from 'lucide-react';
import { useAccessibility, ColorBlindnessType } from '../contexts/AccessibilityContext';

interface AccessibilityToggleProps {
  size?: 'sm' | 'md' | 'lg';
}

const AccessibilityToggle: React.FC<AccessibilityToggleProps> = ({ size = 'md' }) => {
  const {
    colorBlindnessType,
    setColorBlindnessType,
    isHighContrast,
    toggleHighContrast,
    fontSize,
    setFontSize
  } = useAccessibility();

  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  // Fechar painel ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const colorBlindnessOptions = [
    { 
      value: 'none' as ColorBlindnessType, 
      label: 'Visão Normal', 
      description: 'Cores padrão do sistema' 
    },
    { 
      value: 'protanopia' as ColorBlindnessType, 
      label: 'Protanopia', 
      description: 'Dificuldade com vermelho' 
    },
    { 
      value: 'deuteranopia' as ColorBlindnessType, 
      label: 'Deuteranopia', 
      description: 'Dificuldade com verde' 
    },
    { 
      value: 'tritanopia' as ColorBlindnessType, 
      label: 'Tritanopia', 
      description: 'Dificuldade com azul' 
    }
  ];

  const fontSizeOptions = [
    { value: 'small' as const, label: 'Pequeno', description: 'Texto menor' },
    { value: 'medium' as const, label: 'Médio', description: 'Tamanho padrão' },
    { value: 'large' as const, label: 'Grande', description: 'Texto maior' }
  ];

  return (
    <div className="relative" ref={panelRef}>
      {/* Botão de Acessibilidade */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${sizeClasses[size]} rounded-lg transition-all duration-200
          flex items-center justify-center
          bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100
          border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
          dark:focus:ring-offset-gray-800 shadow-sm hover:shadow-md
          ${(colorBlindnessType !== 'none' || isHighContrast || fontSize !== 'medium') ? 'ring-2 ring-blue-500' : ''}
        `}
        title="Configurações de Acessibilidade"
        aria-label="Abrir configurações de acessibilidade"
      >
        <Accessibility size={iconSizes[size]} />
      </button>

      {/* Painel de Configurações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Accessibility className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Acessibilidade
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Alto Contraste */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Alto Contraste
                  </span>
                </div>
                <button
                  onClick={toggleHighContrast}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${isHighContrast 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 rounded-full bg-white transition-transform
                      ${isHighContrast ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Aumenta o contraste para melhor visibilidade
              </p>
            </div>

            {/* Tamanho da Fonte */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Type className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Tamanho da Fonte
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {fontSizeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFontSize(option.value)}
                    className={`
                      p-2 text-xs rounded-md border transition-colors
                      ${fontSize === option.value
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-gray-500 dark:text-gray-400">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Daltonismo */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Palette className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Adaptação para Daltonismo
                </span>
              </div>
              <div className="space-y-2">
                {colorBlindnessOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setColorBlindnessType(option.value)}
                    className={`
                      w-full p-3 text-left rounded-md border transition-colors
                      ${colorBlindnessType === option.value
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {option.description}
                        </div>
                      </div>
                      {colorBlindnessType === option.value && (
                        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Informações */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                As configurações são salvas automaticamente
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityToggle; 