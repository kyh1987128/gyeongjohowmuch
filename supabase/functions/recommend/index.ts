import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

const CLOSENESS_MAP: Record<string, string[]> = {
  아주친함: ["매우 친함", "아주친함", "아주 친함", "친함"],
  친한편: ["친함", "친한편", "친한 편", "보통"],
  보통: ["보통", "아는 사이", "아는사이"],
  그냥아는사이: ["아는 사이", "그냥아는사이", "거의 모름", "보통"],
  편한편: ["친함", "편한편", "친한편", "아주친함"],
  아직어색함: ["아는 사이", "아직어색함", "그냥아는사이", "보통"],
  자주만남: ["매우 친함", "자주만남", "아주친함", "친함"],
  가끔만남: ["아는 사이", "가끔만남", "보통"],
  거의안만남: ["아는 사이", "거의안만남", "거의 모름", "그냥아는사이"],
};

// ===== 카테고리 정규화 =====
function resolveCategory(raw: string): { exact: string; parent: string } {
  const normalized = raw.replace(/[\s·]/g, "");
  if (normalized.includes("졸업") && normalized.includes("입학")) {
    return { exact: "졸업·입학축하", parent: "졸업·입학축하" };
  }
  if (raw === "졸업·입학축하" || raw === "졸업입학축하") {
    return { exact: "졸업·입학축하", parent: "졸업·입학축하" };
  }
  if (REAL_STATISTICS[raw]) {
    return { exact: raw, parent: raw };
  }
  const SUB_TO_PARENT: Record<string, string> = {
    "용돈-세뱃돈": "용돈",
    "용돈-부모님": "용돈",
    "용돈-부모님용돈": "용돈",
    "용돈-시부모장인장모": "용돈",
    "용돈-시부모장인장모용돈": "용돈",
    "용돈-조카": "용돈",
    "용돈-조카용돈": "용돈",
    "용돈-졸업입학": "졸업·입학축하",
    "용돈-졸업입학축하": "졸업·입학축하",
    돌잔치: "돌잔치·백일",
    백일: "돌잔치·백일",
    돌잔치백일: "돌잔치·백일",
  };
  if (SUB_TO_PARENT[raw]) {
    const exactKey = REAL_STATISTICS[raw] ? raw : SUB_TO_PARENT[raw];
    return { exact: exactKey, parent: SUB_TO_PARENT[raw] };
  }
  if (raw.startsWith("용돈-")) {
    return { exact: REAL_STATISTICS[raw] ? raw : "용돈", parent: "용돈" };
  }
  if (raw.includes("돌잔치") || raw.includes("백일")) {
    return { exact: "돌잔치·백일", parent: "돌잔치·백일" };
  }
  return { exact: raw, parent: raw };
}

function lookupByCategory<T>(
  map: Record<string, T>,
  raw: string,
  fallback: T
): T {
  const { exact, parent } = resolveCategory(raw);
  return map[exact] || map[parent] || fallback;
}

// ===== 카테고리별 fallback 금액 =====
const FALLBACK_AMOUNTS: Record<string, number> = {
  결혼식: 100000,
  장례식: 50000,
  출산: 50000,
  "돌잔치·백일": 50000,
  생일: 50000,
  병문안: 50000,
  개업: 50000,
  집들이: 30000,
  용돈: 50000,
  "용돈-세뱃돈": 50000,
  "용돈-부모님": 200000,
  "용돈-부모님용돈": 200000,
  "용돈-시부모장인장모": 200000,
  "용돈-시부모장인장모용돈": 200000,
  "용돈-조카": 50000,
  "용돈-조카용돈": 50000,
  "졸업·입학축하": 50000,
  "용돈-졸업입학": 50000,
  "용돈-졸업입학축하": 50000,
  스승의날: 30000,
  감사선물: 30000,
  회식: 30000,
  승진축하: 50000,
  취업축하: 50000,
  퇴직: 50000,
};

function getFallbackAmount(category: string): number {
  return lookupByCategory(FALLBACK_AMOUNTS, category, 50000);
}

