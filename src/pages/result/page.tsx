import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import BottomSheet from '../../components/BottomSheet';
import ShareCardModal from '../../components/ShareCardModal';
import { getCategoryEmoji, getCategoryName, formatAmount } from '../../utils/format';
import { saveRecord, saveRecentQuery } from '../../utils/storage';
import {
  fetchRecommendationFromAPI,
  fetchRecommendationFromDB,
  getEtiquette,
  saveUserChoice,
  fetchCompareFromDB,
} from '../../services/recommendation';
import type { RecommendationResponse } from '../../types';

type Phase = 'loading' | 'adReady' | 'showAd' | 'done';

const CATEGORY_BG_COLORS: Record<string, string> = {
  결혼식: '#FFE4E6',
  장례식: '#F3F4F6',
  출산: '#FEF3C7',
  생일: '#DBEAFE',
  돌잔치: '#FCE7F3',
  병문안: '#E0E7FF',
  개업: '#FEF3C7',
  집들이: '#D1FAE5',
  용돈: '#FEE2E2',
  명절: '#FEE2E2',
  세뱃돈: '#FEE2E2',
  추석: '#FEE2E2',
  격려금: '#FEE2E2',
  회식: '#DBEAFE',
  스승의날: '#FCE7F3',
  감사선물: '#E0E7FF',
};

const MOCK_DATA: RecommendationResponse = {
  success: true,
  recommendation: {
    recommended_min: 30000,
    recommended: 50000,
    recommended_max: 70000,
    message: "진심을 담아 축하드립니다. 늘 행복하시길 바랍니다.",
    comment: "일반적인 금액대를 기준으로 추천드립니다.",
    gift_suggestion: "상품권, 고급 디퓨저"
  },
  statistics: {
    average: 52000,
    category_average: 100000,
    filtered_count: 19,
    total_count: 77,
    distribution: [
      { label: "3만원 이하", percent: 5, min_amount: 0, max_amount: 30000 },
      { label: "5만원", percent: 26, min_amount: 35000, max_amount: 65000 },
      { label: "7만원", percent: 12, min_amount: 49000, max_amount: 91000 },
      { label: "10만원 이상", percent: 57, min_amount: 100000, max_amount: 300000 }
    ],
    source: "2024 한국경조사문화 실태조사 기반"
  },
  reasons: [
    "해당 관계의 평균 수준을 고려한 금액입니다.",
    "부담 없는 적정 금액을 추천드립니다.",
    "최근 물가 상승을 반영했습니다."
  ],
  similar_cases: [
    "카카오페이 2024 조사: 비슷한 상황에서 5만원이 가장 보편적",
    "신한은행 2024 설문: 친한 사이 7만원 이상 응답 35%",
    "인크루트 2024 설문: 불참 시 3만원 송금이 일반적"
  ],
  etiquette: [
    "경조사비는 본인의 경제 상황에 맞게 결정하세요.",
    "금액보다 마음을 전하는 것이 더 중요합니다.",
    "상대방과의 관계와 왕래 빈도를 고려하세요."
  ],
  templates: [],
  products: []
};

// ===== ★ Fix 4: 라벨 → 원(KRW) 범위 변환 폴백 파서 =====
function parseLabelToKRWRange(label: string): { min: number; max: number } {
  if (!label) return { min: 0, max: 0 };

  const cleaned = label.replace(/,/g, '').replace(/\s/g, '');

  // 숫자 + "만" 패턴 (예: 3만원, 10만원, 0.5만원)
  const manMatches = [...cleaned.matchAll(/([\d.]+)만/g)].map((m) => parseFloat(m[1]) * 10000);

  // 숫자 + "원" 패턴 (만원 제외, 예: 30000원, 50000원)
  const wonMatches = [...cleaned.matchAll(/([\d]+)원/g)]
    .filter((m) => {
      const idx = m.index ?? 0;
      return idx === 0 || cleaned[idx - 1] !== '만';
    })
    .map((m) => parseInt(m[1], 10));

  // 단독 숫자 (단위 없음, 1000 이상만)
  const bareMatches = [...cleaned.matchAll(/(?<![.\d만])([\d]+)(?![만원\d])/g)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => n >= 1000);

  const allNums = [...manMatches, ...wonMatches, ...bareMatches].filter((n) => n > 0);

  if (allNums.length === 0) return { min: 0, max: 0 };

  const isLessOrEqual = /이하|미만|≤|</.test(cleaned);
  const isGreaterOrEqual = /이상|초과|≥|>/.test(cleaned);

  // 범위 (두 숫자 이상)
  if (allNums.length >= 2 && !isLessOrEqual && !isGreaterOrEqual) {
    const sorted = [...allNums].sort((a, b) => a - b);
    return { min: sorted[0], max: sorted[sorted.length - 1] };
  }

  const val = allNums.length >= 2
    ? (isLessOrEqual ? Math.max(...allNums) : Math.min(...allNums))
    : allNums[0];

  if (isLessOrEqual) return { min: 0, max: val };
  if (isGreaterOrEqual) return { min: val, max: val * 2 };

  // 단일 숫자 → ±50% 범위
  return { min: val * 0.5, max: val * 1.5 };
}

