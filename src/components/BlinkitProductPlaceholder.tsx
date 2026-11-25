import React from 'react';
import {
  Wheat,
  Droplets,
  Cookie,
  Coffee,
  Milk,
  Flame,
  Sparkles,
  BookOpen,
  HeartPulse,
  ShoppingBasket,
  Leaf,
  Package,
} from 'lucide-react';

interface BlinkitProductPlaceholderProps {
  name: string;
  category?: string;
  weight?: string;
  compact?: boolean;
  className?: string;
}

interface CategoryVisualTheme {
  gradient: string;
  border: string;
  iconBg: string;
  iconText: string;
  badgeText: string;
  badgeBg: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function getCategoryTheme(category: string = '', name: string = ''): CategoryVisualTheme {
  const combined = `${category} ${name}`.toLowerCase();

  if (/veg|sabji|fruit|potato|onion|tomato|aloo|pyaz|fresh/i.test(combined)) {
    return {
      gradient: 'from-lime-50 via-white to-emerald-50/80',
      border: 'border-lime-200/80',
      iconBg: 'bg-lime-100',
      iconText: 'text-lime-700',
      badgeText: 'text-lime-800',
      badgeBg: 'bg-lime-100/80',
      Icon: Leaf,
    };
  }

  if (/atta|flour|rice|dal|besan|sooji|rava|maida|grain|pulse|chawal/i.test(combined)) {
    return {
      gradient: 'from-amber-50 via-white to-yellow-50/90',
      border: 'border-amber-200/80',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-700',
      badgeText: 'text-amber-900',
      badgeBg: 'bg-amber-100/80',
      Icon: Wheat,
    };
  }

  if (/oil|ghee|mustard|sarso|refined|sunflower|tel|fortune|dhara/i.test(combined)) {
    return {
      gradient: 'from-yellow-50 via-white to-amber-50/80',
      border: 'border-yellow-200/90',
      iconBg: 'bg-yellow-100',
      iconText: 'text-amber-700',
      badgeText: 'text-amber-900',
      badgeBg: 'bg-yellow-100/80',
      Icon: Droplets,
    };
  }

  if (/spice|masala|salt|haldi|mirch|dhaniya|jeera|namak/i.test(combined)) {
    return {
      gradient: 'from-orange-50 via-white to-rose-50/70',
      border: 'border-orange-200/80',
      iconBg: 'bg-orange-100',
      iconText: 'text-orange-700',
      badgeText: 'text-orange-900',
      badgeBg: 'bg-orange-100/80',
      Icon: Flame,
    };
  }

  if (/dairy|milk|curd|paneer|butter|bread|bakery|amul|toast|dahi/i.test(combined)) {
    return {
      gradient: 'from-sky-50 via-white to-blue-50/80',
      border: 'border-sky-200/80',
      iconBg: 'bg-sky-100',
      iconText: 'text-sky-700',
      badgeText: 'text-sky-900',
      badgeBg: 'bg-sky-100/80',
      Icon: Milk,
    };
  }

  if (/tea|coffee|drink|juice|beverage|pepsi|coke|frooti|maaza|chai/i.test(combined)) {
    return {
      gradient: 'from-teal-50 via-white to-cyan-50/80',
      border: 'border-teal-200/80',
      iconBg: 'bg-teal-100',
      iconText: 'text-teal-700',
      badgeText: 'text-teal-900',
      badgeBg: 'bg-teal-100/80',
      Icon: Coffee,
    };
  }

  if (/snack|biscuit|chips|namkeen|maggi|noodle|chocolate|cookie|packaged/i.test(combined)) {
    return {
      gradient: 'from-rose-50 via-white to-orange-50/70',
      border: 'border-rose-200/80',
      iconBg: 'bg-rose-100',
      iconText: 'text-rose-700',
      badgeText: 'text-rose-900',
      badgeBg: 'bg-rose-100/80',
      Icon: Cookie,
    };
  }

  if (/stationery|copy|copies|register|pen|pencil|craft|office|book/i.test(combined)) {
    return {
      gradient: 'from-indigo-50 via-white to-slate-50/90',
      border: 'border-indigo-200/80',
      iconBg: 'bg-indigo-100',
      iconText: 'text-indigo-700',
      badgeText: 'text-indigo-900',
      badgeBg: 'bg-indigo-100/80',
      Icon: BookOpen,
    };
  }

  if (/personal|care|soap|shampoo|cream|health|nutrition|dettol|colgate|stayfree/i.test(combined)) {
    return {
      gradient: 'from-emerald-50 via-white to-teal-50/80',
      border: 'border-emerald-200/80',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-700',
      badgeText: 'text-emerald-900',
      badgeBg: 'bg-emerald-100/80',
      Icon: HeartPulse,
    };
  }

  if (/household|surf|vim|detergent|clean|pooja|agarbatti|puja/i.test(combined)) {
    return {
      gradient: 'from-emerald-50 via-white to-stone-50',
      border: 'border-emerald-200/80',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-700',
      badgeText: 'text-emerald-900',
      badgeBg: 'bg-emerald-100/80',
      Icon: Sparkles,
    };
  }

  return {
    gradient: 'from-stone-50 via-white to-amber-50/60',
    border: 'border-stone-200/90',
    iconBg: 'bg-stone-100',
    iconText: 'text-stone-700',
    badgeText: 'text-stone-800',
    badgeBg: 'bg-stone-100',
    Icon: ShoppingBasket,
  };
}

export const BlinkitProductPlaceholder: React.FC<BlinkitProductPlaceholderProps> = ({
  name,
  category = 'General Kirana',
  weight = '',
  compact = false,
  className = '',
}) => {
  const theme = getCategoryTheme(category, name);
  const { Icon } = theme;
  const cleanCategory = (category || 'Kirana').split('&')[0].trim();

  if (compact) {
    return (
      <div
        className={`w-full h-full rounded-lg bg-gradient-to-br ${theme.gradient} border ${theme.border} flex flex-col items-center justify-center p-1 text-center select-none ${className}`}
      >
        <div
          className={`w-6 h-6 rounded-md ${theme.iconBg} ${theme.iconText} flex items-center justify-center`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="mt-0.5 text-[8px] font-extrabold text-stone-700 line-clamp-1 leading-none">
          {cleanCategory}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full rounded-xl bg-gradient-to-br ${theme.gradient} border ${theme.border} flex flex-col items-center justify-between px-2.5 pt-4 pb-2 text-center select-none overflow-hidden ${className}`}
    >
      {/* Top Category Badge & Icon */}
      <div className="flex items-center justify-center gap-1 max-w-full">
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${theme.badgeBg} ${theme.badgeText} text-[9px] font-bold tracking-tight truncate max-w-full`}
        >
          <Icon className={`w-2.5 h-2.5 shrink-0 ${theme.iconText}`} />
          <span className="truncate">{cleanCategory}</span>
        </span>
      </div>

      {/* Bold Product Brand / Title */}
      <div className="my-auto py-0.5 px-0.5 w-full flex items-center justify-center">
        <span className="font-heading font-extrabold text-[11px] sm:text-xs text-stone-900 leading-tight line-clamp-2 break-words">
          {name || 'Kirana Product'}
        </span>
      </div>

      {/* Crisp Weight Pill */}
      <div className="flex items-center justify-center">
        {weight ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 border border-stone-200/90 text-stone-800 text-[9px] sm:text-[10px] font-extrabold shadow-2xs leading-none">
            <Package className="w-2.5 h-2.5 text-stone-500 shrink-0" />
            <span className="truncate max-w-[90px]">{weight}</span>
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/90 border border-stone-200 text-stone-700 text-[9px] font-bold leading-none">
            Standard Pack
          </span>
        )}
      </div>
    </div>
  );
};