// ===== 실제 통계 데이터 =====
const REAL_STATISTICS: Record<string, string> = {
  결혼식: `[실제 통계 - 결혼식 축의금]
- 카카오페이 2024.9 분석: 평균 축의금 9만원 (2021년 7.3만원 대비 23% 상승)
- 연령별 평균: 20대 6만원, 30~40대 10만원, 50~60대 12만원 (카카오페이 2024)
- 신한은행 2024 설문: 참석 시 10만원 응답 67.4%, 불참 시 5만원 응답 52.8%
- 인크루트 2024 직장인 설문: 덜 친한 동료 5만원(65.1%), 친한 동료 10만원(63.6%)
- KB국민카드 2024: 아는 사이 5만원 이하(53%), 친한 사이 5~10만원(52%), 매우 친한 사이 10~20만원(29%)
- 가연 2024 하반기: 참석 시 평균 8.6만원, 불참 시 평균 6만원
- 관계별: 가족 20~50만원+, 가까운 친척 10~20만원, 친한 친구 10~20만원, 일반 친구/동료 5~10만원
출처: 카카오페이(2024.9), 연합뉴스(2024.12.6), 신한은행, 인크루트, KB국민카드, 가연`,

  장례식: `[실제 통계 - 장례식 부의금/조의금]
- 가장 보편적 금액: 5만원 (유리지갑 glasswallet.com 통계)
- 2025년 관계별: 직계가족 20~50만원+, 가까운 친척 10~30만원, 친구·절친 5~20만원, 직장동료 5~10만원, 이웃·지인 3~5만원
- 홀수 금액 관례: 3만, 5만, 7만, 10만원 (4만, 9만원은 피함)
- 성균관 유도회 권고(2024.12): 5만원이면 적당
출처: 유리지갑(glasswallet.com 2024), 삼고상조(2025.11), 조선일보(2024.12.18), 고이장례 가이드북`,

  출산: `[실제 통계 - 출산 축하금]
- 친한 친구: 10~30만원, 직장동료: 5~10만원, 친척: 10~20만원+, 일반 지인: 3~5만원
- 선물 대체 시: 아기옷, 기저귀케이크 등 3~10만원 상당
- 첫째 출산이 둘째 이상보다 축하금이 높은 경향
출처: 시티4차(happykonge.com 2024.7)`,

  "돌잔치·백일": `[실제 통계 - 돌잔치·백일]
- 직장동료/가끔 보는 친구: 5~10만원
- 친한 직장동료/친한 친구: 10~20만원
- 친척 조카: 30만원 이상 또는 돌반지
- 백일: 돌잔치의 50~70% 수준
출처: 네이버 블로그(suwonjjang9 2023.12, bom_mm03 2024.9)`,

  생일: `[실제 통계 - 생일]
- 부모님 생신 용돈 평균: 30만원 (Daum 2020)
- 회갑·칠순·팔순: 부모님 20~50만원, 친척 10~30만원, 지인 5~10만원
- 친구 생일: 3~5만원(선물), 특별한 생일 5~10만원
출처: Daum 사회초년생 경조사 가이드(2020.5)`,

  병문안: `[실제 통계 - 병문안]
- 선물 금액: 지인/직장동료 3~5만원, 친한 사이 5~10만원
- 현금 위로금: 친한 친구·가족 5~10만원, 직장동료 3~5만원
출처: 네이버 블로그 병문안 에티켓 종합`,

  개업: `[실제 통계 - 개업 축하]
- 화환: 1단 5~7만원, 2단 10만원+
- 현금(친한 친구): 10만원 이상
- 현금(직장동료/지인): 5~10만원
출처: a-ha.io 질의응답(2023.10), 정성꽃배달`,

  집들이: `[실제 통계 - 집들이]
- 와이즐리 2024 설문(237명): 5만원 이내 72.27%, 10만원 이내 24.09%
- 일반적 선물 금액: 3~5만원
- 친한 사이: 5~10만원
- 신혼집 집들이는 일반 집들이보다 높은 경향
- 가장 받고 싶은 선물 1위: 인테리어소품(21.58%), 2위 휴지(19.04%)
출처: 와이즐리 블로그(blog.wiselycompany.com 2024)`,

  용돈: `[실제 통계 - 용돈 종합]
- 카카오페이 2026.2 발표(2025년 설 기준): 중고등학생 세뱃돈 10만원이 42%로 최다 (2024년까지는 5만원 39%가 최다였으나 역전)
- 연령별 적정 세뱃돈: 미취학 1~3만원, 초등 3~5만원, 중학생 5~10만원, 고등학생 10만원
- 부모님 명절 용돈: 20대 19만원, 30대 22만원, 40대 23만원 (평균 22만7천원)
출처: 카카오페이(2026.2.10), 핀포인트뉴스(2026.2.10), 국민일보(2026.2.10)`,

  "용돈-세뱃돈": `[실제 통계 - 세뱃돈(설날)]
- 카카오페이 2026.2 발표(2025년 설 기준): 중고등학생 세뱃돈 10만원이 42%로 최다 (2024년까지는 5만원 39%가 최다였으나 역전)
- 연령별: 미취학 1~3만원, 초등 3~5만원, 중학생 5~10만원, 고등학생 10만원
- 최근 5년간(2020~2024) 카카오페이 설날 송금봉투 이용건수 4배 이상, 금액 5.3배 증가
출처: 카카오페이(2026.2.10), 핀포인트뉴스(2026.2.10), 서울경제(2026.2.12)`,

  "용돈-부모님": `[실제 통계 - 부모님 용돈]
- 명절 용돈: 20대 19만원, 30대 22만원, 40대 23만원 (평균 22만7천원)
- 월 정기 용돈: 20~50만원이 일반적
- 부모님 생신 용돈 평균: 30만원 (Daum 2020)
출처: 카카오페이(2026.2.10), 국민일보(2026.2.10), Daum 사회초년생 가이드(2020)`,

  "용돈-부모님용돈": `[실제 통계 - 부모님 용돈]
- 명절 용돈: 20대 19만원, 30대 22만원, 40대 23만원 (평균 22만7천원)
- 월 정기 용돈: 20~50만원이 일반적
- 부모님 생신 용돈 평균: 30만원 (Daum 2020)
출처: 카카오페이(2026.2.10), 국민일보(2026.2.10), Daum 사회초년생 가이드(2020)`,

  "용돈-시부모장인장모": `[실제 통계 - 시부모/장인장모 용돈]
- 부모님과 동일 수준 관례 (양가 동일 금액 원칙)
- 명절 용돈: 20대 19만원, 30대 22만원, 40대 23만원 (평균 22만7천원)
- 생신 용돈: 20~30만원, 여유 있으면 30~50만원
출처: 카카오페이(2026.2.10), 국민일보(2026.2.10)`,

  "용돈-시부모장인장모용돈": `[실제 통계 - 시부모/장인장모 용돈]
- 부모님과 동일 수준 관례 (양가 동일 금액 원칙)
- 명절 용돈: 20대 19만원, 30대 22만원, 40대 23만원 (평균 22만7천원)
출처: 카카오페이(2026.2.10), 국민일보(2026.2.10)`,

  "용돈-조카": `[실제 통계 - 조카 용돈]
- 세뱃돈 기준: 미취학 1~3만원, 초등 3~5만원, 중고등 5~10만원
- 2025년 설 기준 중고등학생 10만원이 42%로 최다
- 입학/졸업 축하금: 초등 5~10만원, 중고등 10~20만원, 대학 10~30만원
출처: 카카오페이(2026.2.10), 매일경제(2025.1.24)`,

  "용돈-조카용돈": `[실제 통계 - 조카 용돈]
- 세뱃돈 기준: 미취학 1~3만원, 초등 3~5만원, 중고등 5~10만원
- 2025년 설 기준 중고등학생 10만원이 42%로 최다
- 입학/졸업 축하금: 초등 5~10만원, 중고등 10~20만원, 대학 10~30만원
출처: 카카오페이(2026.2.10), 매일경제(2025.1.24)`,

  "졸업·입학축하": `[실제 통계 - 졸업·입학 축하금]
- 초등학교 졸업/입학: 3~5만원
- 중학교: 5만원 내외
- 고등학교: 5~10만원
- 대학교 입학: 10~20만원 (가까운 친척은 30만원 이상도)
- 대학원: 10~30만원
- 조카 기준 평균 5~10만원
출처: 카카오페이 2024 경조사비 설문, 매일경제(2025.1.24), a-ha.io(2023)`,

  "용돈-졸업입학": `[실제 통계 - 졸업·입학 축하금]
- 초등: 3~5만원, 중고등: 5~10만원, 대학 입학: 10~20만원, 대학 졸업: 10~30만원
- 친척 조카: 5~20만원, 친한 친구 자녀: 5~10만원
출처: 카카오페이(2024), 매일경제(2025.1.24)`,

  "용돈-졸업입학축하": `[실제 통계 - 졸업·입학 축하금]
- 초등: 3~5만원, 중고등: 5~10만원, 대학 입학: 10~20만원, 대학 졸업: 10~30만원
출처: 카카오페이(2024), 매일경제(2025.1.24)`,

  스승의날: `[실제 통계 - 스승의날]
- 김영란법: 교사 선물 원칙적 금지
- 학원 선생님: 3~5만원 선물이 일반적
- 학부모 평균 지출: 2.9~4.2만원
출처: 경향신문(2012.5.15), 프라임경제(2012.5.15), 국민권익위원회`,

  감사선물: `[실제 통계 - 감사선물]
- 일반 감사: 3~5만원 (커피세트, 디저트 등)
- 특별한 감사: 5~10만원 (고급 선물세트)
- 직장 내: 커피 기프티콘 등 1~3만원
출처: 네이버 블로그 에티켓 가이드 종합`,

  회식: `[실제 통계 - 회식]
- 회식 N빵: 1인당 3~5만원
- 직장 회식 경조사성 모임: 1인당 2~5만원
출처: 네이버 블로그 직장생활 가이드 종합`,

  승진축하: `[실제 통계 - 승진축하]
- 친구/동료: 3~5만원, 상사/선배: 5~10만원
- 팀 공동: 1인당 1~3만원 → 총 10~30만원
출처: 네이버 블로그(openmind_ram 2024.1)`,

  취업축하: `[실제 통계 - 취업축하]
- 친구/동료: 3~5만원, 조카/친척: 10~20만원, 가족: 30~50만원+
출처: 네이버 블로그 경조사 가이드 종합`,

  퇴직: `[실제 통계 - 퇴직]
- 상사/선배 정년퇴직: 5~10만원, 동료: 3~5만원
- 팀 공동: 1인당 1~3만원 → 총 10~100만원
- 정년퇴직 시 감사패·기념품 포함이 일반적
출처: 네이버 블로그(openmind_ram 2024.1)`,
};

// ===== 카테고리별 기본 분포 (DB 데이터 없을 때 사용) =====
// ★ 수정: 정규 형태 { label, percent, min_amount, max_amount }
const DEFAULT_DISTRIBUTIONS: Record<
  string,
  { label: string; percent: number; min_amount: number; max_amount: number }[]
