import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getAvailableYears, getYearlyStats } from '../../utils/storage';
import { formatAmount, getCategoryEmoji } from '../../utils/format';
import type { YearlyStats } from '../../types';

// 파이 차트 색상
const PIE_COLORS = [
  '#3182F6', '#FF6B35', '#03B26C', '#7C3AED', '#F04452',
  '#FFC107', '#00BCD4', '#E91E63', '#8BC34A', '#FF9800',
];

export default function Report() {
  const navigate = useNavigate();
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [stats, setStats] = useState<YearlyStats | null>(null);

  useEffect(() => {
    const available = getAvailableYears();
    setYears(available);
    if (available.length > 0) {
      setSelectedYear(available[0]);
    }
  }, []);

  useEffect(() => {
    if (selectedYear) {
      setStats(getYearlyStats(selectedYear));
    }
  }, [selectedYear]);

  const handlePrevYear = () => {
    const idx = years.indexOf(selectedYear);
    if (idx < years.length - 1) setSelectedYear(years[idx + 1]);
  };

  const handleNextYear = () => {
    const idx = years.indexOf(selectedYear);
    if (idx > 0) setSelectedYear(years[idx - 1]);
  };

  // 차트 툴팁 포맷
  const formatTooltipValue = (value: number) => {
    if (value === 0) return '0원';
    return `${value.toLocaleString()}원`;
  };

  // 카테고리 총액 계산 (파이 차트용)
  const categoryTotal = stats?.categoryBreakdown.reduce(
    (sum, c) => sum + c.sent + c.received, 0
  ) || 0;

  if (years.length === 0) {
    return (
      <div className="min-h-screen bg-white pb-8">
        <div className="max-w-[480px] mx-auto px-5">
          <header className="flex items-center gap-3 py-5">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center text-xl cursor-pointer transition-all active:scale-[0.97]"
            >
              ←
            </button>
            <h1 className="text-xl font-bold text-[#191F28]">📊 연간 리포트</h1>
          </header>
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-6">📊</div>
            <p className="text-lg text-[#191F28] font-medium mb-2">아직 기록이 없어요</p>
            <p className="text-sm text-[#6B7684]">경조사비를 기록하면 리포트를 볼 수 있어요</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="max-w-[480px] mx-auto px-5">
        {/* 헤더 */}
        <header className="flex items-center gap-3 py-5">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-xl cursor-pointer transition-all active:scale-[0.97]"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-[#191F28]">📊 연간 리포트</h1>
        </header>

        {/* 연도 선택 */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={handlePrevYear}
            disabled={years.indexOf(selectedYear) >= years.length - 1}
            className={`w-10 h-10 flex items-center justify-center text-xl rounded-full cursor-pointer transition-all active:scale-[0.97] ${
              years.indexOf(selectedYear) >= years.length - 1 ? 'text-[#E5E8EB]' : 'text-[#191F28] bg-[#F2F3F5]'
            }`}
          >
            ◀
          </button>
          <span className="text-2xl font-bold text-[#191F28]">{selectedYear}년</span>
          <button
            onClick={handleNextYear}
            disabled={years.indexOf(selectedYear) <= 0}
            className={`w-10 h-10 flex items-center justify-center text-xl rounded-full cursor-pointer transition-all active:scale-[0.97] ${
              years.indexOf(selectedYear) <= 0 ? 'text-[#E5E8EB]' : 'text-[#191F28] bg-[#F2F3F5]'
            }`}
          >
            ▶
          </button>
        </div>

        {stats && (
          <>
            {/* 요약 카드 */}
            <div className="bg-gradient-to-br from-[#F9FAFB] to-[#F2F3F5] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
              <p className="text-sm font-medium text-[#6B7684] mb-4 text-center">
                {selectedYear}년 경조사 리포트
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-2xl p-4 text-center">
                  <p className="text-xs text-[#6B7684] mb-1">💸 총 보낸</p>
                  <p className="text-lg font-bold text-[#191F28]">{formatAmount(stats.totalSent)}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 text-center">
                  <p className="text-xs text-[#6B7684] mb-1">💰 총 받은</p>
                  <p className="text-lg font-bold text-[#191F28]">{formatAmount(stats.totalReceived)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 text-center">
                  <p className="text-xs text-[#6B7684] mb-1">📊 차액</p>
                  <p className={`text-lg font-bold ${stats.difference >= 0 ? 'text-[#03B26C]' : 'text-[#F04452]'}`}>
                    {stats.difference >= 0 ? '+' : ''}{formatAmount(stats.difference)}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-4 text-center">
                  <p className="text-xs text-[#6B7684] mb-1">📋 총 건수</p>
                  <p className="text-lg font-bold text-[#191F28]">{stats.totalCount}건</p>
                </div>
              </div>
            </div>

            {/* 월별 추이 차트 */}
            {stats.totalCount > 0 && (
              <div className="bg-[#F9FAFB] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
                <h3 className="text-base font-bold text-[#191F28] mb-4">📈 월별 추이</h3>
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.monthlyBreakdown}
                      margin={{ top: 5, right: 5, left: -15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: '#8B95A1' }}
                        tickFormatter={(v: string) => v.replace('월', '')}
                        axisLine={{ stroke: '#E5E8EB' }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#8B95A1' }}
                        tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : `${v}`}
                        axisLine={{ stroke: '#E5E8EB' }}
                      />
                      <Tooltip
                        formatter={formatTooltipValue}
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="sent" name="💸 보낸" fill="#3182F6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="received" name="💰 받은" fill="#03B26C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 카테고리별 분석 */}
            {stats.categoryBreakdown.length > 0 && (
              <div className="bg-[#F9FAFB] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
                <h3 className="text-base font-bold text-[#191F28] mb-4">📌 카테고리별 분석</h3>

                {/* 파이 차트 */}
                <div className="w-full h-[200px] mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryBreakdown}
                        dataKey={(entry: { sent: number; received: number }) => entry.sent + entry.received}
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={2}
                      >
                        {stats.categoryBreakdown.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={formatTooltipValue}
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* 카테고리 리스트 */}
                <div className="space-y-3">
                  {stats.categoryBreakdown.map((cat, index) => {
                    const total = cat.sent + cat.received;
                    const percent = categoryTotal > 0 ? ((total / categoryTotal) * 100).toFixed(1) : '0';
                    return (
                      <div key={cat.category} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-base">{getCategoryEmoji(cat.category)}</span>
                        <span className="text-sm text-[#191F28] flex-1">{cat.category}</span>
                        <span className="text-sm font-medium text-[#191F28]">
                          {formatAmount(total)}
                        </span>
                        <span className="text-xs text-[#6B7684] w-12 text-right">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 인사이트 카드 */}
            {stats.totalCount > 0 && (
              <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
                <h3 className="text-base font-bold text-[#191F28] mb-4">💡 올해 인사이트</h3>
                <div className="space-y-3">
                  {stats.topSpending && (
                    <div className="flex items-start gap-3">
                      <span className="text-lg">🏆</span>
                      <div>
                        <p className="text-xs text-[#6B7684]">최고 지출</p>
                        <p className="text-sm font-medium text-[#191F28]">
                          {getCategoryEmoji(stats.topSpending.category)} {stats.topSpending.targetName} · {formatAmount(stats.topSpending.amount)}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="text-lg">📈</span>
                    <div>
                      <p className="text-xs text-[#6B7684]">평균 금액</p>
                      <p className="text-sm font-medium text-[#191F28]">{formatAmount(stats.avgAmount)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">📅</span>
                    <div>
                      <p className="text-xs text-[#6B7684]">가장 바쁜 달</p>
                      <p className="text-sm font-medium text-[#191F28]">{stats.busiestMonth}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">🔄</span>
                    <div>
                      <p className="text-xs text-[#6B7684]">가장 많은 유형</p>
                      <p className="text-sm font-medium text-[#191F28]">
                        {getCategoryEmoji(stats.topCategory)} {stats.topCategory}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