// ===== ★ Fix 4: 퍼센타일 계산 함수 =====
function calculatePercentile(
  amount: number,
  distribution: { label: string; percent: number; min_amount?: number; max_amount?: number }[]
): { percentile: number; isTop: boolean; level: string; color: string; emoji: string } {

  if (!distribution || distribution.length === 0) {
    return { percentile: 50, isTop: true, level: '적절한 수준', color: '#6B7684', emoji: '👍' };
  }

  const ranges = distribution.map((d, idx) => {
    if (d.min_amount != null && d.max_amount != null) {
      return { min: d.min_amount, max: d.max_amount, percent: d.percent };
    }
    const parsed = parseLabelToKRWRange(d.label || '');
    return {
      min: parsed.min > 0 || parsed.max > 0 ? parsed.min : idx * 30000,
      max: parsed.max > 0 ? parsed.max : (idx + 1) * 30000,
      percent: d.percent,
    };
  });

  let cumulativeBelow = 0;
  let currentBucketIdx = ranges.length - 1;

  for (let i = 0; i < ranges.length; i++) {
    if (amount <= ranges[i].max) {
      currentBucketIdx = i;
      break;
    }
    cumulativeBelow += ranges[i].percent;
  }

  const bucket = ranges[currentBucketIdx];
  const bucketRange = bucket.max - bucket.min;
  const positionInBucket = bucketRange > 0
    ? Math.max(0, Math.min((amount - bucket.min) / bucketRange, 1))
    : 0.5;
  const totalBelow = cumulativeBelow + bucket.percent * positionInBucket;

  const topPercent = Math.max(1, Math.min(99, Math.round(100 - totalBelow)));

  const isTop = topPercent <= 50;
  const percentile = isTop ? topPercent : (100 - topPercent);

  let level: string;
  let color: string;
  let emoji: string;

  if (topPercent <= 20) {
    level = '넉넉한 마음';
    color = '#3182F6';
    emoji = '💎';
  } else if (topPercent <= 40) {
    level = '정성스러운 금액';
    color = '#10B981';
    emoji = '✨';
  } else if (topPercent <= 60) {
    level = '적절한 수준';
    color = '#6B7684';
    emoji = '👍';
  } else if (topPercent <= 80) {
    level = '부담 없는 선택';
    color = '#F59E0B';
    emoji = '😊';
  } else {
    level = '가벼운 마음';
    color = '#8B95A1';
    emoji = '🍀';
  }

  return { percentile, isTop, level, color, emoji };
}