> = {
  결혼식: [
    { label: "3만원 이하", percent: 5, min_amount: 0, max_amount: 30000 },
    { label: "5만원", percent: 30, min_amount: 30000, max_amount: 60000 },
    { label: "10만원", percent: 45, min_amount: 60000, max_amount: 120000 },
    { label: "20만원", percent: 15, min_amount: 120000, max_amount: 250000 },
    { label: "30만원 이상", percent: 5, min_amount: 250000, max_amount: 500000 },
  ],
  장례식: [
    { label: "3만원", percent: 15, min_amount: 20000, max_amount: 40000 },
    { label: "5만원", percent: 50, min_amount: 40000, max_amount: 60000 },
    { label: "7만원", percent: 15, min_amount: 60000, max_amount: 80000 },
    { label: "10만원", percent: 15, min_amount: 80000, max_amount: 120000 },
    { label: "20만원 이상", percent: 5, min_amount: 120000, max_amount: 300000 },
  ],
  출산: [
    { label: "3만원 이하", percent: 10, min_amount: 0, max_amount: 30000 },
    { label: "5만원", percent: 35, min_amount: 30000, max_amount: 60000 },
    { label: "10만원", percent: 35, min_amount: 60000, max_amount: 120000 },
    { label: "20만원", percent: 15, min_amount: 120000, max_amount: 250000 },
    { label: "30만원 이상", percent: 5, min_amount: 250000, max_amount: 500000 },
  ],
  "돌잔치·백일": [
    { label: "5만원 이하", percent: 15, min_amount: 0, max_amount: 50000 },
    { label: "5~10만원", percent: 40, min_amount: 50000, max_amount: 100000 },
    { label: "10~20만원", percent: 30, min_amount: 100000, max_amount: 200000 },
    { label: "20~30만원", percent: 10, min_amount: 200000, max_amount: 300000 },
    { label: "30만원 이상", percent: 5, min_amount: 300000, max_amount: 500000 },
  ],
  생일: [
    { label: "3만원 이하", percent: 20, min_amount: 0, max_amount: 30000 },
    { label: "5만원", percent: 30, min_amount: 30000, max_amount: 60000 },
    { label: "10만원", percent: 25, min_amount: 60000, max_amount: 120000 },
    { label: "20만원", percent: 15, min_amount: 120000, max_amount: 250000 },
    { label: "30만원 이상", percent: 10, min_amount: 250000, max_amount: 500000 },
  ],
  병문안: [
    { label: "3만원 이하", percent: 15, min_amount: 0, max_amount: 30000 },
    { label: "3~5만원", percent: 45, min_amount: 30000, max_amount: 50000 },
    { label: "5~10만원", percent: 30, min_amount: 50000, max_amount: 100000 },
    { label: "10만원 이상", percent: 10, min_amount: 100000, max_amount: 200000 },
  ],
  개업: [
    { label: "5만원 이하", percent: 20, min_amount: 0, max_amount: 50000 },
    { label: "5~10만원", percent: 35, min_amount: 50000, max_amount: 100000 },
    { label: "10~20만원", percent: 30, min_amount: 100000, max_amount: 200000 },
    { label: "20만원 이상", percent: 15, min_amount: 200000, max_amount: 500000 },
  ],
  집들이: [
    { label: "3만원 이하", percent: 25, min_amount: 0, max_amount: 30000 },
    { label: "3~5만원", percent: 47, min_amount: 30000, max_amount: 50000 },
    { label: "5~10만원", percent: 24, min_amount: 50000, max_amount: 100000 },
    { label: "10만원 이상", percent: 4, min_amount: 100000, max_amount: 200000 },
  ],
  용돈: [
    { label: "1~3만원", percent: 20, min_amount: 10000, max_amount: 30000 },
    { label: "5만원", percent: 35, min_amount: 30000, max_amount: 60000 },
    { label: "10만원", percent: 25, min_amount: 60000, max_amount: 120000 },
    { label: "20만원", percent: 15, min_amount: 120000, max_amount: 250000 },
    { label: "30만원 이상", percent: 5, min_amount: 250000, max_amount: 500000 },
  ],
  "용돈-세뱃돈": [
    { label: "1~2만원", percent: 10, min_amount: 10000, max_amount: 20000 },
    { label: "3만원", percent: 15, min_amount: 20000, max_amount: 40000 },
    { label: "5만원", percent: 33, min_amount: 40000, max_amount: 60000 },
    { label: "10만원", percent: 37, min_amount: 60000, max_amount: 120000 },
    { label: "10만원 초과", percent: 5, min_amount: 120000, max_amount: 300000 },
  ],
  "용돈-부모님": [
    { label: "10만원 이하", percent: 10, min_amount: 0, max_amount: 100000 },
    { label: "10~20만원", percent: 30, min_amount: 100000, max_amount: 200000 },
    { label: "20~30만원", percent: 35, min_amount: 200000, max_amount: 300000 },
    { label: "30~50만원", percent: 20, min_amount: 300000, max_amount: 500000 },
    { label: "50만원 이상", percent: 5, min_amount: 500000, max_amount: 1000000 },
  ],
  "용돈-부모님용돈": [
    { label: "10만원 이하", percent: 10, min_amount: 0, max_amount: 100000 },
    { label: "10~20만원", percent: 30, min_amount: 100000, max_amount: 200000 },
    { label: "20~30만원", percent: 35, min_amount: 200000, max_amount: 300000 },
    { label: "30~50만원", percent: 20, min_amount: 300000, max_amount: 500000 },
    { label: "50만원 이상", percent: 5, min_amount: 500000, max_amount: 1000000 },
  ],
  "용돈-시부모장인장모": [
    { label: "10만원 이하", percent: 10, min_amount: 0, max_amount: 100000 },
    { label: "10~20만원", percent: 30, min_amount: 100000, max_amount: 200000 },
    { label: "20~30만원", percent: 35, min_amount: 200000, max_amount: 300000 },
    { label: "30~50만원", percent: 20, min_amount: 300000, max_amount: 500000 },
    { label: "50만원 이상", percent: 5, min_amount: 500000, max_amount: 1000000 },
  ],
  "용돈-시부모장인장모용돈": [
    { label: "10만원 이하", percent: 10, min_amount: 0, max_amount: 100000 },
    { label: "10~20만원", percent: 30, min_amount: 100000, max_amount: 200000 },
    { label: "20~30만원", percent: 35, min_amount: 200000, max_amount: 300000 },
    { label: "30~50만원", percent: 20, min_amount: 300000, max_amount: 500000 },
    { label: "50만원 이상", percent: 5, min_amount: 500000, max_amount: 1000000 },
  ],
  "용돈-조카": [
    { label: "1~3만원", percent: 20, min_amount: 10000, max_amount: 30000 },
    { label: "5만원", percent: 30, min_amount: 30000, max_amount: 60000 },
    { label: "10만원", percent: 35, min_amount: 60000, max_amount: 120000 },
    { label: "20만원", percent: 10, min_amount: 120000, max_amount: 250000 },
    { label: "20만원 초과", percent: 5, min_amount: 250000, max_amount: 500000 },
  ],
  "용돈-조카용돈": [
    { label: "1~3만원", percent: 20, min_amount: 10000, max_amount: 30000 },
    { label: "5만원", percent: 30, min_amount: 30000, max_amount: 60000 },
    { label: "10만원", percent: 35, min_amount: 60000, max_amount: 120000 },
    { label: "20만원", percent: 10, min_amount: 120000, max_amount: 250000 },
    { label: "20만원 초과", percent: 5, min_amount: 250000, max_amount: 500000 },
  ],
  "졸업·입학축하": [
    { label: "3만원 이하", percent: 10, min_amount: 0, max_amount: 30000 },
    { label: "5만원", percent: 30, min_amount: 30000, max_amount: 60000 },
    { label: "10만원", percent: 35, min_amount: 60000, max_amount: 120000 },
    { label: "20만원", percent: 20, min_amount: 120000, max_amount: 250000 },
    { label: "30만원 이상", percent: 5, min_amount: 250000, max_amount: 500000 },
  ],
  "용돈-졸업입학": [
    { label: "5만원 이하", percent: 15, min_amount: 0, max_amount: 50000 },
    { label: "5~10만원", percent: 35, min_amount: 50000, max_amount: 100000 },
    { label: "10~20만원", percent: 30, min_amount: 100000, max_amount: 200000 },
    { label: "20~30만원", percent: 15, min_amount: 200000, max_amount: 300000 },
    { label: "30만원 이상", percent: 5, min_amount: 300000, max_amount: 500000 },
  ],
  "용돈-졸업입학축하": [
    { label: "5만원 이하", percent: 15, min_amount: 0, max_amount: 50000 },
    { label: "5~10만원", percent: 35, min_amount: 50000, max_amount: 100000 },
    { label: "10~20만원", percent: 30, min_amount: 100000, max_amount: 200000 },
    { label: "20~30만원", percent: 15, min_amount: 200000, max_amount: 300000 },
    { label: "30만원 이상", percent: 5, min_amount: 300000, max_amount: 500000 },
  ],
  스승의날: [
    { label: "1만원 이하", percent: 10, min_amount: 0, max_amount: 10000 },
    { label: "1~3만원", percent: 40, min_amount: 10000, max_amount: 30000 },
    { label: "3~5만원", percent: 35, min_amount: 30000, max_amount: 50000 },
    { label: "5만원 이상", percent: 15, min_amount: 50000, max_amount: 100000 },
  ],
  감사선물: [
    { label: "1~3만원", percent: 30, min_amount: 10000, max_amount: 30000 },
    { label: "3~5만원", percent: 35, min_amount: 30000, max_amount: 50000 },
    { label: "5~10만원", percent: 25, min_amount: 50000, max_amount: 100000 },
    { label: "10만원 이상", percent: 10, min_amount: 100000, max_amount: 200000 },
  ],
  회식: [
    { label: "2만원 이하", percent: 10, min_amount: 0, max_amount: 20000 },
    { label: "3만원", percent: 35, min_amount: 20000, max_amount: 40000 },
    { label: "4~5만원", percent: 40, min_amount: 40000, max_amount: 50000 },
    { label: "5만원 이상", percent: 15, min_amount: 50000, max_amount: 100000 },
  ],
  승진축하: [
    { label: "3만원 이하", percent: 15, min_amount: 0, max_amount: 30000 },
    { label: "3~5만원", percent: 40, min_amount: 30000, max_amount: 50000 },
    { label: "5~10만원", percent: 30, min_amount: 50000, max_amount: 100000 },
    { label: "10만원 이상", percent: 15, min_amount: 100000, max_amount: 200000 },
  ],
  취업축하: [
    { label: "3만원 이하", percent: 15, min_amount: 0, max_amount: 30000 },
    { label: "3~5만원", percent: 30, min_amount: 30000, max_amount: 50000 },
    { label: "5~10만원", percent: 25, min_amount: 50000, max_amount: 100000 },
    { label: "10~20만원", percent: 20, min_amount: 100000, max_amount: 200000 },
    { label: "20만원 이상", percent: 10, min_amount: 200000, max_amount: 500000 },
  ],
  퇴직: [
    { label: "3만원 이하", percent: 15, min_amount: 0, max_amount: 30000 },
    { label: "3~5만원", percent: 35, min_amount: 30000, max_amount: 50000 },
    { label: "5~10만원", percent: 30, min_amount: 50000, max_amount: 100000 },
    { label: "10만원 이상", percent: 20, min_amount: 100000, max_amount: 300000 },
  ],
};
// ===== 기본 메시지 =====
const DEFAULT_MESSAGES: Record<string, string> = {
  결혼식: "결혼을 진심으로 축하드립니다. 행복한 앞날이 되시길 바랍니다.",
  장례식: "삼가 고인의 명복을 빕니다. 깊은 위로를 드립니다.",
  출산: "순산을 축하드립니다. 아기와 산모 모두 건강하시길 바랍니다.",
  "돌잔치·백일": "아기의 건강한 성장을 진심으로 축하드립니다.",
  생일: "생신을 진심으로 축하드립니다. 늘 건강하시길 바랍니다.",
  병문안: "빠른 쾌유를 빕니다. 하루빨리 건강 회복하시길 바랍니다.",
  개업: "개업을 진심으로 축하드립니다. 사업이 번창하시길 바랍니다.",
  집들이:
    "이사를 축하드립니다. 새 보금자리에서 좋은 일만 가득하시길 바랍니다.",
  용돈: "항상 건강하시고 행복하세요.",
  "용돈-세뱃돈": "새해 복 많이 받으세요!",
  "용돈-부모님": "항상 건강하시고, 감사한 마음을 담아 드립니다.",
  "용돈-부모님용돈": "항상 건강하시고, 감사한 마음을 담아 드립니다.",
  "용돈-시부모장인장모": "늘 건강하시고, 감사한 마음 전합니다.",
  "용돈-시부모장인장모용돈": "늘 건강하시고, 감사한 마음 전합니다.",
  "용돈-조카": "우리 조카, 항상 응원하고 있어! 사랑해!",
  "용돈-조카용돈": "우리 조카, 항상 응원하고 있어! 사랑해!",
  "졸업·입학축하": "졸업/입학을 진심으로 축하해! 멋진 앞날이 펼쳐질 거야!",
  "용돈-졸업입학": "졸업/입학을 진심으로 축하해! 멋진 앞날이 펼쳐질 거야!",
  "용돈-졸업입학축하":
    "졸업/입학을 진심으로 축하해! 멋진 앞날이 펼쳐질 거야!",
  스승의날: "감사한 마음을 담아 전합니다. 늘 존경합니다.",
  감사선물: "진심으로 감사드립니다. 늘 좋은 일만 가득하시길 바랍니다.",
  회식: "즐거운 시간 보내세요.",
  승진축하: "승진을 진심으로 축하드립니다. 더 큰 활약을 기대합니다.",
  취업축하: "취업을 진심으로 축하드립니다. 멋진 사회생활을 응원합니다.",
  퇴직: "그동안 수고 많으셨습니다. 새로운 시작을 응원합니다.",
};

