import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/Button';
import { getCategoryEmoji, getCategoryName } from '../../utils/format';

interface QuestionConfig {
  questions: {
    key: string;
    label: string;
    options: string[];
    required: boolean;
    hidden?: boolean;
    conditional?: {
      dependsOn: string;
      showWhen: string[];
    };
  }[];
}

const getQuestionConfig = (category: string): QuestionConfig => {
  const cat = (category || '').trim();

  // ─── 결혼식 ───
  if (cat === '결혼식') {
    return {
      questions: [
        { key: 'relationship', label: '신랑신부와 관계', options: ['친구', '직장동료', '선배', '후배', '친척', '가족', '지인'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'received_before', label: '이전에 상대방에게 경조사비를 받은 적 있나요?', options: ['예', '아니오', '기억안남'], required: false },
        { key: 'attendance', label: '참석 예정인가요?', options: ['예', '아니오', '미정'], required: false },
      ],
    };
  }

  // ─── 장례식 ───
  if (cat === '장례식') {
    return {
      questions: [
        { key: 'relationship', label: '상주와 관계', options: ['친구', '직장동료', '선배', '후배', '친척', '가족', '지인'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'received_before', label: '이전에 상대방에게 경조사비를 받은 적 있나요?', options: ['예', '아니오', '기억안남'], required: false },
        { key: 'attendance', label: '참석 예정인가요?', options: ['예', '아니오', '미정'], required: false },
      ],
    };
  }

  // ─── 출산 ───
  if (cat === '출산') {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['친구', '직장동료', '선배', '후배', '친척', '가족', '지인'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'child_order', label: '몇째 아이인가요?', options: ['첫째', '둘째', '셋째이상'], required: false },
        { key: 'gift_type', label: '선물과 현금 중 어떤 걸 고려하나요?', options: ['현금만', '선물만', '둘다'], required: false },
      ],
    };
  }

  // ─── 생일 ───
  if (cat === '생일') {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['친구', '직장동료', '선배', '후배', '친척', '가족', '지인', '연인'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'age_group', label: '상대방 나이대', options: ['10대', '20대', '30대', '40대', '50대', '60대이상'], required: false },
        { key: 'gift_type', label: '선물과 현금 중 어떤 걸 고려하나요?', options: ['현금만', '선물만', '둘다'], required: false },
      ],
    };
  }

  // ─── 돌잔치·백일 ───
  if (cat.includes('돌잔치') || cat.includes('백일')) {
    return {
      questions: [
        { key: 'relationship', label: '아기 부모와 관계', options: ['친구', '직장동료', '선배', '후배', '친척', '가족', '지인'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'event_type', label: '행사 종류', options: ['백일', '돌잔치'], required: true },
        { key: 'child_order', label: '몇째 아이인가요?', options: ['첫째', '둘째', '셋째이상'], required: false },
        { key: 'attendance', label: '참석 예정인가요?', options: ['예', '아니오', '미정'], required: false },
      ],
    };
  }

  // ─── 병문안 ───
  if (cat === '병문안') {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['친구', '직장동료', '선배', '후배', '친척', '가족', '지인'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'severity', label: '병환 정도', options: ['가벼운편', '보통', '심각한편'], required: false },
      ],
    };
  }

  // ─── 개업 ───
  if (cat === '개업') {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['친구', '직장동료', '선배', '후배', '친척', '가족', '지인'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'business_type', label: '업종', options: ['음식점', '카페', '소매점', '사무실', '기타'], required: false },
      ],
    };
  }

  // ─── 집들이 ───
  if (cat === '집들이') {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['친구', '직장동료', '선배', '후배', '친척', '가족', '지인'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'housewarming_type', label: '어떤 집들이인가요?', options: ['신혼집', '1인가구', '가족이사', '기타'], required: false },
        { key: 'house_type', label: '주거형태', options: ['아파트', '빌라', '단독주택', '오피스텔', '기타'], required: false },
      ],
    };
  }

  // ─── 회식 ───
  if (cat === '회식') {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['직장동료', '직장상사', '직장후배', '부서원'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'occasion', label: '회식 계기', options: ['정기회식', '프로젝트완료', '송별회', '환영회', '기타'], required: false },
      ],
    };
  }

  // ─── 스승의날 ───
  if (cat.includes('스승')) {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['선생님', '교수님', '은사님', '멘토'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'gift_type', label: '선물과 현금 중 어떤 걸 고려하나요?', options: ['현금만', '선물만', '둘다'], required: false },
      ],
    };
  }

  // ─── 감사선물 ───
  if (cat.includes('감사')) {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['친구', '직장동료', '선배', '후배', '친척', '가족', '지인', '은인'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'reason', label: '감사 이유', options: ['도움받음', '선물받음', '호의받음', '기타'], required: false },
      ],
    };
  }

  // ─── 승진축하 ───
  if (cat.includes('승진')) {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['직장동료', '직장상사', '직장후배', '부서원', '친구'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'position', label: '승진 직급', options: ['대리', '과장', '차장', '부장', '임원', '기타'], required: false },
      ],
    };
  }

  // ─── 취업축하 ───
  if (cat.includes('취업')) {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['친구', '선배', '후배', '친척', '가족', '지인'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'company_type', label: '회사 규모', options: ['대기업', '중견기업', '중소기업', '스타트업', '공공기관', '기타'], required: false },
      ],
    };
  }

  // ─── 퇴직 ───
  if (cat.includes('퇴직')) {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['직장동료', '직장상사', '직장후배', '부서원'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'retirement_type', label: '퇴직 유형', options: ['정년퇴직', '명예퇴직'], required: true },
        { key: 'gift_type', label: '선물과 현금 중 어떤 걸 고려하나요?', options: ['현금만', '선물만', '둘다'], required: false },
      ],
    };
  }

  // ─── 졸업·입학축하 ───
  if (cat.includes('졸업') || cat.includes('입학')) {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['조카', '친척아이', '친구자녀', '후배', '지인'], required: true },
        { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
        { key: 'event_type', label: '졸업인가요? 입학인가요?', options: ['졸업', '입학'], required: true },
        { key: 'school_level', label: '학교급', options: ['초등학교', '중학교', '고등학교', '대학교', '대학원'], required: true },
      ],
    };
  }

  // ─── 용돈-세뱃돈 ───
  if (cat.includes('세뱃돈')) {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['자녀', '손주', '조카', '친척아이', '이웃지인아이'], required: true },
        { key: 'closeness', label: '친밀도', options: ['자주만남', '가끔만남', '거의안만남'], required: true },
        { key: 'target_age', label: '받는 사람 나이대', options: ['미취학', '초등학생', '중학생', '고등학생', '대학생이상'], required: true },
      ],
    };
  }

  // ─── 용돈-시부모·장인장모 ───
  if (cat.includes('시부모') || cat.includes('장인장모')) {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['시부모장인장모'], required: true, hidden: true },
        { key: 'closeness', label: '관계 편안함', options: ['아직어색함', '보통', '편한편'], required: true },
        { key: 'parent_age', label: '시부모/장인장모 나이대는?', options: ['50대', '60대', '70대', '80대이상'], required: true },
        { key: 'occasion', label: '어떤 계기인가요?', options: ['명절', '생신', '그냥용돈', '건강문제', '특별한날'], required: false },
        { key: 'marriage_years', label: '결혼 연차', options: ['1~3년', '4~10년', '10년이상'], required: false },
      ],
    };
  }

  // ─── 용돈-부모님 ───
  if (cat.includes('부모님')) {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['부모님'], required: true, hidden: true },
        { key: 'closeness', label: '친밀도', options: ['아주친함'], required: true, hidden: true },
        { key: 'parent_age', label: '부모님 나이대는?', options: ['50대', '60대', '70대', '80대이상'], required: true },
        { key: 'occasion', label: '어떤 계기인가요?', options: ['명절', '생신', '그냥용돈', '건강문제', '특별한날'], required: false },
        { key: 'living_together', label: '동거 여부', options: ['같이삶', '따로삶'], required: false },
        { key: 'financial_status', label: '부모님 경제 상황', options: ['여유로움', '보통', '어려움', '모르겠음'], required: false },
      ],
    };
  }

  // ─── 용돈-조카 ───
  if (cat.includes('조카')) {
    return {
      questions: [
        { key: 'relationship', label: '관계', options: ['조카'], required: true, hidden: true },
        { key: 'closeness', label: '친밀도', options: ['자주만남', '가끔만남', '거의안만남'], required: true },
        { key: 'target_age', label: '조카 나이대', options: ['미취학', '초등학생', '중학생', '고등학생', '대학생이상'], required: true },
        { key: 'occasion', label: '어떤 계기인가요?', options: ['생일', '명절', '입학졸업', '시험합격', '그냥'], required: false },
      ],
    };
  }

  // ─── default ───
  return {
    questions: [
      { key: 'relationship', label: '관계', options: ['직장동료', '친구', '선배', '후배', '친척', '가족', '지인'], required: true },
      { key: 'closeness', label: '친밀도', options: ['그냥아는사이', '보통', '친한편', '아주친함'], required: true },
    ],
  };
};

