'use client';

import React, { Fragment } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  header,
  footer,
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full mx-4'
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <Fragment>
      {/* Backdrop with Blur Effect */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
        onClick={handleOverlayClick}
      >
        {/* Modal Container */}
        <div
          className={`bg-white rounded-2xl shadow-2xl transform transition-all w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden relative animate-scaleIn ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(header || title || showCloseButton) && (
            <div className={`flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 ${headerClassName}`}>
              <div className="flex-1">
                {header || (
                  <div>
                    {title && (
                      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    )}
                    {subtitle && (
                      <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                    )}
                  </div>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors ml-4"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className={`p-6 overflow-y-auto ${footer ? 'max-h-[calc(90vh-180px)]' : 'max-h-[calc(90vh-80px)]'} ${bodyClassName}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className={`flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 ${footerClassName}`}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
};

export default Modal;