// ===== 기본 similar_cases =====
const DEFAULT_SIMILAR_CASES: Record<string, string[]> = {
  결혼식: [
    "카카오페이 2024 조사: 평균 축의금 9만원, 30~40대는 평균 10만원 (2021년 7.3만원 대비 23% 상승)",
    "인크루트 2024 직장인 설문: 덜 친한 동료 5만원(65.1%), 친한 동료 10만원(63.6%)",
    "신한은행 2024 설문: 결혼식 참석 시 10만원 응답 67.4%, 불참 시 5만원 응답 52.8%",
  ],
  장례식: [
    "유리지갑(glasswallet.com) 2024 통계: 직장인 부의금으로 5만원이 가장 보편적",
    "삼고상조 2025 가이드: 직장동료 5~10만원, 친구·절친 5~20만원, 가까운 친척 10~30만원",
    "조선일보(2024.12.18): 성균관 유도회가 부의금 5만원이면 적당하다고 권고",
  ],
  출산: [
    "시티4차(happykonge.com) 2024: 친한 친구 출산 축하금 10~30만원",
    "시티4차 2024: 직장동료 출산 시 5~10만원, 선물 대체도 일반적",
    "시티4차 2024: 친척 출산 축하금 10~20만원+ 수준",
  ],
  "돌잔치·백일": [
    "네이버 블로그(suwonjjang9) 2023: 직장동료 돌잔치 5~10만원, 친한 친구 10~20만원",
    "네이버 블로그(bom_mm03) 2024: 친척 조카 돌잔치 30만원 이상 또는 돌반지",
    "네이버 블로그 2024: 백일은 돌잔치의 50~70% 수준이 관례",
  ],
  생일: [
    "Daum 사회초년생 가이드(2020): 부모님 생신 용돈 평균 30만원",
    "Daum 2020: 회갑·칠순·팔순 - 부모님 20~50만원, 친척 10~30만원, 지인 5~10만원",
    "Daum 2020: 친구 생일 선물 3~5만원, 특별한 생일 5~10만원",
  ],
  병문안: [
    "네이버 블로그 에티켓 가이드: 과일바구니·건강식품 3~5만원이 가장 보편적",
    "네이버 블로그 에티켓 가이드: 친한 사이 5~10만원 건강식품 또는 현금 위로금",
    "네이버 블로그 에티켓 가이드: 직장동료 병문안 3~5만원 선물이 적정",
  ],
  개업: [
    "a-ha.io(2023): 친한 친구 개업 시 현금 최소 10만원, 화환 5~7만원(1단)",
    "정성꽃배달: 직장동료·지인 개업 현금 5~10만원 또는 화환(5만원대)",
    "정성꽃배달: 2단 화환 10만원 이상, 대형 화환·난 화분도 선택 가능",
  ],
  집들이: [
    "와이즐리 2024 설문(237명): 집들이 선물 5만원 이내 72.27%, 10만원 이내 24.09%",
    "와이즐리 2024: 받고 싶은 선물 1위 인테리어소품(21.58%), 2위 휴지(19.04%)",
    "와이즐리 2024: 친한 사이 5~10만원, 일반 지인 3~5만원",
  ],
  용돈: [
    "카카오페이 2026.2 발표: 2025년 설 기준 중고등학생 세뱃돈 10만원이 42%로 최다",
    "국민일보 2026.2: 부모님 명절 용돈 평균 22만7천원 (20대 19만원, 30대 22만원, 40대 23만원)",
    "서울경제 2026.2: 최근 5년간 카카오페이 설날 송금봉투 이용건수 4배, 금액 5.3배 증가",
  ],
  "용돈-세뱃돈": [
    "카카오페이 2026.2 발표: 2025년 설 기준 중고등학생 세뱃돈 10만원이 42%로 최다 (전년 5만원 39% 역전)",
    "핀포인트뉴스 2026.2: 연령별 - 미취학 1~3만원, 초등 3~5만원, 중고등 5~10만원",
    "국민일보 2026.2: 부모님 명절 용돈 평균 22만7천원 (20대 19만원, 30대 22만원, 40대 23만원)",
  ],
  "용돈-부모님": [
    "카카오페이 2026.2 발표: 부모님 명절 용돈 평균 22만7천원 (20대 19만원, 30대 22만원, 40대 23만원)",
    "Daum 사회초년생 가이드(2020): 부모님 생신 용돈 평균 30만원",
    "카카오페이 2024: 월 정기 부모님 용돈 20~50만원이 일반적",
  ],
  "용돈-부모님용돈": [
    "카카오페이 2026.2 발표: 부모님 명절 용돈 평균 22만7천원 (20대 19만원, 30대 22만원, 40대 23만원)",
    "Daum 사회초년생 가이드(2020): 부모님 생신 용돈 평균 30만원",
    "카카오페이 2024: 월 정기 부모님 용돈 20~50만원이 일반적",
  ],
  "용돈-시부모장인장모": [
    "카카오페이 2026.2 발표: 시부모/장인장모 용돈은 부모님과 동일 수준 (양가 동일 원칙)",
    "국민일보 2026.2: 연령별 - 20대 19만원, 30대 22만원, 40대 23만원",
    "카카오페이 2024: 양가에 동일 금액을 드리는 것이 일반적",
  ],
  "용돈-시부모장인장모용돈": [
    "카카오페이 2026.2 발표: 시부모/장인장모 용돈은 부모님과 동일 수준 (양가 동일 원칙)",
    "국민일보 2026.2: 연령별 - 20대 19만원, 30대 22만원, 40대 23만원",
    "카카오페이 2024: 양가에 동일 금액을 드리는 것이 일반적",
  ],
  "용돈-조카": [
    "카카오페이 2026.2 발표: 2025년 설 기준 중고등학생 세뱃돈 10만원이 42%로 최다",
    "매일경제 2025.1: 입학/졸업 축하금 - 초등 5~10만원, 중고등 10~20만원, 대학 10~30만원",
    "카카오페이 2024: 조카 여러 명이면 일괄 동일 금액이 편리",
  ],
  "용돈-조카용돈": [
    "카카오페이 2026.2 발표: 2025년 설 기준 중고등학생 세뱃돈 10만원이 42%로 최다",
    "매일경제 2025.1: 입학/졸업 축하금 - 초등 5~10만원, 중고등 10~20만원, 대학 10~30만원",
    "카카오페이 2024: 조카 여러 명이면 일괄 동일 금액이 편리",
  ],
  "졸업·입학축하": [
    "매일경제 2025.1: 졸업/입학 축하금 - 초등 3~5만원, 중고등 5~10만원, 대학 10~20만원",
    "카카오페이 2024: 친척 조카 졸업·입학 축하금 5~20만원",
    "a-ha.io 2023: 대학 입학 조카에게 20만원 용돈 + 별도 축하금이 일반적",
  ],
  "용돈-졸업입학": [
    "매일경제 2025.1: 졸업/입학 축하금 - 초등 5~10만원, 중고등 10~20만원, 대학 10~30만원",
    "카카오페이 2024: 친척 조카 졸업 축하금 5~20만원",
    "a-ha.io 2023: 대학 입학 조카에게 20만원 용돈이 일반적",
  ],
  "용돈-졸업입학축하": [
    "매일경제 2025.1: 졸업/입학 축하금 - 초등 5~10만원, 중고등 10~20만원, 대학 10~30만원",
    "카카오페이 2024: 친척 조카 졸업 축하금 5~20만원",
    "a-ha.io 2023: 대학 입학 조카에게 20만원 용돈이 일반적",
  ],
  스승의날: [
    "국민권익위원회: 김영란법상 공립학교 교사에게는 선물 자체가 금지",
    "경향신문(2012.5): 학부모 평균 지출 2.9~4.2만원, 3만원 이하 39.3%",
    "프라임경제(2012.5): 학원 선생님 3~5만원 선물이 일반적",
  ],
  감사선물: [
    "네이버 블로그 에티켓 가이드: 감사 선물 3~5만원 (커피세트, 디저트)",
    "네이버 블로그 에티켓 가이드: 특별한 감사 5~10만원 (고급 선물세트)",
    "네이버 블로그 에티켓 가이드: 직장 내 감사 커피 기프티콘 1~3만원",
  ],
  회식: [
    "네이버 블로그 직장생활 가이드: 회식 N빵 1인당 3~5만원",
    "네이버 블로그 직장생활 가이드: 경조사성 모임 1인당 2~5만원",
    "네이버 블로그 직장생활 가이드: 부서 회식 상사 전액 부담도 일반적",
  ],
  승진축하: [
    "네이버 블로그(openmind_ram) 2024: 친구·동료 승진 축하 3~5만원",
    "네이버 블로그(openmind_ram) 2024: 상사·선배 승진 5~10만원 선물",
    "네이버 블로그(openmind_ram) 2024: 팀 공동 1인당 1~3만원 → 총 10~30만원",
  ],
  취업축하: [
    "네이버 블로그 경조사 가이드: 친구·동료 취업 축하 3~5만원",
    "네이버 블로그 경조사 가이드: 조카·친척 취업 10~20만원 현금",
    "네이버 블로그 경조사 가이드: 가족 정장 구입비 30~50만원+",
  ],
  퇴직: [
    "네이버 블로그(openmind_ram) 2024: 상사·선배 퇴직 선물 5~10만원",
    "네이버 블로그(openmind_ram) 2024: 동료 퇴직 3~5만원 또는 팀 공동(1인당 1~3만원)",
    "네이버 블로그(openmind_ram) 2024: 정년퇴직 팀 전체 10~100만원 기념 선물",
  ],
};

