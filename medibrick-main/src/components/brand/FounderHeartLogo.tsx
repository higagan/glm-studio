import React from "react";

/** Founder mark — heart + M + ECG, split Medi/Brick wordmark, yellow pulse underline */
interface FounderHeartLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Use raster asset for pixel-perfect match to original artwork */
  useRaster?: boolean;
}

const SIZES = {
  sm: { h: 32, text: "text-base", gap: "gap-2" },
  md: { h: 40, text: "text-lg", gap: "gap-2.5" },
  lg: { h: 48, text: "text-xl", gap: "gap-3" },
};

export default function FounderHeartLogo({
  className = "",
  size = "md",
  useRaster = true,
}: FounderHeartLogoProps) {
  const s = SIZES[size];

  if (useRaster) {
    return (
      <img
        src="/brand/founder-logo.png"
        alt="MediBrick"
        className={`object-contain object-left ${className}`}
        style={{ height: s.h }}
      />
    );
  }

  const uid = React.useId().replace(/[:]/g, "");

  return (
    <div className={`flex flex-col ${s.gap} ${className}`}>
      <div className={`flex items-center ${s.gap}`}>
        <svg
          width={s.h}
          height={s.h}
          viewBox="0 0 32 28"
          className="flex-shrink-0"
          aria-hidden="true"
        >
          <path
            d="M11,23 C11,23 3,16 3,9.5 C3,4.5 6.5,1 11,1 C12.8,1 14,1.8 14.5,3.2 C15,1.8 16.2,1 18,1 C22.5,1 26,4.5 26,9.5 C26,16 18,23 18,23 C17,24 15,25.5 14.5,25.5 C14,25.5 12,24 11,23 Z"
            fill="#E63946"
          />
          <path
            d="M10,18 L10,8 L14.5,14 L19,8 L19,18"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M19,18 L20.5,18 L21.5,15.5 L22.5,18 L23.5,15.5 L24.5,18 L26,17.5 L27.5,18"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span className={`font-semibold ${s.text} leading-none tracking-tight`}>
          <span style={{ color: "#1D4ED8" }}>Medi</span>
          <span style={{ color: "#E63946" }}>Brick</span>
        </span>
      </div>
      <svg width={140} height={6} viewBox="0 0 140 6" className="ml-1" aria-hidden="true">
        <path
          id={`pulse-${uid}`}
          d="M0,3 Q8,1 16,3 T32,3 T48,2.5 T64,3.5 T80,2 T96,3.5 T112,2.5 T128,3 L140,3"
          stroke="#F4B942"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
