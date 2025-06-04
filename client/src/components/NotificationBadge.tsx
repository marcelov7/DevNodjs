import React from 'react';

interface NotificationBadgeProps {
  count: number;
  showZero?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple';
  className?: string;
  children: React.ReactNode;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  showZero = false,
  size = 'sm',
  color = 'red',
  className = '',
  children
}) => {
  const shouldShow = count > 0 || (showZero && count === 0);

  const getBadgeSize = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4 text-xs';
      case 'md':
        return 'h-5 w-5 text-xs';
      case 'lg':
        return 'h-6 w-6 text-sm';
      default:
        return 'h-4 w-4 text-xs';
    }
  };

  const getBadgeColor = () => {
    switch (color) {
      case 'red':
        return 'bg-red-500 text-white';
      case 'blue':
        return 'bg-blue-500 text-white';
      case 'green':
        return 'bg-green-500 text-white';
      case 'yellow':
        return 'bg-yellow-500 text-white';
      case 'purple':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-red-500 text-white';
    }
  };

  const getPosition = () => {
    switch (size) {
      case 'sm':
        return '-top-1 -right-1';
      case 'md':
        return '-top-2 -right-2';
      case 'lg':
        return '-top-2 -right-2';
      default:
        return '-top-1 -right-1';
    }
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      {children}
      {shouldShow && (
        <span
          className={`
            absolute ${getPosition()} flex items-center justify-center
            ${getBadgeSize()} ${getBadgeColor()}
            rounded-full font-medium shadow-lg border-2 border-white
            ${count > 0 ? 'animate-pulse' : ''}
            transform scale-110
          `}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
};

export default NotificationBadge; 