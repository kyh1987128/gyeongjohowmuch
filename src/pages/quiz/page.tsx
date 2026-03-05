import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const QUESTION_POOL = [
  {
    situation: '10년 넘게 연락 없던 초등학교 동창이 결혼합니다.',
    emoji: '💍',
    options: [
      { text: '안 간다', score: 0 },
      { text: '3만원', score: 1 },
      { text: '5만원', score: 2 },
      { text: '10만원', score: 3 },
    ],
  },
  {
    situation: '직장 상사 부모님 장례식. 입사한 지 2주 됐습니다.',
    emoji: '😢',
    options: [
      { text: '3만원', score: 1 },
      { text: '5만원', score: 2 },
      { text: '7만원', score: 3 },
      { text: '10만원', score: 4 },
    ],
  },
  {
    situation: '친한 친구의 셋째 출산. 첫째 때 10만원 줬습니다.',
    emoji: '👶',
    options: [
      { text: '5만원', score: 1 },
      { text: '동일하게 10만원', score: 3 },
      { text: '15만원', score: 4 },
      { text: '선물로 대체', score: 2 },
    ],
  },
  {
    situation: '사촌동생 결혼인데 부모님이 20만원 내라고 합니다. 내 월급은 250만원.',
    emoji: '💸',
    options: [
      { text: '시키는 대로 20만원', score: 3 },
      { text: '부모님 몰래 10만원', score: 1 },
      { text: '솔직하게 협상', score: 2 },
      { text: '빚을 내서라도', score: 4 },
    ],
  },
  {
    situation: '같은 달에 결혼식 3개 겹쳤습니다.',
    emoji: '📅',
    options: [
      { text: '다 간다', score: 4 },
      { text: '제일 친한 친구만', score: 2 },
      { text: '축의금만 보낸다', score: 3 },
      { text: '그 달은 아프다', score: 0 },
    ],
  },
  {
    situation: '회사 동료가 결혼하는데 팀 전체가 5만원씩 낸답니다. 나만 3만원 내면?',
    emoji: '🏢',
    options: [
      { text: '3만원 (내 사정이 우선)', score: 1 },
      { text: '5만원 (팀 분위기 맞춤)', score: 3 },
      { text: '7만원 (좀 더 챙김)', score: 4 },
      { text: '안 낸다', score: 0 },
    ],
  },
  {
    situation: '대학 선배 결혼식인데 졸업 후 가끔 연락합니다.',
    emoji: '🎓',
    options: [
      { text: '3만원', score: 1 },
      { text: '5만원', score: 2 },
      { text: '10만원', score: 3 },
      { text: '안 간다', score: 0 },
    ],
  },
  {
    situation: '친한 친구 아버지 장례식. 부의금으로 적절한 금액은?',
    emoji: '🖤',
    options: [
      { text: '3만원', score: 1 },
      { text: '5만원', score: 2 },
      { text: '10만원', score: 3 },
      { text: '20만원', score: 4 },
    ],
  },
  {
    situation: '직장 후배가 결혼합니다. 나는 과장이고 후배는 사원입니다.',
    emoji: '👔',
    options: [
      { text: '5만원', score: 1 },
      { text: '7만원', score: 2 },
      { text: '10만원', score: 3 },
      { text: '20만원', score: 4 },
    ],
  },
  {
    situation: '이웃집 아주머니 아들 결혼. 10년째 같은 아파트에 삽니다.',
    emoji: '🏠',
    options: [
      { text: '안 간다', score: 0 },
      { text: '3만원', score: 1 },
      { text: '5만원', score: 2 },
      { text: '10만원', score: 3 },
    ],
  },
  {
    situation: '내 결혼식에 5만원 준 친구가 결혼합니다. 나는 얼마를 줘야 할까?',
    emoji: '💌',
    options: [
      { text: '3만원 (요즘 형편이 어려워서)', score: 1 },
      { text: '똑같이 5만원', score: 3 },
      { text: '물가 올랐으니 7만원', score: 4 },
      { text: '10만원 (그냥 넉넉히)', score: 2 },
    ],
  },
  {
    situation: '조카가 돌잔치를 합니다. 형제자매 사이라 얼마가 적절할까요?',
    emoji: '🎈',
    options: [
      { text: '선물로 대체', score: 1 },
      { text: '10만원', score: 2 },
      { text: '20만원', score: 3 },
      { text: '30만원 이상', score: 4 },
    ],
  },
  {
    situation: '친구가 가게를 오픈합니다. 개업 축하금은?',
    emoji: '🎉',
    options: [
      { text: '방문만 한다', score: 1 },
      { text: '화환만 보낸다', score: 2 },
      { text: '5만원 + 화환', score: 3 },
      { text: '10만원', score: 4 },
    ],
  },
  {
    situation: '병문안을 가야 합니다. 직장 동료가 수술했습니다.',
    emoji: '🏥',
    options: [
      { text: '문병만 간다', score: 1 },
      { text: '과일바구니만', score: 2 },
      { text: '5만원 + 과일', score: 3 },
      { text: '10만원', score: 4 },
    ],
  },
  {
    situation: '온라인으로만 아는 친구(3년 교류)가 결혼합니다. 청첩장을 받았어요.',
    emoji: '💻',
    options: [
      { text: '무시한다', score: 0 },
      { text: '축하 메시지만', score: 1 },
      { text: '3만원 계좌이체', score: 2 },
      { text: '5만원 + 참석', score: 3 },
    ],
  },
  {
    situation: '스승의 날, 은사님께 감사 선물을 드리려 합니다.',
    emoji: '📚',
    options: [
      { text: '카드만', score: 1 },
      { text: '3만원대 선물', score: 2 },
      { text: '5만원대 선물', score: 3 },
      { text: '10만원 이상', score: 4 },
    ],
  },
  {
    situation: '친구 집들이에 초대받았습니다. 뭘 가져갈까요?',
    emoji: '🧹',
    options: [
      { text: '맨손으로 간다', score: 0 },
      { text: '휴지 + 세제', score: 2 },
      { text: '3만원대 와인', score: 3 },
      { text: '현금 5만원', score: 4 },
    ],
  },
  {
    situation: '후배 취업 축하! 첫 직장에 들어간 후배에게 얼마를 줄까요?',
    emoji: '🎯',
    options: [
      { text: '축하 메시지만', score: 1 },
      { text: '밥 한끼 사준다', score: 2 },
      { text: '5만원', score: 3 },
      { text: '10만원', score: 4 },
    ],
  },
  {
    situation: '팀장님이 승진했습니다. 팀원들끼리 축하를 준비하려 합니다.',
    emoji: '🎊',
    options: [
      { text: '구두 축하만', score: 1 },
      { text: '1만원씩 모아서 선물', score: 2 },
      { text: '3만원씩 모아서 선물', score: 3 },
      { text: '각자 5만원 이상', score: 4 },
    ],
  },
  {
    situation: '퇴직하는 부장님 송별회. 20년 근속하신 분입니다.',
    emoji: '👋',
    options: [
      { text: '팀 회식비만 참여', score: 1 },
      { text: '2만원씩 모아서 선물', score: 2 },
      { text: '5만원씩 모아서 선물', score: 3 },
      { text: '개인적으로 10만원 선물', score: 4 },
    ],
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Quiz() {
  const navigate = useNavigate();
  const questions = useMemo(() => shuffle(QUESTION_POOL).slice(0, 5), []);
  const [currentQ, setCurrentQ] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const question = questions[currentQ];
  const progress = ((currentQ) / questions.length) * 100;

  const handleSelect = (score: number, idx: number) => {
    if (isTransitioning) return;
    setSelected(idx);
    setIsTransitioning(true);
    const newScores = [...scores, score];

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setScores(newScores);
        setCurrentQ(currentQ + 1);
        setSelected(null);
        setIsTransitioning(false);
      } else {
        const total = newScores.reduce((a, b) => a + b, 0);
        navigate('/quiz-result', { state: { totalScore: total, answers: newScores } });
      }
    }, 600);
  };

  const getButtonClass = (idx: number) => {
    if (selected === idx) return "w-full py-4 px-5 rounded-xl text-left text-[15px] font-medium transition-all duration-300 bg-[#3182F6] text-white scale-[0.98]";
    return "w-full py-4 px-5 rounded-xl text-left text-[15px] font-medium transition-all duration-300 bg-[#F2F3F5] text-[#333D4B] hover:bg-[#E5E8EB]";
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} className="text-[#8B95A1] text-sm">
            ← 뒤로
          </button>
          <span className="text-sm text-[#8B95A1]">{currentQ + 1} / {questions.length}</span>
        </div>
        <div className="w-full bg-[#F2F3F5] rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#3182F6] h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: progress + "%" }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-8">
        <div className="text-center mb-10">
          <div className="text-6xl mb-5">{question.emoji}</div>
          <p className="text-lg font-bold text-[#191F28] leading-relaxed">
            {question.situation}
          </p>
        </div>

        <div className="space-y-3">
          {question.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(opt.score, idx)}
              disabled={isTransitioning}
              className={getButtonClass(idx)}
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-6 text-center">
        <p className="text-xs text-[#B0B8C1]">당신의 경조사 센스를 테스트해보세요!</p>
      </div>
    </div>
  );
}