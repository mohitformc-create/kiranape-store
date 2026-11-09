import React from 'react';
import { ShoppingBag, Milk, Cookie, Coffee, Sparkles } from 'lucide-react';

interface QuickNavStripProps {
  onSelectCategory: (categoryName: string) => void;
  activeCategory?: string;
}

interface QuickNavItem {
  id: string;
  label: string;
  categoryTarget: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const QUICK_NAV_ITEMS: QuickNavItem[] = [
  {
    id: 'grocery-kitchen',
    label: 'Grocery & Kitchen',
    categoryTarget: 'Atta & Flours',
    bgColor: 'bg-amber-50 hover:bg-amber-100/90',
    borderColor: 'border-amber-200/80',
    textColor: 'text-amber-900',
    icon: ShoppingBag,
  },
  {
    id: 'dairy-bakery',
    label: 'Dairy & Bakery',
    categoryTarget: 'Dairy & Bakery',
    bgColor: 'bg-blue-50 hover:bg-blue-100/90',
    borderColor: 'border-blue-200/80',
    textColor: 'text-blue-900',
    icon: Milk,
  },
  {
    id: 'snacks-biscuits',
    label: 'Snacks & Biscuits',
    categoryTarget: 'Snacks & Biscuits',
    bgColor: 'bg-orange-50 hover:bg-orange-100/90',
    borderColor: 'border-orange-200/80',
    textColor: 'text-orange-900',
    icon: Cookie,
  },
  {
    id: 'tea-coffee',
    label: 'Tea & Coffee',
    categoryTarget: 'Tea, Coffee & Drinks',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100/90',
    borderColor: 'border-emerald-200/80',
    textColor: 'text-emerald-900',
    icon: Coffee,
  },
  {
    id: 'home-utilities',
    label: 'Home Utilities',
    categoryTarget: 'Household Essentials',
    bgColor: 'bg-purple-50 hover:bg-purple-100/90',
    borderColor: 'border-purple-200/80',
    textColor: 'text-purple-900',
    icon: Sparkles,
  },
];

export const QuickNavStrip: React.FC<QuickNavStripProps> = ({
  onSelectCategory,
  activeCategory,
}) => {
  return (
    <div className="w-full my-1 sm:my-2">
      <div className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto pb-1 pt-0.5 scrollbar-none no-scrollbar touch-pan-x scroll-smooth px-0.5">
        {QUICK_NAV_ITEMS.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeCategory === item.categoryTarget;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectCategory(item.categoryTarget)}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer group active:scale-95 transition-all focus:outline-hidden"
              title={item.label}
            >
              {/* Light pastel rounded-2xl container with crisp outline icon */}
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${item.bgColor} border ${item.borderColor} flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:shadow-xs transition-all ${
                  isActive ? 'ring-2 ring-[#0c831f] shadow-sm' : ''
                }`}
              >
                <IconComponent className={`w-6 h-6 sm:w-7 sm:h-7 ${item.textColor} stroke-[1.8]`} />
              </div>

              {/* Compact bold label below */}
              <span className="text-[10px] sm:text-[11px] font-bold text-stone-800 group-hover:text-[#0c831f] mt-1.5 text-center leading-tight whitespace-nowrap transition-colors max-w-[80px] sm:max-w-[90px] truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
