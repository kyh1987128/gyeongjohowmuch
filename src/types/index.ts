export interface EventRecord {
  id: string;
  eventDate: string;
  category: string;
  targetName: string;
  relationship: string;
  direction: '보낸' | '받은';
  amount: number;
  memo?: string;
  createdAt: string;
}

// ===== 분포 항목 타입 =====
export interface DistributionItem {
  label: string;
  percent: number;
  min_amount?: number;
  max_amount?: number;
  // 구버전 호환 (Edge Function의 calculateDistribution이 반환하는 형태)
  range?: string;
  percentage?: number;
}

// ===== 비슷한 사례 타입 =====
// Edge Function은 string[]을 반환하지만, mock 데이터는 객체 형태일 수 있음
export type SimilarCaseItem = string | { situation: string; amount: number };

// ===== 템플릿 항목 타입 =====
export interface TemplateItem {
  id?: number;
  tone?: string;
  text?: string;
  template?: string;
}

// ===== 추천 응답 전체 타입 =====
export interface RecommendationResponse {
  success: boolean;
  recommendation: {
    recommended_min: number;
    recommended: number;
    recommended_max: number;
    message: string;
    comment: string;
    gift_suggestion: string;
  };
  statistics: {
    average: number;
    category_average: number;
    filtered_count: number;
    total_count: number;
    distribution: DistributionItem[];
    source: string;
  };
  reasons: string[];
  similar_cases: SimilarCaseItem[];
  etiquette: string[];
  templates: TemplateItem[];
  products: any[];
}

export interface CategoryInfo {
  id: string;
  emoji: string;
  name: string;
  bgColor: string;
  hasSubcategory?: boolean;
}

export interface InputConditions {
  category: string;
  relationship: string;
  closeness: string;
  ageGroup: string;
}

export interface RecentQuery {
  category: string;
  relationship: string;
  closeness: string;
  sub_detail?: Record<string, any>;
  my_age_group: string;
  my_job: string;
  my_income: string;
  recommended: number;
  timestamp: string;
}
