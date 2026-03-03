import type { EventRecord, RecentQuery, Schedule, YearlyStats } from '../types';

const STORAGE_KEY = 'gyeongjo_records';
const RECENT_KEY = 'gyeongjo_recent';
const SCHEDULE_KEY = 'gyeongjo_schedules';
const MAX_RECENT = 5;

export const getRecords = (): EventRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveRecord = (record: Omit<EventRecord, 'id' | 'createdAt'>): void => {
  const records = getRecords();
  const newRecord: EventRecord = {
    ...record,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  records.push(newRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const updateRecord = (id: string, updates: Partial<EventRecord>): void => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === id);
  if (index !== -1) {
    records[index] = { ...records[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
};

export const deleteRecord = (id: string): void => {
  const records = getRecords();
  const filtered = records.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const getRecordsByYear = (): Record<string, EventRecord[]> => {
  const records = getRecords();
  const sorted = records.sort((a, b) => 
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );
  
  const grouped: Record<string, EventRecord[]> = {};
  sorted.forEach(record => {
    const year = new Date(record.eventDate).getFullYear().toString();
    if (!grouped[year]) {
      grouped[year] = [];
    }
    grouped[year].push(record);
  });
  
  return grouped;
};

export const calculateSummary = (records: EventRecord[]) => {
  const sent = records.filter(r => r.direction === '보낸').reduce((sum, r) => sum + r.amount, 0);
  const received = records.filter(r => r.direction === '받은').reduce((sum, r) => sum + r.amount, 0);
  const difference = received - sent;
  
  return { sent, received, difference };
};

export const getRecentQueries = (): RecentQuery[] => {
  try {
    const data = localStorage.getItem(RECENT_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveRecentQuery = (query: Omit<RecentQuery, 'timestamp'>): void => {
  const queries = getRecentQueries();
  const newQuery: RecentQuery = {
    ...query,
    timestamp: new Date().toISOString(),
  };
  
  // 중복 제거 (같은 카테고리 + 관계 + 친밀도)
  const filtered = queries.filter(
    q => !(q.category === newQuery.category && 
           q.relationship === newQuery.relationship && 
           q.closeness === newQuery.closeness)
  );
  
  // 최신 항목을 맨 앞에 추가
  filtered.unshift(newQuery);
  
  // 최대 5개까지만 유지 (FIFO)
  const limited = filtered.slice(0, MAX_RECENT);
  
  localStorage.setItem(RECENT_KEY, JSON.stringify(limited));
};

export const deleteRecentQuery = (timestamp: string): void => {
  const queries = getRecentQueries();
  const filtered = queries.filter(q => q.timestamp !== timestamp);
  localStorage.setItem(RECENT_KEY, JSON.stringify(filtered));
};

// ===== 일정 관리 (Schedule) =====

export const getSchedules = (): Schedule[] => {
  try {
    const data = localStorage.getItem(SCHEDULE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveSchedule = (schedule: Omit<Schedule, 'id' | 'createdAt'>): void => {
  const schedules = getSchedules();
  const newSchedule: Schedule = {
    ...schedule,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  schedules.push(newSchedule);
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedules));
};

export const updateSchedule = (id: string, updates: Partial<Schedule>): void => {
  const schedules = getSchedules();
  const index = schedules.findIndex(s => s.id === id);
  if (index !== -1) {
    schedules[index] = { ...schedules[index], ...updates };
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedules));
  }
};

export const deleteSchedule = (id: string): void => {
  const schedules = getSchedules();
  const filtered = schedules.filter(s => s.id !== id);
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(filtered));
};

export const getUpcomingSchedules = (): Schedule[] => {
  const today = new Date().toISOString().split('T')[0];
  return getSchedules()
    .filter(s => s.eventDate >= today && !s.isCompleted)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
};

export const getPastSchedules = (): Schedule[] => {
  const today = new Date().toISOString().split('T')[0];
  return getSchedules()
    .filter(s => s.eventDate < today || s.isCompleted)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
};

// ===== 연간 리포트 통계 =====

export const getAvailableYears = (): string[] => {
  const records = getRecords();
  const years = new Set(records.map(r => new Date(r.eventDate).getFullYear().toString()));
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
};

export const getYearlyStats = (year: string): YearlyStats => {
  const records = getRecords().filter(
    r => new Date(r.eventDate).getFullYear().toString() === year
  );

  const totalSent = records.filter(r => r.direction === '보낸').reduce((s, r) => s + r.amount, 0);
  const totalReceived = records.filter(r => r.direction === '받은').reduce((s, r) => s + r.amount, 0);

  // 월별 집계
  const monthlyMap: Record<string, { sent: number; received: number }> = {};
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, '0');
    monthlyMap[key] = { sent: 0, received: 0 };
  }
  records.forEach(r => {
    const m = String(new Date(r.eventDate).getMonth() + 1).padStart(2, '0');
    if (r.direction === '보낸') monthlyMap[m].sent += r.amount;
    else monthlyMap[m].received += r.amount;
  });
  const monthlyBreakdown = Object.entries(monthlyMap).map(([month, v]) => ({
    month: `${month}월`,
    sent: v.sent,
    received: v.received,
  }));

  // 카테고리별 집계
  const catMap: Record<string, { sent: number; received: number; count: number }> = {};
  records.forEach(r => {
    if (!catMap[r.category]) catMap[r.category] = { sent: 0, received: 0, count: 0 };
    catMap[r.category].count++;
    if (r.direction === '보낸') catMap[r.category].sent += r.amount;
    else catMap[r.category].received += r.amount;
  });
  const categoryBreakdown = Object.entries(catMap)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => (b.sent + b.received) - (a.sent + a.received));

  // 최고 지출
  const sentRecords = records.filter(r => r.direction === '보낸');
  const topSpending = sentRecords.length > 0
    ? sentRecords.reduce((max, r) => r.amount > max.amount ? r : max, sentRecords[0])
    : null;

  // 가장 바쁜 달
  const monthCounts: Record<string, number> = {};
  records.forEach(r => {
    const m = `${new Date(r.eventDate).getMonth() + 1}월`;
    monthCounts[m] = (monthCounts[m] || 0) + 1;
  });
  const busiestMonth = Object.entries(monthCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  // 가장 많은 카테고리
  const topCategory = categoryBreakdown[0]?.category || '-';

  return {
    totalSent,
    totalReceived,
    difference: totalReceived - totalSent,
    monthlyBreakdown,
    categoryBreakdown,
    topSpending,
    avgAmount: records.length > 0 ? Math.round((totalSent + totalReceived) / records.length) : 0,
    totalCount: records.length,
    busiestMonth,
    topCategory,
  };
};
