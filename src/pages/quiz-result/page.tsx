import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { share } from '@apps-in-toss/web-framework';

const GRADES = [
  { title: '경조사 무관심', emoji: '😶', description: '경조사비? 그게 먼데? 아직 경험이 부족하지만 걱정 마세요!', color: '#8B95A1', bgColor: '#F2F3F5', percentile: '하위 20%' },
  { title: '경조사 초보', emoji: '🤔', description: '기본은 아는데 아직 애매한 부분이 있어요.', color: '#F59E0B', bgColor: '#FFFBEB', percentile: '하위 40%' },
  { title: '경조사 중급자', emoji: '👍', description: '웬만한 상황은 무난하게 처리! 꽤 센스 있는데요?', color: '#3182F6', bgColor: '#EBF5FF', percentile: '상위 50%' },
  { title: '경조사 고수', emoji: '😎', description: '어떤 상황에서도 적절한 판단! 주변에서 많이 물어보죠?', color: '#00B493', bgColor: '#ECFDF5', percentile: '상위 20%' },
  { title: '경조사 마스터', emoji: '👑', description: '경조사비의 살아있는 사전! 당신이 곧 기준입니다.', color: '#8B5CF6', bgColor: '#F5F3FF', percentile: '상위 5%' },
];

function getGrade(score: number) {
  if (score <= 3) return GRADES[0];
  if (score <= 7) return GRADES[1];
  if (score <= 11) return GRADES[2];
  if (score <= 15) return GRADES[3];
  return GRADES[4];
}

export default function QuizResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalScore = 0 } = (location.state as any) || {};
  const grade = getGrade(totalScore);

  const handleShare = useCallback(async () => {
    const text = '나의 경조사 센스는 [' + grade.title + '] ' + grade.emoji + '\n' + grade.percentile + '!\n\n너도 테스트해볼래?\nintoss://gyeongjohowmuch/quiz';
    try {
      await share({ message: text });
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        alert('링크가 복사되었어요!');
      } catch {
        alert('공유에 실패했어요');
      }
    }
  }, [grade]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-5 py-8">
      <div className="max-w-[400px] w-full rounded-2xl p-8 text-center" style={{ backgroundColor: grade.bgColor }}>
        <p className="text-sm text-[#8B95A1] mb-2">당신의 경조사 센스는?</p>
        <div className="text-7xl my-6">{grade.emoji}</div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: grade.color }}>{grade.title}</h1>
        <p className="text-base font-semibold mb-4" style={{ color: grade.color }}>{grade.percentile}</p>
        <p className="text-sm text-[#4E5968] leading-relaxed">{grade.description}</p>
        <div className="mt-6 pt-4 border-t border-black/10">
          <p className="text-xs text-[#8B95A1]">총점 {totalScore}점 / 20점</p>
        </div>
        <div className="mt-4 pt-3">
          <p className="text-xs text-[#B0B8C1]">나도 테스트해보기</p>
          <p className="text-xs text-[#3182F6] font-medium mt-1">intoss://gyeongjohowmuch/quiz</p>
        </div>
      </div>

      <div className="max-w-[400px] w-full mt-8 space-y-3">
        <button
          onClick={handleShare}
          className="w-full py-4 rounded-xl bg-[#3182F6] text-white font-semibold text-base"
        >
          📤 친구에게 공유하기
        </button>
        <button
          onClick={() => navigate('/quiz')}
          className="w-full py-4 rounded-xl bg-[#F2F3F5] text-[#333D4B] font-semibold text-base"
        >
          다시 테스트하기
        </button>
        <button
          onClick={() => navigate('/home')}
          className="w-full py-4 rounded-xl bg-[#F2F3F5] text-[#333D4B] font-semibold text-base"
        >
          나의 경조사비 추천받으러 가기
        </button>
      </div>

      <p className="text-xs text-[#B0B8C1] mt-6">경조사비얼마 | AI 기반 경조사비 추천 서비스</p>
    </div>
  );
}