export default function Input() {
  const location = useLocation();
  const navigate = useNavigate();
  const { category } = location.state || {};

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const config = getQuestionConfig(category);
  const emoji = getCategoryEmoji(category);
  const name = getCategoryName(category);

  useEffect(() => {
    const hiddenDefaults: Record<string, string> = {};
    config.questions.forEach((q) => {
      if (q.hidden && q.options.length > 0) {
        hiddenDefaults[q.key] = q.options[0];
      }
    });
    if (Object.keys(hiddenDefaults).length > 0) {
      setAnswers((prev) => ({ ...prev, ...hiddenDefaults }));
    }
  }, [category]);

  const shouldShowQuestion = (question: typeof config.questions[0]): boolean => {
    if (question.hidden) return false;
    if (!question.conditional) return true;
    const dependValue = answers[question.conditional.dependsOn];
    return question.conditional.showWhen.includes(dependValue);
  };

  const isComplete = config.questions
    .filter((q) => {
      if (!q.required) return false;
      if (q.hidden) return true;
      return shouldShowQuestion(q);
    })
    .every((q) => Boolean(answers[q.key]));

  const handleSubmit = async () => {
    if (!isComplete) return;

    const myInfoStr = localStorage.getItem('gyeongjo_myinfo');
    const myInfo = myInfoStr ? JSON.parse(myInfoStr) : {};

    const subDetail: Record<string, string> = {};
    Object.keys(answers).forEach((key) => {
      if (key !== 'relationship' && key !== 'closeness') {
        subDetail[key] = answers[key];
      }
    });

    navigate('/result', {
      state: {
        category,
        relationship: answers.relationship ?? '',
        closeness: answers.closeness ?? '보통',
        sub_detail: subDetail,
        my_age_group: myInfo.my_age_group ?? '',
        my_job: myInfo.my_job ?? '',
        my_income: myInfo.my_income ?? '선택안함',
      },
    });
  };

  if (!category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">카테고리를 선택해주세요</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 pb-24">
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-[480px] mx-auto px-5">
          <header className="flex items-center gap-3 py-5">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center text-2xl cursor-pointer transition-all active:scale-[0.97]"
            >
              ←
            </button>
            <h1 className="text-xl font-bold text-[#191F28]">
              {emoji} {name}
            </h1>
          </header>

          <div className="mt-8 mb-10">
            <div className="bg-[#F9FAFB] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <p className="text-lg text-[#191F28] font-medium text-center">
                💌 조금만 더 알려주세요!
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {config.questions.map((question) => {
              if (!shouldShowQuestion(question)) return null;

              return (
                <div key={question.key}>
                  <h3 className="text-base font-semibold text-[#191F28] mb-3">
                    {question.label}
                    {question.required && <span className="text-[#F04452]"> *</span>}
                    {!question.required && (
                      <span className="text-[#B0B8C1] text-sm"> (선택)</span>
                    )}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {question.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [question.key]: option,
                          }))
                        }
                        className={`px-5 py-3 rounded-2xl font-medium transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap ${
                          answers[question.key] === option
                            ? 'bg-[#3182F6] text-white'
                            : 'bg-[#F9FAFB] text-[#191F28]'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 pb-8">
            <Button onClick={handleSubmit} disabled={!isComplete} fullWidth>
              추천 받기 💌
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}