// ===== 기본 에티켓 =====
const DEFAULT_ETIQUETTE: Record<string, string[]> = {
  결혼식: [
    "축의금 봉투에 '축 결혼' 또는 '축의(祝儀)'라고 적고, 뒷면에 이름과 소속을 씁니다.",
    "축의금은 새 지폐로 홀수 금액(3만, 5만, 7만, 10만원)으로 준비하세요.",
    "식장 도착 후 먼저 방명록 작성하고 축의금을 전달합니다.",
  ],
  장례식: [
    "부의금 봉투에 '부의(賻儀)' 또는 '근조(謹弔)'라고 적고, 뒷면에 이름을 씁니다.",
    "부의금은 깨끗한 지폐로, 홀수 금액(3만, 5만, 7만원)으로 준비하세요.",
    "조문 시 '삼가 고인의 명복을 빕니다'라고 짧게 인사합니다.",
  ],
  출산: [
    "출산 직후보다는 1~2주 뒤 방문하는 것이 좋습니다.",
    "산모에게는 영양 음식, 아기에게는 의류나 용품을 선물하면 좋습니다.",
    "방문 시간은 30분 이내로 짧게, 산모 휴식을 배려하세요.",
  ],
  "돌잔치·백일": [
    "돌잔치 축의금 봉투에 '축 첫돌' 또는 '축 백일'이라고 적습니다.",
    "현금 대신 돌반지·돌팔찌 같은 금 제품도 좋습니다.",
    "밝은 색상의 옷을 입고 참석하는 것이 적절합니다.",
  ],
  생일: [
    "어른 생신에는 '생신 축하드립니다'라고 정중하게 인사하세요.",
    "회갑·칠순·팔순에는 봉투에 '축 회갑(칠순/팔순)'이라고 적습니다.",
    "건강 기원 선물(건강식품, 안마기 등)이 환영받습니다.",
  ],
  병문안: [
    "병문안은 15~30분 이내로 짧게, 환자 컨디션을 살피세요.",
    "과일바구니나 건강식품이 실용적이고 환영받는 선물입니다.",
    "감염 우려 시나 수술 직후에는 전화·문자로 대체하세요.",
  ],
  개업: [
    "개업 축하 화환에 '축 개업' 또는 '祝 開業'이라고 적습니다.",
    "현금은 봉투에 '축 개업'이라고 적고 이름을 씁니다.",
    "방문이 어려우면 배달 화환이나 난 화분을 보내세요.",
  ],
  집들이: [
    "휴지, 세제, 디퓨저 같은 실용적 선물이 인기입니다.",
    "음식은 케이크나 과일 등 바로 먹을 수 있는 것이 좋습니다.",
    "현금은 봉투에 '이사 축하' 또는 '집들이 축하'라고 적습니다.",
  ],
  용돈: [
    "세뱃돈은 새 지폐로 봉투에 넣어 드리세요.",
    "부모님 용돈은 봉투에 넣어 두 손으로 공손하게 드립니다.",
    "어른에게 돈을 드릴 때는 두 손으로 공손하게 드리세요.",
  ],
  "용돈-세뱃돈": [
    "새 지폐로 세뱃돈 봉투(복주머니)에 넣어 드리세요.",
    "세배를 한 뒤 두 손으로 공손하게 받는 것이 예의입니다.",
    "형제간 아이에게는 동일 금액이 무난합니다.",
  ],
  "용돈-부모님": [
    "봉투에 '감사합니다' 또는 '효도 용돈'이라고 적으면 좋습니다.",
    "양가 부모님께 동일 금액으로 드리는 것이 좋습니다.",
    "현금과 함께 건강식품이나 영양제를 곁들이면 더 좋습니다.",
  ],
  "용돈-부모님용돈": [
    "봉투에 '감사합니다' 또는 '효도 용돈'이라고 적으면 좋습니다.",
    "양가 부모님께 동일 금액으로 드리는 것이 좋습니다.",
    "현금과 함께 건강식품이나 영양제를 곁들이면 더 좋습니다.",
  ],
  "용돈-시부모장인장모": [
    "배우자와 상의 후 양가 동일 금액으로 드리세요.",
    "봉투에 넣어 두 손으로 공손하게 드리는 것이 기본 예의입니다.",
    "건강 기원 선물(건강식품, 안마기)을 곁들이면 좋습니다.",
  ],
  "용돈-시부모장인장모용돈": [
    "배우자와 상의 후 양가 동일 금액으로 드리세요.",
    "봉투에 넣어 두 손으로 공손하게 드리는 것이 기본 예의입니다.",
    "건강 기원 선물(건강식품, 안마기)을 곁들이면 좋습니다.",
  ],
  "용돈-조카": [
    "깨끗한 봉투에 넣어 전달하세요.",
    "형제간 조카에게는 동일 금액이 형평성에 좋습니다.",
    "어린 조카에게는 장난감·문구류로 대체해도 좋습니다.",
  ],
  "용돈-조카용돈": [
    "깨끗한 봉투에 넣어 전달하세요.",
    "형제간 조카에게는 동일 금액이 형평성에 좋습니다.",
    "어린 조카에게는 장난감·문구류로 대체해도 좋습니다.",
  ],
  "졸업·입학축하": [
    "봉투에 '축 졸업' 또는 '축 입학'이라고 적습니다.",
    "학용품·책·문화상품권 등 실용적 선물을 곁들이면 좋습니다.",
    "졸업식이나 입학식에 직접 참석하면 더 의미 있습니다.",
  ],
  "용돈-졸업입학": [
    "봉투에 '축 입학' 또는 '축 졸업'이라고 적습니다.",
    "학용품·책·문화상품권 등 실용적 선물을 곁들이면 좋습니다.",
    "졸업식이나 입학식에 직접 참석하면 더 의미 있습니다.",
  ],
  "용돈-졸업입학축하": [
    "봉투에 '축 입학' 또는 '축 졸업'이라고 적습니다.",
    "학용품·책·문화상품권 등 실용적 선물을 곁들이면 좋습니다.",
    "졸업식이나 입학식에 직접 참석하면 더 의미 있습니다.",
  ],
  스승의날: [
    "김영란법상 공립학교 교사에게는 선물을 하지 않는 것이 원칙입니다.",
    "학원 선생님에게는 5만원 이하 선물이나 편지가 적절합니다.",
    "손편지와 카네이션으로 감사한 마음을 전하는 것이 가장 좋습니다.",
  ],
  감사선물: [
    "상대방의 취향을 고려해서 선택하세요.",
    "직장 감사 선물은 커피, 차, 디저트 세트 등 부담 없는 것이 좋습니다.",
    "짧은 감사 카드를 동봉하면 진심이 더 잘 전달됩니다.",
  ],
  회식: [
    "N빵인지 상사 부담인지 미리 확인하세요.",
    "상사나 어른에게 먼저 술잔을 권하는 것이 예의입니다.",
    "2차 불참 시 미리 양해를 구하되, 1차는 가급적 참석하세요.",
  ],
  승진축하: [
    "봉투에 '축 승진' 또는 '축 영전'이라고 적습니다.",
    "팀 단위로 고급 선물(만년필, 와인)을 주는 것도 좋습니다.",
    "축하 메시지와 식사 대접도 의미 있는 방법입니다.",
  ],
  취업축하: [
    "봉투에 '축 취업'이라고 적어서 전달합니다.",
    "정장, 넥타이, 명함지갑 등 실용적 선물도 환영받습니다.",
    "격려의 메시지를 함께 전하세요.",
  ],
  퇴직: [
    "개인 취미나 관심사를 반영한 선물이 의미 있습니다.",
    "정년퇴직에는 감사패나 기념 앨범을 함께 준비하면 좋습니다.",
    "봉투에 '고생 많으셨습니다' 또는 '새 출발을 응원합니다'라고 적습니다.",
  ],
};

