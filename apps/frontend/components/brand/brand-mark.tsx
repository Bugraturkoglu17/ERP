type BrandTone = "red" | "amber";

const toneClass: Record<BrandTone, string> = {
  red: "text-[#ff3131]",
  amber: "text-amber-400",
};

export function BrandMark({ tone = "red", className = "h-8 w-8", animated = false }: {
  tone?: BrandTone;
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Sismik ERP amblemi"
      className={`${className} ${toneClass[tone]} ${animated ? "erp-brand-mark--animated" : ""}`}
      fill="none"
    >
      <path className="erp-brand-stroke erp-brand-stroke--one" d="M9 55V10L27 28" stroke="currentColor" strokeWidth="7" strokeLinejoin="miter" strokeLinecap="square" />
      <path className="erp-brand-stroke erp-brand-stroke--two" d="M9 55L55 10V55" stroke="currentColor" strokeWidth="7" strokeLinejoin="miter" strokeLinecap="square" />
      <path className="erp-brand-stroke erp-brand-stroke--three" d="M39 39L55 55" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      {animated && <path className="erp-brand-shine" d="M8 10H56L8 54H56" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

export type { BrandTone };
