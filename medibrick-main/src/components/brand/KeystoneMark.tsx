/** Legacy keystone mark — kept for /dev/logo-comparison only */
export default function KeystoneMark({ size = 34 }: { size?: number }) {
  const brand = "hsl(14 65% 47%)";
  const brandDeep = "hsl(13 66% 39%)";

  return (
    <svg
      width={size}
      height={size * 0.85}
      viewBox="0 0 48 40"
      className="flex-shrink-0"
      aria-hidden="true"
    >
      <g fill={brand}>
        <rect x="4" y="26" width="14" height="9" rx="2" />
        <rect x="30" y="26" width="14" height="9" rx="2" />
        <rect x="16" y="10" width="16" height="10" rx="2.2" />
      </g>
      <rect x="18" y="26" width="12" height="9" rx="1.5" fill={brandDeep} opacity="0.45" />
    </svg>
  );
}
