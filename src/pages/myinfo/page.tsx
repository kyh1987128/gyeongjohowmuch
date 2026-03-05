import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

interface MyInfo {
  my_age_group: string;
  my_job: string;
  my_income: string;
}

export default function MyInfo() {
  const navigate = useNavigate();
  const [ageGroup, setAgeGroup] = useState('');
  const [job, setJob] = useState('');
  const [income, setIncome] = useState('');
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('gyeongjo_myinfo');
    if (saved) {
      const data: MyInfo = JSON.parse(saved);
      setAgeGroup(data.my_age_group || '');
      setJob(data.my_job || '');
      setIncome(data.my_income || '');
      setIsEdit(true);
    }
  }, []);

  const ageGroups = ['20대', '30대', '40대', '50대', '60대이상'];
  const jobs = ['학생', '직장인', '자영업', '전문직', '주부', '무직기타'];
  const incomes = ['~3천만', '3~5천만', '5~7천만', '7천~1억', '1억+', '선택안함'];

  const isComplete = ageGroup && job;

  const handleSubmit = () => {
    if (!isComplete) return;

    const myInfo: MyInfo = {
      my_age_group: ageGroup,
      my_job: job,
      my_income: income || '선택안함',
    };

    localStorage.setItem('gyeongjo_myinfo', JSON.stringify(myInfo));
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="max-w-[480px] mx-auto px-5">
        {isEdit && (
          <header className="flex items-center gap-3 py-5">
            <button
              onClick={() => navigate('/home')}
              className="w-10 h-10 flex items-center justify-center text-2xl cursor-pointer transition-all active:scale-[0.97]"
            >
              ←
            </button>
            <h1 className="text-xl font-bold text-[#191F28]">내 정보 수정</h1>
          </header>
        )}

        {!isEdit && (
          <div className="pt-12 pb-8 text-center">
            <div className="text-6xl mb-4">💌</div>
            <h1 className="text-2xl font-bold text-[#191F28] mb-3">
              맞춤 추천을 위해
            </h1>
            <p className="text-base text-[#6B7684]">
              간단한 정보를 알려주세요
            </p>
          </div>
        )}

        <div className="space-y-8 mt-8">
          <div>
            <h3 className="text-base font-semibold text-[#191F28] mb-3">
              나이대 <span className="text-[#F04452]">*</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {ageGroups.map((age) => (
                <button
                  key={age}
                  onClick={() => setAgeGroup(age)}
                  className={`px-5 py-3 rounded-2xl font-medium transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap ${
                    ageGroup === age
                      ? 'bg-[#3182F6] text-white'
                      : 'bg-[#F9FAFB] text-[#191F28]'
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-[#191F28] mb-3">
              직업 <span className="text-[#F04452]">*</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {jobs.map((j) => (
                <button
                  key={j}
                  onClick={() => setJob(j)}
                  className={`px-5 py-3 rounded-2xl font-medium transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap ${
                    job === j
                      ? 'bg-[#3182F6] text-white'
                      : 'bg-[#F9FAFB] text-[#191F28]'
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-[#191F28] mb-3">
              소득수준 <span className="text-[#B0B8C1] text-sm">(선택)</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {incomes.map((inc) => (
                <button
                  key={inc}
                  onClick={() => setIncome(inc)}
                  className={`px-5 py-3 rounded-2xl font-medium transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap ${
                    income === inc
                      ? 'bg-[#3182F6] text-white'
                      : 'bg-[#F9FAFB] text-[#191F28]'
                  }`}
                >
                  {inc}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12">
          <Button onClick={handleSubmit} disabled={!isComplete} fullWidth>
            {isEdit ? '저장하기 💌' : '시작하기 💌'}
          </Button>
        </div>
      </div>
    </div>
  );
}
