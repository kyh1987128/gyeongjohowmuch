import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import BottomSheet from '../../components/BottomSheet';
import { getRecordsByYear, calculateSummary, deleteRecord, updateRecord, getRecords } from '../../utils/storage';
import { formatAmount, formatDate, getCategoryEmoji, getCategoryName } from '../../utils/format';
import { shareNative, shareKakaoText, exportToExcel } from '../../utils/export';
import type { EventRecord } from '../../types';

interface RecordsProps {
  onBack?: () => void;
  onAddRecord?: () => void;
}

export default function Records({ onBack, onAddRecord }: RecordsProps) {
  const navigate = useNavigate();
  const [recordsByYear, setRecordsByYear] = useState<Record<string, EventRecord[]>>({});
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<EventRecord | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventRecord | null>(null);

  // Edit form state
  const [editDate, setEditDate] = useState('');
  const [editName, setEditName] = useState('');
  const [editDirection, setEditDirection] = useState<'보낸' | '받은'>('보낸');
  const [editAmount, setEditAmount] = useState('');
  const [editMemo, setEditMemo] = useState('');

  useEffect(() => {
    loadRecords();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (menuOpenId) {
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-menu-trigger]') && !target.closest('[data-menu-dropdown]')) {
          setMenuOpenId(null);
        }
      };
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [menuOpenId]);

  const loadRecords = () => {
    const records = getRecordsByYear();
    setRecordsByYear(records);
    setExpandedYears(new Set(Object.keys(records)));
  };

  const toggleYear = (year: string) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const openEditSheet = (record: EventRecord) => {
    setEditRecord(record);
    setEditDate(record.eventDate);
    setEditName(record.targetName);
    setEditDirection(record.direction);
    setEditAmount(record.amount.toString());
    setEditMemo(record.memo || '');
    setMenuOpenId(null);
    setShowEditSheet(true);
  };

  const handleEditSave = () => {
    if (!editRecord || !editName.trim() || !editAmount) return;
    updateRecord(editRecord.id, {
      eventDate: editDate,
      targetName: editName.trim(),
      direction: editDirection,
      amount: Number(editAmount),
      memo: editMemo.trim() || undefined,
    });
    setShowEditSheet(false);
    setEditRecord(null);
    loadRecords();
    setToast('수정되었어요 ✏️');
  };

  const openDeleteConfirm = (record: EventRecord) => {
    setMenuOpenId(null);
    setDeleteTarget(record);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteRecord(deleteTarget.id);
    setDeleteTarget(null);
    loadRecords();
    setToast('삭제되었어요 🗑️');
  };

  const handleShare = async () => {
    try {
      const records = getRecords();
      const text = records.map((r: any) => `${getCategoryName(r.categoryId)} | ${r.relationship} | ${formatAmount(r.amount)}원 | ${formatDate(r.date)}`).join('\n');
      if (typeof window !== 'undefined' && (window as any).TossApp && (window as any).TossApp.share) {
        await (window as any).TossApp.share({ text });
        setToast('공유되었어요!');
      } else if (navigator.share) {
        await navigator.share({ title: '내 경조사 기록', text });
        setToast('공유되었어요!');
      } else {
        await navigator.clipboard.writeText(text);
        setToast('클립보드에 복사되었어요!');
      }
    } catch (e) {
      setToast('공유에 실패했어요');
    }
  };

  const handleKakaoShare = async () => {
    const records = getRecords();
    const success = await shareKakaoText(records);
    if (success) {
      setToast('복사되었어요! 카톡에 붙여넣기 하세요');
    } else {
      setToast('복사에 실패했어요');
    }
  };

  const handleExcelExport = async () => {
    const records = getRecords();
    const success = await exportToExcel(records);
    if (success) {
      setToast('다운로드되었어요!');
    }
  };

  const allRecords = Object.values(recordsByYear || {}).flat();
  const summary = calculateSummary(allRecords);
  const isEmpty = allRecords.length === 0;

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="max-w-[480px] mx-auto px-5">

        <header className="flex items-center gap-3 py-5">
          <h1 className="text-xl font-bold text-[#191F28]">📋 내 경조사 기록장</h1>
        </header>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-6">💌</div>
            <p className="text-lg text-[#191F28] font-medium mb-2">아직 기록이 없어요</p>
            <p className="text-sm text-[#6B7684]">추천 받고 기록해보세요!</p>
          </div>
        ) : (
          <>
            <div className="bg-[#F9FAFB] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-[#6B7684] mb-1">💸 총 보낸</p>
                  <p className="text-base font-bold text-[#191F28]">{formatAmount(summary.sent)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7684] mb-1">💰 총 받은</p>
                  <p className="text-base font-bold text-[#191F28]">{formatAmount(summary.received)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7684] mb-1">📊 차액</p>
                  <p className={`text-base font-bold ${summary.difference >= 0 ? 'text-[#03B26C]' : 'text-[#F04452]'}`}>
                    {summary.difference >= 0 ? '+' : ''}{formatAmount(summary.difference)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {Object.keys(recordsByYear)
                .sort((a, b) => Number(b) - Number(a))
                .map((year) => (
                  <div key={year} className="bg-[#F9FAFB] rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
                    <button
                      onClick={() => toggleYear(year)}
                      className="w-full px-6 py-4 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <span className="text-lg font-bold text-[#191F28]">📅 {year}년</span>
                      <span className="text-xl">{expandedYears.has(year) ? '▼' : '▶'}</span>
                    </button>

                    {expandedYears.has(year) && (
                      <div className="px-4 pb-4 space-y-2">
                        {recordsByYear[year].map((record) => (
                          <div key={record.id} className="bg-white rounded-2xl p-4 relative">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <span className="text-sm text-[#6B7684] whitespace-nowrap">
                                  {formatDate(record.eventDate)}
                                </span>
                                <span className="text-base whitespace-nowrap">
                                  {getCategoryEmoji(record.category)}
                                </span>
                                <span className="text-sm text-[#191F28] truncate">{record.targetName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[#191F28] whitespace-nowrap">
                                  {record.direction === '보낸' ? '💸' : '💰'} {formatAmount(record.amount)}
                                </span>
                                <div className="relative">
                                  <button
                                    data-menu-trigger
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuOpenId(menuOpenId === record.id ? null : record.id);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-lg cursor-pointer transition-all active:scale-[0.97] whitespace-nowrap text-[#B0B8C1]"
                                  >
                                    ⋯
                                  </button>
                                  {menuOpenId === record.id && (
                                    <div
                                      data-menu-dropdown
                                      className="absolute right-0 top-10 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] overflow-hidden z-10 whitespace-nowrap border border-[#F2F3F5] animate-[fadeIn_0.15s_ease-out]"
                                    >
                                      <button
                                        onClick={() => openEditSheet(record)}
                                        className="flex items-center gap-2 w-full px-5 py-3 text-sm text-[#191F28] text-left cursor-pointer transition-all hover:bg-[#F9FAFB]"
                                      >
                                        <span className="w-5 h-5 flex items-center justify-center">✏️</span>
                                        수정
                                      </button>
                                      <div className="h-px bg-[#F2F3F5]" />
                                      <button
                                        onClick={() => openDeleteConfirm(record)}
                                        className="flex items-center gap-2 w-full px-5 py-3 text-sm text-[#F04452] text-left cursor-pointer transition-all hover:bg-[#FFF5F5]"
                                      >
                                        <span className="w-5 h-5 flex items-center justify-center">🗑️</span>
                                        삭제
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {record.memo && (
                              <p className="text-xs text-[#8B95A1] mt-2 pl-[72px]">📝 {record.memo}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* 연간 리포트 버튼 (5건 이상일 때) */}
            {allRecords.length >= 5 && (
              <div
                onClick={() => navigate('/report')}
                className="mb-6 bg-gradient-to-r from-[#03B26C] to-[#00897B] rounded-2xl p-5 cursor-pointer transition-all active:scale-[0.98] shadow-[0_4px_12px_rgba(3,178,108,0.3)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-xs font-medium mb-1">📊 내 경조사 데이터 분석</p>
                    <p className="text-white text-lg font-bold">연간 리포트 보기</p>
                    <p className="text-white/70 text-sm mt-1">총 {allRecords.length}건의 기록 분석</p>
                  </div>
                  <span className="text-3xl">📊</span>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <Button onClick={handleShare} fullWidth>
                📤 공유하기
              </Button>
              <Button onClick={handleKakaoShare} variant="secondary" fullWidth>
                💬 카톡복사
              </Button>
            </div>
          </>
        )}

        <Button onClick={() => onAddRecord ? onAddRecord() : navigate('/home')} variant="outline" fullWidth>
          + 새 기록 추가
        </Button>
      </div>

      {/* 수정 Bottom Sheet */}
      <BottomSheet isOpen={showEditSheet} onClose={() => setShowEditSheet(false)}>
        <div className="px-6 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#191F28]">✏️ 기록 수정</h2>
            <button
              onClick={() => setShowEditSheet(false)}
              className="w-8 h-8 flex items-center justify-center text-xl text-[#B0B8C1] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5">
            {/* 날짜 */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">📅 날짜</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] focus:outline-none focus:border-[#3182F6] transition-colors"
              />
            </div>

            {/* 대상 이름 */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">👤 대상 이름</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] placeholder:text-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-colors"
              />
            </div>

            {/* 보낸/받은 토글 */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">🔄 보낸 / 받은</label>
              <div className="flex gap-2 bg-[#F2F3F5] rounded-full p-1">
                <button
                  onClick={() => setEditDirection('보낸')}
                  className={`flex-1 h-10 rounded-full text-sm font-medium cursor-pointer transition-all whitespace-nowrap ${
                    editDirection === '보낸' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'
                  }`}
                >
                  💸 보낸
                </button>
                <button
                  onClick={() => setEditDirection('받은')}
                  className={`flex-1 h-10 rounded-full text-sm font-medium cursor-pointer transition-all whitespace-nowrap ${
                    editDirection === '받은' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'
                  }`}
                >
                  💰 받은
                </button>
              </div>
            </div>

            {/* 금액 */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">💰 금액</label>
              <div className="relative">
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="금액을 입력하세요"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] placeholder:text-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8B95A1]">원</span>
              </div>
              {/* 빠른 금액 버튼 */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {[10000, 30000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setEditAmount(amt.toString())}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                      editAmount === amt.toString() ? 'bg-[#3182F6] text-white' : 'bg-[#F2F3F5] text-[#6B7684]'
                    }`}
                  >
                    {amt.toLocaleString()}원
                  </button>
                ))}
              </div>
            </div>

            {/* 메모 */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">📝 메모 (선택)</label>
              <input
                type="text"
                value={editMemo}
                onChange={(e) => setEditMemo(e.target.value)}
                placeholder="메모를 입력하세요"
                maxLength={100}
                className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] placeholder:text-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleEditSave}
            disabled={!editName.trim() || !editAmount || Number(editAmount) <= 0}
            className={`w-full h-[52px] rounded-2xl font-medium text-base mt-6 cursor-pointer transition-all active:scale-[0.97] whitespace-nowrap ${
              editName.trim() && editAmount && Number(editAmount) > 0
                ? 'bg-[#3182F6] text-white'
                : 'bg-[#E5E8EB] text-[#B0B8C1]'
            }`}
          >
            수정 완료
          </button>
        </div>
      </BottomSheet>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
            <div className="bg-white rounded-3xl p-6 w-full max-w-[320px] shadow-xl animate-[fadeIn_0.2s_ease-out]">
              <div className="text-center mb-5">
                <div className="text-4xl mb-3">🗑️</div>
                <p className="text-base font-bold text-[#191F28] mb-1">기록을 삭제할까요?</p>
                <p className="text-sm text-[#6B7684]">
                  {getCategoryEmoji(deleteTarget.category)} {deleteTarget.targetName} ·{' '}
                  {formatAmount(deleteTarget.amount)}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 h-12 rounded-2xl bg-[#F2F3F5] text-sm font-medium text-[#6B7684] cursor-pointer transition-all active:scale-[0.97] whitespace-nowrap"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 h-12 rounded-2xl bg-[#F04452] text-sm font-medium text-white cursor-pointer transition-all active:scale-[0.97] whitespace-nowrap"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
