import React from 'react';

interface CreatorCreditsProps {
  className?: string;
  isDark?: boolean;
  withBottomPadding?: boolean;
}

/**
 * Official Brand Footer & Creator Credits
 * Required on: Customer Storefront, Admin Panel, and Splash/Login screens.
 *
 * • Line 1: "Designed by Sam Private Limited"
 * • Line 2: "Mohit Chaurasia"
 * • Line 3: "Associated with Chaurasia Kirana and General Store"
 */
export const CreatorCredits: React.FC<CreatorCreditsProps> = ({
  className = '',
  isDark = false,
  withBottomPadding = false,
}) => {
  return (
    <div
      className={`text-center flex flex-col items-center justify-center space-y-1 select-none ${
        withBottomPadding ? 'pb-20 sm:pb-8' : ''
      } ${className}`}
      aria-label="Creator and Branding Credits"
    >
      <p
        className={`text-xs font-medium tracking-wide ${
          isDark ? 'text-stone-400' : 'text-stone-500'
        }`}
      >
        Designed by Sam Private Limited
      </p>
      <p
        className={`text-xs sm:text-sm font-bold tracking-tight ${
          isDark ? 'text-stone-200' : 'text-stone-800'
        }`}
      >
        Mohit Chaurasia
      </p>
      <p
        className={`text-[11px] sm:text-xs font-normal ${
          isDark ? 'text-stone-400' : 'text-stone-500'
        }`}
      >
        Associated with Chaurasia Kirana and General Store
      </p>
    </div>
  );
};

export default CreatorCredits;
