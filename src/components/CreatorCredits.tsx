import React from 'react';

interface CreatorCreditsProps {
  className?: string;
  isDark?: boolean;
  withBottomPadding?: boolean;
}

/**
 * Official Brand Footer Credits
 * Clean and professional: "Designed by Sam Solutions"
 */
export const CreatorCredits: React.FC<CreatorCreditsProps> = ({
  className = '',
  isDark = false,
  withBottomPadding = false,
}) => {
  return (
    <div
      className={`text-center flex flex-col items-center justify-center select-none ${
        withBottomPadding ? 'pb-20 sm:pb-8' : ''
      } ${className}`}
      aria-label="Creator and Branding Credits"
    >
      <p
        className={`text-xs font-semibold tracking-wide ${
          isDark ? 'text-stone-400' : 'text-stone-500'
        }`}
      >
        Designed by Sam Solutions
      </p>
    </div>
  );
};

export default CreatorCredits;
