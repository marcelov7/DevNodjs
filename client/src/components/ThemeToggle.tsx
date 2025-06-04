import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'switch';
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'md', 
  variant = 'button',
  showLabel = false 
}) => {
  const { theme, toggleTheme } = useTheme();

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

  if (variant === 'switch') {
    return (
      <div className="flex items-center space-x-3">
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tema
          </span>
        )}
        <button
          onClick={toggleTheme}
          className={`
            relative inline-flex items-center ${sizeClasses[size]} rounded-full 
            transition-colors duration-200 focus:outline-none focus:ring-2 
            focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
            ${theme === 'dark' 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-200 hover:bg-gray-300'
            }
          `}
          aria-label={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
        >
          <div className={`
            absolute inset-0 flex items-center justify-center
            transform transition-all duration-200
            ${theme === 'dark' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
          `}>
            <Moon size={iconSizes[size]} className="text-white" />
          </div>
          <div className={`
            absolute inset-0 flex items-center justify-center
            transform transition-all duration-200
            ${theme === 'light' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
          `}>
            <Sun size={iconSizes[size]} className="text-yellow-600" />
          </div>
        </button>
        {showLabel && (
          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {theme}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]} rounded-lg transition-all duration-200
        flex items-center justify-center
        bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
        text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100
        border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
        dark:focus:ring-offset-gray-800 shadow-sm hover:shadow-md
      `}
      title={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
      aria-label={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
    >
      <div className="relative">
        <div className={`
          absolute inset-0 flex items-center justify-center
          transform transition-all duration-300 ease-in-out
          ${theme === 'dark' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 rotate-180'}
        `}>
          <Moon size={iconSizes[size]} />
        </div>
        <div className={`
          flex items-center justify-center
          transform transition-all duration-300 ease-in-out
          ${theme === 'light' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-180'}
        `}>
          <Sun size={iconSizes[size]} />
        </div>
      </div>
    </button>
  );
};

export default ThemeToggle; 