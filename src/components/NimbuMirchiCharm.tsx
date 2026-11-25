import React, { useState } from 'react';

interface NimbuMirchiCharmProps {
  className?: string;
}

/**
 * Subtle traditional Indian 'Nimbu-Mirchi' (Lemon & Green Chillies) Nazarbattu SVG charm.
 * Tastefully tucked into the storefront corner with a non-intrusive tooltip.
 */
export const NimbuMirchiCharm: React.FC<NimbuMirchiCharmProps> = ({ className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`relative inline-flex items-start select-none ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        onBlur={() => setShowTooltip(false)}
        title="शुभ लाभ • चौरसिया किराना स्टोर"
        aria-label="शुभ लाभ • चौरसिया किराना स्टोर"
        className="group relative flex items-center justify-center p-0.5 rounded-lg hover:bg-amber-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 transition-colors cursor-pointer"
      >
        <svg
          width="22"
          height="36"
          viewBox="0 0 28 46"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="origin-top transition-transform duration-300 ease-out group-hover:rotate-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
          aria-hidden="true"
        >
          {/* Hanging black cotton thread & top loop */}
          <path
            d="M14 1.5C12.3 1.5 11.2 2.6 11.2 4C11.2 5.4 14 6.8 14 6.8C14 6.8 16.8 5.4 16.8 4C16.8 2.6 15.7 1.5 14 1.5Z"
            stroke="#292524"
            strokeWidth="1.2"
          />
          <line x1="14" y1="6.5" x2="14" y2="41" stroke="#292524" strokeWidth="1.25" strokeLinecap="round" />

          {/* Tiny auspicious vermilion/charcoal bead */}
          <circle cx="14" cy="9.2" r="1.7" fill="#44403C" />

          {/* Bright yellow-green fresh Nimbu (Lemon) */}
          <ellipse cx="14" cy="15.5" rx="5.2" ry="5.8" fill="#FACC15" stroke="#CA8A04" strokeWidth="0.9" />
          <path
            d="M11.6 12.6C12.3 11.8 13.6 11.5 14.7 11.8"
            stroke="#FEF9C3"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Three fresh slender hanging Green Chillies (Hari Mirch) */}
          {/* Left chilli */}
          <path
            d="M13 23.2C10.1 24.4 7.7 27.6 8.3 31.8C8.6 33.4 9.6 34.4 10.5 34.1C11.4 33.8 11.1 31.4 11.8 29.2C12.3 27.5 13.2 26 13.8 24.5"
            fill="#16A34A"
            stroke="#15803D"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Right chilli */}
          <path
            d="M15 23.2C17.9 24.4 20.3 27.6 19.7 31.8C19.4 33.4 18.4 34.4 17.5 34.1C16.6 33.8 16.9 31.4 16.2 29.2C15.7 27.5 14.8 26 14.2 24.5"
            fill="#22C55E"
            stroke="#15803D"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Center lower chilli */}
          <path
            d="M14 25.5C12.4 28.5 12 34.8 13.4 40.8C13.8 42.3 14.8 42.6 15.3 41.3C16.3 38.6 16.2 31.2 14.6 25.5Z"
            fill="#15803D"
            stroke="#166534"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Tiny chilli stems */}
          <circle cx="14" cy="23.2" r="1.4" fill="#166534" />
        </svg>
      </button>

      {/* Non-intrusive tooltip anchored cleanly to the right edge */}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute right-0 top-full mt-1 z-50 whitespace-nowrap rounded-lg bg-stone-900 text-amber-100 text-[10px] font-bold px-2.5 py-1 shadow-lg border border-amber-400/30 pointer-events-none"
        >
          शुभ लाभ • चौरसिया किराना स्टोर
        </div>
      )}
    </div>
  );
};
