import React from 'react';

interface Spline3DViewerProps {
  sceneUrl?: string;
}

export const Spline3DViewer: React.FC<Spline3DViewerProps> = () => {
  return (
    <div className="relative w-full h-full min-h-[350px] sm:min-h-[450px] bg-[#0b0e17] flex flex-col items-center justify-center overflow-hidden rounded-3xl select-none">
      {/* Ambient Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,_rgba(0,255,102,0.08),_transparent_70%)] pointer-events-none" />

      {/* Main Graphic Area: Tom & Jerry Image + Text */}
      <div className="relative z-10 flex flex-col items-center justify-center -mt-4 sm:-mt-8">
        {/* Tom & Jerry Image from /tom-jerry.png */}
        <img
          src="/tom-jerry.png"
          alt="Tom & Jerry"
          className="w-44 sm:w-56 md:w-64 h-auto object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.6)] transition-transform duration-300 hover:scale-105 pointer-events-none"
        />

        {/* Clear Readable Text: Tom & Jerry */}
        <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-wide font-sans drop-shadow-[0_0_12px_rgba(0,255,102,0.35)]">
          Tom & Jerry
        </h2>
      </div>

      {/* Dark Circular Platform with Neon Green Light Rings */}
      <div className="relative w-[300px] sm:w-[380px] h-[130px] mt-1 z-0 flex items-center justify-center pointer-events-none">
        <svg
          viewBox="0 0 400 160"
          className="w-full h-full overflow-visible drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
        >
          <defs>
            {/* Neon Green Glow Filter */}
            <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Metallic Dark Platform Gradients */}
            <linearGradient id="platform-top" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e2532" />
              <stop offset="100%" stopColor="#111622" />
            </linearGradient>

            <linearGradient id="platform-side" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#151b26" />
              <stop offset="100%" stopColor="#0a0d14" />
            </linearGradient>

            <linearGradient id="ring-tube" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1a202c" />
              <stop offset="50%" stopColor="#2d3748" />
              <stop offset="100%" stopColor="#1a202c" />
            </linearGradient>
          </defs>

          {/* Platform 3D Cylindrical Base */}
          <path
            d="M 60 90 A 140 45 0 0 0 340 90 L 340 125 A 140 45 0 0 1 60 125 Z"
            fill="url(#platform-side)"
          />

          {/* Base Platform Outer Surface */}
          <ellipse cx="200" cy="90" rx="140" ry="45" fill="url(#platform-top)" stroke="#2a3241" strokeWidth="2" />

          {/* Raised Inner Tier Step */}
          <path
            d="M 90 82 A 110 35 0 0 0 310 82 L 310 95 A 110 35 0 0 1 90 95 Z"
            fill="#0d111a"
          />
          <ellipse cx="200" cy="82" rx="110" ry="35" fill="#141a26" stroke="#252d3c" strokeWidth="1.5" />

          {/* Outer Neon Green Light Ring */}
          <ellipse
            cx="200"
            cy="90"
            rx="130"
            ry="40"
            fill="none"
            stroke="#00ff66"
            strokeWidth="3.5"
            filter="url(#neon-glow)"
            className="opacity-95"
          />

          {/* Outer Ring Metallic Segment Caps */}
          <rect x="95" y="102" width="22" height="8" rx="4" fill="url(#ring-tube)" stroke="#334155" strokeWidth="1" />
          <rect x="283" y="102" width="22" height="8" rx="4" fill="url(#ring-tube)" stroke="#334155" strokeWidth="1" />
          <rect x="189" y="126" width="22" height="8" rx="4" fill="url(#ring-tube)" stroke="#334155" strokeWidth="1" />

          {/* Inner Neon Green Light Ring */}
          <ellipse
            cx="200"
            cy="82"
            rx="100"
            ry="30"
            fill="none"
            stroke="#00ff66"
            strokeWidth="3"
            filter="url(#neon-glow)"
            className="opacity-90"
          />

          {/* Inner Ring Metallic Segment Caps */}
          <rect x="120" y="94" width="18" height="7" rx="3.5" fill="url(#ring-tube)" stroke="#334155" strokeWidth="1" />
          <rect x="262" y="94" width="18" height="7" rx="3.5" fill="url(#ring-tube)" stroke="#334155" strokeWidth="1" />
          <rect x="191" y="108" width="18" height="7" rx="3.5" fill="url(#ring-tube)" stroke="#334155" strokeWidth="1" />
        </svg>
      </div>

      {/* "Built with Spline" Watermark Badge in Bottom Right Corner */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121620]/90 border border-slate-800/90 backdrop-blur-md shadow-lg pointer-events-none select-none">
        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 via-pink-500 to-yellow-400 shrink-0 shadow-xs" />
        <span className="text-xs font-semibold text-slate-200 tracking-wide">
          Built with Spline
        </span>
      </div>
    </div>
  );
};
