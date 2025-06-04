import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ColorBlindnessType = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'high_contrast';

interface AccessibilityContextType {
  colorBlindnessType: ColorBlindnessType;
  setColorBlindnessType: (type: ColorBlindnessType) => void;
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [colorBlindnessType, setColorBlindnessTypeState] = useState<ColorBlindnessType>(() => {
    const saved = localStorage.getItem('accessibility-colorblindness') as ColorBlindnessType;
    return saved || 'none';
  });

  const [isHighContrast, setIsHighContrast] = useState(() => {
    return localStorage.getItem('accessibility-high-contrast') === 'true';
  });

  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large'>(() => {
    const saved = localStorage.getItem('accessibility-font-size') as 'small' | 'medium' | 'large';
    return saved || 'medium';
  });

  const setColorBlindnessType = (type: ColorBlindnessType) => {
    setColorBlindnessTypeState(type);
    localStorage.setItem('accessibility-colorblindness', type);
    
    // Aplicar classes CSS baseadas no tipo
    const rootElement = document.documentElement;
    
    // Remover classes existentes
    rootElement.classList.remove('protanopia', 'deuteranopia', 'tritanopia', 'high-contrast');
    
    // Aplicar nova classe se não for 'none'
    if (type !== 'none') {
      rootElement.classList.add(type);
    }
  };

  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);
    localStorage.setItem('accessibility-high-contrast', newValue.toString());
    
    if (newValue) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  };

  const setFontSize = (size: 'small' | 'medium' | 'large') => {
    setFontSizeState(size);
    localStorage.setItem('accessibility-font-size', size);
    
    const rootElement = document.documentElement;
    rootElement.classList.remove('text-small', 'text-medium', 'text-large');
    rootElement.classList.add(`text-${size}`);
  };

  // Cores adaptadas para diferentes tipos de daltonismo
  const getStatusColor = (status: string): string => {
    const baseColors = {
      pendente: {
        none: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
        protanopia: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        deuteranopia: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
        tritanopia: 'bg-pink-100 dark:bg-pink-900/20 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-800',
        high_contrast: 'bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white border-2 border-black dark:border-white'
      },
      em_andamento: {
        none: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        protanopia: 'bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
        deuteranopia: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
        tritanopia: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800',
        high_contrast: 'bg-blue-300 dark:bg-blue-700 text-black dark:text-white border-2 border-black dark:border-white'
      },
      resolvido: {
        none: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800',
        protanopia: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
        deuteranopia: 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
        tritanopia: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
        high_contrast: 'bg-green-300 dark:bg-green-700 text-black dark:text-white border-2 border-black dark:border-white'
      }
    };

    return baseColors[status as keyof typeof baseColors]?.[colorBlindnessType] || 
           'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
  };

  const getPriorityColor = (priority: string): string => {
    const baseColors = {
      baixa: {
        none: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
        protanopia: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
        deuteranopia: 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700',
        tritanopia: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700',
        high_contrast: 'bg-gray-400 dark:bg-gray-600 text-black dark:text-white border-2 border-black dark:border-white'
      },
      media: {
        none: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
        protanopia: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        deuteranopia: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
        tritanopia: 'bg-pink-100 dark:bg-pink-900/20 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-800',
        high_contrast: 'bg-yellow-300 dark:bg-yellow-700 text-black dark:text-white border-2 border-black dark:border-white'
      },
      alta: {
        none: 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
        protanopia: 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
        deuteranopia: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
        tritanopia: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
        high_contrast: 'bg-orange-400 dark:bg-orange-600 text-black dark:text-white border-2 border-black dark:border-white'
      },
      critica: {
        none: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
        protanopia: 'bg-rose-100 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
        deuteranopia: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
        tritanopia: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
        high_contrast: 'bg-red-500 dark:bg-red-700 text-white dark:text-white border-2 border-black dark:border-white'
      }
    };

    return baseColors[priority as keyof typeof baseColors]?.[colorBlindnessType] || 
           'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
  };

  useEffect(() => {
    // Aplicar configurações iniciais
    if (colorBlindnessType !== 'none') {
      document.documentElement.classList.add(colorBlindnessType);
    }
    
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    }
    
    document.documentElement.classList.add(`text-${fontSize}`);
  }, []);

  const value: AccessibilityContextType = {
    colorBlindnessType,
    setColorBlindnessType,
    isHighContrast,
    toggleHighContrast,
    fontSize,
    setFontSize,
    getStatusColor,
    getPriorityColor
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility deve ser usado dentro de um AccessibilityProvider');
  }
  return context;
}; 