import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, onClose, duration = 2000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-[slideUp_0.3s_ease-out]">
      <div className="bg-[#191F28] text-white px-6 py-3 rounded-2xl shadow-lg whitespace-nowrap">
        {message}
      </div>
    </div>
  );
}
