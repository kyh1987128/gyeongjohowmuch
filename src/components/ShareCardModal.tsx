import { useState, useRef } from 'react';
import { share, saveBase64Data } from '@apps-in-toss/web-framework';
import html2canvas from 'html2canvas';
import Toast from './Toast';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryEmoji: string;
  categoryName: string;
  message: string;
  bgColor: string;
}

const getGradientBg = (categoryName: string): string => {
  if (categoryName.includes('결혼')) {
    return 'linear-gradient(135deg, #FFF5F5, #FFE0EC, #FFF0F5)';
  }
  if (categoryName.includes('장례') || categoryName.includes('조문')) {
    return 'linear-gradient(135deg, #F5F5FA, #E8E8F0, #F0F0F8)';
  }
  if (categoryName.includes('출산') || categoryName.includes('돌잔치')) {
    return 'linear-gradient(135deg, #FFF8E1, #FFECB3, #FFF3E0)';
  }
  return 'linear-gradient(135deg, #F0F7FF, #E3F2FD, #F5F9FF)';
};

const getWatermark = (categoryName: string): string => {
  if (categoryName.includes('장례') || categoryName.includes('조문')) {
    return '🙏 진심으로';
  }
  if (categoryName.includes('결혼')) {
    return '💐 축하하는 마음을 담아';
  }
  if (categoryName.includes('출산') || categoryName.includes('돌잔치')) {
    return '👶 축복의 마음을 담아';
  }
  return '💌 마음을 담아';
};

export default function ShareCardModal({
  isOpen,
  onClose,
  categoryEmoji,
  categoryName,
  message: initialMessage,
}: ShareCardModalProps) {
  const [message, setMessage] = useState(initialMessage);
  const [toast, setToast] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setMessage(initialMessage);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setToast('텍스트가 복사되었어요!');
    } catch {
      setToast('복사에 실패했어요');
    }
  };

  const handleShareImage = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      await saveBase64Data({
        data: base64,
        fileName: 'gyeongjo-card.png',
        mimeType: 'image/png',
      });
      setToast('카드가 공유되었어요!');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(message);
          setToast('텍스트로 복사되었어요!');
        } catch {
          setToast('공유에 실패했어요');
        }
      }
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="bg-white w-full sm:max-w-[480px] sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto animate-[slideUpSheet_0.3s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-[#D5DAE0] rounded-full"></div>
          </div>

          <div className="px-6 pb-8">
            <div className="mb-8 flex justify-center pt-4">
              <div
                ref={cardRef}
                className="w-[320px] min-h-[400px] rounded-[24px] flex flex-col items-center"
                style={{
                  background: getGradientBg(categoryName),
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  padding: '32px 24px'
                }}
              >
                <div className="text-[48px] mb-3">{categoryEmoji}</div>
                <div className="text-[16px] font-medium text-[#6B7684] mb-4" style={{ letterSpacing: '2px' }}>
                  {categoryName}
                </div>
                <div className="w-10 h-[2px] bg-[#3182F6] rounded-full mb-5"></div>
                <p className="text-[20px] text-[#191F28] font-semibold leading-[1.6] text-center px-4 mb-auto whitespace-pre-wrap break-words">
                  {message}
                </p>
                <div className="mt-8 flex flex-col items-center gap-2">
                  <p className="text-[13px] text-[#B0B8C1]">{getWatermark(categoryName)}</p>
                  <p className="text-[#D5DAE0] text-xs tracking-[4px]">· · ·</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[14px] font-bold text-[#333]">메시지 수정</label>
                <button
                  onClick={handleReset}
                  className="text-[14px] text-[#3182F6] cursor-pointer transition-all active:scale-[0.97] whitespace-nowrap"
                >
                  AI 메시지로 되돌리기
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => {
                  if (e.target.value.length <= 200) {
                    setMessage(e.target.value);
                  }
                }}
                maxLength={200}
                rows={4}
                className="w-full px-4 py-4 rounded-2xl bg-white text-[#191F28] text-[16px] leading-[1.5] border border-[#E5E8EB] outline-none resize-none focus:border-[#3182F6] transition-colors"
              />
              <p className="text-[13px] text-[#B0B8C1] text-right mt-2">
                {message.length}/200
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleShareImage}
                className="w-full h-[52px] bg-[#3182F6] text-white text-[16px] font-semibold rounded-2xl cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap"
              >
                📤 공유하기
              </button>
              <button
                onClick={handleCopyText}
                className="w-full h-[52px] bg-[#F2F3F5] text-[#6B7684] text-[14px] font-medium rounded-2xl cursor-pointer transition-all active:scale-[0.97] whitespace-nowrap"
              >
                📋 텍스트만 복사
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}