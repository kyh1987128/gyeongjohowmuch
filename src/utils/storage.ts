import type { EventRecord, RecentQuery } from '../types';

const STORAGE_KEY = 'gyeongjo_records';
const RECENT_KEY = 'gyeongjo_recent';
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
