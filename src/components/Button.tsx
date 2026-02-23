import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  className = '',
}: ButtonProps) {
  const baseStyles = 'min-h-[48px] px-6 rounded-2xl font-medium whitespace-nowrap transition-all active:scale-[0.97] cursor-pointer';
  
  const variantStyles = {
    primary: disabled 
      ? 'bg-[#E5E8EB] text-[#B0B8C1]' 
      : 'bg-[#3182F6] text-white',
    secondary: 'bg-[#F9FAFB] text-[#191F28]',
    outline: 'border-2 border-[#E5E8EB] text-[#191F28] bg-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
