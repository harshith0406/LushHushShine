import React from 'react';

const LogoIcon = ({ size = 38, color = 'currentColor', style = {} }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      stroke={color} 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      style={style}
    >
      {/* Outer Gear Outline */}
      <path d="M44 8h12l2 8a36 36 0 0 1 8 3l7-5 8 8-5 7a36 36 0 0 1 3 8l8 2v12l-8 2a36 36 0 0 1-3 8l5 7-8 8-7-5a36 36 0 0 1-8 3l-2 8H44l-2-8a36 36 0 0 1-8-3l-7 5-8-8 5-7a36 36 0 0 1-3-8l-8-2V44l8-2a36 36 0 0 1 3-8l-5-7 8-8 7 5a36 36 0 0 1 8-3l2-8z" />
      
      {/* Circular Arrow Track */}
      <path d="M50 22a28 28 0 1 1-28 28" strokeDasharray="4 4" />
      <path d="M46 18l6 4-6 4" />
      <path d="M54 82l-6-4 6-4" />

      {/* Shopping Cart Basket */}
      <path d="M28 35h10l8 24h24l6-16H42" strokeWidth="4.5" />
      <circle cx="48" cy="66" r="3" fill={color} />
      <circle cx="68" cy="66" r="3" fill={color} />
      
      {/* Inner Box & Price Tag Items */}
      <rect x="44" y="27" width="10" height="8" rx="1" strokeWidth="3" />
      <path d="M60 26l6 6-4 4-6-6v-4h4z" strokeWidth="3" />
    </svg>
  );
};

export default LogoIcon;
