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
