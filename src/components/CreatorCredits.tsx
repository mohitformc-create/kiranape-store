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
 * • Line 1: "Designed by Sam Solutions"
 * • Line 2: "Mohit Chaurasia"
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
        Designed by Sam Solutions
      </p>
      <p
        className={`text-xs sm:text-sm font-bold tracking-tight ${
          isDark ? 'text-stone-200' : 'text-stone-800'
        }`}
      >
        Mohit Chaurasia
      </p>
    </div>
  );
};

export default CreatorCredits;
