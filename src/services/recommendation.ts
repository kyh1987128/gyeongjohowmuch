import { supabase } from '../lib/supabase';
import type { RecommendationResponse } from '../types';

// closeness 매핑 (프론트엔드 → DB)
const CLOSENESS_MAP: Record<string, string[]> = {
  아주친함: ['매우 친함', '아주친함', '아주 친함', '친함', '매우친함'],
  친한편: ['친함', '친한편', '친한 편', '보통'],
  보통: ['보통', '아는 사이', '아는사이'],
  그냥아는사이: ['아는 사이', '그냥아는사이', '거의 모름', '보통', '아는사이'],
};

/**
 * Edge Function을 통해 AI 추천 결과를 가져옵니다.
 */
export const fetchRecommendationFromAPI = async (
  conditions: Record<string, unknown>
): Promise<RecommendationResponse | null> => {
  try {
    const url = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/recommend`;
    console.log('📡 Edge Function 호출:', url);
    console.log('📤 요청 데이터:', conditions);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(conditions),
    });

    console.log('📥 HTTP 상태:', response.status);

    if (!response.ok) {
      console.error('❌ HTTP 에러:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('📥 응답 데이터:', data);

    if (data && data.success === true) {
      if (data.statistics?.distribution) {
        data.statistics.distribution = data.statistics.distribution.map((d: any) => ({
          label: d.label || d.range || '',
          percent: d.percent ?? d.percentage ?? 0,
        }));
      }

      if (data.similar_cases && data.similar_cases.length > 0 && typeof data.similar_cases[0] === 'string') {
        data.similar_cases = data.similar_cases.map((s: string) => {
          const m = s.match(/(\d+)만원/);
          return { situation: s, amount: m ? parseInt(m[1]) * 10000 : 50000 };
        });
      }

      if (data.templates && data.templates.length > 0) {
        data.templates = data.templates.map((t: any) => ({
          template: t.template || t.text || '',
          tone: t.tone || '일반',
        }));
      }

      if (!data.etiquette || data.etiquette.length === 0) {
        data.etiquette = getEtiquette(conditions.category as string);
      }

      console.log('✅ API 성공! 추천:', data.recommendation?.recommended);
      return data as RecommendationResponse;
    }

    console.warn('⚠️ success가 false:', data);
    return null;
  } catch (error) {
    console.error('❌ API 에러:', error);
    return null;
  }
};

/**
 * amount_guide 테이블에서 직접 추천 금액을 조회합니다 (Edge Function 실패 시 fallback).
 */
export const fetchRecommendationFromDB = async (
  conditions: Record<string, unknown>
): Promise<RecommendationResponse | null> => {
  try {
    console.log('🔄 DB fallback 시작:', conditions);

    const category = conditions.category as string;
    const relationship = conditions.relationship as string;
    const closeness = conditions.closeness as string;
    const myAgeGroup = conditions.my_age_group as string;

    const dbClosenessValues = CLOSENESS_MAP[closeness] || [closeness];
    console.log('🔍 매핑된 closeness 값들:', dbClosenessValues);

    // 1차: category + relationship + closeness(매핑)
    const { data: guideData, error: guideError } = await supabase
      .from('amount_guide')
      .select('*')
      .eq('category', category)
      .eq('relationship', relationship)
      .in('closeness', dbClosenessValues);

    console.log('📊 1차 쿼리 결과:', guideData, '에러:', guideError);

    if (!guideError && guideData && guideData.length > 0) {
      const guide = pickBestGuide(guideData, myAgeGroup);
      console.log('✅ DB 1차 쿼리 성공:', guide);
      return await buildResponse(guide, category);
    }

    // 2차: category + relationship (closeness 제외)
    console.warn('⚠️ 1차 실패, closeness 없이 재시도');
    const { data: fallback2 } = await supabase
      .from('amount_guide')
      .select('*')
      .eq('category', category)
      .eq('relationship', relationship);

    console.log('📊 2차 쿼리 결과:', fallback2);

    if (fallback2 && fallback2.length > 0) {
      const guide = pickBestGuide(fallback2, myAgeGroup);
      console.log('✅ DB 2차 쿼리 성공:', guide);
      return await buildResponse(guide, category);
    }

    // 3차: category만
    console.warn('⚠️ 2차 실패, category만으로 재시도');
    const { data: fallback3 } = await supabase
      .from('amount_guide')
      .select('*')
      .eq('category', category);

    console.log('📊 3차 쿼리 결과:', fallback3);

    if (fallback3 && fallback3.length > 0) {
      const guide = pickBestGuide(fallback3, myAgeGroup);
      console.log('✅ DB 3차 쿼리 성공:', guide);
      return await buildResponse(guide, category);
    }

    console.error('❌ DB fallback 완전 실패 - 데이터 없음');
    return null;
  } catch (error) {
    console.error('❌ DB fallback 에러:', error);
    return null;
  }
};

const pickBestGuide = (guides: any[], myAgeGroup?: string) => {
  if (myAgeGroup) {
    const matched = guides.find(
      (g) => g.age_group === myAgeGroup || g.my_age_group === myAgeGroup
    );
    if (matched) return matched;
  }
  return guides[0];
};

const buildResponse = async (
  guide: any,
  category: string
): Promise<RecommendationResponse> => {
  const { data: templates } = await supabase
    .from('message_templates')
    .select('template, tone')
    .eq('category', category)
    .limit(5);

  const { data: statsData } = await supabase
    .from('amount_guide')
    .select('recommended')
    .eq('category', category);

  const distribution = buildDistribution(statsData || []);
  const average =
    statsData && statsData.length > 0
      ? Math.round(
          statsData.reduce((sum: number, d: any) => sum + d.recommended, 0) /
            statsData.length
        )
      : guide.recommended;

  const { data: similarData } = await supabase
    .from('user_choices')
    .select('relationship, closeness, final_amount, my_age_group')
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(5);

  const similarCases = (similarData || []).slice(0, 3).map((c: any) => ({
    situation: `${c.my_age_group || ''} ${c.relationship || ''} ${category}`.trim(),
    amount: c.final_amount,
  }));

  return {
    success: true,
    recommendation: {
      recommended_min: guide.recommended_min,
      recommended: guide.recommended,
      recommended_max: guide.recommended_max,
      message:
        templates && templates.length > 0
          ? templates[0].template
          : '진심으로 축하드립니다. 행복한 앞날이 되시길 바랍니다.',
      comment: guide.ai_comment || '입력하신 조건에 맞는 적정 금액이에요.',
      gift_suggestion: '',
    },
    statistics: {
      average,
      distribution,
      source: guide.source || 'AI 분석 기반 추천',
    },
    reasons: [
      '해당 관계와 친밀도 기준 평균 금액입니다',
      '입력하신 조건에 적합한 범위입니다',
      '최근 경조사 트렌드를 반영한 추천입니다',
    ],
    similar_cases: similarCases.length > 0 ? similarCases : undefined,
    templates: (templates || []).map((t: any) => ({
      template: t.template,
      tone: t.tone,
    })),
    etiquette: getEtiquette(category),
  };
};

const buildDistribution = (
  data: any[]
): Array<{ label: string; percent: number }> => {
  if (data.length === 0) return [];

  const ranges = [
    { label: '3만원 이하', min: 0, max: 30000 },
    { label: '5만원', min: 30001, max: 50000 },
    { label: '7만원', min: 50001, max: 70000 },
    { label: '10만원', min: 70001, max: 100000 },
    { label: '10만원 이상', min: 100001, max: Infinity },
  ];

  const total = data.length;
  return ranges
    .map((range) => {
      const count = data.filter(
        (d: any) => d.recommended >= range.min && d.recommended <= range.max
      ).length;
      return {
        label: range.label,
        percent: Math.round((count / total) * 100),
      };
    })
    .filter((d) => d.percent > 0);
};

// 에티켓 가이드
export const getEtiquette = (category: string): string[] => {
  const etiquetteMap: Record<string, string[]> = {
    결혼식: [
      '결혼 축의금은 깨끗한 새 돈으로 준비하세요.',
      '축의금 봉투에 이름과 금액을 명확히 기재하세요.',
      '참석하지 못할 경우에도 축의금을 보내는 것이 예의입니다.',
    ],
    장례식: [
      '조의금은 깨끗한 흰 봉투에 담아 전달하세요.',
      '조문 시 검은색 또는 어두운 색 옷을 착용하세요.',
      '고인과 유가족에게 위로의 말을 전하세요.',
    ],
    출산: [
      '출산 축하금은 출산 후 1주일 이내에 전달하는 것이 좋습니다.',
      '현금 외에 실용적인 육아용품도 좋은 선물입니다.',
      '산모의 건강을 고려하여 방문 시간을 조율하세요.',
    ],
    생일: [
      '생일 선물은 상대방의 취향을 고려하여 준비하세요.',
      '환갑, 칠순 등 특별한 생일은 더 정성을 들이세요.',
      '축하 메시지와 함께 전달하면 더 의미 있습니다.',
    ],
    돌잔치: [
      '돌잔치 축의금은 깨끗한 봉투에 담아 전달하세요.',
      '금반지나 돌반지 등 전통 선물도 좋은 선택입니다.',
      '참석하지 못할 경우 미리 연락하고 축의금을 보내세요.',
      '백일잔치는 가까운 가족 위주로 소규모로 진행하는 경우가 많습니다.',
    ],
    병문안: [
      '병문안 시 환자의 상태를 먼저 확인하세요.',
      '과일이나 음료 등 간단한 선물을 준비하세요.',
      '오래 머물지 말고 짧게 위로의 말을 전하세요.',
    ],
    개업: [
      '개업 화환이나 축하 화분을 보내는 것이 일반적입니다.',
      '개업 당일 방문하여 축하 인사를 전하세요.',
      '현금 축의금도 좋은 선택입니다.',
    ],
    집들이: [
      '집들이 선물은 실용적인 생활용품이 좋습니다.',
      '휴지나 세제 등 소모품도 환영받는 선물입니다.',
      '방문 시간을 미리 조율하고 약속을 지키세요.',
    ],
    용돈: [
      '용돈은 깨끗한 새 돈으로 준비하세요.',
      '명절이나 특별한 날에 맞춰 전달하세요.',
      '정성스러운 마음을 담아 전달하는 것이 중요합니다.',
    ],
    회식: [
      '회식 비용은 직급과 역할에 따라 적절히 분담하세요.',
      '간사나 총무는 미리 예산을 계획하세요.',
      '참석 여부를 미리 확인하여 인원을 파악하세요.',
    ],
    스승의날: [
      '스승의 날 선물은 정성이 담긴 것이 좋습니다.',
      '단체로 준비할 경우 미리 의견을 모으세요.',
      '과도한 선물보다는 감사의 마음을 전하는 것이 중요합니다.',
    ],
    감사선물: [
      '감사 선물은 상대방의 취향을 고려하세요.',
      '감사의 마음을 담은 메시지를 함께 전달하세요.',
      '과도하지 않은 적절한 선물이 좋습니다.',
    ],
    약혼식: [
      '약혼 축하금은 깨끗한 봉투에 담아 전달하세요.',
      '약혼식은 결혼식보다 소규모이므로 금액도 그에 맞게 조정하세요.',
      '축하 메시지를 함께 전달하면 더 좋습니다.',
    ],
    상견례: [
      '상견례 비용은 보통 양가가 나누어 부담합니다.',
      '장소와 분위기에 맞는 복장을 준비하세요.',
      '첫 만남인 만큼 예의를 갖추되 자연스럽게 대화하세요.',
    ],
    승진축하: [
      '승진 축하는 소소한 선물이나 식사 대접도 좋습니다.',
      '축하 메시지와 함께 전달하면 더 의미 있습니다.',
      '직장 내 관계를 고려하여 적절한 금액을 선택하세요.',
    ],
    취업축하: [
      '취업 축하금은 사회생활 시작을 응원하는 마음으로 전달하세요.',
      '현금 외에 실용적인 직장생활 용품도 좋은 선물입니다.',
      '첫 취업과 이직은 금액 기준이 다를 수 있습니다.',
    ],
    퇴직: [
      '퇴직 선물은 그동안의 노고에 감사하는 마음을 담으세요.',
      '정년퇴직은 특별한 의미가 있으므로 정성을 더하세요.',
      '단체로 모아서 의미 있는 선물을 준비하는 것도 좋습니다.',
    ],
  };

  const baseCategory = category.includes('용돈') ? '용돈' : category;
  return etiquetteMap[baseCategory] || [
    '경조사비는 본인의 경제 상황에 맞게 결정하세요.',
    '금액보다 마음을 전하는 것이 더 중요합니다.',
    '상대방과의 관계와 왕래 빈도를 고려하세요.',
  ];
};

/**
 * 사용자 선택을 user_choices 테이블에 저장합니다.
 */
export const saveUserChoice = async (
  conditions: Record<string, unknown>,
  aiRecommended: number,
  finalAmount: number
): Promise<void> => {
  try {
    const insertData = {
      category: conditions.category || null,
      relationship: conditions.relationship || null,
      closeness: conditions.closeness || null,
      sub_detail: conditions.sub_detail || null,
      my_age_group: conditions.my_age_group || null,
      my_job: conditions.my_job || null,
      my_income: conditions.my_income || null,
      ai_recommended: Number(aiRecommended) || 0,
      final_amount: Number(finalAmount) || 0,
    };
    console.log('💾 user_choices 저장 데이터:', JSON.stringify(insertData));

    const { data, error } = await supabase.from('user_choices').insert(insertData);

    if (error) {
      console.error('❌ user_choices 저장 에러:', error.message, error.details, error.hint);
    } else {
      console.log('✅ user_choices 저장 성공:', data);
    }
  } catch (e) {
    console.error('❌ user_choices 예외:', e);
  }
};

/**
 * 비교 추천 금액을 DB에서 조회합니다.
 */
export const fetchCompareFromDB = async (
  category: string,
  field: 'closeness' | 'relationship',
  value: string,
  originalConditions: Record<string, unknown>
): Promise<number | null> => {
  try {
    const dbValue = field === 'closeness'
      ? (CLOSENESS_MAP[value] || [value])
      : [value];

    let query = supabase
      .from('amount_guide')
      .select('recommended')
      .eq('category', category);

    if (field === 'closeness') {
      query = query
        .eq('relationship', (originalConditions.relationship as string) || '')
        .in('closeness', dbValue);
    } else {
      const origCloseness = originalConditions.closeness as string;
      const dbCloseness = CLOSENESS_MAP[origCloseness] || [origCloseness];
      query = query
        .eq('relationship', value)
        .in('closeness', dbCloseness);
    }

    const { data } = await query;

    if (data && data.length > 0) {
      const myAge = originalConditions.my_age_group as string;
      if (myAge) {
        const matched = data.find((d: any) => d.age_group === myAge);
        if (matched) return matched.recommended;
      }
      return data[0].recommended;
    }
    return null;
  } catch {
    return null;
  }
};