// ===== ★ Fix 4: 분포 하이라이트 =====
function isAmountInBucket(
  amount: number,
  item: { label: string; percent: number; min_amount?: number; max_amount?: number }
): boolean {
  let min: number;
  let max: number;

  if (item.min_amount != null && item.max_amount != null) {
    min = item.min_amount;
    max = item.max_amount;
  } else {
    const parsed = parseLabelToKRWRange(item.label || '');
    min = parsed.min;
    max = parsed.max;
  }

  return amount >= min && amount <= max;
}

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const state = location.state as any;
  const conditions = state || {};

  const [phase, setPhase] = useState<Phase>('loading');
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [toast, setToast] = useState('');
  const [animatedAmount, setAnimatedAmount] = useState(0);
  const [detailUnlocked, setDetailUnlocked] = useState(false);
  const [isAd1Loading, setIsAd1Loading] = useState(false);
  const [isAd2Loading, setIsAd2Loading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [sliderAmount, setSliderAmount] = useState(0);
  const [hasAdjusted, setHasAdjusted] = useState(false);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveDate, setSaveDate] = useState(new Date().toISOString().split('T')[0]);
  const [saveName, setSaveName] = useState('');
  const [saveDirection, setSaveDirection] = useState<'보낸' | '받은'>('보낸');
  const [saveAmount, setSaveAmount] = useState('');
  const [saveMemo, setSaveMemo] = useState('');

  const [showShareModal, setShowShareModal] = useState(false);

  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareStep, setCompareStep] = useState<'select' | 'result'>('select');
  const [compareField, setCompareField] = useState<'closeness' | 'relationship' | null>(null);
  const [compareValue, setCompareValue] = useState('');
  const [compareAmount, setCompareAmount] = useState(0);
  const [compareLoading, setCompareLoading] = useState(false);

  const hasSavedRecent = useRef(false);

  const emoji = getCategoryEmoji(conditions.category || '');
  const categoryName = getCategoryName(conditions.category || '');
  
  const hasRequiredParams = state?.category && state?.relationship && state?.closeness;

  const fetchRecommendation = useCallback(async () => {
    if (!hasRequiredParams) {
      return;
    }

    if (!conditions.category || !conditions.relationship || !conditions.closeness) {
      setPhase('adReady');
      setData(MOCK_DATA);
      setSliderAmount(MOCK_DATA.recommendation.recommended);
      return;
    }

    setPhase('loading');
    setProgress(0);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const apiResult = await fetchRecommendationFromAPI(conditions);

      if (apiResult && apiResult.success === true) {
        clearInterval(progressTimer);
        setProgress(100);
        setData(apiResult);
        setSliderAmount(apiResult.recommendation.recommended);
        saveUserChoice(conditions, apiResult.recommendation.recommended, apiResult.recommendation.recommended);
        setTimeout(() => {
          setPhase('adReady');
        }, 600);
        return;
      }
    } catch (err) {
      console.warn('⚠️ API 실패, DB fallback 시도:', err);
    }

    try {
      const dbResult = await fetchRecommendationFromDB(conditions);
      if (dbResult) {
        clearInterval(progressTimer);
        setProgress(100);
        setData(dbResult);
        setSliderAmount(dbResult.recommendation.recommended);
        saveUserChoice(conditions, dbResult.recommendation.recommended, dbResult.recommendation.recommended);
        setTimeout(() => {
          setPhase('adReady');
        }, 600);
        return;
      }
    } catch (dbErr) {
      console.warn('⚠️ DB도 실패, mock 데이터 사용:', dbErr);
    }

    clearInterval(progressTimer);
    setProgress(100);
    setData(MOCK_DATA);
    setSliderAmount(MOCK_DATA.recommendation.recommended);
    setTimeout(() => {
      setPhase('adReady');
    }, 600);
  }, [conditions, hasRequiredParams]);

  useEffect(() => {
    if (!hasRequiredParams) {
      navigate('/', { replace: true });
    }
  }, [hasRequiredParams, navigate]);

  useEffect(() => {
    if (hasRequiredParams) {
      fetchRecommendation();
    }
  }, [fetchRecommendation, hasRequiredParams]);

  // REMOVED: useEffect(() => {
  // REMOVED: if (phase !== 'showAd') return;
  // REMOVED: if (adCountdown <= 0) {
  // REMOVED: setPhase('done');
  // REMOVED: return;
  // REMOVED: }
  // REMOVED: const timer = setTimeout(() => setAdCountdown((c) => c - 1), 1000);
  // REMOVED: return () => clearTimeout(timer);
  // REMOVED: }, [phase, adCountdown]);

  useEffect(() => {
    if (phase !== 'done' || !data) return;
    
    const target = data.recommendation.recommended;
    const duration = 1000;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, target);
      setAnimatedAmount(Math.round(current));
      if (step >= steps) {
        clearInterval(timer);
        setAnimatedAmount(target);
      }
    }, duration / steps);

    if (!hasSavedRecent.current) {
      hasSavedRecent.current = true;
      
      const myInfo = localStorage.getItem('gyeongjo_myinfo');
      let myData = { age: '', job: '', income: '' };
      if (myInfo) {
        try {
          const parsed = JSON.parse(myInfo);
          myData = {
            age: parsed.age || parsed.my_age_group || '',
            job: parsed.job || parsed.my_job || '',
            income: parsed.income || parsed.my_income || '',
          };
        } catch {
          // ignore
        }
      }

      saveRecentQuery({
        category: conditions.category || '',
        relationship: conditions.relationship || '',
        closeness: conditions.closeness || '',
        sub_detail: conditions.sub_detail,
        my_age_group: myData.age,
        my_job: myData.job,
        my_income: myData.income,
        recommended: data.recommendation.recommended,
      });
    }

    return () => clearInterval(timer);
  }, [phase, data, conditions]);

  if (!hasRequiredParams) {
    return null;
  }

  const getSliderRange = () => {
    if (!data) return { min: 10000, max: 200000, step: 10000 };
    const rec = data.recommendation;
    const min = Math.max(10000, Math.floor((rec.recommended_min * 0.5) / 10000) * 10000);
    const max = Math.ceil((rec.recommended_max * 1.5) / 10000) * 10000;
    return { min, max, step: 10000 };
  };

  const handleSliderChange = (value: number) => {
    setSliderAmount(value);
    if (!hasAdjusted) setHasAdjusted(true);
  };

  const finalAmount = hasAdjusted ? sliderAmount : (data?.recommendation.recommended || 0);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast('복사되었어요!');
    } catch {
      setToast('복사에 실패했어요');
    }
  };

  const handleSaveRecord = () => {
    if (!data) return;
    setSaveAmount(String(finalAmount));
    setSaveName('');
    setSaveMemo('');
    setSaveDirection('보낸');
    setSaveDate(new Date().toISOString().split('T')[0]);
    setShowSaveModal(true);
  };

  const handleSaveSubmit = () => {
    if (!saveName || !saveAmount || !data) return;
    saveRecord({
      eventDate: saveDate,
      category: conditions.category || '',
      targetName: saveName,
      relationship: conditions.relationship || '',
      direction: saveDirection,
      amount: Number(saveAmount),
      memo: saveMemo || undefined,
    });
    if (hasAdjusted) {
      saveUserChoice(conditions, data.recommendation.recommended, sliderAmount);
    }
    setShowSaveModal(false);
    setToast('저장되었어요! 📋');
  };

  const handleGoHome = () => {
    navigate('/home');
  };

  const handleTossSend = () => {
    if (!data) return;
    const amount = finalAmount;
    const tossUrl = `supertoss://send?amount=${amount}`;
    
    try {
      window.open(tossUrl, '_blank');
    } catch {
      setToast('토스 앱에서만 사용 가능합니다');
    }
  };

  const handleOpenCompare = () => {
    setShowCompareModal(true);
    setCompareStep('select');
    setCompareField(null);
    setCompareValue('');
    setCompareAmount(0);
  };

  const handleCloseCompare = () => {
    setShowCompareModal(false);
    setCompareStep('select');
    setCompareField(null);
    setCompareValue('');
    setCompareAmount(0);
  };

  const handleSelectCompareField = (field: 'closeness' | 'relationship') => {
    setCompareField(field);
  };

  const handleSelectCompareOption = async (option: string) => {
    if (!data) return;
    
    setCompareValue(option);
    setCompareLoading(true);

    const category = conditions.category as string;
    const field = compareField!;

    const dbAmount = await fetchCompareFromDB(category, field, option, conditions);

    if (dbAmount !== null) {
      setCompareAmount(Math.round(dbAmount / 10000) * 10000);
    } else {
      const currentAmount = data.recommendation.recommended;
      let estimated = currentAmount;

      if (field === 'closeness') {
        const closenessMultiplier: Record<string, number> = {
          '아주친함': 1.4,
          '친한편': 1.0,
          '보통': 0.7,
          '그냥아는사이': 0.5,
        };
        estimated = Math.round((currentAmount * (closenessMultiplier[option] || 1.0)) / 10000) * 10000;
      } else {
        const relationMultiplier: Record<string, number> = {
          '가족': 1.5,
          '친척': 1.3,
          '친구': 1.2,
          '직장동료': 1.0,
          '선배': 1.1,
          '후배': 0.9,
          '지인': 0.7,
        };
        estimated = Math.round((currentAmount * (relationMultiplier[option] || 1.0)) / 10000) * 10000;
      }

      setCompareAmount(estimated);
    }

    setCompareLoading(false);
    setCompareStep('result');
  };

  // ─── Phase 1: 로딩 ───
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5">
        <div className="max-w-[480px] w-full text-center">
          <div className="text-7xl mb-8 animate-[shake_0.5s_ease-in-out_infinite]">💌</div>
          <p className="text-lg text-[#191F28] font-semibold mb-2">
            AI가 적정 금액을 분석하고 있어요...
          </p>
          <p className="text-sm text-[#8B95A1] mb-8">
            {emoji} {categoryName} 데이터를 확인하고 있어요
          </p>
          <div className="w-full bg-[#F2F3F5] rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-[#3182F6] h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-[#B0B8C1] mt-3">{Math.round(Math.min(progress, 100))}%</p>
        </div>
      </div>
    );
  }

  // ─── Phase 2: 분석 완료 → 리워드 광고 → 결과 ───
  if (phase === 'adReady') {
    const handleWatchAd1 = async () => {
      setIsAd1Loading(true);
      try {
        const mod = await import('@apps-in-toss/web-framework');
        const adGroupId = 'ait.v2.live.c05b1d17ceda40da';
        if (mod.loadFullScreenAd && mod.loadFullScreenAd.isSupported()) {
          mod.loadFullScreenAd({
            options: { adGroupId },
            onEvent: (event: any) => {
              if (event.type === 'loaded') {
                mod.showFullScreenAd({
                  options: { adGroupId },
                  onEvent: (showEvent: any) => {
                    if (showEvent.type === 'userEarnedReward' || showEvent.type === 'dismissed') {
                      setIsAd1Loading(false);
                      setPhase('done');
                    }
                  },
                  onError: () => { setIsAd1Loading(false); setPhase('done'); },
                });
              }
            },
            onError: () => { setIsAd1Loading(false); setPhase('done'); },
          });
        } else {
          setIsAd1Loading(false);
          setPhase('done');
        }
      } catch (e) {
        console.log('Ad1 error:', e);
        setIsAd1Loading(false);
        setPhase('done');
      }
    };

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5">
        <div className="max-w-[480px] w-full text-center">
          <div className="text-7xl mb-8">🎉</div>
          <p className="text-xl text-[#191F28] font-bold mb-3">
            분석이 완료되었어요!
          </p>
          <p className="text-sm text-[#8B95A1] mb-3">
            {emoji} {categoryName} 맞춤 금액이 준비되었어요
          </p>
          <p className="text-xs text-[#B0B8C1] mb-10">
            짧은 광고 후 AI 추천 금액을 확인할 수 있어요
          </p>
          <Button
            onClick={handleWatchAd1}
            disabled={isAd1Loading}
            fullWidth
          >
            {isAd1Loading ? '광고 불러오는 중...' : '🎬 광고 보고 AI 추천 금액 확인하기'}
          </Button>
        </div>
      </div>
    );
  }


  // ─── Phase 4: 결과 표시 ───
  const displayData = data || MOCK_DATA;
  const currentAmount = displayData.recommendation.recommended;
  const difference = compareAmount - currentAmount;
  const differenceText = difference > 0 ? `+${formatAmount(difference)}` : formatAmount(difference);
  const differenceColor = difference > 0 ? '#EF4444' : '#10B981';

  const sliderRange = getSliderRange();
  const percentileInfo = calculatePercentile(
    sliderAmount,
    displayData.statistics.distribution
  );

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="max-w-[480px] mx-auto px-5">
        {/* 헤더 */}
        <header className="py-5 text-center">
          <h1 className="text-xl font-bold text-[#191F28]">
            {emoji} 봉이의 추천 💌
          </h1>
        </header>

        <div className="space-y-5 mt-4">
          {/* 금액 카드 */}
          <div className="bg-[#F9FAFB] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-center mb-5">
              <span className="inline-block bg-[#3182F6] text-white text-xs font-medium px-3 py-1 rounded-full">
                🤖 AI 추천
              </span>
            </div>
            <div className="flex items-end justify-center gap-4">
              <div className="text-center flex-1">
                <p className="text-base text-[#8B95A1] mb-1">
                  {formatAmount(displayData.recommendation.recommended_min)}
                </p>
                <p className="text-xs text-[#B0B8C1]">최소</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[32px] font-bold text-[#3182F6] mb-1">
                  {formatAmount(animatedAmount)}
                </p>
                <p className="text-sm text-[#3182F6] font-medium">추천</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-base text-[#8B95A1] mb-1">
                  {formatAmount(displayData.recommendation.recommended_max)}
                </p>
                <p className="text-xs text-[#B0B8C1]">최대</p>
              </div>
            </div>
            {displayData.recommendation.comment && (
              <p className="text-center text-sm text-[#6B7684] mt-5 leading-relaxed">
                💬 {displayData.recommendation.comment}
              </p>
            )}
          </div>

          {/* 💰 금액 조절 슬라이더 + 퍼센타일 */}

          {/* ─── 리워드 광고 잠금 영역 ─── */}
          {/* ─── 2차 잠금: 상세 분석 ─── */}
          {!detailUnlocked && (
            <div className="bg-gradient-to-b from-[#F0F4FF] to-[#E8F0FE] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-base font-bold text-[#191F28] mb-3">더 자세히 알아볼까요?</h3>
              <div className="space-y-2 mb-5">
                <p className="text-sm text-[#6B7684]">📊 이 금액, 상위 몇 %일까?</p>
                <p className="text-sm text-[#6B7684]">👥 다른 사람들은 얼마나 낼까?</p>
                <p className="text-sm text-[#6B7684]">💡 에티켓 & 꿀팁까지!</p>
              </div>
              <button
                onClick={async () => {
                  setIsAd2Loading(true);
                  try {
                    const mod = await import('@apps-in-toss/web-framework');
                    const adGroupId = 'ait.v2.live.c05b1d17ceda40da';
                    if (mod.loadFullScreenAd && mod.loadFullScreenAd.isSupported()) {
                      mod.loadFullScreenAd({
                        options: { adGroupId },
                        onEvent: (event: any) => {
                          if (event.type === 'loaded') {
                            mod.showFullScreenAd({
                              options: { adGroupId },
                              onEvent: (showEvent: any) => {
                                if (showEvent.type === 'userEarnedReward' || showEvent.type === 'dismissed') {
                                  setIsAd2Loading(false);
                                  setDetailUnlocked(true);
                                }
                              },
                              onError: () => { setIsAd2Loading(false); setDetailUnlocked(true); },
                            });
                          }
                        },
                        onError: () => { setIsAd2Loading(false); setDetailUnlocked(true); },
                      });
                    } else {
                      setIsAd2Loading(false);
                      setDetailUnlocked(true);
                    }
                  } catch {
                    setIsAd2Loading(false);
                    setDetailUnlocked(true);
                  }
                }}
                disabled={isAd2Loading}
                className="w-full py-4 rounded-2xl bg-[#3182F6] text-white font-semibold text-sm cursor-pointer transition-all active:scale-[0.97] hover:bg-[#1B64DA] disabled:opacity-50"
              >
                {isAd2Loading ? '광고 불러오는 중...' : '🔓 광고 보고 전체 분석 확인하기'}
              </button>
              <p className="text-xs text-[#B0B8C1] mt-2">짧은 영상 광고 시청 후 잠금이 해제됩니다</p>
            </div>
          )}

          {detailUnlocked && (
          <>

          {/* 💰 금액 조절 슬라이더 + 퍼센타일 */}
          <div className="bg-[#F9FAFB] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-semibold text-[#191F28] mb-2">
              💰 금액을 조절해보세요
            </h3>
            <p className="text-xs text-[#8B95A1] mb-5">
              슬라이더를 움직이면 같은 상황 대비 퍼센타일을 확인할 수 있어요
            </p>

            <div className="text-center mb-4">
              <p className="text-[28px] font-bold text-[#191F28]">
                {formatAmount(sliderAmount)}
              </p>
              {hasAdjusted && sliderAmount !== currentAmount && (
                <p className="text-xs mt-1" style={{ color: sliderAmount > currentAmount ? '#EF4444' : '#10B981' }}>
                  AI 추천 대비 {sliderAmount > currentAmount ? '+' : ''}{formatAmount(sliderAmount - currentAmount)}
                </p>
              )}
            </div>

            <div className="relative mb-4">
              <input
                type="range"
                min={sliderRange.min}
                max={sliderRange.max}
                step={10000}
                value={sliderAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSliderAmount(val);
                  setHasAdjusted(true);
                }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3182F6 ${((sliderAmount - sliderRange.min) / (sliderRange.max - sliderRange.min)) * 100}%, #E5E8EB ${((sliderAmount - sliderRange.min) / (sliderRange.max - sliderRange.min)) * 100}%)`,
                }}
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-[#B0B8C1]">{formatAmount(sliderRange.min)}</span>
                <span className="text-xs text-[#B0B8C1]">{formatAmount(sliderRange.max)}</span>
              </div>
            </div>

            <div className="flex gap-2 mb-5 flex-wrap justify-center">
              {[displayData.recommendation.recommended_min, displayData.recommendation.recommended, displayData.recommendation.recommended_max].map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setSliderAmount(amt); setHasAdjusted(true); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${sliderAmount === amt ? 'bg-[#3182F6] text-white' : 'bg-[#F2F3F5] text-[#6B7684]'}`}
                >
                  {formatAmount(amt)}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-4 text-center">
              <p className="text-sm text-[#6B7684]">
                같은 상황에서{' '}
                <span className="font-bold" style={{ color: percentileInfo.isTop ? '#3182F6' : '#6B7684' }}>
                  {percentileInfo.isTop ? '상위' : '하위'} {percentileInfo.percentile}%
                </span>
                에 해당합니다
              </p>
              <p className="text-xs text-[#8B95A1] mt-2">
                {percentileInfo.isTop && percentileInfo.percentile <= 30
                  ? '평균보다 넉넉하게 준비하시는 편이에요'
                  : percentileInfo.isTop && percentileInfo.percentile <= 50
                  ? '정성이 돋보이는 금액대예요'
                  : !percentileInfo.isTop && percentileInfo.percentile <= 30
                  ? '부담 없이 마음을 전하는 금액이에요'
                  : '가장 많은 분들이 선택하는 금액대예요'}
              </p>
            </div>
          </div>

          <Button onClick={handleOpenCompare} variant="outline" fullWidth>
            🔄 다른 조건으로 비교해보기
          </Button>


          {/* 📊 추천 근거 섹션 */}
          {displayData.statistics && displayData.reasons && (
            <div className="bg-[#F9FAFB] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <h3 className="text-base font-semibold text-[#191F28] mb-4">📊 왜 이 금액일까요?</h3>

              <div className="bg-white rounded-2xl p-4 mb-4">
                <p className="text-sm text-[#6B7684]">
                  같은 조건의 평균 금액:{' '}
                  <span className="font-semibold text-[#3182F6]">
                    {formatAmount(
                      displayData.statistics.average > 0
                        ? displayData.statistics.average
                        : displayData.recommendation.recommended
                    )}
                  </span>
                </p>
              </div>

              {displayData.statistics.distribution.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-[#8B95A1] mb-3">금액 분포</p>
                  <div className="space-y-2">
                    {displayData.statistics.distribution.map((item, idx) => {
                      const isHighlighted = isAmountInBucket(
                        displayData.recommendation.recommended,
                        item
                      );
                      
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-xs text-[#6B7684] w-20 flex-shrink-0">{item.label}</span>
                          <div className="flex-1 bg-[#E5E8EB] rounded-full h-6 overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isHighlighted ? 'bg-[#3182F6]' : 'bg-[#B0B8C1]'
                              }`}
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[#191F28] w-10 text-right">{item.percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-4 mb-3">
                <div className="space-y-2">
                  {displayData.reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-sm flex-shrink-0 mt-0.5">✅</span>
                      <p className="text-sm text-[#191F28] leading-relaxed">{reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-[#B0B8C1] text-center">{displayData.statistics.source}</p>
            </div>
          )}

          {/* ★ Fix 3: 비슷한 사례 (string | object 모두 처리) */}
          {displayData.similar_cases && displayData.similar_cases.length > 0 && (
            <div className="bg-[#F9FAFB] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <h3 className="text-base font-semibold text-[#191F28] mb-4">💡 이런 통계도 있어요</h3>
              <div className="space-y-3">
                {displayData.similar_cases.map((caseItem, idx) => {
                  const isString = typeof caseItem === 'string';
                  const situationText = isString ? caseItem : ((caseItem as any).situation || '');
                  const amountValue = isString ? null : (caseItem as any).amount;

                  return (
                    <div key={idx} className="bg-white rounded-2xl p-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-[#6B7684] flex-1 leading-relaxed">{situationText}</p>
                      {amountValue != null && amountValue > 0 && (
                        <p className="text-sm font-semibold text-[#191F28] flex-shrink-0">
                          {formatAmount(amountValue)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 선물 추천 */}
          {displayData.recommendation.gift_suggestion && (
            <div className="bg-[#FFFBEB] rounded-3xl px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <p className="text-sm text-[#92400E]">
                🎁 선물 추천: <strong>{displayData.recommendation.gift_suggestion}</strong>
              </p>
            </div>
          )}

          {/* 메시지 카드 */}
          <div className="bg-[#F9FAFB] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-base font-semibold text-[#191F28]">💬 이렇게 말해보세요</h3>
              <button
                onClick={() => copyToClipboard(displayData.recommendation.message)}
                className="w-8 h-8 flex items-center justify-center text-lg cursor-pointer transition-all active:scale-[0.97] whitespace-nowrap"
              >
                📋
              </button>
            </div>
            <p className="text-sm text-[#191F28] leading-relaxed mb-4">
              {displayData.recommendation.message}
            </p>
            <Button
              onClick={() => setShowShareModal(true)}
              variant="secondary"
              fullWidth
            >
              📤 카드로 공유하기
            </Button>
          </div>

          {/* 템플릿 슬라이더 */}
          {displayData.templates && displayData.templates.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-[#191F28] mb-3">📝 다른 문구도 있어요</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {displayData.templates.map((tpl, idx) => (
                  <div
                    key={idx}
                    className="bg-[#F9FAFB] rounded-3xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] min-w-[260px] flex-shrink-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-[#191F28] leading-relaxed flex-1">
                        {tpl.template}
                      </p>
                      <button
                        onClick={() => copyToClipboard(tpl.template)}
                        className="w-8 h-8 flex items-center justify-center text-lg cursor-pointer transition-all active:scale-[0.97] flex-shrink-0 whitespace-nowrap"
                      >
                        📋
                      </button>
                    </div>
                    {tpl.tone && (
                      <span className="inline-block mt-2 text-xs text-[#B0B8C1]">
                        #{tpl.tone === 'formal' || tpl.tone === '격식' ? '격식' : tpl.tone === 'casual' || tpl.tone === '캐주얼' ? '캐주얼' : '따뜻한'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 📌 봉투 에티켓 가이드 */}
          {displayData.etiquette && displayData.etiquette.length > 0 && (
            <div className="bg-[#FFF8E1] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <h3 className="text-base font-semibold text-[#191F28] mb-4">📌 이것만은 알아두세요</h3>
              <div className="space-y-3">
                {(Array.isArray(displayData.etiquette) ? displayData.etiquette : [displayData.etiquette]).map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0 mt-0.5">💡</span>
                    <p className="text-sm text-[#191F28] leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          </>
          )}

          {/* 버튼 영역 */}
          <div className="space-y-3 pt-2">
            <Button onClick={handleSaveRecord} variant="secondary" fullWidth>
              💾 기록 저장하기
            </Button>
            <button
              onClick={handleTossSend}
              className="w-full h-12 rounded-2xl font-medium text-[#191F28] cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap"
              style={{ backgroundColor: '#FFE600' }}
            >
              💸 토스로 {formatAmount(finalAmount)} 송금하기
            </button>
            <Button onClick={handleGoHome} variant="outline" fullWidth>
              🏠 처음으로
            </Button>
          </div>

          <p className="text-center text-xs text-[#B0B8C1] mt-2 pb-2">
            AI가 생성한 추천 결과입니다
          </p>
        </div>
      </div>

      {/* ─── 기록 저장 Bottom Sheet ─── */}
      <BottomSheet isOpen={showSaveModal} onClose={() => setShowSaveModal(false)}>
        <div className="p-6 pb-8">
          <div className="w-12 h-1 bg-[#E5E8EB] rounded-full mx-auto mb-6" />
          <h2 className="text-lg font-bold text-[#191F28] mb-5">💾 기록 저장하기</h2>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-[#191F28] mb-2">
                <span className="w-5 h-5 flex items-center justify-center">📅</span> 날짜
              </label>
              <input
                type="date"
                value={saveDate}
                onChange={(e) => setSaveDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#F9FAFB] text-[#191F28] text-sm border-none outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-[#191F28] mb-2">
                <span className="w-5 h-5 flex items-center justify-center">👤</span> 대상 이름
                <span className="text-[#FF6B6B] text-xs">*필수</span>
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-3 rounded-2xl bg-[#F9FAFB] text-[#191F28] text-sm border-none outline-none placeholder:text-[#B0B8C1]"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-[#191F28] mb-2">
                <span className="w-5 h-5 flex items-center justify-center">🔄</span> 보낸/받은
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSaveDirection('보낸')}
                  className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap ${
                    saveDirection === '보낸'
                      ? 'bg-[#3182F6] text-white'
                      : 'bg-[#F2F3F5] text-[#6B7684]'
                  }`}
                >
                  보낸 💸
                </button>
                <button
                  onClick={() => setSaveDirection('받은')}
                  className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap ${
                    saveDirection === '받은'
                      ? 'bg-[#3182F6] text-white'
                      : 'bg-[#F2F3F5] text-[#6B7684]'
                  }`}
                >
                  받은 💰
                </button>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-[#191F28] mb-2">
                <span className="w-5 h-5 flex items-center justify-center">💰</span> 금액
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={saveAmount}
                  onChange={(e) => setSaveAmount(e.target.value)}
                  placeholder="금액을 입력하세요"
                  className="w-full px-4 py-3 pr-10 rounded-2xl bg-[#F9FAFB] text-[#191F28] text-sm border-none outline-none placeholder:text-[#B0B8C1]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#B0B8C1]">
                  원
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                {[10000, 30000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setSaveAmount(String(amt))}
                    className="flex-1 py-2 rounded-xl bg-[#F2F3F5] text-xs text-[#6B7684] font-medium cursor-pointer transition-all active:scale-[0.97] whitespace-nowrap"
                  >
                    {formatAmount(amt)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-[#191F28] mb-2">
                <span className="w-5 h-5 flex items-center justify-center">📝</span> 메모
                <span className="text-[#B0B8C1] text-xs">선택</span>
              </label>
              <textarea
                value={saveMemo}
                onChange={(e) => {
                  if (e.target.value.length <= 500) setSaveMemo(e.target.value);
                }}
                placeholder="메모를 입력하세요"
                rows={2}
                maxLength={500}
                className="w-full px-4 py-3 rounded-2xl bg-[#F9FAFB] text-[#191F28] text-sm border-none outline-none resize-none placeholder:text-[#B0B8C1]"
              />
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={handleSaveSubmit} disabled={!saveName || !saveAmount} fullWidth>
              저장하기
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* ─── 공유 카드 모달 ─── */}
      <ShareCardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        categoryEmoji={emoji}
        categoryName={categoryName}
        message={displayData.recommendation.message}
        bgColor={CATEGORY_BG_COLORS[conditions.category] || '#FEE2E2'}
      />

      {/* ─── 비교 모달 ─── */}
      <BottomSheet isOpen={showCompareModal} onClose={handleCloseCompare}>
        <div className="p-6 pb-8">
          <div className="w-12 h-1 bg-[#E5E8EB] rounded-full mx-auto mb-6" />
          
          {compareStep === 'select' && (
            <>
              <h2 className="text-lg font-bold text-[#191F28] mb-3">🔄 다른 조건으로 비교</h2>
              <p className="text-sm text-[#6B7684] mb-5">
                현재 조건: {conditions.relationship} · {conditions.closeness}
              </p>

              {!compareField && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#191F28] mb-3">변경할 항목을 선택하세요</p>
                  <button
                    onClick={() => handleSelectCompareField('closeness')}
                    className="w-full py-4 rounded-2xl bg-[#F9FAFB] text-[#191F28] text-sm font-medium cursor-pointer transition-all active:scale-[0.98] hover:bg-[#F2F3F5] whitespace-nowrap"
                  >
                    친밀도 변경
                  </button>
                  <button
                    onClick={() => handleSelectCompareField('relationship')}
                    className="w-full py-4 rounded-2xl bg-[#F9FAFB] text-[#191F28] text-sm font-medium cursor-pointer transition-all active:scale-[0.98] hover:bg-[#F2F3F5] whitespace-nowrap"
                  >
                    관계 변경
                  </button>
                </div>
              )}

              {compareField === 'closeness' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-[#191F28]">친밀도 선택</p>
                    <button
                      onClick={() => setCompareField(null)}
                      className="text-xs text-[#B0B8C1] cursor-pointer hover:text-[#191F28] whitespace-nowrap"
                    >
                      ← 뒤로
                    </button>
                  </div>
                  {['아주친함', '친한편', '보통', '그냥아는사이'].map((option) => (
                    <button
                      key={option}
                      onClick={() => handleSelectCompareOption(option)}
                      disabled={option === conditions.closeness || compareLoading}
                      className={`w-full py-4 rounded-2xl text-sm font-medium cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap ${
                        option === conditions.closeness
                          ? 'bg-[#E5E8EB] text-[#B0B8C1] cursor-not-allowed'
                          : 'bg-[#F9FAFB] text-[#191F28] hover:bg-[#F2F3F5]'
                      }`}
                    >
                      {option} {option === conditions.closeness && '(현재)'}
                    </button>
                  ))}
                </div>
              )}

              {compareField === 'relationship' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-[#191F28]">관계 선택</p>
                    <button
                      onClick={() => setCompareField(null)}
                      className="text-xs text-[#B0B8C1] cursor-pointer hover:text-[#191F28] whitespace-nowrap"
                    >
                      ← 뒤로
                    </button>
                  </div>
                  {['가족', '친척', '친구', '직장동료', '선배', '후배', '지인'].map((option) => (
                    <button
                      key={option}
                      onClick={() => handleSelectCompareOption(option)}
                      disabled={option === conditions.relationship || compareLoading}
                      className={`w-full py-4 rounded-2xl text-sm font-medium cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap ${
                        option === conditions.relationship
                          ? 'bg-[#E5E8EB] text-[#B0B8C1] cursor-not-allowed'
                          : 'bg-[#F9FAFB] text-[#191F28] hover:bg-[#F2F3F5]'
                      }`}
                    >
                      {option} {option === conditions.relationship && '(현재)'}
                    </button>
                  ))}
                </div>
              )}

              {compareLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-[#6B7684]">조회 중...</span>
                </div>
              )}
            </>
          )}

          {compareStep === 'result' && (
            <>
              <h2 className="text-lg font-bold text-[#191F28] mb-5">📊 비교 결과</h2>
              
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white border-2 border-[#3182F6] rounded-2xl p-4">
                  <p className="text-xs text-[#3182F6] font-medium mb-2">현재 조건</p>
                  <p className="text-sm text-[#6B7684] mb-3">
                    {compareField === 'closeness' ? conditions.closeness : conditions.relationship}
                  </p>
                  <p className="text-2xl font-bold text-[#191F28]">
                    {formatAmount(currentAmount)}
                  </p>
                </div>

                <div className="bg-white border-2 border-[#6B7684] rounded-2xl p-4">
                  <p className="text-xs text-[#6B7684] font-medium mb-2">비교 조건</p>
                  <p className="text-sm text-[#6B7684] mb-3">
                    {compareValue}
                  </p>
                  <p className="text-2xl font-bold text-[#191F28]">
                    {formatAmount(compareAmount)}
                  </p>
                </div>
              </div>

              <div className="bg-[#F9FAFB] rounded-2xl p-4 text-center mb-5">
                <p className="text-sm text-[#6B7684] mb-1">차이</p>
                <p className="text-xl font-bold" style={{ color: differenceColor }}>
                  {differenceText}
                </p>
              </div>

              <div className="space-y-2">
                <Button onClick={handleCloseCompare} fullWidth>
                  확인
                </Button>
                <Button
                  onClick={() => setCompareStep('select')}
                  variant="outline"
                  fullWidth
                >
                  다시 비교하기
                </Button>
              </div>
            </>
          )}
        </div>
      </BottomSheet>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}