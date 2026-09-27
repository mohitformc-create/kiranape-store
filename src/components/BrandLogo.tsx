import React from 'react';

interface BrandLogoProps {
  className?: string;
  variant?: 'full' | 'badge' | 'icon';
  showText?: boolean;
  subtitle?: string;
  alt?: string;
}

/**
 * Official Kiranape Brand Identity Component
 * 100% Vector SVG / Styled JSX — Zero external image dependencies.
 * Never fails, never breaks, never shows empty/missing squares.
 *
 * Structure:
 * - Green & Yellow brand badge with speedy motion trails.
 * - Shopping cart loaded with fresh groceries: red apple, milk bottle, baguette, yellow box.
 * - Fresh green leaf emblem on the cart side.
 * - Bold brand typography: "Kiranape" in dark emerald (#065F46) with golden yellow "EXPRESS" badge.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'h-9 w-auto object-contain',
  variant = 'full',
  showText = true,
  subtitle = 'Shuddh Samaan, Bharosemand Delivery',
  alt = 'Kiranape Express',
}) => {
  // 1. Standalone / App Icon Badge (Rounded Square Emerald Container)
  if (variant === 'badge' || variant === 'icon') {
    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label={alt}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="kpBadgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="45%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
          <linearGradient id="kpLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="kpYellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="kpAppleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="kpBreadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <filter id="kpBadgeShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.25" floodColor="#064E3B" />
          </filter>
        </defs>

        {/* Rounded Square App Badge Container */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="24"
          fill="url(#kpBadgeBg)"
          filter="url(#kpBadgeShadow)"
        />
        <rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="23"
          stroke="#6EE7B7"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Speed Lines / Motion Trails on the Left */}
        {/* Top line (Green) */}
        <rect x="14" y="27" width="22" height="4" rx="2" fill="#34D399" />
        {/* Upper middle line (Yellow) */}
        <rect x="9" y="34" width="27" height="4" rx="2" fill="#FBBF24" />
        {/* Middle line (Yellow) */}
        <rect x="14" y="41" width="24" height="4" rx="2" fill="#F59E0B" />
        {/* Lower middle line (Green) */}
        <rect x="9" y="48" width="31" height="4" rx="2" fill="#10B981" />
        {/* Bottom line (Yellow) */}
        <rect x="21" y="55" width="20" height="4" rx="2" fill="#FBBF24" />

        {/* Grocery Items in Cart */}
        {/* 1. Loaf of Baguette/Bread */}
        <g transform="translate(73, 17) rotate(22)">
          <rect x="-4" y="-3" width="9" height="24" rx="4.5" fill="url(#kpBreadGrad)" />
          <line x1="-2" y1="4" x2="2" y2="7" stroke="#B45309" strokeWidth="1" strokeLinecap="round" />
          <line x1="-2" y1="10" x2="2" y2="13" stroke="#B45309" strokeWidth="1" strokeLinecap="round" />
        </g>

        {/* 2. Yellow Grocery/Juice Carton */}
        <rect x="66" y="21" width="9" height="15" rx="1.5" fill="url(#kpYellowGrad)" />
        <rect x="68" y="19" width="5" height="3" rx="1" fill="#FEF08A" />

        {/* 3. Milk Bottle with Green Cap */}
        <path d="M57 18C57 16.5 58 15 60 15H63C65 15 66 16.5 66 18L67 33H56L57 18Z" fill="#FFFFFF" />
        <rect x="58.5" y="12.5" width="6" height="3.5" rx="1" fill="#10B981" />
        <rect x="59.5" y="23" width="4" height="6" rx="0.5" fill="#E2E8F0" />

        {/* 4. Fresh Red Apple */}
        <circle cx="49" cy="28" r="8" fill="url(#kpAppleGrad)" />
        {/* Apple shine */}
        <ellipse cx="46" cy="25" rx="2" ry="3.5" fill="#FECACA" opacity="0.6" transform="rotate(-20 46 25)" />
        {/* Apple Stalk & Leaves */}
        <path d="M49 20C49 18 50 16 52 15" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M51 16C54 14 56 16 55 18C52 18 51 16 51 16Z" fill="#34D399" />
        <path d="M44 19C42 16 45 13 47 16C47 18 44 19 44 19Z" fill="#10B981" />

        {/* Shopping Cart Body (White Heavy Rounded Outline) */}
        {/* Handle */}
        <path
          d="M27 24C30 24 33 26 35 29L38 35"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Cart Basket */}
        <path
          d="M36 34H84C85.5 34 86.5 35.5 86 37L79 55C78.5 56.5 77 57.5 75.5 57.5H43C41.5 57.5 40 56.5 39.5 55L34 32C33.5 30 31.5 28.5 29 28.5H27"
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Cart Front Cutouts */}
        <path d="M43 38H56C57.5 38 58 39.5 57 41L54 44H41C40 44 40 42.5 41 41L43 38Z" fill="#047857" opacity="0.15" />
        <path d="M44 46H52C53 46 53.5 47 53 48L51 51H43C42 51 42 50 42.5 49L44 46Z" fill="#047857" opacity="0.15" />

        {/* Fresh Leaf Accent on Cart Side */}
        <path
          d="M58 53C58 53 59 40 76 39C76 39 77 52 58 53Z"
          fill="url(#kpLeafGrad)"
        />
        <path
          d="M60 51C66 48 71 44 75 40"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Cart Chassis & Wheels */}
        <path d="M41 57.5L47 62H73L77 57.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />

        {/* Wheel 1 (Left) */}
        <circle cx="47" cy="63" r="5" fill="#FFFFFF" />
        <circle cx="47" cy="63" r="3" fill="#059669" />

        {/* Wheel 2 (Right) */}
        <circle cx="73" cy="63" r="5" fill="#FFFFFF" />
        <circle cx="73" cy="63" r="3" fill="#059669" />

        {/* Brand Text: Kiranapé (White Bold with Leaf on é) */}
        <g transform="translate(10, 72)">
          <text
            x="39"
            y="15"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="18"
            fontWeight="900"
            letterSpacing="-0.5"
            fill="#FFFFFF"
          >
            Kiranape
          </text>
          {/* Green Leaf Accent over 'e' */}
          <path
            d="M72 4C75 1 79 3 78 7C75 7 73 5 72 4Z"
            fill="#A7F3D0"
          />
        </g>
      </svg>
    );
  }

  // 2. Full Horizontal Logo (Cart Badge + Bold "Kiranape" in #065F46 + Golden Yellow "EXPRESS" Badge)
  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      role="img"
      aria-label={alt}
    >
      {/* Left Vector Icon Badge */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto aspect-square flex-shrink-0"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="hKpBadgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="50%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
          <linearGradient id="hKpLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="hKpYellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="hKpAppleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="hKpBreadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Rounded Square App Badge Container */}
        <rect x="2" y="2" width="96" height="96" rx="26" fill="url(#hKpBadgeBg)" />
        <rect x="3" y="3" width="94" height="94" rx="25" stroke="#6EE7B7" strokeWidth="1.5" strokeOpacity="0.5" />

        {/* Speed Trails */}
        <rect x="14" y="26" width="22" height="4.5" rx="2.25" fill="#34D399" />
        <rect x="9" y="34" width="27" height="4.5" rx="2.25" fill="#FBBF24" />
        <rect x="14" y="42" width="23" height="4.5" rx="2.25" fill="#F59E0B" />
        <rect x="9" y="50" width="31" height="4.5" rx="2.25" fill="#10B981" />
        <rect x="21" y="58" width="19" height="4.5" rx="2.25" fill="#FBBF24" />

        {/* Grocery Items */}
        {/* Baguette */}
        <g transform="translate(73, 17) rotate(22)">
          <rect x="-4" y="-3" width="9" height="24" rx="4.5" fill="url(#hKpBreadGrad)" />
          <line x1="-2" y1="4" x2="2" y2="7" stroke="#B45309" strokeWidth="1" strokeLinecap="round" />
          <line x1="-2" y1="10" x2="2" y2="13" stroke="#B45309" strokeWidth="1" strokeLinecap="round" />
        </g>
        {/* Juice box */}
        <rect x="66" y="21" width="9" height="15" rx="1.5" fill="url(#hKpYellowGrad)" />
        <rect x="68" y="19" width="5" height="3" rx="1" fill="#FEF08A" />
        {/* Milk Bottle */}
        <path d="M57 18C57 16.5 58 15 60 15H63C65 15 66 16.5 66 18L67 33H56L57 18Z" fill="#FFFFFF" />
        <rect x="58.5" y="12.5" width="6" height="3.5" rx="1" fill="#10B981" />
        <rect x="59.5" y="23" width="4" height="6" rx="0.5" fill="#E2E8F0" />
        {/* Apple */}
        <circle cx="49" cy="28" r="8" fill="url(#hKpAppleGrad)" />
        <ellipse cx="46" cy="25" rx="2" ry="3.5" fill="#FECACA" opacity="0.6" transform="rotate(-20 46 25)" />
        <path d="M49 20C49 18 50 16 52 15" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M51 16C54 14 56 16 55 18C52 18 51 16 51 16Z" fill="#34D399" />
        <path d="M44 19C42 16 45 13 47 16C47 18 44 19 44 19Z" fill="#10B981" />

        {/* Shopping Cart Body */}
        <path
          d="M27 24C30 24 33 26 35 29L38 35"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M36 34H84C85.5 34 86.5 35.5 86 37L79 55C78.5 56.5 77 57.5 75.5 57.5H43C41.5 57.5 40 56.5 39.5 55L34 32C33.5 30 31.5 28.5 29 28.5H27"
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Green Leaf Accent on Cart */}
        <path
          d="M58 53C58 53 59 40 76 39C76 39 77 52 58 53Z"
          fill="url(#hKpLeafGrad)"
        />
        <path
          d="M60 51C66 48 71 44 75 40"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Wheels */}
        <path d="M41 57.5L47 62H73L77 57.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="47" cy="63" r="5" fill="#FFFFFF" />
        <circle cx="47" cy="63" r="3" fill="#059669" />
        <circle cx="73" cy="63" r="5" fill="#FFFFFF" />
        <circle cx="73" cy="63" r="3" fill="#059669" />

        {/* Mini "Kiranape" bottom script on badge */}
        <text
          x="50"
          y="85"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="14"
          fontWeight="900"
          fill="#FFFFFF"
        >
          Kiranape
        </text>
      </svg>

      {/* Right Brand Typography */}
      {showText && (
        <div className="flex flex-col justify-center leading-none min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-black text-emerald-900 tracking-tight text-lg sm:text-xl leading-none">
              Kiranape
            </span>
            {/* Golden Yellow "EXPRESS" Badge */}
            <span className="bg-gradient-to-r from-amber-400 to-yellow-400 text-emerald-950 font-black text-[10px] tracking-wider px-1.5 py-0.5 rounded-md shadow-2xs uppercase border border-amber-500/30 flex-shrink-0">
              EXPRESS
            </span>
          </div>
          <span className="text-[9.5px] sm:text-[10px] font-extrabold text-emerald-800/90 truncate mt-0.5 max-w-[170px] xs:max-w-[220px] sm:max-w-none">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
