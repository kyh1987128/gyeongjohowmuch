import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CategoryCard from '../../components/CategoryCard';
import type { CategoryInfo, RecentQuery, Schedule } from '../../types';
import { getRecentQueries, deleteRecentQuery, getUpcomingSchedules } from '../../utils/storage';
import { formatCategoryName, formatDday, formatDateFull, getDday } from '../../utils/format';

const categories = [
  { id: '결혼식', name: '결혼식', emoji: '💒', bgColor: '#FFF5F5' },
  { id: '장례식', name: '장례식', emoji: '🖤', bgColor: '#F5F5F5' },
  { id: '출산', name: '출산', emoji: '👶', bgColor: '#FFF9E6' },
  { id: '생일', name: '생일', emoji: '🎂', bgColor: '#FFF0F5' },
  { id: '돌잔치', name: '돌잔치·백일', emoji: '🎈', bgColor: '#F0F9FF' },
  { id: '병문안', name: '병문안', emoji: '🏥', bgColor: '#F0FFF4' },
  { id: '개업', name: '개업', emoji: '🎉', bgColor: '#FFF7ED' },
  { id: '집들이', name: '집들이', emoji: '🏠', bgColor: '#FFFBEB' },
  { id: '용돈', name: '용돈', emoji: '💰', bgColor: '#FFFACD' },
  { id: '회식', name: '회식', emoji: '🍻', bgColor: '#FEF3C7' },
  { id: '스승의날', name: '스승의날', emoji: '🎓', bgColor: '#EFF6FF' },
  { id: '감사선물', name: '감사선물', emoji: '🎁', bgColor: '#FCE7F3' },
  { id: '졸업입학', name: '졸업·입학축하', emoji: '🎓', bgColor: '#E0E7FF' },
  { id: '승진축하', name: '승진축하', emoji: '🎊', bgColor: '#FEF2F2' },
  { id: '취업축하', name: '취업축하', emoji: '🎯', bgColor: '#ECFDF5' },
  { id: '퇴직', name: '퇴직', emoji: '👋', bgColor: '#F5F3FF' },
];

