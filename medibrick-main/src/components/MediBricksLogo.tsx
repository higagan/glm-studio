import React from "react";
import { cn } from "@/lib/utils";

interface MediBricksLogoProps {
  className?: string;
  variant?: "default" | "icon-only" | "text-only";
  size?: "sm" | "md" | "lg";
  /** Gold pulse underline — footer / hero lockups only */
  showPulse?: boolean;
  /** @deprecated */
  heartColor?: string;
  /** @deprecated */
  textColor?: string;
  /** @deprecated */
  showText?: boolean;
  /** @deprecated */
  ecgColor?: "auto" | "white" | "text";
}

const SIZE = {
  sm: { icon: 36, text: "text-[15px]", gap: "gap-2.5" },
  md: { icon: 40, text: "text-lg", gap: "gap-2.5" },
  lg: { icon: 48, text: "text-xl", gap: "gap-3" },
};

/** Founder heart mark — transparent PNG for accurate M proportions */
function HeartMark({ size, className }: { size: number; className?: string }) {
  return (
    <img
      src="/brand/logo-icon-transparent.png"
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

function Wordmark({
  textClass,
  showPulse,
}: {
  textClass: string;
  showPulse?: boolean;
}) {
  return (
    <div className="flex flex-col justify-center min-w-0">
      <span
        className={cn(
          "font-heading font-bold leading-none tracking-tight whitespace-nowrap",
          textClass,
        )}
      >
        <span className="text-secondary">Medi</span>
        <span className="text-primary">Brick</span>
      </span>
      {showPulse && (
        <svg
          viewBox="0 0 88 4"
          className="mt-1 h-[3px] w-[min(100%,5.5rem)] text-accent"
          aria-hidden="true"
        >
          <path
            d="M0 2 Q6 0.5 12 2 T24 2 T36 1.6 T48 2.2 T60 1.5 T72 2.1 T84 1.7 88 2"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}

export default function MediBricksLogo({
  className = "",
  variant = "default",
  size = "md",
  showPulse = false,
  showText = true,
}: MediBricksLogoProps) {
  const s = SIZE[size];

  if (variant === "icon-only") {
    return (
      <div className={className}>
        <HeartMark size={s.icon} />
      </div>
    );
  }

  if (variant === "text-only" && showText) {
    return (
      <div className={className}>
        <Wordmark textClass={s.text} showPulse={showPulse} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <HeartMark size={s.icon} />
      {showText && <Wordmark textClass={s.text} showPulse={showPulse} />}
    </div>
  );
}
