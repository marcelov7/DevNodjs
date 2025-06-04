import React from 'react';
import { X, Edit2 } from 'lucide-react';

interface Section {
  title: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'gray';
  content: React.ReactNode;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  isViewing?: boolean;
  onEdit?: () => void;
  editButtonText?: string;
  sections?: Section[];
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  isViewing = false,
  onEdit,
  editButtonText = 'Editar',
  sections = [],
  children,
  size = 'lg'
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 text-blue-900',
    green: 'bg-green-50 text-green-600 text-green-900',
    yellow: 'bg-yellow-50 text-yellow-600 text-yellow-900',
    purple: 'bg-purple-50 text-purple-600 text-purple-900',
    gray: 'bg-gray-50 text-gray-600 text-gray-900'
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-lg ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto animate-slideIn`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {isViewing ? (
            // Modo visualização
            <div>
              {/* Cabeçalho */}
              <div className="border-b border-gray-200 pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 transition-colors duration-200">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="text-sm text-gray-600 mt-1 transition-colors duration-200">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                    title="Fechar"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Seções */}
              <div className="space-y-6">
                {sections.map((section, index) => {
                  const IconComponent = section.icon;
                  const bgClass = `bg-${section.color}-50`;
                  const iconClass = `text-${section.color}-600`;
                  const textClass = `text-${section.color}-900`;
                  
                  return (
                    <div key={index} className={`${bgClass} rounded-lg p-4 transition-all duration-300 hover:shadow-md`}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <IconComponent className={`h-5 w-5 mr-2 ${iconClass}`} />
                        {section.title}
                      </h3>
                      <div className={textClass}>
                        {section.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rodapé com Ações */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
                <div className="flex space-x-2">
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className="btn btn-secondary transition-all duration-200 hover:shadow-md"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editButtonText}
                    </button>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="btn btn-primary transition-all duration-200 hover:shadow-md"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            // Modo edição/criação
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 transition-colors duration-200">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                  title="Fechar"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal; 