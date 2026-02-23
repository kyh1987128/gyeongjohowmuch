
import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import Button from './Button';
import Toast from './Toast';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryEmoji: string;
  categoryName: string;
  message: string;
  bgColor: string;
}

// 카테고리별 그라데이션 배경
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

  const handleShareCard = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setToast('이미지 생성에 실패했어요');
          return;
        }

        const file = new File([blob], 'gyeongjo-card.png', { type: 'image/png' });

        // Web Share API 지원 확인
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: '경조사비 추천 카드',
              text: message,
            });
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              // 공유 취소가 아닌 경우 다운로드로 fallback
              downloadImage(canvas);
            }
          }
        } else {
          // Web Share API 미지원 시 다운로드
          downloadImage(canvas);
        }
      });
    } catch (err) {
      console.error('이미지 캡처 실패:', err);
      setToast('이미지 생성에 실패했어요');
    }
  };

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = 'gyeongjo-card.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    setToast('이미지가 다운로드되었어요!');
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
          {/* 핸들바 */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-[#D5DAE0] rounded-full"></div>
          </div>

          <div className="px-6 pb-8">
            {/* 카드 미리보기 */}
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
                {/* 상단 이모지 */}
                <div className="text-[48px] mb-3">{categoryEmoji}</div>

                {/* 카테고리명 */}
                <div 
                  className="text-[16px] font-medium text-[#6B7684] mb-4"
                  style={{ letterSpacing: '2px' }}
                >
                  {categoryName}
                </div>

                {/* 구분선 */}
                <div 
                  className="w-10 h-[2px] bg-[#3182F6] rounded-full mb-5"
                ></div>

                {/* 메시지 */}
                <p className="text-[20px] text-[#191F28] font-semibold leading-[1.6] text-center px-4 mb-auto whitespace-pre-wrap break-words">
                  {message}
                </p>

                {/* 하단 워터마크 */}
                <div className="mt-8 flex flex-col items-center gap-2">
                  <p className="text-[13px] text-[#B0B8C1]">💌 경조사비 얼마?</p>
                  <p className="text-[#D5DAE0] text-xs tracking-[4px]">· · ·</p>
                </div>
              </div>
            </div>

            {/* 편집 영역 */}
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

            {/* 버튼 */}
            <div className="space-y-3">
              <button
                onClick={handleShareCard}
                className="w-full h-[52px] bg-[#3182F6] text-white text-[16px] font-semibold rounded-2xl cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap"
              >
                📤 카드 공유하기
              </button>
              <button
                onClick={handleCopyText}
                className="w-full text-[14px] text-[#6B7684] cursor-pointer transition-all active:scale-[0.97] whitespace-nowrap"
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
