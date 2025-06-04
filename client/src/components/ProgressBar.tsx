import React from 'react';

interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  size = 'md', 
  showLabel = true, 
  className = '' 
}) => {
  const getProgressColor = (prog: number) => {
    if (prog === 0) return 'bg-gray-500';
    if (prog < 25) return 'bg-red-500';
    if (prog < 50) return 'bg-orange-500';
    if (prog < 75) return 'bg-yellow-500';
    if (prog < 100) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getProgressTextColor = (prog: number) => {
    if (prog === 0) return 'text-gray-700';
    if (prog < 25) return 'text-red-700';
    if (prog < 50) return 'text-orange-700';
    if (prog < 75) return 'text-yellow-700';
    if (prog < 100) return 'text-blue-700';
    return 'text-green-700';
  };

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 'h-1';
      case 'md':
        return 'h-2';
      case 'lg':
        return 'h-3';
      default:
        return 'h-2';
    }
  };

  const getLabelSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'md':
        return 'text-xs';
      case 'lg':
        return 'text-sm';
      default:
        return 'text-xs';
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`flex-1 bg-gray-200 rounded-full ${getSize()} mr-2`}>
        <div
          className={`${getSize()} rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      {showLabel && (
        <span className={`${getLabelSize()} font-medium min-w-[2rem] ${getProgressTextColor(progress)}`}>
          {progress}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar; 