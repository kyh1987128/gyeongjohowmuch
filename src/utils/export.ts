import type { EventRecord } from '../types';
import { formatAmount, getCategoryEmoji, getCategoryName } from './format';
import { calculateSummary } from './storage';

export const generateKakaoText = (records: EventRecord[]): string => {
  const recordsByYear: Record<string, EventRecord[]> = {};
  
  records.forEach(record => {
    const year = new Date(record.eventDate).getFullYear().toString();
    if (!recordsByYear[year]) {
      recordsByYear[year] = [];
    }
    recordsByYear[year].push(record);
  });
  
  let text = '📋 내 경조사 기록장\n';
  text += '━━━━━━━━━━━━━━━\n';
  
  Object.keys(recordsByYear).sort((a, b) => Number(b) - Number(a)).forEach(year => {
    text += `📅 ${year}년\n`;
    recordsByYear[year].forEach(record => {
      const date = new Date(record.eventDate);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const emoji = getCategoryEmoji(record.category);
      const categoryName = getCategoryName(record.category);
      const directionEmoji = record.direction === '보낸' ? '💸' : '💰';
      text += `  ${directionEmoji} ${month}/${day} ${emoji}${categoryName} | ${record.targetName} | ${formatAmount(record.amount)}\n`;
    });
  });
  
  text += '━━━━━━━━━━━━━━━\n';
  
  const summary = calculateSummary(records);
  const diffEmoji = summary.difference >= 0 ? '📈' : '📉';
  const diffSign = summary.difference >= 0 ? '+' : '';
  text += `💸 총 보낸: ${formatAmount(summary.sent)} / 💰 총 받은: ${formatAmount(summary.received)} / ${diffEmoji} 차액: ${diffSign}${formatAmount(summary.difference)}`;
  
  return text;
};

export const shareKakaoText = async (records: EventRecord[]): Promise<boolean> => {
  const text = generateKakaoText(records);
  
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const shareNative = async (records: EventRecord[]): Promise<boolean> => {
  const text = generateKakaoText(records);
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: '내 경조사 기록장',
        text: text,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

export const exportToExcel = async (records: EventRecord[]): Promise<boolean> => {
  try {
    const csvContent = [
      ['날짜', '카테고리', '대상', '관계', '보낸/받은', '금액', '메모'].join(','),
      ...records.map(r => [
        r.eventDate,
        getCategoryName(r.category),
        r.targetName,
        r.relationship,
        r.direction,
        r.amount,
        r.memo || ''
      ].join(','))
    ].join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `경조사기록_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return shareNative(records);
  }
};
