import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import BottomSheet from '../../components/BottomSheet';
import {
  getUpcomingSchedules,
  getPastSchedules,
  saveSchedule,
  updateSchedule,
  deleteSchedule,
  saveRecord,
} from '../../utils/storage';
import { getCategoryEmoji, formatDday, getDday, formatDateFull, formatAmount } from '../../utils/format';
import type { Schedule } from '../../types';

// 카테고리 목록 (Home과 동일)
const categories = [
  { id: '결혼식', name: '결혼식', emoji: '💒' },
  { id: '장례식', name: '장례식', emoji: '🖤' },
  { id: '출산', name: '출산', emoji: '👶' },
  { id: '생일', name: '생일', emoji: '🎂' },
  { id: '돌잔치', name: '돌잔치·백일', emoji: '🎈' },
  { id: '병문안', name: '병문안', emoji: '🏥' },
  { id: '개업', name: '개업', emoji: '🎉' },
  { id: '집들이', name: '집들이', emoji: '🏠' },
  { id: '용돈', name: '용돈', emoji: '💰' },
  { id: '회식', name: '회식', emoji: '🍻' },
  { id: '스승의날', name: '스승의날', emoji: '🎓' },
  { id: '감사선물', name: '감사선물', emoji: '🎁' },
  { id: '졸업입학', name: '졸업·입학축하', emoji: '🎓' },
  { id: '승진축하', name: '승진축하', emoji: '🎊' },
  { id: '취업축하', name: '취업축하', emoji: '🎯' },
  { id: '퇴직', name: '퇴직', emoji: '👋' },
];

