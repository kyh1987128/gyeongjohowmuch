interface CategoryCardProps {
  emoji: string;
  name: string;
  bgColor: string;
  onClick: () => void;
}

export default function CategoryCard({ emoji, name, bgColor, onClick }: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 transition-all active:scale-[0.97] cursor-pointer"
    >
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-sm"
        style={{ backgroundColor: bgColor }}
      >
        {emoji}
      </div>
      <span className="text-sm text-[#191F28] font-medium text-center whitespace-nowrap">{name}</span>
    </button>
  );
}