// ===== 라벨 → 원(KRW) 금액 변환 헬퍼 =====
function parseLabelToKRW(label: string): number[] {
  const rawMatches = label.match(/[\d,]+/g) || [];
  const allNums = rawMatches.map((n) => Number(n.replace(/,/g, "")));
  const isManUnit = /만/.test(label);
  if (isManUnit) {
    return allNums.map((n) => n * 10000);
  }
  return allNums.map((n) => {
    if (n >= 1000) return n;
    return n * 10000;
  });
}

// ===== distribution을 정규화: { label, percent, min_amount, max_amount } =====
// ★ 수정: any[] 입력, range/label + percentage/percent 양쪽 대응, 이미 min/max 있으면 건너뜀
function normalizeDistribution(
  raw: any[]
): { label: string; percent: number; min_amount: number; max_amount: number }[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw.map((d, idx) => {
    const labelStr: string = d.label || d.range || "";
    const pct: number = d.percent ?? d.percentage ?? 0;

    if (d.min_amount != null && d.max_amount != null) {
      return {
        label: labelStr,
        percent: pct,
        min_amount: d.min_amount,
        max_amount: d.max_amount,
      };
    }

    const nums = parseLabelToKRW(labelStr);
    let min_amount = 0;
    let max_amount = 0;

    if (
      labelStr.includes("이하") ||
      labelStr.includes("미만") ||
      labelStr.startsWith("≤") ||
      labelStr.startsWith("<")
    ) {
      min_amount = 0;
      max_amount = nums[0] || 30000;
    } else if (
      labelStr.includes("이상") ||
      labelStr.includes("초과") ||
      labelStr.startsWith("≥") ||
      labelStr.startsWith(">")
    ) {
      min_amount = nums[0] || 100000;
      max_amount = min_amount * 3;
    } else if (nums.length >= 2) {
      min_amount = nums[0];
      max_amount = nums[1];
    } else if (nums.length === 1) {
      const val = nums[0];
      min_amount = Math.max(0, val - val * 0.3);
      max_amount = val + val * 0.3;
    } else {
      min_amount = idx * 30000;
      max_amount = (idx + 1) * 30000;
    }

    return {
      label: labelStr,
      percent: pct,
      min_amount: Math.round(min_amount),
      max_amount: Math.round(max_amount),
    };
  });
}

