import { useNavigate } from 'react-router-dom';

const subcategories = [
  { id: '용돈-세뱃돈', name: '세뱃돈(설날)', icon: '🧧' },
  { id: '용돈-부모님', name: '부모님용돈', icon: '👨‍👩‍👦' },
  { id: '용돈-시부모장인장모', name: '시부모·장인장모용돈', icon: '👴' },
  { id: '용돈-조카', name: '조카용돈', icon: '👦' },
];

export default function Subcategory() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="max-w-[480px] mx-auto px-5">
        <header className="flex items-center gap-3 py-5">
          <h1 className="text-xl font-bold text-[#191F28]">💰 어떤 용돈이에요?</h1>
        </header>

        <div className="grid grid-cols-2 gap-3 mt-8">
          {subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => navigate('/input', { state: { category: sub.id } })}
              className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all active:scale-[0.97] cursor-pointer min-h-[100px] flex flex-col items-center justify-center gap-2"
            >
              <span className="text-3xl">{sub.icon}</span>
              <span className="text-sm font-medium text-[#191F28] text-center">{sub.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
