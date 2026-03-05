import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const messages = [
  { emoji: '💸', text: '결혼식 축의금.. 얼마가 적당하지?' },
  { emoji: '😮', text: '장례식은? 돌잔치는? 부모님 용돈은?' },
  { emoji: '🤖', text: 'AI가 딱 맞는 금액을 알려드릴게요' },
];

export default function Intro() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (step < messages.length - 1) {
      const t1 = setTimeout(() => setFade(false), 900);
      const t2 = setTimeout(() => {
        setStep(s => s + 1);
        setFade(true);
      }, 1200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      const t = setTimeout(() => setShowButton(true), 800);
      return () => clearTimeout(t);
    }
  }, [step]);

  const handleStart = () => {
    const myInfo = localStorage.getItem('gyeongjo_myinfo');
    if (myInfo) navigate('/home', { replace: true });
    else navigate('/myinfo', { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5">
      <div className="text-center">
        <div
          className="text-6xl mb-8"
          style={{
            animation: 'shake 0.6s ease-in-out infinite',
          }}
        >
          {messages[step].emoji}
        </div>
        <p
          className="text-xl font-bold text-[#191F28] mb-4 min-h-[60px] flex items-center justify-center"
          style={{
            opacity: fade ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          {messages[step].text}
        </p>
        <div className="mt-8" style={{ opacity: showButton ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}>
          <p className="text-xs text-[#B0B8C1] mb-6">상황에 딱 맞는 금액을 추천해드려요</p>
          <button
            onClick={handleStart}
            disabled={!showButton}
            className="w-full max-w-[280px] py-3.5 bg-[#3182F6] text-white font-semibold rounded-xl text-base hover:bg-[#1B6AE0] transition-colors"
          >
            시작하기
          </button>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
      `}</style>
    </div>
  );
}