// ===== 메인 핸들러 =====
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      category = "",
      relationship = "",
      closeness = "",
      sub_detail = {},
      my_age_group = "",
      my_job = "",
      my_income = "",
      region = "",
      tone = "캐주얼",
    } = body;

    if (!category || !relationship || !closeness) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "category, relationship, closeness는 필수입니다.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    const dbClosenessValues = CLOSENESS_MAP[closeness] || [closeness];
    const { parent } = resolveCategory(category);
    const categoriesToQuery = [category];
    if (parent !== category) categoriesToQuery.push(parent);

    // 1) amount_guide 3단계 폴백
    let finalFilteredData: any[] = [];

    for (const cat of categoriesToQuery) {
      if (finalFilteredData.length > 0) break;
      const { data } = await supabase
        .from("amount_guide")
        .select("recommended_min, recommended, recommended_max, ai_comment")
        .eq("category", cat)
        .eq("relationship", relationship)
        .in("closeness", dbClosenessValues);
      if (data && data.length > 0) finalFilteredData = data;
    }

    if (finalFilteredData.length === 0) {
      for (const cat of categoriesToQuery) {
        if (finalFilteredData.length > 0) break;
        const { data } = await supabase
          .from("amount_guide")
          .select("recommended_min, recommended, recommended_max, ai_comment")
          .eq("category", cat)
          .eq("relationship", relationship);
        if (data && data.length > 0) finalFilteredData = data;
      }
    }

    if (finalFilteredData.length === 0) {
      for (const cat of categoriesToQuery) {
        if (finalFilteredData.length > 0) break;
        const { data } = await supabase
          .from("amount_guide")
          .select("recommended_min, recommended, recommended_max, ai_comment")
          .eq("category", cat);
        if (data && data.length > 0) finalFilteredData = data;
      }
    }

    // 2) 카테고리 전체 (통계용)
    let categoryData: any[] = [];
    for (const cat of categoriesToQuery) {
      const { data } = await supabase
        .from("amount_guide")
        .select("recommended_min, recommended, recommended_max")
        .eq("category", cat);
      if (data && data.length > 0) {
        categoryData = [...categoryData, ...data];
      }
    }

    // 3) 메시지 템플릿
    let templates: any[] = [];
    for (const cat of categoriesToQuery) {
      const { data } = await supabase
        .from("message_templates")
        .select("*")
        .eq("category", cat);
      if (data && data.length > 0) {
        templates = [...templates, ...data];
        break;
      }
    }

    // 4) 통계 계산
    const stats = calculateStatistics(
      finalFilteredData,
      categoryData,
      category
    );

    // 5) Gemini 호출
    const geminiResult = await callGemini({
      category,
      relationship,
      closeness,
      sub_detail,
      my_age_group,
      my_job,
      my_income,
      tone,
      filteredData: finalFilteredData,
      stats,
    });

    // 6) Gemini가 분포를 생성했으면 stats에 반영
    if (geminiResult._distribution) {
      stats.distribution = geminiResult._distribution;
    }

    // 7) user_choices 기록
    supabase
      .from("user_choices")
      .insert({
        category,
        relationship,
        closeness,
        sub_detail,
        my_age_group,
        my_job,
        my_income,
        ai_recommended: geminiResult.recommended,
        final_amount: geminiResult.recommended,
      })
      .then(() => {});

    // 8) 템플릿 정리
    const filteredTemplates = (templates || []).map((t: any) => ({
      id: t.id,
      tone: t.tone,
      text: t.template,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        recommendation: {
          recommended_min: geminiResult.recommended_min,
          recommended: geminiResult.recommended,
          recommended_max: geminiResult.recommended_max,
          message: geminiResult.message,
          comment: geminiResult.comment,
          gift_suggestion: geminiResult.gift_suggestion,
        },
        statistics: stats,
        reasons: geminiResult.reasons,
        similar_cases: geminiResult.similar_cases,
        etiquette: geminiResult.etiquette,
        templates: filteredTemplates,
        products: [],
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "서버 오류가 발생했습니다.",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// ===== 통계 계산 =====
// ★ 수정: rawDistribution 타입을 any[]로, 폴백 기본값도 정규 형태로 변경
function calculateStatistics(
  filtered: any[],
  allCategory: any[],
  category: string
) {
  const values = filtered
    .map((r: any) => r.recommended)
    .filter((v: any) => typeof v === "number")
    .sort((a: number, b: number) => a - b);
  const allValues = allCategory
    .map((r: any) => r.recommended)
    .filter((v: any) => typeof v === "number")
    .sort((a: number, b: number) => a - b);

  const median = getMedian(values);
  const categoryMedian = getMedian(allValues);

  let rawDistribution: any[];
  if (allValues.length >= 5) {
    rawDistribution = calculateDistribution(allValues);
  } else {
    rawDistribution = lookupByCategory(DEFAULT_DISTRIBUTIONS, category, [
      { label: "3만원 이하", percent: 15, min_amount: 0, max_amount: 30000 },
      { label: "5만원", percent: 40, min_amount: 30000, max_amount: 60000 },
      { label: "10만원", percent: 30, min_amount: 60000, max_amount: 120000 },
      { label: "10만원 이상", percent: 15, min_amount: 100000, max_amount: 200000 },
    ]);
  }

  const distribution = normalizeDistribution(rawDistribution);

  return {
    average: median,
    category_average: categoryMedian,
    filtered_count: filtered.length,
    total_count: allCategory.length,
    distribution,
    source: "2024-2025 한국경조사문화 실태조사 및 자체 데이터 기반 AI 분석",
  };
}

// ★ 수정: 빈 배열이면 0 반환 (50000 아님)
function getMedian(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function calculateDistribution(values: number[]) {
  const total = values.length;
  if (total === 0) return [];
  const under30k = values.filter((v: number) => v <= 30000).length;
  const around50k = values.filter(
    (v: number) => v > 30000 && v <= 60000
  ).length;
  const around70k = values.filter(
    (v: number) => v > 60000 && v <= 80000
  ).length;
  const over100k = values.filter((v: number) => v > 80000).length;

  return [
    { range: "3만원 이하", percentage: Math.round((under30k / total) * 100) },
    { range: "5만원", percentage: Math.round((around50k / total) * 100) },
    { range: "7만원", percentage: Math.round((around70k / total) * 100) },
    {
      range: "10만원 이상",
      percentage: Math.round((over100k / total) * 100),
    },
  ];
}

// ===== Gemini 호출 =====
async function callGemini(params: {
  category: string;
  relationship: string;
  closeness: string;
  sub_detail: any;
  my_age_group: string;
  my_job: string;
  my_income: string;
  tone: string;
  filteredData: any[];
  stats: any;
}) {
  const {
    category,
    relationship,
    closeness,
    sub_detail,
    my_age_group,
    my_job,
    my_income,
    tone,
    filteredData,
    stats,
  } = params;

  const fallbackAmt =
    stats.average > 0 ? stats.average : getFallbackAmount(category);

  const subDetailStr = Object.entries(sub_detail || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const dataContext =
    filteredData.length > 0
      ? filteredData
          .map(
            (d: any) =>
              `최소 ${d.recommended_min}원, 추천 ${d.recommended}원, 최대 ${d.recommended_max}원 (${d.ai_comment || ""})`
          )
          .join("\n")
      : "해당 조합의 데이터가 없습니다. 아래 실제 통계를 기준으로 추천해주세요.";

  const realStats = lookupByCategory(REAL_STATISTICS, category, "");

  const needsDistribution = stats.total_count < 5;

  const dbSection =
    stats.filtered_count > 0
      ? `DB 중앙값: ${stats.average}원 (${stats.filtered_count}건 기반)
추천 금액은 이 중앙값의 ±30% 이내로 하세요.`
      : `DB 데이터 없음 (0건) - 아래 [실제 통계]만 참고하세요. DB 중앙값 제약 없음.`;

  const prompt = `당신은 한국 경조사비 전문 컨설턴트입니다. 반드시 한국어로만 답변하세요.

[사용자 정보]
- 카테고리: ${category}
- 상대방 관계: ${relationship}
- 친밀도: ${closeness}
- 나이대: ${my_age_group || "미입력"}
- 직업: ${my_job || "미입력"}
- 소득: ${my_income || "미입력"}
- 추가 정보: ${subDetailStr || "없음"}
- 원하는 톤: ${tone}

[DB 참고 데이터]
${dataContext}
${dbSection}
${realStats}

[지시사항]
1. DB 데이터와 실제 통계를 종합해서 적정 금액을 추천하세요.
2. 금액은 반드시 만원 단위(10000 단위)로 반올림.
3. 소득 높아도 실제 통계 기준 대비 +30%까지만. 소득 낮으면 -30%까지.
4. message는 ${tone} 톤, 한국어 2~3문장.
5. reasons: 구체적 이유 3개, 실제 통계 수치 1개 이상 인용.
6. similar_cases 규칙:
   - [실제 통계] 데이터 기반 3개 작성
   - 출처는 구체적 기관명+연도 필수 (예: "카카오페이 2024", "매일경제 2025.1")
   - 금지 출처: "일반 관례 종합", "종합", "일반적", "일반 관례", "관례 종합", "커뮤니티 종합"
   - 가상 인물(A씨, B씨) 금지
   - 형식: "카카오페이 2024 조사에 따르면 ~"
7. comment: 부가 설명 1~2문장.
8. gift_suggestion: 현금 외 대안 선물.
9. etiquette: 실용적 예절 팁 3개 (봉투 작성법, 금액 관례, 방문 예절 등).
${
  needsDistribution
    ? `10. distribution: 이 카테고리+관계+친밀도에 해당하는 금액 분포를 실제 통계 기반으로 생성하세요.
   - 4~5개 구간, percentage 합계 100.
   - range는 반드시 "X만원" 형태 한국어로 (예: "3만원 이하", "5~10만원", "10만원 이상")
   - 절대 "30,000원", "50,000원" 같은 원 단위 숫자를 쓰지 마세요.`
    : ""
}

반드시 아래 JSON 형식으로만 답변하세요:
{
  "recommended_min": 숫자,
  "recommended": 숫자,
  "recommended_max": 숫자,
  "message": "메시지",
  "comment": "부가 설명",
  "gift_suggestion": "선물 추천",
  "reasons": ["이유1", "이유2", "이유3"],
  "similar_cases": ["통계1", "통계2", "통계3"],
  "etiquette": ["팁1", "팁2", "팁3"]${
    needsDistribution
      ? `,
  "distribution": [{"range": "구간명", "percentage": 숫자}, ...]`
      : ""
  }
}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const text =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    const BANNED_SOURCES = [
      "일반 관례 종합",
      "종합",
      "일반적",
      "일반 관례",
      "관례 종합",
      "커뮤니티 종합",
      "네이버 블로그 에티켓 가이드",
    ];

    let validatedSimilarCases = parsed.similar_cases;
    if (Array.isArray(validatedSimilarCases)) {
      const hasBanned = validatedSimilarCases.some((c: string) =>
        BANNED_SOURCES.some((b) => c.includes(b))
      );
      if (hasBanned) {
        validatedSimilarCases = lookupByCategory(
          DEFAULT_SIMILAR_CASES,
          category,
          getGenericFallbackCases()
        );
      }
    } else {
      validatedSimilarCases = lookupByCategory(
        DEFAULT_SIMILAR_CASES,
        category,
        getGenericFallbackCases()
      );
    }

    // ★ 수정: distribution 검증 시 percentage와 percent 양쪽 대응
    let geminiDistribution = null;
    if (
      needsDistribution &&
      Array.isArray(parsed.distribution) &&
      parsed.distribution.length >= 3
    ) {
      const totalPct = parsed.distribution.reduce(
        (sum: number, d: any) => sum + (d.percentage ?? d.percent ?? 0),
        0
      );
      if (totalPct >= 90 && totalPct <= 110) {
        geminiDistribution = normalizeDistribution(parsed.distribution);
      }
    }

    return {
      recommended_min:
        roundToMan(parsed.recommended_min) ||
        roundToMan(fallbackAmt * 0.6),
      recommended: roundToMan(parsed.recommended) || fallbackAmt,
      recommended_max:
        roundToMan(parsed.recommended_max) ||
        roundToMan(fallbackAmt * 1.5),
      message:
        parsed.message ||
        lookupByCategory(
          DEFAULT_MESSAGES,
          category,
          "진심을 담아 전합니다."
        ),
      comment:
        parsed.comment ||
        "한국 경조사 관례와 실제 통계를 기반으로 AI가 추천한 금액입니다.",
      gift_suggestion: parsed.gift_suggestion || "상품권",
      reasons:
        parsed.reasons ||
        getDefaultReasons(category, relationship, closeness),
      similar_cases: validatedSimilarCases,
      etiquette:
        parsed.etiquette ||
        lookupByCategory(
          DEFAULT_ETIQUETTE,
          category,
          getGenericEtiquette()
        ),
      _distribution: geminiDistribution,
    };
  } catch (e) {
    return {
      recommended_min: roundToMan(fallbackAmt * 0.6),
      recommended: fallbackAmt,
      recommended_max: roundToMan(fallbackAmt * 1.5),
      message: lookupByCategory(
        DEFAULT_MESSAGES,
        category,
        "진심을 담아 전합니다."
      ),
      comment:
        "데이터 기반 추천입니다. AI 분석은 일시적으로 사용할 수 없습니다.",
      gift_suggestion: "상품권",
      reasons: getDefaultReasons(category, relationship, closeness),
      similar_cases: lookupByCategory(
        DEFAULT_SIMILAR_CASES,
        category,
        getGenericFallbackCases()
      ),
      etiquette: lookupByCategory(
        DEFAULT_ETIQUETTE,
        category,
        getGenericEtiquette()
      ),
      _distribution: null,
    };
  }
}

function roundToMan(val: number): number {
  return Math.round(val / 10000) * 10000;
}

function getDefaultReasons(
  category: string,
  relationship: string,
  closeness: string
): string[] {
  return [
    `${relationship} 관계에서 ${closeness} 수준의 일반적인 금액 범위를 기준으로 했습니다.`,
    `${category}의 한국 평균 경조사비 통계 데이터를 참고했습니다.`,
    "본인의 경제 상황과 상대방과의 관계를 종합적으로 고려한 금액입니다.",
  ];
}

function getGenericFallbackCases(): string[] {
  return [
    "카카오페이 2024 경조사비 조사: 직장인 경조사비로 5만원이 가장 보편적",
    "카카오페이 2024 조사: 친한 관계일수록 5~10만원 범위가 일반적",
    "카카오페이 2024 조사: 경제 상황에 맞춰 부담 없는 금액 선택 권장",
  ];
}

function getGenericEtiquette(): string[] {
  return [
    "경조사비는 본인의 경제 상황에 맞게 결정하세요.",
    "금액보다 마음을 전하는 것이 더 중요합니다.",
    "상대방과의 관계와 왕래 빈도를 고려하세요.",
  ];
}