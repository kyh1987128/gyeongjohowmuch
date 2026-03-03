export const formatAmount = (amount: number): string => {
  return `${amount.toLocaleString()}원`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
};

export const getCategoryEmoji = (category: string): string => {
  const emojiMap: Record<string, string> = {
    결혼식: '💒',
    장례식: '🖤',
    출산: '👶',
    생일: '🎂',
    돌잔치: '🎈',
    '돌잔치·백일': '🎈',
    병문안: '🏥',
    개업: '🎉',
    집들이: '🏠',
    용돈: '💰',
    명절: '💰',
    세뱃돈: '💰',
    격려금: '💰',
    회식: '🍻',
    스승의날: '🎓',
    감사선물: '🎁',
    졸업입학: '🎓',
    승진축하: '🎊',
    취업축하: '🎯',
    퇴직: '👋',
  };
  return emojiMap[category] || '💌';
};

export const getCategoryName = (category: string): string => {
  if (category === '돌잔치') {
    return '돌잔치·백일';
  }
  if (category === '졸업입학') {
    return '졸업·입학축하';
  }
  return category;
};

// D-day 계산 (오늘 기준)
export const getDday = (dateString: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

// D-day 텍스트 포맷 ("D-3", "D-Day", "D+2")
export const formatDday = (dateString: string): string => {
  const diff = getDday(dateString);
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
};

// 날짜를 "3월 7일 (토)" 형식으로 포맷
export const formatDateFull = (dateString: string): string => {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${month}월 ${day}일 (${dayName})`;
};

// 연월 포맷 ("2026년 3월")
export const formatMonth = (year: string, month: number): string => {
  return `${year}년 ${month}월`;
};

export const formatCategoryName = (category: string): string => {
  // 용돈 하위 카테고리는 "용돈 · 명절" 형식으로 표시
  const subcategories = ['명절', '세뱃돈', '격려금'];
  if (subcategories.includes(category)) {
    return `용돈 · ${category}`;
  }
  if (category === '돌잔치') {
    return '돌잔치·백일';
  }
  if (category === '졸업입학') {
    return '졸업·입학축하';
  }
  return category;
};