export default function Schedules() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [upcoming, setUpcoming] = useState<Schedule[]>([]);
  const [past, setPast] = useState<Schedule[]>([]);
  const [toast, setToast] = useState('');

  // 추가/수정 시트
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // 폼 상태
  const [formCategory, setFormCategory] = useState('');
  const [formTargetName, setFormTargetName] = useState('');
  const [formRelationship, setFormRelationship] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formExpectedAmount, setFormExpectedAmount] = useState('');
  const [formMemo, setFormMemo] = useState('');

  // 상세 보기
  const [detailSchedule, setDetailSchedule] = useState<Schedule | null>(null);

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);

  // 기록 저장 시트
  const [completeTarget, setCompleteTarget] = useState<Schedule | null>(null);
  const [completeAmount, setCompleteAmount] = useState('');
  const [completeDirection, setCompleteDirection] = useState<'보낸' | '받은'>('보낸');

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = () => {
    setUpcoming(getUpcomingSchedules());
    setPast(getPastSchedules());
  };

  const resetForm = () => {
    setFormCategory('');
    setFormTargetName('');
    setFormRelationship('');
    setFormDate('');
    setFormTime('');
    setFormLocation('');
    setFormExpectedAmount('');
    setFormMemo('');
    setEditingSchedule(null);
  };

  const openAddSheet = () => {
    resetForm();
    setShowAddSheet(true);
  };

  const openEditSheet = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormCategory(schedule.category);
    setFormTargetName(schedule.targetName);
    setFormRelationship(schedule.relationship);
    setFormDate(schedule.eventDate);
    setFormTime(schedule.eventTime || '');
    setFormLocation(schedule.location || '');
    setFormExpectedAmount(schedule.expectedAmount?.toString() || '');
    setFormMemo(schedule.memo || '');
    setDetailSchedule(null);
    setShowAddSheet(true);
  };

  const handleSave = () => {
    if (!formCategory || !formTargetName.trim() || !formDate) return;

    const catInfo = categories.find(c => c.id === formCategory);
    const title = `${catInfo?.emoji || ''} ${formTargetName.trim()} ${catInfo?.name || formCategory}`;

    if (editingSchedule) {
      updateSchedule(editingSchedule.id, {
        title,
        category: formCategory,
        targetName: formTargetName.trim(),
        relationship: formRelationship.trim(),
        eventDate: formDate,
        eventTime: formTime || undefined,
        location: formLocation.trim() || undefined,
        expectedAmount: formExpectedAmount ? Number(formExpectedAmount) : undefined,
        memo: formMemo.trim() || undefined,
      });
      setToast('일정이 수정되었어요 ✏️');
    } else {
      saveSchedule({
        title,
        category: formCategory,
        targetName: formTargetName.trim(),
        relationship: formRelationship.trim(),
        eventDate: formDate,
        eventTime: formTime || undefined,
        location: formLocation.trim() || undefined,
        expectedAmount: formExpectedAmount ? Number(formExpectedAmount) : undefined,
        memo: formMemo.trim() || undefined,
        isCompleted: false,
      });
      setToast('일정이 추가되었어요 📅');
    }

    setShowAddSheet(false);
    resetForm();
    loadSchedules();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteSchedule(deleteTarget.id);
    setDeleteTarget(null);
    setDetailSchedule(null);
    loadSchedules();
    setToast('일정이 삭제되었어요 🗑️');
  };

  // 일정 완료 → 기록으로 저장
  const handleComplete = () => {
    if (!completeTarget || !completeAmount) return;

    // EventRecord로 저장
    saveRecord({
      eventDate: completeTarget.eventDate,
      category: completeTarget.category,
      targetName: completeTarget.targetName,
      relationship: completeTarget.relationship,
      direction: completeDirection,
      amount: Number(completeAmount),
      memo: completeTarget.memo,
    });

    // 일정 완료 처리
    updateSchedule(completeTarget.id, { isCompleted: true });

    setCompleteTarget(null);
    setCompleteAmount('');
    setDetailSchedule(null);
    loadSchedules();
    setToast('기록에 저장되었어요 ✅');
  };

  // 추천받기 연동
  const handleGetRecommendation = (schedule: Schedule) => {
    setDetailSchedule(null);
    navigate('/input', {
      state: {
        category: schedule.category,
        prefillRelationship: schedule.relationship,
      },
    });
  };

  const currentList = tab === 'upcoming' ? upcoming : past;

  // D-day 뱃지 색상
  const getDdayColor = (dateStr: string) => {
    const d = getDday(dateStr);
    if (d === 0) return 'bg-[#F04452] text-white';
    if (d <= 3) return 'bg-[#FF6B35] text-white';
    if (d <= 7) return 'bg-[#FFC107] text-[#191F28]';
    return 'bg-[#E5E8EB] text-[#6B7684]';
  };

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="max-w-[480px] mx-auto px-5">
        {/* 헤더 */}
        <header className="flex items-center gap-3 py-5">
          <button
            onClick={() => navigate('/home')}
            className="w-10 h-10 flex items-center justify-center text-xl cursor-pointer transition-all active:scale-[0.97]"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-[#191F28]">📅 경조사 일정</h1>
        </header>

        {/* D-day 하이라이트 카드 */}
        {upcoming.length > 0 && (
          <div
            onClick={() => setDetailSchedule(upcoming[0])}
            className="mb-6 bg-gradient-to-r from-[#3182F6] to-[#1B64DA] rounded-3xl p-6 shadow-[0_4px_16px_rgba(49,130,246,0.3)] cursor-pointer transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs font-medium mb-1">다가오는 일정</p>
                <p className="text-white text-lg font-bold">
                  {getCategoryEmoji(upcoming[0].category)} {upcoming[0].targetName}
                </p>
                <p className="text-white/80 text-sm mt-1">
                  {formatDateFull(upcoming[0].eventDate)}
                  {upcoming[0].location && ` · ${upcoming[0].location}`}
                </p>
              </div>
              <div className="bg-white/20 rounded-2xl px-4 py-2">
                <p className="text-white text-2xl font-bold">{formatDday(upcoming[0].eventDate)}</p>
              </div>
            </div>
          </div>
        )}

        {/* 탭 전환 */}
        <div className="flex gap-2 bg-[#F2F3F5] rounded-full p-1 mb-6">
          <button
            onClick={() => setTab('upcoming')}
            className={`flex-1 h-10 rounded-full text-sm font-medium cursor-pointer transition-all whitespace-nowrap ${
              tab === 'upcoming' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'
            }`}
          >
            📋 다가오는 일정 ({upcoming.length})
          </button>
          <button
            onClick={() => setTab('past')}
            className={`flex-1 h-10 rounded-full text-sm font-medium cursor-pointer transition-all whitespace-nowrap ${
              tab === 'past' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'
            }`}
          >
            ✅ 지난 일정 ({past.length})
          </button>
        </div>

        {/* 일정 목록 */}
        {currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-6">{tab === 'upcoming' ? '📅' : '✅'}</div>
            <p className="text-lg text-[#191F28] font-medium mb-2">
              {tab === 'upcoming' ? '예정된 일정이 없어요' : '지난 일정이 없어요'}
            </p>
            <p className="text-sm text-[#6B7684]">
              {tab === 'upcoming' ? '경조사 일정을 추가해보세요!' : '일정이 지나면 여기에 표시돼요'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {currentList.map((schedule) => (
              <div
                key={schedule.id}
                onClick={() => setDetailSchedule(schedule)}
                className="bg-[#F9FAFB] rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98] hover:bg-[#F2F3F5]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{getCategoryEmoji(schedule.category)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#191F28] truncate">
                        {schedule.targetName}
                      </p>
                      <p className="text-xs text-[#6B7684] mt-0.5">
                        {formatDateFull(schedule.eventDate)}
                        {schedule.relationship && ` · ${schedule.relationship}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {schedule.expectedAmount && (
                      <span className="text-xs text-[#6B7684]">
                        {formatAmount(schedule.expectedAmount)}
                      </span>
                    )}
                    {tab === 'upcoming' && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${getDdayColor(schedule.eventDate)}`}>
                        {formatDday(schedule.eventDate)}
                      </span>
                    )}
                    {tab === 'past' && schedule.isCompleted && (
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-[#E8F5E9] text-[#03B26C]">
                        완료
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 일정 추가 버튼 */}
        <Button onClick={openAddSheet} fullWidth>
          + 일정 추가
        </Button>
      </div>

      {/* 추가/수정 BottomSheet */}
      <BottomSheet isOpen={showAddSheet} onClose={() => { setShowAddSheet(false); resetForm(); }}>
        <div className="px-6 pt-6 pb-8 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#191F28]">
              {editingSchedule ? '✏️ 일정 수정' : '📅 일정 추가'}
            </h2>
            <button
              onClick={() => { setShowAddSheet(false); resetForm(); }}
              className="w-8 h-8 flex items-center justify-center text-xl text-[#B0B8C1] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5">
            {/* 카테고리 선택 */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">📌 카테고리</label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFormCategory(cat.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs cursor-pointer transition-all ${
                      formCategory === cat.id
                        ? 'bg-[#3182F6] text-white'
                        : 'bg-[#F2F3F5] text-[#6B7684]'
                    }`}
                  >
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="truncate w-full text-center">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 대상 이름 */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">👤 대상 이름</label>
              <input
                type="text"
                value={formTargetName}
                onChange={(e) => setFormTargetName(e.target.value)}
                placeholder="예: 김철수"
                className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] placeholder:text-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-colors"
              />
            </div>

            {/* 관계 */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">🤝 관계</label>
              <input
                type="text"
                value={formRelationship}
                onChange={(e) => setFormRelationship(e.target.value)}
                placeholder="예: 대학 동기, 직장 선배"
                className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] placeholder:text-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-colors"
              />
            </div>

            {/* 날짜 */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">📅 날짜</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] focus:outline-none focus:border-[#3182F6] transition-colors"
              />
            </div>

            {/* 시간 (선택) */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">🕐 시간 (선택)</label>
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] focus:outline-none focus:border-[#3182F6] transition-colors"
              />
            </div>

            {/* 장소 (선택) */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">📍 장소 (선택)</label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="예: 그랜드 웨딩홀"
                className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] placeholder:text-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-colors"
              />
            </div>

            {/* 예상 금액 (선택) */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">💰 예상 금액 (선택)</label>
              <div className="relative">
                <input
                  type="number"
                  value={formExpectedAmount}
                  onChange={(e) => setFormExpectedAmount(e.target.value)}
                  placeholder="금액을 입력하세요"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] placeholder:text-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8B95A1]">원</span>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {[30000, 50000, 100000, 200000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setFormExpectedAmount(amt.toString())}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                      formExpectedAmount === amt.toString() ? 'bg-[#3182F6] text-white' : 'bg-[#F2F3F5] text-[#6B7684]'
                    }`}
                  >
                    {amt.toLocaleString()}원
                  </button>
                ))}
              </div>
            </div>

            {/* 메모 (선택) */}
            <div>
              <label className="block text-sm font-medium text-[#6B7684] mb-2">📝 메모 (선택)</label>
              <input
                type="text"
                value={formMemo}
                onChange={(e) => setFormMemo(e.target.value)}
                placeholder="메모를 입력하세요"
                maxLength={100}
                className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] placeholder:text-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!formCategory || !formTargetName.trim() || !formDate}
            className={`w-full h-[52px] rounded-2xl font-medium text-base mt-6 cursor-pointer transition-all active:scale-[0.97] whitespace-nowrap ${
              formCategory && formTargetName.trim() && formDate
                ? 'bg-[#3182F6] text-white'
                : 'bg-[#E5E8EB] text-[#B0B8C1]'
            }`}
          >
            {editingSchedule ? '수정 완료' : '일정 추가'}
          </button>
        </div>
      </BottomSheet>

      {/* 상세 보기 BottomSheet */}
      <BottomSheet isOpen={!!detailSchedule} onClose={() => setDetailSchedule(null)}>
        {detailSchedule && (
          <div className="px-6 pt-6 pb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#191F28]">📋 일정 상세</h2>
              <button
                onClick={() => setDetailSchedule(null)}
                className="w-8 h-8 flex items-center justify-center text-xl text-[#B0B8C1] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#F9FAFB] rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{getCategoryEmoji(detailSchedule.category)}</span>
                <div>
                  <p className="text-base font-bold text-[#191F28]">{detailSchedule.targetName}</p>
                  {detailSchedule.relationship && (
                    <p className="text-sm text-[#6B7684]">{detailSchedule.relationship}</p>
                  )}
                </div>
                {!detailSchedule.isCompleted && getDday(detailSchedule.eventDate) >= 0 && (
                  <span className={`ml-auto text-sm font-bold px-3 py-1 rounded-lg ${getDdayColor(detailSchedule.eventDate)}`}>
                    {formatDday(detailSchedule.eventDate)}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#6B7684]">📅</span>
                  <span className="text-[#191F28]">{formatDateFull(detailSchedule.eventDate)}</span>
                  {detailSchedule.eventTime && (
                    <span className="text-[#6B7684]">{detailSchedule.eventTime}</span>
                  )}
                </div>
                {detailSchedule.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6B7684]">📍</span>
                    <span className="text-[#191F28]">{detailSchedule.location}</span>
                  </div>
                )}
                {detailSchedule.expectedAmount && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6B7684]">💰</span>
                    <span className="text-[#191F28]">{formatAmount(detailSchedule.expectedAmount)}</span>
                  </div>
                )}
                {detailSchedule.memo && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6B7684]">📝</span>
                    <span className="text-[#191F28]">{detailSchedule.memo}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {/* 추천받기 */}
              <Button onClick={() => handleGetRecommendation(detailSchedule)} fullWidth>
                🤖 금액 추천받기
              </Button>

              {/* 기록으로 저장 */}
              {!detailSchedule.isCompleted && (
                <Button
                  onClick={() => {
                    setCompleteTarget(detailSchedule);
                    setCompleteAmount(detailSchedule.expectedAmount?.toString() || '');
                    setDetailSchedule(null);
                  }}
                  variant="secondary"
                  fullWidth
                >
                  ✅ 완료 → 기록으로 저장
                </Button>
              )}

              {/* 수정 / 삭제 */}
              <div className="flex gap-3">
                <Button onClick={() => openEditSheet(detailSchedule)} variant="outline" fullWidth>
                  ✏️ 수정
                </Button>
                <button
                  onClick={() => {
                    setDeleteTarget(detailSchedule);
                  }}
                  className="flex-1 min-h-[48px] px-6 rounded-2xl font-medium whitespace-nowrap transition-all active:scale-[0.97] cursor-pointer border-2 border-[#F04452] text-[#F04452] bg-white"
                >
                  🗑️ 삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 완료 → 기록 저장 BottomSheet */}
      <BottomSheet isOpen={!!completeTarget} onClose={() => setCompleteTarget(null)}>
        {completeTarget && (
          <div className="px-6 pt-6 pb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#191F28]">✅ 기록으로 저장</h2>
              <button
                onClick={() => setCompleteTarget(null)}
                className="w-8 h-8 flex items-center justify-center text-xl text-[#B0B8C1] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#F9FAFB] rounded-2xl p-4 mb-5">
              <p className="text-sm text-[#191F28] font-medium">
                {getCategoryEmoji(completeTarget.category)} {completeTarget.targetName} · {formatDateFull(completeTarget.eventDate)}
              </p>
            </div>

            <div className="space-y-5">
              {/* 보낸/받은 토글 */}
              <div>
                <label className="block text-sm font-medium text-[#6B7684] mb-2">🔄 보낸 / 받은</label>
                <div className="flex gap-2 bg-[#F2F3F5] rounded-full p-1">
                  <button
                    onClick={() => setCompleteDirection('보낸')}
                    className={`flex-1 h-10 rounded-full text-sm font-medium cursor-pointer transition-all whitespace-nowrap ${
                      completeDirection === '보낸' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'
                    }`}
                  >
                    💸 보낸
                  </button>
                  <button
                    onClick={() => setCompleteDirection('받은')}
                    className={`flex-1 h-10 rounded-full text-sm font-medium cursor-pointer transition-all whitespace-nowrap ${
                      completeDirection === '받은' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'
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
                    value={completeAmount}
                    onChange={(e) => setCompleteAmount(e.target.value)}
                    placeholder="실제 금액을 입력하세요"
                    className="w-full h-12 px-4 pr-12 rounded-xl border border-[#E5E8EB] text-sm text-[#191F28] placeholder:text-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8B95A1]">원</span>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[30000, 50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCompleteAmount(amt.toString())}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                        completeAmount === amt.toString() ? 'bg-[#3182F6] text-white' : 'bg-[#F2F3F5] text-[#6B7684]'
                      }`}
                    >
                      {amt.toLocaleString()}원
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={!completeAmount || Number(completeAmount) <= 0}
              className={`w-full h-[52px] rounded-2xl font-medium text-base mt-6 cursor-pointer transition-all active:scale-[0.97] whitespace-nowrap ${
                completeAmount && Number(completeAmount) > 0
                  ? 'bg-[#3182F6] text-white'
                  : 'bg-[#E5E8EB] text-[#B0B8C1]'
              }`}
            >
              기록 저장
            </button>
          </div>
        )}
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
                <p className="text-base font-bold text-[#191F28] mb-1">일정을 삭제할까요?</p>
                <p className="text-sm text-[#6B7684]">
                  {getCategoryEmoji(deleteTarget.category)} {deleteTarget.targetName} · {formatDateFull(deleteTarget.eventDate)}
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
                  onClick={handleDelete}
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