export default function Home() {
  const navigate = useNavigate();
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [nextSchedule, setNextSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    const myInfo = localStorage.getItem('gyeongjo_myinfo');
    if (!myInfo) {
      navigate('/myinfo', { replace: true });
    }

    // 최근 조회 불러오기
    const queries = getRecentQueries();
    setRecentQueries(queries.slice(0, 2)); // 최대 2개만 표시

    // 다가오는 일정 불러오기
    const upcoming = getUpcomingSchedules();
    if (upcoming.length > 0) {
      setNextSchedule(upcoming[0]);
    }
  }, [navigate]);

  const handleCategoryClick = (category: CategoryInfo) => {
    if (category.id === '용돈') {
      navigate('/subcategory');
    } else if (category.id === '돌잔치') {
      navigate('/input', { state: { category: '돌잔치·백일' } });
    } else if (category.id === '졸업입학') {
      navigate('/input', { state: { category: '졸업·입학축하' } });
    } else {
      navigate('/input', { state: { category: category.id } });
    }
  };

  const handleRecentClick = (query: RecentQuery) => {
    // 같은 조건으로 바로 결과 화면으로 이동
    navigate('/result', {
      state: {
        category: query.category,
        relationship: query.relationship,
        closeness: query.closeness,
        location: '',
        sub_detail: query.sub_detail,
        my_age_group: query.my_age_group,
        my_job: query.my_job,
        my_income: query.my_income,
      },
    });
  };

  const handleDeleteRecent = (timestamp: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteRecentQuery(timestamp);
    const queries = getRecentQueries();
    setRecentQueries(queries.slice(0, 2));
  };

  const getCategoryEmoji = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.emoji || '💌';
  };

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="max-w-[480px] mx-auto px-5">
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2">
            <img 
              src="https://static.readdy.ai/image/671763efa333e3bb5e83aecd0e5253c2/cc28e861a5f47b3b7b61147106f4629c.png" 
              alt="봉이" 
              className="w-8 h-8"
            />
            <h1 className="text-xl font-bold text-[#191F28]">경조사비 얼마?</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/schedules')}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#F2F3F5] text-sm text-[#4E5968] font-medium cursor-pointer transition-all active:scale-[0.97] hover:bg-[#E5E8EB]"
            >
              📅 <span>일정</span>
            </button>
            <button
              onClick={() => navigate('/records')}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#F2F3F5] text-sm text-[#4E5968] font-medium cursor-pointer transition-all active:scale-[0.97] hover:bg-[#E5E8EB]"
            >
              📋 <span>기록</span>
            </button>
            <button
              onClick={() => navigate('/myinfo')}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#F2F3F5] text-sm text-[#4E5968] font-medium cursor-pointer transition-all active:scale-[0.97] hover:bg-[#E5E8EB]"
            >
              ⚙️ <span>설정</span>
            </button>
          </div>
        </header>

        <div className="mt-8 mb-10">
          <div className="bg-[#F9FAFB] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-lg text-[#191F28] font-medium text-center">
              어떤 경조사에 가세요?
            </p>
          </div>
        </div>

        {recentQueries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-semibold text-[#191F28] mb-3 flex items-center gap-1">
              🕐 최근 조회
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recentQueries.map((query) => (
                <div
                  key={query.timestamp}
                  onClick={() => handleRecentClick(query)}
                  className="flex-shrink-0 bg-white border border-[#E5E8EB] rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98] hover:border-[#3182F6] min-w-[280px] relative"
                >
                  <button
                    onClick={(e) => handleDeleteRecent(query.timestamp, e)}
                    className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-[#B0B8C1] hover:text-[#191F28] cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getCategoryEmoji(query.category)}</span>
                    <span className="text-sm font-semibold text-[#191F28]">
                      {formatCategoryName(query.category)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-[#6B7684]">
                    <span>{query.relationship}</span>
                    <span>·</span>
                    <span className="font-semibold text-[#3182F6]">
                      {query.recommended.toLocaleString()}원
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* 다가오는 일정 배너 */}
        {nextSchedule && (
          <div
            onClick={() => navigate('/schedules')}
            className="mb-6 bg-gradient-to-r from-[#3182F6] to-[#1B64DA] rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98] shadow-[0_4px_12px_rgba(49,130,246,0.3)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs font-medium mb-1">📅 다가오는 일정 {formatDday(nextSchedule.eventDate)}</p>
                <p className="text-white text-base font-bold">
                  {getCategoryEmoji(nextSchedule.category)} {nextSchedule.targetName}
                </p>
                <p className="text-white/80 text-sm mt-0.5">{formatDateFull(nextSchedule.eventDate)}</p>
              </div>
              <span className="text-white text-2xl font-bold">{formatDday(nextSchedule.eventDate)}</span>
            </div>
          </div>
        )}

        {/* 퀴즈 배너 */}
        <div
          onClick={() => navigate('/quiz')}
          className="mb-8 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-2xl p-5 cursor-pointer transition-all active:scale-[0.98] shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-xs font-medium mb-1 opacity-80">🧠 경조사 센스 테스트</p>
              <p className="text-white text-lg font-bold">나의 경조사 레벨은?</p>
              <p className="text-white text-sm mt-1 opacity-70">5문제로 알아보는 경조사 센스</p>
            </div>
            <span className="text-3xl">📝</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              emoji={category.emoji}
              name={category.name}
              bgColor={category.bgColor}
              onClick={() => handleCategoryClick(category)}
            />
          ))}
        </div>

        <p className="text-center text-sm text-[#B0B8C1] mt-10">
          AI가 딱 맞는 금액을 알려드려요 ✨
        </p>
      </div>
    </div>
  );
}
